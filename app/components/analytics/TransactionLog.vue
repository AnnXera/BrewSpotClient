<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import AnalyticsPanel from './AnalyticsPanel.vue'
import DropdownList from '~/components/common/DropdownList.vue'
import Pagination from '~/components/common/Pagination.vue'
import SearchInput from '~/components/common/SearchInput.vue'
import ManagerTransactionModal from '~/components/manager/ManagerTransactionModal.vue'
import type { AnalyticsFilters, TransactionLog, TransactionLogRow, TransactionLogStatus } from '~/services/OwnerAnalyticsService'
import { formatCount, formatMethod, formatOrderType, formatPesoCents } from '~/utils/dashboardFormat'

// Every sale in the Sales tab's period, refunds and voids included, newest first.
// Pages, status and search are local to this panel; the period and branch come
// from the page filters. Given `branches`, the panel shows its own branch picker
// instead (the dashboard has no page-wide branch filter).
const props = defineProps<{
  filters: AnalyticsFilters
  branches?: { value: string | null; label: string }[]
  note?: string
}>()

const PER_PAGE = 20

const service = useOwnerAnalyticsService()

const branch = ref<string | null>(null)
const effectiveFilters = computed<AnalyticsFilters>(() =>
  props.branches ? { ...props.filters, branch: branch.value } : { ...props.filters },
)

const status = ref<TransactionLogStatus | null>(null)
const search = ref('')
const query = ref('') // search, debounced
const page = ref(1)

const data = ref<TransactionLog | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const failed = ref(false)

const statusTabs: { value: TransactionLogStatus | null; label: string; key: 'all' | TransactionLogStatus }[] = [
  { value: null, label: 'All sales', key: 'all' },
  { value: 'settled', label: 'Completed', key: 'settled' },
  { value: 'refunded', label: 'Refunded', key: 'refunded' },
  { value: 'void', label: 'Voided', key: 'void' },
]

let requestId = 0
async function load() {
  const id = ++requestId
  if (data.value) refreshing.value = true
  failed.value = false
  try {
    const res = await service.getTransactions(effectiveFilters.value, {
      status: status.value,
      search: query.value,
      page: page.value,
      per_page: PER_PAGE,
    })
    if (id !== requestId) return
    if (res?.success) data.value = res
    else failed.value = true
  } catch {
    if (id !== requestId) return
    failed.value = true
  } finally {
    if (id === requestId) {
      loading.value = false
      refreshing.value = false
    }
  }
}

// A new period, branch, status or search starts again from the first page.
watch([() => JSON.stringify(effectiveFilters.value), status, query], () => {
  if (page.value !== 1) page.value = 1 // the page watcher loads
  else load()
}, { immediate: true })
watch(page, load)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (v) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { query.value = v.trim() }, 300)
})
onUnmounted(() => clearTimeout(searchTimer))

const rows = computed(() => data.value?.transactions ?? [])
const allBranches = computed(() => !data.value?.filters.branch)

// The status dropdown, each option with how many sales it has in this period.
const statusOptions = computed(() => statusTabs.map(s => ({
  value: s.value,
  label: data.value ? `${s.label} (${formatCount(data.value.counts[s.key] ?? 0)})` : s.label,
})))

const hasFilters = computed(() => !!(query.value || status.value))
function clearFilters() {
  search.value = ''
  query.value = ''
  status.value = null
}

// Moving to another page starts at the top of the list, not halfway down it.
const listTop = ref<HTMLElement | null>(null)
function goToPage(next: number) {
  if (refreshing.value || next === page.value) return
  page.value = next
  listTop.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const settled = (s: string) => s === 'completed' || s === 'paid' || s === 'partially_refunded'
// Partly refunded sales show what they kept.
const amountOf = (t: TransactionLogRow) => t.status === 'partially_refunded' ? t.total_amount - (t.refunded_amount ?? 0) : t.total_amount

function statusLabel(s: string) {
  if (s === 'partially_refunded') return 'Partly refunded'
  if (settled(s)) return 'Completed'
  if (s === 'void' || s === 'voided') return 'Voided'
  return s.replace(/^\w/, c => c.toUpperCase())
}

function statusClass(s: string) {
  if (s === 'partially_refunded') return 'bg-[#FBEBD3] text-[#8A5A12]'
  if (settled(s)) return 'bg-[#E7F1E4] text-[#2F5D2A]'
  if (s === 'refunded') return 'bg-[#FBEBD3] text-[#8A5A12]'
  return 'bg-[#F8E1DD] text-[#A2352A]'
}

const dateTime = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const formatWhen = (iso: string) => dateTime.format(new Date(iso))

function changeNote(t: TransactionLogRow) {
  if (!t.changed_at) return ''
  const who = t.refund ? ` by ${t.refund.by}` : ''
  return `${statusLabel(t.status)} ${formatWhen(t.changed_at)}${who}`
}

// ── Receipt modal ──
const openUuid = ref<string | null>(null)
const loadReceipt = (uuid: string) => service.getTransaction(uuid)
</script>

<template>
  <AnalyticsPanel
    title="Transaction log"
    :note="note ?? 'Every sale rung up in this period, with who handled it. Refunds and voids stay listed with who approved them.'"
  >
    <!-- Toolbar: status, branch (dashboard only) and search on one row -->
    <div ref="listTop" class="-mt-1 mb-4 flex scroll-mt-6 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div class="w-full sm:w-52">
        <DropdownList
          v-model="status"
          :options="statusOptions"
          size="sm"
          card
          icon="heroicons:funnel"
          aria-label="Transaction status"
        />
      </div>
      <div v-if="branches" class="w-full sm:w-56">
        <DropdownList
          v-model="branch"
          :options="branches"
          size="sm"
          card
          icon="heroicons:building-storefront"
          aria-label="Branch"
        />
      </div>
      <span v-if="refreshing" class="hidden items-center gap-1.5 text-[12px] font-semibold text-[#8B6656] sm:inline-flex" role="status">
        <Icon name="heroicons:arrow-path" class="size-3.5 animate-spin" />
        Updating
      </span>
      <div class="w-full sm:ml-auto sm:w-[260px]">
        <SearchInput v-model="search" placeholder="Receipt #, cashier, or note" aria-label="Search transactions" clearable white />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-2">
      <span v-for="i in 6" :key="i" class="skeleton block h-12 rounded-xl" />
    </div>

    <!-- Failed -->
    <div v-else-if="failed && !data" role="alert" class="flex flex-col items-center py-10 text-center">
      <Icon name="heroicons:exclamation-triangle" class="mb-2 size-8 text-red-400" />
      <p class="text-sm font-semibold text-[#3B1F0E]">The transaction log could not be loaded.</p>
      <button
        type="button"
        class="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#D8C7B5] bg-white px-3.5 text-sm font-bold text-[#3B1F0E] transition-colors hover:bg-[#FAF4ED] outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
        @click="load"
      >
        <Icon name="heroicons:arrow-path" class="size-4" />
        Try again
      </button>
    </div>

    <!-- Empty -->
    <div v-else-if="!rows.length" class="flex flex-col items-center rounded-xl border border-dashed border-[#E3CFB4] py-10 text-center">
      <span class="mb-2 flex size-12 items-center justify-center rounded-full border border-[#E3CFB4] bg-[#FDF3E7] text-[#9E7060]">
        <Icon name="heroicons:receipt-percent" class="size-6" />
      </span>
      <p class="font-display text-[15px] font-semibold text-[#3B1F0E]">
        {{ hasFilters ? 'No transactions match these filters.' : 'No transactions in this period.' }}
      </p>
      <button
        v-if="hasFilters"
        type="button"
        class="mt-2 text-sm font-bold text-[#7D5A50] underline decoration-[#EEDFC4] underline-offset-2 hover:decoration-[#7D5A50]"
        @click="clearFilters"
      >
        Clear filters
      </button>
    </div>

    <div v-else class="transition-opacity" :class="{ 'opacity-60': refreshing }" :aria-busy="refreshing">
      <!-- A filter or page change failed: the sales below are from before it -->
      <div v-if="failed" role="alert" class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">
        <Icon name="heroicons:exclamation-triangle" class="size-4 shrink-0 text-red-500" />
        <span class="flex-1">Couldn't update the list. Showing the last sales that loaded.</span>
        <button type="button" class="font-bold underline underline-offset-2 hover:text-red-900" @click="load">Try again</button>
      </div>

      <!-- Phones and tablets: one card per sale -->
      <ul class="space-y-2 xl:hidden">
        <li v-for="t in rows" :key="t.uuid">
          <button
            type="button"
            class="flex w-full items-start justify-between gap-3 rounded-xl border border-[#F0E4D3] bg-white px-3.5 py-3 text-left transition-colors hover:border-[#D8C7B5] hover:bg-[#FDFBF7] outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            :aria-label="`Open receipt ${t.receipt_number}`"
            @click="openUuid = t.uuid"
          >
            <span class="min-w-0">
              <span class="flex flex-wrap items-center gap-2 text-[14px] font-bold text-[#2D201B]">
                <span class="tabular-nums">#{{ t.receipt_number }}</span>
                <span class="rounded-md border border-[#E9D7BF] bg-[#FAF6F0] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7D5A50]">
                  {{ formatOrderType(t.order_type) }}
                </span>
              </span>
              <span class="mt-0.5 block text-[12px] text-[#8B6656]">
                {{ formatWhen(t.created_at) }} · {{ t.cashier ?? 'No cashier' }}<template v-if="allBranches && t.branch"> · {{ t.branch }}</template>
              </span>
              <span class="mt-0.5 block text-[12px] text-[#8B6656]">
                {{ formatCount(t.items) }} {{ t.items === 1 ? 'item' : 'items' }}<template v-if="t.payment_method"> · {{ formatMethod(t.payment_method) }}</template>
              </span>
              <span v-if="t.changed_at" class="mt-1 block text-[12px] font-semibold text-[#A2352A]">{{ changeNote(t) }}</span>
            </span>
            <span class="shrink-0 text-right">
              <span class="block text-[15px] font-bold tabular-nums" :class="settled(t.status) ? 'text-[#2D201B]' : 'text-[#9E7060] line-through'">{{ formatPesoCents(amountOf(t)) }}</span>
              <span class="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(t.status)">{{ statusLabel(t.status) }}</span>
            </span>
          </button>
        </li>
      </ul>

      <!-- Wide screens: table -->
      <div class="hidden overflow-x-auto rounded-t-xl border border-b-0 border-[#F0E4D3] xl:block">
        <table class="w-full text-left text-[13px]">
          <thead class="bg-[#FDFBF7]">
            <tr class="border-b border-[#F0E4D3] text-[11px] font-bold uppercase tracking-wider text-[#8A6E64]">
              <th scope="col" class="py-2.5 pl-4 pr-3 font-bold">Time</th>
              <th scope="col" class="py-2.5 pr-3 font-bold">Receipt</th>
              <th v-if="allBranches" scope="col" class="py-2.5 pr-3 font-bold">Branch</th>
              <th scope="col" class="py-2.5 pr-3 font-bold">Cashier</th>
              <th scope="col" class="py-2.5 pr-3 font-bold">Order type</th>
              <th scope="col" class="py-2.5 pr-3 text-right font-bold">Items</th>
              <th scope="col" class="py-2.5 pr-3 font-bold">Payment</th>
              <th scope="col" class="py-2.5 pr-3 text-right font-bold">Total</th>
              <th scope="col" class="py-2.5 pr-4 font-bold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F3E7D2]">
            <tr
              v-for="t in rows"
              :key="t.uuid"
              class="group cursor-pointer align-top text-[#3D2B24] transition-colors hover:bg-[#FDFBF7]"
              @click="openUuid = t.uuid"
            >
              <td class="whitespace-nowrap py-3 pl-4 pr-3 tabular-nums text-[#8B6656]">{{ formatWhen(t.created_at) }}</td>
              <td class="py-3 pr-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 font-bold tabular-nums text-[#3B1F0E] outline-none group-hover:underline focus-visible:underline"
                  :aria-label="`Open receipt ${t.receipt_number}`"
                  @click.stop="openUuid = t.uuid"
                >
                  #{{ t.receipt_number }}
                  <Icon name="heroicons:arrow-up-right" class="size-3.5 text-[#B4846C] opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </td>
              <td v-if="allBranches" class="py-3 pr-3">{{ t.branch ?? '–' }}</td>
              <td class="whitespace-nowrap py-3 pr-3">{{ t.cashier ?? 'No cashier' }}</td>
              <td class="whitespace-nowrap py-3 pr-3">
                <span class="inline-flex items-center rounded-md border border-[#E9D7BF] bg-[#FAF6F0] px-2 py-0.5 text-[11px] font-semibold text-[#3B1F0E]">
                  {{ formatOrderType(t.order_type) }}
                </span>
              </td>
              <td class="py-3 pr-3 text-right tabular-nums">{{ formatCount(t.items) }}</td>
              <td class="py-3 pr-3" :class="t.payment_method ? '' : 'text-[#B09080]'">{{ t.payment_method ? formatMethod(t.payment_method) : 'Not recorded' }}</td>
              <td class="whitespace-nowrap py-3 pr-3 text-right tabular-nums">
                <span class="font-bold" :class="{ 'text-[#9E7060] line-through': !settled(t.status) }">{{ formatPesoCents(amountOf(t)) }}</span>
                <span v-if="t.discount_amount > 0" class="block text-[11px] text-[#9E7060]">−{{ formatPesoCents(t.discount_amount) }} discount</span>
              </td>
              <td class="py-3 pr-4">
                <span class="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(t.status)">{{ statusLabel(t.status) }}</span>
                <span v-if="t.changed_at" class="mt-1 block max-w-[220px] text-[11px] leading-snug text-[#8B6656]">
                  {{ formatWhen(t.changed_at) }}<template v-if="t.refund"> · by {{ t.refund.by }}</template>
                  <template v-if="t.refund?.reason"><br>“{{ t.refund.reason }}”</template>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- The app's shared pagination in its own bottom frame, as on Cafe Management:
           joined under the table on wide screens, a standalone frame under the cards below xl -->
      <nav
        v-if="data"
        aria-label="Transaction log pages"
        class="mt-2 xl:mt-0 overflow-hidden rounded-xl xl:rounded-t-none border border-[#F0E4D3] bg-white"
      >
        <Pagination
          :page="page"
          :last-page="data.pagination.last_page"
          @change="goToPage"
        />
      </nav>
    </div>

    <ManagerTransactionModal
      :show="!!openUuid"
      :transaction-uuid="openUuid"
      :loader="loadReceipt"
      @close="openUuid = null"
    />
  </AnalyticsPanel>
</template>

<style scoped>
/* Loading placeholders. The Analytics page styles .skeleton under .analytics, but the
   dashboard also uses this panel and has no such rule. */
.skeleton {
  background: linear-gradient(90deg, #F6ECDD, #FBF4EA, #F6ECDD);
  background-size: 200% 100%;
  animation: txlog-shimmer 1.4s ease-in-out infinite;
}

@keyframes txlog-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
</style>
