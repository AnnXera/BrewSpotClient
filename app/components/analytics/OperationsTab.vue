<script setup lang="ts">
import { computed, toRef } from 'vue'
import AnalyticsPanel from './AnalyticsPanel.vue'
import AnalyticsBarChart, { type BarPoint } from './AnalyticsBarChart.vue'
import AnalyticsStatus from './AnalyticsStatus.vue'
import AnalyticsChange from './AnalyticsChange.vue'
import type { AnalyticsFilters, AnalyticsOperations } from '~/services/OwnerAnalyticsService'
import type { ExcelFormat, ExcelReport, ExcelSheet } from '~/composables/useExcelExport'
import { spoilageReasonLabels, type SpoilageReason } from '~/services/PosService'
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
    { label: 'Sold', value: formatCount(w.sold), sub: w.refunded ? `${formatCount(w.refunded)} more refunded after serving` : undefined },
    { label: 'Sell-through', value: w.sell_through === null ? '—' : `${w.sell_through}%` },
    {
      label: 'Spoiled',
      value: formatCount(w.spoilage),
      warn: w.spoilage > 0,
      change: w.spoilage_change,
      sub: w.spoilage_rate ? `${w.spoilage_rate}% of planned` : undefined,
    },
    { label: 'Spoilage cost', value: formatPeso(w.spoilage_value), warn: w.spoilage_value > 0, sub: 'Size price when logged' },
    { label: 'Sold-out days', value: formatCount(w.sold_out_days) },
  ]
})

const reasonLabel = (r: SpoilageReason | 'unspecified') => (r === 'unspecified' ? 'No reason given' : spoilageReasonLabels[r] ?? r)
const reasonMax = computed(() => Math.max(1, ...(data.value?.waste.reasons ?? []).map(r => r.quantity)))

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

const upcoming = computed(() => data.value?.reservations.upcoming)
const formatSlot = (iso: string) =>
  new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

const formatQty =(n: number) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(n)

// ── Excel export, called from the page's Export button ──
// Ingredients used stays out: inventory covers servings only.
function excelReport(): Omit<ExcelReport, 'cafe'> | null {
  const d = data.value
  if (!d) return null
  const w = d.waste.summary
  const r = d.reservations

  // Spoilage change isn't marked signed: more spoilage going up is bad news, not green.
  type SummaryRow = { area: string; metric: string; value: number | null; format: ExcelFormat }
  const summary: ExcelSheet<SummaryRow> = {
    name: 'Summary',
    columns: [
      { header: 'Area', value: x => x.area },
      { header: 'Metric', value: x => x.metric },
      { header: 'Value', value: x => x.value, format: x => x.format },
    ],
    rows: [
      { area: 'Servings', metric: 'Planned', value: w.expected, format: 'count' },
      { area: 'Servings', metric: 'Sold', value: w.sold, format: 'count' },
      { area: 'Servings', metric: 'Refunded after serving', value: w.refunded, format: 'count' },
      { area: 'Servings', metric: 'Sell-through', value: w.sell_through, format: 'percent' },
      { area: 'Servings', metric: 'Spoiled', value: w.spoilage, format: 'count' },
      { area: 'Servings', metric: 'Spoiled, % of planned', value: w.spoilage_rate, format: 'percent' },
      { area: 'Servings', metric: 'Spoilage vs before', value: w.spoilage_change, format: 'percent' },
      { area: 'Servings', metric: 'Spoilage cost', value: w.spoilage_value, format: 'peso' },
      { area: 'Servings', metric: 'Sold-out days', value: w.sold_out_days, format: 'count' },
      { area: 'Servings', metric: 'Spoilage voided as mistakes', value: d.waste.voided.quantity, format: 'count' },
      { area: 'Reservations', metric: 'Bookings', value: r.total, format: 'count' },
      { area: 'Reservations', metric: 'Guests', value: r.guests, format: 'count' },
      { area: 'Reservations', metric: 'Average party', value: r.avg_party || null, format: 'decimal' },
      { area: 'Reservations', metric: 'No-show rate', value: r.no_show_rate, format: 'percent' },
      { area: 'Reservations', metric: 'Cancellation rate', value: r.cancel_rate, format: 'percent' },
    ],
  }

  type StaffRow = AnalyticsOperations['staff'][number] & { total?: boolean }
  const staffRows = [...d.staff].sort((a, b) => b.revenue - a.revenue)
  const staffOrders = staffRows.reduce((a, s) => a + s.orders, 0)
  const staffRevenue = staffRows.reduce((a, s) => a + s.revenue, 0)
  const staff: ExcelSheet<StaffRow> = {
    name: 'Staff performance',
    columns: [
      { header: 'Cashier', value: s => s.total ? 'Total' : s.name },
      { header: 'Position', value: s => s.position },
      { header: 'Branch', value: s => s.branch },
      { header: 'Orders', value: s => s.orders, format: 'count' },
      { header: 'Sales', value: s => s.revenue, format: 'peso' },
      { header: 'Average order', value: s => s.avg_order_value, format: 'peso' },
      { header: 'Discounts given', value: s => s.discounts, format: 'peso' },
    ],
    rows: staffRows,
    totals: {
      total: true, uuid: null, name: '', position: null, branch: null,
      orders: staffOrders, revenue: staffRevenue,
      avg_order_value: staffOrders ? staffRevenue / staffOrders : 0,
      discounts: staffRows.reduce((a, s) => a + s.discounts, 0),
    },
  }

  type WasteRow = AnalyticsOperations['waste']['items'][number] & { total?: boolean }
  const wasteItems = d.waste.items
  const waste: ExcelSheet<WasteRow> = {
    name: 'Servings by item',
    columns: [
      { header: 'Item', value: i => i.total ? 'Total' : (i.removed ? `${i.name} (removed)` : i.name) },
      { header: 'Planned', value: i => i.expected, format: 'count' },
      { header: 'Sold', value: i => i.sold, format: 'count' },
      { header: 'Refunded after serving', value: i => i.refunded, format: 'count' },
      { header: 'Sell-through', value: i => i.sell_through, format: 'percent' },
      { header: 'Spoiled', value: i => i.spoilage, format: 'count' },
      { header: 'Spoilage cost', value: i => i.spoilage_value, format: 'peso' },
      { header: 'Sold-out days', value: i => i.sold_out_days, format: 'count' },
      { header: 'Days planned', value: i => i.total ? null : i.days, format: 'count' },
    ],
    rows: wasteItems,
    totals: {
      total: true, uuid: '', name: '', removed: false, days: 0,
      expected: w.expected, sold: w.sold, refunded: w.refunded, sell_through: w.sell_through,
      spoilage: w.spoilage, spoilage_value: w.spoilage_value, sold_out_days: w.sold_out_days,
    },
  }

  const reasons: ExcelSheet<AnalyticsOperations['waste']['reasons'][number]> = {
    name: 'Spoilage reasons',
    columns: [
      { header: 'Reason', value: x => reasonLabel(x.reason) },
      { header: 'Servings', value: x => x.quantity, format: 'count' },
      { header: 'Share', value: x => x.share, format: 'percent' },
    ],
    rows: d.waste.reasons,
  }

  const byStatus: ExcelSheet<{ status: string; count: number }> = {
    name: 'Bookings by status',
    columns: [
      { header: 'Status', value: x => statusLabel[x.status] ?? x.status },
      { header: 'Bookings', value: x => x.count, format: 'count' },
    ],
    rows: r.by_status,
  }

  const byWeekday: ExcelSheet<{ weekday: number; count: number }> = {
    name: 'Bookings by weekday',
    columns: [
      { header: 'Day', value: x => WEEKDAYS_LONG[x.weekday] },
      { header: 'Bookings', value: x => x.count, format: 'count', heat: true },
    ],
    rows: r.by_weekday,
  }

  // From today on, whatever the period; no guest details leave the system.
  const upcomingSheet: ExcelSheet<AnalyticsOperations['reservations']['upcoming']['next'][number]> = {
    name: 'Upcoming bookings',
    columns: [
      { header: 'When', value: x => formatSlot(x.date) },
      { header: 'Party size', value: x => x.party_size, format: 'count' },
      { header: 'Status', value: x => statusLabel[x.status] ?? x.status },
      { header: 'Table', value: x => x.table },
      { header: 'Branch', value: x => x.branch },
    ],
    rows: r.upcoming.next,
  }

  return {
    title: 'Operations report',
    from: d.filters.from,
    to: d.filters.to,
    scope: d.filters.branch?.name ?? 'All branches',
    sheets: [summary, staff, waste, reasons, byStatus, byWeekday, upcomingSheet],
  }
}

defineExpose({ excelReport, exportReady: computed(() => !!data.value) })
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
            <tr class="border-y border-[#EDD8CC] bg-[#FFF8EA]">
              <th scope="col" class="py-4 pl-5 pr-2 text-left whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060] sm:pl-6">Staff</th>
              <th scope="col" class="px-2 py-4 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Orders</th>
              <th scope="col" class="px-2 py-4 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Sales</th>
              <th scope="col" class="px-2 py-4 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Avg order</th>
              <th scope="col" class="py-4 pl-2 pr-5 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060] sm:pr-6">Discounts</th>
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

        <!-- Ahead of today, so it shows whatever period is picked -->
        <div v-if="upcoming" class="mt-6 border-t border-[#F3E7D2] pt-5">
          <p class="text-[12px] font-medium text-[#8B6656]">Upcoming, next {{ upcoming.days }} days</p>
          <template v-if="upcoming.total">
            <p class="mt-1 text-[13px] text-[#3D2B24]">
              <span class="font-semibold tabular-nums">{{ formatCount(upcoming.total) }}</span> {{ upcoming.total === 1 ? 'booking' : 'bookings' }},
              <span class="font-semibold tabular-nums">{{ formatCount(upcoming.guests) }}</span> {{ upcoming.guests === 1 ? 'guest' : 'guests' }}<template v-if="upcoming.pending">,
                <span class="font-semibold text-[#A2352A]">{{ upcoming.pending }} awaiting confirmation</span></template>
            </p>
            <ul class="mt-3 divide-y divide-[#F3E7D2]">
              <li v-for="r in upcoming.next" :key="r.uuid" class="flex items-baseline justify-between gap-3 py-2 text-[13px] first:pt-0 last:pb-0">
                <span class="min-w-0">
                  <span class="block font-semibold tabular-nums text-[#3D2B24]">{{ formatSlot(r.date) }}</span>
                  <span class="block truncate text-[12px] text-[#9E7060]">{{ r.table }} · {{ r.branch }}</span>
                </span>
                <span class="shrink-0 text-right">
                  <span class="block tabular-nums text-[#3D2B24]">{{ r.party_size }} {{ r.party_size === 1 ? 'guest' : 'guests' }}</span>
                  <span class="block text-[11px]" :class="r.status === 'pending' ? 'text-[#A2352A]' : 'text-[#9E7060]'">{{ statusLabel[r.status] }}</span>
                </span>
              </li>
            </ul>
          </template>
          <p v-else class="mt-1 text-[13px] text-[#8B6656]">No bookings coming up.</p>
        </div>
      </template>
    </AnalyticsPanel>

    <!-- Waste -->
    <AnalyticsPanel class="xl:col-span-7" title="Waste and sell-outs" note="Daily servings planned vs sold, and spoilage logged on the registers">
      <div v-if="loading" class="space-y-3"><span class="skeleton block h-14 rounded" /><span v-for="i in 4" :key="i" class="skeleton block h-8 rounded" /></div>
      <template v-else-if="data?.waste.summary.expected">
        <dl class="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
          <div v-for="s in wasteStats" :key="s.label">
            <dt class="text-[12px] text-[#8B6656]">{{ s.label }}</dt>
            <dd class="mt-0.5 flex flex-wrap items-center gap-2">
              <span class="font-display text-xl font-semibold tabular-nums" :class="s.warn ? 'text-[#A2352A]' : 'text-[#3B1F0E]'">{{ s.value }}</span>
              <AnalyticsChange v-if="'change' in s" :value="s.change ?? null" invert size="xs" />
            </dd>
            <dd v-if="s.sub" class="text-[11px] text-[#9E7060]">{{ s.sub }}</dd>
          </div>
        </dl>

        <!-- Why servings were thrown away, from the entries logged on the registers -->
        <div v-if="data.waste.summary.spoilage" class="mt-6">
          <p class="mb-3 text-[12px] font-medium text-[#8B6656]">Why servings were spoiled</p>
          <ul class="space-y-2">
            <li v-for="r in data.waste.reasons" :key="r.reason" class="grid grid-cols-[112px_1fr_auto] items-center gap-3 text-[12px] sm:grid-cols-[132px_1fr_72px]">
              <span :class="r.reason === 'unspecified' ? 'italic text-[#9E7060]' : 'text-[#5C4037]'">{{ reasonLabel(r.reason) }}</span>
              <span class="h-2 overflow-hidden rounded-full bg-[#F3E7D2]">
                <span
                  class="block h-full rounded-full"
                  :class="r.reason === 'unspecified' ? 'bg-[#D9C3B5]' : 'bg-[#C9786A]'"
                  :style="{ width: `${(r.quantity / reasonMax) * 100}%` }"
                />
              </span>
              <span class="text-right tabular-nums text-[#3D2B24]"><span class="font-semibold">{{ formatCount(r.quantity) }}</span> <span class="text-[#9E7060]">· {{ r.share }}%</span></span>
            </li>
          </ul>
          <p v-if="data.waste.voided.entries" class="mt-3 text-[12px] text-[#8B6656]">
            {{ data.waste.voided.entries }} {{ data.waste.voided.entries === 1 ? 'entry' : 'entries' }}
            ({{ formatCount(data.waste.voided.quantity) }} {{ data.waste.voided.quantity === 1 ? 'serving' : 'servings' }})
            voided by managers as mistakes, not counted.
          </p>
        </div>
        <div class="-mx-5 mt-6 overflow-x-auto sm:-mx-6">
          <table class="w-full min-w-[440px] text-[13px]">
            <thead>
              <tr class="border-y border-[#EDD8CC] bg-[#FFF8EA]">
                <th scope="col" class="py-4 pl-5 pr-2 text-left whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060] sm:pl-6">Item</th>
                <th scope="col" class="px-2 py-4 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Sold / planned</th>
                <th scope="col" class="px-2 py-4 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Spoiled</th>
                <th scope="col" class="py-4 pl-2 pr-5 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060] sm:pr-6">Sold out</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in data.waste.items" :key="w.uuid" class="border-b border-[#F3E7D2] last:border-0">
                <td class="py-2.5 pl-5 pr-2 font-semibold text-[#3D2B24] sm:pl-6">
                  {{ w.name }}
                  <span v-if="w.removed" class="ml-1 inline-block rounded-full bg-[#F3E7D2] px-2 py-0.5 align-middle text-[10px] font-semibold text-[#8B6656]" title="Deleted from the menu since">Removed</span>
                </td>
                <td class="px-2 py-2.5 text-right tabular-nums text-[#3D2B24]">
                  {{ formatCount(w.sold) }} / {{ formatCount(w.expected) }}
                  <span v-if="w.sell_through !== null" class="block text-[11px] text-[#9E7060]">{{ w.sell_through }}%</span>
                  <span v-if="w.refunded" class="block text-[11px] text-[#9E7060]">+{{ formatCount(w.refunded) }} refunded</span>
                </td>
                <td class="px-2 py-2.5 text-right tabular-nums" :class="w.spoilage ? 'font-semibold text-[#A2352A]' : 'text-[#9E7060]'">
                  {{ formatCount(w.spoilage) }}
                  <span v-if="w.spoilage_value" class="block text-[11px] font-normal text-[#9E7060]">{{ formatPeso(w.spoilage_value) }}</span>
                </td>
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
