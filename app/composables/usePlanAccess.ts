// app/composables/usePlanAccess.ts
// Which plan features the signed-in user's cafe can use (GET /plan-access). Works for owners
// and staff alike, so a page can show a locked card up front instead of waiting for a 403.
import type { GateReason } from '~/composables/useSubscriptionGate'
import type { PlanLock } from '~/utils/planLock'

type AccessMap = Record<string, { name: string; reason: GateReason | null }>

export function usePlanAccess() {
  const access = useState<AccessMap | null>('plan_access', () => null)
  const api = useApi()

  async function refresh() {
    try {
      const res = await api<{ success: boolean; features: AccessMap }>('/plan-access')
      if (res?.success) access.value = res.features
    } catch {
      // Unknown access: show the content and let the API decide.
    }
  }

  /** The lock on a feature, or null when it's usable or not known yet. */
  function lockFor(feature: string): PlanLock | null {
    const entry = access.value?.[feature]
    if (!entry?.reason) return null
    return { reason: entry.reason, feature, featureName: entry.name }
  }

  return { access, refresh, lockFor }
}
