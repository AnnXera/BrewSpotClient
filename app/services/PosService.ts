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
        return this.get<{ success: boolean; today_total: number; today_count: number; month_total: number; transactions: any[] }>('/pos/device/transactions')
    }

    checkout(items: any[], paymentMethod: string, amountTendered: number) {
        return this.post<{ success: boolean; message: string; transaction_uuid: string; receipt_number?: string }>('/pos/device/checkout', {
            items,
            payment_method: paymentMethod,
            amount_tendered: amountTendered
        })
    }
}
