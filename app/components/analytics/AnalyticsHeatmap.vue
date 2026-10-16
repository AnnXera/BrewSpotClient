<script setup lang="ts">
import { computed, ref } from 'vue'
import { WEEKDAYS_LONG, WEEKDAYS_SHORT, formatCount, formatHour, formatPeso } from '~/utils/dashboardFormat'

// Weekday x hour grid: when the branches are busiest. One hue, light to dark by volume.
const props = defineProps<{
  grid: { orders: number; revenue: number }[][] // [weekday 0 = Sunday][hour 0..23]
}>()

const metric = ref<'orders' | 'revenue'>('orders')

// Only the hours that saw a sale (padded by one), so the cells stay readable.
const hours = computed(() => {
  const used: number[] = []
  for (let h = 0; h < 24; h++) {
    if (props.grid.some(day => (day[h]?.orders ?? 0) > 0)) used.push(h)
  }
  const first = used.length ? Math.max(0, used[0]! - 1) : 6
  const last = used.length ? Math.min(23, used[used.length - 1]! + 1) : 21
  return Array.from({ length: last - first + 1 }, (_, i) => first + i)
})

const max = computed(() => Math.max(0, ...props.grid.flat().map(c => c[metric.value])))

// 0 stays near-white; anything sold gets one of five steps.
const RAMP = ['#F7EFE5', '#EBD6C1', '#D9B597', '#B98A70', '#8E6253', '#5A3A2C']
function shade(v: number) {
  if (v <= 0 || max.value <= 0) return RAMP[0]
  return RAMP[Math.min(5, Math.ceil((v / max.value) * 5))]
}

const active = ref<{ d: number; h: number } | null>(null)

const busiest = computed(() => {
  let best = { d: 0, h: 0, v: 0 }
  props.grid.forEach((day, d) => day.forEach((c, h) => { if (c[metric.value] > best.v) best = { d, h, v: c[metric.value] } }))
  return best.v > 0 ? best : null
})

const busiestDay = computed(() => {
  const totals = props.grid.map(day => day.reduce((a, c) => a + c[metric.value], 0))
  const top = Math.max(...totals)
  return top > 0 ? totals.indexOf(top) : null
})

function describe(d: number, h: number) {
  const c = props.grid[d]?.[h] ?? { orders: 0, revenue: 0 }
  return `${WEEKDAYS_LONG[d]}, ${formatHour(h)} to ${formatHour((h + 1) % 24)}: ${formatCount(c.orders)} ${c.orders === 1 ? 'order' : 'orders'}, ${formatPeso(c.revenue)}`
}

const shown = computed(() => (active.value ? describe(active.value.d, active.value.h) : null))
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="min-h-[20px] text-[13px] text-[#5C4037]" aria-live="polite">
        <template v-if="shown">{{ shown }}</template>
        <template v-else-if="busiest">
          Busiest hour: <span class="font-semibold text-[#3B1F0E]">{{ WEEKDAYS_LONG[busiest.d] }}, {{ formatHour(busiest.h) }}</span>
          <template v-if="busiestDay !== null"> · Busiest day: <span class="font-semibold text-[#3B1F0E]">{{ WEEKDAYS_LONG[busiestDay] }}</span></template>
        </template>
        <template v-else>No sales in this period.</template>
      </p>
      <div role="radiogroup" aria-label="Heatmap measure" class="inline-flex gap-0.5 rounded-[10px] bg-[#F3E7D2] p-[3px]">
        <button
          v-for="m in (['orders', 'revenue'] as const)"
          :key="m"
          type="button"
          role="radio"
          :aria-checked="metric === m"
          class="rounded-[8px] px-3 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          :class="metric === m ? 'bg-white text-[#3B1F0E] shadow-[0_1px_3px_rgba(59,31,14,0.18)]' : 'text-[#8B6656] hover:text-[#3B1F0E]'"
          @click="metric = m"
        >{{ m === 'orders' ? 'Orders' : 'Income' }}</button>
      </div>
    </div>

    <div class="-mx-1 overflow-x-auto px-1 pb-1">
      <div
        class="grid min-w-[440px] gap-[3px]"
        :style="{ gridTemplateColumns: `36px repeat(${hours.length}, minmax(14px, 1fr))` }"
        @mouseleave="active = null"
      >
        <!-- Hour labels: every third hour -->
        <span />
        <span
          v-for="h in hours"
          :key="`h${h}`"
          class="pb-1 text-center text-[10px] text-[#9E7060] tabular-nums"
          aria-hidden="true"
        >{{ (h - hours[0]!) % 3 === 0 ? formatHour(h).replace(' ', '') : '' }}</span>

        <template v-for="(day, d) in grid" :key="d">
          <span class="flex items-center text-[11px] font-medium text-[#8B6656]">{{ WEEKDAYS_SHORT[d] }}</span>
          <span
            v-for="h in hours"
            :key="`${d}-${h}`"
            tabindex="0"
            role="img"
            :aria-label="describe(d, h)"
            class="h-[26px] rounded-[4px] outline-none transition-transform duration-150 hover:scale-110 focus-visible:ring-2 focus-visible:ring-[#7D5A50] focus-visible:ring-offset-1"
            :style="{ background: shade(day[h]?.[metric] ?? 0) }"
            @mouseenter="active = { d, h }"
            @focus="active = { d, h }"
            @blur="active = null"
          />
        </template>
      </div>
    </div>

    <div class="mt-4 flex items-center gap-2 text-[11px] text-[#9E7060]" aria-hidden="true">
      Fewer
      <span v-for="c in RAMP" :key="c" class="h-2.5 w-5 rounded-[3px]" :style="{ background: c }" />
      More
    </div>
  </div>
</template>
