<script setup lang="ts">
import type { RenewalOffer, SubscriptionItem, SubscriptionPlanItem } from '~/services/SubscriptionService'

const subService = useSubscriptionService()

const subscription = ref<SubscriptionItem | null>(null)
const offer = ref<RenewalOffer | null>(null)
const isLoaded = ref(false)

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const isTrialPlan = (plan?: SubscriptionPlanItem | null) => (plan?.sub_name || '').toLowerCase().includes('trial')

// Same deep link the reminder emails use; a trial can't be bought again, so it gets the plan list.
function renewLink(plan: SubscriptionPlanItem | null | undefined, cycle?: string | null) {
  if (!plan || isTrialPlan(plan)) return '/owner/subscription'
  const safeCycle = cycle === 'yearly' ? 'yearly' : 'monthly'
  return { path: '/owner/subscription', query: { renew: plan.uuid, cycle: safeCycle } }
}

const banner = computed(() => {
  const sub = subscription.value

  if (sub) {
    const opensAt = sub.renewal_opens_at ? new Date(sub.renewal_opens_at) : null
    const isOpen = opensAt !== null && Date.now() >= opensAt.getTime()
    if (!isOpen || sub.gateway_subscription_id) return null

    const target = sub.pending_plan ?? (isTrialPlan(sub.plan) ? null : sub.plan)
    const switching = !!sub.pending_plan
    return {
      tone: 'warning' as const,
      title: switching ? `Payment for your ${target?.sub_name} is open` : 'Your subscription is ready to renew',
      message: `Your ${sub.plan?.sub_name ?? 'plan'} ends on ${formatDate(sub.end_date)}. You're not charged automatically, so pay before then to keep access.`,
      action: !target ? 'Choose a Plan' : switching ? `Pay for ${target.sub_name}` : 'Renew Now',
      to: renewLink(target, sub.pending_billing_cycle ?? sub.billing_cycle),
    }
  }

  if (offer.value) {
    const plan = offer.value.plan
    const trial = isTrialPlan(plan)
    return {
      tone: 'danger' as const,
      title: 'Your subscription has expired',
      message: `Your ${offer.value.previous_plan ?? 'plan'} ended${offer.value.ended_on ? ` on ${formatDate(offer.value.ended_on)}` : ''}. Features that depend on your plan are restricted until you subscribe again.`,
      action: trial ? 'Choose a Plan' : `Renew with ${plan.sub_name}`,
      to: renewLink(plan, offer.value.billing_cycle),
    }
  }

  return null
})

onMounted(async () => {
  try {
    const res = await subService.getCurrentPlan()
    subscription.value = res?.success ? res.subscription ?? null : null
    offer.value = res?.success ? null : res?.renewal_offer ?? null
  } catch (e: any) {
    // The API answers "no active subscription" with a non-2xx status but still sends the offer.
    offer.value = e?.data?.renewal_offer ?? null
  } finally {
    isLoaded.value = true
  }
})
</script>

<template>
  <div
    v-if="isLoaded && banner"
    role="status"
    :class="[
      'flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border p-4 sm:p-5',
      banner.tone === 'danger' ? 'bg-[#FDECEC] border-[#F3C4C4]' : 'bg-[#FFF6E0] border-[#F0D9A8]'
    ]"
  >
    <div class="flex items-start gap-3 flex-1 min-w-0">
      <Icon
        :name="banner.tone === 'danger' ? 'heroicons:exclamation-circle' : 'heroicons:bell-alert'"
        :class="['w-6 h-6 shrink-0', banner.tone === 'danger' ? 'text-[#C53030]' : 'text-[#B7791F]']"
        aria-hidden="true"
      />
      <div class="min-w-0">
        <p class="font-display font-bold text-[#3B1F0E]">{{ banner.title }}</p>
        <p class="mt-0.5 text-sm text-[#7D5A50]">{{ banner.message }}</p>
      </div>
    </div>
    <NuxtLink
      :to="banner.to"
      class="shrink-0 inline-flex items-center justify-center h-[42px] px-5 rounded-xl bg-[#7D5A50] text-[#FDF8F3] text-sm font-semibold hover:bg-[#6A4B42] transition-colors"
    >
      {{ banner.action }}
    </NuxtLink>
  </div>
</template>
