// app/services/CafeUpdateService.ts
// Cafe name and branch address changes: owners request them (Cafe Management and the
// branch page), admins review them (Approval Status > Cafe Updates). See server
// CafeUpdateService for the rules.
import { BaseService } from './BaseService'
import type { Paginated } from './OwnerManagementService'

export type CafeUpdateStatus = 'pending_approval' | 'resubmitted' | 'approved' | 'rejected' | 'withdrawn'

export interface CafeUpdateDocument {
    id: number
    branch_uuid: string | null
    branch_name: string | null
    branch_type: 'main' | 'side' | null
    branch_status: string | null
    registered_at: string | null
    file_type: string
    download_url: string
    // Admin detail only: the COR in use before this request (or the one it replaced, once approved)
    current_document?: {
        id: number
        registered_at: string | null
        tin_number: string | null
        file_type: string
        download_url: string
    } | null
}

export type CafeUpdateType = 'name_change' | 'address_change'

export interface CafeUpdateRequest {
    uuid: string
    type: CafeUpdateType
    status: CafeUpdateStatus
    cafe_name: string | null
    // name_change only
    old_name: string | null
    new_name: string | null
    // address_change only
    old_address: string | null
    new_address: string | null
    branch: { uuid: string; branch_name: string; branch_type: 'main' | 'side'; status: string } | null
    reason: string | null
    can_resubmit: boolean
    submitted_at: string | null
    reviewed_at: string | null
    documents: CafeUpdateDocument[]
    // Admin only
    owner?: { uuid: string; name: string; email: string } | null
    reviewed_by?: string | null
}

export interface NameChangeBranch {
    uuid: string
    branch_name: string
    branch_type: 'main' | 'side'
    status: string
    current_registered_at: string | null
}

export interface AddressChangeOverview {
    success: boolean
    address: string | null
    current_registered_at: string | null
    request: CafeUpdateRequest | null
    // Why a new request can't be sent right now, or null when it can
    blocked: string | null
}

export interface CafeUpdateStats {
    pending_approval: number
    pending: number
    resubmitted: number
    approved: number
    rejected: number
}

export class CafeUpdateService extends BaseService {
    // ── Owner ──

    /** The latest request (any status) and the branches a new one must cover */
    overview() {
        return this.get<{
            success: boolean
            cafe_name: string
            request: CafeUpdateRequest | null
            branches: NameChangeBranch[]
        }>('/owner/cafe-name-change')
    }

    /** documents: one updated COR per branch uuid */
    submit(newName: string, documents: Record<string, { file: File; registeredAt: string }>) {
        const form = new FormData()
        form.append('new_name', newName)
        for (const [uuid, doc] of Object.entries(documents)) {
            form.append(`documents[${uuid}][file]`, doc.file)
            form.append(`documents[${uuid}][registered_at]`, doc.registeredAt)
        }
        return this.post<{ success: boolean; message: string; request: CafeUpdateRequest }>('/owner/cafe-name-change', form)
    }

    withdraw(uuid: string) {
        return this.delete<{ success: boolean; message: string }>(`/owner/cafe-name-change/${uuid}`)
    }

    // ── Owner: branch address change ──

    addressOverview(branchUuid: string) {
        return this.get<AddressChangeOverview>(`/owner/branches/${branchUuid}/address-change`)
    }

    submitAddressChange(branchUuid: string, newAddress: string, file: File, registeredAt: string) {
        const form = new FormData()
        form.append('new_address', newAddress)
        form.append('file', file)
        form.append('registered_at', registeredAt)
        return this.post<{ success: boolean; message: string; request: CafeUpdateRequest }>(`/owner/branches/${branchUuid}/address-change`, form)
    }

    withdrawAddressChange(branchUuid: string, uuid: string) {
        return this.delete<{ success: boolean; message: string }>(`/owner/branches/${branchUuid}/address-change/${uuid}`)
    }

    // ── Admin ──

    list(params: { status?: string; search?: string; page?: number; per_page?: number } = {}) {
        return this.get<{ success: boolean; requests: Paginated<CafeUpdateRequest> }>('/admin/cafe-updates', params)
    }

    stats() {
        return this.get<{ success: boolean; stats: CafeUpdateStats }>('/admin/cafe-updates/stats')
    }

    show(uuid: string) {
        return this.get<{ success: boolean; request: CafeUpdateRequest }>(`/admin/cafe-updates/${uuid}`)
    }

    /** allowResubmit applies to rejections: false stops the owner asking for this same name (or address) again */
    review(uuid: string, status: 'approved' | 'rejected', reason?: string, allowResubmit = true) {
        return this.patch<{ success: boolean; message: string; request: CafeUpdateRequest }>(`/admin/cafe-updates/${uuid}/status`, {
            status,
            reason,
            ...(status === 'rejected' ? { allow_resubmit: allowResubmit } : {}),
        })
    }
}
