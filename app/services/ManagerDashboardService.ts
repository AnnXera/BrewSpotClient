// app/services/ManagerDashboardService.ts
import { BaseService } from './BaseService'
import type { DashboardRange, DashboardSeriesPoint, DashboardTrendingItem, DashboardCategory } from './OwnerProfileService'
import type { Paginated } from './OwnerManagementService'

export interface ManagedBranchInfo {
    uuid: string
    branch_name: string
    address?: string | null
    status?: string
}

export interface ManagerReservationItem {
    uuid: string
    customer_name: string
    customer_phone: string | null
    customer_email: string | null
    party_size: number
    reservation_date: string
    reservation_end: string
    table_name: string
    status: string
    notes: string | null
    created_at: string | null
    created_by: string | null
}

export interface ManagerEmployeeItem {
    uuid: string
    name: string
    email: string
    role: string
    status: string
    has_pin: boolean
    is_locked: boolean
    today_shift: string
    is_active: boolean
}

export interface ManagerTransactionItem {
    uuid: string
    receipt_number: string
    created_at: string
    staff_name: string
    total_amount: number
    status: string
    items_count: number
    payment_method: string
    walk_in_note: string | null
}

export interface ManagerDashboardStats {
    success: boolean
    generated_at: string
    branch: {
        uuid: string
        name: string
        address: string | null
        branch_type: string
        status: string
    }
    totals: {
        lifetime_orders: number
        lifetime_revenue: number
        today_orders: number
        today_revenue: number
        active_employees: number
        total_employees: number
        working_today: number
        today_reservations: number
        upcoming_reservations: number
        pending_reservations: number
    }
    period: {
        range: DashboardRange
        from: string
        to: string
        revenue: number
        orders: number
        avg_order_value: number
        previous_revenue: number
        previous_orders: number
        revenue_change: number | null
        orders_change: number | null
    }
    series: DashboardSeriesPoint[]
    trending_items: DashboardTrendingItem[]
    top_categories: DashboardCategory[]
    reservations: {
        summary: {
            today_count: number
            upcoming_count: number
            pending_count: number
            confirmed_count: number
            seated_count: number
            completed_count: number
            cancelled_count: number
        }
        upcoming: ManagerReservationItem[]
    }
    employees: {
        summary: {
            total: number
            active: number
            cashiers: number
            working_today: number
        }
        list: ManagerEmployeeItem[]
    }
    recent_transactions: ManagerTransactionItem[]
    peak_hours: {
        from: string
        to: string
        grid: { orders: number; revenue: number }[][] // [weekday 0 = Sunday][hour 0..23]
    }
}

export interface ManagerTransactionDetailItem {
    uuid: string
    menu_name: string
    size_name: string | null
    temperature: string | null // hot or iced, on items sold both ways
    quantity: number
    unit_price: number
    line_total: number
    addons: {
        name: string
        price: number
        quantity: number
    }[]
}

export interface ManagerTransactionDetail {
    uuid: string
    receipt_number: string
    created_at: string
    staff_name: string
    status: string
    walk_in_note: string | null
    subtotal: number
    discount_type: string | null
    discount_amount: number
    total_amount: number
    payment: {
        method: string
        reference_number: string | null
        amount_tendered: number
        change: number
    } | null
    items: ManagerTransactionDetailItem[]
}

export interface ManagerTransactionsResponse {
    success: boolean
    today_stats: {
        total_count: number
        completed_count: number
        void_count: number
        refunded_count: number
        completed_amount: number
    }
    transactions: Paginated<ManagerTransactionItem>
}

export class ManagerDashboardService extends BaseService {
    managedBranches() {
        return this.get<{ success: boolean; branches: ManagedBranchInfo[] }>('/manager/branches')
    }

    getDashboardStats(branchUuid: string, range: DashboardRange = 'daily') {
        return this.get<ManagerDashboardStats>(`/manager/branches/${branchUuid}/dashboard-stats`, { range })
    }

    getTransactions(branchUuid: string, filters: { page?: number; per_page?: number; search?: string; status?: string; from?: string; to?: string } = {}) {
        const params: Record<string, any> = {}
        for (const [key, val] of Object.entries(filters)) {
            if (val !== undefined && val !== null && val !== '') {
                params[key] = val
            }
        }
        return this.get<ManagerTransactionsResponse>(`/manager/branches/${branchUuid}/transactions`, params)
    }

    getTransaction(branchUuid: string, transactionUuid: string) {
        return this.get<{ success: boolean; transaction: ManagerTransactionDetail }>(`/manager/branches/${branchUuid}/transactions/${transactionUuid}`)
    }
}
