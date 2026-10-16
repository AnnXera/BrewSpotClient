//app/services/OwnerProfileService.ts
import { BaseService } from './BaseService'
import type { Paginated } from './OwnerManagementService'

// Opening hours as the API sends them. Times are HH:MM; a close time at or
// before the open time means the cafe closes after midnight.
export interface ApiOpeningHour {
    day_of_week: string
    is_closed: boolean
    is_24_hours: boolean
    open_time: string | null
    close_time: string | null
    closes_after_midnight: boolean
}

export type ApiOpeningHourInput = Omit<ApiOpeningHour, 'closes_after_midnight'>

export interface BranchSummary {
    uuid: string
    branch_name: string
    branch_type: string
    address: string | null
    cafe_picture: string | null
    status: string
    phone_number?: string | null
    opening_hours?: any
    seating_capacity?: number
    manager_name?: string
    manager_email?: string
    manager_phone?: string
    amenities?: string[]
}

export interface BranchDocument {
    branch_doc_id: number
    doc_type: string
    download_url: string
    registered_at: string | null
    expired_at: string | null
    tin_number: string | null
    vat: string | null
    uploaded_at: string | null
}

export interface BranchDetail {
    uuid: string
    branch_name: string
    cafe_name?: string | null
    cafe_picture_url: string | null
    cafe_email: string | null
    cafe_phonenumber: string | null
    address: string | null
    branch_type: string
    status: string
    documents?: BranchDocument[]
}

export class OwnerProfileService extends BaseService {
    getBranch(uuid: string) {
        return this.get<{ success: boolean; message?: string; branch?: BranchDetail }>(`/owner/branches/${uuid}`)
    }

    getBranches(perPage = 6, page = 1, search = '', status = '') {
        const params: Record<string, any> = { per_page: perPage, page }
        if (search) params.search = search
        if (status) params.status = status
        return this.get<{ success: boolean; cafe_name: string | null; main_tin_prefix?: string | null; branches: Paginated<BranchSummary> }>('/owner/branches', params)
    }

    createBranch(payload: FormData | Record<string, any>) {
        return this.post<{ success: boolean; message: string; branch?: any }>('/owner/branches', payload)
    }

    // 422 with errors.cafe_email / errors.cafe_phonenumber when either is taken
    checkBranchContact(payload: { cafe_email: string; cafe_phonenumber: string }) {
        return this.post<{ success: boolean }>('/owner/branches/check-contact', payload)
    }

    updateBranch(uuid: string, payload: { status?: string; [key: string]: any }) {
        return this.patch<{ success: boolean; message: string; branch?: any }>(`/owner/branches/${uuid}`, payload)
    }

    // The cafe's week (Monday first). useOperatingHours converts it for the UI.
    getOperatingHours() {
        return this.get<{ success: boolean; data?: ApiOpeningHour[] }>('/owner/opening-hours')
    }

    updateOperatingHours(hours: ApiOpeningHourInput[]) {
        return this.put<{ success: boolean; message: string; data?: ApiOpeningHour[] }>('/owner/opening-hours', { hours })
    }

    // Totals across every branch, plus one range's income series. Trending items,
    // categories and branches cover the same window as the series.
    getDashboardStats(range: DashboardRange = 'daily') {
        return this.get<OwnerDashboardStats>('/owner/dashboard-stats', { range })
    }
}

export type DashboardRange = 'daily' | 'weekly' | 'monthly'

export interface DashboardSeriesPoint {
    start: string // Y-m-d
    end: string
    label: string
    revenue: number
    orders: number
}

export interface DashboardTrendingItem {
    rank: number
    uuid: string
    name: string
    category: string
    picture: string | null
    quantity: number
    sales: number
    share: number
    previous_quantity: number
    change: number | null // null = nothing sold in the previous window
}

export interface DashboardCategory {
    uuid: string | null
    name: string
    quantity: number
    sales: number
    items: number
    share: number
}

export interface DashboardBranch {
    uuid: string
    name: string
    branch_type: string
    status: string
    revenue: number
    orders: number
    share: number
}

export interface OwnerDashboardStats {
    success: boolean
    generated_at: string
    totals: {
        branches: number
        active_branches: number
        pending_branches: number
        orders: number
        revenue: number
        today_revenue: number
        today_orders: number
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
    branches: DashboardBranch[]
}
