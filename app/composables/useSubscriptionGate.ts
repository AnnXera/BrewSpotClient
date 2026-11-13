// app/composables/useSubscriptionGate.ts
// One popup for plan-locked actions the user clicked: "upgrade" when the plan lacks a feature,
// "renew" when the subscription has lapsed. Opened by the API wrappers when a change
// (POST/PATCH/PUT/DELETE) comes back 403 with `required_feature`, or up front with
// requireFeature() before an action. Page loads never open it; pages show a locked card.

export type GateReason = 'feature_not_in_plan' | 'subscription_expired' | 'no_subscription'

interface GateState {
  open: boolean
  reason: GateReason
  feature: string
  featureName: string
  message: string
}

interface GatePayload {
  reason?: string
  required_feature?: string
  feature_name?: string
  message?: string
}

const REASONS: GateReason[] = ['feature_not_in_plan', 'subscription_expired', 'no_subscription']

function prettify(key: string) {
  const s = key.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function useSubscriptionGate() {
  const state = useState<GateState>('subscription_gate', () => ({
    open: false,
    reason: 'feature_not_in_plan',
    feature: '',
    featureName: '',
    message: '',
  }))

  function show(payload: GatePayload) {
    const feature = payload.required_feature ?? ''
    const reason = (REASONS as string[]).includes(payload.reason ?? '')
      ? (payload.reason as GateReason)
      : 'feature_not_in_plan'

    state.value = {
      open: true,
      reason,
      feature,
      featureName: payload.feature_name || (feature ? prettify(feature) : 'this feature'),
      message: payload.message ?? '',
    }
  }

  function close() {
    state.value = { ...state.value, open: false }
  }

  /**
   * Checks the owner's cached plan before an action. Returns true when allowed; otherwise
   * opens the popup and returns false.
   */
  function requireFeature(featureKey: string, featureName?: string): boolean {
    const { hasFeature, currentPlan, hadSubscription, isLoaded } = usePlanFeature()
    // Plan not fetched yet: let the action through; the API still enforces the plan.
    if (!isLoaded.value || hasFeature(featureKey)) return true

    let reason: GateReason = 'feature_not_in_plan'
    if (!currentPlan.value) reason = hadSubscription.value ? 'subscription_expired' : 'no_subscription'
    show({ reason, required_feature: featureKey, feature_name: featureName })
    return false
  }

  return { state, show, close, requireFeature }
}
