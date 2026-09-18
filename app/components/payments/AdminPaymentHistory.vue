<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PaymentHistoryTable, { type PaymentTransaction } from '~/components/common/PaymentHistoryTable.vue'
import PaymentAnalyticsCards from '~/components/payments/PaymentAnalyticsCards.vue'

const subService = useSubscriptionService()
const ownerService = useOwnerManagementService()

const loading = ref(true)
const transactions = ref<PaymentTransaction[]>([])
const registeredSubscribers = ref(0)

async function loadPaymentHistory() {
  loading.value = true
  const list: PaymentTransaction[] = []

  try {
    // 1. Fetch backend subscribers count GET /api/admin/subscribers (fallback data)
    const subRes = await subService.getSubscribers({ per_page: 50 })
    if (subRes?.success && subRes.subscribers) {
      // Create a set of unique emails from the subscribers list to get an accurate subscriber count
      const uniqueEmails = new Set(subRes.subscribers.data.map((sub: any) => sub.email).filter(Boolean))
      registeredSubscribers.value = uniqueEmails.size
    }

    // 2. Fetch owner subscription payment histories (real database records matching owner details)
    const ownersRes = await ownerService.list({ per_page: 50 })
    if (ownersRes?.success && ownersRes.owners?.data?.length) {
      const activeSubscribers = ownersRes.owners.data.filter((o) => o.status === 'active' || o.subscription)
      
      // Override with actual unique active owners
      registeredSubscribers.value = activeSubscribers.length

      for (const owner of activeSubscribers) {
        try {
          const detailRes = await ownerService.show(owner.uuid)
          if (detailRes?.success && detailRes.payment_history?.length) {
            detailRes.payment_history.forEach((ph: any) => {
              const rawAmt = ph.amount ? parseFloat(String(ph.amount).replace(/[^0-9.]/g, '')) : 0
              list.push({
                transaction_id: ph.transaction_id || `TXN-${owner.uuid.slice(0, 7).toUpperCase()}`,
                date: ph.date || owner.date_joined,
                description: ph.description || `Subscription - ${owner.subscription || 'Plan'}`,
                amount: isNaN(rawAmt) ? '0.00' : rawAmt.toFixed(2),
                status: ph.status || 'active',
                owner_name: owner.name,
                owner_email: owner.email,
                payment_gateway: ph.payment_gateway || ph.payment_method || 'PayPal',
              })
            })
          }
        } catch {
          // ignore error if single owner detail fetch fails
        }
      }
    }

    // Fallback: If no owner detail payment history exists but subscribers were returned
    if (list.length === 0 && subRes?.success && subRes.subscribers?.data?.length) {
      subRes.subscribers.data.forEach((sub) => {
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
          payment_gateway: sub.mode_of_payment || 'PayPal',
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
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
      <div>
        <h1 class="font-display text-2xl md:text-3xl font-bold text-[#3D2B24]">
          Payment History
        </h1>
        <p class="font-sans text-sm text-[#8B6656] mt-1">
          Subscription transactions and billing history for registered cafe owners.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-display text-sm font-semibold bg-[#7D5A50] text-[#FFF0D1] hover:bg-[#684940] transition-colors self-start sm:self-auto shadow-sm"
        @click="loadPaymentHistory"
      >
        <Icon name="heroicons:arrow-path" class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        <span>Refresh Data</span>
      </button>
    </div>

    <!-- Analytics Cards Component -->
    <PaymentAnalyticsCards
      :total-transactions="transactions.length"
      :total-revenue="totalRevenue"
      :registered-subscribers="registeredSubscribers"
    />

    <!-- Payment History Table Component -->
    <PaymentHistoryTable :history="transactions" :loading="loading" :show-controls="true" />
  </div>
</template>
