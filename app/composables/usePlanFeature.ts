// app/composables/usePlanFeature.ts
import type { SubscriptionItem } from '~/services/SubscriptionService'

export function usePlanFeature() {
  const subService = useSubscriptionService()
  const currentPlan = useState<SubscriptionItem | null>('owner_active_subscription', () => null)
  const isLoaded = useState<boolean>('owner_sub_loaded', () => false)
  const isLoading = useState<boolean>('owner_sub_loading', () => false)

  async function fetchCurrentSubscription(force = false, silent = false) {
    if (isLoaded.value && !force) return currentPlan.value

    if (!silent) isLoading.value = true
    
    try {
      const res = await subService.getCurrentPlan()
      if (res?.success && res.subscription) {
        currentPlan.value = res.subscription
      } else {
        currentPlan.value = null
      }
    } catch {
      currentPlan.value = null
    } finally {
      isLoaded.value = true
      if (!silent) isLoading.value = false
    }
    return currentPlan.value
  }

  function hasFeature(featureKey: string): boolean {
    const plan = currentPlan.value?.plan
    if (!plan || !plan.features) return false

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
    isLoading,
    isLoaded,
    fetchCurrentSubscription,
    hasFeature,
  }
}
