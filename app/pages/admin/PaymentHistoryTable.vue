<!-- app/pages/admin/PaymentHistoryTable.vue -->
<template>
  <div>
    <!-- Top Feature Bar: Search, Filters & Export CSV -->
    <div v-if="showControls" class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
      <!-- Search Input -->
      <div class="relative w-full sm:w-80">
        <Icon
          name="heroicons:magnifying-glass"
          class="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9E7060]"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search TXN ID, activity, amount..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-[#EEDFC4] rounded-xl font-sans text-sm text-[#3B1F0E] placeholder-[#9E7060]/60 focus:outline-none focus:border-[#7D5A50] focus:ring-1 focus:ring-[#7D5A50] transition-all shadow-sm"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E7060] hover:text-[#3B1F0E]"
          @click="searchQuery = ''"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>

      <!-- Action Buttons & Status Filter -->
      <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        <select
          v-model="selectedStatus"
          class="px-4 py-2.5 bg-white border border-[#EEDFC4] rounded-xl font-sans text-sm font-medium text-[#3B1F0E] focus:outline-none focus:border-[#7D5A50] shadow-sm"
        >
          <option value="">All Payment Statuses</option>
          <option value="success">Success / Active</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed / Cancelled</option>
        </select>

        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-display text-sm font-semibold bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FDF3E7] hover:border-[#7D5A50] transition-all shadow-sm"
          title="Export records to CSV file"
          @click="exportToCSV"
        >
          <Icon name="heroicons:arrow-down-tray" class="w-4 h-4 text-[#7D5A50]" />
          <span>Export CSV</span>
        </button>
      </div>
    </div>

    <!-- Main Payment History Card Container (Matching Reference Screenshot) -->
    <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <!-- Table Header matching exact color #FFF0D1 -->
          <thead>
            <tr class="bg-[#FFF0D1] border-b border-[#F3E7D2]">
              <th class="font-sans text-[12px] font-semibold tracking-wider text-[#9E7060] uppercase px-6 py-4">
                Transaction ID
              </th>
              <th class="font-sans text-[12px] font-semibold tracking-wider text-[#9E7060] uppercase px-6 py-4">
                Date
              </th>
              <th class="font-sans text-[12px] font-semibold tracking-wider text-[#9E7060] uppercase px-6 py-4">
                Activity / Plan Type
              </th>
              <th class="font-sans text-[12px] font-semibold tracking-wider text-[#9E7060] uppercase px-6 py-4">
                Amount
              </th>
              <th class="font-sans text-[12px] font-semibold tracking-wider text-[#9E7060] uppercase px-6 py-4">
                Payment Status
              </th>
            </tr>
          </thead>

          <!-- Table Body -->
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="px-6 py-12 text-center font-sans text-sm text-[#8B6656]">
                <div class="flex items-center justify-center gap-2">
                  <Icon name="heroicons:arrow-path" class="w-5 h-5 animate-spin text-[#B4846C]" />
                  <span>Loading payment records...</span>
                </div>
              </td>
            </tr>

            <tr v-else-if="!filteredHistory.length">
              <td colspan="5" class="px-6 py-12 text-center font-sans text-sm text-[#8B6656]/70">
                No matching subscription payment history found.
              </td>
            </tr>

            <tr
              v-for="txn in paginatedRows"
              :key="txn.transaction_id"
              class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FFFDF9] transition-colors group cursor-pointer"
              @click="openReceiptModal(txn)"
            >
              <!-- Transaction ID with click to copy feature -->
              <td class="px-6 py-5 font-sans text-[14px] font-bold text-[#3B1F0E] whitespace-nowrap">
                <div class="inline-flex items-center gap-2">
                  <span>{{ formatTxnId(txn.transaction_id) }}</span>
                  <button
                    type="button"
                    class="opacity-0 group-hover:opacity-100 p-1 text-[#9E7060] hover:text-[#3B1F0E] transition-opacity"
                    title="Copy Transaction ID"
                    @click.stop="copyToClipboard(formatTxnId(txn.transaction_id))"
                  >
                    <Icon name="heroicons:document-duplicate" class="w-4 h-4" />
                  </button>
                </div>
              </td>

              <!-- Date -->
              <td class="px-6 py-5 font-sans text-[14px] text-[#3B1F0E]/80 whitespace-nowrap">
                {{ formatDate(txn.date) }}
              </td>

              <!-- Activity / Plan Type -->
              <td class="px-6 py-5 font-sans text-[14px] font-semibold text-[#3B1F0E]">
                {{ txn.description }}
              </td>

              <!-- Amount -->
              <td class="px-6 py-5 font-sans text-[14px] font-bold text-[#3B1F0E] whitespace-nowrap">
                {{ formatAmount(txn.amount) }}
              </td>

              <!-- Payment Status Pill -->
              <td class="px-6 py-5 whitespace-nowrap">
                <span
                  class="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-[13px] font-semibold tracking-wide"
                  :class="getStatusClasses(txn.status)"
                >
                  {{ formatStatusLabel(txn.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Centered Pagination Bar -->
      <div class="border-t border-[#F3E7D2] px-6 py-4 flex items-center justify-center gap-4 bg-white">
        <button
          type="button"
          class="p-1 text-[#8B6656] hover:text-[#3B1F0E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          :disabled="currentPage <= 1 || loading"
          @click="currentPage--"
        >
          <Icon name="heroicons:chevron-left" class="w-5 h-5 stroke-[2.5]" />
        </button>

        <span class="font-sans text-[13px] font-medium text-[#8B6656]">
          Page {{ currentPage }} of {{ lastPage }}
        </span>

        <button
          type="button"
          class="p-1 text-[#8B6656] hover:text-[#3B1F0E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          :disabled="currentPage >= lastPage || loading"
          @click="currentPage++"
        >
          <Icon name="heroicons:chevron-right" class="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
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
                <span class="font-medium text-[#3B1F0E]">PayMongo Online</span>
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
export interface PaymentTransaction {
  transaction_id: string
  date: string | null
  description: string
  amount: string | number
  status: string
  owner_name?: string
  owner_email?: string
}

const props = withDefaults(
  defineProps<{
    history: PaymentTransaction[]
    loading?: boolean
    perPage?: number
    showControls?: boolean
  }>(),
  {
    loading: false,
    perPage: 5,
    showControls: true,
  }
)

const searchQuery = ref('')
const selectedStatus = ref('')
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

    return matchesQuery && matchesStatus
  })
})

const lastPage = computed(() => Math.max(1, Math.ceil(filteredHistory.value.length / props.perPage)))

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * props.perPage
  return filteredHistory.value.slice(start, start + props.perPage)
})

watch([searchQuery, selectedStatus], () => {
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
  if (amt === undefined || amt === null) return '$89.00'
  const numeric = typeof amt === 'string' ? parseFloat(amt.replace(/[^0-9.]/g, '')) : amt
  if (isNaN(numeric)) return String(amt)
  return `$${numeric.toFixed(2)}`
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

function exportToCSV() {
  const headers = ['Transaction ID', 'Date', 'Activity/Plan', 'Amount', 'Status']
  const rows = filteredHistory.value.map((t) => [
    formatTxnId(t.transaction_id),
    formatDate(t.date),
    `"${t.description.replace(/"/g, '""')}"`,
    formatAmount(t.amount),
    formatStatusLabel(t.status),
  ])

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `payment_history_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>
