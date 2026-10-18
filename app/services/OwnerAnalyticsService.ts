//app/services/OwnerAnalyticsService.ts
import { BaseService } from './BaseService'
import type { SpoilageReason } from './PosService'

// Owner Analytics page: one call per tab. Dates are Y-m-d and inclusive;
// no branch means every branch combined.
export interface AnalyticsFilters {
    from: string
    to: string
    branch?: string | null
}

export interface AnalyticsFiltersOut {
    from: string
    to: string
    days: number
    previous_from: string
    previous_to: string
    branch: { uuid: string; name: string } | null
}

export interface AnalyticsSales {
    success: boolean
    filters: AnalyticsFiltersOut
    summary: {
        revenue: number
        orders: number
        avg_order_value: number
        items_sold: number
        discounts: number
        discounted_orders: number
        voided_orders: number
        voided_amount: number
        previous: { revenue: number; orders: number; avg_order_value: number }
        change: { revenue: number | null; orders: number | null; avg_order_value: number | null } // null: nothing to compare
    }
    granularity: 'day' | 'week' | 'month'
    series: { start: string; end: string; revenue: number; orders: number }[]
    heatmap: { orders: number; revenue: number }[][] // [weekday 0 = Sunday][hour]
    payments: { method: string; orders: number; amount: number; share: number }[]
    discounts: { type: string; orders: number; amount: number }[]
}

export interface AnalyticsMenuItem {
    uuid: string
    name: string
    category: string
    orders: number
    quantity: number
    sales: number
    sales_share: number
    order_share: number
    previous_quantity: number
    change: number | null
}

export interface AnalyticsMenu {
    success: boolean
    filters: AnalyticsFiltersOut
    summary: { items_sold: number; distinct_items: number; sales: number }
    items: AnalyticsMenuItem[]
    not_selling: { uuid: string; name: string; category: string }[]
    categories: { uuid: string | null; name: string; orders: number; quantity: number; sales: number; order_share: number; sales_share: number }[]
    sizes: { name: string; quantity: number; sales: number; share: number }[]
    addons: { name: string; quantity: number; sales: number; attach_rate: number }[]
}

export interface AnalyticsBranch {
    uuid: string
    name: string
    branch_type: string
    status: string
    revenue: number
    orders: number
    avg_order_value: number
    share: number
    previous_revenue: number
    change: number | null
}

export interface AnalyticsBranches {
    success: boolean
    filters: AnalyticsFiltersOut
    branches: AnalyticsBranch[]
}

export interface AnalyticsOperations {
    success: boolean
    filters: AnalyticsFiltersOut
    staff: { uuid: string | null; name: string; position: string | null; branch: string | null; orders: number; revenue: number; avg_order_value: number; discounts: number }[]
    waste: {
        summary: {
            expected: number
            sold: number
            spoilage: number
            spoilage_value: number // pesos at each entry's size price when logged; base price for older spoilage
            spoilage_change: number | null // % vs the previous period, null when it had none
            sell_through: number | null
            spoilage_rate: number | null
            sold_out_days: number
        }
        // Adds up to summary.spoilage; 'unspecified' covers entries without a reason.
        reasons: { reason: SpoilageReason | 'unspecified'; quantity: number; share: number }[]
        voided: { entries: number; quantity: number } // logged by mistake and voided, not counted
        items: { uuid: string; name: string; removed: boolean; expected: number; sold: number; spoilage: number; spoilage_value: number; sold_out_days: number; days: number; sell_through: number | null }[]
    }
    ingredients: { name: string; unit: string; quantity: number; items: number }[]
    reservations: {
        total: number
        by_status: { status: string; count: number }[]
        guests: number
        avg_party: number
        no_show_rate: number | null
        cancel_rate: number | null
        by_weekday: { weekday: number; count: number }[]
        // Pending and confirmed bookings from now on; ignores the period, which always ends today.
        upcoming: {
            days: number
            total: number
            guests: number
            pending: number
            next: { uuid: string; date: string; party_size: number; status: 'pending' | 'confirmed'; table: string; branch: string }[]
        }
    }
}

export class OwnerAnalyticsService extends BaseService {
    getSales(filters: AnalyticsFilters) {
        return this.get<AnalyticsSales>('/owner/analytics/sales', params(filters))
    }

    getMenu(filters: AnalyticsFilters) {
        return this.get<AnalyticsMenu>('/owner/analytics/menu', params(filters))
    }

    // Always every branch; the branch filter does not apply.
    getBranches(filters: AnalyticsFilters) {
        return this.get<AnalyticsBranches>('/owner/analytics/branches', params({ ...filters, branch: null }))
    }

    getOperations(filters: AnalyticsFilters) {
        return this.get<AnalyticsOperations>('/owner/analytics/operations', params(filters))
    }
}

function params(f: AnalyticsFilters): Record<string, string> {
    const p: Record<string, string> = { from: f.from, to: f.to }
    if (f.branch) p.branch = f.branch
    return p
}
