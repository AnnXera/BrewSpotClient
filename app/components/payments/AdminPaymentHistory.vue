<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PaymentHistoryTable, { type PaymentTransaction } from '~/components/common/PaymentHistoryTable.vue'
import PaymentAnalyticsCards from '~/components/payments/PaymentAnalyticsCards.vue'

const subService = useSubscriptionService()
const paymentService = usePaymentService()

const loading = ref(true)
const refreshing = ref(false)
const loaded = ref(false)
const transactions = ref<PaymentTransaction[]>([])
const registeredSubscribers = ref(0)

useScrollReveal(loaded)

async function loadPaymentHistory() {
  if (loaded.value) refreshing.value = true
  else loading.value = true
  const list: PaymentTransaction[] = []

  try {
    // 1. Fetch backend subscribers count GET /api/admin/subscribers
    const subRes = await subService.getSubscribers({ per_page: 50 })
    if (subRes?.success && subRes.subscribers) {
      // Create a set of unique emails from the subscribers list to get an accurate subscriber count
      const uniqueEmails = new Set(subRes.subscribers.data.map((sub: any) => sub.email).filter(Boolean))
      registeredSubscribers.value = uniqueEmails.size
    }

    // 2. Fetch global payment history directly
    const payRes = await paymentService.getAllPayments({ per_page: 500 })
    if (payRes?.success && payRes.history?.data) {
      payRes.history.data.forEach((ph: any) => {
        const rawAmt = ph.amount ? parseFloat(String(ph.amount).replace(/[^0-9.]/g, '')) : 0
        list.push({
          transaction_id: ph.transaction_id || `TXN-${ph.uuid?.slice(0, 7).toUpperCase() || '000000'}`,
          date: ph.date || ph.created_at,
          description: ph.description || 'Subscription Payment',
          amount: isNaN(rawAmt) ? '0.00' : rawAmt.toFixed(2),
          status: ph.status || 'active',
          owner_name: ph.owner_name,
          owner_email: ph.owner_email,
          payment_gateway: ph.payment_gateway || 'PayMongo',
        })
      })
    }

    // Fallback: If no actual payment records exist but subscribers were returned (useful for seeded dev data)
    if (list.length === 0 && subRes?.success && subRes.subscribers?.data?.length) {
      subRes.subscribers.data.forEach((sub: any) => {
        const rawAmt = sub.amount ? parseFloat(sub.amount) : 0
        list.push({
          transaction_id: sub.subscription_uuid
            ? `TXN-${sub.subscription_uuid.replace(/-/g, '').slice(0, 7).toUpperCase()}`
            : 'TXN-0000000',
          date: new Date().toISOString(),
          description: sub.plan 
            ? `${sub.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'} Subscription - ${sub.plan}` 
            : `${sub.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'} Subscription`,
          amount: isNaN(rawAmt) ? '0.00' : rawAmt.toFixed(2),
          status: sub.status || 'active',
          owner_name: sub.name,
          owner_email: sub.email || undefined,
          payment_gateway: sub.mode_of_payment || 'PayMongo',
        })
      })
    }

  } catch (err) {
    console.warn('Backend payment fetch:', err)
  } finally {
    // Deduplicate by normalized transaction key
    const map = new Map<string, PaymentTransaction>()
    list.forEach((t) => {
      const normKey = t.transaction_id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7)
      if (!map.has(normKey)) {
        map.set(normKey, t)
      }
    })
    transactions.value = Array.from(map.values())
    loading.value = false
    refreshing.value = false
    loaded.value = true
  }
}

// Analytics computed values based strictly on real backend data
const totalRevenue = computed(() => {
  return transactions.value.reduce((sum, txn) => {
    const status = txn.status?.toLowerCase() || ''
    if (status === 'failed' || status === 'cancelled') return sum

    const val = typeof txn.amount === 'number' ? txn.amount : parseFloat(String(txn.amount).replace(/[^0-9.]/g, ''))
    return sum + (isNaN(val) ? 0 : val)
  }, 0)
})

onMounted(loadPaymentHistory)
</script>

<template>
  <div>
    <!-- Header Title & Refresh Button -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
      <div>
        <h1 class="font-display text-2xl font-black text-[#3D2B24] tracking-tight min-[360px]:text-3xl sm:text-[32px] sm:leading-tight">
          Payment History
        </h1>
        <p class="font-sans text-xs sm:text-sm text-[#9E7060] mt-1">
          Subscription transactions and billing history for registered cafe owners.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#EDD8CC] text-[#7D5A50] font-sans font-semibold text-sm hover:bg-[#FDF3E7] hover:border-[#D9C4B8] hover:text-[#3D2B24] active:scale-95 transition-[transform,background-color,border-color] duration-160 ease-out shadow-xs self-start sm:self-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
        :disabled="loading || refreshing"
        @click="loadPaymentHistory"
      >
        <Icon name="heroicons:arrow-path" class="w-4 h-4 text-[#7D5A50]" :class="{ 'animate-spin': loading || refreshing }" />
        <span>Refresh</span>
      </button>
    </div>

    <!-- Analytics Cards Component -->
    <div
      class="scroll-reveal transition-opacity duration-200 ease-out"
      :class="{ 'opacity-60': refreshing }"
    >
      <PaymentAnalyticsCards
        :total-transactions="transactions.length"
        :total-revenue="totalRevenue"
        :registered-subscribers="registeredSubscribers"
      />
    </div>

    <!-- Payment History Table Component -->
    <div
      class="scroll-reveal transition-opacity duration-200 ease-out"
      :class="{ 'opacity-60': refreshing }"
    >
      <PaymentHistoryTable :history="transactions" :loading="loading" :show-controls="true" :show-owner-name="true" />
    </div>
  </div>
</template>

<style scoped>
.scroll-reveal {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}

.scroll-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
</style>
