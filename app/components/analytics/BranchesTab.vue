<script setup lang="ts">
import { computed, toRef } from 'vue'
import AnalyticsPanel from './AnalyticsPanel.vue'
import AnalyticsChange from './AnalyticsChange.vue'
import AnalyticsStatus from './AnalyticsStatus.vue'
import type { AnalyticsBranch, AnalyticsFilters } from '~/services/OwnerAnalyticsService'
import type { ExcelReport, ExcelSheet } from '~/composables/useExcelExport'
import { formatCount, formatPeso, formatPesoCents, formatSpan } from '~/utils/dashboardFormat'

// Every branch side by side for the date range (the branch filter does not apply here).
const props = defineProps<{ filters: AnalyticsFilters }>()

const service = useOwnerAnalyticsService()
const { data, loading, refreshing, error, reload } = useAnalyticsTab(toRef(props, 'filters'), f => service.getBranches(f))

const top = computed(() => Math.max(1, ...(data.value?.branches ?? []).map(b => b.revenue)))
const totals = computed(() => {
  const rows = data.value?.branches ?? []
  const revenue = rows.reduce((a, b) => a + b.revenue, 0)
  const orders = rows.reduce((a, b) => a + b.orders, 0)
  return { revenue, orders, aov: orders ? revenue / orders : 0 }
})

const statusLabel: Record<string, string> = {
  pending_approval: 'Awaiting approval',
  inactive: 'Inactive',
  suspended: 'Suspended',
  rejected: 'Rejected',
}

// ── Excel export, called from the page's Export button ──
function excelReport(): Omit<ExcelReport, 'cafe'> | null {
  const d = data.value
  if (!d) return null
  const t = totals.value
  const previous = d.branches.reduce((a, b) => a + b.previous_revenue, 0)

  type Row = AnalyticsBranch & { total?: boolean }
  const branches: ExcelSheet<Row> = {
    name: 'Branch comparison',
    columns: [
      { header: 'Branch', value: b => b.total ? 'All branches' : b.name },
      { header: 'Type', value: b => b.total ? null : (b.branch_type === 'main' ? 'Main' : 'Branch') },
      { header: 'Status', value: b => b.total ? null : (statusLabel[b.status] ?? 'Active') },
      { header: 'Income', value: b => b.revenue, format: 'peso' },
      { header: 'Orders', value: b => b.orders, format: 'count' },
      { header: 'Average order', value: b => b.avg_order_value, format: 'peso' },
      { header: 'Share of income', value: b => b.total ? null : b.share, format: 'percent' },
      { header: 'Income before', value: b => b.previous_revenue, format: 'peso' },
      { header: 'Income vs before', value: b => b.change, format: 'percent', signed: true },
    ],
    rows: [...d.branches].sort((a, b) => b.revenue - a.revenue),
    totals: {
      total: true, uuid: '', name: '', branch_type: '', status: '', share: 0,
      revenue: t.revenue, orders: t.orders, avg_order_value: t.aov, previous_revenue: previous,
      change: previous ? ((t.revenue - previous) / previous) * 100 : null,
    },
  }

  return {
    title: 'Branches report',
    from: d.filters.from,
    to: d.filters.to,
    scope: 'All branches',
    sheets: [branches],
  }
}

defineExpose({ excelReport, exportReady: computed(() => !!data.value) })
</script>

<template>
  <AnalyticsStatus v-if="error && !data" :kind="error === 'locked' ? 'locked' : 'failed'" @retry="reload" />

  <AnalyticsPanel
    v-else
    title="Branch comparison"
    :note="data ? `All branches, ${formatSpan(data.filters.from, data.filters.to)}. Change compares income with ${formatSpan(data.filters.previous_from, data.filters.previous_to)}.` : undefined"
    :class="{ 'opacity-60 transition-opacity': refreshing }"
  >
    <div v-if="loading" class="space-y-3"><span v-for="i in 4" :key="i" class="skeleton block h-12 rounded" /></div>

    <div v-else-if="data?.branches.length" class="-mx-5 overflow-x-auto sm:-mx-6">
      <table class="w-full min-w-[560px] text-[13px]">
        <thead>
          <tr class="border-y border-[#EDD8CC] bg-[#FFF8EA]">
            <th scope="col" class="py-4 pl-5 pr-2 text-left whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060] sm:pl-6">Branch</th>
            <th scope="col" class="w-[38%] px-2 py-4 text-left whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Income</th>
            <th scope="col" class="px-2 py-4 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Orders</th>
            <th scope="col" class="px-2 py-4 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060]">Avg order</th>
            <th scope="col" class="py-4 pl-2 pr-5 text-right whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060] sm:pr-6">Change</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(b, i) in data.branches" :key="b.uuid" class="border-b border-[#F3E7D2] last:border-0 hover:bg-[#FDF8F3]">
            <td class="py-3.5 pl-5 pr-2 sm:pl-6">
              <div class="flex items-center gap-3">
                <span class="w-4 font-display text-[14px] font-semibold tabular-nums" :class="i === 0 ? 'text-[#7D5A50]' : 'text-[#C2A592]'">{{ i + 1 }}</span>
                <div class="min-w-0">
                  <NuxtLink
                    :to="`/owner/branches/${b.uuid}`"
                    class="rounded font-semibold text-[#3D2B24] hover:text-[#7D5A50] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                  >{{ b.name }}</NuxtLink>
                  <span class="mt-0.5 flex items-center gap-2 text-[11px]">
                    <span v-if="b.branch_type === 'main'" class="rounded-full bg-[#F3E7D2] px-1.5 py-px font-semibold text-[#7D5A50]">Main</span>
                    <span v-if="statusLabel[b.status]" class="inline-flex items-center gap-1 text-[#8A5A1F]">
                      <span class="h-1.5 w-1.5 rounded-full bg-[#E09A3E]" aria-hidden="true" />{{ statusLabel[b.status] }}
                    </span>
                  </span>
                </div>
              </div>
            </td>
            <td class="px-2 py-3.5">
              <div class="flex items-center gap-3">
                <span class="h-2 flex-1 overflow-hidden rounded-full bg-[#F3E7D2]">
                  <span class="block h-full rounded-full" :class="i === 0 ? 'bg-[#7D5A50]' : 'bg-[#B4846C]'" :style="{ width: `${(b.revenue / top) * 100}%` }" />
                </span>
                <span class="w-[92px] shrink-0 text-right tabular-nums">
                  <span class="block font-semibold text-[#3D2B24]">{{ formatPeso(b.revenue) }}</span>
                  <span class="text-[11px] text-[#9E7060]">{{ b.share }}% of total</span>
                </span>
              </div>
            </td>
            <td class="px-2 py-3.5 text-right tabular-nums text-[#3D2B24]">{{ formatCount(b.orders) }}</td>
            <td class="px-2 py-3.5 text-right tabular-nums text-[#3D2B24]">{{ formatPesoCents(b.avg_order_value) }}</td>
            <td class="py-3.5 pl-2 pr-5 text-right sm:pr-6"><AnalyticsChange :value="b.change" size="xs" /></td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t-2 border-[#EEDFC4] font-semibold text-[#3B1F0E]">
            <th scope="row" class="py-3 pl-5 pr-2 text-left sm:pl-6">All branches</th>
            <td class="px-2 py-3 text-right tabular-nums">{{ formatPeso(totals.revenue) }}</td>
            <td class="px-2 py-3 text-right tabular-nums">{{ formatCount(totals.orders) }}</td>
            <td class="px-2 py-3 text-right tabular-nums">{{ formatPesoCents(totals.aov) }}</td>
            <td class="pl-2 pr-5 sm:pr-6" />
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-else class="rounded-2xl bg-[#FDF8F3] px-5 py-10 text-center">
      <Icon name="heroicons:building-storefront" class="mx-auto h-7 w-7 text-[#C2A592]" />
      <p class="mt-2 font-display font-semibold text-[#3B1F0E]">No branches yet</p>
      <NuxtLink to="/owner/cafes" class="mt-2 inline-block rounded text-[13px] font-semibold text-[#7D5A50] underline underline-offset-4">Add a branch</NuxtLink>
    </div>
  </AnalyticsPanel>
</template>
