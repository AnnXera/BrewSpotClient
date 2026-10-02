import { useApi } from './useApi'

export const usePaymentService = () => {
  const api = useApi()
  return {
    getAllPayments: (params?: Record<string, any>) => api('/admin/payments', { method: 'GET', params }),
  }
}
