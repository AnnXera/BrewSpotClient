import { OwnerAnalyticsService } from '~/services/OwnerAnalyticsService'
import { useApi } from './useApi'

export function useOwnerAnalyticsService() {
    return new OwnerAnalyticsService(useApi())
}
