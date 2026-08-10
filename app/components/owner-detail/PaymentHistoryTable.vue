<!-- components/owner-detail/PaymentHistoryTable.vue -->
<template>
  <h2 class="font-display text-[20px] font-bold text-[#3D2B24] mb-[16px]">Recent Activity &amp; Payment History</h2>

  <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden">

    <div class="overflow-x-auto">

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
            <td class="px-6 py-5 font-sans text-[14px] font-bold text-[#3B1F0E]">{{ txn.transaction_id }}</td>
            <td class="px-6 py-5 font-sans text-[14px] text-[#3B1F0E]/70">{{ formatDate(txn.date) }}</td>
            <td class="px-6 py-5 font-sans text-[14px] font-semibold text-[#3B1F0E]">{{ txn.description }}</td>
            <td class="px-6 py-5 font-sans text-[14px] font-bold text-[#8B6656]">${{ txn.amount }}</td>
            <td class="px-6 py-5">
              <StatusBadge :status="txn.status" />
            </td>
          </tr>

        </tbody>

      </table>

    </div>

    <CommonPagination :page="page" :last-page="lastPage" @change="(p) => (page = p)" />
  </div>
</template>

<script setup lang="ts">
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

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

const page = ref(1)
const perPage = 5

const lastPage = computed(() => Math.max(1, Math.ceil(props.history.length / perPage)))

const paginated = computed(() => {
  const start = (page.value - 1) * perPage
  return props.history.slice(start, start + perPage)
})

watch(() => props.history, () => {
  page.value = 1
})
</script>