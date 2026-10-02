import { StaffService } from '~/services/StaffService'
import { useApi } from './useApi'

export function useStaffService(scope: 'owner' | 'manager' = 'owner') {
    return new StaffService(useApi(), scope)
}
