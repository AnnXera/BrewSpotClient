<!-- app/components/analytics/AnalyticsTrendChart.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { niceMax } from '~/utils/dashboardFormat'
import type { BarPoint } from './AnalyticsBarChart.vue'

// Sales trend on the Analytics page, drawn like the dashboards' Performance overview:
// bar or line view, dark tooltip with a dashed guide, value axis on the left.
const props = withDefaults(defineProps<{
  points: BarPoint[]
  type: 'bar' | 'line'
  formatAxis: (n: number) => string
  formatValue: (n: number) => string
  caption: string
  integer?: boolean // counts: keep every gridline on a whole number
}>(), { integer: false })

// Counts get a top that splits into whole quarters (4, 8, 12...), so small values don't repeat axis labels.
const max = computed(() => {
  const top = niceMax(Math.max(0, ...props.points.map(p => p.value)))
  return props.integer ? Math.max(4, Math.ceil(top / 4) * 4) : top
})
const ticks = computed(() => [1, 0.75, 0.5, 0.25, 0].map(f => max.value * f))
const isEmpty = computed(() => props.points.every(p => p.value === 0))

// Keep about a dozen labels at most so they never collide.
const labelEvery = computed(() => Math.max(1, Math.ceil(props.points.length / 12)))
const labelEveryNarrow = computed(() => Math.max(1, Math.ceil(props.points.length / 6)))

const dense = computed(() => props.points.length > 20)

const active = ref<number | null>(null)

// Re-run the entrance animation when the view, measure or period changes.
const animationKey = ref(0)
watch([() => props.type, () => props.points.map(p => `${p.key}:${p.value}`).join('|')], () => {
  animationKey.value++
  active.value = null
})

function barHeightPercent(value: number) {
  if (value <= 0) return 0
  return Math.min(100, Math.max(2, (value / max.value) * 100))
}

// Tooltip sits just above the point, or just below it on tall values, so it stays
// inside the plot and never covers the panel's header controls.
function tooltipPos(value: number) {
  const pct = max.value > 0 ? Math.max(0, Math.min(100, (value / max.value) * 100)) : 0
  return pct <= 55 ? { bottom: `calc(${pct}% + 14px)` } : { top: `calc(${100 - pct}% + 14px)` }
}

function tooltipAlign(i: number) {
  const n = props.points.length
  if (i < n * 0.2) return 'left-0'
  if (i > n * 0.8) return 'right-0'
  return 'left-1/2 -translate-x-1/2'
}

function onKey(e: KeyboardEvent, i: number) {
  const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
  if (next === null || next < 0 || next >= props.points.length) return
  e.preventDefault()
  ;((e.currentTarget as HTMLElement).parentElement?.children[next] as HTMLElement | undefined)?.focus()
}

// ── Line graph: same scale as the bars, zero on the baseline ──
const SVG_WIDTH = 1000
const SVG_HEIGHT = 200

const svgPoints = computed(() => {
  const n = props.points.length
  if (n === 0) return []
  const colWidth = SVG_WIDTH / n
  return props.points.map((p, i) => {
    const ratio = max.value > 0 ? Math.max(0, Math.min(1, p.value / max.value)) : 0
    return { x: (i + 0.5) * colWidth, y: SVG_HEIGHT - ratio * SVG_HEIGHT }
  })
})

const linePath = computed(() => {
  const pts = svgPoints.value
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
  const pts = svgPoints.value
  if (pts.length === 0) return ''
  return `${linePath.value} L ${pts[pts.length - 1]!.x},${SVG_HEIGHT} L ${pts[0]!.x},${SVG_HEIGHT} Z`
})
</script>

<template>
  <div class="flex flex-col">
    <div class="grid grid-cols-[48px_minmax(0,1fr)] gap-x-2 sm:grid-cols-[56px_minmax(0,1fr)] sm:gap-x-3">
      <!-- Y-axis values -->
      <div class="relative h-[240px]" aria-hidden="true">
        <div
          v-for="(t, idx) in ticks"
          :key="idx"
          class="absolute right-0 -translate-y-1/2 text-[11px] font-medium tabular-nums text-[#A88879]"
          :style="{ top: `${idx * 25}%` }"
        >
          {{ formatAxis(t) }}
        </div>
      </div>

      <div class="relative h-[240px]">
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

        <Transition name="chart-fade" mode="out-in">
          <!-- Bar graph -->
          <div
            v-if="type === 'bar'"
            :key="`bar-${animationKey}`"
            class="relative z-10 grid h-full items-end"
            :class="dense ? 'gap-0.5 sm:gap-1' : 'gap-1.5 sm:gap-2.5'"
            :style="{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }"
            role="list"
            :aria-label="caption"
            @mouseleave="active = null"
          >
            <div
              v-for="(p, i) in points"
              :key="p.key"
              role="listitem"
              tabindex="0"
              :aria-label="`${p.title}: ${formatValue(p.value)}${p.detail ? `, ${p.detail}` : ''}`"
              class="group relative flex h-full cursor-pointer flex-col items-center justify-end outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
              @mouseenter="active = i"
              @focus="active = i"
              @blur="active = null"
              @keydown="onKey($event, i)"
            >
              <div class="absolute inset-x-0 bottom-0 top-0 mx-auto w-full max-w-[38px] rounded-t-lg bg-[#FAF4EB]/70 transition-colors group-hover:bg-[#F6ECDD]/80" />

              <div
                v-if="active === i"
                class="pointer-events-none absolute inset-y-0 left-1/2 z-20 -translate-x-1/2 border-l border-dashed border-[#5A3828]/60"
              />

              <div
                v-if="p.value > 0"
                class="trend-bar relative z-10 w-full max-w-[38px] transition-all duration-200"
                :class="[
                  dense ? 'rounded-t-sm' : 'rounded-t-md',
                  active === i ? 'bg-gradient-to-t from-[#5A3828] to-[#3B1F0E]' : 'bg-gradient-to-t from-[#8E6A5C] to-[#6A4739] group-hover:from-[#7D5A50] group-hover:to-[#5A3828]',
                ]"
                :style="{ height: `${barHeightPercent(p.value)}%`, '--bar-delay': `${Math.min(i, 30) * (dense ? 20 : 45)}ms` }"
              >
                <div
                  v-if="active === i"
                  class="absolute -top-1.5 left-1/2 z-30 h-3 w-3 -translate-x-1/2 rounded-full bg-[#3B1F0E] shadow-sm ring-2 ring-white"
                />
              </div>
              <div v-else class="relative z-10 h-[3px] w-full max-w-[38px] rounded-t-sm bg-[#E3CFB4]" />

              <div
                v-if="active === i"
                class="chart-tooltip pointer-events-none absolute z-40 whitespace-nowrap rounded-xl border border-[#4A2E1F] bg-[#2D1B10] px-3.5 py-2.5 text-xs text-white shadow-[0_12px_28px_-6px_rgba(45,27,16,0.6)]"
                :class="tooltipAlign(i)"
                :style="tooltipPos(p.value)"
                role="presentation"
              >
                <p class="text-[11px] font-semibold text-[#D9BFA8]">{{ p.title }}</p>
                <p class="mt-1 font-display text-base font-bold tabular-nums text-[#FFF0D1]">{{ formatValue(p.value) }}</p>
                <p v-if="p.detail" class="mt-0.5 text-[11px] font-medium tabular-nums text-[#9FE0B4]">{{ p.detail }}</p>
              </div>
            </div>
          </div>

          <!-- Line graph -->
          <div v-else :key="`line-${animationKey}`" class="relative z-10 h-full w-full">
            <svg class="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="salesTrendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#5A3828" stop-opacity="0.25" />
                  <stop offset="65%" stop-color="#7D5A50" stop-opacity="0.08" />
                  <stop offset="100%" stop-color="#7D5A50" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path v-if="svgPoints.length > 1" :d="areaPath" fill="url(#salesTrendAreaGradient)" />
              <path
                v-if="svgPoints.length > 1"
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
                <span
                  v-if="active === idx"
                  class="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-[#3B1F0E]/20"
                  :style="{ left: `${pt.x / 10}%`, top: `${pt.y / 2}%` }"
                />
                <span
                  v-if="active === idx || !dense"
                  class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150"
                  :class="active === idx ? 'h-3 w-3 bg-[#3B1F0E] ring-[2.5px] ring-white' : 'h-[9px] w-[9px] border-2 border-[#5A3828] bg-white'"
                  :style="{ left: `${pt.x / 10}%`, top: `${pt.y / 2}%` }"
                />
              </template>
            </div>

            <!-- Hover columns -->
            <div
              class="absolute inset-0 grid h-full w-full"
              :style="{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }"
              role="list"
              :aria-label="caption"
              @mouseleave="active = null"
            >
              <div
                v-for="(p, i) in points"
                :key="p.key"
                role="listitem"
                tabindex="0"
                :aria-label="`${p.title}: ${formatValue(p.value)}${p.detail ? `, ${p.detail}` : ''}`"
                class="relative flex h-full cursor-pointer flex-col items-center justify-end outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                @mouseenter="active = i"
                @focus="active = i"
                @blur="active = null"
                @keydown="onKey($event, i)"
              >
                <div
                  v-if="active === i"
                  class="chart-tooltip pointer-events-none absolute z-40 whitespace-nowrap rounded-xl border border-[#4A2E1F] bg-[#2D1B10] px-3.5 py-2.5 text-xs text-white shadow-[0_12px_28px_-6px_rgba(45,27,16,0.6)]"
                  :class="tooltipAlign(i)"
                  :style="tooltipPos(p.value)"
                  role="presentation"
                >
                  <p class="text-[11px] font-semibold text-[#D9BFA8]">{{ p.title }}</p>
                  <p class="mt-1 font-display text-base font-bold tabular-nums text-[#FFF0D1]">{{ formatValue(p.value) }}</p>
                  <p v-if="p.detail" class="mt-0.5 text-[11px] font-medium tabular-nums text-[#9FE0B4]">{{ p.detail }}</p>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Empty state -->
        <div v-if="isEmpty" class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <p class="rounded-xl border border-[#E3CFB4] bg-white px-4 py-2 text-xs font-medium text-[#8B6656] shadow-sm">
            No sales recorded in this period.
          </p>
        </div>
      </div>
    </div>

    <!-- X-axis labels -->
    <div
      class="ml-[56px] mt-3.5 grid text-center text-[11px] font-medium text-[#8B6656] sm:ml-[68px]"
      :class="dense ? 'gap-0.5 sm:gap-1' : 'gap-1.5 sm:gap-2.5'"
      :style="{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }"
      aria-hidden="true"
    >
      <span
        v-for="(p, i) in points"
        :key="p.key"
        class="overflow-visible whitespace-nowrap tabular-nums transition-colors duration-150"
        :class="[
          active === i ? 'font-bold text-[#3B1F0E]' : '',
          i % labelEvery !== 0 ? 'sm:invisible' : '',
          i % labelEveryNarrow !== 0 ? 'max-sm:invisible' : '',
        ]"
      >{{ p.label }}</span>
    </div>

    <table class="sr-only">
      <caption>{{ caption }}</caption>
      <tbody>
        <tr v-for="p in points" :key="p.key">
          <th scope="row">{{ p.title }}</th>
          <td>{{ formatValue(p.value) }}</td>
          <td v-if="p.detail">{{ p.detail }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
@keyframes barGrow {
  0% { transform: scaleY(0.04); opacity: 0.2; }
  100% { transform: scaleY(1); opacity: 1; }
}

.trend-bar {
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
  .trend-bar,
  .chart-line-path,
  .chart-tooltip,
  .chart-fade-enter-active,
  .chart-fade-leave-active {
    animation: none !important;
    transform: none !important;
    transition: none !important;
  }
}
</style>
