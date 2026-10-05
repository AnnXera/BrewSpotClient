<!-- pages/owner/subscription.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import PaymentHistoryTable, { type PaymentTransaction } from '~/components/common/PaymentHistoryTable.vue'
import CheckoutModal from '~/components/subscription/CheckoutModal.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
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

// Set when the subscription itself could not be loaded. Kept apart from "the owner has no
// subscription", which is a normal answer: showing the free-tier upsell for a failed request
// would tell a paying customer they have nothing.
const loadError = ref(false)
const plansError = ref(false)

type Notice = { kind: 'success' | 'error' | 'info'; message: string }
const notice = ref<Notice | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Report an outcome without a blocking browser dialog. Errors stay until dismissed so a
 * failure can't be missed; confirmations clear themselves.
 */
function showNotice(message: string, kind: Notice['kind'] = 'success') {
  clearTimeout(noticeTimer)
  notice.value = { kind, message }
  startNoticeTimer()
}

// Only routine confirmations clear themselves. Errors and the payment-return notices
// (`info`) carry something the owner has to act on or be sure of, so they wait to be dismissed.
function startNoticeTimer() {
  clearTimeout(noticeTimer)
  if (notice.value?.kind === 'success') {
    noticeTimer = setTimeout(() => { notice.value = null }, 8000)
  }
}

// Reading or focusing the message must not race the timer.
function pauseNoticeTimer() {
  clearTimeout(noticeTimer)
}

function dismissNotice() {
  clearTimeout(noticeTimer)
  notice.value = null
}

function errorMessage(err: any, fallback: string): string {
  // No response at all means the request never reached the server.
  if (!err?.response) return 'Could not reach the server. Check your connection and try again.'
  return err.response._data?.message || fallback
}

/**
 * The backend answers 404 with a body when the owner has no running term — that body carries
 * the renewal offer, so it is a result, not a failure. Anything else propagates.
 */
async function fetchCurrentPlan() {
  try {
    return await subService.getCurrentPlan()
  } catch (err: any) {
    if (err?.response?.status === 404 && err.response._data) return err.response._data
    throw err
  }
}

async function loadOwnerSubscription() {
  loading.value = true
  loadError.value = false
  plansError.value = false
  try {
    const [planRes, historyRes, availableRes] = await Promise.all([
      fetchCurrentPlan().catch(() => undefined),
      subService.getPlanHistory({ per_page: 20 }).catch(() => null),
      subService.getAvailablePlans({ per_page: 50 }).catch(() => undefined)
    ])

    if (planRes === undefined) {
      // Keep whatever was already on screen rather than blanking it on a failed refresh.
      loadError.value = true
    } else if (planRes.success && planRes.subscription) {
      currentPlan.value = planRes.subscription
      renewalOffer.value = null
    } else {
      currentPlan.value = null
      renewalOffer.value = planRes.renewal_offer ?? null
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

    if (availableRes === undefined) {
      plansError.value = true
    } else if (availableRes?.success && availableRes.plans?.data) {
      availablePlans.value = availableRes.plans.data
    }

  } catch (err) {
    console.warn('Owner subscription fetch:', err)
    loadError.value = true
  } finally {
    loading.value = false
  }

  // A refresh that fails over data already on screen would otherwise go unnoticed.
  if (loadError.value && (currentPlan.value || renewalOffer.value)) {
    showNotice('Could not refresh your subscription. What you see may be out of date.', 'error')
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

/**
 * The yearly discount, taken from the plans themselves rather than a number typed into the
 * page. Each plan's saving is its yearly price against twelve months at the monthly price;
 * a plan with no usable yearly price saves nothing and is skipped.
 */
const yearlySavings = computed<{ percent: number; varies: boolean } | null>(() => {
  const percents = availablePlans.value
    .map((plan) => {
      const monthly = Number(plan.price)
      const yearly = Number(plan.yearly_price)
      if (!(monthly > 0) || !(yearly > 0)) return 0
      return Math.round((1 - yearly / (monthly * 12)) * 100)
    })
    .filter((percent) => percent > 0)

  if (!percents.length) return null
  return { percent: Math.max(...percents), varies: new Set(percents).size > 1 }
})

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

// The owner has told us not to renew. The subscription itself stays active until its end
// date, so everything they paid for keeps working.
const isCancelled = computed(() => !!currentPlan.value?.cancel_at_period_end)

// Mirrors the backend: trials and gateway-billed subscriptions can't be cancelled here.
const canCancelCurrent = computed(() => {
  const sub = currentPlan.value
  if (!sub || sub.cancel_at_period_end || sub.gateway_subscription_id) return false
  if (sub.billing_cycle === 'trial') return false
  return Number(sub.plan?.price ?? 0) > 0
})

// Why cancel isn't offered, for the cases where the owner would otherwise wonder.
const cancelHint = computed(() => {
  const sub = currentPlan.value
  if (!sub || sub.cancel_at_period_end) return ''
  if (sub.gateway_subscription_id) return 'This subscription is billed by your payment provider. Contact support to cancel it.'
  if (sub.billing_cycle === 'trial' || Number(sub.plan?.price ?? 0) <= 0) {
    return `Your free trial ends on ${formatDate(sub.end_date)} on its own, so there's nothing to cancel.`
  }
  return ''
})

const cancelling = ref(false)

// Which cancellation the owner is being asked to confirm, if any.
const pendingCancel = ref<'current' | 'next' | null>(null)

async function runCancelAction(action: () => Promise<{ success: boolean; message: string }>) {
  if (cancelling.value) return
  cancelling.value = true
  try {
    const res = await action()
    showNotice(res.message, res.success ? 'success' : 'error')
    if (res.success) await loadOwnerSubscription()
  } catch (err: any) {
    showNotice(errorMessage(err, 'Could not update your subscription. Please try again.'), 'error')
  } finally {
    cancelling.value = false
    pendingCancel.value = null
  }
}

const cancelDialog = computed(() => {
  const endsOn = formatDate(currentPlan.value?.end_date)

  if (pendingCancel.value === 'next') {
    return {
      title: `Remove your scheduled switch to ${currentPlan.value?.pending_plan?.sub_name ?? 'the next plan'}?`,
      message: `You'll stay on your ${currentPlan.value?.plan?.sub_name ?? 'current plan'}. Nothing has been charged for the next plan.`,
      confirmLabel: 'Remove scheduled switch',
      cancelLabel: 'Keep scheduled switch',
      consequences: [] as string[],
    }
  }

  const consequences = [
    `Full access to every feature until ${endsOn}`,
    'No further charges after that date',
  ]
  if (hasScheduledChange.value) consequences.push('Your scheduled next plan is cancelled too')
  consequences.push(`You can resume any time before ${endsOn}`)

  return {
    title: 'Cancel your subscription?',
    message: `Your ${currentPlan.value?.plan?.sub_name ?? 'plan'} will not renew.`,
    confirmLabel: 'Cancel subscription',
    cancelLabel: 'Keep subscription',
    consequences,
  }
})

function cancelCurrentPlan() {
  pendingCancel.value = 'current'
}

function cancelNextPlan() {
  pendingCancel.value = 'next'
}

function confirmCancel() {
  const target = pendingCancel.value
  if (!target) return
  runCancelAction(() => subService.cancelPlan(target))
}

function resumePlan() {
  runCancelAction(() => subService.resumePlan())
}

/**
 * Whether the owner pays for the next term by hand from this page.
 *
 * A gateway-billed subscription renews on its own, so it gets no pay buttons — the same
 * rule the renewal banner follows.
 */
const canPayNextTerm = computed(() => isRenewalOpen.value && !currentPlan.value?.gateway_subscription_id && !isCancelled.value)

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
  if (isRenewalOpen.value) return isCurrentPlan(plan) ? 'Renew Now' : 'Switch & Pay Now'

  // A date says when the change happens; "at renewal" leaves the owner to work it out.
  const endDate = currentPlan.value.end_date ? formatDate(currentPlan.value.end_date) : null
  if (isScheduledPlan(plan)) return endDate ? `Scheduled for ${endDate}` : 'Scheduled'
  if (isCurrentPlan(plan)) return hasScheduledChange.value ? 'Stay on This Plan' : 'Current Plan'
  return endDate ? `Switch on ${endDate}` : 'Switch at Renewal'
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

    showNotice(res.message, res.success ? 'success' : 'error')

    if (res.success) {
      await loadOwnerSubscription()
      viewMode.value = 'current'
    }
  } catch (err: any) {
    showNotice(errorMessage(err, 'Could not update your plan. Please try again.'), 'error')
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
    showNotice('Payment received. Your subscription will activate as soon as PayMongo confirms the payment — this usually takes a few seconds.', 'info')
  } else if (outcome === 'cancelled') {
    showNotice('Checkout was cancelled. You have not been charged.', 'info')
  } else {
    return
  }

  // Drop the flag so a refresh or back-navigation doesn't announce the same outcome again.
  const { checkout: _checkout, ...rest } = route.query
  navigateTo({ query: rest }, { replace: true })
}

onBeforeUnmount(() => clearTimeout(noticeTimer))

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
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors shadow-sm"
          >
            <Icon name="heroicons:sparkles" class="w-5 h-5 text-[#F3E7D2]" />
            Change Plan
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
                  <!-- One status, so a cancelled plan never reads "Active" and "Cancelled" at once. -->
                  <span
                    v-if="isCancelled"
                    class="inline-flex items-center px-3 py-0.5 rounded-full font-display font-semibold text-xs bg-[#FFF8EA] border border-[#D9B98D] text-[#8F5B12]"
                  >
                    Cancelled · ends {{ formatDate(currentPlan?.end_date) }}
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center px-3 py-0.5 rounded-full font-display font-semibold text-xs bg-[#D4EDDA] text-[#1E6B34] capitalize"
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
                <span class="text-[#8B6656] block text-xs font-medium uppercase tracking-wider">{{ isCancelled ? 'Ends On' : 'Expires On' }}</span>
                <span class="font-semibold text-[#3B1F0E] mt-0.5 block">
                  {{ formatDate(currentPlan?.end_date) }}
                </span>
              </div>
            </div>

            <div
              v-if="isCancelled"
              class="flex items-start gap-3 mb-6 p-4 rounded-xl bg-[#FFF8EA] border border-[#D9B98D] text-[#8F5B12] font-sans text-xs leading-relaxed"
            >
              <Icon name="heroicons:information-circle" class="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div class="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  Your subscription is cancelled and will not renew, so you won't be charged again. You keep full access to every feature until
                  <strong>{{ formatDate(currentPlan?.end_date) }}</strong>.
                </div>
                <button
                  @click="resumePlan"
                  :disabled="cancelling"
                  class="shrink-0 inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Icon name="heroicons:arrow-uturn-left" class="w-4 h-4" aria-hidden="true" />
                  Resume Subscription
                </button>
              </div>
            </div>

            <div
              v-else-if="currentPlan?.renewal_opens_at"
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
                  class="shrink-0 inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors shadow-sm"
                >
                  <Icon name="heroicons:credit-card" class="w-4 h-4" aria-hidden="true" />
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
              <p v-else class="font-sans text-xs text-[#8B6656]">
                Basic plan access (single branch only, no advanced features).
              </p>
            </div>

            <!-- Manage footer: the reassurance sits with the action it qualifies, and the action
                 stays quiet so it never competes with renewing. -->
            <div
              v-if="canCancelCurrent"
              class="pt-3 mt-6 border-t border-[#F3E7D2] flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4"
            >
              <p class="font-sans text-xs text-[#8B6656]">
                Cancelling keeps your access until {{ formatDate(currentPlan?.end_date) }}.
              </p>
              <button
                @click="cancelCurrentPlan"
                :disabled="cancelling"
                class="self-start sm:self-auto -ml-3 sm:ml-0 inline-flex items-center gap-2 min-h-11 px-3 rounded-lg text-[#A13D3D] font-display font-semibold text-sm hover:bg-[#F9ECEC] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Icon name="heroicons:x-circle" class="w-4 h-4" aria-hidden="true" />
                Cancel subscription
              </button>
            </div>

            <!-- Say why there's no cancel button instead of leaving the owner to hunt for it. -->
            <p
              v-else-if="cancelHint"
              class="pt-4 mt-6 border-t border-[#F3E7D2] font-sans text-xs text-[#8B6656]"
            >
              {{ cancelHint }}
            </p>
          </div>

          <!-- Next Plan (scheduled, not yet active) -->
          <div
            v-if="currentPlan.pending_plan"
            class="bg-[#FFF8EA] border border-[#D9B98D] rounded-2xl p-6 md:p-8 shadow-sm"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEDFC4] pb-6 mb-6">
              <div>
                <span class="inline-flex items-center gap-1.5 font-sans text-xs uppercase font-bold text-[#8F5B12] tracking-wider mb-2">
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

            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-6">
              <button
                v-if="canPayNextTerm"
                @click="payNextTerm"
                class="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-lg bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors shadow-sm"
              >
                <Icon name="heroicons:credit-card" class="w-4 h-4" aria-hidden="true" />
                Pay Now
              </button>

              <button
                @click="cancelNextPlan"
                :disabled="cancelling"
                class="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg text-[#A13D3D] font-display font-semibold text-sm hover:bg-[#F9ECEC] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Icon name="heroicons:x-circle" class="w-4 h-4" aria-hidden="true" />
                Remove scheduled switch
              </button>
            </div>

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
              <p v-else class="font-sans text-xs text-[#8B6656]">
                Basic plan access (single branch only, no advanced features).
              </p>
            </div>
          </div>
        </div>

        <!-- Loading — hold the card's place instead of flashing an empty state -->
        <div
          v-else-if="loading"
          class="bg-white border border-[#EEDFC4] rounded-2xl p-6 md:p-8 mb-8 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <span class="sr-only">Loading your subscription…</span>
          <div class="animate-pulse motion-reduce:animate-none" aria-hidden="true">
            <div class="flex justify-between gap-4 border-b border-[#F3E7D2] pb-6 mb-6">
              <div class="space-y-3 flex-1">
                <div class="h-3 w-24 rounded bg-[#F3E7D2]"></div>
                <div class="h-7 w-48 max-w-full rounded bg-[#EEDFC4]"></div>
              </div>
              <div class="h-9 w-24 rounded bg-[#EEDFC4]"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div class="h-16 rounded-xl bg-[#FFFDF9] border border-[#F3E7D2]"></div>
              <div class="h-16 rounded-xl bg-[#FFFDF9] border border-[#F3E7D2]"></div>
            </div>
            <div class="flex gap-2">
              <div class="h-8 w-28 rounded-xl bg-[#F3E7D2]"></div>
              <div class="h-8 w-32 rounded-xl bg-[#F3E7D2]"></div>
            </div>
          </div>
        </div>

        <!-- Load failed — never dressed up as "you have no subscription" -->
        <div
          v-else-if="loadError"
          role="alert"
          class="bg-white border border-[#ECC9C9] rounded-2xl p-6 md:p-8 mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <Icon name="heroicons:exclamation-triangle" class="w-6 h-6 shrink-0 text-[#A13D3D]" aria-hidden="true" />
          <div class="flex-1">
            <h2 class="font-display text-lg font-bold text-[#3B1F0E]">We couldn't load your subscription</h2>
            <p class="font-sans text-sm text-[#7D5A50] mt-1">
              This is a connection problem, not a change to your plan. Your subscription and payments are unaffected.
            </p>
          </div>
          <button
            @click="loadOwnerSubscription"
            class="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3B1F0E]/50"
          >
            <Icon name="heroicons:arrow-path" class="w-4 h-4" aria-hidden="true" />
            Try again
          </button>
        </div>

        <!-- Term Ended — pick up where the owner left off -->
        <div
          v-else-if="renewalOffer"
          class="bg-[#FFF8EA] border border-[#D9B98D] rounded-2xl p-6 md:p-8 mb-8 shadow-sm"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEDFC4] pb-6 mb-6">
            <div>
              <span class="inline-flex items-center gap-1.5 font-sans text-xs uppercase font-bold text-[#8F5B12] tracking-wider mb-2">
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
              class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors shadow-sm"
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
        <div v-else class="bg-[#FFFDF9] border border-[#EEDFC4] rounded-2xl p-8 md:p-12 mb-8 text-center flex flex-col items-center">
          <div class="w-16 h-16 bg-white rounded-xl border border-[#EDD8CC] flex items-center justify-center mb-5">
            <Icon name="heroicons:building-storefront" class="w-8 h-8 text-[#3B1F0E]" aria-hidden="true" />
          </div>

          <h2 class="font-display text-2xl font-bold text-[#3B1F0E] mb-3">
            Ready to grow your coffee empire?
          </h2>
          <p class="font-sans text-base text-[#7D5A50] max-w-lg mx-auto mb-6">
            You're currently on the basic free tier. Upgrade your plan today to unlock the full potential of Brewspot and streamline your operations.
          </p>

          <div class="flex flex-wrap justify-center gap-2 mb-8">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#EDD8CC] text-sm font-medium text-[#3D2B24]">
              <Icon name="heroicons:map" class="w-4 h-4 text-[#B8752F]" aria-hidden="true" /> Multi-branch Management
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#EDD8CC] text-sm font-medium text-[#3D2B24]">
              <Icon name="heroicons:chart-bar" class="w-4 h-4 text-[#B8752F]" aria-hidden="true" /> Advanced Analytics
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#EDD8CC] text-sm font-medium text-[#3D2B24]">
              <Icon name="heroicons:users" class="w-4 h-4 text-[#B8752F]" aria-hidden="true" /> Staff Roles
            </span>
          </div>

          <button
            @click="viewMode = 'browse'"
            class="inline-flex items-center gap-2 min-h-11 px-6 rounded-xl bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors shadow-sm"
          >
            <Icon name="heroicons:sparkles" class="w-5 h-5" aria-hidden="true" />
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

        <!-- Where the owner stands, so no button label has to be decoded from memory -->
        <div
          v-if="currentPlan"
          class="max-w-6xl mx-auto mb-8 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-white border border-[#EEDFC4] px-5 py-3 font-sans text-sm text-[#7D5A50]"
        >
          <span>
            You're on <strong class="text-[#3B1F0E]">{{ currentPlan.plan?.sub_name }}</strong>
            <span class="text-[#8B6656]">· {{ cycleLabel(currentPlan.billing_cycle) }}</span>
          </span>
          <span>
            {{ isCancelled ? 'Ends' : 'Runs until' }}
            <strong class="text-[#3B1F0E]">{{ formatDate(currentPlan.end_date) }}</strong>
          </span>
          <span v-if="hasScheduledChange">
            Switching to <strong class="text-[#3B1F0E]">{{ currentPlan.pending_plan?.sub_name }}</strong>
            on {{ formatDate(currentPlan.end_date) }}
          </span>
        </div>

        <!-- Monthly / Yearly Toggle -->
        <div class="flex justify-center mb-10 relative">
          <div class="inline-flex p-1 bg-white border border-[#EDD8CC] rounded-full shadow-sm relative">
            
            <!-- Inner container for the slider to match button dimensions exactly -->
            <div class="absolute inset-1 pointer-events-none">
              <div 
                class="w-1/2 h-full bg-[#3B1F0E] rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none shadow-sm"
                :class="browseBillingCycle === 'monthly' ? 'translate-x-0' : 'translate-x-full'"
              ></div>
            </div>
            
            <!-- Buttons wrapper to enforce equal widths -->
            <div class="relative z-10 grid grid-cols-2 w-full sm:min-w-[320px]" role="group" aria-label="Billing cycle">
              <button
                type="button"
                :aria-pressed="browseBillingCycle === 'monthly'"
                class="min-h-11 px-4 sm:px-6 py-2.5 rounded-full font-display text-sm font-semibold transition-colors"
                :class="browseBillingCycle === 'monthly' ? 'text-white' : 'text-[#7D5A50] hover:text-[#3B1F0E]'"
                @click="browseBillingCycle = 'monthly'"
              >
                Monthly
              </button>
              <button
                type="button"
                :aria-pressed="browseBillingCycle === 'yearly'"
                class="min-h-11 px-4 sm:px-6 py-2.5 rounded-full font-display text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                :class="browseBillingCycle === 'yearly' ? 'text-white' : 'text-[#7D5A50] hover:text-[#3B1F0E]'"
                @click="browseBillingCycle = 'yearly'"
              >
                <span>Yearly</span>
                <span
                  v-if="yearlySavings"
                  class="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#FFF8EA] text-[#3B1F0E] text-xs font-bold tracking-wider"
                  :class="browseBillingCycle === 'yearly' ? 'bg-white/20 text-white shadow-inner' : ''"
                >
                  SAVE {{ yearlySavings.varies ? 'UP TO ' : '' }}{{ yearlySavings.percent }}%
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State for Plans -->
        <div v-if="loading" class="flex justify-center py-20" role="status">
          <span class="sr-only">Loading plans…</span>
          <Icon name="heroicons:arrow-path" class="w-8 h-8 text-[#9E7060] animate-spin motion-reduce:animate-pulse" aria-hidden="true" />
        </div>

        <!-- Plans failed to load -->
        <div
          v-else-if="plansError && !availablePlans.length"
          role="alert"
          class="max-w-xl mx-auto bg-white border border-[#ECC9C9] rounded-2xl p-6 text-center"
        >
          <p class="font-sans text-sm text-[#7D5A50] mb-4">We couldn't load the available plans. Check your connection and try again.</p>
          <button
            @click="loadOwnerSubscription"
            class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold hover:bg-[#2A150A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3B1F0E]/50"
          >
            <Icon name="heroicons:arrow-path" class="w-4 h-4" aria-hidden="true" />
            Try again
          </button>
        </div>

        <!-- Plans Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          <div 
            v-for="plan in availablePlans" 
            :key="plan.uuid"
            class="relative flex flex-col bg-white rounded-3xl border p-8 shadow-sm hover:shadow-md transition-shadow duration-200"
            :class="isCurrentPlan(plan) ? 'border-[#3B1F0E]' : 'border-[#EDD8CC]'"
          >
            <!-- Plan Header -->
            <div class="mb-6">
              <div class="flex items-center justify-between gap-3 mb-2">
                <h2 class="font-display text-xl font-bold text-[#3B1F0E]">{{ plan.sub_name }}</h2>
                <span
                  v-if="isCurrentPlan(plan)"
                  class="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold text-xs"
                >
                  Your plan
                </span>
                <span
                  v-else-if="isScheduledPlan(plan)"
                  class="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#FFF8EA] border border-[#D9B98D] text-[#8F5B12] font-display font-semibold text-xs"
                >
                  Up next
                </span>
              </div>
              <p class="font-sans text-sm text-[#8B6656] min-h-[40px]">{{ plan.description || 'Access basic management features for your cafe.' }}</p>
            </div>
            
            <!-- Price -->
            <div class="mb-8">
              <div class="flex items-baseline gap-1">
                <span class="font-display text-4xl font-bold text-[#3B1F0E]">₱{{ getDisplayPrice(plan, browseBillingCycle) }}</span>
                <span class="font-sans text-sm text-[#8B6656] font-medium">/ {{ browseBillingCycle === 'yearly' ? 'year' : 'month' }}</span>
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
              class="w-full mt-8 min-h-11 py-3 rounded-xl font-display font-semibold text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3B1F0E]/50"
              :class="
                planButtonDisabled(plan)
                  ? 'bg-[#EEDFC4] text-[#7D5A50] cursor-not-allowed'
                  : 'bg-white text-[#3B1F0E] border border-[#3B1F0E] hover:bg-[#3B1F0E] hover:text-[#FDF3E7]'
              "
              :disabled="planButtonDisabled(plan)"
            >
              {{ planButtonLabel(plan) }}
            </button>
          </div>
        </div>
      </div>

    </main>

    <ConfirmDialog
      :open="pendingCancel !== null"
      :title="cancelDialog.title"
      :message="cancelDialog.message"
      :confirm-label="cancelDialog.confirmLabel"
      :cancel-label="cancelDialog.cancelLabel"
      :danger="pendingCancel === 'current'"
      :loading="cancelling"
      @confirm="confirmCancel"
      @cancel="pendingCancel = null"
    >
      <ul v-if="cancelDialog.consequences.length" class="space-y-2 font-sans text-sm text-[#3B1F0E]/80">
        <li v-for="line in cancelDialog.consequences" :key="line" class="flex items-start gap-2">
          <Icon name="heroicons:check-circle" class="w-5 h-5 shrink-0 text-[#28A745]" aria-hidden="true" />
          <span>{{ line }}</span>
        </li>
      </ul>
    </ConfirmDialog>

    <!-- Outcome messages. The live region is always mounted so screen readers pick up the text. -->
    <div
      class="fixed bottom-4 left-4 right-4 md:left-[calc(289px+1rem)] z-[60] flex justify-center pointer-events-none"
      :aria-live="notice?.kind === 'error' ? 'assertive' : 'polite'"
      aria-atomic="true"
    >
      <!-- Arrives with a short rise and fade; reduced motion keeps the fade and drops the rise. -->
      <Transition
        enter-active-class="transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
        enter-from-class="opacity-0 translate-y-2 motion-reduce:translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
      <div
        v-if="notice"
        class="pointer-events-auto w-full max-w-md flex items-start gap-3 rounded-xl bg-white p-4 font-sans text-sm text-[#3B1F0E] shadow-lg shadow-[#3B1F0E]/15 border"
        :class="notice.kind === 'error' ? 'border-[#ECC9C9]' : 'border-[#D9B98D]'"
        @mouseenter="pauseNoticeTimer"
        @mouseleave="startNoticeTimer"
        @focusin="pauseNoticeTimer"
        @focusout="startNoticeTimer"
      >
        <Icon
          :name="notice.kind === 'error' ? 'heroicons:exclamation-circle' : notice.kind === 'info' ? 'heroicons:information-circle' : 'heroicons:check-circle'"
          class="w-5 h-5 shrink-0 mt-0.5"
          :class="notice.kind === 'error' ? 'text-[#A13D3D]' : notice.kind === 'info' ? 'text-[#B8752F]' : 'text-[#28A745]'"
          aria-hidden="true"
        />
        <p class="flex-1 leading-relaxed">{{ notice.message }}</p>
        <button
          type="button"
          @click="dismissNotice"
          aria-label="Dismiss message"
          class="shrink-0 -m-3.5 p-3.5 rounded-lg text-[#7D5A50] hover:bg-[#F3E7D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1F0E]/40"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      </Transition>
    </div>

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
