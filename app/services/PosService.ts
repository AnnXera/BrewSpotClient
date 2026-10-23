import { BaseService } from './BaseService'
import type { $Fetch } from 'nitropack'

export interface PosDevice {
    uuid: string
    name: string
    branch_uuid: string
    registered_at: string
}

export interface SetupBranch {
    uuid: string
    branch_name: string
    address: string
}

export interface LockScreenStaff {
    uuid: string
    firstname: string
    lastname: string
    role: string
    pin_set: boolean
    pin_locked: boolean
    pin_must_change: boolean
}

export interface PosTransactionDetail {
    uuid: string
    receipt_number: string
    created_at: string
    staff_name: string
    status: string
    walk_in_note?: string | null
    subtotal: number
    discount_type: string | null
    discount_amount: number
    total_amount: number
    payment: { method: string; reference_number: string | null; amount_tendered: number; change: number } | null
    items: {
        uuid: string
        menu_name: string
        size_name: string | null
        quantity: number
        unit_price: number
        line_total: number
        addons: { name: string; quantity: number; price: number }[]
    }[]
}

export type SpoilageReason = 'expired' | 'dropped' | 'wrong_order' | 'quality' | 'end_of_day' | 'other'

// One spoiled-servings entry, logged on a register. Voided entries stay listed but no longer count.
export interface SpoilageLog {
    uuid: string
    serving_uuid: string | null
    menu_item: { uuid: string; menu_name: string } | null
    size_name: string | null
    quantity: number
    unit_value: number | null // price per serving kept when logged (size price, else base price)
    reason: SpoilageReason | null
    logged_by: string | null
    device_name: string | null
    voided_at: string | null
    voided_by: string | null
    created_at: string
}

export interface SpoilageList {
    success: boolean
    date: string
    total: number // servings, voided entries left out
    reasons: SpoilageReason[]
    logs: SpoilageLog[]
}

export const spoilageReasonLabels: Record<SpoilageReason, string> = {
    expired: 'Expired',
    dropped: 'Dropped or spilled',
    wrong_order: 'Wrong order',
    quality: 'Quality issue',
    end_of_day: 'Leftover at closing',
    other: 'Other',
}

// "2x Large Spanish Latte"
export function spoilageItemLabel(log: SpoilageLog) {
    return [log.size_name, log.menu_item?.menu_name ?? 'Removed item'].filter(Boolean).join(' ')
}

// A register as listed on a branch's details page (revoked registers are left out).
export interface BranchPosDevice {
    uuid: string
    name: string
    branch_uuid: string | null
    registered_by: string | null
    active_staff: { uuid: string; firstname: string; name: string } | null // signed in on it now
    active_since: string | null
    last_used_at: string | null
    created_at: string | null
}

export class PosService extends BaseService {
    // ── Branch registers (Owner/Manager auth_token, `pos_system` plan feature) ───

    listBranchDevices(scope: 'owner' | 'manager', branchUuid: string) {
        return this.get<{ success: boolean; devices: BranchPosDevice[] }>(`/${scope}/branches/${branchUuid}/pos-devices`)
    }

    // ── Setup API (Uses Owner/Manager auth_token) ────────────────────────────────

    getSetupBranches() {
        return this.get<{ success: boolean; branches: SetupBranch[] }>('/pos/setup/branches')
    }

    registerDevice(branchUuid: string, name: string) {
        return this.post<{ success: boolean; device_token: string; message: string }>('/pos/setup', { branch_uuid: branchUuid, name })
    }
}

export class DevicePosService extends BaseService {
    // ── POS Device API (Uses POS device_token) ──────────────────────────────────

    getCurrentDevice() {
        return this.get<{ success: boolean; device: PosDevice }>('/pos/device')
    }

    unregisterDevice() {
        return this.delete<{ success: boolean; message: string }>('/pos/device')
    }

    getLockScreenStaff() {
        return this.get<{ success: boolean; staff: LockScreenStaff[] }>('/pos/device/staff')
    }

    unlock(userUuid: string, pin: string) {
        return this.post<{ success: boolean; message: string; must_change_pin?: boolean; staff?: any }>('/pos/device/staff/' + userUuid + '/unlock', { pin })
    }

    changePinAndUnlock(userUuid: string, currentPin: string, newPin: string) {
        return this.post<{ success: boolean; message: string; staff?: any }>('/pos/device/staff/' + userUuid + '/change-pin', { current_pin: currentPin, new_pin: newPin })
    }

    lock() {
        return this.post<{ success: boolean; message: string }>('/pos/device/lock', {})
    }

    getMenu() {
        return this.get<{ success: boolean; categories: any[]; items: any[] }>('/pos/device/menu')
    }

    getTransactions() {
        return this.get<{ success: boolean; today_total: number; today_count: number; gross_total: number; void_count: number; void_total: number; month_total: number; transactions: any[] }>('/pos/device/transactions')
    }

    getTransaction(transactionUuid: string) {
        return this.get<{ success: boolean; transaction: PosTransactionDetail }>('/pos/device/transactions/' + transactionUuid)
    }

    getSpoilage() {
        return this.get<SpoilageList>('/pos/device/spoilage')
    }

    // sizeUuid is required for items that come in sizes, and must be null otherwise.
    logSpoilage(menuItemUuid: string, sizeUuid: string | null, quantity: number, reason: SpoilageReason | null) {
        return this.post<{ success: boolean; message: string; log: SpoilageLog }>('/pos/device/spoilage', {
            menu_item_uuid: menuItemUuid,
            size_uuid: sizeUuid,
            quantity,
            reason,
        })
    }

    checkout(items: any[], paymentMethod: string,amountTendered: number, referenceNumber?: string, discountType?: string, discountAmount?: number) {
        return this.post<{ success: boolean; message: string; transaction_uuid: string; receipt_number?: string }>('/pos/device/checkout', {
            items,
            payment_method: paymentMethod,
            amount_tendered: amountTendered,
            reference_number: referenceNumber,
            discount_type: discountType,
            discount_amount: discountAmount
        })
    }

    getApprovingManagers() {
        return this.get<{ success: boolean; managers: { uuid: string; name: string; role: string; has_pin: boolean; is_locked: boolean }[] }>('/pos/device/approving-managers')
    }

    // restock: the order was never made, so its servings go back on sale; otherwise they count as refunded (still used up).
    refundTransaction(transactionUuid: string, managerUuid: string, pin: string, reason?: string, restock = false) {
        return this.post<{ success: boolean; message: string; transaction?: PosTransactionDetail }>('/pos/device/transactions/' + transactionUuid + '/refund', {
            manager_uuid: managerUuid,
            pin,
            reason,
            restock,
        })
    }

    getFloorPlan() {
        return this.get<{ success: boolean; floor_plan: any; floor_plans: any[] }>('/pos/device/floor-plan')
    }

    updateTableStatus(tableUuid: string, status: string) {
        return this.patch<{ success: boolean; message: string; table: any }>('/pos/device/tables/' + tableUuid + '/status', { status })
    }

    // A full service day fits one page (the server caps per_page at 100).
    getReservations(date?: string, perPage = 100) {
        return this.get<{ success: boolean; reservations: { data: any[]; current_page: number; last_page: number; total: number } }>(
            '/pos/device/reservations',
            { per_page: perPage, ...(date ? { date } : {}) },
        )
    }

    updateReservationStatus(reservationUuid: string, status: string) {
        return this.patch<{ success: boolean; message: string; reservation: any }>('/pos/device/reservations/' + reservationUuid + '/status', { status })
    }
}
