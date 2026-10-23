<!-- app/components/servings/ItemCard.vue -->
<!-- One item on a category's servings page. Shows the unsaved limit/eye (`limit`, `enabled`); the parent owns the draft. -->
<script setup lang="ts">
import type { CategoryServingItem, ServingItemStatus } from '~/services/ServingService'

const MAX_LIMIT = 100000

const props = defineProps<{
  item: CategoryServingItem
  limit: number
  enabled: boolean
  error?: string
}>()

const emit = defineEmits<{
  'update:limit': [value: number]
  toggle: []
}>()

// Stock follows the draft limit: raising the limit by 5 adds 5 to what is left.
const stock = computed(() =>
  props.item.daily_limit > 0
    ? Math.max(0, props.item.available_stock + props.limit - props.item.daily_limit)
    : props.limit,
)

// Items visible at the branch start out available; the manager decides to switch one off.
// A limit of 0 means no limit has been set yet, so it is not "sold out".
const status = computed<ServingItemStatus>(() => {
  if (!props.item.editable) return 'branch_unavailable'
  if (!props.enabled) return 'unavailable'
  return props.limit > 0 && stock.value === 0 ? 'sold_out' : 'available'
})

const badge = computed(() => ({
  available: { label: 'Available', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' },
  sold_out: { label: 'Sold Out', cls: 'bg-rose-50 text-rose-700 border border-rose-200/80' },
  unavailable: { label: 'Unavailable', cls: 'bg-amber-50 text-amber-700 border border-amber-200/80' },
  branch_unavailable: { label: 'Not at branch', cls: 'bg-stone-100 text-stone-600 border border-stone-200' },
}[status.value]))

const editing = ref(false)
const text = ref<string | number>('')
const input = ref<HTMLInputElement | null>(null)

async function startEdit() {
  if (!props.item.editable) return
  text.value = String(props.limit)
  editing.value = true
  await nextTick()
  input.value?.select()
}

function commit() {
  if (!editing.value) return
  editing.value = false
  const raw = String(text.value).trim()
  const n = Math.floor(Number(raw))
  if (raw !== '' && Number.isFinite(n)) {
    emit('update:limit', Math.min(MAX_LIMIT, Math.max(0, n)))
  }
}

function onEye() {
  if (props.item.editable) emit('toggle')
}
</script>

<template>
  <div class="relative group">
    <div
      class="item-card bg-white border rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xs transition-card"
      :class="error ? 'border-rose-400 ring-1 ring-rose-300' : 'border-[#E3CFB4] hover:border-[#B4846C]'"
    >
      <!-- Item Header: Name, Image, Eye Toggle -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <img
            v-if="item.picture"
            :src="item.picture"
            :alt="item.menu_name"
            class="size-10 rounded-xl object-cover shrink-0 border border-[#E3CFB4]/60"
          >
          <div
            v-else
            class="size-10 rounded-xl bg-[#FDF3E7] border border-[#E3CFB4]/60 flex items-center justify-center shrink-0"
          >
            <Icon name="heroicons:cake" class="w-5 h-5 text-[#9E7060]" />
          </div>
          <div class="min-w-0">
            <p class="font-display font-bold text-[17px] text-[#3B1F0E] truncate leading-tight">
              {{ item.menu_name }}
            </p>
            <p v-if="!item.editable" class="text-[11px] font-medium text-stone-500">
              Not assigned to this branch
            </p>
          </div>
        </div>

        <!-- Eye toggle button -->
        <button
          type="button"
          class="eye-btn shrink-0 p-2 rounded-xl border border-transparent transition-all duration-160 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          :class="[
            item.editable ? 'hover:bg-[#FDF3E7] hover:border-[#E3CFB4] active:scale-[0.92] cursor-pointer' : 'cursor-not-allowed opacity-40',
            enabled ? 'text-[#7D5A50]' : 'text-stone-400'
          ]"
          :disabled="!item.editable"
          :aria-label="enabled ? 'Mark unavailable for today' : 'Mark available for today'"
          :aria-pressed="enabled"
          @click="onEye"
        >
          <Icon :name="enabled ? 'heroicons:eye' : 'heroicons:eye-slash'" class="w-5 h-5" />
        </button>
      </div>

      <!-- Properties Box -->
      <div class="bg-[#FAF4ED] border border-[#EBE0D2] rounded-xl p-3 flex flex-col gap-2.5">
        <!-- Status Row -->
        <div class="flex items-center justify-between">
          <span class="font-display font-medium text-[13px] text-[#7D5A50]">Status</span>
          <span class="font-display font-semibold text-[11px] rounded-full px-2.5 py-0.5" :class="badge.cls">
            {{ badge.label }}
          </span>
        </div>

        <!-- Daily Limit Row -->
        <div class="flex items-center justify-between">
          <span class="font-display font-medium text-[13px] text-[#7D5A50]">Daily Limit</span>
          <input
            v-if="editing"
            ref="input"
            v-model="text"
            type="number"
            min="0"
            :max="MAX_LIMIT"
            step="1"
            inputmode="numeric"
            aria-label="Daily limit"
            class="w-[84px] bg-white rounded-lg border border-[#7D5A50] px-2.5 py-1 text-center font-display font-semibold text-[14px] text-[#3B1F0E] outline-none ring-2 ring-[#7D5A50]/20 shadow-2xs"
            @blur="commit"
            @keydown.enter.prevent="commit"
            @keydown.esc.prevent="editing = false"
          >
          <button
            v-else
            type="button"
            class="edit-limit-btn bg-white rounded-lg border border-[#E3CFB4] hover:border-[#7D5A50] hover:bg-[#FFFDF9] px-2.5 py-1 flex items-center gap-2 font-display font-semibold text-[14px] text-[#7D5A50] shadow-2xs transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
            :class="item.editable ? 'active:scale-[0.96] cursor-pointer' : 'cursor-not-allowed opacity-50'"
            :disabled="!item.editable"
            aria-label="Edit daily limit"
            @click="startEdit"
          >
            <span class="tabular-nums">{{ limit }}</span>
            <Icon name="heroicons:pencil-square" class="w-3.5 h-3.5 text-[#B4846C]" />
          </button>
        </div>

        <!-- Available Stock Row -->
        <div class="flex items-center justify-between pt-1 border-t border-[#EBE0D2]/60">
          <span class="font-display font-medium text-[13px] text-[#7D5A50]">Available Stock</span>
          <span class="font-display font-bold text-[16px] tabular-nums text-[#3B1F0E] text-right min-w-[60px]">
            {{ stock }}
          </span>
        </div>
      </div>

      <!-- Row Error -->
      <div v-if="error" role="alert" class="flex items-center gap-1.5 text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
        <Icon name="heroicons:exclamation-circle" class="w-4 h-4 shrink-0 text-rose-600" />
        <span class="truncate">{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.item-card {
  transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1),
              box-shadow 180ms cubic-bezier(0.23, 1, 0.32, 1),
              border-color 180ms ease-out;
}

@media (hover: hover) and (pointer: fine) {
  .item-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px -2px rgba(61, 43, 36, 0.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .item-card,
  .eye-btn,
  .edit-limit-btn {
    transition: none !important;
    transform: none !important;
  }
}
</style>
