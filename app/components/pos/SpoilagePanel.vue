<script setup lang="ts">
// Log spoiled servings on the register, and see what this branch has logged today.
// Spoiled servings come out of the item's remaining stock; a manager can void a wrong entry.
import { spoilageItemLabel, spoilageReasonLabels, type SpoilageLog, type SpoilageReason } from '~/services/PosService'

interface MenuItem {
  uuid: string
  menu_name: string
  picture?: string | null
  available_stock: number
  sizes?: { uuid: string; name: string; price: number }[] // all sizes share the item's servings
}

const props = defineProps<{ items: MenuItem[] }>()

const emit = defineEmits<{
  close: []
  logged: []
}>()

const service = useDevicePosService()

const closeButton = ref<HTMLButtonElement | null>(null)
onMounted(() => closeButton.value?.focus())

const reasons = Object.keys(spoilageReasonLabels) as SpoilageReason[]

// Only items with servings left can be logged as spoiled.
const search = ref('')
const loggable = computed(() => {
  const q = search.value.trim().toLowerCase()
  return props.items
    .filter(i => i.available_stock > 0)
    .filter(i => !q || i.menu_name.toLowerCase().includes(q))
})

const selectedUuid = ref<string | null>(null)
const selected = computed(() => props.items.find(i => i.uuid === selectedUuid.value) ?? null)
const quantity = ref(1)
const reason = ref<SpoilageReason | null>(null)

// Items in sizes need the size thrown away, for the spoilage cost.
const sizeUuid = ref<string | null>(null)
const sizes = computed(() => selected.value?.sizes ?? [])
const size = computed(() => sizes.value.find(s => s.uuid === sizeUuid.value) ?? null)
const needsSize = computed(() => sizes.value.length > 0 && !size.value)

function pick(item: MenuItem) {
  selectedUuid.value = item.uuid
  sizeUuid.value = item.sizes?.length === 1 ? item.sizes[0]!.uuid : null
  quantity.value = 1
  formError.value = ''
}

const submitLabel = computed(() => {
  if (!selected.value) return 'Pick an item'
  if (needsSize.value) return 'Pick a size'
  return `Log ${quantity.value} spoiled ${[size.value?.name, selected.value.menu_name].filter(Boolean).join(' ')}`
})

function setQuantity(n: number) {
  quantity.value = Math.max(1, Math.min(selected.value?.available_stock ?? 1, n))
}

// Stock can drop under the chosen amount after a sale or a refresh.
watch(selected, (item) => {
  if (!item) return
  if (item.available_stock <= 0) selectedUuid.value = null
  else if (quantity.value > item.available_stock) quantity.value = item.available_stock
})

// Today's entries
const logs = ref<SpoilageLog[]>([])
const total = ref(0)
const loadingLogs = ref(true)
const logsError = ref('')

async function loadLogs() {
  loadingLogs.value = true
  logsError.value = ''
  try {
    const res = await service.getSpoilage()
    logs.value = res.logs
    total.value = res.total
  } catch {
    logsError.value = navigator.onLine ? 'Spoilage entries could not be loaded.' : 'No internet connection.'
  } finally {
    loadingLogs.value = false
  }
}
onMounted(loadLogs)

const saving = ref(false)
const formError = ref('')
const notice = ref('')

async function submit() {
  if (!selected.value || needsSize.value || saving.value) return
  saving.value = true
  formError.value = ''
  notice.value = ''
  try {
    const res = await service.logSpoilage(selected.value.uuid, sizeUuid.value, quantity.value, reason.value)
    notice.value = res.message
    logs.value = [res.log, ...logs.value]
    total.value += res.log.quantity
    selectedUuid.value = null
    sizeUuid.value = null
    quantity.value = 1
    reason.value = null
    emit('logged')
  } catch (e: any) {
    formError.value = e?.data?.message || (navigator.onLine ? 'The spoilage was not logged. Try again.' : 'No internet connection.')
  } finally {
    saving.value = false
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
</script>

<template>
  <div role="dialog" aria-modal="true" aria-labelledby="spoilage-title" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 print:hidden" @click.self="emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col overflow-hidden modal-pop max-h-[92vh]">
      <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-gray-50 shrink-0">
        <div>
          <h2 id="spoilage-title" class="text-xl font-bold text-[#7B5A50]">Spoilage</h2>
          <p class="text-sm text-gray-500">Servings thrown away. They come out of today's stock.</p>
        </div>
        <button ref="closeButton" @click="emit('close')" aria-label="Close" class="w-11 h-11 shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-md">
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>

      <div class="flex-1 min-h-0 grid grid-cols-1 content-start md:content-stretch md:grid-cols-[3fr_2fr] overflow-y-auto md:overflow-hidden">
        <!-- Log an entry -->
        <form class="flex flex-col md:min-h-0 md:border-r border-gray-200" @submit.prevent="submit">
          <div class="p-5 space-y-5 md:overflow-y-auto">
            <fieldset>
              <legend class="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Item</legend>
              <div class="relative mb-2">
                <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  v-model="search"
                  type="text"
                  placeholder="Search menu"
                  aria-label="Search menu items"
                  class="w-full min-h-11 pl-9 pr-3 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#7B5A50]/40 focus:border-[#7B5A50]"
                />
              </div>
              <p v-if="!loggable.length" class="text-sm text-gray-500 py-3">
                {{ search.trim() ? 'No items match.' : 'No items have servings left today.' }}
              </p>
              <div v-else role="radiogroup" aria-label="Item" class="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                <button
                  v-for="item in loggable"
                  :key="item.uuid"
                  type="button"
                  role="radio"
                  :aria-checked="selectedUuid === item.uuid"
                  @click="pick(item)"
                  class="min-h-14 px-3 py-2 rounded-md border text-left transition-colors"
                  :class="selectedUuid === item.uuid ? 'border-[#7B5A50] bg-[#7B5A50]/10 text-[#7B5A50]' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
                >
                  <span class="block font-semibold text-base leading-tight break-words">{{ item.menu_name }}</span>
                  <span class="block text-sm text-gray-500 tabular-nums">{{ item.available_stock }} left</span>
                </button>
              </div>
            </fieldset>

            <fieldset v-if="sizes.length">
              <legend class="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Size</legend>
              <div role="radiogroup" aria-label="Size" class="flex flex-wrap gap-2">
                <button
                  v-for="s in sizes"
                  :key="s.uuid"
                  type="button"
                  role="radio"
                  :aria-checked="sizeUuid === s.uuid"
                  @click="sizeUuid = s.uuid"
                  class="min-h-11 px-4 rounded-md border text-base font-semibold transition-colors"
                  :class="sizeUuid === s.uuid ? 'border-[#7B5A50] bg-[#7B5A50]/10 text-[#7B5A50]' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
                >
                  {{ s.name }}
                </button>
              </div>
            </fieldset>

            <fieldset :disabled="!selected">
              <legend class="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Servings spoiled</legend>
              <div class="flex items-center gap-2" :class="{ 'opacity-40': !selected }">
                <button type="button" @click="setQuantity(quantity - 1)" :disabled="quantity <= 1" aria-label="One fewer" class="w-11 h-11 flex items-center justify-center border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30">
                  <Icon name="heroicons:minus" class="w-4 h-4" />
                </button>
                <span class="w-10 text-center text-xl font-bold text-gray-800 tabular-nums" aria-live="polite">{{ quantity }}</span>
                <button type="button" @click="setQuantity(quantity + 1)" :disabled="!selected || quantity >= selected.available_stock" aria-label="One more" class="w-11 h-11 flex items-center justify-center border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30">
                  <Icon name="heroicons:plus" class="w-4 h-4" />
                </button>
                <span v-if="selected" class="text-sm text-gray-500">of {{ selected.available_stock }} left</span>
              </div>
            </fieldset>

            <fieldset :disabled="!selected">
              <legend class="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Reason <span class="normal-case font-normal text-gray-400">(optional)</span></legend>
              <div role="radiogroup" aria-label="Reason" class="flex flex-wrap gap-2" :class="{ 'opacity-40': !selected }">
                <button
                  v-for="r in reasons"
                  :key="r"
                  type="button"
                  role="radio"
                  :aria-checked="reason === r"
                  @click="reason = reason === r ? null : r"
                  class="min-h-11 px-3 rounded-full border text-sm font-medium transition-colors"
                  :class="reason === r ? 'border-[#7B5A50] bg-[#7B5A50] text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
                >
                  {{ spoilageReasonLabels[r] }}
                </button>
              </div>
            </fieldset>
          </div>

          <div class="px-5 pt-3 pb-5 border-t border-gray-200 shrink-0 mt-auto">
            <p v-if="formError" role="alert" class="mb-3 p-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm font-medium">{{ formError }}</p>
            <p v-else-if="notice" role="status" class="mb-3 p-2 bg-green-50 text-green-800 border border-green-200 rounded-md text-sm font-medium">{{ notice }}</p>
            <button
              type="submit"
              :disabled="!selected || needsSize || saving"
              class="w-full h-14 bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md text-lg transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon v-if="saving" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
              {{ submitLabel }}
            </button>
          </div>
        </form>

        <!-- Logged today -->
        <section aria-labelledby="spoilage-today" class="flex flex-col md:min-h-0 bg-gray-50 border-t md:border-t-0 border-gray-200">
          <div class="px-5 pt-5 pb-3 flex items-baseline justify-between gap-3 shrink-0">
            <h3 id="spoilage-today" class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Logged today</h3>
            <span class="text-sm text-gray-600 tabular-nums">{{ total }} serving{{ total === 1 ? '' : 's' }}</span>
          </div>
          <div class="px-5 pb-5 md:overflow-y-auto">
            <p v-if="loadingLogs" class="text-sm text-gray-500">Loading...</p>
            <div v-else-if="logsError" class="text-sm text-red-700 flex items-center gap-2">
              <span>{{ logsError }}</span>
              <button type="button" @click="loadLogs" class="min-h-11 px-2 font-semibold underline">Try again</button>
            </div>
            <p v-else-if="!logs.length" class="text-sm text-gray-500">Nothing logged yet today.</p>
            <ul v-else class="divide-y divide-gray-200 border border-gray-200 rounded-md bg-white">
              <li v-for="log in logs" :key="log.uuid" class="px-3 py-2.5" :class="{ 'opacity-60': log.voided_at }">
                <div class="flex items-baseline justify-between gap-2">
                  <span class="font-semibold text-gray-800 text-base break-words" :class="{ 'line-through': log.voided_at }">
                    {{ log.quantity }}x {{ spoilageItemLabel(log) }}
                  </span>
                  <span class="text-sm text-gray-500 tabular-nums shrink-0">{{ formatTime(log.created_at) }}</span>
                </div>
                <p class="text-sm text-gray-500">
                  <template v-if="log.reason">{{ spoilageReasonLabels[log.reason] }} &bull; </template>{{ log.logged_by ?? 'Unknown' }}
                </p>
                <p v-if="log.voided_at" class="text-sm font-medium text-gray-600">Voided by {{ log.voided_by ?? 'a manager' }}</p>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
