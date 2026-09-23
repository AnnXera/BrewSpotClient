//app/services/OwnerProfileService.ts
import { BaseService } from './BaseService'
import type { Paginated } from './OwnerManagementService'

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

export class OwnerProfileService extends BaseService {
    getBranches(perPage = 6, page = 1, search = '', status = '') {
        const params: Record<string, any> = { per_page: perPage, page }
        if (search) params.search = search
        if (status) params.status = status
        return this.get<{ success: boolean; branches: Paginated<BranchSummary> }>('/owner/branches', params)
    }

    createBranch(payload: { branch_name: string; branch_type: string; address: string; phone_number?: string; opening_hours?: any }) {
        return this.post<{ success: boolean; message: string; branch?: any }>('/owner/branches', payload)
    }

    updateBranch(uuid: string, payload: { status?: string; [key: string]: any }) {
        return this.patch<{ success: boolean; message: string; branch?: any }>(`/owner/branches/${uuid}`, payload)
    }

    updateOperatingHours(payload: { opening_hours: any; apply_to_all?: boolean }) {
        return this.post<{ success: boolean; message: string }>('/owner/operating-hours', payload)
    }
}
