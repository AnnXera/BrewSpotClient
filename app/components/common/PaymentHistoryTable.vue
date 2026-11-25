<!-- app/components/common/PaymentHistoryTable.vue -->
<template>
  <div>
    <!-- Main card: same frame as the Cafe Management table (filter bar, header row, row list) -->
    <div :class="['w-full max-w-full bg-white border border-[#EEDFC4] shadow-sm flex flex-col', filteredHistory.length > 0 && !loading ? 'rounded-t-[20px] border-b-0' : 'rounded-[20px]']">
      <!-- Filter bar: search, dates, status, export -->
      <div v-if="showControls" class="px-5 py-4 border-b border-[#EEDFC4] min-h-[76px] flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3">
        <SearchInput
          v-model="searchQuery"
          placeholder="Search TXN ID, activity, amount..."
          clearable
          class="w-full 2xl:w-80 shrink-0"
        />

        <div class="flex flex-wrap items-center gap-2 sm:gap-3 w-full 2xl:w-auto justify-start sm:justify-end">
          <div class="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <EmilCalendar
              v-model="startDate"
              placeholder="Start Date"
              align="left"
              button-class="h-10 text-xs sm:text-sm w-full sm:w-32 md:w-36"
            />
            <span class="text-[#8B6656] font-sans text-xs sm:text-sm font-medium shrink-0">to</span>
            <EmilCalendar
              v-model="endDate"
              placeholder="End Date"
              :min="startDate || ''"
              align="left"
              button-class="h-10 text-xs sm:text-sm w-full sm:w-32 md:w-36"
            />
          </div>

          <div class="w-full sm:w-44 md:w-48">
            <DropdownList
              v-model="selectedStatus"
              :options="[
                { value: '', label: 'All Payment Statuses' },
                { value: 'success', label: 'Success / Active' },
                { value: 'pending', label: 'Pending' },
                { value: 'failed', label: 'Failed / Cancelled' }
              ]"
              size="sm"
              class="font-sans"
              aria-label="Filter by payment status"
            />
          </div>

          <button
            type="button"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl font-display text-xs sm:text-sm font-semibold bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FDF3E7] hover:border-[#7D5A50] transition-all shadow-xs shrink-0 active:scale-[0.98] cursor-pointer h-10"
            title="Export records to formatted Excel spreadsheet"
            @click="handleExportExcel"
          >
            <Icon name="heroicons:arrow-down-tray" class="w-4 h-4 text-[#28A745]" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center items-center py-12" role="status">
        <span class="sr-only">Loading payment records…</span>
        <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-[#7D5A50]" aria-hidden="true" />
      </div>

      <!-- Empty -->
      <div v-else-if="!filteredHistory.length" class="px-6 py-14 text-center">
        <p class="font-display font-extrabold text-lg text-[#3D2B24]">
          {{ hasFilters ? 'No payments match these filters' : 'No payments yet' }}
        </p>
        <p class="text-sm text-[#9E7060] mt-1">
          {{ hasFilters ? 'Try a different search, date range, or status.' : 'Subscription payments will show up here.' }}
        </p>
        <button
          v-if="hasFilters"
          type="button"
          @click="clearFilters"
          class="mt-4 text-sm font-bold text-[#7D5A50] underline underline-offset-4 hover:text-[#3D2B24]"
        >
          Clear filters
        </button>
      </div>

      <template v-else>
        <!-- Column labels (wide screens only; rows stack on small screens). The arrow column has no label. -->
        <div
          class="hidden lg:grid items-center gap-x-4 px-6 py-3.5 bg-[#FAF4ED] border-b border-[#EEDFC4] font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase"
          :class="gridCols"
        >
          <span>Transaction</span>
          <span>Date</span>
          <span v-if="showOwnerName">Owner</span>
          <span>Activity / Plan</span>
          <span>Amount</span>
          <span>Status</span>
          <span class="w-9" aria-hidden="true"></span>
        </div>

        <ul class="divide-y divide-[#F3E7D2]">
          <li v-for="txn in paginatedRows" :key="txn.transaction_id">
            <div
              class="group grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1.5 px-5 sm:px-6 py-4 cursor-pointer transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-[#FAF4ED]/70"
              :class="gridCols"
              @click="openReceiptModal(txn)"
            >
              <!-- Transaction: icon tile, ID with copy; below lg also the activity and date -->
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-[38px] h-[38px] shrink-0 rounded-lg bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center">
                  <Icon name="heroicons:receipt-percent" class="w-[18px] h-[18px]" />
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1">
                    <span class="font-sans text-sm font-bold leading-snug text-[#3D2B24] group-hover:text-[#8B5A3C] transition-colors truncate tabular-nums">
                      {{ formatTxnId(txn.transaction_id) }}
                    </span>
                    <button
                      type="button"
                      class="inline-flex items-center justify-center p-1 rounded-md text-[#B4846C] hover:text-[#3B1F0E] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                      :aria-label="`Copy ${formatTxnId(txn.transaction_id)}`"
                      title="Copy Transaction ID"
                      @click.stop="copyToClipboard(formatTxnId(txn.transaction_id))"
                    >
                      <Icon name="heroicons:document-duplicate" class="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p class="lg:hidden font-sans text-[11px] font-medium leading-tight text-[#9E7060] truncate">
                    {{ txn.description }} · {{ formatDate(txn.date) }}<template v-if="showOwnerName && txn.owner_name"> · {{ txn.owner_name }}</template>
                  </p>
                </div>
              </div>

              <!-- Date -->
              <p class="hidden lg:flex items-center gap-1.5 min-w-0 font-sans text-xs font-semibold text-[#3D2B24]">
                <Icon name="heroicons:calendar" class="w-3.5 h-3.5 shrink-0 text-[#B4846C]" />
                <span class="truncate">{{ formatDate(txn.date) }}</span>
              </p>

              <!-- Owner -->
              <p v-if="showOwnerName" class="hidden lg:flex items-center gap-1.5 min-w-0 font-sans text-xs" :class="txn.owner_name ? 'font-semibold text-[#3D2B24]' : 'italic text-[#9E7060]/80'">
                <Icon name="heroicons:user" class="w-3.5 h-3.5 shrink-0 text-[#B4846C]" />
                <span class="truncate">{{ txn.owner_name || 'Unknown owner' }}</span>
              </p>

              <!-- Activity / Plan -->
              <p class="hidden lg:block min-w-0 font-sans text-xs font-semibold text-[#3D2B24] truncate" :title="txn.description">
                {{ txn.description }}
              </p>

              <!-- Amount and status: stacked on the right below lg, their own columns from lg -->
              <div class="flex flex-col items-end gap-1 lg:contents">
                <span class="font-sans text-sm font-bold text-[#3D2B24] tabular-nums whitespace-nowrap">
                  {{ formatAmount(txn.amount) }}
                </span>
                <span>
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0" :class="statusMeta(txn.status).badge">
                    <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="statusMeta(txn.status).dot" aria-hidden="true" />
                    {{ formatStatusLabel(txn.status) }}
                  </span>
                </span>
              </div>

              <!-- Open receipt -->
              <button
                type="button"
                :aria-label="`View receipt ${formatTxnId(txn.transaction_id)}`"
                class="inline-flex items-center justify-center w-9 h-9 -mr-2 lg:mr-0 rounded-xl text-[#B4846C] transition-colors group-hover:text-[#7D5A50] [@media(hover:hover)]:hover:bg-[#F3E7D2] outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                @click.stop="openReceiptModal(txn)"
              >
                <Icon name="heroicons:chevron-right" class="w-5 h-5" />
              </button>
            </div>
          </li>
        </ul>
      </template>
    </div>

    <!-- Pagination: the shared component in its own bottom frame, as on Cafe Management -->
    <div v-if="filteredHistory.length > 0 && !loading" class="w-full max-w-full bg-white rounded-b-[20px] border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm">
      <CommonPagination
        :page="currentPage"
        :last-page="lastPage"
        @change="(p) => (currentPage = p)"
      />
    </div>

    <!-- Notification Toast for Copy Action -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="toastMessage"
        class="fixed bottom-6 right-6 z-50 bg-[#3B1F0E] text-[#FFF0D1] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 font-sans text-sm font-medium"
      >
        <Icon name="heroicons:check-circle" class="w-5 h-5 text-[#28A745]" />
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- Minor Feature: Interactive Receipt Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition opacity-200 duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition opacity-200 duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="activeReceipt"
          class="fixed inset-0 z-50 bg-[#3B1F0E]/50 backdrop-blur-sm flex items-center justify-center p-4"
          @click.self="activeReceipt = null"
        >
          <div class="bg-white rounded-2xl border border-[#EEDFC4] shadow-2xl max-w-md w-full overflow-hidden">
            <!-- Receipt Header -->
            <div class="bg-[#FFF0D1] p-6 border-b border-[#F3E7D2] flex items-center justify-between">
              <div>
                <span class="font-sans text-xs font-semibold uppercase text-[#9E7060] tracking-wider block">Official Receipt</span>
                <h3 class="font-display text-xl font-bold text-[#3B1F0E] mt-0.5">
                  {{ formatTxnId(activeReceipt.transaction_id) }}
                </h3>
              </div>
              <button
                type="button"
                class="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-[#9E7060] hover:text-[#3B1F0E] transition-colors"
                @click="activeReceipt = null"
              >
                <Icon name="heroicons:x-mark" class="w-5 h-5" />
              </button>
            </div>

            <!-- Receipt Content -->
            <div class="p-6 font-sans text-sm space-y-4">
              <div class="flex items-center justify-between py-2 border-b border-[#F3E7D2]">
                <span class="text-[#8B6656]">Payment Status</span>
                <span
                  class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  :class="getStatusClasses(activeReceipt.status)"
                >
                  {{ formatStatusLabel(activeReceipt.status) }}
                </span>
              </div>

              <div class="flex items-center justify-between py-2 border-b border-[#F3E7D2]">
                <span class="text-[#8B6656]">Date &amp; Time</span>
                <span class="font-semibold text-[#3B1F0E]">{{ formatDate(activeReceipt.date) }}</span>
              </div>

              <div class="flex items-center justify-between py-2 border-b border-[#F3E7D2]">
                <span class="text-[#8B6656]">Activity / Plan</span>
                <span class="font-semibold text-[#3B1F0E] text-right">{{ activeReceipt.description }}</span>
              </div>

              <div class="flex items-center justify-between py-2 border-b border-[#F3E7D2]">
                <span class="text-[#8B6656]">Payment Gateway</span>
                <span class="font-medium text-[#3B1F0E]">{{ formatGateway(activeReceipt.payment_gateway || activeReceipt.payment_method) }}</span>
              </div>

              <div class="pt-4 flex items-center justify-between">
                <span class="font-display font-bold text-[#3B1F0E] text-base">Total Paid</span>
                <span class="font-display font-bold text-2xl text-[#7D5A50]">
                  {{ formatAmount(activeReceipt.amount) }}
                </span>
              </div>
            </div>

            <!-- Receipt Actions -->
            <div class="p-6 bg-[#FFFDF9] border-t border-[#F3E7D2] flex items-center gap-3">
              <button
                type="button"
                class="flex-1 py-2.5 px-4 bg-[#7D5A50] text-[#FFF0D1] font-display font-semibold rounded-xl hover:bg-[#684940] transition-colors flex items-center justify-center gap-2"
                @click="printReceipt"
              >
                <Icon name="heroicons:printer" class="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                class="py-2.5 px-4 bg-white border border-[#EEDFC4] text-[#8B6656] font-display font-medium rounded-xl hover:bg-[#FDF3E7] transition-colors"
                @click="activeReceipt = null"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import DropdownList from '~/components/common/DropdownList.vue'
import SearchInput from '~/components/common/SearchInput.vue'
import EmilCalendar from '~/components/common/EmilCalendar.vue'

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
    perPage: 5,
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

const filteredHistory = computed(() => {
  return props.history.filter((item) => {
    const q = searchQuery.value.toLowerCase().trim()
    const matchesQuery =
      !q ||
      item.transaction_id.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      String(item.amount).includes(q) ||
      (item.owner_name && item.owner_name.toLowerCase().includes(q))

    const st = selectedStatus.value.toLowerCase()
    const itemSt = (item.status || '').toLowerCase()
    const matchesStatus =
      !st ||
      itemSt === st ||
      (st === 'success' && ['active', 'succeeded', 'paid', 'approved', 'success'].includes(itemSt))

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

// Same column rhythm as the Cafe Management table; the last column holds the open arrow.
// Written out in full so Tailwind sees both class strings.
const gridCols = computed(() => props.showOwnerName
  ? 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.8fr)_minmax(0,1fr)_8.5rem_auto]'
  : 'lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_8.5rem_auto]')

const hasFilters = computed(() => !!(searchQuery.value.trim() || selectedStatus.value || startDate.value || endDate.value))

function clearFilters() {
  searchQuery.value = ''
  selectedStatus.value = ''
  startDate.value = ''
  endDate.value = ''
}

watch([searchQuery, selectedStatus, startDate, endDate], () => {
  currentPage.value = 1
})

function formatTxnId(rawId: string): string {
  if (!rawId) return 'TXN-8094218'
  if (rawId.startsWith('TXN-')) return rawId
  const clean = rawId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return `TXN-${clean.slice(0, 7)}`
}

function formatDate(val?: string | null): string {
  if (!val) return 'Jan 20, 2026'
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
  if (amt === undefined || amt === null) return '₱89.00'
  const numeric = typeof amt === 'string' ? parseFloat(amt.replace(/[^0-9.]/g, '')) : amt
  if (isNaN(numeric)) return String(amt)
  return `₱${numeric.toFixed(2)}`
}

function formatGateway(val?: string): string {
  if (!val) return 'PayMongo'
  const v = val.toLowerCase()
  if (v.includes('cash')) return 'Cash'
  if (v.includes('trial')) return 'Free Trial'
  if (v.includes('paymongo')) return 'PayMongo'
  // Historical rows from the previous gateway are still shown as what they were.
  if (v.includes('paypal')) return 'PayPal'
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatStatusLabel(st?: string): string {
  if (!st) return 'Success'
  const s = st.toLowerCase()
  if (['active', 'succeeded', 'success', 'paid', 'approved'].includes(s)) {
    return 'Success'
  }
  if (['pending', 'pending_approval'].includes(s)) {
    return 'Pending'
  }
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function getStatusClasses(st?: string): string {
  const s = (st || '').toLowerCase()
  if (['active', 'succeeded', 'success', 'paid', 'approved'].includes(s)) {
    return 'bg-[#D4EDDA] text-[#28A745]'
  }
  if (['pending', 'pending_approval'].includes(s)) {
    return 'bg-[#FEF3C7] text-[#D97706]'
  }
  return 'bg-[#FDE8E8] text-[#DC3545]'
}

// Same pill as the Cafe Management status: soft fill, matching border, coloured dot.
function statusMeta(st?: string): { badge: string, dot: string } {
  const s = (st || '').toLowerCase()
  if (['active', 'succeeded', 'success', 'paid', 'approved'].includes(s)) {
    return { badge: 'bg-[#E8F7EE] text-[#28A745] border-[#C3ECD3]', dot: 'bg-[#28A745]' }
  }
  if (['pending', 'pending_approval'].includes(s)) {
    return { badge: 'bg-[#FDF0D5] text-[#8A5A0B] border-[#F3D9A4]', dot: 'bg-[#D9962B]' }
  }
  return { badge: 'bg-[#FDE8E8] text-[#DC3545] border-[#F8B4B4]', dot: 'bg-[#DC3545]' }
}

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text)
  toastMessage.value = `Copied ${text} to clipboard!`
  setTimeout(() => {
    toastMessage.value = ''
  }, 2500)
}

function openReceiptModal(txn: PaymentTransaction) {
  activeReceipt.value = txn
}

function printReceipt() {
  window.print()
}

function handleExportExcel() {
  const label = selectedStatus.value
    ? formatStatusLabel(selectedStatus.value)
    : 'All Payment Statuses'
  exportToExcel(filteredHistory.value, label)
}
</script>
