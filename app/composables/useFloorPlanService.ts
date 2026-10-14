import { FloorPlanService } from '~/services/FloorPlanService'
import { useApi } from './useApi'

export function useFloorPlanService(scope: 'owner' | 'manager' = 'manager') {
    return new FloorPlanService(useApi(), scope)
}
