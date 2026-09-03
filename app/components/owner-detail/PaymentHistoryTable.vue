<!-- components/owner-detail/PaymentHistoryTable.vue -->
<template>
  <div class="mt-8">
    <h2 class="font-display text-[20px] font-bold text-[#3D2B24] mb-[16px]">Recent Activity &amp; Payment History</h2>
    <PaymentHistoryTable :history="mappedHistory" :show-controls="false" />
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