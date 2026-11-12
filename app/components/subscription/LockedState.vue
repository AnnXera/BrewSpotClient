<!-- app/components/subscription/LockedState.vue -->
<!-- Shown in place of a page or panel the subscription doesn't cover. Owners get an upgrade or
     renew button; managers and other staff are told it's the cafe's plan and to ask the owner. -->
<script setup lang="ts">
import type { PlanLock } from '~/utils/planLock'

const props = withDefaults(
  defineProps<{
    lock: PlanLock
    /** 'staff' for managers/cashiers: wording speaks about the cafe and there is no button. */
    audience?: 'owner' | 'staff'
    /** What the feature does, shown after the main sentence when the plan lacks it. */
    description?: string
    compact?: boolean
  }>(),
  { audience: 'owner', description: '', compact: false },
)

const copy = computed(() => {
  const { reason, featureName } = props.lock
  const owner = props.audience === 'owner'
  const extra = props.description ? ` ${props.description}` : ''

  if (reason === 'subscription_expired') {
    return owner
      ? { icon: 'heroicons:clock', title: 'Your subscription has expired', text: `Renew your subscription to use ${featureName} again.`, cta: 'Renew subscription' }
      : { icon: 'heroicons:clock', title: "Your cafe's subscription has expired", text: `${featureName} is unavailable until the cafe owner renews the subscription.`, cta: '' }
  }
  if (reason === 'no_subscription') {
    return owner
      ? { icon: 'heroicons:credit-card', title: 'No active subscription', text: `Choose a plan to start using ${featureName}.`, cta: 'Choose a plan' }
      : { icon: 'heroicons:credit-card', title: 'Your cafe has no active subscription', text: `${featureName} is unavailable until the cafe owner subscribes to a plan.`, cta: '' }
  }
  return owner
    ? { icon: 'heroicons:lock-closed', title: `${featureName} isn't on your plan`, text: `Switch to a plan that includes ${featureName}.${extra}`, cta: 'View plans' }
    : { icon: 'heroicons:lock-closed', title: `Your cafe doesn't have ${featureName}`, text: `The cafe's current plan doesn't include ${featureName}. Ask the cafe owner to upgrade the plan.`, cta: '' }
})
</script>

<template>
  <div
    class="rounded-[22px] border border-[#EEDFC4] bg-white text-center"
    :class="compact ? 'px-5 py-6' : 'px-6 py-10'"
  >
    <Icon :name="copy.icon" class="mx-auto h-8 w-8 text-[#B4846C]" />
    <h2 class="mt-3 font-display text-lg font-semibold text-[#3B1F0E] text-balance">{{ copy.title }}</h2>
    <p class="mx-auto mt-1 max-w-sm text-sm text-[#8B6656]">{{ copy.text }}</p>
    <NuxtLink
      v-if="audience === 'owner'"
      to="/owner/subscription"
      class="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7D5A50] px-4 py-2.5 text-sm font-semibold text-[#FFF0D1] transition-colors hover:bg-[#684940] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] focus-visible:ring-offset-2"
    >
      {{ copy.cta }}
    </NuxtLink>
  </div>
</template>
