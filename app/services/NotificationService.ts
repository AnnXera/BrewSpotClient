//app/services/NotificationService.ts
import { BaseService } from './BaseService'

export type NotificationKind =
    // Admin
    | 'owner_application' | 'branch_submission'
    // Owner: account and branch decisions
    | 'account_approved' | 'account_rejected' | 'account_suspended' | 'account_reactivated'
    | 'branch_approved' | 'branch_rejected'
    // Owner: subscription and billing
    | 'payment_received' | 'payment_failed' | 'plan_change_scheduled' | 'subscription_cancelled'
    | 'subscription_expiring' | 'renewal_open' | 'subscription_expired'

export interface ApiNotification {
    id: string
    kind: NotificationKind | null
    title: string
    body: string | null
    approval_uuid: string | null
    link: string | null // route to open, set by the server for owner notices
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
