import { BaseService } from './BaseService'

export interface OwnerListItem {
    uuid: string
    name: string
    cafe_name: string | null
    email: string
    phone_number: string | null
    status: string
    subscription: string | null
    date_joined: string | null
}

export interface Paginated<T> {
    current_page: number
    data: T[]
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
}

export interface OwnerStats {
    total_owners: number
    active: number
    suspended: number
    inactive: number
    inactive_or_suspended: number
}

interface ListOwnersParams {
    per_page?: number
    page?: number
    search?: string
    status?: string
    date?: string
}

export class OwnerManagementService extends BaseService {
    stats() {
        return this.get<{ success: boolean; stats: OwnerStats }>('/admin/owners/stats')
    }

    list(params: ListOwnersParams = {}) {
        return this.get<{ success: boolean; owners: Paginated<OwnerListItem> }>('/admin/owners', params)
    }

    show(uuid: string) {
        return this.get<{ success: boolean; owner: any; cafes: any[] }>(`/admin/owners/${uuid}`)
    }

    updateStatus(uuid: string, status: string) {
        return this.patch<{ success: boolean; message: string }>(`/admin/owners/${uuid}/status`, { status })
    }
}