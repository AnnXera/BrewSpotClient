import type { ApiNotification, NotificationKind } from '~/services/NotificationService'
import { useNotificationService } from './useNotificationService'

export interface AppNotification {
    id: string
    title: string
    body?: string
    createdAt: string // ISO timestamp
    read: boolean
    to?: string // route to open when the notification is clicked
    icon?: string // heroicons name, without the "heroicons:" prefix
    tone?: NotificationTone
}

export type NotificationTone = 'neutral' | 'good' | 'warning' | 'bad'

// The icon and tone each kind of server notification shows.
const KIND_STYLE: Record<NotificationKind, { icon: string; tone: NotificationTone }> = {
    owner_application: { icon: 'user-plus', tone: 'neutral' },
    branch_submission: { icon: 'building-storefront', tone: 'neutral' },

    account_approved: { icon: 'check-badge', tone: 'good' },
    account_rejected: { icon: 'x-circle', tone: 'bad' },
    account_suspended: { icon: 'no-symbol', tone: 'bad' },
    account_reactivated: { icon: 'arrow-path', tone: 'good' },
    branch_approved: { icon: 'building-storefront', tone: 'good' },
    branch_rejected: { icon: 'building-storefront', tone: 'bad' },

    payment_received: { icon: 'banknotes', tone: 'good' },
    payment_failed: { icon: 'exclamation-triangle', tone: 'bad' },
    plan_change_scheduled: { icon: 'arrows-right-left', tone: 'neutral' },
    subscription_cancelled: { icon: 'x-circle', tone: 'warning' },
    subscription_expiring: { icon: 'clock', tone: 'warning' },
    renewal_open: { icon: 'calendar-days', tone: 'neutral' },
    subscription_expired: { icon: 'exclamation-circle', tone: 'bad' },
}

function fromApi(n: ApiNotification): AppNotification {
    // Admin approval notices carry the approval; owner notices carry their own link.
    const to = n.link
        ?? (n.kind === 'owner_application' || n.kind === 'branch_submission'
            ? (n.approval_uuid ? `/admin/approvals?uuid=${n.approval_uuid}` : '/admin/approvals')
            : undefined)

    return {
        id: n.id,
        title: n.title,
        body: n.body ?? undefined,
        createdAt: n.created_at,
        read: n.read,
        to,
        ...(n.kind && KIND_STYLE[n.kind] ? KIND_STYLE[n.kind] : {}),
    }
}

/**
 * Notifications shown under the bell in the navbar, loaded from /notifications.
 * Shared state, so the desktop and mobile bells stay in sync; NavBar calls refresh()
 * on mount and on an interval.
 */
export function useNotifications() {
    const notifications = useState<AppNotification[]>('app-notifications', () => [])
    const service = useNotificationService()

    const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

    async function refresh() {
        const res = await service.list()
        if (res.success) notifications.value = res.notifications.map(fromApi)
    }

    // Optimistic: the bell updates at once, and the next refresh corrects it if the request failed.
    async function markRead(id: string) {
        const item = notifications.value.find(n => n.id === id)
        if (!item || item.read) return
        item.read = true
        try {
            await service.markRead(id)
        } catch (e) {
            console.warn('Failed to mark notification as read', e)
        }
    }

    async function markAllRead() {
        if (!unreadCount.value) return
        notifications.value.forEach(n => { n.read = true })
        try {
            await service.markAllRead()
        } catch (e) {
            console.warn('Failed to mark notifications as read', e)
        }
    }

    return { notifications, unreadCount, refresh, markRead, markAllRead }
}
