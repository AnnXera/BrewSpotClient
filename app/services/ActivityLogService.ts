//app/services/ActivityLogService.ts
import { BaseService } from './BaseService'

// Activity Log pages (owner: whole cafe; manager: one branch): who signed in or out, who used
// a register, and who changed servings, floor plans, employees or the menu. Dates are Y-m-d and inclusive; no branch means every branch.
export type ActivityCategory = 'auth' | 'pos' | 'servings' | 'floor_plans' | 'reservations' | 'employees' | 'menu'
export type ActivityRole = 'owner' | 'manager' | 'cashier'

export interface ActivityLogQuery {
    from: string
    to: string
    branch?: string | null
    category?: ActivityCategory | null
    role?: ActivityRole | null
    search?: string
    page?: number
    per_page?: number
}

export interface ServingChange {
    item: string
    before: { daily_limit: number; enabled: boolean }
    after: { daily_limit: number; enabled: boolean }
}

// One field a reservation edit changed. Contact details (phone, email) come without values.
export interface ReservationChange {
    field: string
    before?: string | null
    after?: string | null
}

export interface ActivityLogRow {
    uuid: string
    created_at: string
    category: ActivityCategory
    // auth.login | auth.logout | pos.unlock | pos.lock | serving.created | serving.updated | serving.deleted | serving.category_saved
    // | floor_plan.created | floor_plan.updated | floor_plan.deleted | floor_plan.layout_saved | floor_plan.activated | floor_plan.deactivated
    // | employee.created | employee.updated | employee.schedule_updated | employee.pin_reset | employee.terminated
    // | menu.item_created | menu.item_updated | menu.item_deleted | menu.item_availability
    // | menu.category_created | menu.category_updated | menu.category_deleted | menu.category_availability
    // | reservation.created | reservation.updated | reservation.cancelled
    action: string
    description: string
    actor: { name: string | null; role: string | null }
    branch: string | null // null: cafe-wide (an owner's sign-in, a menu change)
    device: string | null // register name, for pos.* rows
    ip_address: string | null
    meta: (Record<string, any> & {
        items?: ServingChange[] // serving.category_saved
        before?: Record<string, any> // employee.schedule_updated: day name => "08:00-17:00" | "Day off"
        after?: Record<string, any>
        changes?: ReservationChange[] // reservation.updated
    }) | null
}

export interface ActivityLogResponse {
    success: boolean
    filters: { from: string; to: string; branch: { uuid: string; name: string } | null }
    counts: { all: number } & Record<ActivityCategory, number>
    logs: ActivityLogRow[]
    pagination: { page: number; per_page: number; total: number; last_page: number }
}

export class ActivityLogService extends BaseService {
    // Owner: every branch of the cafe (or one, with `branch`).
    getLogs(query: ActivityLogQuery) {
        return this.get<ActivityLogResponse>('/owner/activity-logs', params(query))
    }

    // Manager: their branch, plus cafe-wide menu changes. `branch` in the query is ignored.
    getBranchLogs(branchUuid: string, query: ActivityLogQuery) {
        return this.get<ActivityLogResponse>(`/manager/branches/${branchUuid}/activity-logs`, params({ ...query, branch: null }))
    }
}

function params(query: ActivityLogQuery) {
    const p: Record<string, string | number> = { from: query.from, to: query.to }
    if (query.branch) p.branch = query.branch
    if (query.category) p.category = query.category
    if (query.role) p.role = query.role
    if (query.search) p.search = query.search
    if (query.page) p.page = query.page
    if (query.per_page) p.per_page = query.per_page
    return p
}
