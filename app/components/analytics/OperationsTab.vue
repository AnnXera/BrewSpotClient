<script setup lang="ts">
import { computed, toRef } from 'vue'
import AnalyticsPanel from './AnalyticsPanel.vue'
import AnalyticsBarChart, { type BarPoint } from './AnalyticsBarChart.vue'
import AnalyticsStatus from './AnalyticsStatus.vue'
import type { AnalyticsFilters } from '~/services/OwnerAnalyticsService'
import { WEEKDAYS_LONG, WEEKDAYS_SHORT, formatCount, formatPeso, formatPesoCents } from '~/utils/dashboardFormat'

const props = defineProps<{ filters: AnalyticsFilters }>()

const service = useOwnerAnalyticsService()
const { data, loading, refreshing, error, reload } = useAnalyticsTab(toRef(props, 'filters'), f => service.getOperations(f))

const staffMax = computed(() => Math.max(1, ...(data.value?.staff ?? []).map(s => s.revenue)))

const wasteStats = computed(() => {
  const w = data.value?.waste.summary
  if (!w) return []
  return [
    { label: 'Planned', value: formatCount(w.expected) },
    { label: 'Sold', value: formatCount(w.sold) },
    { label: 'Sell-through', value: w.sell_through === null ? '—' : `${w.sell_through}%` },
    { label: 'Spoiled', value: formatCount(w.spoilage), warn: w.spoilage > 0 },
    { label: 'Sold-out days', value: formatCount(w.sold_out_days) },
  ]
})

const reservationStats = computed(() => {
  const r = data.value?.reservations
  if (!r) return []
  return [
    { label: 'Bookings', value: formatCount(r.total) },
    { label: 'Guests', value: formatCount(r.guests) },
    { label: 'Avg party', value: r.avg_party ? String(r.avg_party) : '—' },
    { label: 'No-show rate', value: r.no_show_rate === null ? '—' : `${r.no_show_rate}%`, warn: (r.no_show_rate ?? 0) >= 10 },
  ]
})

const statusLabel: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', seated: 'Seated', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show',
}
const statusMax = computed(() => Math.max(1, ...(data.value?.reservations.by_status ?? []).map(s => s.count)))

const weekdayPoints = computed<BarPoint[]>(() =>
  (data.value?.reservations.by_weekday ?? []).map(d => ({
    key: String(d.weekday),
    label: WEEKDAYS_SHORT[d.weekday]!,
    title: WEEKDAYS_LONG[d.weekday]!,
    value: d.count,
  })),
)

const formatQty = (n: number) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(n)
</script>

<template>
  <AnalyticsStatus v-if="error && !data" :kind="error === 'locked' ? 'locked' : 'failed'" @retry="reload" />

  <div v-else class="grid grid-cols-1 gap-6 xl:grid-cols-12" :class="{ 'opacity-60 transition-opacity': refreshing }">
    <!-- Staff -->
    <AnalyticsPanel class="xl:col-span-7" title="Staff performance" note="Sales rung up per cashier">
      <div v-if="loading" class="space-y-3"><span v-for="i in 4" :key="i" class="skeleton block h-10 rounded" /></div>
      <div v-else-if="data?.staff.length" class="-mx-5 overflow-x-auto sm:-mx-6">
        <table class="w-full min-w-[480px] text-[13px]">
          <thead>
<<<<<<< HEAD
            <tr class="border-y border-[#EDD8CC] bg-[#FFF8EA]">
              <th scope="col" class="py-4 pl-5 pr-2 text-left whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060] sm:pl-6">Staff</th>
              <th scope="col" class="px-2 py-4 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Orders</th>
              <th scope="col" class="px-2 py-4 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Sales</th>
              <th scope="col" class="px-2 py-4 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Avg order</th>
              <th scope="col" class="py-4 pl-2 pr-5 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060] sm:pr-6">Discounts</th>
=======
            <tr class="border-b border-[#EEDFC4] text-[#8B6656]">
              <th scope="col" class="pb-2.5 pl-5 pr-2 text-left font-medium sm:pl-6">Staff</th>
              <th scope="col" class="px-2 pb-2.5 text-right font-medium">Orders</th>
              <th scope="col" class="px-2 pb-2.5 text-right font-medium">Sales</th>
              <th scope="col" class="px-2 pb-2.5 text-right font-medium">Avg order</th>
              <th scope="col" class="pb-2.5 pl-2 pr-5 text-right font-medium sm:pr-6">Discounts</th>
>>>>>>> 37b60310d9c2e19e03b53b185b0297700cb81d6f
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in data.staff" :key="s.uuid ?? 'none'" class="border-b border-[#F3E7D2] last:border-0 hover:bg-[#FDF8F3]">
              <td class="py-3 pl-5 pr-2 sm:pl-6">
                <p class="font-semibold" :class="s.uuid ? 'text-[#3D2B24]' : 'italic text-[#9E7060]'">{{ s.name }}</p>
                <p class="mt-0.5 text-[12px] text-[#9E7060]">{{ [s.position, s.branch].filter(Boolean).join(' · ') }}</p>
                <span class="mt-1.5 block h-1 w-full max-w-[160px] overflow-hidden rounded-full bg-[#F3E7D2]" aria-hidden="true">
                  <span class="block h-full rounded-full bg-[#B4846C]" :style="{ width: `${(s.revenue / staffMax) * 100}%` }" />
                </span>
              </td>
              <td class="px-2 py-3 text-right tabular-nums text-[#3D2B24]">{{ formatCount(s.orders) }}</td>
              <td class="px-2 py-3 text-right font-semibold tabular-nums text-[#3D2B24]">{{ formatPeso(s.revenue) }}</td>
              <td class="px-2 py-3 text-right tabular-nums text-[#3D2B24]">{{ formatPesoCents(s.avg_order_value) }}</td>
              <td class="py-3 pl-2 pr-5 text-right tabular-nums text-[#8B6656] sm:pr-6">{{ s.discounts ? formatPesoCents(s.discounts) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-[13px] text-[#8B6656]">No sales in this period.</p>
    </AnalyticsPanel>

    <!-- Reservations -->
    <AnalyticsPanel class="xl:col-span-5" title="Reservations" note="Bookings for dates in this period">
      <div v-if="loading" class="space-y-3"><span class="skeleton block h-16 rounded" /><span class="skeleton block h-32 rounded" /></div>
      <template v-else-if="data">
        <dl class="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          <div v-for="s in reservationStats" :key="s.label">
            <dt class="text-[12px] text-[#8B6656]">{{ s.label }}</dt>
            <dd class="mt-0.5 font-display text-xl font-semibold tabular-nums" :class="s.warn ? 'text-[#A2352A]' : 'text-[#3B1F0E]'">{{ s.value }}</dd>
          </div>
        </dl>

        <template v-if="data.reservations.total">
          <ul class="mt-6 space-y-2">
            <li v-for="s in data.reservations.by_status" :key="s.status" class="grid grid-cols-[88px_1fr_32px] items-center gap-3 text-[12px]">
              <span class="text-[#5C4037]">{{ statusLabel[s.status] ?? s.status }}</span>
              <span class="h-2 overflow-hidden rounded-full bg-[#F3E7D2]">
                <span
                  class="block h-full rounded-full"
                  :class="s.status === 'no_show' || s.status === 'cancelled' ? 'bg-[#C9786A]' : 'bg-[#7D5A50]'"
                  :style="{ width: `${(s.count / statusMax) * 100}%` }"
                />
              </span>
              <span class="text-right font-semibold tabular-nums text-[#3D2B24]">{{ s.count }}</span>
            </li>
          </ul>
          <p class="mb-3 mt-6 text-[12px] font-medium text-[#8B6656]">Bookings by weekday</p>
          <AnalyticsBarChart
            :points="weekdayPoints"
            caption="Reservations by weekday"
            :height="150"
            :format-axis="(n: number) => formatCount(Math.round(n))"
            :format-value="(n: number) => `${formatCount(n)} ${n === 1 ? 'booking' : 'bookings'}`"
          />
        </template>
        <p v-else class="mt-5 text-[13px] text-[#8B6656]">No reservations booked for this period.</p>
      </template>
    </AnalyticsPanel>

    <!-- Waste -->
    <AnalyticsPanel class="xl:col-span-7" title="Waste and sell-outs" note="Daily servings planned vs sold, from the servings log">
      <div v-if="loading" class="space-y-3"><span class="skeleton block h-14 rounded" /><span v-for="i in 4" :key="i" class="skeleton block h-8 rounded" /></div>
      <template v-else-if="data?.waste.summary.expected">
        <dl class="grid grid-cols-3 gap-x-4 gap-y-4 sm:grid-cols-5">
          <div v-for="s in wasteStats" :key="s.label">
            <dt class="text-[12px] text-[#8B6656]">{{ s.label }}</dt>
            <dd class="mt-0.5 font-display text-xl font-semibold tabular-nums" :class="s.warn ? 'text-[#A2352A]' : 'text-[#3B1F0E]'">{{ s.value }}</dd>
          </div>
        </dl>
        <div class="-mx-5 mt-6 overflow-x-auto sm:-mx-6">
          <table class="w-full min-w-[440px] text-[13px]">
            <thead>
<<<<<<< HEAD
              <tr class="border-y border-[#EDD8CC] bg-[#FFF8EA]">
                <th scope="col" class="py-4 pl-5 pr-2 text-left whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060] sm:pl-6">Item</th>
                <th scope="col" class="px-2 py-4 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Sold / planned</th>
                <th scope="col" class="px-2 py-4 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Spoiled</th>
                <th scope="col" class="py-4 pl-2 pr-5 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060] sm:pr-6">Sold out</th>
=======
              <tr class="border-b border-[#EEDFC4] text-[#8B6656]">
                <th scope="col" class="pb-2.5 pl-5 pr-2 text-left font-medium sm:pl-6">Item</th>
                <th scope="col" class="px-2 pb-2.5 text-right font-medium">Sold / planned</th>
                <th scope="col" class="px-2 pb-2.5 text-right font-medium">Spoiled</th>
                <th scope="col" class="pb-2.5 pl-2 pr-5 text-right font-medium sm:pr-6">Sold out</th>
>>>>>>> 37b60310d9c2e19e03b53b185b0297700cb81d6f
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in data.waste.items" :key="w.uuid" class="border-b border-[#F3E7D2] last:border-0">
                <td class="py-2.5 pl-5 pr-2 font-semibold text-[#3D2B24] sm:pl-6">{{ w.name }}</td>
                <td class="px-2 py-2.5 text-right tabular-nums text-[#3D2B24]">
                  {{ formatCount(w.sold) }} / {{ formatCount(w.expected) }}
                  <span v-if="w.sell_through !== null" class="block text-[11px] text-[#9E7060]">{{ w.sell_through }}%</span>
                </td>
                <td class="px-2 py-2.5 text-right tabular-nums" :class="w.spoilage ? 'font-semibold text-[#A2352A]' : 'text-[#9E7060]'">{{ formatCount(w.spoilage) }}</td>
                <td class="py-2.5 pl-2 pr-5 text-right tabular-nums text-[#3D2B24] sm:pr-6">
                  {{ w.sold_out_days ? `${w.sold_out_days} of ${w.days} days` : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <p v-else class="text-[13px] text-[#8B6656]">No daily servings were planned in this period. Branch managers set them on the Servings page.</p>
    </AnalyticsPanel>

    <!-- Ingredients -->
    <AnalyticsPanel class="xl:col-span-5" title="Ingredients used" note="Drawn by sales, from each item's recipe">
      <div v-if="loading" class="space-y-3"><span v-for="i in 5" :key="i" class="skeleton block h-6 rounded" /></div>
      <ul v-else-if="data?.ingredients.length" class="divide-y divide-[#F3E7D2]">
        <li v-for="g in data.ingredients" :key="`${g.name}-${g.unit}`" class="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <span class="min-w-0">
            <span class="block truncate text-[14px] font-semibold text-[#3D2B24]">{{ g.name }}</span>
            <span class="text-[12px] text-[#9E7060]">In {{ g.items }} {{ g.items === 1 ? 'item' : 'items' }}</span>
          </span>
          <span class="shrink-0 font-semibold tabular-nums text-[#3D2B24]">{{ formatQty(g.quantity) }} <span class="font-normal text-[#9E7060]">{{ g.unit }}</span></span>
        </li>
      </ul>
      <p v-else class="text-[13px] text-[#8B6656]">No ingredient usage recorded. Items need a recipe for usage to be tracked.</p>
    </AnalyticsPanel>
  </div>
</template>
