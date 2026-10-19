<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import AnalyticsPanel from './AnalyticsPanel.vue'
import AnalyticsChange from './AnalyticsChange.vue'
import AnalyticsStatus from './AnalyticsStatus.vue'
import type { AnalyticsFilters, AnalyticsMenu, AnalyticsMenuItem } from '~/services/OwnerAnalyticsService'
import type { ExcelFormat, ExcelReport, ExcelSheet } from '~/composables/useExcelExport'
import { formatCount, formatPeso, formatPesoCents } from '~/utils/dashboardFormat'

const props = defineProps<{ filters: AnalyticsFilters }>()

const service = useOwnerAnalyticsService()
const { data, loading, refreshing, error, reload } = useAnalyticsTab(toRef(props, 'filters'), f => service.getMenu(f))

// ── Item table ──────────────────────────────────────────────
type SortKey = 'name' | 'orders' | 'quantity' | 'sales' | 'change'
const sortKey = ref<SortKey>('sales')
const sortDesc = ref(true)
const search = ref('')
const showAll = ref(false)
const PAGE = 12

const columns: { key: SortKey; label: string; class: string }[] = [
  { key: 'name', label: 'Item', class: 'text-left' },
  { key: 'orders', label: 'Orders', class: 'text-right max-md:hidden' },
  { key: 'quantity', label: 'Units', class: 'text-right' },
  { key: 'sales', label: 'Sales', class: 'text-right' },
  { key: 'change', label: 'Units vs before', class: 'text-right max-sm:hidden' },
]

function sortBy(key: SortKey) {
  if (sortKey.value === key) sortDesc.value = !sortDesc.value
  else { sortKey.value = key; sortDesc.value = key !== 'name' }
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const rows = (data.value?.items ?? []).filter(i => !q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
  const dir = sortDesc.value ? -1 : 1
  return [...rows].sort((a: AnalyticsMenuItem, b: AnalyticsMenuItem) => {
    const k = sortKey.value
    if (k === 'name') return a.name.localeCompare(b.name) * dir
    // "New" items (no previous sales) sort above any percentage when descending.
    const av = k === 'change' ? (a.change ?? Number.POSITIVE_INFINITY) : a[k]
    const bv = k === 'change' ? (b.change ?? Number.POSITIVE_INFINITY) : b[k]
    return (av === bv ? 0 : av > bv ? 1 : -1) * dir
  })
})
const visible = computed(() => (showAll.value || search.value ? filtered.value : filtered.value.slice(0, PAGE)))
const topSales = computed(() => Math.max(1, ...(data.value?.items ?? []).map(i => i.sales)))

function ariaSort(key: SortKey) {
  if (sortKey.value !== key) return 'none'
  return sortDesc.value ? 'descending' : 'ascending'
}

// ── Side panels ─────────────────────────────────────────────
const categoryMax = computed(() => Math.max(1, ...(data.value?.categories ?? []).map(c => c.orders)))
// Fixed tones for size segments, darkest first; they follow the size's order, never cycle.
const SIZE_TONES = ['#5A3A2C', '#8E6253', '#B98A70', '#D9B597', '#EBD6C1']

// ── Excel export, called from the page's Export button ──
function excelReport(): Omit<ExcelReport, 'cafe'> | null {
  const d = data.value
  if (!d) return null
  const sum = (rows: { sales: number }[]) => rows.reduce((a, r) => a + r.sales, 0)

  type SummaryRow = { metric: string; value: number | string; format: ExcelFormat }
  const top = [...d.items].sort((a, b) => b.sales - a.sales)[0]
  const summary: ExcelSheet<SummaryRow> = {
    name: 'Summary',
    columns: [
      { header: 'Metric', value: r => r.metric },
      { header: 'Value', value: r => r.value, format: r => r.format },
    ],
    rows: [
      { metric: 'Item sales', value: d.summary.sales, format: 'peso' },
      { metric: 'Units sold', value: d.summary.items_sold, format: 'count' },
      { metric: 'Items that sold', value: d.summary.distinct_items, format: 'count' },
      { metric: 'Items that did not sell', value: d.not_selling.length, format: 'count' },
      ...(top ? [{ metric: 'Top item by sales', value: top.name, format: 'text' as const }] : []),
    ],
  }

  // Every item, best sellers first, whatever the table on screen is sorted or searched by.
  type ItemRow = AnalyticsMenuItem & { total?: boolean }
  const items: ExcelSheet<ItemRow> = {
    name: 'Items',
    columns: [
      { header: 'Item', value: i => i.total ? 'Total' : i.name },
      { header: 'Category', value: i => i.category },
      { header: 'Orders', value: i => i.total ? null : i.orders, format: 'count' },
      { header: 'Units', value: i => i.quantity, format: 'count' },
      { header: 'Sales', value: i => i.sales, format: 'peso' },
      { header: 'Share of sales', value: i => i.total ? null : i.sales_share, format: 'percent' },
      { header: 'Share of orders', value: i => i.total ? null : i.order_share, format: 'percent' },
      { header: 'Units before', value: i => i.total ? null : i.previous_quantity, format: 'count' },
      // No units before means the item is new to this comparison.
      { header: 'Units vs before', value: i => i.total ? null : (i.change ?? 'New'), format: i => i.change === null ? 'text' : 'percent', signed: true },
    ],
    rows: [...d.items].sort((a, b) => b.sales - a.sales),
    totals: {
      total: true, uuid: '', name: '', category: '', orders: 0, sales_share: 0, order_share: 0, previous_quantity: 0, change: 0,
      quantity: d.items.reduce((a, i) => a + i.quantity, 0),
      sales: sum(d.items),
    },
  }

  // Orders don't add up across categories (one order can hold several), so no totals row.
  const categories: ExcelSheet<AnalyticsMenu['categories'][number]> = {
    name: 'Categories',
    columns: [
      { header: 'Category', value: c => c.name },
      { header: 'Orders', value: c => c.orders, format: 'count' },
      { header: 'Units', value: c => c.quantity, format: 'count' },
      { header: 'Sales', value: c => c.sales, format: 'peso' },
      { header: 'Share of orders', value: c => c.order_share, format: 'percent' },
      { header: 'Share of sales', value: c => c.sales_share, format: 'percent' },
    ],
    rows: d.categories,
  }

  type SizeRow = AnalyticsMenu['sizes'][number] & { total?: boolean }
  const sizes: ExcelSheet<SizeRow> = {
    name: 'Sizes',
    columns: [
      { header: 'Size', value: s => s.total ? 'Total' : s.name },
      { header: 'Units', value: s => s.quantity, format: 'count' },
      { header: 'Sales', value: s => s.sales, format: 'peso' },
      { header: 'Share of units', value: s => s.total ? null : s.share, format: 'percent' },
    ],
    rows: d.sizes,
    totals: { total: true, name: '', share: 0, quantity: d.sizes.reduce((a, s) => a + s.quantity, 0), sales: sum(d.sizes) },
  }

  const addons: ExcelSheet<AnalyticsMenu['addons'][number]> = {
    name: 'Add-ons',
    columns: [
      { header: 'Add-on', value: a => a.name },
      { header: 'Times ordered', value: a => a.quantity, format: 'count' },
      { header: 'Sales', value: a => a.sales, format: 'peso' },
      { header: 'On items ordered', value: a => a.attach_rate, format: 'percent' },
    ],
    rows: d.addons,
  }

  const notSelling: ExcelSheet<AnalyticsMenu['not_selling'][number]> = {
    name: 'Not selling',
    columns: [
      { header: 'Item', value: i => i.name },
      { header: 'Category', value: i => i.category },
    ],
    rows: d.not_selling,
  }

  return {
    title: 'Menu report',
    from: d.filters.from,
    to: d.filters.to,
    scope: d.filters.branch?.name ?? 'All branches',
    sheets: [summary, items, categories, sizes, addons, notSelling],
  }
}

defineExpose({ excelReport, exportReady: computed(() => !!data.value) })
</script>

<template>
  <AnalyticsStatus v-if="error && !data" :kind="error === 'locked' ? 'locked' : 'failed'" @retry="reload" />

  <div v-else class="space-y-6" :class="{ 'opacity-60 transition-opacity': refreshing }">
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <AnalyticsPanel
        class="xl:col-span-8"
        title="Menu items"
        :note="data ? `${formatCount(data.summary.items_sold)} units of ${formatCount(data.summary.distinct_items)} items, ${formatPeso(data.summary.sales)} in item sales` : undefined"
      >
        <template #actions>
          <label class="relative block w-full sm:w-56">
            <span class="sr-only">Search items</span>
            <Icon name="heroicons:magnifying-glass-20-solid" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B4846C]" />
            <input
              v-model="search"
              type="search"
              placeholder="Search items"
              class="h-9 w-full rounded-xl border border-[#E3CFB4] bg-[#FFFDF9] pl-9 pr-3 text-[13px] text-[#3B1F0E] placeholder:text-[#B4967F] focus:border-[#7D5A50] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30"
            >
          </label>
        </template>

        <div v-if="loading" class="space-y-3"><span v-for="i in 8" :key="i" class="skeleton block h-9 rounded" /></div>

        <template v-else-if="data?.items.length">
          <div class="-mx-5 overflow-x-auto sm:-mx-6">
            <table class="w-full min-w-[460px] text-[13px]">
              <thead>
                <tr class="border-y border-[#EDD8CC] bg-[#FFF8EA]">
                  <th
                    v-for="c in columns"
                    :key="c.key"
                    scope="col"
                    :aria-sort="ariaSort(c.key)"
                    class="whitespace-nowrap px-2 py-4 font-sans text-[11px] font-bold uppercase tracking-[0.08px] text-[#9E7060] first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6"
                    :class="c.class"
                  >
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded uppercase hover:text-[#7D5A50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                      :class="sortKey === c.key ? 'text-[#7D5A50]' : ''"
                      @click="sortBy(c.key)"
                    >
                      {{ c.label }}
                      <Icon
                        :name="sortKey === c.key && !sortDesc ? 'heroicons:chevron-up-20-solid' : 'heroicons:chevron-down-20-solid'"
                        class="h-3.5 w-3.5"
                        :class="sortKey === c.key ? 'opacity-100' : 'opacity-30'"
                      />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in visible" :key="item.uuid" class="border-b border-[#F3E7D2] last:border-0 hover:bg-[#FDF8F3]">
                  <td class="py-2.5 pl-5 pr-2 sm:pl-6">
                    <NuxtLink
                      :to="`/owner/menu-management/item/${item.uuid}`"
                      class="block rounded font-semibold text-[#3D2B24] hover:text-[#7D5A50] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                    >{{ item.name }}</NuxtLink>
                    <span class="mt-0.5 flex items-center gap-2 text-[12px] text-[#9E7060]">
                      {{ item.category }}
                      <span class="hidden h-1 w-16 overflow-hidden rounded-full bg-[#F3E7D2] sm:block" aria-hidden="true">
                        <span class="block h-full rounded-full bg-[#B4846C]" :style="{ width: `${(item.sales / topSales) * 100}%` }" />
                      </span>
                    </span>
                  </td>
                  <td class="px-2 py-2.5 text-right text-[#3D2B24] tabular-nums max-md:hidden">{{ formatCount(item.orders) }}</td>
                  <td class="px-2 py-2.5 text-right text-[#3D2B24] tabular-nums">{{ formatCount(item.quantity) }}</td>
                  <td class="px-2 py-2.5 text-right tabular-nums">
                    <span class="font-semibold text-[#3D2B24]">{{ formatPesoCents(item.sales) }}</span>
                    <span class="block text-[11px] text-[#9E7060]">{{ item.sales_share }}%</span>
                  </td>
                  <td class="py-2.5 pl-2 pr-5 text-right max-sm:hidden sm:pr-6">
                    <AnalyticsChange :value="item.change" size="xs" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!filtered.length" class="py-6 text-center text-[13px] text-[#8B6656]">No item matches "{{ search }}".</p>
          <button
            v-if="!search && filtered.length > PAGE"
            type="button"
            class="mt-3 self-start rounded text-[13px] font-semibold text-[#7D5A50] underline decoration-[#7D5A50]/30 underline-offset-4 hover:decoration-[#7D5A50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
            @click="showAll = !showAll"
          >
            {{ showAll ? 'Show fewer' : `Show all ${filtered.length} items` }}
          </button>
        </template>

        <div v-else class="rounded-2xl bg-[#FDF8F3] px-5 py-10 text-center">
          <Icon name="ph:coffee" class="mx-auto h-7 w-7 text-[#C2A592]" />
          <p class="mt-2 font-display font-semibold text-[#3B1F0E]">No items sold in this period</p>
        </div>
      </AnalyticsPanel>

      <div class="flex flex-col gap-6 xl:col-span-4">
        <AnalyticsPanel title="Categories" note="By orders that included the category">
          <div v-if="loading" class="space-y-4"><span v-for="i in 4" :key="i" class="skeleton block h-8 rounded" /></div>
          <ol v-else-if="data?.categories.length" class="space-y-4">
            <li v-for="c in data.categories" :key="c.uuid ?? 'none'">
              <div class="flex items-baseline justify-between gap-3 text-[14px]">
                <span class="min-w-0 truncate font-semibold text-[#3D2B24]">{{ c.name }}</span>
                <span class="shrink-0 tabular-nums text-[#3D2B24]">{{ formatCount(c.orders) }} <span class="text-[#9E7060]">orders</span></span>
              </div>
              <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F3E7D2]">
                <div class="h-full rounded-full bg-[#7D5A50]" :style="{ width: `${(c.orders / categoryMax) * 100}%` }" />
              </div>
              <p class="mt-1 text-[12px] text-[#9E7060] tabular-nums">In {{ c.order_share }}% of orders · {{ formatPeso(c.sales) }}</p>
            </li>
          </ol>
          <p v-else class="text-[13px] text-[#8B6656]">No category sales yet.</p>
        </AnalyticsPanel>

        <AnalyticsPanel title="Sizes" note="Units sold by size">
          <div v-if="loading" class="skeleton h-12 rounded" />
          <template v-else-if="data?.sizes.length">
            <div class="flex h-3 overflow-hidden rounded-full" role="img" :aria-label="data.sizes.map(s => `${s.name} ${s.share}%`).join(', ')">
              <span
                v-for="(s, i) in data.sizes"
                :key="s.name"
                class="h-full border-r-2 border-white last:border-r-0"
                :style="{ width: `${s.share}%`, background: SIZE_TONES[Math.min(i, SIZE_TONES.length - 1)] }"
              />
            </div>
            <ul class="mt-3 space-y-1.5">
              <li v-for="(s, i) in data.sizes" :key="s.name" class="flex items-center justify-between gap-3 text-[13px]">
                <span class="flex items-center gap-2 text-[#3D2B24]">
                  <span class="h-2.5 w-2.5 rounded-sm" :style="{ background: SIZE_TONES[Math.min(i, SIZE_TONES.length - 1)] }" aria-hidden="true" />
                  {{ s.name }}
                </span>
                <span class="tabular-nums text-[#8B6656]"><span class="font-semibold text-[#3D2B24]">{{ s.share }}%</span> · {{ formatCount(s.quantity) }}</span>
              </li>
            </ul>
          </template>
          <p v-else class="text-[13px] text-[#8B6656]">No items with sizes sold in this period.</p>
        </AnalyticsPanel>

        <AnalyticsPanel title="Add-ons" note="How often each add-on is ordered">
          <div v-if="loading" class="space-y-3"><span v-for="i in 3" :key="i" class="skeleton block h-6 rounded" /></div>
          <ul v-else-if="data?.addons.length" class="divide-y divide-[#F3E7D2]">
            <li v-for="a in data.addons.slice(0, 8)" :key="a.name" class="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span class="min-w-0">
                <span class="block truncate text-[14px] font-semibold text-[#3D2B24]">{{ a.name }}</span>
                <span class="text-[12px] text-[#9E7060] tabular-nums">On {{ a.attach_rate }}% of items ordered</span>
              </span>
              <span class="shrink-0 text-right text-[13px] tabular-nums text-[#8B6656]">
                <span class="block font-semibold text-[#3D2B24]">{{ formatCount(a.quantity) }}×</span>
                {{ formatPeso(a.sales) }}
              </span>
            </li>
          </ul>
          <p v-else class="text-[13px] text-[#8B6656]">No add-ons sold in this period.</p>
        </AnalyticsPanel>
      </div>
    </div>

    <AnalyticsPanel
      v-if="data?.not_selling.length"
      title="Not selling"
      :note="`${data.not_selling.length} ${data.not_selling.length === 1 ? 'item is' : 'items are'} on the menu but didn't sell once in this period. Worth a promo, a recipe tweak, or a spot off the menu.`"
    >
      <ul class="flex flex-wrap gap-2">
        <li v-for="i in data.not_selling" :key="i.uuid">
          <NuxtLink
            :to="`/owner/menu-management/item/${i.uuid}`"
            class="inline-flex items-center gap-1.5 rounded-full border border-[#EEDFC4] bg-[#FFFDF9] px-3 py-1.5 text-[13px] text-[#3D2B24] transition-colors hover:border-[#7D5A50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          >
            <span class="font-semibold">{{ i.name }}</span>
            <span class="text-[#9E7060]">{{ i.category }}</span>
          </NuxtLink>
        </li>
      </ul>
    </AnalyticsPanel>
  </div>
</template>
