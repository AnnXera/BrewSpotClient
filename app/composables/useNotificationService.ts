import { NotificationService } from '~/services/NotificationService'
import { useApi } from './useApi'

export function useNotificationService() {
    return new NotificationService(useApi())
}
