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
        const isYearly = item.billing_cycle === 'yearly'
        const rawPrice = isYearly ? (item.plan?.yearly_price ?? item.plan?.price ?? 0) : (item.plan?.price ?? 0)
        const priceNum = typeof rawPrice === 'string' ? parseFloat(rawPrice) : rawPrice
        const formattedPrice = isNaN(priceNum) ? '0.00' : (priceNum > 10000 ? priceNum / 100 : priceNum).toFixed(2)

        return {
          transaction_id: item.uuid ? `TXN-${item.uuid.replace(/-/g, '').slice(0, 7).toUpperCase()}` : 'TXN-0000000',
          date: item.start_date || item.created_at || new Date().toISOString(),
          description: item.plan?.sub_name
            ? `${isYearly ? 'Yearly' : 'Monthly'} Subscription - ${item.plan.sub_name}`
            : `${isYearly ? 'Yearly' : 'Monthly'} Subscription`,
          amount: formattedPrice,
          status: item.status || 'active',
          payment_gateway: item.payment_gateway || item.payment_method || 'PayPal',
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

function getActivePlanPrice(): string {
  if (!currentPlan.value?.plan) return '0.00'
  const isYearly = currentPlan.value?.billing_cycle === 'yearly'
  const price = isYearly ? (currentPlan.value.plan.yearly_price ?? currentPlan.value.plan.price) : currentPlan.value.plan.price
  const num = typeof price === 'string' ? parseFloat(price) : price
  return isNaN(num) ? '0.00' : num.toFixed(2)
}

const activePlanFeatures = computed(() => {
  const plan = currentPlan.value?.plan
  if (!plan) return []
  if (plan.feature_details && plan.feature_details.length > 0) {
    return plan.feature_details.map((f: any) => ({
      key: f.key,
      name: f.name || f.key.replace(/_/g, ' '),
    }))
  }
  if (plan.features && plan.features.length > 0) {
    return plan.features.map((f: any) => {
      if (typeof f === 'object' && f !== null) {
        return { key: f.key, name: f.name || f.key.replace(/_/g, ' ') }
      }
      return { key: f, name: f.replace(/_/g, ' ') }
    })
  }
  return []
})

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
            <div class="flex items-center gap-2.5 flex-wrap">
              <span class="font-display text-2xl font-bold text-[#3B1F0E]">
                {{ currentPlan?.plan?.sub_name || 'Active Plan' }}
              </span>
              <span
                class="inline-flex items-center px-3 py-0.5 rounded-full font-display font-semibold text-xs bg-[#D4EDDA] text-[#28A745] capitalize"
              >
                {{ currentPlan?.status || 'Active' }}
              </span>
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full font-display font-semibold text-xs bg-[#FFF8EA] border border-[#EDD8CC] text-[#7D5A50] capitalize"
              >
                {{ currentPlan?.billing_cycle === 'yearly' ? 'Yearly Billing' : 'Monthly Billing' }}
              </span>
            </div>
            <p class="font-sans text-sm text-[#8B6656] mt-1">
              Supports up to {{ currentPlan?.plan?.max_branches || 1 }} cafe branch location(s).
            </p>
          </div>

          <div class="text-left sm:text-right">
            <span class="font-display text-3xl font-bold text-[#7D5A50]">
              ${{ getActivePlanPrice() }}
            </span>
            <span class="font-sans text-xs text-[#8B6656] block">
              / {{ currentPlan?.billing_cycle === 'yearly' ? 'year' : 'month' }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-sm mb-6">
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

        <!-- Plan Features List -->
        <div class="pt-4 border-t border-[#F3E7D2]">
          <span class="font-sans text-xs uppercase font-bold text-[#8B6656] block mb-2 tracking-wider">
            Unlocked Features
          </span>
          <div v-if="activePlanFeatures.length > 0" class="flex flex-wrap gap-2">
            <span
              v-for="feat in activePlanFeatures"
              :key="feat.key"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FFFDF9] border border-[#EEDFC4] text-[#3D2B24]"
            >
              <Icon name="heroicons:check-badge" class="w-4 h-4 text-[#28A745]" />
              <span>{{ feat.name }}</span>
            </span>
          </div>
          <p v-else class="font-sans text-xs text-[#9E7060]">
            Basic plan access with single branch support.
          </p>
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
