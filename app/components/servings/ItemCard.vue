<!-- app/components/servings/ItemCard.vue -->
<!-- One item on a category's servings page. Shows the unsaved limit/switch (`limit`, `enabled`); the parent owns the draft. -->
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

const sold = computed(() => props.item.servings_sold ?? 0)
const hasLimit = computed(() => props.limit > 0)
const isOn = computed(() => props.enabled && props.item.editable)

// Items visible at the branch start out available; the manager decides to switch one off.
// A limit of 0 means no limit has been set yet, so it is not "sold out".
const status = computed<ServingItemStatus>(() => {
  if (!props.item.editable) return 'branch_unavailable'
  if (!props.enabled) return 'unavailable'
  return hasLimit.value && stock.value === 0 ? 'sold_out' : 'available'
})

const thresholdPercent = computed(() => props.item.low_stock_threshold_percent ?? null)

const isLowStock = computed(() => {
  if (status.value !== 'available' || props.limit <= 1 || stock.value <= 0) return false
  const pct = thresholdPercent.value
  if (!pct || pct <= 0) return false
  const lowRemaining = Math.min(props.limit - 1, Math.max(1, Math.floor(props.limit * (pct / 100))))
  return stock.value <= lowRemaining
})

const remainingRatio = computed(() => (hasLimit.value ? Math.min(1, stock.value / props.limit) : 0))

// One tone drives the status label, the ring and the number so the card reads as a single state.
type Tone = 'ok' | 'low' | 'out' | 'off' | 'none'
const tone = computed<Tone>(() => {
  if (status.value === 'branch_unavailable' || status.value === 'unavailable') return 'off'
  if (status.value === 'sold_out') return 'out'
  if (isLowStock.value) return 'low'
  return hasLimit.value ? 'ok' : 'none'
})

const statusLabel = computed(() => {
  if (status.value === 'branch_unavailable') return 'Not at this branch'
  if (status.value === 'unavailable') return 'Off today'
  if (status.value === 'sold_out') return 'Sold out'
  if (isLowStock.value) return 'Low stock'
  return hasLimit.value ? 'Available' : 'No limit set'
})

const TONES: Record<Tone, { ring: string; text: string; dot: string; label: string }> = {
  ok: { ring: 'text-emerald-500', text: 'text-[#3B1F0E]', dot: 'bg-emerald-500', label: 'text-emerald-700' },
  low: { ring: 'text-amber-500', text: 'text-amber-700', dot: 'bg-amber-500', label: 'text-amber-700' },
  out: { ring: 'text-rose-500', text: 'text-rose-700', dot: 'bg-rose-500', label: 'text-rose-700' },
  off: { ring: 'text-stone-300', text: 'text-stone-400', dot: 'bg-stone-400', label: 'text-stone-500' },
  none: { ring: 'text-[#B4846C]', text: 'text-[#3B1F0E]', dot: 'bg-[#B4846C]', label: 'text-[#7D5A50]' },
}
const t = computed(() => TONES[tone.value])

// Ring geometry (viewBox 96x96)
const R = 40
const CIRC = 2 * Math.PI * R
const dashOffset = computed(() => CIRC * (1 - remainingRatio.value))

// ---- Daily limit stepper ----
const text = ref<string>(String(props.limit))
const focused = ref(false)

watch(() => props.limit, (v) => {
  if (!focused.value) text.value = String(v)
})

function setLimit(n: number) {
  if (!props.item.editable) return
  const clamped = Math.min(MAX_LIMIT, Math.max(0, Math.floor(n)))
  text.value = String(clamped)
  if (clamped !== props.limit) emit('update:limit', clamped)
}

function commit() {
  focused.value = false
  const raw = text.value.trim()
  const n = Number(raw)
  if (raw === '' || !Number.isFinite(n)) {
    text.value = String(props.limit)
    return
  }
  setLimit(n)
}

function onToggle() {
  if (props.item.editable) emit('toggle')
}
</script>

<template>
  <div
    class="item-card flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-2xs sm:p-5"
    :class="error ? 'border-rose-400 ring-1 ring-rose-300' : 'border-[#E3CFB4] hover:border-[#C9A88A]'"
  >
    <!-- Header: picture, name, status, selling-today toggle -->
    <div class="flex items-center gap-3">
      <img
        v-if="item.picture"
        :src="item.picture"
        :alt="item.menu_name"
        class="size-10 shrink-0 rounded-xl border border-[#E3CFB4]/60 object-cover"
        :class="tone === 'off' ? 'grayscale opacity-60' : ''"
      >
      <div
        v-else
        class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#E3CFB4]/60 bg-[#FDF3E7]"
      >
        <Icon name="heroicons:cake" class="h-5 w-5 text-[#9E7060]" />
      </div>

      <div class="min-w-0 flex-1">
        <p class="truncate font-display text-[16px] font-bold leading-tight text-[#3B1F0E]" :title="item.menu_name">
          {{ item.menu_name }}
        </p>
        <p class="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold" :class="t.label">
          <span class="size-1.5 shrink-0 rounded-full" :class="t.dot" aria-hidden="true" />
          {{ statusLabel }}
        </p>
      </div>

      <!-- 44px hit area around a compact switch -->
      <button
        type="button"
        role="switch"
        :aria-checked="isOn"
        :aria-label="`Selling ${item.menu_name} today`"
        :title="isOn ? 'Selling today. Tap to switch off.' : 'Not selling today. Tap to switch on.'"
        :disabled="!item.editable"
        class="-mr-1.5 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] disabled:cursor-not-allowed disabled:opacity-40"
        @click="onToggle"
      >
        <span class="switch relative inline-flex h-6 w-10 items-center rounded-full p-0.5" :class="isOn ? 'bg-[#7D5A50]' : 'bg-stone-300'">
          <span class="knob size-5 rounded-full bg-white shadow-sm" :class="isOn ? 'translate-x-4' : 'translate-x-0'" />
        </span>
      </button>
    </div>

    <!-- Body: ring gauge of what is left + today's figures -->
    <div v-if="item.editable" class="flex items-center gap-4">
      <div class="relative size-24 shrink-0">
        <svg viewBox="0 0 96 96" class="size-full -rotate-90" aria-hidden="true">
          <circle cx="48" cy="48" :r="R" fill="none" stroke-width="8" class="stroke-[#F1E6D8]" />
          <circle
            v-if="hasLimit"
            cx="48"
            cy="48"
            :r="R"
            fill="none"
            stroke="currentColor"
            stroke-width="8"
            stroke-linecap="round"
            class="ring-arc"
            :class="t.ring"
            :stroke-dasharray="CIRC"
            :stroke-dashoffset="dashOffset"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <template v-if="hasLimit">
            <span class="font-display text-[26px] font-bold tabular-nums" :class="t.text">{{ stock }}</span>
            <span class="mt-1 text-[11px] font-medium text-[#8B6656]">left</span>
          </template>
          <template v-else>
            <span class="font-display text-[15px] font-bold text-[#7D5A50]">No</span>
            <span class="mt-0.5 text-[11px] font-medium text-[#8B6656]">limit</span>
          </template>
        </div>
        <span class="sr-only">
          {{ hasLimit ? `${stock} of ${limit} servings left` : 'No daily limit set' }}
        </span>
      </div>

      <dl class="min-w-0 flex-1 divide-y divide-[#F1E6D8] text-[13px]">
        <div class="flex items-center justify-between gap-2 py-1.5">
          <dt class="text-[#8B6656]">Sold today</dt>
          <dd class="font-display text-[15px] font-bold tabular-nums text-[#3B1F0E]">{{ sold }}</dd>
        </div>
        <div class="flex items-center justify-between gap-2 py-1.5">
          <dt class="text-[#8B6656]">Daily limit</dt>
          <dd class="font-display text-[15px] font-bold tabular-nums text-[#3B1F0E]">
            {{ hasLimit ? limit : 'None' }}
          </dd>
        </div>
        <div v-if="thresholdPercent && hasLimit" class="flex items-center justify-between gap-2 py-1.5">
          <dt class="text-[#8B6656]">Alert at</dt>
          <dd class="font-display text-[13px] font-semibold tabular-nums text-[#7D5A50]">&le;{{ thresholdPercent }}%</dd>
        </div>
      </dl>
    </div>

    <p v-else class="flex items-start gap-2 rounded-xl bg-stone-50 px-3 py-2.5 text-[12px] leading-snug text-stone-500">
      <Icon name="heroicons:information-circle" class="mt-px h-4 w-4 shrink-0" />
      Switched off for this branch in Menu Management, so it can't be served here.
    </p>

    <!-- Footer: full-width daily limit stepper with 44px targets -->
    <div
      class="mt-auto flex h-11 items-stretch overflow-hidden rounded-xl border bg-[#FDFAF6]"
      :class="item.editable ? 'border-[#E3CFB4] focus-within:border-[#7D5A50] focus-within:ring-2 focus-within:ring-[#7D5A50]/20' : 'border-stone-200 opacity-50'"
    >
      <button
        type="button"
        class="step-btn flex w-11 shrink-0 cursor-pointer items-center justify-center text-[#7D5A50] hover:bg-[#F5E6D8] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        :disabled="!item.editable || limit <= 0"
        :aria-label="`Decrease daily limit for ${item.menu_name}`"
        @click="setLimit(limit - 1)"
      >
        <Icon name="heroicons:minus" class="h-5 w-5" />
      </button>

      <label class="flex min-w-0 flex-1 cursor-text items-center justify-center gap-1.5 border-x border-[#EBE0D2]">
        <input
          v-model="text"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          :disabled="!item.editable"
          :aria-label="`Daily limit for ${item.menu_name}`"
          class="w-[7ch] min-w-0 bg-transparent text-right font-display text-[16px] font-bold tabular-nums text-[#3B1F0E] outline-none disabled:cursor-not-allowed"
          @focus="focused = true; ($event.target as HTMLInputElement).select()"
          @blur="commit"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
          @keydown.esc.prevent="text = String(limit); ($event.target as HTMLInputElement).blur()"
          @keydown.up.prevent="setLimit(limit + 1)"
          @keydown.down.prevent="setLimit(limit - 1)"
        >
        <span class="w-[7ch] text-left text-[12px] font-medium text-[#8B6656]">
          {{ limit === 1 ? 'serving' : 'servings' }}
        </span>
      </label>

      <button
        type="button"
        class="step-btn flex w-11 shrink-0 cursor-pointer items-center justify-center text-[#7D5A50] hover:bg-[#F5E6D8] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        :disabled="!item.editable || limit >= MAX_LIMIT"
        :aria-label="`Increase daily limit for ${item.menu_name}`"
        @click="setLimit(limit + 1)"
      >
        <Icon name="heroicons:plus" class="h-5 w-5" />
      </button>
    </div>

    <!-- Row Error -->
    <div v-if="error" role="alert" class="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[12px] text-rose-700">
      <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0 text-rose-600" />
      <span class="truncate">{{ error }}</span>
    </div>
  </div>
</template>

<style scoped>
.item-card {
  transition: box-shadow 200ms ease-out, border-color 200ms ease-out;
}

@media (hover: hover) and (pointer: fine) {
  .item-card:hover {
    box-shadow: 0 6px 16px -6px rgba(61, 43, 36, 0.12);
  }
}

.ring-arc {
  transition: stroke-dashoffset 300ms cubic-bezier(0.23, 1, 0.32, 1), color 200ms ease-out;
}

.switch {
  transition: background-color 200ms ease-out;
}

.knob {
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.step-btn {
  transition: background-color 150ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .item-card,
  .ring-arc,
  .switch,
  .knob,
  .step-btn {
    transition: none !important;
  }
}
</style>
