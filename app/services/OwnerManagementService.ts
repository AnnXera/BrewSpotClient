//app/services/OwnerManagementService.ts
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

export interface ApprovalUser {
    uuid: string
    firstname: string
    lastname: string
    email: string
    phone_number: string | null
}

export interface ApprovalCafe {
    uuid: string
    cafe_name: string
}

export interface ApprovalBranch {
    uuid: string
    branch_name: string
    branch_type: string
    status: string
    cafe_picture: string | null
    cafe_email: string | null
    cafe_phonenumber: string | null
    address: string | null
}

export interface ApprovalReviewer {
    uuid: string
    firstname: string
    lastname: string
}

export interface ApprovalListItem {
    uuid: string
    status: string
    reason: string | null
    reviewed_at: string | null
    reviewer: ApprovalReviewer | null
    user: ApprovalUser | null
    cafe: ApprovalCafe | null
    branch: ApprovalBranch | null
    created_at: string | null
}

export interface ApprovalStats {
    pending_approval: number
    approved: number
    rejected: number
}

interface ListApprovalsParams {
    per_page?: number
    page?: number
    status?: string
    type?: 'owner' | 'branch'
    search?: string
}

export interface ApprovalSnapshotResponse {
    success: boolean
    owner: any
    owner_documents: any[]
    cafe: {
        uuid: string
        cafe_name: string
        is_archived: boolean
        documents: any[]
    } | null
    branch: {
        uuid: string
        branch_name: string
        branch_type: string
        status: string
        is_archived: boolean
        cafe_picture: string | null
        cafe_email: string | null
        cafe_phonenumber: string | null
        address: string | null
        documents: any[]
    } | null
    approval: {
        uuid: string
        status: string
        reason: string | null
        reviewed_at: string | null
        reviewer: string | null
        submitted_at: string | null
    }
}

export interface ApplicationHistoryEntry {
    approval_uuid: string
    status: string
    reason: string | null
    reviewed_at: string | null
    reviewer: string | null
    cafe_name: string | null
    branch_name: string | null
    branch_type: string | null
    is_archived: boolean
    submitted_at: string | null
}

export class OwnerManagementService extends BaseService {
    stats() {
        return this.get<{ success: boolean; stats: OwnerStats }>('/admin/owners/stats')
    }

    list(params: ListOwnersParams = {}) {
        return this.get<{ success: boolean; owners: Paginated<OwnerListItem> }>('/admin/owners', params)
    }

    show(uuid: string) {
        return this.get<{
            success: boolean
            owner: any
            owner_documents: any[]
            cafes: any[]
            subscription: any | null
            payment_history: any[]
        }>(`/admin/owners/${uuid}`)
    }

    updateStatus(uuid: string, status: string, reason?: string) {
        return this.patch<{ success: boolean; message: string }>(`/admin/owners/${uuid}/status`, { status, reason })
    }

    approvals(params: ListApprovalsParams = {}) {
        return this.get<{ success: boolean; approvals: Paginated<ApprovalListItem> }>('/admin/approvals', params)
    }

    approvalStats(type?: 'owner' | 'branch') {
        return this.get<{ success: boolean; stats: ApprovalStats }>('/admin/approvals/stats', type ? { type } : {})
    }

    approvalSnapshot(approvalUuid: string) {
        return this.get<ApprovalSnapshotResponse>(`/admin/approvals/${approvalUuid}/snapshot`)
    }

    applicationHistory(uuid: string) {
        return this.get<{ success: boolean; history: ApplicationHistoryEntry[] }>(`/admin/owners/${uuid}/application-history`)
    }

    updateBranchStatus(uuid: string, status: 'approved' | 'rejected', reason?: string) {
        return this.patch<{ success: boolean; message: string }>(`/admin/branches/${uuid}/status`, { status, reason })
    }
}