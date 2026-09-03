// app/services/SubscriptionService.ts
import { BaseService } from './BaseService'

export interface SubscriberListItem {
  subscription_uuid: string
  status: string
  name: string
  email: string | null
  phone_number: string | null
  plan: string | null
  mode_of_payment: string | null
  amount: string | null
}

export interface SubscriptionPlanItem {
  uuid: string
  sub_name: string
  price: number | string
  max_branches: number
  duration_days: number
}

export interface SubscriptionItem {
  uuid: string
  status: string
  start_date: string | null
  end_date: string | null
  cancel_at_period_end: boolean
  plan?: SubscriptionPlanItem
  created_at: string | null
}

export interface PaginatedResponse<T> {
  current_page: number
  data: T[]
  last_page: number
  per_page: number
  total: number
}

export interface TransactionHistoryItem {
  transaction_id: string
  date: string | null
  description: string
  amount: string | number
  status: string
  owner_name?: string
  owner_email?: string
  payment_method?: string
}

export class SubscriptionService extends BaseService {
  /**
   * GET /api/admin/subscribers
   * Admin — view all users with a subscription
   */
  getSubscribers(params: { per_page?: number; page?: number } = {}) {
    return this.get<{ success: boolean; subscribers: PaginatedResponse<SubscriberListItem> }>('/admin/subscribers', params)
  }

  /**
   * GET /api/admin/owners/{uuid}/subscription-history
   * Admin — view a specific owner's full subscription history
   */
  getOwnerSubscriptionHistory(ownerUuid: string, params: { per_page?: number; page?: number } = {}) {
    return this.get<{ success: boolean; history: PaginatedResponse<SubscriptionItem> }>(`/admin/owners/${ownerUuid}/subscription-history`, params)
  }

  /**
   * GET /api/owner/subscription/current
   * Cafe Owner — get current active subscription plan
   */
  getCurrentPlan() {
    return this.get<{ success: boolean; subscription?: SubscriptionItem; message?: string }>('/owner/subscription/current')
  }

  /**
   * GET /api/owner/subscription/history
   * Cafe Owner — view own subscription history
   */
  getPlanHistory(params: { per_page?: number; page?: number } = {}) {
    return this.get<{ success: boolean; history: PaginatedResponse<SubscriptionItem> }>('/owner/subscription/history', params)
  }
}
