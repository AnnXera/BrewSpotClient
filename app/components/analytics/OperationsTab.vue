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
const { data, loading, refreshing, error, lock, reload } = useAnalyticsTab(toRef(props, 'filters'), f => service.getOperations(f))

const staffRanked = computed(() => [...(data.value?.staff ?? [])].sort((a, b) => b.revenue - a.revenue))
const staffTotal = computed(() => staffRanked.value.reduce((a, s) => a + s.revenue, 0))
const staffShare = (revenue: number) => (staffTotal.value ? Math.round((revenue / staffTotal.value) * 100) : 0)
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?'

// "2 more refunded after serving, 1 voided": servings used up but not counted as sold
function usedAfterSale(refunded: number, voided?: number): string | undefined {
  const parts = [
    refunded ? `${formatCount(refunded)} more refunded after serving` : '',
    voided ? `${formatCount(voided)} voided` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : undefined
}

const wasteStats = computed(() => {
  const w = data.value?.waste.summary
  if (!w) return []
  return [
    { label: 'Planned', value: formatCount(w.expected) },
    { label: 'Sold', value: formatCount(w.sold), sub: usedAfterSale(w.refunded, w.voided_sales) },
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
// Ingredients used is what sales drew by recipe, not stock on hand.
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

  const ingredients: ExcelSheet<AnalyticsOperations['ingredients'][number]> = {
    name: 'Ingredients used',
    columns: [
      { header: 'Ingredient', value: g => g.name },
      { header: 'Quantity used', value: g => g.quantity, format: 'decimal' },
      { header: 'Unit', value: g => g.unit },
      { header: 'Used in items', value: g => g.items, format: 'count' },
    ],
    rows: [...d.ingredients].sort((a, b) => a.name.localeCompare(b.name) || a.unit.localeCompare(b.unit)),
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
    sheets: [summary, staff, waste, reasons, ingredients, byStatus, byWeekday, upcomingSheet],
  }
}

defineExpose({ excelReport, exportReady: computed(() => !!data.value) })
</script>

<template>
  <AnalyticsStatus v-if="error && !data" :kind="error === 'locked' ? 'locked' : 'failed'" :lock="lock" @retry="reload" />

  <!-- One panel per row -->
  <div v-else class="flex flex-col gap-6" :class="{ 'opacity-60 transition-opacity': refreshing }">
    <div class="contents">
      <!-- Staff -->
      <AnalyticsPanel title="Staff performance" note="Sales rung up per cashier, highest first">
        <div v-if="loading" class="space-y-3"><span v-for="i in 3" :key="i" class="skeleton block h-14 rounded-xl" /></div>
        <ul v-else-if="staffRanked.length" class="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          <li
            v-for="(s, idx) in staffRanked"
            :key="s.uuid ?? 'none'"
            class="rounded-xl border border-[#F3E7D2] bg-[#FFFDF9] px-4 py-3 transition-colors hover:border-[#E3CFB4]"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                :class="idx === 0 && staffRanked.length > 1 ? 'bg-[#7D5A50] text-[#FFF0D1]' : 'bg-[#F3E7D2] text-[#7D5A50]'"
                aria-hidden="true"
              >{{ s.uuid ? initials(s.name) : '?' }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-[14px] font-semibold" :class="s.uuid ? 'text-[#3D2B24]' : 'italic text-[#9E7060]'">{{ s.name }}</p>
                <p class="truncate text-[12px] text-[#9E7060]">{{ [s.position, s.branch].filter(Boolean).join(' · ') }}</p>
              </div>
              <div class="shrink-0 text-right">
                <p class="font-display text-[17px] font-semibold tabular-nums text-[#3B1F0E]">{{ formatPeso(s.revenue) }}</p>
                <p class="text-[11px] tabular-nums text-[#9E7060]">{{ staffShare(s.revenue) }}% of sales</p>
              </div>
            </div>

            <span class="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-[#F3E7D2]" aria-hidden="true">
              <span class="block h-full rounded-full bg-[#B4846C]" :style="{ width: `${staffShare(s.revenue)}%` }" />
            </span>

            <dl class="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[#8B6656]">
              <div class="flex gap-1"><dt>Orders</dt><dd class="font-semibold tabular-nums text-[#3D2B24]">{{ formatCount(s.orders) }}</dd></div>
              <div class="flex gap-1"><dt>Avg order</dt><dd class="font-semibold tabular-nums text-[#3D2B24]">{{ formatPesoCents(s.avg_order_value) }}</dd></div>
              <div class="flex gap-1"><dt>Discounts</dt><dd class="font-semibold tabular-nums text-[#3D2B24]">{{ s.discounts ? formatPesoCents(s.discounts) : 'None' }}</dd></div>
            </dl>
          </li>
        </ul>
        <p v-else class="text-[13px] text-[#8B6656]">No sales in this period.</p>
      </AnalyticsPanel>

      <!-- Waste -->
      <AnalyticsPanel title="Waste and sell-outs" note="Daily servings planned vs sold, and spoilage logged on the registers">
        <div v-if="loading" class="space-y-3"><span class="skeleton block h-20 rounded-xl" /><span v-for="i in 4" :key="i" class="skeleton block h-8 rounded" /></div>
        <template v-else-if="data?.waste.summary.expected">
          <dl class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <div v-for="s in wasteStats" :key="s.label" class="rounded-xl bg-[#FFF8EA] px-3.5 py-3">
              <dt class="text-[12px] text-[#8B6656]">{{ s.label }}</dt>
              <dd class="mt-0.5 flex flex-wrap items-center gap-2">
                <span class="font-display text-xl font-semibold tabular-nums" :class="s.warn ? 'text-[#A2352A]' : 'text-[#3B1F0E]'">{{ s.value }}</span>
                <AnalyticsChange v-if="'change' in s" :value="s.change ?? null" invert size="xs" />
              </dd>
              <dd v-if="s.sub" class="mt-0.5 text-[11px] leading-snug text-[#9E7060]">{{ s.sub }}</dd>
            </div>
          </dl>

          <!-- Why servings were thrown away, from the entries logged on the registers -->
          <div v-if="data.waste.summary.spoilage" class="mt-6">
            <p class="mb-3 text-[12px] font-semibold text-[#5C4037]">Why servings were spoiled</p>
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

          <!-- Per item -->
          <div class="mt-6">
            <div class="grid grid-cols-[1fr_minmax(120px,38%)_64px_72px] gap-3 border-b border-[#EDD8CC] pb-2 text-[11px] font-semibold text-[#9E7060]">
              <span>Item</span>
              <span>Sold of planned</span>
              <span class="text-right">Spoiled</span>
              <span class="text-right">Sold out</span>
            </div>
            <ul class="divide-y divide-[#F3E7D2]">
              <li
                v-for="w in data.waste.items"
                :key="w.uuid"
                class="grid grid-cols-[1fr_minmax(120px,38%)_64px_72px] items-center gap-3 py-3 text-[13px]"
              >
                <span class="min-w-0">
                  <span class="block truncate font-semibold text-[#3D2B24]">{{ w.name }}</span>
                  <span v-if="w.removed" class="mt-0.5 inline-block rounded-full bg-[#F3E7D2] px-2 py-0.5 text-[10px] font-semibold text-[#8B6656]" title="Deleted from the menu since">Removed</span>
                </span>

                <span class="min-w-0">
                  <span class="flex items-baseline justify-between gap-2 text-[12px]">
                    <span class="tabular-nums text-[#3D2B24]"><span class="font-semibold">{{ formatCount(w.sold) }}</span> / {{ formatCount(w.expected) }}</span>
                    <span v-if="w.sell_through !== null" class="tabular-nums text-[#9E7060]">{{ w.sell_through }}%</span>
                  </span>
                  <span class="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#F3E7D2]" aria-hidden="true">
                    <span class="block h-full rounded-full bg-[#7D5A50]" :style="{ width: `${Math.min(100, w.sell_through ?? 0)}%` }" />
                  </span>
                  <span v-if="usedAfterSale(w.refunded, w.voided_sales)" class="mt-1 block text-[11px] text-[#9E7060]">{{ usedAfterSale(w.refunded, w.voided_sales) }}</span>
                </span>

                <span class="text-right tabular-nums" :class="w.spoilage ? 'font-semibold text-[#A2352A]' : 'text-[#C9B39A]'">
                  {{ formatCount(w.spoilage) }}
                  <span v-if="w.spoilage_value" class="block text-[11px] font-normal text-[#9E7060]">{{ formatPeso(w.spoilage_value) }}</span>
                </span>

                <span class="text-right text-[12px] tabular-nums" :class="w.sold_out_days ? 'font-semibold text-[#3D2B24]' : 'text-[#C9B39A]'">
                  {{ w.sold_out_days ? (w.days === 1 ? 'Yes' : `${w.sold_out_days} of ${w.days} days`) : 'No' }}
                </span>
              </li>
            </ul>
          </div>
        </template>
        <p v-else class="text-[13px] text-[#8B6656]">No daily servings were planned in this period. Branch managers set them on the Servings page.</p>
      </AnalyticsPanel>
    </div>

    <div class="contents">
      <!-- Reservations -->
      <AnalyticsPanel title="Reservations" note="Bookings for dates in this period">
        <div v-if="loading" class="space-y-3"><span class="skeleton block h-16 rounded-xl" /><span class="skeleton block h-32 rounded" /></div>
        <template v-else-if="data">
          <dl class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div v-for="s in reservationStats" :key="s.label" class="rounded-xl bg-[#FFF8EA] px-3.5 py-3">
              <dt class="text-[12px] text-[#8B6656]">{{ s.label }}</dt>
              <dd class="mt-0.5 font-display text-xl font-semibold tabular-nums" :class="s.warn ? 'text-[#A2352A]' : 'text-[#3B1F0E]'">{{ s.value }}</dd>
            </div>
          </dl>

          <div v-if="data.reservations.total" class="mt-6 grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2">
            <div>
            <p class="mb-3 text-[12px] font-semibold text-[#5C4037]">By status</p>
            <ul class="space-y-2">
              <li v-for="s in data.reservations.by_status" :key="s.status" class="grid grid-cols-[88px_1fr_28px] items-center gap-3 text-[12px]">
                <span :class="s.count ? 'text-[#5C4037]' : 'text-[#C9B39A]'">{{ statusLabel[s.status] ?? s.status }}</span>
                <span class="h-2 overflow-hidden rounded-full bg-[#F7EEE0]">
                  <span
                    class="block h-full rounded-full"
                    :class="s.status === 'no_show' || s.status === 'cancelled' ? 'bg-[#C9786A]' : 'bg-[#7D5A50]'"
                    :style="{ width: `${(s.count / statusMax) * 100}%` }"
                  />
                </span>
                <span class="text-right tabular-nums" :class="s.count ? 'font-semibold text-[#3D2B24]' : 'text-[#C9B39A]'">{{ s.count }}</span>
              </li>
            </ul>
            </div>

            <div>
            <p class="mb-3 text-[12px] font-semibold text-[#5C4037]">By weekday</p>
            <AnalyticsBarChart
              :points="weekdayPoints"
              caption="Reservations by weekday"
              :height="150"
              integer
              :format-axis="(n: number) => formatCount(Math.round(n))"
              :format-value="(n: number) => `${formatCount(n)} ${n === 1 ? 'booking' : 'bookings'}`"
            />
            </div>
          </div>
          <p v-else class="mt-5 text-[13px] text-[#8B6656]">No reservations booked for this period.</p>

          <!-- Ahead of today, so it shows whatever period is picked -->
          <div v-if="upcoming" class="mt-6 rounded-xl border border-[#F3E7D2] bg-[#FFFDF9] p-4">
            <div class="flex items-baseline justify-between gap-3">
              <p class="text-[12px] font-semibold text-[#5C4037]">Coming up, next {{ upcoming.days }} days</p>
              <p v-if="upcoming.total" class="text-[12px] tabular-nums text-[#8B6656]">
                {{ formatCount(upcoming.total) }} {{ upcoming.total === 1 ? 'booking' : 'bookings' }} · {{ formatCount(upcoming.guests) }} {{ upcoming.guests === 1 ? 'guest' : 'guests' }}
              </p>
            </div>
            <p v-if="upcoming.pending" class="mt-1 text-[12px] font-semibold text-[#A2352A]">{{ upcoming.pending }} awaiting confirmation</p>
            <ul v-if="upcoming.total" class="mt-3 divide-y divide-[#F3E7D2]">
              <li v-for="r in upcoming.next" :key="r.uuid" class="flex items-center justify-between gap-3 py-2.5 text-[13px] first:pt-0 last:pb-0">
                <span class="min-w-0">
                  <span class="block font-semibold tabular-nums text-[#3D2B24]">{{ formatSlot(r.date) }}</span>
                  <span class="block truncate text-[12px] text-[#9E7060]">{{ r.table }} · {{ r.branch }}</span>
                </span>
                <span class="shrink-0 text-right">
                  <span class="block tabular-nums text-[#3D2B24]">{{ r.party_size }} {{ r.party_size === 1 ? 'guest' : 'guests' }}</span>
                  <span
                    class="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium"
                    :class="r.status === 'pending' ? 'bg-[#F6E4D6] text-[#A2352A]' : 'bg-[#EAF3EA] text-[#3F6B45]'"
                  >{{ statusLabel[r.status] }}</span>
                </span>
              </li>
            </ul>
            <p v-else class="mt-1 text-[13px] text-[#8B6656]">No bookings coming up.</p>
          </div>
        </template>
      </AnalyticsPanel>

      <!-- Ingredients -->
      <AnalyticsPanel title="Ingredients used" note="Drawn by sales, from each item's recipe">
        <div v-if="loading" class="space-y-3"><span v-for="i in 5" :key="i" class="skeleton block h-6 rounded" /></div>
        <ul v-else-if="data?.ingredients.length" class="divide-y divide-[#F3E7D2]">
          <li v-for="g in data.ingredients" :key="`${g.name}-${g.unit}`" class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span class="min-w-0">
              <span class="block truncate text-[14px] font-medium text-[#3D2B24]">{{ g.name }}</span>
              <span class="text-[12px] text-[#9E7060]">Used in {{ g.items }} {{ g.items === 1 ? 'item' : 'items' }}</span>
            </span>
            <span class="shrink-0 text-[15px] font-semibold tabular-nums text-[#3D2B24]">{{ formatQty(g.quantity) }} <span class="text-[13px] font-medium text-[#9E7060]">{{ g.unit }}</span></span>
          </li>
        </ul>
        <p v-else class="text-[13px] text-[#8B6656]">No ingredient usage recorded. Items need a recipe for usage to be tracked.</p>
      </AnalyticsPanel>
    </div>
  </div>
</template>
