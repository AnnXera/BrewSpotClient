<script setup lang="ts">
import type { PaymentTransaction } from '~/components/common/PaymentHistoryTable.vue'

defineProps<{
  transactions: PaymentTransaction[]
  loading?: boolean
}>()

function formatAmount(amt?: string | number): string {
  if (amt === undefined || amt === null) return '$0.00'
  const numeric = typeof amt === 'string' ? parseFloat(amt.replace(/[^0-9.]/g, '')) : amt
  if (isNaN(numeric)) return String(amt)
  return `$${numeric.toFixed(2)}`
}
</script>

<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
    <!-- Card Header -->
    <div class="p-6 border-b border-[#F3E7D2] flex items-center justify-between bg-[#FFFDF9]">
      <div>
        <h3 class="font-display text-lg font-bold text-[#3B1F0E] flex items-center gap-2">
          <span>Recent Transactions</span>
        </h3>
        <p class="font-sans text-xs text-[#8B6656] mt-0.5">Latest subscription payments processed across registered cafes</p>
      </div>

      <NuxtLink
        to="/admin/payments"
        class="text-xs font-semibold text-[#7D5A50] hover:text-[#684940] flex items-center gap-1 transition-colors"
      >
        View All
        <Icon name="heroicons:chevron-right" class="w-4 h-4" />
      </NuxtLink>
    </div>

    <!-- Table content -->
    <div class="overflow-x-auto flex-1">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-[#FFF0D1]/60 border-b border-[#F3E7D2]">
            <th class="font-sans text-[11px] font-semibold text-[#9E7060] uppercase px-6 py-3">Transaction ID</th>
            <th class="font-sans text-[11px] font-semibold text-[#9E7060] uppercase px-6 py-3">Plan / Description</th>
            <th class="font-sans text-[11px] font-semibold text-[#9E7060] uppercase px-6 py-3">Amount</th>
            <th class="font-sans text-[11px] font-semibold text-[#9E7060] uppercase px-6 py-3 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="px-6 py-8 text-center text-xs text-[#8B6656]">
              <div class="flex items-center justify-center gap-2">
                <Icon name="heroicons:arrow-path" class="w-4 h-4 animate-spin text-[#7D5A50]" />
                <span>Loading recent transactions...</span>
              </div>
            </td>
          </tr>

          <tr v-else-if="!transactions.length">
            <td colspan="4" class="px-6 py-8 text-center text-xs text-[#8B6656]/70">
              No recent payment transactions recorded.
            </td>
          </tr>

          <tr
            v-for="item in transactions.slice(0, 5)"
            :key="item.transaction_id"
            class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FFFDF9] transition-colors"
          >
            <td class="px-6 py-4 font-sans text-xs font-bold text-[#3B1F0E] whitespace-nowrap">
              {{ item.transaction_id }}
            </td>

            <td class="px-6 py-4 font-sans text-xs text-[#3B1F0E]">
              <p class="font-semibold text-[#7D5A50]">{{ item.description }}</p>
              <p v-if="item.owner_name" class="text-[11px] text-[#8B6656]">{{ item.owner_name }}</p>
            </td>

            <td class="px-6 py-4 font-sans text-xs font-bold text-[#28A745] whitespace-nowrap">
              {{ formatAmount(item.amount) }}
            </td>

            <td class="px-6 py-4 text-right whitespace-nowrap">
              <span 
                class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                :class="item.status.toLowerCase() === 'active' || item.status.toLowerCase() === 'success' ? 'bg-[#D4EDDA] text-[#28A745]' : 
                        item.status.toLowerCase() === 'failed' || item.status.toLowerCase() === 'cancelled' ? 'bg-[#F8D7DA] text-[#DC3545]' : 
                        'bg-[#FFF3CD] text-[#856404]'"
              >
                {{ item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase() }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
