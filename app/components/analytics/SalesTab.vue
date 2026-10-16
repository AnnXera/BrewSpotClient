<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import AnalyticsPanel from './AnalyticsPanel.vue'
import AnalyticsChange from './AnalyticsChange.vue'
import AnalyticsBarChart, { type BarPoint } from './AnalyticsBarChart.vue'
import AnalyticsHeatmap from './AnalyticsHeatmap.vue'
import AnalyticsStatus from './AnalyticsStatus.vue'
import type { AnalyticsFilters } from '~/services/OwnerAnalyticsService'
import { formatCount, formatDay, formatMethod, formatPeso, formatPesoCents, formatPesoCompact, formatSpan } from '~/utils/dashboardFormat'

const props = defineProps<{ filters: AnalyticsFilters }>()

const service = useOwnerAnalyticsService()
const { data, loading, refreshing, error, reload } = useAnalyticsTab(toRef(props, 'filters'), f => service.getSales(f))

const measure = ref<'revenue' | 'orders'>('revenue')

const points = computed<BarPoint[]>(() => {
  const d = data.value
  if (!d) return []
  return d.series.map(p => ({
    key: p.start,
    label: d.granularity === 'month' ? formatDay(p.start, { month: 'short' }) : formatDay(p.start),
    title: d.granularity === 'day'
      ? formatDay(p.start, { weekday: 'long', month: 'long', day: 'numeric' })
      : d.granularity === 'week' ? `Week of ${formatSpan(p.start, p.end)}` : formatDay(p.start, { month: 'long', year: 'numeric' }),
    value: measure.value === 'revenue' ? p.revenue : p.orders,
    detail: measure.value === 'revenue' ? `${formatCount(p.orders)} orders` : formatPesoCents(p.revenue),
  }))
})

const kpis = computed(() => {
  const s = data.value?.summary
  if (!s) return []
  return [
    { label: 'Income', value: formatPeso(s.revenue), change: s.change.revenue, previous: formatPeso(s.previous.revenue) },
    { label: 'Orders', value: formatCount(s.orders), change: s.change.orders, previous: formatCount(s.previous.orders) },
    { label: 'Average order', value: formatPesoCents(s.avg_order_value), change: s.change.avg_order_value, previous: formatPesoCents(s.previous.avg_order_value) },
    { label: 'Items sold', value: formatCount(s.items_sold), change: undefined, previous: '' },
  ]
})

const unit = computed(() => ({ day: 'day', week: 'week', month: 'month' }[data.value?.granularity ?? 'day']))
// POS discount keys as labels; PWD stays an acronym.
function discountLabel(type: string) {
  if (type.toLowerCase() === 'pwd') return 'PWD'
  return type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

const paymentMax = computed(() => Math.max(1, ...(data.value?.payments ?? []).map(p => p.orders)))
</script>

<template>
  <AnalyticsStatus v-if="error && !data" :kind="error === 'locked' ? 'locked' : 'failed'" @retry="reload" />

  <div v-else class="space-y-6" :class="{ 'opacity-60 transition-opacity': refreshing }">
    <!-- KPI band -->
    <section aria-label="Sales summary" class="rounded-[22px] border border-[#EEDFC4] bg-white shadow-[0_1px_2px_rgba(59,31,14,0.04)]">
      <dl class="grid grid-cols-2 lg:grid-cols-4">
        <div
          v-for="(k, i) in (loading ? 4 : kpis.length)"
          :key="i"
          class="border-[#F3E7D2] px-5 py-5 sm:px-6"
          :class="[i % 2 === 0 ? 'border-r' : '', i < 2 ? 'border-b lg:border-b-0' : '', i < 3 ? 'lg:border-r' : 'lg:border-r-0']"
        >
          <template v-if="loading">
            <span class="skeleton block h-3 w-20 rounded" />
            <span class="skeleton mt-3 block h-7 w-28 rounded-md" />
          </template>
          <template v-else>
            <dt class="text-[13px] font-medium text-[#8B6656]">{{ kpis[i]!.label }}</dt>
            <dd class="mt-2 font-display text-[26px] font-semibold leading-none tracking-[-0.01em] text-[#3B1F0E] tabular-nums sm:text-[30px]">{{ kpis[i]!.value }}</dd>
            <dd v-if="kpis[i]!.change !== undefined" class="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[#9E7060]">
              <AnalyticsChange :value="kpis[i]!.change ?? null" />
              <span class="tabular-nums">vs {{ kpis[i]!.previous }}</span>
            </dd>
          </template>
        </div>
      </dl>
      <p v-if="data" class="flex flex-wrap gap-x-5 gap-y-1 border-t border-[#F3E7D2] px-5 py-3 text-[12px] text-[#8B6656] sm:px-6">
        <span>Compared with {{ formatSpan(data.filters.previous_from, data.filters.previous_to) }}</span>
        <span>
          Discounts: <span class="font-semibold text-[#3B1F0E] tabular-nums">{{ formatPesoCents(data.summary.discounts) }}</span>
          on {{ formatCount(data.summary.discounted_orders) }} {{ data.summary.discounted_orders === 1 ? 'order' : 'orders' }}
        </span>
        <span v-if="data.summary.voided_orders">
          Voided or refunded: <span class="font-semibold text-[#A2352A] tabular-nums">{{ formatCount(data.summary.voided_orders) }}</span>
          ({{ formatPesoCents(data.summary.voided_amount) }}, not counted as income)
        </span>
      </p>
    </section>

    <AnalyticsPanel
      title="Sales trend"
      :note="data ? `${measure === 'revenue' ? 'Income' : 'Orders'} per ${unit}, ${formatSpan(data.filters.from, data.filters.to)}` : undefined"
    >
      <template #actions>
        <div role="radiogroup" aria-label="Trend measure" class="inline-flex gap-0.5 rounded-[10px] bg-[#F3E7D2] p-[3px]">
          <button
            v-for="m in (['revenue', 'orders'] as const)"
            :key="m"
            type="button"
            role="radio"
            :aria-checked="measure === m"
            class="rounded-[8px] px-3 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
            :class="measure === m ? 'bg-white text-[#3B1F0E] shadow-[0_1px_3px_rgba(59,31,14,0.18)]' : 'text-[#8B6656] hover:text-[#3B1F0E]'"
            @click="measure = m"
          >{{ m === 'revenue' ? 'Income' : 'Orders' }}</button>
        </div>
      </template>
      <div v-if="loading" class="skeleton h-[260px] rounded-xl" />
      <AnalyticsBarChart
        v-else
        :points="points"
        :caption="`${measure === 'revenue' ? 'Income' : 'Orders'} per ${unit}`"
        :format-axis="measure === 'revenue' ? formatPesoCompact : formatCount"
        :format-value="measure === 'revenue' ? formatPesoCents : (n: number) => `${formatCount(n)} orders`"
      />
    </AnalyticsPanel>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <AnalyticsPanel title="Payment methods" note="Share of orders">
        <div v-if="loading" class="space-y-4"><span v-for="i in 3" :key="i" class="skeleton block h-8 rounded" /></div>
        <ul v-else-if="data?.payments.length" class="space-y-4">
          <li v-for="p in data.payments" :key="p.method">
            <div class="flex items-baseline justify-between gap-3 text-[14px]">
              <span class="font-semibold text-[#3D2B24]">{{ formatMethod(p.method) }}</span>
              <span class="text-[#3D2B24] tabular-nums">{{ formatPeso(p.amount) }}</span>
            </div>
            <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F3E7D2]">
              <div class="h-full rounded-full bg-[#7D5A50]" :style="{ width: `${(p.orders / paymentMax) * 100}%` }" />
            </div>
            <p class="mt-1 text-[12px] text-[#9E7060] tabular-nums">{{ formatCount(p.orders) }} orders · {{ p.share }}%</p>
          </li>
        </ul>
        <p v-else class="text-[13px] text-[#8B6656]">No payments recorded in this period.</p>
      </AnalyticsPanel>

      <AnalyticsPanel title="Discounts given">
        <div v-if="loading" class="space-y-3"><span v-for="i in 2" :key="i" class="skeleton block h-6 rounded" /></div>
        <ul v-else-if="data?.discounts.length" class="divide-y divide-[#F3E7D2]">
          <li v-for="d in data.discounts" :key="d.type" class="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span class="text-[14px] font-semibold text-[#3D2B24]">{{ discountLabel(d.type) }}</span>
            <span class="text-right text-[13px] text-[#8B6656] tabular-nums">
              <span class="font-semibold text-[#3D2B24]">{{ formatPesoCents(d.amount) }}</span>
              · {{ formatCount(d.orders) }} {{ d.orders === 1 ? 'order' : 'orders' }}
            </span>
          </li>
        </ul>
        <p v-else class="text-[13px] text-[#8B6656]">No discounts in this period.</p>
      </AnalyticsPanel>
    </div>

    <AnalyticsPanel title="Peak hours" note="When orders come in, by weekday and hour. Use it to plan staffing and prep.">
      <div v-if="loading" class="skeleton h-[220px] rounded-xl" />
      <AnalyticsHeatmap v-else-if="data" :grid="data.heatmap" />
    </AnalyticsPanel>
  </div>
</template>

