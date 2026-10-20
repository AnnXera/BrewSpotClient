//app/services/NotificationService.ts
import { BaseService } from './BaseService'

export type NotificationKind = 'owner_application' | 'branch_submission'

export interface ApiNotification {
    id: string
    kind: NotificationKind | null
    title: string
    body: string | null
    approval_uuid: string | null
    read: boolean
    created_at: string
}

export interface NotificationListResponse {
    success: boolean
    notifications: ApiNotification[]
    unread_count: number
}

export class NotificationService extends BaseService {
    list() {
        return this.get<NotificationListResponse>('/notifications')
    }

    markRead(id: string) {
        return this.post<{ success: boolean; unread_count: number }>(`/notifications/${id}/read`)
    }

    markAllRead() {
        return this.post<{ success: boolean; unread_count: number }>('/notifications/read-all')
    }
}
