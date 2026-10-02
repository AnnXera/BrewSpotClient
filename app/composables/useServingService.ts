import { ServingService } from '~/services/ServingService'
import { useApi } from './useApi'

export function useServingService(scope: 'owner' | 'manager' = 'manager') {
    return new ServingService(useApi(), scope)
}
