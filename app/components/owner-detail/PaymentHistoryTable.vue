<!-- components/owner-detail/PaymentHistoryTable.vue -->
<template>
  <h2 class="font-display text-[18px] min-[360px]:text-[20px] font-bold text-[#3D2B24] mb-3 min-[360px]:mb-4">Recent Activity &amp; Payment History</h2>

  <!-- Unified Card Container for both Mobile and Desktop -->
  <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden shadow-sm">
    <!-- Mobile View (< md) -->
    <div class="block md:hidden">
      <div v-if="!paginated.length" class="p-6 text-center font-sans text-sm text-[#3B1F0E]/50">
        No transactions found.
      </div>

      <div v-else class="p-4 space-y-3">
        <div
          v-for="txn in paginated"
          :key="txn.transaction_id"
          class="bg-[#FFFDF9] border border-[#EDD8CC] rounded-xl p-4 min-[360px]:p-4 shadow-none"
        >
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="font-sans text-xs min-[360px]:text-[13px] font-bold text-[#3D2B24]">{{ txn.transaction_id }}</span>
            <StatusBadge :status="txn.status" />
          </div>

          <p class="font-display font-bold text-sm min-[360px]:text-[15px] leading-snug text-[#3D2B24] mb-3.5">
            {{ txn.description }}
          </p>

          <div class="flex items-end justify-between pt-2.5 border-t border-[#F3E7D2]">
            <div>
              <p class="font-display font-bold text-[10px] min-[360px]:text-[11px] uppercase tracking-[0.77%] text-[#9E7060] mb-0.5">DATE</p>
              <p class="font-display text-xs min-[360px]:text-sm font-semibold text-[#3D2B24]">{{ formatDate(txn.date) }}</p>
            </div>

            <div class="text-right">
              <p class="font-display font-bold text-[10px] min-[360px]:text-[11px] uppercase tracking-[0.77%] text-[#9E7060] mb-0.5">AMOUNT</p>
              <p class="font-display text-base min-[360px]:text-[18px] font-bold text-[#7D5A50] leading-none">
                ${{ txn.amount }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Table View (>= md) -->
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-left">
        <thead>
          <tr class="bg-[#FBF0D9] border-b border-[#F3E7D2]">
            <th class="font-sans text-[12px] font-semibold tracking-wide text-[#9E7060] uppercase px-6 py-4">Transaction ID</th>
            <th class="font-sans text-[12px] font-semibold tracking-wide text-[#9E7060] uppercase px-6 py-4">Date</th>
            <th class="font-sans text-[12px] font-semibold tracking-wide text-[#9E7060] uppercase px-6 py-4">Activity / Plan Type</th>
            <th class="font-sans text-[12px] font-semibold tracking-wide text-[#9E7060] uppercase px-6 py-4">Amount</th>
            <th class="font-sans text-[12px] font-semibold tracking-wide text-[#9E7060] uppercase px-6 py-4">Payment Status</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="!paginated.length">
            <td colspan="5" class="px-6 py-10 text-center font-sans text-sm text-[#3B1F0E]/50">
              No transactions found.
            </td>
          </tr>

          <tr
            v-for="txn in paginated"
            :key="txn.transaction_id"
            class="border-b border-[#F3E7D2] last:border-b-0"
          >
            <td class="px-6 py-5 font-sans text-[14px] font-bold text-[#3D2B24]">{{ txn.transaction_id }}</td>
            <td class="px-6 py-5 font-sans text-[14px] text-[#3B1F0E]/70">{{ formatDate(txn.date) }}</td>
            <td class="px-6 py-5 font-sans text-[14px] font-semibold text-[#3D2B24]">{{ txn.description }}</td>
            <td class="px-6 py-5 font-sans text-[14px] font-bold text-[#7D5A50]">${{ txn.amount }}</td>
            <td class="px-6 py-5">
              <StatusBadge :status="txn.status" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Unified Bottom Pagination -->
    <CommonPagination :page="page" :last-page="lastPage" @change="(p) => (page = p)" />
  </div>
</template>

<script setup lang="ts">
import PaymentHistoryTable, { type PaymentTransaction } from '~/pages/admin/PaymentHistoryTable.vue'

interface Transaction {
  transaction_id: string
  date: string | null
  description: string
  amount: string | number
  status: string
}

const props = defineProps<{
  history: Transaction[]
}>()

const mappedHistory = computed<PaymentTransaction[]>(() => {
  return (props.history || []).map((t) => ({
    transaction_id: t.transaction_id,
    date: t.date,
    description: t.description,
    amount: t.amount,
    status: t.status,
  }))
})
</script>