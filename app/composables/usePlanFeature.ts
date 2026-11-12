// app/composables/usePlanFeature.ts
import type { SubscriptionItem } from '~/services/SubscriptionService'

export function usePlanFeature() {
  const subService = useSubscriptionService()
  const currentPlan = useState<SubscriptionItem | null>('owner_active_subscription', () => null)
  // True when the owner has no running term but had one before (the API sends a renewal offer).
  const hadSubscription = useState<boolean>('owner_sub_lapsed', () => false)
  const isLoaded = useState<boolean>('owner_sub_loaded', () => false)
  const isLoading = useState<boolean>('owner_sub_loading', () => false)

  async function fetchCurrentSubscription(force = false, silent = false) {
    if (isLoaded.value && !force) return currentPlan.value

    if (!silent) isLoading.value = true

    try {
      const res = await subService.getCurrentPlan()
      if (res?.success && res.subscription) {
        currentPlan.value = res.subscription
        hadSubscription.value = true
      } else {
        currentPlan.value = null
        hadSubscription.value = !!res?.renewal_offer
      }
    } catch (e: any) {
      // No running term comes back as a 404 that may still carry the renewal offer.
      currentPlan.value = null
      hadSubscription.value = !!e?.data?.renewal_offer
    } finally {
      isLoaded.value = true
      if (!silent) isLoading.value = false
    }
    return currentPlan.value
  }

  function hasFeature(featureKey: string): boolean {
    const sub = currentPlan.value
    const plan = sub?.plan
    if (!plan || !plan.features) return false
    // A term past its end date that the expiry job hasn't swept yet no longer grants features.
    if (sub?.end_date && new Date(sub.end_date).getTime() < Date.now()) return false

    if (Array.isArray(plan.features)) {
      return plan.features.includes(featureKey)
    }

    if (typeof plan.features === 'object' && plan.features !== null) {
      return Boolean((plan.features as Record<string, boolean>)[featureKey])
    }

    return false
  }

  return {
    currentPlan,
    hadSubscription,
    isLoading,
    isLoaded,
    fetchCurrentSubscription,
    hasFeature,
  }
}
