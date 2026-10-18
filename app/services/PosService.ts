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

export class PosService extends BaseService {
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

    checkout(items: any[], paymentMethod: string, amountTendered: number, referenceNumber?: string, discountType?: string, discountAmount?: number) {
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

    refundTransaction(transactionUuid: string, managerUuid: string, pin: string, reason?: string) {
        return this.post<{ success: boolean; message: string; transaction?: PosTransactionDetail }>('/pos/device/transactions/' + transactionUuid + '/refund', {
            manager_uuid: managerUuid,
            pin,
            reason
        })
    }
}
