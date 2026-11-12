import { ref, watch, type Ref } from 'vue'
import type { AnalyticsFilters } from '~/services/OwnerAnalyticsService'
import { planLockFromError, type PlanLock } from '~/utils/planLock'

// Loads one Analytics tab and reloads it when the filters change. A response for
// filters the owner already moved past is dropped, so the newest one always wins.
export function useAnalyticsTab<T extends { success: boolean }>(
    filters: Ref<AnalyticsFilters>,
    fetcher: (f: AnalyticsFilters) => Promise<T>,
) {
    const data = ref<T | null>(null) as Ref<T | null>
    const loading = ref(true)     // nothing loaded yet
    const refreshing = ref(false) // reloading with data on screen
    const error = ref<'' | 'failed' | 'locked'>('')
    const lock = ref<PlanLock | null>(null) // why it's locked: not on the plan, or expired

    let requestId = 0

    async function load() {
        const id = ++requestId
        if (data.value) refreshing.value = true
        error.value = ''

        try {
            const res = await fetcher({ ...filters.value })
            if (id !== requestId) return
            if (res?.success) data.value = res
            else error.value = 'failed'
        } catch (err: any) {
            if (id !== requestId) return
            lock.value = planLockFromError(err)
            error.value = lock.value ? 'locked' : 'failed'
        } finally {
            if (id === requestId) {
                loading.value = false
                refreshing.value = false
            }
        }
    }

    // Compare by value: a new filters object with the same dates and branch is not a reload.
    watch(() => JSON.stringify(filters.value), load, { immediate: true })

    return { data, loading, refreshing, error, lock, reload: load }
}
