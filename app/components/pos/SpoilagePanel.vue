<script setup lang="ts">
// Log spoiled servings on the register, and see what this branch has logged today.
// Spoiled servings come out of the item's remaining stock. A manager or the owner approves
// each entry with their PIN, and a manager can void a wrong entry later.
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
const reasonIcons: Record<SpoilageReason, string> = {
  expired: 'heroicons:clock',
  dropped: 'heroicons:arrow-down-circle',
  wrong_order: 'heroicons:arrow-path-rounded-square',
  quality: 'heroicons:hand-thumb-down',
  end_of_day: 'heroicons:moon',
  other: 'heroicons:ellipsis-horizontal-circle',
}

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
  if (!reason.value) return 'Pick a reason'
  return `Next: approve ${quantity.value} spoiled ${[size.value?.name, selected.value.menu_name].filter(Boolean).join(' ')}`
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

// Step 2: a manager or the owner approves with their PIN before the entry is logged.
const approving = ref(false)
const approvalError = ref('')
const attemptsLeft = ref<number | null>(null)
const rejectKey = ref(0)

function submit() {
  if (!selected.value || needsSize.value || !reason.value || saving.value) return
  formError.value = ''
  notice.value = ''
  approvalError.value = ''
  attemptsLeft.value = null
  approving.value = true
}

async function approve(managerUuid: string, pin: string) {
  if (!selected.value || !reason.value || saving.value) return
  saving.value = true
  approvalError.value = ''
  attemptsLeft.value = null
  try {
    const res = await service.logSpoilage(selected.value.uuid, sizeUuid.value, quantity.value, reason.value, managerUuid, pin)
    notice.value = res.message
    logs.value = [res.log, ...logs.value]
    total.value += res.log.quantity
    selectedUuid.value = null
    sizeUuid.value = null
    quantity.value = 1
    reason.value = null
    approving.value = false
    emit('logged')
  } catch (e: any) {
    approvalError.value = e?.data?.message || (navigator.onLine ? 'The spoilage was not logged. Try again.' : 'No internet connection.')
    if (e?.data?.attempts_left != null) attemptsLeft.value = e.data.attempts_left
    rejectKey.value++
  } finally {
    saving.value = false
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
</script>

<template>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="spoilage-title"
    class="spoil-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#2d201b]/55 p-3 sm:p-6 print:hidden"
    @click.self="emit('close')"
  >
    <div class="spoil-sheet relative w-full max-w-[60rem] max-h-[94vh] flex flex-col bg-white rounded-2xl overflow-hidden">
      <!-- Header -->
      <header class="shrink-0 flex items-center gap-4 pl-6 pr-3 py-4 border-b border-[#EADFD3]">
        <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#F6E4D6] text-[#A96746]">
          <Icon name="heroicons:trash" class="w-5 h-5" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 id="spoilage-title" class="font-display text-xl font-semibold text-[#2d201b] leading-tight">Log spoilage</h2>
          <p class="text-sm text-[#6B5048] mt-0.5">Servings thrown away come out of today's stock.</p>
        </div>
        <button
          ref="closeButton"
          type="button"
          aria-label="Close"
          class="w-11 h-11 shrink-0 rounded-full text-[#8A6E64] hover:text-[#2d201b] hover:bg-[#F3EBE2] flex items-center justify-center transition-colors"
          @click="emit('close')"
        >
          <Icon name="heroicons:x-mark" class="w-6 h-6" />
        </button>
      </header>

      <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_21rem] overflow-y-auto md:overflow-hidden">
        <!-- Step 2: manager or owner approval -->
        <section v-if="approving && selected" aria-labelledby="spoilage-approval" class="flex flex-col md:min-h-0 px-5 sm:px-6 py-5 md:overflow-y-auto spoil-scroll">
          <h3 id="spoilage-approval" class="font-display text-lg font-semibold text-[#2d201b] leading-tight">Manager approval</h3>
          <div class="mt-3 mb-5 flex items-center gap-3 rounded-xl border border-[#EADFD3] bg-[#FBF7F2] px-4 py-3">
            <span class="font-display text-2xl font-semibold tabular-nums text-[#A96746]">{{ quantity }}&times;</span>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-[#2d201b] truncate">{{ [size?.name, selected.menu_name].filter(Boolean).join(' ') }}</p>
              <p v-if="reason" class="text-xs text-[#6B5048]">{{ spoilageReasonLabels[reason] }}</p>
            </div>
          </div>
          <p class="mb-3 text-sm text-[#6B5048]">A manager or the owner enters their PIN to log it.</p>
          <PosManagerApproval
            :confirm-label="`Approve and log ${quantity}`"
            :busy="saving"
            :error="approvalError"
            :attempts-left="attemptsLeft"
            :reject-key="rejectKey"
            @submit="approve"
            @cancel="approving = false"
          />
        </section>

        <!-- Step 1: what was thrown away -->
        <form v-else class="flex flex-col md:min-h-0" @submit.prevent="submit">
          <div class="flex-1 px-5 sm:px-6 py-5 space-y-6 md:overflow-y-auto spoil-scroll">
            <!-- Item -->
            <fieldset>
              <legend class="step-label"><span class="step-num">1</span> Item</legend>
              <div class="relative mb-3">
                <Icon name="heroicons:magnifying-glass" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8988B]" />
                <input
                  v-model="search"
                  type="text"
                  placeholder="Search menu"
                  aria-label="Search menu items"
                  class="w-full h-11 pl-10 pr-3 rounded-xl border border-[#E2D5C8] bg-[#FFFDF9] text-sm text-[#2d201b] placeholder:text-[#A8988B] focus:outline-none focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                />
              </div>
              <p v-if="!loggable.length" class="rounded-xl border border-dashed border-[#E2D5C8] px-4 py-5 text-center text-sm text-[#6B5048]">
                {{ search.trim() ? 'No items match.' : 'No items have servings left today.' }}
              </p>
              <div v-else role="radiogroup" aria-label="Item" class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto spoil-scroll -mr-1 pr-1">
                <button
                  v-for="item in loggable"
                  :key="item.uuid"
                  type="button"
                  role="radio"
                  :aria-checked="selectedUuid === item.uuid"
                  class="choice relative flex items-center gap-3 min-h-16 px-3 py-2.5 rounded-xl border text-left transition-colors"
                  :class="selectedUuid === item.uuid
                    ? 'border-[#7B5A50] bg-[#7B5A50]/[0.07] shadow-[inset_0_0_0_1px_#7B5A50]'
                    : 'border-[#EADFD3] bg-white hover:bg-[#FBF7F2]'"
                  @click="pick(item)"
                >
                  <img v-if="item.picture" :src="item.picture" :alt="''" class="size-10 shrink-0 rounded-lg object-cover border border-[#EADFD3]" />
                  <span v-else class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#F3EBE2] text-[#9E7060]">
                    <Icon name="heroicons:cake" class="w-5 h-5" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-semibold text-[#2d201b] leading-snug break-words">{{ item.menu_name }}</span>
                    <span class="block text-xs tabular-nums" :class="item.available_stock <= 3 ? 'text-amber-800 font-medium' : 'text-[#6B5048]'">
                      {{ item.available_stock }} left today
                    </span>
                  </span>
                  <Icon
                    v-if="selectedUuid === item.uuid"
                    name="heroicons:check-circle-solid"
                    class="absolute top-2 right-2 w-5 h-5 text-[#7B5A50]"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </fieldset>

            <!-- Size -->
            <fieldset v-if="sizes.length">
              <legend class="step-label"><span class="step-num">&bull;</span> Size</legend>
              <div role="radiogroup" aria-label="Size" class="flex flex-wrap gap-2">
                <button
                  v-for="s in sizes"
                  :key="s.uuid"
                  type="button"
                  role="radio"
                  :aria-checked="sizeUuid === s.uuid"
                  class="min-h-11 px-4 rounded-xl border text-sm font-semibold transition-colors"
                  :class="sizeUuid === s.uuid ? 'border-[#7B5A50] bg-[#7B5A50] text-white' : 'border-[#E2D5C8] bg-white text-[#5C4037] hover:bg-[#FBF7F2]'"
                  @click="sizeUuid = s.uuid"
                >
                  {{ s.name }}
                </button>
              </div>
            </fieldset>

            <!-- Quantity -->
            <fieldset :disabled="!selected" :class="{ 'opacity-45': !selected }">
              <legend class="step-label"><span class="step-num">2</span> Servings spoiled</legend>
              <div class="flex items-center gap-3">
                <div class="inline-flex items-center rounded-xl border border-[#E2D5C8] bg-white">
                  <button type="button" :disabled="quantity <= 1" aria-label="One fewer" class="key w-12 h-12 rounded-l-xl flex items-center justify-center text-[#5C4037]" @click="setQuantity(quantity - 1)">
                    <Icon name="heroicons:minus" class="w-5 h-5" />
                  </button>
                  <span class="w-14 text-center font-display text-2xl font-semibold text-[#2d201b] tabular-nums" aria-live="polite">{{ quantity }}</span>
                  <button type="button" :disabled="!selected || quantity >= selected.available_stock" aria-label="One more" class="key w-12 h-12 rounded-r-xl flex items-center justify-center text-[#5C4037]" @click="setQuantity(quantity + 1)">
                    <Icon name="heroicons:plus" class="w-5 h-5" />
                  </button>
                </div>
                <span class="text-sm text-[#6B5048]">{{ selected ? `of ${selected.available_stock} left` : 'Pick an item first' }}</span>
              </div>
            </fieldset>

            <!-- Reason -->
            <fieldset :disabled="!selected" :class="{ 'opacity-45': !selected }">
              <legend class="step-label">
                <span class="step-num">3</span> Reason
                <span class="ml-1 text-xs font-medium normal-case tracking-normal text-[#A2352A]">Required</span>
              </legend>
              <div role="radiogroup" aria-label="Reason" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  v-for="r in reasons"
                  :key="r"
                  type="button"
                  role="radio"
                  :aria-checked="reason === r"
                  class="choice flex items-center gap-2 min-h-12 px-3 rounded-xl border text-left text-sm font-medium transition-colors"
                  :class="reason === r
                    ? 'border-[#7B5A50] bg-[#7B5A50] text-white'
                    : 'border-[#E2D5C8] bg-white text-[#5C4037] hover:bg-[#FBF7F2]'"
                  @click="reason = r"
                >
                  <Icon :name="reasonIcons[r]" class="w-4 h-4 shrink-0" :class="reason === r ? 'text-white' : 'text-[#A8988B]'" />
                  <span class="leading-tight">{{ spoilageReasonLabels[r] }}</span>
                </button>
              </div>
            </fieldset>
          </div>

          <div class="shrink-0 px-5 sm:px-6 pt-3 pb-5 border-t border-[#EADFD3]">
            <p v-if="formError" role="alert" class="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              <Icon name="heroicons:exclamation-circle" class="w-5 h-5 shrink-0" /> {{ formError }}
            </p>
            <p v-else-if="notice" role="status" class="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              <Icon name="heroicons:check-circle" class="w-5 h-5 shrink-0" /> {{ notice }}
            </p>
            <button
              type="submit"
              :disabled="!selected || needsSize || !reason || saving"
              class="w-full h-14 rounded-xl bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors active:scale-[0.99] disabled:bg-[#E2D5C8] disabled:text-[#6B5048] disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <Icon v-if="saving" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
              {{ submitLabel }}
              <Icon v-if="selected && !needsSize && reason" name="heroicons:arrow-right" class="w-5 h-5" />
            </button>
          </div>
        </form>

        <!-- Logged today -->
        <section aria-labelledby="spoilage-today" class="flex flex-col md:min-h-0 bg-[#FBF7F2] border-t md:border-t-0 md:border-l border-[#EADFD3]">
          <div class="shrink-0 px-5 pt-5 pb-3 flex items-baseline justify-between gap-3">
            <h3 id="spoilage-today" class="font-display text-lg font-semibold text-[#2d201b]">Logged today</h3>
            <span class="rounded-full bg-white border border-[#EADFD3] px-2.5 py-0.5 text-xs font-semibold text-[#7B5A50] tabular-nums">
              {{ total }} serving{{ total === 1 ? '' : 's' }}
            </span>
          </div>
          <div class="px-5 pb-5 md:overflow-y-auto spoil-scroll">
            <div v-if="loadingLogs" class="space-y-2" aria-busy="true">
              <div v-for="n in 3" :key="n" class="h-16 rounded-xl bg-[#F3EBE2] animate-pulse" />
            </div>
            <div v-else-if="logsError" class="flex items-center justify-between gap-2 text-sm text-red-800">
              <span>{{ logsError }}</span>
              <button type="button" class="min-h-11 px-3 rounded-lg border border-[#D6C5B8] bg-white font-semibold text-[#2d201b] hover:bg-[#F3EBE2]" @click="loadLogs">Try again</button>
            </div>
            <div v-else-if="!logs.length" class="flex flex-col items-center justify-center py-10 text-center">
              <span class="flex size-12 items-center justify-center rounded-full bg-white border border-[#EADFD3] text-[#B4846C]">
                <Icon name="heroicons:sparkles" class="w-6 h-6" />
              </span>
              <p class="mt-3 text-sm font-semibold text-[#2d201b]">Nothing thrown away yet</p>
              <p class="mt-0.5 text-xs text-[#6B5048]">Entries logged today show up here.</p>
            </div>
            <ul v-else class="space-y-2">
              <li
                v-for="log in logs"
                :key="log.uuid"
                class="rounded-xl border border-[#EADFD3] bg-white px-3.5 py-3"
                :class="{ 'opacity-60': log.voided_at }"
              >
                <div class="flex items-baseline justify-between gap-2">
                  <span class="text-sm font-semibold text-[#2d201b] break-words" :class="{ 'line-through': log.voided_at }">
                    {{ log.quantity }}&times; {{ spoilageItemLabel(log) }}
                  </span>
                  <span class="text-xs text-[#8A6E64] tabular-nums shrink-0">{{ formatTime(log.created_at) }}</span>
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6B5048]">
                  <span v-if="log.reason" class="inline-flex items-center gap-1 rounded-full bg-[#F6E4D6] px-2 py-0.5 font-medium text-[#8A4F33]">
                    <Icon :name="reasonIcons[log.reason]" class="w-3 h-3" /> {{ spoilageReasonLabels[log.reason] }}
                  </span>
                  <span>{{ log.logged_by ?? 'Unknown' }}</span>
                  <span v-if="log.approved_by" class="text-[#8A6E64]">&middot; approved by {{ log.approved_by }}</span>
                </div>
                <p v-if="log.voided_at" class="mt-1 text-xs font-medium text-[#6B5048]">Voided by {{ log.voided_by ?? 'a manager' }}</p>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spoil-backdrop { animation: spoil-fade 180ms ease-out; }
.spoil-sheet {
  box-shadow: 0 24px 60px -12px rgb(45 32 27 / 0.35), 0 4px 12px -4px rgb(45 32 27 / 0.12);
  animation: spoil-rise 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes spoil-fade { from { opacity: 0; } }
@keyframes spoil-rise { from { transform: translateY(12px) scale(0.985); opacity: 0; } }

.step-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #2d201b;
}
.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 9999px;
  background: #F3EBE2;
  color: #7B5A50;
  font-size: 0.75rem;
  font-weight: 700;
}

.key {
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 120ms, transform 80ms;
}
.key:not(:disabled):hover { background-color: #F3EBE2; }
.key:not(:disabled):active { background-color: #EADFD3; transform: scale(0.96); }
.key:disabled { opacity: 0.35; }

button:focus-visible,
input:focus-visible { outline: 2px solid #7B5A50; outline-offset: 2px; }

.spoil-scroll { scrollbar-width: thin; scrollbar-color: #D6C5B8 transparent; }

@media (prefers-reduced-motion: reduce) {
  .spoil-backdrop, .spoil-sheet { animation: none; }
  .key:not(:disabled):active { transform: none; }
}
</style>
