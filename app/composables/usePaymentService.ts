import { useApi } from './useApi'
import type { PaginatedResponse } from '~/services/SubscriptionService'

// One row of GET /api/admin/payments (server PaymentResource).
export interface AdminPayment {
  uuid: string
  transaction_id: string | null
  date: string
  description: string
  amount: number
  status: string
  payment_gateway: string
  owner_name: string | null
  owner_email: string | null
}

export const usePaymentService = () => {
  const api = useApi()
  return {
    getAllPayments: (params?: Record<string, any>) =>
      api<{ success: boolean; history: PaginatedResponse<AdminPayment> }>('/admin/payments', { method: 'GET', params }),
  }
}
