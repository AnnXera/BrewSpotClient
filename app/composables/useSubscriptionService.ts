import { SubscriptionService } from '~/services/SubscriptionService'
import { useApi } from './useApi'

export function useSubscriptionService() {
    return new SubscriptionService(useApi())
}
