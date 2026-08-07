import { OwnerManagementService } from '~/services/OwnerManagementService'
import { useApi } from './useApi'

export function useOwnerManagementService() {
    return new OwnerManagementService(useApi())
}