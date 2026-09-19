<!-- pages/owner/subscription.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PaymentHistoryTable, { type PaymentTransaction } from '~/components/common/PaymentHistoryTable.vue'
import CheckoutModal from '~/components/subscription/CheckoutModal.vue'
import type { SubscriptionPlanItem } from '~/services/SubscriptionService'

definePageMeta({
  role: 'Cafe Owner',
})

const links = [
  { label: 'Dashboard', to: '/owner/dashboard', icon: 'squares-2x2' },
  { label: 'Cafe Management', to: '/owner/branches', icon: 'building-storefront' },
  { label: 'Menu Management', to: '/owner/menu', icon: 'book-open' },
  { label: 'Subscription', to: '/owner/subscription', icon: 'credit-card' },
]

const config = useRuntimeConfig()
const paypalClientId = config.public.paypalClientId

// Dynamically inject PayPal Script
useHead({
  script: [
    {
      src: `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&vault=true&intent=subscription`,
      defer: true
    }
  ]
})

const subService = useSubscriptionService()

const loading = ref(true)
const currentPlan = ref<any>(null)
const history = ref<PaymentTransaction[]>([])
const availablePlans = ref<SubscriptionPlanItem[]>([])

const viewMode = ref<'current' | 'browse'>('current')
const browseBillingCycle = ref<'monthly' | 'yearly'>('monthly')

// Checkout Modal State
const isCheckoutOpen = ref(false)
const selectedPlanToCheckout = ref<SubscriptionPlanItem | null>(null)

async function loadOwnerSubscription() {
  loading.value = true
  try {
    const [planRes, historyRes, availableRes] = await Promise.all([
      subService.getCurrentPlan().catch(() => null),
      subService.getPlanHistory({ per_page: 20 }).catch(() => null),
      subService.getAvailablePlans({ per_page: 50 }).catch(() => null)
    ])

    if (planRes?.success && planRes.subscription) {
      currentPlan.value = planRes.subscription
    } else {
      currentPlan.value = null
    }

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

    if (availableRes?.success && availableRes.plans?.data) {
      availablePlans.value = availableRes.plans.data
    }

  } catch (err) {
    console.warn('Owner subscription fetch:', err)
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

function getDisplayPrice(plan: SubscriptionPlanItem, cycle: 'monthly'|'yearly'): string {
  const price = cycle === 'yearly' ? (plan.yearly_price ?? plan.price) : plan.price
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

function openCheckout(plan: SubscriptionPlanItem) {
  selectedPlanToCheckout.value = plan
  isCheckoutOpen.value = true
}

function onCheckoutSuccess(subscriptionId: string) {
  const isUpgrade = !!currentPlan.value
  viewMode.value = 'current'
  loadOwnerSubscription()
  // Add a nice toast here in real app
  alert(isUpgrade
    ? 'Plan change scheduled! It will take effect on your next billing date.'
    : 'Subscription successful! PayPal ID: ' + subscriptionId)
}

onMounted(loadOwnerSubscription)
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7]">
    <!-- Desktop & Mobile Sidebar Navigation -->
    <NavBar :links="links" />

    <main class="flex-1 p-4 sm:p-6 md:p-12">
      <!-- Title -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="font-display text-2xl md:text-3xl font-bold text-[#3D2B24]">
            {{ viewMode === 'current' ? 'My Subscription & Billing' : 'Browse Plans' }}
          </h1>
          <p class="font-sans text-sm text-[#8B6656] mt-1">
            {{ viewMode === 'current' 
               ? 'Manage your cafe subscription plan and view payment transaction history.' 
               : 'Select a premium plan below to unlock powerful features for your cafe.' }}
          </p>
        </div>
        <div>
          <button
            v-if="viewMode === 'current'"
            @click="viewMode = 'browse'"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors shadow-lg shadow-[#3B1F0E]/20"
          >
            <Icon name="heroicons:sparkles" class="w-5 h-5 text-[#F3E7D2]" />
            Upgrade Plan
          </button>
          <button
            v-else
            @click="viewMode = 'current'"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#3B1F0E] font-display font-semibold border border-[#EDD8CC] hover:bg-[#FFF8EA] transition-colors shadow-sm"
          >
            <Icon name="heroicons:arrow-left" class="w-5 h-5" />
            Back to Billing
          </button>
        </div>
      </div>

      <!-- VIEW MODE: CURRENT -->
      <div v-if="viewMode === 'current'">
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
            </div>

            <div class="text-left sm:text-right">
              <span class="font-display text-3xl font-bold text-[#7D5A50]">
                ₱{{ getActivePlanPrice() }}
              </span>
              <span class="font-sans text-xs text-[#8B6656] block">
                / {{ currentPlan?.billing_cycle === 'yearly' ? 'year' : 'month' }}
              </span>
            </div>
          </div>

          <div
            v-if="currentPlan?.pending_plan"
            class="flex items-start gap-2.5 bg-[#FFF8EA] border border-[#EDD8CC] rounded-xl p-4 mb-6 font-sans text-sm text-[#7D5A50]"
          >
            <Icon name="heroicons:clock" class="w-5 h-5 shrink-0 mt-0.5 text-[#8B6656]" />
            <span>
              Your plan is changing to <strong>{{ currentPlan.pending_plan.sub_name }}</strong> on your next billing date
              ({{ formatDate(currentPlan?.end_date) }}). You'll keep your current plan's features until then.
            </span>
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
              Basic plan access (single branch only, no advanced features).
            </p>
          </div>
        </div>

        <!-- No Active Subscription State -->
        <div v-else-if="!loading" class="bg-white border border-[#EEDFC4] rounded-2xl p-12 mb-8 text-center shadow-sm flex flex-col items-center">
          <div class="w-16 h-16 bg-[#F3E7D2] rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="heroicons:credit-card" class="w-8 h-8 text-[#9E7060]" />
          </div>
          <h3 class="font-display text-xl font-bold text-[#3B1F0E]">No Active Subscription</h3>
          <p class="font-sans text-sm text-[#8B6656] mt-2 max-w-md mx-auto mb-6">
            You currently do not have an active subscription. Upgrade your plan today to unlock premium features and manage multiple branches.
          </p>
          <button
            @click="viewMode = 'browse'"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors shadow-lg shadow-[#3B1F0E]/20"
          >
            Browse Plans Now
          </button>
        </div>

        <!-- Payment History Section Matching Reference Screenshot -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-display text-xl font-bold text-[#3D2B24]">Payment History</h2>
          </div>

          <PaymentHistoryTable :history="history" :loading="loading" :show-controls="true" />
        </div>
      </div>

      <!-- VIEW MODE: BROWSE PLANS -->
      <div v-else>
        
        <!-- Monthly / Yearly Toggle -->
        <div class="flex justify-center mb-10 relative">
          <div class="inline-flex items-center p-1 bg-white border border-[#EDD8CC] rounded-full shadow-sm relative">
            
            <!-- Sliding Background Indicator -->
            <div 
              class="absolute top-1 bottom-1 bg-[#3B1F0E] rounded-full transition-all duration-300 ease-out shadow-sm"
              :class="browseBillingCycle === 'monthly' ? 'left-1 w-[92px]' : 'left-[98px] w-[142px]'"
            ></div>
            
            <button
              class="relative px-6 py-2 rounded-full font-display text-sm font-semibold transition-colors z-10 w-[92px]"
              :class="browseBillingCycle === 'monthly' ? 'text-white' : 'text-[#7D5A50] hover:text-[#3B1F0E]'"
              @click="browseBillingCycle = 'monthly'"
            >
              Monthly
            </button>
            <button
              class="relative px-6 py-2 rounded-full font-display text-sm font-semibold transition-colors z-10 flex items-center justify-center gap-2 w-[142px]"
              :class="browseBillingCycle === 'yearly' ? 'text-white' : 'text-[#7D5A50] hover:text-[#3B1F0E]'"
              @click="browseBillingCycle = 'yearly'"
            >
              Yearly
              <span class="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#FFF8EA] text-[#3B1F0E] text-[10px] font-bold tracking-wider" :class="browseBillingCycle === 'yearly' ? 'bg-white/20 text-white shadow-inner' : ''">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        <!-- Loading State for Plans -->
        <div v-if="loading" class="flex justify-center py-20">
          <Icon name="heroicons:arrow-path" class="w-8 h-8 text-[#9E7060] animate-spin" />
        </div>

        <!-- Plans Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          <div 
            v-for="plan in availablePlans" 
            :key="plan.uuid"
            class="relative flex flex-col bg-white rounded-3xl border border-[#EDD8CC] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
          >
            <!-- Plan Header -->
            <div class="mb-6">
              <h3 class="font-display text-xl font-bold text-[#3B1F0E] mb-2">{{ plan.sub_name }}</h3>
              <p class="font-sans text-sm text-[#8B6656] min-h-[40px]">{{ plan.description || 'Access basic management features for your cafe.' }}</p>
            </div>
            
            <!-- Price -->
            <div class="mb-8">
              <div class="flex items-baseline gap-1">
                <span class="font-display text-4xl font-black text-[#3B1F0E]">₱{{ getDisplayPrice(plan, browseBillingCycle) }}</span>
                <span class="font-sans text-sm text-[#9E7060] font-medium">/ {{ browseBillingCycle === 'yearly' ? 'year' : 'month' }}</span>
              </div>
            </div>

            <!-- Features -->
            <div class="flex-1">
              <ul class="space-y-4 font-sans text-sm text-[#3D2B24]">
                <!-- Default structural feature -->
                <li class="flex items-start gap-3">
                  <Icon name="heroicons:check-circle" class="w-5 h-5 text-[#3B1F0E] shrink-0" />
                  <span>{{ plan.has_multi_branch ? 'Multi-branch management' : 'Single branch only' }}</span>
                </li>
                <!-- Dynamic features -->
                <li 
                  v-for="feat in (plan.feature_details?.length ? plan.feature_details : plan.features)" 
                  :key="typeof feat === 'string' ? feat : feat.key"
                  class="flex items-start gap-3"
                >
                  <Icon name="heroicons:check-circle" class="w-5 h-5 text-[#3B1F0E] shrink-0" />
                  <span>{{ typeof feat === 'string' ? feat.replace(/_/g, ' ') : (feat.name || feat.key.replace(/_/g, ' ')) }}</span>
                </li>
              </ul>
            </div>

            <!-- Subscribe Button -->
            <button
              @click="openCheckout(plan)"
              class="w-full mt-8 py-3.5 rounded-xl font-display font-semibold text-sm transition-all duration-300"
              :class="
                currentPlan?.plan?.uuid === plan.uuid && currentPlan?.billing_cycle === browseBillingCycle 
                  ? 'bg-[#EEDFC4] text-[#7D5A50] cursor-not-allowed'
                  : 'bg-[#FFF8EA] text-[#3B1F0E] border border-[#3B1F0E] hover:bg-[#3B1F0E] hover:text-[#FDF3E7] group-hover:bg-[#3B1F0E] group-hover:text-[#FDF3E7] shadow-[4px_4px_0px_0px_#3B1F0E] hover:shadow-[2px_2px_0px_0px_#3B1F0E] hover:translate-x-[2px] hover:translate-y-[2px]'
              "
              :disabled="currentPlan?.plan?.uuid === plan.uuid && currentPlan?.billing_cycle === browseBillingCycle"
            >
              {{ currentPlan?.plan?.uuid === plan.uuid && currentPlan?.billing_cycle === browseBillingCycle ? 'Current Plan' : 'Subscribe Now' }}
            </button>
          </div>
        </div>
      </div>

    </main>

    <!-- Checkout Modal -->
    <CheckoutModal
      :open="isCheckoutOpen"
      :plan="selectedPlanToCheckout"
      :current-subscription="currentPlan"
      :billing-cycle="browseBillingCycle"
      @close="isCheckoutOpen = false"
      @success="onCheckoutSuccess"
    />
  </div>
</template>
