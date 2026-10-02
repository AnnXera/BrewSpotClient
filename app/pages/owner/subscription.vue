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
  { label: 'Cafe Management', to: '/owner/cafes', icon: 'building-storefront' },
  { label: 'Menu Management', to: '/owner/menu-management', icon: 'book-open' },
  { label: 'Subscription', to: '/owner/subscription', icon: 'credit-card' },
]

const route = useRoute()

const subService = useSubscriptionService()

const loading = ref(true)
const currentPlan = ref<any>(null)
const history = ref<PaymentTransaction[]>([])
const availablePlans = ref<SubscriptionPlanItem[]>([])
// What to offer an owner whose term has already run out — the plan they booked before it
// lapsed, or failing that the one that just ended. Payment only happens at the end of a
// term, so this is what they came back to pay for.
const renewalOffer = ref<any>(null)

const viewMode = ref<'current' | 'browse'>('current')
const browseBillingCycle = ref<'monthly' | 'yearly'>('monthly')

// Checkout Modal State
const isCheckoutOpen = ref(false)
const selectedPlanToCheckout = ref<SubscriptionPlanItem | null>(null)
const scheduling = ref(false)

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
      renewalOffer.value = null
    } else {
      currentPlan.value = null
      renewalOffer.value = planRes?.renewal_offer ?? null
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

// Billing cadence is not just monthly/yearly — daily and trial terms exist too, and
// labelling those "Monthly" misreports what the owner is actually on.
function cycleLabel(cycle?: string | null): string {
  switch (cycle) {
    case 'yearly': return 'Yearly Billing'
    case 'daily':  return 'Daily Billing'
    case 'trial':  return 'Free Trial'
    default:       return 'Monthly Billing'
  }
}

function cycleUnit(cycle?: string | null): string {
  switch (cycle) {
    case 'yearly': return 'year'
    case 'daily':  return 'day'
    case 'trial':  return 'trial'
    default:       return 'month'
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

/**
 * Pay for the plan an owner was left with when their term ran out.
 *
 * The offer carries its own cycle, since a booked change may have switched it — the browse
 * toggle is realigned to it so the checkout modal prices the right term.
 */
function payRenewalOffer() {
  const offer = renewalOffer.value
  if (!offer?.plan) return

  browseBillingCycle.value = offer.billing_cycle === 'yearly' ? 'yearly' : 'monthly'
  openCheckout(offer.plan)
}

function isCurrentPlan(plan: SubscriptionPlanItem): boolean {
  return currentPlan.value?.plan?.uuid === plan.uuid
    && currentPlan.value?.billing_cycle === browseBillingCycle.value
}

function isScheduledPlan(plan: SubscriptionPlanItem): boolean {
  const pending = currentPlan.value?.pending_plan
  if (!pending) return false
  const pendingCycle = currentPlan.value?.pending_billing_cycle ?? currentPlan.value?.billing_cycle
  return pending.uuid === plan.uuid && pendingCycle === browseBillingCycle.value
}

const hasScheduledChange = computed(() => !!currentPlan.value?.pending_plan)

/**
 * Whether the owner pays for the next term by hand from this page.
 *
 * A gateway-billed subscription renews on its own, so it gets no pay buttons — the same
 * rule the renewal banner follows.
 */
const canPayNextTerm = computed(() => isRenewalOpen.value && !currentPlan.value?.gateway_subscription_id)

/**
 * Pay for the next term, into whichever plan it will be on: the booked change when there
 * is one, otherwise the current plan again. The browse toggle is aligned to that term's
 * cycle so the checkout modal prices it correctly.
 */
function payNextTerm() {
  const sub = currentPlan.value
  const plan = sub?.pending_plan ?? sub?.plan
  if (!sub || !plan) return

  const cycle = sub.pending_plan ? (sub.pending_billing_cycle ?? sub.billing_cycle) : sub.billing_cycle
  browseBillingCycle.value = cycle === 'yearly' ? 'yearly' : 'monthly'
  openCheckout(plan)
}

/**
 * Whether the owner's paid days have run out, leaving only the term's grace day.
 *
 * Nothing is chargeable before this point — not a renewal, not an upgrade — so the plan
 * buttons stay inert until it flips, and then they become the way to pay for what's next.
 */
const isRenewalOpen = computed(() => {
  const opensAt = currentPlan.value?.renewal_opens_at
  if (!opensAt) return false
  return new Date(opensAt).getTime() <= Date.now()
})

/**
 * What clicking this plan will actually do, so the button never lies about it.
 */
function planButtonLabel(plan: SubscriptionPlanItem): string {
  if (!currentPlan.value) return 'Subscribe Now'
  // Paid days are used up: every plan is now something the owner can pay for today.
  if (isRenewalOpen.value) return isCurrentPlan(plan) ? 'Renew Now' : 'Pay & Switch Now'
  if (isScheduledPlan(plan)) return 'Scheduled'
  if (isCurrentPlan(plan)) return hasScheduledChange.value ? 'Keep This Plan' : 'Current Plan'
  return 'Switch at Renewal'
}

function planButtonDisabled(plan: SubscriptionPlanItem): boolean {
  if (scheduling.value) return true
  // Once renewal opens, anything on the list is payable — including the plan they hold.
  if (isRenewalOpen.value) return false
  if (isScheduledPlan(plan)) return true
  // Selecting the current plan is only meaningful as "cancel my scheduled change".
  return isCurrentPlan(plan) && !hasScheduledChange.value
}

/**
 * Choosing a plan means one of two things.
 *
 * With no active subscription — or while still on a free trial — there are no paid days to
 * protect, so checkout opens straight away. Otherwise the change is booked for the end of
 * the current term and nothing is charged. The backend replies with `requires_checkout`
 * when it decides the switch should happen immediately after all.
 */
async function selectPlan(plan: SubscriptionPlanItem) {
  if (!currentPlan.value) {
    openCheckout(plan)
    return
  }

  scheduling.value = true
  try {
    const res = await subService.schedulePlanChange({
      plan_uuid: plan.uuid,
      billing_cycle: browseBillingCycle.value,
    })

    if (res.requires_checkout) {
      openCheckout(plan)
      return
    }

    alert(res.message)

    if (res.success) {
      await loadOwnerSubscription()
      viewMode.value = 'current'
    }
  } catch (err: any) {
    alert(err.response?._data?.message || 'Could not update your plan. Please try again.')
  } finally {
    scheduling.value = false
  }
}

/**
 * PayMongo redirects back here after the hosted checkout page with ?checkout=success or
 * ?checkout=cancelled. The subscription is activated by the webhook, not by this redirect,
 * so a success return is reported as "payment received" rather than claiming it is active.
 */
function handleCheckoutReturn() {
  const outcome = route.query.checkout

  if (outcome === 'success') {
    viewMode.value = 'current'
    alert('Payment received. Your subscription will activate as soon as PayMongo confirms the payment — this usually takes a few seconds.')
  } else if (outcome === 'cancelled') {
    alert('Checkout was cancelled. You have not been charged.')
  }
}

/**
 * Renewal links from the expiration reminder email arrive as
 * ?renew=<plan_uuid>&cycle=<monthly|yearly>. Open checkout on that plan directly so the
 * owner lands straight on payment instead of having to find the plan again.
 *
 * The reminder goes out days before payment is possible, so a link followed too early
 * shows the current plan and the date renewal opens rather than a checkout the backend
 * would only reject.
 */
function openRenewalFromQuery() {
  const renewUuid = route.query.renew
  if (typeof renewUuid !== 'string' || !renewUuid) return

  const plan = availablePlans.value.find(p => p.uuid === renewUuid)
  if (!plan) return

  if (currentPlan.value && !isRenewalOpen.value) {
    viewMode.value = 'current'
    return
  }

  const cycle = route.query.cycle
  if (cycle === 'yearly' || cycle === 'monthly') {
    browseBillingCycle.value = cycle
  }

  viewMode.value = 'browse'
  openCheckout(plan)
}

onMounted(async () => {
  await loadOwnerSubscription()
  handleCheckoutReturn()
  openRenewalFromQuery()
})
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
                    {{ cycleLabel(currentPlan?.billing_cycle) }}
                  </span>
                </div>
              </div>

              <div class="text-left sm:text-right">
                <span class="font-display text-3xl font-bold text-[#7D5A50]">
                  ₱{{ getActivePlanPrice() }}
                </span>
                <span class="font-sans text-xs text-[#8B6656] block">
                  / {{ cycleUnit(currentPlan?.billing_cycle) }}
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
                <span class="text-[#8B6656] block text-xs font-medium uppercase tracking-wider">Expires On</span>
                <span class="font-semibold text-[#3B1F0E] mt-0.5 block">
                  {{ formatDate(currentPlan?.end_date) }}
                </span>
              </div>
            </div>

            <div
              v-if="currentPlan?.renewal_opens_at"
              class="flex items-start gap-3 mb-6 p-4 rounded-xl font-sans text-xs leading-relaxed"
              :class="isRenewalOpen ? 'bg-[#FFF8EA] border border-[#D9B98D] text-[#8F5B12]' : 'bg-[#FFFDF9] border border-[#F3E7D2] text-[#7D5A50]'"
            >
              <Icon :name="isRenewalOpen ? 'heroicons:bell-alert' : 'heroicons:information-circle'" class="w-5 h-5 shrink-0 mt-0.5" />
              <div class="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div v-if="isRenewalOpen">
                  Your paid days are used up — you have until <strong>{{ formatDate(currentPlan?.end_date) }}</strong> to pay
                  for your next term. Your remaining day carries over, so you lose nothing by renewing now.
                </div>
                <div v-else>
                  You're not charged automatically. Renewal opens on
                  <strong>{{ formatDate(currentPlan?.renewal_opens_at) }}</strong>, once your paid days run out.
                </div>
                
                <!-- A booked change is paid for from the Next Plan card instead. -->
                <button
                  v-if="canPayNextTerm && !hasScheduledChange"
                  @click="payNextTerm"
                  class="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors shadow-sm"
                >
                  <Icon name="heroicons:credit-card" class="w-4 h-4" />
                  Renew Now
                </button>
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
                    {{ cycleLabel(currentPlan.pending_billing_cycle ?? currentPlan.billing_cycle) }}
                  </span>
                </div>
              </div>

              <div class="text-left sm:text-right">
                <span class="font-display text-3xl font-bold text-[#7D5A50]">
                  ₱{{ getNextPlanPrice() }}
                </span>
                <span class="font-sans text-xs text-[#8B6656] block">
                  / {{ cycleUnit(currentPlan.pending_billing_cycle ?? currentPlan.billing_cycle) }}
                </span>
              </div>
            </div>

            <p class="font-sans text-sm text-[#7D5A50] mb-6">
              Takes effect when your current term ends on <strong>{{ formatDate(currentPlan?.end_date) }}</strong>.
              You'll keep using your current plan's features until then — no charge has been made for this plan yet.
              <template v-if="isRenewalOpen">
                Payment for it is open now.
              </template>
              <template v-else-if="currentPlan?.renewal_opens_at">
                You can pay for it from <strong>{{ formatDate(currentPlan?.renewal_opens_at) }}</strong>.
              </template>
            </p>

            <button
              v-if="canPayNextTerm"
              @click="payNextTerm"
              class="w-full sm:w-auto mb-6 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors shadow-sm"
            >
              <Icon name="heroicons:credit-card" class="w-4 h-4" />
              Pay Now
            </button>

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

        <!-- Term Ended — pick up where the owner left off -->
        <div
          v-else-if="!loading && renewalOffer"
          class="bg-[#FFF8EA] border border-[#D9B98D] rounded-2xl p-6 md:p-8 mb-8 shadow-sm"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEDFC4] pb-6 mb-6">
            <div>
              <span class="inline-flex items-center gap-1.5 font-sans text-xs uppercase font-bold text-[#B8752F] tracking-wider mb-2">
                <Icon name="heroicons:exclamation-triangle" class="w-4 h-4" />
                Subscription Ended
              </span>
              <div class="flex items-center gap-2.5 flex-wrap">
                <span class="font-display text-2xl font-bold text-[#3B1F0E]">
                  {{ renewalOffer.plan?.sub_name }}
                </span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full font-display font-semibold text-xs bg-white border border-[#EDD8CC] text-[#7D5A50]">
                  {{ cycleLabel(renewalOffer.billing_cycle) }}
                </span>
              </div>
            </div>

            <div class="text-left sm:text-right">
              <span class="font-display text-3xl font-bold text-[#7D5A50]">
                ₱{{ getDisplayPrice(renewalOffer.plan, renewalOffer.billing_cycle === 'yearly' ? 'yearly' : 'monthly') }}
              </span>
              <span class="font-sans text-xs text-[#8B6656] block">
                / {{ cycleUnit(renewalOffer.billing_cycle) }}
              </span>
            </div>
          </div>

          <p class="font-sans text-sm text-[#7D5A50] mb-6">
            <template v-if="renewalOffer.was_scheduled">
              Your {{ renewalOffer.previous_plan }} ended on
              <strong>{{ formatDate(renewalOffer.ended_on) }}</strong>, and you'd scheduled a switch to the
              {{ renewalOffer.plan?.sub_name }}. Pay for it now to start your new term.
            </template>
            <template v-else>
              Your {{ renewalOffer.plan?.sub_name }} ended on
              <strong>{{ formatDate(renewalOffer.ended_on) }}</strong>. Renew it to restore the features it unlocked,
              or browse the other plans.
            </template>
          </p>

          <div class="flex flex-col sm:flex-row gap-3">
            <button
              @click="payRenewalOffer"
              class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors shadow-lg shadow-[#3B1F0E]/20"
            >
              <Icon name="heroicons:credit-card" class="w-5 h-5" />
              {{ renewalOffer.was_scheduled ? 'Pay & Start' : 'Renew' }} {{ renewalOffer.plan?.sub_name }}
            </button>
            <button
              @click="viewMode = 'browse'"
              class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-[#3B1F0E] font-display font-semibold border border-[#EDD8CC] hover:bg-[#FFF8EA] transition-colors"
            >
              <Icon name="heroicons:squares-2x2" class="w-5 h-5" />
              Browse Plans
            </button>
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
              @click="selectPlan(plan)"
              class="w-full mt-8 py-3.5 rounded-xl font-display font-semibold text-sm transition-all duration-300"
              :class="
                planButtonDisabled(plan)
                  ? 'bg-[#EEDFC4] text-[#7D5A50] cursor-not-allowed'
                  : 'bg-[#FFF8EA] text-[#3B1F0E] border border-[#3B1F0E] hover:bg-[#3B1F0E] hover:text-[#FDF3E7] group-hover:bg-[#3B1F0E] group-hover:text-[#FDF3E7] shadow-[4px_4px_0px_0px_#3B1F0E] hover:shadow-[2px_2px_0px_0px_#3B1F0E] hover:translate-x-[2px] hover:translate-y-[2px]'
              "
              :disabled="planButtonDisabled(plan)"
            >
              {{ planButtonLabel(plan) }}
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
    />
  </div>
</template>
