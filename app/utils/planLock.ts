// app/utils/planLock.ts
// Reads the 403 the API returns for a plan-gated endpoint (see EnsurePlanHasFeature on the server).
import type { GateReason } from '~/composables/useSubscriptionGate'

export interface PlanLock {
  reason: GateReason
  feature: string
  featureName: string
}

const REASONS: GateReason[] = ['feature_not_in_plan', 'subscription_expired', 'no_subscription']

/** The plan lock behind an API error, or null when the error is something else. */
export function planLockFromError(error: any): PlanLock | null {
  const status = error?.response?.status ?? error?.status ?? error?.statusCode
  const data = error?.data ?? error?.response?._data
  if (status !== 403 || !data?.required_feature) return null

  const feature = String(data.required_feature)
  return {
    reason: (REASONS as string[]).includes(data.reason) ? data.reason : 'feature_not_in_plan',
    feature,
    featureName: data.feature_name || feature.replace(/_/g, ' ').replace(/^./, (c: string) => c.toUpperCase()),
  }
}
