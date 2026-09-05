<!-- pages/owner/subscription.vue -->
<script setup lang="ts">
import PaymentHistoryTable, { type PaymentTransaction } from '~/components/common/PaymentHistoryTable.vue'

definePageMeta({
  role: 'Cafe Owner',
})

const links = [
  { label: 'Dashboard', to: '/owner/dashboard', icon: 'squares-2x2' },
  { label: 'Branches', to: '/owner/branches', icon: 'building-storefront' },
  { label: 'Menu', to: '/owner/menu', icon: 'clipboard' },
  { label: 'Subscription', to: '/owner/subscription', icon: 'credit-card' },
]

const subService = useSubscriptionService()

const loading = ref(true)
const currentPlan = ref<any>(null)
const history = ref<PaymentTransaction[]>([])

async function loadOwnerSubscription() {
  loading.value = true
  try {
    // 1. Fetch current active subscription plan from backend GET /api/owner/subscription/current
    const planRes = await subService.getCurrentPlan()
    if (planRes?.success && planRes.subscription) {
      currentPlan.value = planRes.subscription
    } else {
      currentPlan.value = null
    }

    // 2. Fetch owner payment history from backend GET /api/owner/subscription/history
    const historyRes = await subService.getPlanHistory({ per_page: 20 })
    if (historyRes?.success && historyRes.history?.data?.length) {
      history.value = historyRes.history.data.map((item) => {
        const rawPrice = item.plan?.price ?? 0
        const priceNum = typeof rawPrice === 'string' ? parseFloat(rawPrice) : rawPrice
        const formattedPrice = isNaN(priceNum) ? '0.00' : (priceNum > 1000 ? priceNum / 100 : priceNum).toFixed(2)

        return {
          transaction_id: item.uuid ? `TXN-${item.uuid.replace(/-/g, '').slice(0, 7).toUpperCase()}` : 'TXN-0000000',
          date: item.start_date || item.created_at || new Date().toISOString(),
          description: item.plan?.sub_name ? `Monthly Subscription - ${item.plan.sub_name}` : 'Monthly Subscription',
          amount: formattedPrice,
          status: item.status || 'active',
        }
      })
    } else {
      history.value = []
    }
  } catch (err) {
    console.warn('Owner subscription fetch:', err)
    history.value = []
    currentPlan.value = null
  } finally {
    loading.value = false
  }
}

function formatDate(val?: string | null): string {
  if (!val) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(val))
  } catch {
    return val
  }
}

onMounted(loadOwnerSubscription)
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7]">
    <!-- Desktop & Mobile Sidebar Navigation -->
    <NavBar :links="links" />

    <main class="flex-1 p-6 md:p-12">
      <!-- Title -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="font-display text-2xl md:text-3xl font-bold text-[#3D2B24]">
            My Subscription &amp; Billing
          </h1>
          <p class="font-sans text-sm text-[#8B6656] mt-1">
            Manage your cafe subscription plan and view payment transaction history.
          </p>
        </div>
      </div>

      <!-- Current Subscription Active Plan Card (Strictly Backend Based) -->
      <div v-if="currentPlan" class="bg-white border border-[#EEDFC4] rounded-2xl p-6 md:p-8 mb-8 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3E7D2] pb-6 mb-6">
          <div>
            <div class="flex items-center gap-3">
              <span class="font-display text-2xl font-bold text-[#3B1F0E]">
                {{ currentPlan?.plan?.sub_name || 'Active Plan' }}
              </span>
              <span
                class="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#D4EDDA] text-[#28A745]"
              >
                {{ currentPlan?.status || 'Active' }}
              </span>
            </div>
            <p class="font-sans text-sm text-[#8B6656] mt-1">
              Supports up to {{ currentPlan?.plan?.max_branches || 1 }} cafe branch location(s).
            </p>
          </div>

          <div class="text-left sm:text-right">
            <span class="font-display text-3xl font-bold text-[#7D5A50]">
              ${{ typeof currentPlan?.plan?.price === 'number' ? currentPlan.plan.price.toFixed(2) : '0.00' }}
            </span>
            <span class="font-sans text-xs text-[#8B6656] block">/ month</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-sm">
          <div class="bg-[#FFFDF9] p-4 rounded-xl border border-[#F3E7D2]">
            <span class="text-[#8B6656] block text-xs font-medium uppercase tracking-wider">Start Date</span>
            <span class="font-semibold text-[#3B1F0E] mt-0.5 block">
              {{ formatDate(currentPlan?.start_date) }}
            </span>
          </div>
          <div class="bg-[#FFFDF9] p-4 rounded-xl border border-[#F3E7D2]">
            <span class="text-[#8B6656] block text-xs font-medium uppercase tracking-wider">Next Billing Date</span>
            <span class="font-semibold text-[#3B1F0E] mt-0.5 block">
              {{ formatDate(currentPlan?.end_date) }}
            </span>
          </div>
        </div>
      </div>

      <!-- No Active Subscription State -->
      <div v-else-if="!loading" class="bg-white border border-[#EEDFC4] rounded-2xl p-8 mb-8 text-center shadow-sm">
        <Icon name="heroicons:credit-card" class="w-12 h-12 text-[#9E7060] mx-auto mb-3" />
        <h3 class="font-display text-lg font-bold text-[#3B1F0E]">No Active Subscription</h3>
        <p class="font-sans text-sm text-[#8B6656] mt-1 max-w-md mx-auto">
          You currently do not have an active subscription plan registered in the database.
        </p>
      </div>

      <!-- Payment History Section Matching Reference Screenshot -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-display text-xl font-bold text-[#3D2B24]">Payment History</h2>
        </div>

        <PaymentHistoryTable :history="history" :loading="loading" :show-controls="true" />
      </div>
    </main>
  </div>
</template>
