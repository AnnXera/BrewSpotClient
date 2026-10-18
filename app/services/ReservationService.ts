import type { $Fetch } from 'nitropack'
import { BaseService } from './BaseService'

export interface ReservationRecord {
  uuid: string
  table: {
    uuid: string
    table_name: string
    capacity: number
  } | null
  // Backend TODO: add nullable seat_element_uuid support to the reservations
  // migration/model/resource and enforce seat-level overlap validation.
  seat_element_uuid?: string | null
  customer_name: string
  customer_phone: string
  party_size: number
  reservation_date: string
  reservation_end: string
  status: string
  notes?: string | null
}

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'

export class ReservationService extends BaseService {
  constructor(client: $Fetch, private readonly scope: 'owner' | 'manager' = 'manager') {
    super(client)
  }

  private base(branchUuid: string) {
    return `/${this.scope}/branches/${branchUuid}`
  }

  list(branchUuid: string, date?: string) {
    return this.get<{ success: boolean; reservations: ReservationRecord[] | { data: ReservationRecord[] } }>(
      `${this.base(branchUuid)}/reservations`,
      date ? { date, per_page: 100 } : { per_page: 100 },
    )
  }

  create(branchUuid: string, data: {
    table_uuid: string
    // Backend TODO: accept, persist, and return this field when creating reservations.
    seat_element_uuid?: string
    customer_name: string
    customer_phone: string
    party_size: number
    reservation_date: string
    reservation_end: string
    status: 'pending' | 'confirmed'
    notes?: string
  }) {
    return this.post<{ success: boolean; message: string; reservation: ReservationRecord }>(
      `${this.base(branchUuid)}/reservations`,
      data,
    )
  }

  updateStatus(branchUuid: string, reservationUuid: string, status: ReservationStatus) {
    return this.post<{ success: boolean; message: string; reservation: ReservationRecord }>(
      `${this.base(branchUuid)}/reservations/${reservationUuid}/status`,
      { status },
    )
  }
}
