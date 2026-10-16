<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DashboardRange, OwnerDashboardStats } from '~/services/OwnerProfileService'
import { formatCount, formatDay, formatPeso, formatPesoCents, formatPesoCompact, formatSpan, niceMax } from '~/utils/dashboardFormat'

const props = defineProps<{
  period: OwnerDashboardStats['period'] | null
  series: OwnerDashboardStats['series']
  range: DashboardRange
  loading: boolean   // first load: nothing to show yet
  refreshing: boolean // range switch: keep the old bars, dim them
}>()

const emit = defineEmits<{ 'update:range': [DashboardRange] }>()

const ranges: { value: DashboardRange; label: string; compare: string }[] = [
  { value: 'daily', label: 'Daily', compare: 'previous 14 days' },
  { value: 'weekly', label: 'Weekly', compare: 'previous 12 weeks' },
  { value: 'monthly', label: 'Monthly', compare: 'previous 12 months' },
]

const compareLabel = computed(() => ranges.find(r => r.value === props.range)?.compare ?? '')

const max = computed(() => niceMax(Math.max(0, ...props.series.map(p => p.revenue))))
const ticks = computed(() => [1, 0.75, 0.5, 0.25, 0].map(f => max.value * f))
const isEmpty = computed(() => !props.loading && props.series.every(p => p.revenue === 0))

const active = ref<number | null>(null)
const activePoint = computed(() => (active.value === null ? null : props.series[active.value] ?? null))

// Full-height bar revealed from the bottom: clip-path animates without touching layout.
// Any income at all keeps at least a 3px sliver visible.
function barClip(revenue: number) {
  const hidden = revenue > 0 ? `min(calc(100% - 3px), ${100 - (revenue / max.value) * 100}%)` : '100%'
  return `inset(${hidden} 0 0 0 round 4px 4px 0 0)`
}

// The last bucket is still running (today / this week / this month).
const lastIndex = computed(() => props.series.length - 1)

function barLabel(i: number) {
  const p = props.series[i]!
  if (props.range === 'monthly') return formatDay(p.start, { month: 'short' })
  return formatDay(p.start)
}

function bucketTitle(i: number) {
  const p = props.series[i]!
  if (props.range === 'daily') return formatDay(p.start, { weekday: 'long', month: 'long', day: 'numeric' })
  if (props.range === 'weekly') return `Week of ${formatSpan(p.start, p.end)}`
  return formatDay(p.start, { month: 'long', year: 'numeric' })
}

function onKey(e: KeyboardEvent, i: number) {
  const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
  if (next === null || next < 0 || next > lastIndex.value) return
  e.preventDefault()
  const el = (e.currentTarget as HTMLElement).parentElement?.children[next] as HTMLElement | undefined
  el?.focus()
}

// Keep the tooltip inside the plot near the edges.
function tooltipAlign(i: number) {
  const n = props.series.length
  if (i <= 1) return 'left-0'
  if (i >= n - 2) return 'right-0'
  return 'left-1/2 -translate-x-1/2'
}
</script>

<template>
  <section class="flex flex-col rounded-[22px] border border-[#EEDFC4] bg-white p-5 sm:p-7 shadow-[0_1px_2px_rgba(59,31,14,0.04)]" aria-labelledby="income-heading">
    <header class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h2 id="income-heading" class="font-display text-lg font-semibold text-[#3B1F0E]">Income, all branches</h2>
        <p class="mt-1 text-[13px] text-[#8B6656]">
          <template v-if="period">{{ formatSpan(period.from, period.to) }}</template>
          <span v-else class="skeleton inline-block h-3 w-40 rounded align-middle" />
        </p>
      </div>

      <div role="radiogroup" aria-label="Chart range" class="segmented self-start">
        <button
          v-for="r in ranges"
          :key="r.value"
          type="button"
          role="radio"
          :aria-checked="range === r.value"
          :class="range === r.value ? 'bg-white text-[#3B1F0E] shadow-[0_1px_3px_rgba(59,31,14,0.18)]' : 'text-[#8B6656] hover:text-[#3B1F0E]'"
          class="relative rounded-[9px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          @click="emit('update:range', r.value)"
        >
          {{ r.label }}
        </button>
      </div>
    </header>

    <!-- Period summary -->
    <div class="mt-6 flex flex-wrap items-end gap-x-8 gap-y-3">
      <div>
        <p class="font-display text-[34px] leading-none font-semibold tracking-[-0.02em] text-[#3B1F0E] tabular-nums">
          <span v-if="!period" class="skeleton inline-block h-8 w-40 rounded-md align-middle" />
          <template v-else>{{ formatPeso(period.revenue) }}</template>
        </p>
        <p v-if="period" class="mt-2 flex items-center gap-1.5 text-[13px] text-[#8B6656]">
          <span
            v-if="period.revenue_change !== null"
            class="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
            :class="period.revenue_change >= 0 ? 'bg-[#E3F4E8] text-[#1F6B3A]' : 'bg-[#FBE4E1] text-[#A2352A]'"
          >
            <Icon :name="period.revenue_change >= 0 ? 'heroicons:arrow-up-20-solid' : 'heroicons:arrow-down-20-solid'" class="h-3.5 w-3.5" />
            <span class="sr-only">{{ period.revenue_change >= 0 ? 'Up' : 'Down' }}</span>{{ Math.abs(period.revenue_change) }}%
          </span>
          <span v-if="period.revenue_change !== null">vs {{ compareLabel }}</span>
          <span v-else>No sales in the {{ compareLabel }} to compare with</span>
        </p>
      </div>
      <dl v-if="period" class="flex gap-8 pb-0.5">
        <div>
          <dt class="text-[12px] text-[#8B6656]">Orders</dt>
          <dd class="mt-0.5 font-display text-lg font-semibold text-[#3B1F0E] tabular-nums">{{ formatCount(period.orders) }}</dd>
        </div>
        <div>
          <dt class="text-[12px] text-[#8B6656]">Average order</dt>
          <dd class="mt-0.5 font-display text-lg font-semibold text-[#3B1F0E] tabular-nums">{{ formatPesoCents(period.avg_order_value) }}</dd>
        </div>
      </dl>
    </div>

    <!-- Plot -->
    <div class="relative mt-8 flex-1 min-h-[260px]" :class="{ 'opacity-50 transition-opacity': refreshing }">
      <div v-if="loading" class="absolute inset-0 flex items-end gap-2 pl-14 pb-7">
        <div v-for="i in 14" :key="i" class="skeleton flex-1 rounded-t" :style="{ height: `${20 + ((i * 37) % 60)}%` }" />
      </div>

      <template v-else>
        <!-- Gridlines + y labels -->
        <div class="pointer-events-none absolute inset-x-0 top-0 bottom-7" aria-hidden="true">
          <div
            v-for="(t, i) in ticks"
            :key="i"
            class="absolute inset-x-0 flex items-center"
            :style="{ top: `${(i / (ticks.length - 1)) * 100}%` }"
          >
            <span class="w-12 -translate-y-1/2 pr-2 text-right text-[11px] text-[#9E7060] tabular-nums">{{ formatPesoCompact(t) }}</span>
            <span class="-translate-y-1/2 h-px flex-1" :class="t === 0 ? 'bg-[#D9C3A5]' : 'bg-[#F0E4D0]'" />
          </div>
        </div>

        <!-- Bars -->
        <div
          class="absolute inset-0 left-12 flex"
          role="list"
          aria-label="Income per period"
          @mouseleave="active = null"
        >
          <div
            v-for="(p, i) in series"
            :key="p.start"
            role="listitem"
            tabindex="0"
            :aria-label="`${bucketTitle(i)}: ${formatPesoCents(p.revenue)} from ${p.orders} orders`"
            class="group relative flex flex-1 flex-col items-center outline-none"
            @mouseenter="active = i"
            @focus="active = i"
            @blur="active = null"
            @keydown="onKey($event, i)"
          >
            <div class="relative flex w-full flex-1 items-end justify-center px-[3px] sm:px-1.5">
              <div
                class="bar h-full w-full max-w-[34px]"
                :class="[
                  i === lastIndex ? 'bar--current' : '',
                  active === i ? 'bar--active' : '',
                ]"
                :style="{ clipPath: barClip(p.revenue) }"
              />
              <span
                class="pointer-events-none absolute inset-x-0.5 bottom-0 top-0 rounded-md ring-2 ring-[#7D5A50] opacity-0 group-focus-visible:opacity-100"
                aria-hidden="true"
              />
              <!-- Tooltip -->
              <div
                v-if="activePoint && active === i"
                class="tooltip pointer-events-none absolute z-20 w-max min-w-[150px] rounded-xl bg-[#2D201B] px-3.5 py-2.5 text-left shadow-[0_10px_24px_-10px_rgba(45,32,27,0.6)]"
                :class="tooltipAlign(i)"
                :style="{ bottom: `calc(${(p.revenue / max) * 100}% + 8px)` }"
                aria-hidden="true"
              >
                <p class="text-[11px] text-[#D9BFA8]">
                  {{ bucketTitle(i) }}<span v-if="i === lastIndex" class="text-[#F2B66D]"> · so far</span>
                </p>
                <p class="mt-1 font-display text-base font-semibold text-[#FFF0D1] tabular-nums">{{ formatPesoCents(p.revenue) }}</p>
                <p class="text-[11px] text-[#D9BFA8] tabular-nums">{{ formatCount(p.orders) }} {{ p.orders === 1 ? 'order' : 'orders' }}</p>
              </div>
            </div>
            <span
              class="h-7 pt-2 text-[11px] whitespace-nowrap tabular-nums"
              :class="[
                active === i ? 'text-[#3B1F0E] font-semibold' : 'text-[#9E7060]',
                i % 2 === 1 && i !== lastIndex ? 'max-sm:invisible' : '',
              ]"
              aria-hidden="true"
            >{{ i === lastIndex && range === 'daily' ? 'Today' : barLabel(i) }}</span>

          </div>
        </div>

        <div
          v-if="isEmpty"
          class="absolute inset-0 left-12 bottom-7 flex items-center justify-center p-6"
        >
          <div class="max-w-xs rounded-2xl bg-white/90 px-5 py-4 text-center backdrop-blur-[2px]">
            <p class="font-display font-semibold text-[#3B1F0E]">No sales in this period</p>
            <p class="mt-1 text-[13px] text-[#8B6656]">Income shows up here as soon as any branch rings up an order on the POS.</p>
          </div>
        </div>
      </template>
    </div>

    <p class="mt-4 flex items-center gap-2 text-[12px] text-[#9E7060]">
      <span class="legend-swatch" aria-hidden="true" />
      Striped bar is the current {{ range === 'daily' ? 'day' : range === 'weekly' ? 'week' : 'month' }}, still in progress.
    </p>

    <!-- Same numbers as a table for screen readers -->
    <table class="sr-only">
      <caption>Income per {{ range === 'daily' ? 'day' : range === 'weekly' ? 'week' : 'month' }}, all branches</caption>
      <thead><tr><th scope="col">Period</th><th scope="col">Income</th><th scope="col">Orders</th></tr></thead>
      <tbody>
        <tr v-for="(p, i) in series" :key="p.start">
          <th scope="row">{{ bucketTitle(i) }}</th>
          <td>{{ formatPesoCents(p.revenue) }}</td>
          <td>{{ p.orders }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, #F6ECDD, #FBF4EA, #F6ECDD);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

.segmented {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: 12px;
  background: #F3E7D2;
}

.bar {
  background: #B4846C;
  transition: clip-path 520ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease;
}

.group:hover .bar,
.bar--active {
  background: #7D5A50;
}

.bar--current {
  background: repeating-linear-gradient(135deg, #B4846C 0 5px, #CFA88F 5px 9px);
}

.group:hover .bar--current,
.bar--current.bar--active {
  background: repeating-linear-gradient(135deg, #7D5A50 0 5px, #9A7466 5px 9px);
}

.legend-swatch {
  width: 14px;
  height: 10px;
  border-radius: 2px;
  background: repeating-linear-gradient(135deg, #B4846C 0 3px, #CFA88F 3px 5px);
}

.tooltip {
  animation: tip-in 160ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes tip-in {
  from { opacity: 0; transform: translateY(4px); }
}

.left-1\/2.tooltip {
  animation-name: tip-in-centered;
}

@keyframes tip-in-centered {
  from { opacity: 0; transform: translate(-50%, 4px); }
}

@media (prefers-reduced-motion: reduce) {
  .bar, .tooltip, .skeleton { transition: none; animation: none; }
}
</style>
