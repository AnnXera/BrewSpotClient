//app/services/StaffService.ts
import type { $Fetch } from 'nitropack'
import { BaseService } from './BaseService'
import type { Paginated } from './OwnerManagementService'

export type EmploymentStatus = 'active' | 'inactive' | 'suspended' | 'terminated'
// Staff = records only (e.g. barista, kitchen staff): no login, no PIN, not on the register.
export type StaffRole = 'Manager' | 'Cashier' | 'Staff'

export interface StaffScheduleDay {
    day_of_week: number
    day_name: string | null
    is_day_off: boolean
    start_time: string | null
    end_time: string | null
}

export interface StaffMember {
    uuid: string
    firstname: string
    middlename: string | null
    lastname: string
    email: string
    phone_number: string | null
    address: string | null
    role: StaffRole
    account_status: string // 'pending_setup' = manager hasn't set a password yet
    pin_set: boolean
    pin_locked: boolean
    pin_must_change: boolean
    can_manage: boolean
    assignment: {
        staff_uuid: string
        branch_uuid: string | null
        branch_name: string | null
        employment_status: EmploymentStatus
        hired_at: string | null
        terminated_at: string | null
    } | null
    other_branches: { uuid: string | null; branch_name: string | null }[]
    schedule: StaffScheduleDay[]
    created_at: string | null
}

export interface BranchStaffStats {
    total: number
    active: number
    inactive: number
    suspended: number
    terminated: number
}

export interface StaffScheduleInput {
    day_of_week: number // 0 = Sunday … 6 = Saturday
    is_day_off: boolean
    start_time?: string | null // "HH:mm"
    end_time?: string | null
}

export interface CreateStaffPayload {
    firstname: string
    middlename?: string | null
    lastname: string
    phone_number: string
    email: string
    address: string
    role: StaffRole
    hired_at?: string
    pin?: string // required for Cashier; managers set their own during password setup
    schedule?: StaffScheduleInput[]
}

export interface CreateStaffResponse {
    success: boolean
    message: string
    staff?: StaffMember
    // Non-blocking, e.g. "Sunday: the cafe is closed, but a shift is scheduled."
    warnings?: string[]
    errors?: Record<string, string[]>
}

// Every field is optional; only what changed needs to be sent.
// employment_status can't be 'terminated' here (use terminateBranchStaff).
export interface UpdateStaffPayload {
    firstname?: string
    middlename?: string | null
    lastname?: string
    phone_number?: string
    email?: string
    address?: string | null
    role?: StaffRole
    hired_at?: string | null
    employment_status?: Exclude<EmploymentStatus, 'terminated'>
}

export interface StaffSaveResponse {
    success: boolean
    message: string
    staff?: StaffMember
    warnings?: string[]
}

export interface BranchStaffFilters {
    search?: string
    status?: EmploymentStatus | ''
    role?: StaffRole | ''
    page?: number
    per_page?: number
}

/**
 * Branch-scoped employee endpoints. The same routes exist under /owner and
 * /manager, so the scope is chosen per instance.
 */
export class StaffService extends BaseService {
    constructor(client: $Fetch, private readonly scope: 'owner' | 'manager' = 'owner') {
        super(client)
    }

    private base(branchUuid: string) {
        return `/${this.scope}/branches/${branchUuid}/staff`
    }

    listBranchStaff(branchUuid: string, filters: BranchStaffFilters = {}) {
        const params: Record<string, any> = {}
        for (const [key, value] of Object.entries(filters)) {
            if (value !== '' && value !== undefined && value !== null) params[key] = value
        }
        return this.get<{ success: boolean; message?: string; staff: Paginated<StaffMember> }>(this.base(branchUuid), params)
    }

    createBranchStaff(branchUuid: string, payload: CreateStaffPayload) {
        return this.post<CreateStaffResponse>(this.base(branchUuid), payload as unknown as Record<string, any>)
    }

    // One employee as seen from this branch (details page).
    getBranchStaff(branchUuid: string, userUuid: string) {
        return this.get<{ success: boolean; message?: string; staff?: StaffMember }>(`${this.base(branchUuid)}/${userUuid}`)
    }

    // Personal info applies everywhere; hired_at / employment_status to this branch only.
    updateBranchStaff(branchUuid: string, userUuid: string, payload: UpdateStaffPayload) {
        return this.patch<StaffSaveResponse>(`${this.base(branchUuid)}/${userUuid}`, payload as Record<string, any>)
    }

    // Replaces the whole weekly schedule at this branch.
    updateBranchStaffSchedule(branchUuid: string, userUuid: string, schedule: StaffScheduleInput[]) {
        return this.put<StaffSaveResponse>(`${this.base(branchUuid)}/${userUuid}/schedule`, { schedule })
    }

    // Sets (or resets) their register PIN and unlocks it if it was locked.
    setBranchStaffPin(branchUuid: string, userUuid: string, pin: string) {
        return this.put<{ success: boolean; message: string }>(`${this.base(branchUuid)}/${userUuid}/pin`, { pin })
    }

    // Ends their employment at this branch only.
    terminateBranchStaff(branchUuid: string, userUuid: string) {
        return this.post<{ success: boolean; message: string }>(`${this.base(branchUuid)}/${userUuid}/terminate`)
    }

    getBranchStaffStats(branchUuid: string) {
        return this.get<{ success: boolean; message?: string; stats: BranchStaffStats }>(`${this.base(branchUuid)}/stats`)
    }
}
