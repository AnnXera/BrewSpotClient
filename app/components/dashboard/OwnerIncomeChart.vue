<!-- app/components/dashboard/OwnerIncomeChart.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DropdownList from '~/components/common/DropdownList.vue'
import type { DashboardRange, OwnerDashboardStats } from '~/services/OwnerProfileService'
import { formatCount, formatDay, formatPeso, formatPesoCents, formatSpan, niceMax } from '~/utils/dashboardFormat'

// Same look as the manager's Performance overview, across all branches,
// with only the daily / weekly / monthly periods (no date picker).
const props = defineProps<{
  period: OwnerDashboardStats['period'] | null
  series: OwnerDashboardStats['series']
  range: DashboardRange
  loading: boolean   // first load: nothing to show yet
  refreshing: boolean // range switch: keep the old chart, dim it
}>()

const emit = defineEmits<{ 'update:range': [DashboardRange] }>()

const chartType = ref<'bar' | 'line'>('bar')

// Re-run the entrance animation on a range or view change (not on refresh)
const chartAnimationKey = ref(0)
watch([() => props.range, chartType], () => {
  chartAnimationKey.value++
  active.value = null
})

// The comparison covers the same stretch of the window before (e.g. last week up to the same day).
const ranges: { value: DashboardRange; label: string; compare: string; none: string }[] = [
  { value: 'daily', label: 'Daily', compare: 'last week, same days', none: 'No sales last week to compare with' },
  { value: 'weekly', label: 'Weekly', compare: 'the 12 weeks before', none: 'No sales in the 12 weeks before to compare with' },
  { value: 'monthly', label: 'Monthly', compare: 'the 12 months before', none: 'No sales in the 12 months before to compare with' },
]

const currentRange = computed(() => ranges.find(r => r.value === props.range))

// Period dropdown options.
const periodOptions = ranges.map(r => ({ value: r.value, label: r.label }))

const max = computed(() => niceMax(Math.max(0, ...props.series.map(p => p.revenue))))
const tickPercentages = ['100%', '75%', '50%', '25%', '0%']
const isEmpty = computed(() => !props.loading && props.series.every(p => p.revenue === 0))

const active = ref<number | null>(null)

// The bucket still running (today / this week / this month). In the daily week,
// the days after it are upcoming and stay empty.
const currentIndex = computed(() => {
  const i = props.series.findIndex(p => p.upcoming)
  return (i === -1 ? props.series.length : i) - 1
})

function barHeightPercent(revenue: number) {
  if (revenue <= 0) return 0
  return Math.min(100, Math.max(3, (revenue / max.value) * 100))
}

function barLabel(i: number) {
  const p = props.series[i]
  if (!p) return ''
  if (props.range === 'monthly') return formatDay(p.start, { month: 'short' })
  if (props.range === 'daily') {
    return i === currentIndex.value ? 'Today' : `${formatDay(p.start, { weekday: 'short' })} ${formatDay(p.start, { day: 'numeric' })}`
  }
  return formatDay(p.start)
}

function barLabelShort(i: number) {
  const p = props.series[i]
  if (!p) return ''
  if (props.range === 'daily') {
    return i === currentIndex.value ? 'Today' : formatDay(p.start, { day: 'numeric' })
  }
  if (i % 2 !== 0 && props.series.length > 8) return ''
  if (props.range === 'monthly') return formatDay(p.start, { month: 'short' })
  return formatDay(p.start, { month: 'numeric', day: 'numeric' })
}

function bucketTitle(i: number) {
  const p = props.series[i]
  if (!p) return ''
  if (props.range === 'daily') return formatDay(p.start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  if (props.range === 'weekly') return `Week of ${formatSpan(p.start, p.end)}`
  return formatDay(p.start, { month: 'long', year: 'numeric' })
}

function tooltipAlign(i: number) {
  const n = props.series.length
  if (i <= 1) return 'left-0 sm:left-1/2 sm:-translate-x-1/2'
  if (i >= n - 2) return 'right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2'
  return 'left-1/2 -translate-x-1/2'
}

// Arrow keys move between the buckets that have happened.
function onKey(e: KeyboardEvent, i: number) {
  const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
  if (next === null || next < 0 || next > currentIndex.value) return
  e.preventDefault()
  const el = (e.currentTarget as HTMLElement).parentElement?.children[next] as HTMLElement | undefined
  el?.focus()
}

// ── Line graph ──
const SVG_WIDTH = 1000
const SVG_HEIGHT = 200
// The y scale matches the bars and the 0-100% axis: zero sits on the baseline, max on the top line.
const svgPoints = computed(() => {
  const n = props.series.length
  if (n === 0) return []
  const colWidth = SVG_WIDTH / n
  return props.series.map((point, i) => {
    const ratio = max.value > 0 ? Math.max(0, Math.min(1, point.revenue / max.value)) : 0
    return { x: (i + 0.5) * colWidth, y: SVG_HEIGHT - ratio * SVG_HEIGHT, upcoming: !!point.upcoming }
  })
})

// The line stops at the current bucket; upcoming ones have no sales yet.
const linePoints = computed(() => svgPoints.value.filter(p => !p.upcoming))

const linePath = computed(() => {
  const pts = linePoints.value
  if (pts.length === 0) return ''
  let d = `M ${pts[0]!.x},${pts[0]!.y}`
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1]!
    const p1 = pts[i]!
    const dx = (p1.x - p0.x) * 0.45
    d += ` C ${p0.x + dx},${p0.y} ${p1.x - dx},${p1.y} ${p1.x},${p1.y}`
  }
  return d
})

const areaPath = computed(() => {
  const pts = linePoints.value
  if (pts.length === 0) return ''
  return `${linePath.value} L ${pts[pts.length - 1]!.x},${SVG_HEIGHT} L ${pts[0]!.x},${SVG_HEIGHT} Z`
})
</script>

<template>
  <section
    class="flex flex-col rounded-[22px] border border-[#EEDFC4] bg-white p-5 shadow-[0_1px_2px_rgba(59,31,14,0.04)] sm:p-6"
    aria-labelledby="income-heading"
  >
    <!-- Header: title + info, view toggle, period -->
    <!-- The title side shrinks (its subtitle wraps) before the controls drop below it -->
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-[220px] flex-1 basis-0">
        <div class="flex items-center gap-2">
          <h2 id="income-heading" class="font-display text-[18px] font-bold text-[#3B1F0E]">
            Performance overview
          </h2>
          <div class="group relative inline-flex">
            <button
              type="button"
              class="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#8B6656] transition-colors hover:text-[#3B1F0E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
              aria-label="Chart information"
            >
              <Icon name="heroicons:information-circle" class="h-4 w-4" />
            </button>
            <div
              class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-xl bg-[#2D1B10] p-3 text-xs text-[#FFF8EA] shadow-xl group-hover:block group-focus-within:block"
            >
              <p class="font-semibold text-white">Income & Sales Trends</p>
              <p class="mt-1 text-[11px] leading-relaxed text-[#D9BFA8]">
                Revenue from every branch over time. Hover on any point to see its income and orders. Switch between line and bar views, or pick a daily, weekly or monthly period.
              </p>
            </div>
          </div>
        </div>
        <p class="mt-0.5 text-[13px] text-[#8B6656]">
          Revenue generated across all branches
          <template v-if="period"> · {{ formatSpan(period.from, period.to) }}</template>
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- Line / Bar switcher -->
        <div
          role="group"
          aria-label="Chart view type"
          class="inline-flex items-center rounded-xl bg-[#F6ECDD] p-1 text-[#8B6656]"
        >
          <button
            type="button"
            :aria-pressed="chartType === 'line'"
            title="Line graph"
            aria-label="Line graph"
            class="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
            :class="chartType === 'line' ? 'bg-white text-[#3B1F0E] shadow-[0_1px_3px_rgba(59,31,14,0.12)]' : 'text-[#8B6656] hover:text-[#3B1F0E]'"
            @click="chartType = 'line'"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 14l4-5 4 3 6-7" />
              <circle cx="3" cy="14" r="1.5" fill="currentColor" />
              <circle cx="7" cy="9" r="1.5" fill="currentColor" />
              <circle cx="11" cy="12" r="1.5" fill="currentColor" />
              <circle cx="17" cy="5" r="1.5" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            :aria-pressed="chartType === 'bar'"
            title="Bar graph"
            aria-label="Bar graph"
            class="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
            :class="chartType === 'bar' ? 'bg-white text-[#3B1F0E] shadow-[0_1px_3px_rgba(59,31,14,0.12)]' : 'text-[#8B6656] hover:text-[#3B1F0E]'"
            @click="chartType = 'bar'"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <rect x="3" y="10" width="3" height="7" rx="1" />
              <rect x="8.5" y="4" width="3" height="13" rx="1" />
              <rect x="14" y="7" width="3" height="10" rx="1" />
            </svg>
          </button>
        </div>

        <!-- Period dropdown: the app's dropdown, white card style -->
        <div class="w-[136px]">
          <DropdownList
            :model-value="range"
            :options="periodOptions"
            size="xs"
            card
            align="right"
            icon="heroicons:calendar-days"
            aria-label="Chart period"
            @update:model-value="v => emit('update:range', v)"
          />
        </div>
      </div>
    </header>

    <!-- Period summary strip -->
    <div
      :key="chartAnimationKey"
      class="animate-summary-enter mt-5 grid grid-cols-2 gap-4 border-y border-[#F3E5D0] py-4 sm:grid-cols-4"
    >
      <div>
        <p class="text-[12px] font-medium text-[#8B6656]">Range Revenue</p>
        <p class="mt-1 font-display text-xl font-bold tabular-nums text-[#3B1F0E]">
          <span v-if="loading || !period" class="skeleton inline-block h-6 w-24 rounded align-middle" />
          <template v-else>{{ formatPeso(period.revenue) }}</template>
        </p>
      </div>

      <div>
        <p class="text-[12px] font-medium text-[#8B6656]">Range Orders</p>
        <p class="mt-1 font-display text-xl font-bold tabular-nums text-[#3B1F0E]">
          <span v-if="loading || !period" class="skeleton inline-block h-6 w-16 rounded align-middle" />
          <template v-else>{{ formatCount(period.orders) }}</template>
        </p>
      </div>

      <div>
        <p class="text-[12px] font-medium text-[#8B6656]">Avg. Order Value</p>
        <p class="mt-1 font-display text-xl font-bold tabular-nums text-[#3B1F0E]">
          <span v-if="loading || !period" class="skeleton inline-block h-6 w-20 rounded align-middle" />
          <template v-else>{{ formatPesoCents(period.avg_order_value) }}</template>
        </p>
      </div>

      <div>
        <p class="text-[12px] font-medium text-[#8B6656]">Vs. Prev. Period</p>
        <p class="mt-1 font-display text-xl font-bold tabular-nums">
          <span v-if="loading || !period" class="skeleton inline-block h-6 w-16 rounded align-middle" />
          <span
            v-else-if="period.revenue_change !== null"
            class="inline-flex items-center gap-1"
            :class="period.revenue_change >= 0 ? 'text-emerald-700' : 'text-red-700'"
          >
            <Icon :name="period.revenue_change >= 0 ? 'heroicons:arrow-trending-up-20-solid' : 'heroicons:arrow-trending-down-20-solid'" class="h-5 w-5" aria-hidden="true" />
            <span class="sr-only">{{ period.revenue_change >= 0 ? 'Up' : 'Down' }}</span>{{ period.revenue_change > 0 ? '+' : '' }}{{ period.revenue_change }}%
          </span>
          <span v-else class="text-[#C2A592]">&ndash;</span>
        </p>
        <p v-if="!loading && period" class="mt-0.5 text-[11px] leading-snug text-[#9E7060]">
          {{ period.revenue_change !== null ? `vs ${currentRange?.compare}` : currentRange?.none }}
        </p>
      </div>
    </div>

    <!-- Chart: y-axis + plot -->
    <div class="mt-7 flex flex-1 flex-col justify-end">
      <div class="grid grid-cols-[40px_minmax(0,1fr)] gap-x-2 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-x-3">
        <div class="relative h-[220px]" aria-hidden="true">
          <div
            v-for="(pct, idx) in tickPercentages"
            :key="idx"
            class="absolute right-0 -translate-y-1/2 text-[11px] font-medium tabular-nums text-[#A88879]"
            :style="{ top: `${idx * 25}%` }"
          >
            {{ pct }}
          </div>
        </div>

        <div class="relative h-[220px]">
          <!-- Grid lines -->
          <div class="pointer-events-none absolute inset-0" aria-hidden="true">
            <div
              v-for="(_, idx) in tickPercentages"
              :key="idx"
              class="absolute inset-x-0 border-t"
              :class="idx === tickPercentages.length - 1 ? 'border-[#E3CFB4]' : 'border-dashed border-[#F3E5D0]'"
              :style="{ top: `${idx * 25}%` }"
            />
          </div>

          <!-- Loading -->
          <div v-if="loading" class="absolute inset-0 z-10 flex items-end gap-1.5 sm:gap-2.5">
            <div
              v-for="i in (range === 'daily' ? 7 : 12)"
              :key="i"
              class="skeleton mx-auto w-full max-w-[38px] flex-1 rounded-t-md"
              :style="{ height: `${20 + ((i * 37) % 60)}%` }"
            />
          </div>

          <Transition v-else name="chart-fade" mode="out-in">
            <!-- Bar graph -->
            <div
              v-if="chartType === 'bar'"
              :key="`bar-${chartAnimationKey}`"
              class="relative z-10 grid h-full items-end gap-1.5 transition-opacity duration-200 sm:gap-2.5"
              :class="{ 'opacity-50': refreshing }"
              :style="{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }"
              role="list"
              aria-label="Income per period"
            >
              <div
                v-for="(point, i) in series"
                :key="point.start"
                role="listitem"
                class="group relative flex h-full flex-col items-center justify-end outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                :class="point.upcoming ? '' : 'cursor-pointer'"
                :tabindex="point.upcoming ? -1 : 0"
                :aria-label="point.upcoming ? `${bucketTitle(i)}: upcoming` : `${bucketTitle(i)}: ${formatPesoCents(point.revenue)}, ${formatCount(point.orders)} orders`"
                @mouseenter="active = point.upcoming ? null : i"
                @mouseleave="active = null"
                @focus="active = i"
                @blur="active = null"
                @keydown="onKey($event, i)"
              >
                <div class="absolute inset-x-0 bottom-0 top-0 mx-auto w-full max-w-[38px] rounded-t-lg bg-[#FAF4EB]/70 transition-colors group-hover:bg-[#F6ECDD]/80" />

                <div
                  v-if="active === i && !point.upcoming"
                  class="pointer-events-none absolute inset-y-0 left-1/2 z-20 -translate-x-1/2 border-l border-dashed border-[#5A3828]/60"
                />

                <div
                  v-if="!point.upcoming && point.revenue > 0"
                  class="owner-bar relative z-10 w-full max-w-[38px] rounded-t-md transition-all duration-200"
                  :class="active === i ? 'bg-gradient-to-t from-[#5A3828] to-[#3B1F0E]' : i === currentIndex ? 'bg-gradient-to-t from-[#7D5A50] to-[#5A3828]' : 'bg-gradient-to-t from-[#8E6A5C] to-[#6A4739] group-hover:from-[#7D5A50] group-hover:to-[#5A3828]'"
                  :style="{ height: `${barHeightPercent(point.revenue)}%`, '--bar-delay': `${i * 45}ms` }"
                >
                  <div
                    v-if="active === i"
                    class="absolute -top-1.5 left-1/2 z-30 h-3 w-3 -translate-x-1/2 rounded-full bg-[#3B1F0E] shadow-sm ring-2 ring-white"
                  />
                </div>
                <div
                  v-else-if="!point.upcoming"
                  class="relative z-10 h-[3px] w-full max-w-[38px] rounded-t-sm bg-[#E3CFB4]"
                />
                <div
                  v-else
                  class="relative z-10 h-full w-full max-w-[38px] rounded-t-md bg-[#FAF4EB]/30"
                />

                <div
                  v-if="active === i && !point.upcoming"
                  class="chart-tooltip pointer-events-none absolute bottom-[calc(100%+10px)] z-40 whitespace-nowrap rounded-xl border border-[#4A2E1F] bg-[#2D1B10] px-3.5 py-2.5 text-xs text-white shadow-[0_12px_28px_-6px_rgba(45,27,16,0.6)]"
                  :class="tooltipAlign(i)"
                  role="presentation"
                >
                  <p class="text-[11px] font-semibold text-[#D9BFA8]">
                    {{ bucketTitle(i) }}<span v-if="i === currentIndex" class="text-[#F2B66D]"> · so far</span>
                  </p>
                  <div class="mt-1 flex items-baseline gap-1.5">
                    <span class="text-xs text-[#E3CFB4]">Total Income:</span>
                    <span class="font-display text-base font-bold tabular-nums text-[#FFF0D1]">{{ formatPeso(point.revenue) }}</span>
                  </div>
                  <p class="mt-0.5 text-[11px] font-medium tabular-nums text-[#9FE0B4]">
                    {{ formatCount(point.orders) }} {{ point.orders === 1 ? 'order' : 'orders' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Line graph -->
            <div
              v-else
              :key="`line-${chartAnimationKey}`"
              class="relative z-10 h-full w-full transition-opacity duration-200"
              :class="{ 'opacity-50': refreshing }"
            >
              <svg class="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="ownerIncomeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#5A3828" stop-opacity="0.25" />
                    <stop offset="65%" stop-color="#7D5A50" stop-opacity="0.08" />
                    <stop offset="100%" stop-color="#7D5A50" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path v-if="linePoints.length > 1" :d="areaPath" fill="url(#ownerIncomeAreaGradient)" />
                <path
                  v-if="linePoints.length > 1"
                  :d="linePath"
                  fill="none"
                  stroke="#3B1F0E"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  vector-effect="non-scaling-stroke"
                  class="chart-line-path"
                />
                <line
                  v-if="active !== null && svgPoints[active]"
                  :x1="svgPoints[active]!.x"
                  y1="0"
                  :x2="svgPoints[active]!.x"
                  y2="200"
                  stroke="#7D5A50"
                  stroke-width="1.5"
                  stroke-dasharray="4 4"
                  vector-effect="non-scaling-stroke"
                />
              </svg>

              <!-- Point markers as HTML so they stay round under the stretched SVG -->
              <div class="pointer-events-none absolute inset-0">
                <template v-for="(pt, idx) in svgPoints" :key="idx">
                  <template v-if="!pt.upcoming">
                  <span
                    v-if="active === idx"
                    class="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-[#3B1F0E]/20"
                    :style="{ left: `${pt.x / 10}%`, top: `${pt.y / 2}%` }"
                  />
                  <span
                    class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150"
                    :class="active === idx ? 'h-3 w-3 bg-[#3B1F0E] ring-[2.5px] ring-white' : 'h-[9px] w-[9px] border-2 border-[#5A3828] bg-white'"
                    :style="{ left: `${pt.x / 10}%`, top: `${pt.y / 2}%` }"
                  />
                  </template>
                </template>
              </div>

              <!-- Hover columns -->
              <div
                class="absolute inset-0 grid h-full w-full"
                :style="{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }"
                role="list"
                aria-label="Income per period"
              >
                <div
                  v-for="(point, i) in series"
                  :key="point.start"
                  role="listitem"
                  class="group relative flex h-full flex-col items-center justify-end outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                  :class="point.upcoming ? '' : 'cursor-pointer'"
                  :tabindex="point.upcoming ? -1 : 0"
                  :aria-label="point.upcoming ? `${bucketTitle(i)}: upcoming` : `${bucketTitle(i)}: ${formatPesoCents(point.revenue)}, ${formatCount(point.orders)} orders`"
                  @mouseenter="active = point.upcoming ? null : i"
                  @mouseleave="active = null"
                  @focus="active = i"
                  @blur="active = null"
                  @keydown="onKey($event, i)"
                >
                  <div
                    v-if="active === i && !point.upcoming"
                    class="chart-tooltip pointer-events-none absolute bottom-[calc(100%+10px)] z-40 whitespace-nowrap rounded-xl border border-[#4A2E1F] bg-[#2D1B10] px-3.5 py-2.5 text-xs text-white shadow-[0_12px_28px_-6px_rgba(45,27,16,0.6)]"
                    :class="tooltipAlign(i)"
                    role="presentation"
                  >
                    <p class="text-[11px] font-semibold text-[#D9BFA8]">
                      {{ bucketTitle(i) }}<span v-if="i === currentIndex" class="text-[#F2B66D]"> · so far</span>
                    </p>
                    <div class="mt-1 flex items-baseline gap-1.5">
                      <span class="text-xs text-[#E3CFB4]">Total Income:</span>
                      <span class="font-display text-base font-bold tabular-nums text-[#FFF0D1]">{{ formatPeso(point.revenue) }}</span>
                    </div>
                    <p class="mt-0.5 text-[11px] font-medium tabular-nums text-[#9FE0B4]">
                      {{ formatCount(point.orders) }} {{ point.orders === 1 ? 'order' : 'orders' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Empty state -->
          <div v-if="isEmpty" class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <p class="rounded-xl border border-[#E3CFB4] bg-white px-4 py-2 text-xs font-medium text-[#8B6656] shadow-sm">
              No sales recorded in this range yet.
            </p>
          </div>
        </div>
      </div>

      <!-- X-axis labels -->
      <div
        class="ml-[40px] mt-3.5 grid gap-1.5 text-center text-[11px] font-medium text-[#8B6656] sm:ml-[48px] sm:gap-2.5"
        :style="{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }"
        aria-hidden="true"
      >
        <span
          v-for="(point, i) in series"
          :key="point.start"
          class="whitespace-nowrap transition-colors duration-150 sm:truncate"
          :class="{ 'font-bold text-[#3B1F0E]': i === currentIndex || active === i }"
        >
          <span class="sm:hidden">{{ barLabelShort(i) }}</span>
          <span class="hidden sm:inline">{{ barLabel(i) }}</span>
        </span>
      </div>
    </div>

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

@keyframes barGrow {
  0% { transform: scaleY(0.04); opacity: 0.2; }
  100% { transform: scaleY(1); opacity: 1; }
}

.owner-bar {
  transform-origin: bottom;
  animation: barGrow 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--bar-delay, 0ms);
  will-change: transform;
}

@keyframes lineDraw {
  from { stroke-dashoffset: 2000; }
  to { stroke-dashoffset: 0; }
}

.chart-line-path {
  stroke-dasharray: 2000;
  animation: lineDraw 850ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes summaryEnter {
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}

.animate-summary-enter {
  animation: summaryEnter 650ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}

/* Tooltip is a sibling of the translate classes, so it animates opacity only to keep its centering */
.chart-tooltip {
  animation: tooltipFade 150ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

@keyframes tooltipFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.chart-fade-enter-active,
.chart-fade-leave-active {
  transition: opacity 220ms cubic-bezier(0.23, 1, 0.32, 1), transform 220ms cubic-bezier(0.23, 1, 0.32, 1);
}

.chart-fade-enter-from,
.chart-fade-leave-to {
  opacity: 0;
  transform: scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .owner-bar,
  .chart-line-path,
  .skeleton,
  .animate-summary-enter,
  .chart-tooltip,
  .chart-fade-enter-active,
  .chart-fade-leave-active {
    animation: none !important;
    transform: none !important;
    transition: none !important;
  }
}
</style>
