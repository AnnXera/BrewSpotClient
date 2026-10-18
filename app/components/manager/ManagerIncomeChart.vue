<!-- app/components/manager/ManagerIncomeChart.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DashboardRange } from '~/services/OwnerProfileService'
import type { ManagerDashboardStats } from '~/services/ManagerDashboardService'
import { formatCount, formatDay, formatPeso, formatPesoCents, formatPesoCompact, formatSpan, niceMax } from '~/utils/dashboardFormat'

const props = defineProps<{
  period: ManagerDashboardStats['period'] | null
  series: ManagerDashboardStats['series']
  range: DashboardRange
  loading: boolean
  refreshing: boolean
}>()

const emit = defineEmits<{ 'update:range': [DashboardRange] }>()

// Bar key for range changes (not on refresh)
const barsKey = ref(0)
watch(
  () => props.range,
  () => {
    barsKey.value++
  }
)

const ranges: { value: DashboardRange; label: string; compare: string; none: string }[] = [
  { value: 'daily', label: 'Daily', compare: 'last week, same days', none: 'No sales last week to compare with' },
  { value: 'weekly', label: 'Weekly', compare: 'the 12 weeks before', none: 'No sales in the 12 weeks before to compare with' },
  { value: 'monthly', label: 'Monthly', compare: 'the 12 months before', none: 'No sales in the 12 months before to compare with' },
]

const currentRange = computed(() => ranges.find(r => r.value === props.range))

const max = computed(() => niceMax(Math.max(0, ...props.series.map(p => p.revenue))))
const ticks = computed(() => [1, 0.75, 0.5, 0.25, 0].map(f => max.value * f))
const isEmpty = computed(() => !props.loading && props.series.every(p => p.revenue === 0))

const active = ref<number | null>(null)
const activePoint = computed(() => (active.value === null ? null : props.series[active.value] ?? null))

function barClip(revenue: number) {
  const hidden = revenue > 0 ? `min(calc(100% - 3px), ${100 - (revenue / max.value) * 100}%)` : '100%'
  return `inset(${hidden} 0 0 0 round 4px 4px 0 0)`
}

const currentIndex = computed(() => {
  const i = props.series.findIndex(p => p.upcoming)
  return (i === -1 ? props.series.length : i) - 1
})

function barLabel(i: number) {
  const p = props.series[i]
  if (!p) return ''
  if (props.range === 'monthly') return formatDay(p.start, { month: 'short' })
  if (props.range === 'daily') {
    return i === currentIndex.value ? 'Today' : `${formatDay(p.start, { weekday: 'short' })} ${formatDay(p.start, { day: 'numeric' })}`
  }
  return formatDay(p.start)
}

function bucketTitle(i: number) {
  const p = props.series[i]
  if (!p) return ''
  if (props.range === 'daily') return formatDay(p.start, { weekday: 'long', month: 'long', day: 'numeric' })
  if (props.range === 'weekly') return `Week of ${formatSpan(p.start, p.end)}`
  return formatDay(p.start, { month: 'long', year: 'numeric' })
}

function tooltipAlign(i: number) {
  const n = props.series.length
  if (i <= 1) return 'left-0'
  if (i >= n - 2) return 'right-0'
  return 'left-1/2 -translate-x-1/2'
}
</script>

<template>
  <section class="flex flex-col rounded-[22px] border border-[#EEDFC4] bg-white p-5 sm:p-7 shadow-[0_1px_2px_rgba(59,31,14,0.04)]" aria-labelledby="income-heading">
    <!-- Header: title + range pills -->
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="income-heading" class="font-display text-[18px] font-bold text-[#3D2B24]">
          Branch Sales & Revenue
        </h2>
        <p class="mt-0.5 text-[13px] text-[#8B6656]">
          Revenue generated across this branch over time
        </p>
      </div>

      <!-- Range switch -->
      <div
        role="tablist"
        aria-label="Chart time range"
        class="inline-flex rounded-xl bg-[#F6ECDD] p-1 text-[13px] font-semibold text-[#8B6656]"
      >
        <button
          v-for="r in ranges"
          :key="r.value"
          role="tab"
          type="button"
          :aria-selected="range === r.value"
          class="rounded-lg px-3 py-1.5 transition-all duration-160 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          :class="range === r.value ? 'bg-white text-[#3B1F0E] shadow-[0_1px_3px_rgba(59,31,14,0.08)]' : 'hover:text-[#3B1F0E]'"
          @click="emit('update:range', r.value)"
        >
          {{ r.label }}
        </button>
      </div>
    </header>

    <!-- Period summary strip -->
    <div
      :key="barsKey"
      class="animate-summary-enter mt-5 grid grid-cols-2 gap-4 border-y border-[#F3E5D0] py-4 sm:grid-cols-4"
    >
      <div>
        <p class="text-[12px] font-medium text-[#8B6656]">Range Revenue</p>
        <p class="mt-1 font-display text-xl font-bold tabular-nums text-[#3B1F0E]">
          <span v-if="loading" class="skeleton inline-block h-6 w-24 rounded align-middle" />
          <template v-else>{{ period ? formatPeso(period.revenue) : '₱0' }}</template>
        </p>
      </div>

      <div>
        <p class="text-[12px] font-medium text-[#8B6656]">Range Orders</p>
        <p class="mt-1 font-display text-xl font-bold tabular-nums text-[#3B1F0E]">
          <span v-if="loading" class="skeleton inline-block h-6 w-16 rounded align-middle" />
          <template v-else>{{ period ? formatCount(period.orders) : '0' }}</template>
        </p>
      </div>

      <div>
        <p class="text-[12px] font-medium text-[#8B6656]">Avg. Order Value</p>
        <p class="mt-1 font-display text-xl font-bold tabular-nums text-[#3B1F0E]">
          <span v-if="loading" class="skeleton inline-block h-6 w-20 rounded align-middle" />
          <template v-else>{{ period ? formatPesoCents(period.avg_order_value) : '₱0.00' }}</template>
        </p>
      </div>

      <div>
        <p class="text-[12px] font-medium text-[#8B6656]">Vs. Prev. Period</p>
        <p class="mt-1 flex items-center gap-1 font-display text-xl font-bold tabular-nums">
          <span v-if="loading" class="skeleton inline-block h-6 w-16 rounded align-middle" />
          <template v-else-if="period?.revenue_change !== null && period?.revenue_change !== undefined">
            <span
              class="inline-flex items-center gap-0.5 text-sm font-bold"
              :class="period.revenue_change >= 0 ? 'text-emerald-700' : 'text-red-700'"
            >
              <Icon :name="period.revenue_change >= 0 ? 'heroicons:arrow-trending-up' : 'heroicons:arrow-trending-down'" class="h-4 w-4" />
              {{ period.revenue_change > 0 ? '+' : '' }}{{ period.revenue_change }}%
            </span>
          </template>
          <span v-else class="text-xs font-normal text-[#8B6656]">No prev. data</span>
        </p>
      </div>
    </div>

    <!-- Chart container -->
    <div class="relative mt-6 flex-1 min-h-[220px] flex flex-col justify-end">
      <!-- Grid lines -->
      <div class="absolute inset-x-0 inset-y-6 flex flex-col justify-between pointer-events-none" aria-hidden="true">
        <div v-for="(tick, idx) in ticks" :key="idx" class="border-b border-[#F6ECDD] flex items-center justify-between text-[11px] text-[#A88879]">
          <span class="bg-white/80 pr-1 tabular-nums">{{ formatPesoCompact(tick) }}</span>
        </div>
      </div>

      <!-- Bars -->
      <div
        :key="barsKey"
        class="relative z-10 grid h-[180px] items-end gap-2 sm:gap-3 transition-opacity duration-200"
        :class="{ 'opacity-50': refreshing }"
        :style="{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }"
      >
        <div
          v-for="(point, i) in series"
          :key="point.start"
          class="group relative flex h-full flex-col justify-end items-center cursor-pointer"
          tabindex="0"
          @mouseenter="active = i"
          @mouseleave="active = null"
          @focus="active = i"
          @blur="active = null"
        >
          <!-- Bar -->
          <div
            v-if="!point.upcoming"
            class="manager-bar w-full max-w-[38px] rounded-t-md transition-all duration-300"
            :class="[
              active === i ? 'bg-[#5A3828] scale-y-[1.02]' : 'bg-[#7D5A50] hover:bg-[#6D4C42]',
              point.revenue === 0 ? 'h-1 bg-[#E3CFB4]' : 'h-full'
            ]"
            :style="point.revenue > 0 ? {
              clipPath: barClip(point.revenue),
              '--bar-delay': `${i * 65}ms`
            } : {}"
          />
          <div
            v-else
            class="w-full max-w-[38px] h-full border border-dashed border-[#E3CFB4]/60 rounded-t-md"
          />

          <!-- Tooltip -->
          <div
            v-if="active === i && !point.upcoming"
            class="absolute bottom-[calc(100%+8px)] z-30 pointer-events-none rounded-xl bg-[#2D1B10] px-3.5 py-2.5 text-white shadow-xl text-xs whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
            :class="tooltipAlign(i)"
          >
            <p class="font-bold text-[#FFF0D1]">{{ bucketTitle(i) }}</p>
            <div class="mt-1 flex items-center gap-3 text-[11px]">
              <span class="font-semibold text-emerald-400 tabular-nums">{{ formatPesoCents(point.revenue) }}</span>
              <span class="text-[#D9BFA8] tabular-nums">{{ formatCount(point.orders) }} {{ point.orders === 1 ? 'order' : 'orders' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- X-axis Labels -->
      <div
        class="mt-3 grid gap-2 sm:gap-3 text-center text-[11px] font-medium text-[#8B6656]"
        :style="{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }"
      >
        <span
          v-for="(point, i) in series"
          :key="point.start"
          class="truncate"
          :class="{ 'font-bold text-[#3B1F0E]': i === currentIndex }"
        >
          {{ barLabel(i) }}
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
    transform: scaleY(0);
    opacity: 0.15;
  }
  100% {
    transform: scaleY(1);
    opacity: 1;
  }
}

.manager-bar {
  transform-origin: bottom;
  animation: barGrow 850ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--bar-delay, 0ms);
  will-change: transform;
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
  animation: summaryEnter 750ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .manager-bar, .skeleton, .animate-summary-enter {
    animation: none !important;
    transform: none !important;
  }
}
</style>
