<!-- app/components/manager/ManagerTransactionsCard.vue -->
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { ManagerTransactionItem, ManagerTransactionsResponse } from '~/services/ManagerDashboardService'
import { formatCount, formatMethod, formatPeso, formatPesoCents } from '~/utils/dashboardFormat'

const props = defineProps<{
  branchUuid: string
}>()

const emit = defineEmits<{
  viewReceipt: [uuid: string]
}>()

const service = useManagerDashboardService()

const loading = ref(true)
const loadError = ref(false)
const transactions = ref<ManagerTransactionItem[]>([])
const currentPage = ref(1)
const lastPage = ref(1)
const totalItems = ref(0)
const statusFilter = ref('')
const searchQuery = ref('')
const todayStats = ref<ManagerTransactionsResponse['today_stats'] | null>(null)

const statusTabs = [
  { label: 'All', value: '' },
  { label: 'Completed', value: 'completed' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Voided', value: 'void' },
]

// Ignore responses from superseded requests (fast typing, quick tab switches)
let requestId = 0

async function fetchTransactions() {
  if (!props.branchUuid) return
  const id = ++requestId
  loading.value = true
  loadError.value = false
  try {
    const res = await service.getTransactions(props.branchUuid, {
      page: currentPage.value,
      per_page: 8,
      status: statusFilter.value,
      search: searchQuery.value.trim(),
    })
    if (id !== requestId) return
    if (res.success) {
      transactions.value = res.transactions.data
      currentPage.value = res.transactions.current_page
      lastPage.value = res.transactions.last_page
      totalItems.value = res.transactions.total
      todayStats.value = res.today_stats
    } else {
      loadError.value = true
    }
  } catch (err) {
    if (id !== requestId) return
    console.warn('Failed to load branch transactions:', err)
    loadError.value = true
  } finally {
    if (id === requestId) loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchTransactions()
  }, 350)
}

function clearSearch() {
  clearTimeout(searchTimer)
  searchQuery.value = ''
  currentPage.value = 1
  fetchTransactions()
}

function setFilter(status: string) {
  statusFilter.value = status
  currentPage.value = 1
  fetchTransactions()
}

function changePage(page: number) {
  if (page < 1 || page > lastPage.value || page === currentPage.value) return
  currentPage.value = page
  fetchTransactions()
}

watch(() => props.branchUuid, (newVal) => {
  if (newVal) {
    currentPage.value = 1
    fetchTransactions()
  }
})

onMounted(() => {
  if (props.branchUuid) {
    fetchTransactions()
  }
})

defineExpose({ refresh: fetchTransactions })

function formatDateTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function statusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'paid':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'refunded':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'void':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

function paymentIcon(method: string) {
  switch (method?.toLowerCase()) {
    case 'card':
      return 'heroicons:credit-card'
    case 'gcash':
    case 'maya':
    case 'ewallet':
      return 'heroicons:device-phone-mobile'
    default:
      return 'heroicons:banknotes'
  }
}
</script>

<template>
  <section class="flex flex-col gap-4 rounded-[22px] border border-[#EEDFC4] bg-white p-5 shadow-[0_1px_2px_rgba(59,31,14,0.04)] sm:p-6" aria-labelledby="transactions-heading">
    <!-- Header -->
    <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h2 id="transactions-heading" class="font-display text-[18px] font-bold text-[#3B1F0E]">
            Transaction History
          </h2>
          <span v-if="todayStats?.total_count" class="rounded-full bg-[#7D5A50]/10 text-[#7D5A50] font-semibold text-xs px-2.5 py-0.5 tabular-nums">
            {{ todayStats.total_count }} rung today
          </span>
        </div>
        <p class="mt-0.5 text-[13px] text-[#8B6656]">
          Real-time log of customer receipts, refunds, and voided orders
        </p>
      </div>

      <!-- Quick today summary stats pill -->
      <div v-if="todayStats" class="flex flex-wrap items-center gap-2 text-xs">
        <div class="flex items-center gap-1.5 rounded-lg border border-[#F0DFD5] bg-[#FDF8F5] px-2.5 py-1">
          <span class="text-[#8B6656]">Today's Net:</span>
          <strong class="text-[#3B1F0E] font-display tabular-nums">{{ formatPeso(todayStats.completed_amount) }}</strong>
        </div>
        <div v-if="todayStats.refunded_count > 0 || todayStats.void_count > 0" class="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1 text-red-800">
          <span>{{ todayStats.refunded_count }} refunded</span>
          <span v-if="todayStats.void_count > 0">&middot; {{ todayStats.void_count }} void</span>
        </div>
      </div>
    </header>

    <!-- Filters + Search -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
      <!-- Tabs -->
      <div
        role="group"
        aria-label="Filter by status"
        class="inline-flex self-start overflow-x-auto rounded-xl bg-[#F6ECDD] p-1 text-xs font-semibold text-[#8B6656]"
      >
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          type="button"
          :aria-pressed="statusFilter === tab.value"
          class="whitespace-nowrap rounded-lg px-3 py-1.5 transition-all duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          :class="statusFilter === tab.value ? 'bg-white text-[#3B1F0E] shadow-[0_1px_3px_rgba(59,31,14,0.08)]' : 'hover:text-[#3B1F0E]'"
          @click="setFilter(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative sm:w-64">
        <Icon name="heroicons:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B6656]" aria-hidden="true" />
        <input
          v-model="searchQuery"
          type="search"
          aria-label="Search transactions by receipt number or cashier"
          placeholder="Receipt # or cashier…"
          class="tx-search h-9 w-full rounded-xl border border-[#EADFD3] bg-[#FBF7F2] pl-9 pr-8 text-xs text-[#2D201B] transition-colors placeholder:text-[#8B6656] focus:border-[#7D5A50] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7D5A50]"
          @input="onSearchInput"
          @keydown.esc="searchQuery && clearSearch()"
        />
        <button
          v-if="searchQuery"
          type="button"
          aria-label="Clear search"
          class="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[#A88879] hover:bg-[#F6ECDD] hover:text-[#5A3828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          @click="clearSearch"
        >
          <Icon name="heroicons:x-mark" class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- Transactions Table -->
    <div
      class="relative mt-1 overflow-x-auto rounded-xl border border-[#EADFD3] transition-opacity duration-200"
      :class="{ 'opacity-60': loading && transactions.length }"
      :aria-busy="loading"
    >
      <table class="w-full text-left text-xs border-collapse">
        <thead v-if="transactions.length && !(loadError && !loading)" class="whitespace-nowrap bg-[#FBF7F2] border-b border-[#EADFD3] text-[#8B6656] uppercase font-bold text-[11px] tracking-wider">
          <tr>
            <th class="py-3 px-4">Receipt #</th>
            <th class="py-3 px-4">Date & Time</th>
            <th class="py-3 px-4">Cashier</th>
            <th class="py-3 px-4">Items</th>
            <th class="py-3 px-4">Payment</th>
            <th class="py-3 px-4 text-right">Total Amount</th>
            <th class="py-3 px-4 text-center">Status</th>
            <th class="py-3 px-4 text-right">Details</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#EADFD3]">
          <tr v-if="loading && !transactions.length">
            <td colspan="8" class="py-10 text-center">
              <Icon name="heroicons:arrow-path" class="w-6 h-6 mx-auto text-[#7D5A50] animate-spin" />
              <p class="text-xs text-[#8B6656] mt-2">Loading transactions…</p>
            </td>
          </tr>

          <tr v-else-if="loadError && !loading">
            <td colspan="8" class="py-10 text-center">
              <Icon name="heroicons:exclamation-triangle" class="mx-auto h-7 w-7 text-[#B4554A]" />
              <p class="mt-2 font-display font-semibold text-[#3B1F0E]">Transactions could not be loaded</p>
              <p class="mt-0.5 text-xs text-[#8B6656]">Check your connection, then try again.</p>
              <button
                type="button"
                class="mt-3 rounded-lg border border-[#D9C3A5] bg-white px-3 py-1.5 text-xs font-semibold text-[#3B1F0E] hover:border-[#3B1F0E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                @click="fetchTransactions"
              >
                Try again
              </button>
            </td>
          </tr>

          <tr v-else-if="!transactions.length">
            <td colspan="8" class="py-10 text-center">
              <Icon name="heroicons:receipt-percent" class="w-7 h-7 mx-auto text-[#C2A592]" />
              <template v-if="searchQuery || statusFilter">
                <p class="font-display font-semibold text-[#3B1F0E] mt-2">No transactions match these filters</p>
                <p class="text-xs text-[#8B6656] mt-0.5">Clear the search or pick a different status.</p>
              </template>
              <template v-else>
                <p class="font-display font-semibold text-[#3B1F0E] mt-2">No transactions yet</p>
                <p class="text-xs text-[#8B6656] mt-0.5">Receipts rung up at this branch will appear here.</p>
              </template>
            </td>
          </tr>

          <tr
            v-for="(tx, idx) in transactions"
            v-else
            :key="tx.uuid"
            class="animate-row-enter hover:bg-[#FDF8F3] transition-colors cursor-pointer group"
            :style="{ '--row-delay': `${Math.min(idx, 8) * 45}ms` }"
            @click="emit('viewReceipt', tx.uuid)"
          >
            <!-- Receipt # -->
            <td class="py-3 px-4 font-mono font-bold text-[#3B1F0E]">
              #{{ tx.receipt_number }}
            </td>

            <!-- Date & Time -->
            <td class="py-3 px-4 text-[#6E4F42] whitespace-nowrap">
              {{ formatDateTime(tx.created_at) }}
            </td>

            <!-- Cashier -->
            <td class="py-3 px-4 text-[#2D201B] font-medium whitespace-nowrap">
              {{ tx.staff_name }}
            </td>

            <!-- Items -->
            <td class="py-3 px-4 text-[#6E4F42] tabular-nums">
              {{ tx.items_count }} {{ tx.items_count === 1 ? 'item' : 'items' }}
            </td>

            <!-- Payment Method -->
            <td class="py-3 px-4 whitespace-nowrap">
              <span class="inline-flex items-center gap-1.5 rounded-md bg-[#FBF7F2] border border-[#EADFD3] px-2 py-0.5 text-[#6E4F42] font-medium">
                <Icon :name="paymentIcon(tx.payment_method)" class="w-3.5 h-3.5 text-[#7D5A50]" />
                {{ formatMethod(tx.payment_method) }}
              </span>
            </td>

            <!-- Total Amount -->
            <td class="py-3 px-4 text-right font-display font-bold text-[#2D201B] tabular-nums whitespace-nowrap">
              {{ formatPesoCents(tx.total_amount) }}
            </td>

            <!-- Status -->
            <td class="py-3 px-4 text-center whitespace-nowrap">
              <span :class="['px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border', statusBadgeClass(tx.status)]">
                {{ tx.status }}
              </span>
            </td>

            <!-- Action -->
            <td class="py-3 px-4 text-right whitespace-nowrap">
              <button
                type="button"
                class="inline-flex items-center gap-1 text-xs font-semibold text-[#7D5A50] hover:text-[#5B3E32] group-hover:underline"
                @click.stop="emit('viewReceipt', tx.uuid)"
              >
                <span>View</span>
                <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="lastPage > 1" class="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-[#8B6656]">
      <div>
        Showing page <strong class="text-[#3B1F0E]">{{ currentPage }}</strong> of <strong class="text-[#3B1F0E]">{{ lastPage }}</strong>
        <span class="text-[#A88879]">({{ totalItems }} total)</span>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          type="button"
          :disabled="currentPage <= 1 || loading"
          class="h-8 px-3 rounded-lg border border-[#EADFD3] bg-white text-[#2D201B] font-medium hover:bg-[#FBF7F2] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          @click="changePage(currentPage - 1)"
        >
          Previous
        </button>

        <button
          type="button"
          :disabled="currentPage >= lastPage || loading"
          class="h-8 px-3 rounded-lg border border-[#EADFD3] bg-white text-[#2D201B] font-medium hover:bg-[#FBF7F2] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          @click="changePage(currentPage + 1)"
        >
          Next
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Custom clear button replaces the native one */
.tx-search::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}

@keyframes rowEnter {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-row-enter {
  animation: rowEnter 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--row-delay, 0ms);
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .animate-row-enter {
    animation: none !important;
    transform: none !important;
  }
}
</style>
