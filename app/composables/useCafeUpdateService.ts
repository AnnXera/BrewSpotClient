import { CafeUpdateService } from '~/services/CafeUpdateService'
import { useApi } from './useApi'

export function useCafeUpdateService() {
    return new CafeUpdateService(useApi())
}
