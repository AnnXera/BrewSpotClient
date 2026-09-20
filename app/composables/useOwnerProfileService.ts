import { OwnerProfileService } from '~/services/OwnerProfileService'
import { useApi } from './useApi'

export function useOwnerProfileService() {
    return new OwnerProfileService(useApi())
}
