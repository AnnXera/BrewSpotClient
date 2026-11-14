<!-- app/components/common/PaymentHistoryTable.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SearchInput from '~/components/common/SearchInput.vue'
import StatusBadge from '~/components/StatusBadge.vue'

export interface PaymentTransaction {
  transaction_id: string
  date: string | null
  description: string
  amount: string | number
  status: string
  owner_name?: string
  owner_email?: string
  payment_gateway?: string
  payment_method?: string
}

const props = withDefaults(
  defineProps<{
    history: PaymentTransaction[]
    loading?: boolean
    perPage?: number
    showControls?: boolean
    showOwnerName?: boolean
  }>(),
  {
    loading: false,
    perPage: 10,
    showControls: true,
    showOwnerName: false,
  }
)

const searchQuery = ref('')
const selectedStatus = ref('')
const startDate = ref('')
const endDate = ref('')
const currentPage = ref(1)
const toastMessage = ref('')
const activeReceipt = ref<PaymentTransaction | null>(null)

// ── Computed Status Counts for Quick Filter Tabs ──────────────────────────
const statusCounts = computed(() => {
  const counts = { all: props.history.length, success: 0, pending: 0, failed: 0 }
  for (const item of props.history) {
    const s = (item.status || '').toLowerCase()
    if (['active', 'succeeded', 'paid', 'approved', 'success'].includes(s)) {
      counts.success++
    } else if (['pending', 'pending_approval'].includes(s)) {
      counts.pending++
    } else if (['failed', 'cancelled', 'terminated', 'rejected'].includes(s)) {
      counts.failed++
    }
  }
  return counts
})

const statusTabs = computed(() => [
  { value: '', label: 'All', count: statusCounts.value.all },
  { value: 'success', label: 'Success', count: statusCounts.value.success },
  { value: 'pending', label: 'Pending', count: statusCounts.value.pending },
  { value: 'failed', label: 'Failed', count: statusCounts.value.failed },
])

const hasActiveFilters = computed(() => {
  return !!(searchQuery.value || selectedStatus.value || startDate.value || endDate.value)
})

function clearAllFilters() {
  searchQuery.value = ''
  selectedStatus.value = ''
  startDate.value = ''
  endDate.value = ''
  currentPage.value = 1
}

// ── Filtered History ──────────────────────────────────────────────────────
const filteredHistory = computed(() => {
  return props.history.filter((item) => {
    const q = searchQuery.value.toLowerCase().trim()
    const matchesQuery =
      !q ||
      item.transaction_id.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      String(item.amount).includes(q) ||
      (item.owner_name && item.owner_name.toLowerCase().includes(q)) ||
      (item.owner_email && item.owner_email.toLowerCase().includes(q))

    const st = selectedStatus.value.toLowerCase()
    const itemSt = (item.status || '').toLowerCase()
    let matchesStatus = true
    if (st) {
      if (st === 'success') {
        matchesStatus = ['active', 'succeeded', 'paid', 'approved', 'success'].includes(itemSt)
      } else if (st === 'pending') {
        matchesStatus = ['pending', 'pending_approval'].includes(itemSt)
      } else if (st === 'failed') {
        matchesStatus = ['failed', 'cancelled', 'terminated', 'rejected'].includes(itemSt)
      } else {
        matchesStatus = itemSt === st
      }
    }

    let matchesDate = true
    if (startDate.value || endDate.value) {
      if (item.date) {
        const itemD = new Date(item.date).getTime()
        if (!isNaN(itemD)) {
          if (startDate.value) {
            const sd = new Date(startDate.value).getTime()
            if (itemD < sd) matchesDate = false
          }
          if (endDate.value && matchesDate) {
            const ed = new Date(endDate.value)
            ed.setHours(23, 59, 59, 999)
            if (itemD > ed.getTime()) matchesDate = false
          }
        }
      }
    }

    return matchesQuery && matchesStatus && matchesDate
  })
})

const lastPage = computed(() => Math.max(1, Math.ceil(filteredHistory.value.length / props.perPage)))

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * props.perPage
  return filteredHistory.value.slice(start, start + props.perPage)
})

const showingFrom = computed(() => (filteredHistory.value.length ? (currentPage.value - 1) * props.perPage + 1 : 0))
const showingTo = computed(() => Math.min(currentPage.value * props.perPage, filteredHistory.value.length))

watch([searchQuery, selectedStatus, startDate, endDate], () => {
  currentPage.value = 1
})

function formatTxnId(rawId: string): string {
  if (!rawId) return 'TXN-0000000'
  if (rawId.startsWith('TXN-')) return rawId
  const clean = rawId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return `TXN-${clean.slice(0, 7)}`
}

function formatDate(val?: string | null): string {
  if (!val) return '—'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  } catch {
    return val
  }
}

function formatAmount(amt?: string | number): string {
  if (amt === undefined || amt === null) return '₱0.00'
  const numeric = typeof amt === 'string' ? parseFloat(amt.replace(/[^0-9.]/g, '')) : amt
  if (isNaN(numeric)) return String(amt)
  return `₱${numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatGateway(val?: string): string {
  if (!val) return 'PayMongo'
  const v = val.toLowerCase()
  if (v.includes('cash')) return 'Cash'
  if (v.includes('trial')) return 'Free Trial'
  if (v.includes('paymongo')) return 'PayMongo'
  if (v.includes('paypal')) return 'PayPal'
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text)
  toastMessage.value = `Copied ${text} to clipboard`
  setTimeout(() => {
    toastMessage.value = ''
  }, 2200)
}

function openReceiptModal(txn: PaymentTransaction) {
  activeReceipt.value = txn
}

function printReceipt() {
  window.print()
}

function handleExportExcel() {
  const label = selectedStatus.value
    ? selectedStatus.value.charAt(0).toUpperCase() + selectedStatus.value.slice(1)
    : 'All Payment Statuses'
  exportToExcel(filteredHistory.value, label)
}
</script>

<template>
  <div class="w-full max-w-full min-w-0">
    <!-- Main Payment History Card Container -->
    <div class="bg-white border border-[#EEDFC4] rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgba(61,43,36,0.04)] w-full max-w-full">
      
      <!-- Top Row: Status Tabs + Clear Action -->
      <div v-if="showControls" class="flex flex-wrap items-center justify-between gap-2.5 px-3.5 pt-3.5 sm:px-6 sm:pt-5 border-b border-[#F3E7D2]/60">
        <!-- Quick Status Pills -->
        <div class="flex items-center gap-1.5 overflow-x-auto max-w-full pb-2.5 sm:pb-3.5" role="tablist" aria-label="Filter transactions by status">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            role="tab"
            :aria-selected="selectedStatus === tab.value"
            class="inline-flex items-center gap-1.5 h-8 sm:h-9 px-3 rounded-[10px] font-sans text-xs sm:text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]/40"
            :class="selectedStatus === tab.value
              ? 'bg-[#7D5A50] text-white shadow-sm'
              : 'text-[#7D5A50] bg-[#FFF8EA]/60 hover:bg-[#F6EBDD]'"
            @click="selectedStatus = tab.value"
          >
            <span>{{ tab.label }}</span>
            <span
              class="tabular-nums text-[10px] sm:text-[11px] font-bold rounded-full px-1.5 py-0.5"
              :class="selectedStatus === tab.value ? 'bg-white/20 text-white' : 'bg-[#EEDFC4] text-[#7D5A50]'"
            >
              {{ tab.count }}
            </span>
          </button>
        </div>

        <!-- Clear Button if filters active -->
        <button
          v-if="hasActiveFilters"
          type="button"
          class="inline-flex items-center gap-1 h-7 sm:h-8 px-2.5 rounded-[8px] font-sans text-[11px] sm:text-[12px] font-semibold text-[#9E7060] cursor-pointer transition-all active:scale-[0.97] hover:text-[#3D2B24] hover:bg-[#F6EBDD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]/40 mb-2 sm:mb-3"
          @click="clearAllFilters"
        >
          <Icon name="heroicons:x-mark" class="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Filters</span>
        </button>
      </div>

      <!-- Second Controls Row: Search Input + Date Range + Export Action -->
      <div v-if="showControls" class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-5 border-b border-[#F3E7D2] w-full max-w-full">
        <!-- Search Input -->
        <div class="flex-1 min-w-0 max-w-full sm:max-w-xs md:max-w-sm">
          <SearchInput
            v-model="searchQuery"
            placeholder="Search TXN ID, owner, plan..."
            clearable
            class="w-full"
          />
        </div>

        <!-- Right Side: Date Range Pickers & Export Excel -->
        <div class="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <!-- Date Range Input Group -->
          <div class="flex items-center gap-1 bg-[#FFF8EA] border border-[#EDD8CC] rounded-xl px-2 py-1">
            <span class="text-[#9E7060] text-[11px] font-semibold uppercase tracking-wider pl-1">Date</span>
            <input 
              type="date" 
              v-model="startDate" 
              class="h-7 w-[105px] sm:w-[115px] px-1 bg-transparent rounded-lg font-sans text-xs text-[#3D2B24] focus:outline-none cursor-pointer"
              title="Start Date"
            />
            <span class="text-[#9E7060] font-sans text-xs font-medium">to</span>
            <input 
              type="date" 
              v-model="endDate" 
              class="h-7 w-[105px] sm:w-[115px] px-1 bg-transparent rounded-lg font-sans text-xs text-[#3D2B24] focus:outline-none cursor-pointer"
              title="End Date"
            />
          </div>

          <!-- Export Excel Button -->
          <button
            type="button"
            class="inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-[10px] bg-white border border-[#EDD8CC] text-[#7D5A50] font-sans font-medium text-xs sm:text-[13px] shadow-[0_1px_2px_rgba(61,43,36,0.04)] cursor-pointer transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none hover:bg-[#FDF3E7] hover:border-[#D9C4B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]/40 whitespace-nowrap"
            :disabled="!filteredHistory.length"
            title="Export records to Excel spreadsheet"
            @click="handleExportExcel"
          >
            <Icon name="heroicons:arrow-down-tray" class="w-3.5 h-3.5 text-[#2E9E5B]" aria-hidden="true" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      <!-- Table Section with constrained horizontal scroll wrapper ONLY for the table -->
      <div class="w-full max-w-full overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[620px]">
          <thead>
            <tr class="bg-[#FBF2E1] border-b border-[#F3E7D2]">
              <th class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-4 sm:px-5 py-3.5 whitespace-nowrap">
                Transaction ID
              </th>
              <th class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-4 sm:px-5 py-3.5 whitespace-nowrap">
                Date
              </th>
              <th v-if="showOwnerName" class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-4 sm:px-5 py-3.5 whitespace-nowrap">
                Owner Name
              </th>
              <th class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-4 sm:px-5 py-3.5 whitespace-nowrap">
                Activity / Plan Type
              </th>
              <th class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-4 sm:px-5 py-3.5 whitespace-nowrap">
                Amount
              </th>
              <th class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-4 sm:px-5 py-3.5 whitespace-nowrap">
                Payment Status
              </th>
              <th class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-4 sm:px-5 py-3.5 text-right whitespace-nowrap">
                Receipt
              </th>
            </tr>
          </thead>

          <!-- Table Body -->
          <tbody>
            <!-- Skeleton Loading State -->
            <template v-if="loading && !filteredHistory.length">
              <tr v-for="i in 4" :key="`sk-${i}`" class="border-b border-[#F3E7D2] last:border-b-0" aria-hidden="true">
                <td class="px-4 sm:px-5 py-3.5"><span class="skeleton block h-4 w-24 rounded" /></td>
                <td class="px-4 sm:px-5 py-3.5"><span class="skeleton block h-4 w-20 rounded" /></td>
                <td v-if="showOwnerName" class="px-4 sm:px-5 py-3.5">
                  <div class="flex items-center gap-2">
                    <span class="skeleton size-7 rounded-full shrink-0" />
                    <span class="skeleton block h-4 w-24 rounded" />
                  </div>
                </td>
                <td class="px-4 sm:px-5 py-3.5"><span class="skeleton block h-4 w-32 rounded" /></td>
                <td class="px-4 sm:px-5 py-3.5"><span class="skeleton block h-4 w-16 rounded" /></td>
                <td class="px-4 sm:px-5 py-3.5"><span class="skeleton block h-6 w-16 rounded-full" /></td>
                <td class="px-4 sm:px-5 py-3.5 text-right"><span class="skeleton block h-6 w-6 rounded-lg ml-auto" /></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="!filteredHistory.length">
              <td :colspan="showOwnerName ? 7 : 6" class="px-4 sm:px-6 py-12 text-center font-sans text-sm text-[#3B1F0E]/50">
                <div class="flex flex-col items-center justify-center gap-1.5">
                  <Icon name="heroicons:receipt-refund" class="size-7 text-[#C2A592]/70" />
                  <p class="font-medium text-[#3D2B24]">No payment transactions found</p>
                  <p class="text-xs text-[#9E7060]">Try clearing or adjusting your search filters.</p>
                </div>
              </td>
            </tr>

            <!-- Data Rows -->
            <tr
              v-for="txn in paginatedRows"
              :key="txn.transaction_id"
              class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FFFAF0] transition-colors duration-150 ease-out group cursor-pointer"
              @click="openReceiptModal(txn)"
            >
              <!-- Transaction ID with copy button -->
              <td class="px-4 sm:px-5 py-3.5 font-sans text-[13.5px] font-bold text-[#3B1F0E] whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  <span class="tracking-tight">{{ formatTxnId(txn.transaction_id) }}</span>
                  <button
                    type="button"
                    class="size-6 inline-flex items-center justify-center rounded-md text-[#9E7060] opacity-0 group-hover:opacity-100 hover:text-[#3B1F0E] hover:bg-[#F3E7D2]/60 transition-all active:scale-[0.92]"
                    title="Copy Transaction ID"
                    @click.stop="copyToClipboard(formatTxnId(txn.transaction_id))"
                  >
                    <Icon name="heroicons:document-duplicate" class="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </td>

              <!-- Date -->
              <td class="px-4 sm:px-5 py-3.5 font-sans text-[13.5px] text-[#3B1F0E]/75 tabular-nums whitespace-nowrap">
                {{ formatDate(txn.date) }}
              </td>

              <!-- Owner Name -->
              <td v-if="showOwnerName" class="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                <div class="flex items-center gap-2.5">
                  <CommonAvatar :name="txn.owner_name || 'Owner'" :index="0" :size="28" />
                  <div class="leading-tight">
                    <p class="font-sans text-[13.5px] font-semibold text-[#3B1F0E]">{{ txn.owner_name || 'N/A' }}</p>
                    <p v-if="txn.owner_email" class="text-[11px] text-[#3B1F0E]/50">{{ txn.owner_email }}</p>
                  </div>
                </div>
              </td>

              <!-- Activity / Plan Type -->
              <td class="px-4 sm:px-5 py-3.5 font-sans text-[13.5px] font-medium text-[#3B1F0E]">
                {{ txn.description }}
              </td>

              <!-- Amount: Consistent dark brown color -->
              <td class="px-4 sm:px-5 py-3.5 font-sans text-[14px] font-bold text-[#3D2B24] tabular-nums whitespace-nowrap">
                {{ formatAmount(txn.amount) }}
              </td>

              <!-- Payment Status Pill (with status dot) -->
              <td class="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                <StatusBadge :status="txn.status" />
              </td>

              <!-- Receipt Action -->
              <td class="px-4 sm:px-5 py-3.5 text-right whitespace-nowrap">
                <button
                  type="button"
                  class="inline-flex items-center justify-center size-8 rounded-[8px] text-[#9E7060] hover:text-[#7D5A50] hover:bg-[#F3E7D2]/60 transition-all active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]/40"
                  title="View Official Receipt"
                  aria-label="View Official Receipt"
                  @click.stop="openReceiptModal(txn)"
                >
                  <Icon name="heroicons:receipt-percent" class="size-4" aria-hidden="true" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Integrated Card Footer: Result Count & Pagination -->
      <div v-if="filteredHistory.length > 0" class="relative border-t border-[#F3E7D2] px-4 sm:px-6 py-2">
        <p class="hidden md:block absolute left-6 top-1/2 -translate-y-1/2 font-sans text-[13px] text-[#3B1F0E]/55 tabular-nums">
          Showing {{ showingFrom }}–{{ showingTo }} of {{ filteredHistory.length }}
        </p>
        <CommonPagination
          :page="currentPage"
          :last-page="lastPage"
          @change="(p) => (currentPage = p)"
        />
      </div>
    </div>

    <!-- Notification Toast for Copy Action -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <div
        v-if="toastMessage"
        class="fixed bottom-6 right-6 z-50 bg-[#3D2B24] text-[#FFF0D1] px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-sans text-xs font-semibold"
      >
        <Icon name="heroicons:check-circle" class="size-4 text-[#2E9E5B]" />
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- Official Receipt Modal -->
    <Teleport to="body">
      <div
        v-if="activeReceipt"
        class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
        @click.self="activeReceipt = null"
      >
        <div
          class="bg-white rounded-2xl border border-[#EEDFC4] shadow-2xl max-w-sm w-full overflow-hidden animate-[rise_200ms_cubic-bezier(0.23,1,0.32,1)_both]"
          role="dialog"
          aria-modal="true"
        >
          <!-- Receipt Header -->
          <div class="bg-[#FFF0D1] p-5 border-b border-[#F3E7D2] flex items-center justify-between">
            <div>
              <span class="font-sans text-[11px] font-bold uppercase text-[#9E7060] tracking-wider block">Official Receipt</span>
              <h3 class="font-display text-lg font-bold text-[#3D2B24] mt-0.5 tracking-tight">
                {{ formatTxnId(activeReceipt.transaction_id) }}
              </h3>
            </div>
            <button
              type="button"
              class="size-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-[#9E7060] hover:text-[#3D2B24] transition-colors cursor-pointer"
              @click="activeReceipt = null"
            >
              <Icon name="heroicons:x-mark" class="size-4" />
            </button>
          </div>

          <!-- Receipt Details -->
          <div class="p-5 font-sans text-sm space-y-3.5">
            <div class="flex items-center justify-between py-1.5 border-b border-[#F3E7D2]">
              <span class="text-[#8B6656] text-xs font-medium">Status</span>
              <StatusBadge :status="activeReceipt.status" />
            </div>

            <div class="flex items-center justify-between py-1.5 border-b border-[#F3E7D2]">
              <span class="text-[#8B6656] text-xs font-medium">Date</span>
              <span class="font-semibold text-[#3D2B24] text-xs tabular-nums">{{ formatDate(activeReceipt.date) }}</span>
            </div>

            <div v-if="activeReceipt.owner_name" class="flex items-center justify-between py-1.5 border-b border-[#F3E7D2]">
              <span class="text-[#8B6656] text-xs font-medium">Owner</span>
              <span class="font-semibold text-[#3D2B24] text-xs">{{ activeReceipt.owner_name }}</span>
            </div>

            <div class="flex items-center justify-between py-1.5 border-b border-[#F3E7D2]">
              <span class="text-[#8B6656] text-xs font-medium">Plan Description</span>
              <span class="font-semibold text-[#3D2B24] text-xs text-right truncate max-w-[180px]">{{ activeReceipt.description }}</span>
            </div>

            <div class="flex items-center justify-between py-1.5 border-b border-[#F3E7D2]">
              <span class="text-[#8B6656] text-xs font-medium">Payment Gateway</span>
              <span class="font-medium text-[#3D2B24] text-xs">{{ formatGateway(activeReceipt.payment_gateway || activeReceipt.payment_method) }}</span>
            </div>

            <div class="pt-3 flex items-center justify-between">
              <span class="font-display font-bold text-[#3D2B24] text-sm">Total Paid</span>
              <span class="font-display font-extrabold text-2xl text-[#3D2B24] tabular-nums">
                {{ formatAmount(activeReceipt.amount) }}
              </span>
            </div>
          </div>

          <!-- Receipt Actions -->
          <div class="p-4 bg-[#FFFDF9] border-t border-[#F3E7D2] flex items-center gap-2">
            <button
              type="button"
              class="flex-1 h-10 px-4 bg-[#7D5A50] text-[#FFF0D1] font-display text-xs font-semibold rounded-xl hover:bg-[#684940] transition-colors flex items-center justify-center gap-1.5 active:scale-[0.97]"
              @click="printReceipt"
            >
              <Icon name="heroicons:printer" class="size-4" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              class="h-10 px-4 bg-white border border-[#EEDFC4] text-[#8B6656] font-display text-xs font-medium rounded-xl hover:bg-[#FDF3E7] transition-colors active:scale-[0.97]"
              @click="activeReceipt = null"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, #F6ECDD, #FBF4EA, #F6ECDD);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

@keyframes rise {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
  @keyframes rise { from { opacity: 0; } to { opacity: 1; } }
}
</style>
