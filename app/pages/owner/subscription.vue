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
      history.value = historyRes.history.data.map((item: any) => {
        return {
          transaction_id: item.transaction_id,
          date: item.date,
          description: item.description,
          amount: item.amount,
          status: item.status,
          payment_gateway: item.payment_gateway,
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

function planFeatures(plan: any) {
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
}

const activePlanFeatures = computed(() => planFeatures(currentPlan.value?.plan))
const nextPlanFeatures = computed(() => planFeatures(currentPlan.value?.pending_plan))

function getNextPlanPrice(): string {
  const plan = currentPlan.value?.pending_plan
  if (!plan) return '0.00'
  const isYearly = (currentPlan.value?.pending_billing_cycle ?? currentPlan.value?.billing_cycle) === 'yearly'
  const price = isYearly ? (plan.yearly_price ?? plan.price) : plan.price
  const num = typeof price === 'string' ? parseFloat(price) : price
  return isNaN(num) ? '0.00' : num.toFixed(2)
}

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
        <div
          v-if="currentPlan"
          class="grid grid-cols-1 gap-6 mb-8"
          :class="currentPlan.pending_plan ? 'lg:grid-cols-2 items-start' : ''"
        >
          <!-- Current Plan -->
          <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6 md:p-8 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3E7D2] pb-6 mb-6">
              <div>
                <span class="font-sans text-xs uppercase font-bold text-[#8B6656] tracking-wider block mb-2">
                  Current Plan
                </span>
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

          <!-- Next Plan (scheduled, not yet active) -->
          <div
            v-if="currentPlan.pending_plan"
            class="bg-[#FFF8EA] border border-[#D9B98D] rounded-2xl p-6 md:p-8 shadow-sm"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEDFC4] pb-6 mb-6">
              <div>
                <span class="inline-flex items-center gap-1.5 font-sans text-xs uppercase font-bold text-[#B8752F] tracking-wider mb-2">
                  <Icon name="heroicons:clock" class="w-4 h-4" />
                  Next Plan &mdash; Not Active Yet
                </span>
                <div class="flex items-center gap-2.5 flex-wrap">
                  <span class="font-display text-2xl font-bold text-[#3B1F0E]">
                    {{ currentPlan.pending_plan.sub_name }}
                  </span>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full font-display font-semibold text-xs bg-white border border-[#EDD8CC] text-[#7D5A50] capitalize"
                  >
                    {{ (currentPlan.pending_billing_cycle ?? currentPlan.billing_cycle) === 'yearly' ? 'Yearly Billing' : 'Monthly Billing' }}
                  </span>
                </div>
              </div>

              <div class="text-left sm:text-right">
                <span class="font-display text-3xl font-bold text-[#7D5A50]">
                  ₱{{ getNextPlanPrice() }}
                </span>
                <span class="font-sans text-xs text-[#8B6656] block">
                  / {{ (currentPlan.pending_billing_cycle ?? currentPlan.billing_cycle) === 'yearly' ? 'year' : 'month' }}
                </span>
              </div>
            </div>

            <p class="font-sans text-sm text-[#7D5A50] mb-6">
              Takes effect on your next billing date, <strong>{{ formatDate(currentPlan?.end_date) }}</strong>.
              You'll keep using your current plan's features until then — no charge has been made for this plan yet.
            </p>

            <div class="pt-4 border-t border-[#EEDFC4]">
              <span class="font-sans text-xs uppercase font-bold text-[#8B6656] block mb-2 tracking-wider">
                Features You'll Unlock
              </span>
              <div v-if="nextPlanFeatures.length > 0" class="flex flex-wrap gap-2">
                <span
                  v-for="feat in nextPlanFeatures"
                  :key="feat.key"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#EEDFC4] text-[#3D2B24]"
                >
                  <Icon name="heroicons:check-badge" class="w-4 h-4 text-[#B8752F]" />
                  <span>{{ feat.name }}</span>
                </span>
              </div>
              <p v-else class="font-sans text-xs text-[#9E7060]">
                Basic plan access (single branch only, no advanced features).
              </p>
            </div>
          </div>
        </div>

        <!-- No Active Subscription State -->
        <div v-else-if="!loading" class="bg-[#FFFDF9] border border-[#EEDFC4] rounded-3xl p-8 md:p-16 mb-8 text-center shadow-sm relative overflow-hidden flex flex-col items-center">
          <!-- Decorative Background Elements -->
          <div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#F3E7D2]/50 to-transparent"></div>
          
          <div class="relative z-10 w-24 h-24 bg-white rounded-2xl shadow-lg border border-[#EDD8CC] flex items-center justify-center mx-auto mb-6 rotate-3">
            <div class="absolute -right-3 -top-3 w-8 h-8 bg-[#3B1F0E] rounded-full flex items-center justify-center -rotate-12 shadow-md">
              <Icon name="heroicons:star-solid" class="w-4 h-4 text-[#F3E7D2]" />
            </div>
            <Icon name="heroicons:building-storefront" class="w-10 h-10 text-[#3B1F0E]" />
          </div>
          
          <h3 class="relative z-10 font-display text-2xl md:text-3xl font-black text-[#3B1F0E] mb-3">
            Ready to grow your coffee empire?
          </h3>
          <p class="relative z-10 font-sans text-base text-[#7D5A50] max-w-lg mx-auto mb-8">
            You're currently on the basic free tier. Upgrade your plan today to unlock the full potential of Brewspot and streamline your operations.
          </p>
          
          <div class="relative z-10 flex flex-wrap justify-center gap-3 mb-10">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#EDD8CC] text-sm font-semibold text-[#3D2B24] shadow-sm">
              <Icon name="heroicons:map" class="w-4 h-4 text-[#B8752F]" /> Multi-branch Management
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#EDD8CC] text-sm font-semibold text-[#3D2B24] shadow-sm">
              <Icon name="heroicons:chart-bar" class="w-4 h-4 text-[#B8752F]" /> Advanced Analytics
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#EDD8CC] text-sm font-semibold text-[#3D2B24] shadow-sm">
              <Icon name="heroicons:users" class="w-4 h-4 text-[#B8752F]" /> Staff Roles
            </span>
          </div>

          <button
            @click="viewMode = 'browse'"
            class="relative z-10 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-all hover:-translate-y-1 shadow-[0_8px_20px_-6px_rgba(59,31,14,0.5)]"
          >
            <Icon name="heroicons:sparkles" class="w-5 h-5" />
            View Premium Plans
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
          <div class="inline-flex p-1 bg-white border border-[#EDD8CC] rounded-full shadow-sm relative">
            
            <!-- Inner container for the slider to match button dimensions exactly -->
            <div class="absolute inset-1 pointer-events-none">
              <div 
                class="w-1/2 h-full bg-[#3B1F0E] rounded-full transition-transform duration-300 ease-out shadow-sm"
                :class="browseBillingCycle === 'monthly' ? 'translate-x-0' : 'translate-x-full'"
              ></div>
            </div>
            
            <!-- Buttons wrapper to enforce equal widths -->
            <div class="relative z-10 grid grid-cols-2 w-full sm:min-w-[320px]">
              <button
                class="px-4 sm:px-6 py-2.5 rounded-full font-display text-sm font-semibold transition-colors"
                :class="browseBillingCycle === 'monthly' ? 'text-white' : 'text-[#7D5A50] hover:text-[#3B1F0E]'"
                @click="browseBillingCycle = 'monthly'"
              >
                Monthly
              </button>
              <button
                class="px-4 sm:px-6 py-2.5 rounded-full font-display text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                :class="browseBillingCycle === 'yearly' ? 'text-white' : 'text-[#7D5A50] hover:text-[#3B1F0E]'"
                @click="browseBillingCycle = 'yearly'"
              >
                <span>Yearly</span>
                <span class="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#FFF8EA] text-[#3B1F0E] text-[10px] font-bold tracking-wider" :class="browseBillingCycle === 'yearly' ? 'bg-white/20 text-white shadow-inner' : ''">
                  SAVE 20%
                </span>
              </button>
            </div>
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
