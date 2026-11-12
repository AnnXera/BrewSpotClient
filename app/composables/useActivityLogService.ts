import { ActivityLogService } from '~/services/ActivityLogService'
import { useApi } from './useApi'

export function useActivityLogService() {
    return new ActivityLogService(useApi())
}
