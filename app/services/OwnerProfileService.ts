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
        return this.get<{ success: boolean; cafe_name: string | null; branches: Paginated<BranchSummary> }>('/owner/branches', params)
    }

    createBranch(payload: FormData | Record<string, any>) {
        return this.post<{ success: boolean; message: string; branch?: any }>('/owner/branches', payload)
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
}
