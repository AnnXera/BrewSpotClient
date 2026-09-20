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
}

export class OwnerProfileService extends BaseService {
    getBranches(perPage = 6, page = 1, search = '', status = '') {
        const params: Record<string, any> = { per_page: perPage, page }
        if (search) params.search = search
        if (status) params.status = status
        return this.get<{ success: boolean; branches: Paginated<BranchSummary> }>('/owner/branches', params)
    }

    updateBranch(uuid: string, payload: { status?: string; [key: string]: any }) {
        return this.patch<{ success: boolean; message: string; branch?: any }>(`/owner/branches/${uuid}`, payload)
    }
}
