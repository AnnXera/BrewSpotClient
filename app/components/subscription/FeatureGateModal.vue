<!-- app/components/subscription/FeatureGateModal.vue -->
<!-- The single popup shown whenever someone reaches a feature their subscription doesn't cover:
     upgrade when the plan lacks it, renew when the subscription has expired. Mounted once in app.vue. -->
<script setup lang="ts">
import DialogShell from '~/components/common/DialogShell.vue'
import { useAuthStore } from '~/stores/auth'

const gate = useSubscriptionGate()
const authStore = useAuthStore()
const route = useRoute()

const isOwner = computed(() => authStore.role === 'Cafe Owner')
// The POS register is used by staff on a device, never by the owner's account.
const isStaffView = computed(() => !isOwner.value || route.path.startsWith('/pos'))

const copy = computed(() => {
  const { reason, featureName } = gate.state.value
  const staff = isStaffView.value

  if (reason === 'subscription_expired') {
    return {
      title: 'Subscription expired',
      icon: 'heroicons:clock',
      tone: 'danger' as const,
      message: staff
        ? `The cafe's subscription has expired, so ${featureName} is unavailable. Ask the cafe owner to renew it.`
        : `Your subscription has expired, so ${featureName} is unavailable. Renew your subscription to keep using it.`,
      cta: 'Renew subscription',
    }
  }
  if (reason === 'no_subscription') {
    return {
      title: 'No active subscription',
      icon: 'heroicons:credit-card',
      tone: 'warn' as const,
      message: staff
        ? `The cafe has no active subscription, so ${featureName} is unavailable. Ask the cafe owner to subscribe.`
        : `You need an active subscription to use ${featureName}. Choose a plan to get started.`,
      cta: 'Choose a plan',
    }
  }
  return {
    title: `${featureName} isn't on your plan`,
    icon: 'heroicons:lock-closed',
    tone: 'warn' as const,
    message: staff
      ? `The cafe's current plan does not include ${featureName}. Ask the cafe owner to upgrade the plan.`
      : `Your current plan does not include ${featureName}. Upgrade your plan to unlock it.`,
    cta: 'Upgrade plan',
  }
})

function goToSubscription() {
  gate.close()
  if (route.path !== '/owner/subscription') navigateTo('/owner/subscription')
}
</script>

<template>
  <DialogShell
    :open="gate.state.value.open"
    :title="copy.title"
    :message="copy.message"
    :tone="copy.tone"
    :icon="copy.icon"
    @close="gate.close()"
  >
    <template #actions>
      <button
        type="button"
        :data-autofocus="isStaffView ? true : undefined"
        class="whitespace-nowrap rounded-[10px] px-4 py-[11px] text-[13px] font-semibold border border-[#EDD8CC] bg-white text-[#3D2B24] hover:bg-[#F6EBDD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] focus-visible:ring-[#7D5A50] transition-colors"
        @click="gate.close()"
      >
        {{ isStaffView ? 'OK' : 'Not now' }}
      </button>
      <button
        v-if="!isStaffView"
        type="button"
        data-autofocus
        class="whitespace-nowrap rounded-[10px] px-4 py-[11px] text-[13px] font-semibold bg-[#3A2923] text-white hover:bg-[#2C1E19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] focus-visible:ring-[#3A2923] transition-colors"
        @click="goToSubscription"
      >
        {{ copy.cta }}
      </button>
    </template>
  </DialogShell>
</template>
