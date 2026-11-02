<!-- app/components/manager/ManagerIncomeChart.vue -->
<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import type { DashboardRange } from '~/services/OwnerProfileService'
import type { ManagerDashboardStats } from '~/services/ManagerDashboardService'
import {
  formatCount,
  formatDay,
  formatPeso,
  formatPesoCents,
  formatPesoCompact,
  formatSpan,
  niceMax,
  parseDay,
  toDay,
} from '~/utils/dashboardFormat'
import EmilCalendar from '~/components/common/EmilCalendar.vue'

const props = defineProps<{
  period: ManagerDashboardStats['period'] | null
  series: ManagerDashboardStats['series']
  range: DashboardRange
  loading: boolean
  refreshing: boolean
  branchUuid?: string
}>()

const emit = defineEmits<{ 'update:range': [DashboardRange] }>()

const service = useManagerDashboardService()

// Chart display mode: 'bar' or 'line'
const chartType = ref<'bar' | 'line'>('bar')

// Year and Date filtering
const currentYear = new Date().getFullYear().toString()
const selectedYear = ref<string>(currentYear)
const availableYears = ['2026', '2025', '2024', '2023', '2022', '2021']

// Dropdown & Date Picker states
const showTimeDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const pickedDate = ref('')
const inspectingDate = ref(false)
const inspectedDateInfo = ref<{
  date: string
  revenue: number
  orders: number
} | null>(null)

// Custom Date Range State
const pickedRange = ref<{ from: string; to: string } | null>(null)
const inspectingRange = ref(false)
const customRangeData = ref<{
  from: string
  to: string
  totalRevenue: number
  totalOrders: number
  avgTicket: number
  series: (typeof props.series)
} | null>(null)

// Animation key to re-trigger bar/line entrances smoothly
const chartAnimationKey = ref(0)
watch(
  [() => props.range, chartType, selectedYear],
  () => {
    chartAnimationKey.value++
    active.value = null
  }
)

const ranges: { value: DashboardRange; label: string; compare: string; none: string }[] = [
  { value: 'daily', label: 'Daily', compare: 'last week, same days', none: 'No sales last week to compare with' },
  { value: 'weekly', label: 'Weekly', compare: 'the 12 weeks before', none: 'No sales in the 12 weeks before to compare with' },
  { value: 'monthly', label: 'Monthly', compare: 'the 12 months before', none: 'No sales in the 12 months before to compare with' },
]

const currentRange = computed(() => ranges.find(r => r.value === props.range))

// Close dropdown on outside click
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  // Don't close if interacting with a teleported dialog / calendar
  if (target?.closest?.('[role="dialog"]') || target?.closest?.('.emil-calendar-popover')) {
    return
  }
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showTimeDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Filtered series: custom date range takes precedence, then monthly year filter
const displaySeries = computed(() => {
  if (customRangeData.value?.series && customRangeData.value.series.length > 0) {
    return customRangeData.value.series
  }
  if (!props.series || props.series.length === 0) return []
  if (props.range === 'monthly' && selectedYear.value !== 'all') {
    const filtered = props.series.filter(p => p.start.startsWith(selectedYear.value))
    if (filtered.length > 0) return filtered
  }
  return props.series
})

const max = computed(() => niceMax(Math.max(0, ...displaySeries.value.map(p => p.revenue))))
const ticks = computed(() => [1, 0.75, 0.5, 0.25, 0].map(f => max.value * f))
const tickPercentages = ['100%', '75%', '50%', '25%', '0%']
const isEmpty = computed(() => !props.loading && !inspectingRange.value && displaySeries.value.every(p => p.revenue === 0))

const active = ref<number | null>(null)
const activePoint = computed(() => (active.value === null ? null : displaySeries.value[active.value] ?? null))

const currentIndex = computed(() => {
  const i = displaySeries.value.findIndex(p => p.upcoming)
  return (i === -1 ? displaySeries.value.length : i) - 1
})

function barHeightPercent(revenue: number) {
  if (revenue <= 0) return 0
  const pct = (revenue / max.value) * 100
  return Math.min(100, Math.max(3, pct))
}

function barLabel(i: number) {
  const p = displaySeries.value[i]
  if (!p) return ''
  if (customRangeData.value) {
    if (p.start === p.end) {
      return formatDay(p.start, { month: 'short', day: 'numeric' })
    }
    return formatDay(p.start, { month: 'short', year: '2-digit' })
  }
  if (props.range === 'monthly') return formatDay(p.start, { month: 'short' })
  if (props.range === 'daily') {
    return i === currentIndex.value ? 'Today' : `${formatDay(p.start, { weekday: 'short' })} ${formatDay(p.start, { day: 'numeric' })}`
  }
  return formatDay(p.start)
}

function barLabelShort(i: number) {
  const p = displaySeries.value[i]
  if (!p) return ''
  if (customRangeData.value) {
    if (p.start === p.end) {
      return formatDay(p.start, { day: 'numeric' })
    }
    return formatDay(p.start, { month: 'short' })
  }
  if (props.range === 'daily') {
    return i === currentIndex.value ? 'Today' : formatDay(p.start, { day: 'numeric' })
  }
  if (i % 2 !== 0 && displaySeries.value.length > 8) return ''
  if (props.range === 'monthly') return formatDay(p.start, { month: 'short' })
  return formatDay(p.start, { month: 'numeric', day: 'numeric' })
}

function bucketTitle(i: number) {
  const p = displaySeries.value[i]
  if (!p) return ''
  if (customRangeData.value) {
    if (p.start === p.end) {
      return formatDay(p.start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
    return formatDay(p.start, { month: 'long', year: 'numeric' })
  }
  if (props.range === 'daily') return formatDay(p.start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  if (props.range === 'weekly') return `Week of ${formatSpan(p.start, p.end)}`
  return formatDay(p.start, { month: 'long', year: 'numeric' })
}

function tooltipAlign(i: number) {
  const n = displaySeries.value.length
  if (i <= 1) return 'left-0 sm:left-1/2 sm:-translate-x-1/2'
  if (i >= n - 2) return 'right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2'
  return 'left-1/2 -translate-x-1/2'
}

// ----------------------------------------------------
// SVG Coordinates for Line Graph
// ----------------------------------------------------
const SVG_WIDTH = 1000
const SVG_HEIGHT = 200
const PAD_TOP = 14
const PAD_BOTTOM = 14

interface SvgPoint {
  x: number
  y: number
  point: (typeof displaySeries.value)[0]
  index: number
}

const svgPoints = computed<SvgPoint[]>(() => {
  const n = displaySeries.value.length
  if (n === 0) return []

  const colWidth = SVG_WIDTH / n
  const usableHeight = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM

  return displaySeries.value.map((point, i) => {
    const x = (i + 0.5) * colWidth
    const ratio = max.value > 0 ? point.revenue / max.value : 0
    const clampedRatio = Math.max(0, Math.min(1, ratio))
    const y = SVG_HEIGHT - PAD_BOTTOM - clampedRatio * usableHeight
    return { x, y, point, index: i }
  })
})

// Catmull-Rom or smooth cubic spline for SVG line
const linePath = computed(() => {
  const pts = svgPoints.value
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0]!.x},${pts[0]!.y}`

  let d = `M ${pts[0]!.x},${pts[0]!.y}`
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1]!
    const p1 = pts[i]!
    const dx = (p1.x - p0.x) * 0.45
    d += ` C ${p0.x + dx},${p0.y} ${p1.x - dx},${p1.y} ${p1.x},${p1.y}`
  }
  return d
})

// Area closed path for gradient fill
const areaPath = computed(() => {
  const pts = svgPoints.value
  if (pts.length === 0) return ''
  const first = pts[0]!
  const last = pts[pts.length - 1]!
  return `${linePath.value} L ${last.x},${SVG_HEIGHT} L ${first.x},${SVG_HEIGHT} Z`
})

// ----------------------------------------------------
// Specific Date Picking & Inspecting
// ----------------------------------------------------
async function handleDatePicked() {
  if (!pickedDate.value) return
  const target = pickedDate.value

  // Check if target is already in displaySeries
  const matchIdx = displaySeries.value.findIndex(p => p.start === target || p.start.startsWith(target))
  if (matchIdx !== -1) {
    active.value = matchIdx
    inspectedDateInfo.value = null
    return
  }

  // If outside current series, query transactions for that exact day
  if (props.branchUuid) {
    inspectingDate.value = true
    try {
      const res = await service.getTransactions(props.branchUuid, {
        from: target,
        to: target,
        status: 'completed',
      })
      if (res?.success) {
        inspectedDateInfo.value = {
          date: target,
          revenue: res.today_stats?.completed_amount ?? 0,
          orders: res.today_stats?.completed_count ?? 0,
        }
      }
    } catch (err) {
      console.warn('Failed to load inspected date revenue:', err)
    } finally {
      inspectingDate.value = false
    }
  }
}

function clearInspectedDate() {
  pickedDate.value = ''
  inspectedDateInfo.value = null
  active.value = null
}

const pad = (n: number) => String(n).padStart(2, '0')

async function handleRangeSelected(range: { from: string; to: string }) {
  pickedRange.value = range
  inspectedDateInfo.value = null
  pickedDate.value = ''
  showTimeDropdown.value = false

  if (!props.branchUuid) return

  inspectingRange.value = true
  try {
    const res = await service.getTransactions(props.branchUuid, {
      from: range.from,
      to: range.to,
      status: 'completed',
      per_page: 100,
    })

    const startD = parseDay(range.from)
    const endD = parseDay(range.to)
    const diffDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    let totalRev = 0
    let totalOrders = 0
    const txList = res?.transactions?.data ?? []
    const points: (typeof props.series) = []
    const todayStr = toDay(new Date())
    const curMonthStr = todayStr.slice(0, 7)

    if (diffDays <= 35) {
      // Daily breakdown
      const cur = new Date(startD)
      while (cur <= endD) {
        const dStr = toDay(cur)
        const dayLabel = cur.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
        points.push({
          label: dayLabel,
          revenue: 0,
          orders: 0,
          start: dStr,
          end: dStr,
          upcoming: dStr > todayStr,
        })
        cur.setDate(cur.getDate() + 1)
      }

      for (const tx of txList) {
        const txDate = tx.created_at.slice(0, 10)
        const pt = points.find(p => p.start === txDate)
        const amt = Number(tx.total_amount) || 0
        if (pt) {
          pt.revenue += amt
          pt.orders += 1
        }
        totalRev += amt
        totalOrders += 1
      }
    } else {
      // Monthly breakdown (e.g. Jan 2023, Feb 2023, Mar 2023)
      let cur = new Date(startD.getFullYear(), startD.getMonth(), 1)
      const endMonth = new Date(endD.getFullYear(), endD.getMonth(), 1)
      while (cur <= endMonth) {
        const y = cur.getFullYear()
        const m = cur.getMonth()
        const mStr = `${y}-${pad(m + 1)}`
        const mLabel = cur.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })
        points.push({
          label: mLabel,
          revenue: 0,
          orders: 0,
          start: `${mStr}-01`,
          end: `${mStr}-31`,
          upcoming: mStr > curMonthStr,
        })
        cur.setMonth(cur.getMonth() + 1)
      }

      for (const tx of txList) {
        const txMonth = tx.created_at.slice(0, 7)
        const pt = points.find(p => p.start.startsWith(txMonth))
        const amt = Number(tx.total_amount) || 0
        if (pt) {
          pt.revenue += amt
          pt.orders += 1
        }
        totalRev += amt
        totalOrders += 1
      }
    }

    customRangeData.value = {
      from: range.from,
      to: range.to,
      totalRevenue: totalRev,
      totalOrders: totalOrders,
      avgTicket: totalOrders > 0 ? totalRev / totalOrders : 0,
      series: points,
    }
    chartAnimationKey.value++
    active.value = null
  } catch (err) {
    console.warn('Failed to load transactions for custom range:', err)
  } finally {
    inspectingRange.value = false
  }
}

function clearCustomRange() {
  pickedRange.value = null
  customRangeData.value = null
  chartAnimationKey.value++
  active.value = null
}

async function onCalendarDateSelect(date: string) {
  pickedDate.value = date
  await handleDatePicked()
  showTimeDropdown.value = false
}

function selectTimeframe(val: DashboardRange) {
  emit('update:range', val)
  showTimeDropdown.value = false
}

function selectYear(yr: string) {
  selectedYear.value = yr
  if (props.range !== 'monthly') {
    emit('update:range', 'monthly')
  }
  showTimeDropdown.value = false
}
</script>

<template>
  <section
    data-walkthrough="feat-chart"
    class="flex flex-col rounded-[22px] border border-[#EEDFC4] bg-white p-5 shadow-[0_1px_2px_rgba(59,31,14,0.04)] sm:p-6"
    aria-labelledby="income-heading"
  >
    <!-- Header: Title + Performance Overview info + Toggle Controls -->
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h2 id="income-heading" class="font-display text-[18px] font-bold text-[#3B1F0E]">
            Performance overview
          </h2>
          <!-- Info Tooltip Button -->
          <div class="group relative inline-flex">
            <button
              type="button"
              class="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#8B6656] transition-colors hover:text-[#3B1F0E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
              aria-label="Chart information"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <div
              class="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-64 -translate-x-1/2 rounded-xl bg-[#2D1B10] p-3 text-xs text-[#FFF8EA] shadow-xl group-hover:block z-50 transition-opacity duration-150"
            >
              <p class="font-semibold text-white">Income & Sales Trends</p>
              <p class="mt-1 text-[11px] leading-relaxed text-[#D9BFA8]">
                Shows revenue generated over time. Hover on any point to see exact daily income. Toggle between Line and Bar graph views, or select a date/year to inspect.
              </p>
            </div>
          </div>
        </div>
        <p class="mt-0.5 text-[13px] text-[#8B6656]">
          Revenue generated across this branch over time
        </p>
      </div>

      <!-- Right Header Controls: Graph Mode Toggles + Year/Period Dropdown -->
      <div class="flex items-center gap-2.5">
        <!-- Line / Bar Switcher -->
        <div
          role="group"
          aria-label="Chart view type"
          class="inline-flex items-center rounded-xl bg-[#F6ECDD] p-1 text-[#8B6656]"
        >
          <!-- Line Chart Toggle -->
          <button
            type="button"
            :aria-pressed="chartType === 'line'"
            title="Line Graph View"
            class="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
            :class="chartType === 'line' ? 'bg-white text-[#3B1F0E] shadow-[0_1px_3px_rgba(59,31,14,0.12)]' : 'text-[#8B6656] hover:text-[#3B1F0E]'"
            @click="chartType = 'line'"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 14l4-5 4 3 6-7" />
              <circle cx="3" cy="14" r="1.5" fill="currentColor" />
              <circle cx="7" cy="9" r="1.5" fill="currentColor" />
              <circle cx="11" cy="12" r="1.5" fill="currentColor" />
              <circle cx="17" cy="5" r="1.5" fill="currentColor" />
            </svg>
          </button>

          <!-- Bar Chart Toggle -->
          <button
            type="button"
            :aria-pressed="chartType === 'bar'"
            title="Bar Graph View"
            class="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
            :class="chartType === 'bar' ? 'bg-white text-[#3B1F0E] shadow-[0_1px_3px_rgba(59,31,14,0.12)]' : 'text-[#8B6656] hover:text-[#3B1F0E]'"
            @click="chartType = 'bar'"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <rect x="3" y="10" width="3" height="7" rx="1" />
              <rect x="8.5" y="4" width="3" height="13" rx="1" />
              <rect x="14" y="7" width="3" height="10" rx="1" />
            </svg>
          </button>
        </div>

        <!-- Direct Emil Calendar Range Trigger in Header -->
        <EmilCalendar
          mode="range"
          :range-value="pickedRange"
          align="right"
          @select-range="handleRangeSelected"
          @clear="clearCustomRange"
        >
          <template #trigger="{ open, toggle }">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-xl border border-[#E3CFB4] bg-[#FAF5EE] px-3 py-1.5 text-[13px] font-semibold text-[#3B1F0E] transition-all duration-150 hover:bg-[#F3E5D0] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
              :class="{ 'border-[#7D5A50] bg-[#F3E5D0] ring-2 ring-[#7D5A50]/20': open || pickedRange }"
              title="Pick a date range to inspect income (e.g. 2023 Jan to Mar)"
              @click="toggle"
            >
              <Icon name="heroicons:calendar-days" class="h-4 w-4 text-[#7D5A50]" />
              <span class="hidden sm:inline">{{ pickedRange ? formatSpan(pickedRange.from, pickedRange.to) : 'Date Range (e.g. 2023 Jan–Mar)' }}</span>
              <span class="sm:hidden">{{ pickedRange ? 'Range' : 'Calendar' }}</span>
              <span
                v-if="pickedRange"
                class="ml-0.5 inline-flex items-center justify-center rounded-full size-4 text-[10px] text-[#7D5A50] hover:bg-[#EDD8CC] transition-colors"
                title="Clear custom range"
                @click.stop="clearCustomRange"
              >
                ✕
              </span>
            </button>
          </template>
        </EmilCalendar>

        <!-- Year & Date Range Selector Dropdown -->
        <div ref="dropdownRef" class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border border-[#E3CFB4] bg-[#FAF5EE] px-3 py-1.5 text-[13px] font-semibold text-[#3B1F0E] transition-all duration-150 hover:bg-[#F3E5D0] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
            :aria-expanded="showTimeDropdown"
            @click="showTimeDropdown = !showTimeDropdown"
          >
            <!-- Clock/Calendar Icon -->
            <svg class="h-4 w-4 text-[#8B6656]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {{ customRangeData ? formatSpan(customRangeData.from, customRangeData.to) : range === 'monthly' ? `${selectedYear} (1 Year)` : currentRange?.label }}
            </span>
            <svg class="h-3.5 w-3.5 text-[#8B6656] transition-transform duration-150" :class="{ 'rotate-180': showTimeDropdown }" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="showTimeDropdown"
            class="dropdown-popover absolute right-0 top-full z-40 mt-1.5 w-64 rounded-2xl border border-[#E3CFB4] bg-white p-2.5 shadow-[0_12px_28px_rgba(59,31,14,0.12)]"
          >
            <!-- Section 1: Time Range -->
            <div class="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#A88879]">
              Time Period
            </div>
            <div class="space-y-0.5">
              <button
                v-for="r in ranges"
                :key="r.value"
                type="button"
                class="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors"
                :class="!customRangeData && range === r.value ? 'bg-[#F6ECDD] font-bold text-[#3B1F0E]' : 'text-[#6D4C42] hover:bg-[#FAF5EE]'"
                @click="clearCustomRange(); selectTimeframe(r.value)"
              >
                <span>{{ r.label }} Overview</span>
                <span v-if="!customRangeData && range === r.value" class="text-[#3B1F0E]">✓</span>
              </button>
            </div>

            <!-- Section 2: Year Filter -->
            <div class="mt-2.5 border-t border-[#F3E5D0] pt-2">
              <div class="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#A88879]">
                Select Year
              </div>
              <div class="grid grid-cols-3 gap-1 px-1">
                <button
                  v-for="yr in availableYears"
                  :key="yr"
                  type="button"
                  class="rounded-lg py-1 text-center text-xs font-semibold transition-all"
                  :class="!customRangeData && selectedYear === yr && range === 'monthly' ? 'bg-[#3B1F0E] text-white' : 'bg-[#FAF5EE] text-[#5A3828] hover:bg-[#F3E5D0]'"
                  @click="clearCustomRange(); selectYear(yr)"
                >
                  {{ yr }}
                </button>
              </div>
            </div>

            <!-- Section 3: Inspect Date Range via EmilCalendar -->
            <div class="mt-2.5 border-t border-[#F3E5D0] pt-2">
              <div class="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#A88879]">
                Inspect Date Range
              </div>
              <div class="mt-1 px-1">
                <EmilCalendar
                  mode="range"
                  :range-value="pickedRange"
                  align="right"
                  @select-range="handleRangeSelected"
                  @clear="clearCustomRange"
                >
                  <template #trigger="{ open, toggle }">
                    <button
                      type="button"
                      class="flex w-full items-center justify-between gap-2 rounded-xl border border-[#E3CFB4] bg-[#FAF5EE] px-2.5 py-1.5 text-xs font-medium text-[#3B1F0E] transition-all hover:bg-[#F3E5D0] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                      :class="{ 'border-[#7D5A50] ring-2 ring-[#7D5A50]/20 bg-[#F3E5D0]': open || pickedRange }"
                      @click="toggle"
                    >
                      <div class="flex items-center gap-2 min-w-0">
                        <Icon name="heroicons:calendar-days" class="size-4 shrink-0 text-[#7D5A50]" />
                        <span class="truncate">{{ pickedRange ? formatSpan(pickedRange.from, pickedRange.to) : 'Custom Range (e.g. 2023 Jan–Mar)' }}</span>
                      </div>
                      <Icon name="heroicons:chevron-down" class="size-3.5 shrink-0 text-[#8B6656] transition-transform duration-150" :class="{ 'rotate-180': open }" />
                    </button>
                  </template>
                </EmilCalendar>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Custom Range Banner (if user picked a date range like 2023 Jan to Mar) -->
    <div
      v-if="customRangeData"
      class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3CFB4] bg-[#FFF8EA] px-4 py-2.5 text-xs animate-summary-enter"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#3B1F0E] text-[11px] text-white">
          📅
        </span>
        <div>
          <span class="font-bold text-[#3B1F0E]">
            {{ formatSpan(customRangeData.from, customRangeData.to) }}
          </span>
          <span class="mx-1.5 text-[#A88879]">•</span>
          <span class="text-[#8B6656]">Total Income:</span>
          <span class="ml-1 font-bold text-[#2D1B10]">{{ formatPesoCents(customRangeData.totalRevenue) }}</span>
          <span class="ml-2 rounded-full bg-[#EEDFC4] px-2 py-0.5 text-[11px] font-semibold text-[#5A3828]">
            {{ formatCount(customRangeData.totalOrders) }} orders
          </span>
          <span class="mx-1.5 text-[#A88879]">•</span>
          <span class="text-[#8B6656]">Avg Ticket:</span>
          <span class="ml-1 font-semibold text-[#5A3828]">{{ formatPesoCents(customRangeData.avgTicket) }}</span>
        </div>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-xs font-semibold text-[#8B6656] hover:text-[#3B1F0E] transition-colors cursor-pointer"
        @click="clearCustomRange"
      >
        <span>Reset overview</span>
        <span class="font-bold">✕</span>
      </button>
    </div>

    <!-- Inspected Single Date Banner (if user picked a custom single date) -->
    <div
      v-else-if="inspectedDateInfo"
      class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3CFB4] bg-[#FFF8EA] px-4 py-2.5 text-xs animate-summary-enter"
    >
      <div class="flex items-center gap-2">
        <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#3B1F0E] text-[11px] text-white">
          📅
        </span>
        <div>
          <span class="font-bold text-[#3B1F0E]">
            {{ formatDay(inspectedDateInfo.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) }}
          </span>
          <span class="mx-1.5 text-[#A88879]">•</span>
          <span class="text-[#8B6656]">Total Income:</span>
          <span class="ml-1 font-bold text-[#2D1B10]">{{ formatPesoCents(inspectedDateInfo.revenue) }}</span>
          <span class="ml-2 rounded-full bg-[#EEDFC4] px-2 py-0.5 text-[11px] font-semibold text-[#5A3828]">
            {{ formatCount(inspectedDateInfo.orders) }} orders
          </span>
        </div>
      </div>
      <button
        type="button"
        class="text-xs font-semibold text-[#8B6656] hover:text-[#3B1F0E]"
        @click="clearInspectedDate"
      >
        Clear inspection
      </button>
    </div>

    <!-- Period summary strip -->
    <div
      :key="chartAnimationKey"
      class="animate-summary-enter mt-5 grid grid-cols-2 gap-4 border-y border-[#F3E5D0] py-4 sm:grid-cols-4"
    >
      <div>
        <p class="text-[12px] font-medium text-[#8B6656]">
          {{ customRangeData ? 'Custom Range Revenue' : 'Range Revenue' }}
        </p>
        <p class="mt-1 font-display text-xl font-bold tabular-nums text-[#3B1F0E]">
          <span v-if="loading || inspectingRange" class="skeleton inline-block h-6 w-24 rounded align-middle" />
          <template v-else-if="customRangeData">{{ formatPesoCents(customRangeData.totalRevenue) }}</template>
          <template v-else>{{ period ? formatPeso(period.revenue) : '₱0' }}</template>
        </p>
      </div>

      <div>
        <p class="text-[12px] font-medium text-[#8B6656]">
          {{ customRangeData ? 'Custom Range Orders' : 'Range Orders' }}
        </p>
        <p class="mt-1 font-display text-xl font-bold tabular-nums text-[#3B1F0E]">
          <span v-if="loading || inspectingRange" class="skeleton inline-block h-6 w-16 rounded align-middle" />
          <template v-else-if="customRangeData">{{ formatCount(customRangeData.totalOrders) }}</template>
          <template v-else>{{ period ? formatCount(period.orders) : '0' }}</template>
        </p>
      </div>

      <div>
        <p class="text-[12px] font-medium text-[#8B6656]">Avg. Order Value</p>
        <p class="mt-1 font-display text-xl font-bold tabular-nums text-[#3B1F0E]">
          <span v-if="loading || inspectingRange" class="skeleton inline-block h-6 w-20 rounded align-middle" />
          <template v-else-if="customRangeData">{{ formatPesoCents(customRangeData.avgTicket) }}</template>
          <template v-else>{{ period ? formatPesoCents(period.avg_order_value) : '₱0.00' }}</template>
        </p>
      </div>

      <div>
        <p class="text-[12px] font-medium text-[#8B6656]">
          {{ customRangeData ? 'Inspected Period' : 'Vs. Prev. Period' }}
        </p>
        <p class="mt-1 font-display text-xl font-bold tabular-nums">
          <span v-if="loading || inspectingRange" class="skeleton inline-block h-6 w-16 rounded align-middle" />
          <template v-else-if="customRangeData">
            <span class="inline-flex items-center gap-1 text-emerald-700 text-sm font-semibold">
              <Icon name="heroicons:calendar-days" class="size-4" />
              Custom
            </span>
          </template>
          <span
            v-else-if="period?.revenue_change !== null && period?.revenue_change !== undefined"
            class="inline-flex items-center gap-1"
            :class="period.revenue_change >= 0 ? 'text-emerald-700' : 'text-red-700'"
          >
            <Icon :name="period.revenue_change >= 0 ? 'heroicons:arrow-trending-up-20-solid' : 'heroicons:arrow-trending-down-20-solid'" class="h-5 w-5" aria-hidden="true" />
            {{ period.revenue_change > 0 ? '+' : '' }}{{ period.revenue_change }}%
          </span>
          <span v-else class="text-[#C2A592]">&ndash;</span>
        </p>
        <p v-if="!loading && !inspectingRange" class="mt-0.5 text-[11px] leading-snug text-[#9E7060]">
          {{ customRangeData ? formatSpan(customRangeData.from, customRangeData.to) : period?.revenue_change !== null && period?.revenue_change !== undefined ? `vs ${currentRange?.compare}` : currentRange?.none }}
        </p>
      </div>
    </div>

    <!-- Chart: Y-Axis percentages/ticks + Plot area -->
    <div class="mt-7 flex flex-1 flex-col justify-end">
      <div class="grid grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[48px_minmax(0,1fr)] gap-x-2 sm:gap-x-3">
        <!-- Y-axis percentage labels (matching mockup 100%, 75%, 50%, 25%, 0%) -->
        <div class="relative h-[220px]" aria-hidden="true">
          <div
            v-for="(pct, idx) in tickPercentages"
            :key="idx"
            class="absolute right-0 -translate-y-1/2 text-[11px] font-medium text-[#A88879] tabular-nums"
            :style="{ top: `${idx * 25}%` }"
          >
            {{ pct }}
          </div>
        </div>

        <!-- Plot Area (Holds both Bar and Line rendering with animated switch) -->
        <div class="relative h-[220px]">
          <!-- Grid lines -->
          <div class="pointer-events-none absolute inset-0" aria-hidden="true">
            <div
              v-for="(_, idx) in ticks"
              :key="idx"
              class="absolute inset-x-0 border-t"
              :class="idx === ticks.length - 1 ? 'border-[#E3CFB4]' : 'border-dashed border-[#F3E5D0]'"
              :style="{ top: `${idx * 25}%` }"
            />
          </div>

          <!-- Transition between Bar Graph and Line Graph -->
          <Transition name="chart-fade" mode="out-in">
            <!-- 1. BAR GRAPH MODE -->
            <div
              v-if="chartType === 'bar'"
              :key="`bar-${chartAnimationKey}`"
              class="relative z-10 grid h-full items-end gap-1.5 sm:gap-2.5 transition-opacity duration-200"
              :class="{ 'opacity-50': refreshing }"
              :style="{ gridTemplateColumns: `repeat(${displaySeries.length}, minmax(0, 1fr))` }"
            >
              <div
                v-for="(point, i) in displaySeries"
                :key="point.start"
                class="group relative flex h-full flex-col items-center justify-end outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                :class="point.upcoming ? '' : 'cursor-pointer'"
                :tabindex="point.upcoming ? -1 : 0"
                :aria-label="point.upcoming ? `${bucketTitle(i)}: upcoming` : `${bucketTitle(i)}: ${formatPesoCents(point.revenue)}, ${formatCount(point.orders)} orders`"
                @mouseenter="active = i"
                @mouseleave="active = null"
                @focus="active = i"
                @blur="active = null"
              >
                <!-- Full-height background track (from mockup) -->
                <div class="absolute inset-x-0 bottom-0 top-0 mx-auto w-full max-w-[38px] rounded-t-lg bg-[#FAF4EB]/70 transition-colors group-hover:bg-[#F6ECDD]/80" />

                <!-- Vertical dashed guide line when hovered -->
                <div
                  v-if="active === i && !point.upcoming"
                  class="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-[#5A3828]/60 z-20"
                />

                <!-- Filled Bar -->
                <div
                  v-if="!point.upcoming && point.revenue > 0"
                  class="manager-bar relative z-10 w-full max-w-[38px] rounded-t-md transition-all duration-200"
                  :class="active === i ? 'bg-gradient-to-t from-[#5A3828] to-[#3B1F0E]' : i === currentIndex ? 'bg-gradient-to-t from-[#7D5A50] to-[#5A3828]' : 'bg-gradient-to-t from-[#8E6A5C] to-[#6A4739] group-hover:from-[#7D5A50] group-hover:to-[#5A3828]'"
                  :style="{
                    height: `${barHeightPercent(point.revenue)}%`,
                    '--bar-delay': `${i * 45}ms`
                  }"
                >
                  <!-- Circular Indicator Dot on top of bar on hover -->
                  <div
                    v-if="active === i"
                    class="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-[#3B1F0E] ring-2 ring-white shadow-sm z-30"
                  />
                </div>

                <!-- Flat zero-sales bar -->
                <div
                  v-else-if="!point.upcoming"
                  class="relative z-10 h-[3px] w-full max-w-[38px] rounded-t-sm bg-[#E3CFB4]"
                />

                <!-- Upcoming placeholder -->
                <div
                  v-else
                  class="relative z-10 h-full w-full max-w-[38px] rounded-t-md bg-[#FAF4EB]/30"
                />

                <!-- Floating Tooltip showing total income that day -->
                <div
                  v-if="active === i && !point.upcoming"
                  class="chart-tooltip pointer-events-none absolute bottom-[calc(100%+10px)] z-40 whitespace-nowrap rounded-xl border border-[#4A2E1F] bg-[#2D1B10] px-3.5 py-2.5 text-xs text-white shadow-[0_12px_28px_-6px_rgba(45,27,16,0.6)]"
                  :class="tooltipAlign(i)"
                  role="presentation"
                >
                  <p class="text-[11px] font-semibold text-[#D9BFA8]">{{ bucketTitle(i) }}</p>
                  <div class="mt-1 flex items-baseline gap-1.5">
                    <span class="text-xs text-[#E3CFB4]">Total Income:</span>
                    <span class="font-display text-base font-bold text-[#FFF0D1] tabular-nums">{{ formatPeso(point.revenue) }}</span>
                  </div>
                  <div class="mt-0.5 flex items-center gap-2 text-[11px]">
                    <span class="text-[#9FE0B4] tabular-nums font-medium">{{ formatCount(point.orders) }} {{ point.orders === 1 ? 'order' : 'orders' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. LINE GRAPH MODE -->
            <div
              v-else
              :key="`line-${chartAnimationKey}`"
              class="relative z-10 h-full w-full transition-opacity duration-200"
              :class="{ 'opacity-50': refreshing }"
            >
              <!-- SVG Curve & Area Fill -->
              <svg
                class="absolute inset-0 h-full w-full overflow-visible"
                viewBox="0 0 1000 200"
                preserveAspectRatio="none"
              >
                <defs>
                  <!-- Gradient for Area under the line -->
                  <linearGradient id="incomeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#5A3828" stop-opacity="0.25" />
                    <stop offset="65%" stop-color="#7D5A50" stop-opacity="0.08" />
                    <stop offset="100%" stop-color="#7D5A50" stop-opacity="0.0" />
                  </linearGradient>
                </defs>

                <!-- Area Fill -->
                <path
                  v-if="svgPoints.length > 1"
                  :d="areaPath"
                  fill="url(#incomeAreaGradient)"
                  class="transition-opacity duration-300"
                />

                <!-- Stroke Line with animated draw -->
                <path
                  v-if="svgPoints.length > 1"
                  :d="linePath"
                  fill="none"
                  stroke="#3B1F0E"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="chart-line-path"
                />

                <!-- Dashed Guide Line on Active Hover -->
                <line
                  v-if="active !== null && svgPoints[active]"
                  :x1="svgPoints[active]!.x"
                  y1="0"
                  :x2="svgPoints[active]!.x"
                  y2="200"
                  stroke="#7D5A50"
                  stroke-width="1.5"
                  stroke-dasharray="4 4"
                />

                <!-- Data point markers -->
                <g v-for="(pt, idx) in svgPoints" :key="idx">
                  <!-- Inactive dot -->
                  <circle
                    v-if="active !== idx"
                    :cx="pt.x"
                    :cy="pt.y"
                    r="3.5"
                    fill="#FFFFFF"
                    stroke="#5A3828"
                    stroke-width="2"
                    class="transition-all duration-150"
                  />
                  <!-- Active hovered dot with outer pulse halo -->
                  <template v-else>
                    <circle
                      :cx="pt.x"
                      :cy="pt.y"
                      r="10"
                      fill="#3B1F0E"
                      fill-opacity="0.18"
                      class="animate-pulse"
                    />
                    <circle
                      :cx="pt.x"
                      :cy="pt.y"
                      r="5.5"
                      fill="#3B1F0E"
                      stroke="#FFFFFF"
                      stroke-width="2.5"
                    />
                  </template>
                </g>
              </svg>

              <!-- Interactive Columns Overlay (captures hover across full height) -->
              <div
                class="absolute inset-0 grid h-full w-full"
                :style="{ gridTemplateColumns: `repeat(${displaySeries.length}, minmax(0, 1fr))` }"
              >
                <div
                  v-for="(point, i) in displaySeries"
                  :key="point.start"
                  class="group relative flex h-full flex-col items-center justify-end cursor-pointer outline-none"
                  @mouseenter="active = i"
                  @mouseleave="active = null"
                  @focus="active = i"
                  @blur="active = null"
                >
                  <!-- Floating Tooltip showing total income that day -->
                  <div
                    v-if="active === i && !point.upcoming"
                    class="chart-tooltip pointer-events-none absolute bottom-[calc(100%+10px)] z-40 whitespace-nowrap rounded-xl border border-[#4A2E1F] bg-[#2D1B10] px-3.5 py-2.5 text-xs text-white shadow-[0_12px_28px_-6px_rgba(45,27,16,0.6)]"
                    :class="tooltipAlign(i)"
                    role="presentation"
                  >
                    <p class="text-[11px] font-semibold text-[#D9BFA8]">{{ bucketTitle(i) }}</p>
                    <div class="mt-1 flex items-baseline gap-1.5">
                      <span class="text-xs text-[#E3CFB4]">Total Income:</span>
                      <span class="font-display text-base font-bold text-[#FFF0D1] tabular-nums">{{ formatPeso(point.revenue) }}</span>
                    </div>
                    <div class="mt-0.5 flex items-center gap-2 text-[11px]">
                      <span class="text-[#9FE0B4] tabular-nums font-medium">{{ formatCount(point.orders) }} {{ point.orders === 1 ? 'order' : 'orders' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Empty State Overlay -->
          <div
            v-if="isEmpty"
            class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <p class="rounded-xl border border-[#E3CFB4] bg-white px-4 py-2 text-xs font-medium text-[#8B6656] shadow-sm">
              No sales recorded in this range yet.
            </p>
          </div>
        </div>
      </div>

      <!-- X-axis Labels -->
      <div
        class="ml-[40px] sm:ml-[48px] mt-3.5 grid gap-1.5 sm:gap-2.5 text-center text-[11px] font-medium text-[#8B6656]"
        :style="{ gridTemplateColumns: `repeat(${displaySeries.length}, minmax(0, 1fr))` }"
      >
        <span
          v-for="(point, i) in displaySeries"
          :key="point.start"
          class="whitespace-nowrap transition-colors duration-150 sm:truncate"
          :class="{
            'font-bold text-[#3B1F0E]': i === currentIndex || active === i,
            'text-[#3B1F0E]': active === i
          }"
        >
          <span class="sm:hidden">{{ barLabelShort(i) }}</span>
          <span class="hidden sm:inline">{{ barLabel(i) }}</span>
        </span>
      </div>
    </div>
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
  0% {
    transform: scaleY(0.04);
    opacity: 0.2;
  }
  100% {
    transform: scaleY(1);
    opacity: 1;
  }
}

.manager-bar {
  transform-origin: bottom;
  animation: barGrow 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--bar-delay, 0ms);
  will-change: transform;
}

/* SVG Line Draw Animation */
@keyframes lineDraw {
  from {
    stroke-dashoffset: 2000;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.chart-line-path {
  stroke-dasharray: 2000;
  animation: lineDraw 850ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes summaryEnter {
  0% {
    opacity: 0;
    transform: translateY(6px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-summary-enter {
  animation: summaryEnter 650ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}

@keyframes tooltipPop {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.chart-tooltip {
  animation: tooltipPop 150ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

/* Crossfade between bar and line chart */
.chart-fade-enter-active,
.chart-fade-leave-active {
  transition: opacity 220ms cubic-bezier(0.23, 1, 0.32, 1), transform 220ms cubic-bezier(0.23, 1, 0.32, 1);
}

.chart-fade-enter-from {
  opacity: 0;
  transform: scale(0.985);
}

.chart-fade-leave-to {
  opacity: 0;
  transform: scale(0.985);
}

@keyframes popoverIn {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dropdown-popover {
  animation: popoverIn 160ms cubic-bezier(0.23, 1, 0.32, 1) both;
  transform-origin: top right;
}

@media (prefers-reduced-motion: reduce) {
  .manager-bar,
  .chart-line-path,
  .skeleton,
  .animate-summary-enter,
  .chart-tooltip,
  .dropdown-popover,
  .chart-fade-enter-active,
  .chart-fade-leave-active {
    animation: none !important;
    transform: none !important;
    transition: none !important;
  }
}
</style>
