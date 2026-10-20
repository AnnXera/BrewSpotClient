import type { ApiNotification } from '~/services/NotificationService'
import { useNotificationService } from './useNotificationService'

export interface AppNotification {
    id: string
    title: string
    body?: string
    createdAt: string // ISO timestamp
    read: boolean
    to?: string // route to open when the notification is clicked
    icon?: string // heroicons name, without the "heroicons:" prefix
}

// Where each kind of server notification links to, and the icon it shows.
function fromApi(n: ApiNotification): AppNotification {
    const approvalLink = n.approval_uuid ? `/admin/approvals?uuid=${n.approval_uuid}` : '/admin/approvals'
    const byKind: Record<string, Pick<AppNotification, 'to' | 'icon'>> = {
        owner_application: { to: approvalLink, icon: 'user-plus' },
        branch_submission: { to: approvalLink, icon: 'building-storefront' },
    }

    return {
        id: n.id,
        title: n.title,
        body: n.body ?? undefined,
        createdAt: n.created_at,
        read: n.read,
        ...(n.kind ? byKind[n.kind] : {}),
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
