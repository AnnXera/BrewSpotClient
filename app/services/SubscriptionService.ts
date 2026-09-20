// app/services/SubscriptionService.ts
import { BaseService } from './BaseService'

export interface FeatureItem {
  uuid: string
  key: string
  name: string
  description: string | null
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
}

export interface SubscriberListItem {
  subscription_uuid: string
  status: string
  name: string
  email: string | null
  phone_number: string | null
  plan: string | null
  billing_cycle?: 'monthly' | 'yearly' | string | null
  mode_of_payment: string | null
  amount: string | null
  transaction_id?: string | null
  date?: string | null
}

export interface SubscriptionPlanItem {
  uuid: string
  sub_name: string
  price: number | string
  monthly_price?: number | string
  yearly_price?: number | string
  paypal_plan_id?: string | null
  paypal_yearly_plan_id?: string | null
  has_multi_branch?: boolean
  features?: string[]
  feature_details?: FeatureItem[]
  description?: string | null
  duration_days: number
  is_active?: boolean
  is_selectable?: boolean
  created_at?: string | null
  updated_at?: string | null
}

export interface SubscriptionItem {
  uuid: string
  status: string
  billing_cycle?: 'monthly' | 'yearly' | string
  start_date: string | null
  end_date: string | null
  cancel_at_period_end: boolean
  plan?: SubscriptionPlanItem
  payment_gateway?: string
  payment_method?: string
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
  payment_gateway?: string
}

export class SubscriptionService extends BaseService {
  // ─── ADMIN: SUBSCRIPTION PLANS ─────────────────────────────────────────────

  /**
   * GET /api/admin/subscription-plans
   * Admin — list all subscription plans (active and inactive)
   */
  getPlans(params: { per_page?: number; page?: number } = {}) {
    return this.get<{ success: boolean; plans: PaginatedResponse<SubscriptionPlanItem> }>('/admin/subscription-plans', params)
  }

  /**
   * GET /api/admin/subscription-plans/{uuid}
   * Admin — get subscription plan details
   */
  getPlan(uuid: string) {
    return this.get<{ success: boolean; plan?: SubscriptionPlanItem; message?: string }>(`/admin/subscription-plans/${uuid}`)
  }

  /**
   * POST /api/admin/subscription-plans/create
   * Admin — create a subscription plan with feature list
   */
  createPlan(payload: {
    sub_name: string
    price: number
    yearly_price?: number
    features?: string[]
    description?: string
    duration_days: number
    is_active?: boolean
  }) {
    return this.post<{ success: boolean; message: string; plan?: SubscriptionPlanItem }>('/admin/subscription-plans/create', payload)
  }

  /**
   * PATCH /api/admin/subscription-plans/{uuid}/update
   * Admin — update a subscription plan with feature list
   */
  updatePlan(uuid: string, payload: Partial<{
    sub_name: string
    price: number
    yearly_price: number
    features: string[]
    description: string
    duration_days: number
    is_active: boolean
  }>) {
    return this.patch<{ success: boolean; message: string; plan?: SubscriptionPlanItem }>(`/admin/subscription-plans/${uuid}/update`, payload)
  }

  /**
   * DELETE /api/admin/subscription-plans/{uuid}/delete
   * Admin — soft delete a subscription plan
   */
  deletePlan(uuid: string) {
    return this.delete<{ success: boolean; message: string }>(`/admin/subscription-plans/${uuid}/delete`)
  }

  /**
   * PATCH /api/admin/subscription-plans/{uuid}/restore
   * Admin — restore a soft deleted subscription plan
   */
  restorePlan(uuid: string) {
    return this.patch<{ success: boolean; message: string; plan?: SubscriptionPlanItem }>(`/admin/subscription-plans/${uuid}/restore`, {})
  }

  // Cancel checkout
  async cancelCheckout(params: { token?: string, ba_token?: string, subscription_id?: string }) {
    return this.post<{ success: boolean; message: string }>('/owner/subscriptions/cancel', params)
  }

  // ─── ADMIN: FEATURES CATALOG ───────────────────────────────────────────────

  /**
   * GET /api/admin/features
   * Admin — list all system features
   */
  getFeatures(params: { per_page?: number; page?: number } = {}) {
    return this.get<{ success: boolean; features: PaginatedResponse<FeatureItem> }>('/admin/features', params)
  }

  /**
   * GET /api/admin/features/active
   * Admin — get all active features for plan checkboxes
   */
  getActiveFeatures() {
    return this.get<{ success: boolean; features: FeatureItem[] }>('/admin/features/active')
  }

  /**
   * POST /api/admin/features
   * Admin — create a new master feature definition
   */
  createFeature(payload: {
    key: string
    name: string
    description?: string
    is_active?: boolean
  }) {
    return this.post<{ success: boolean; message: string; feature?: FeatureItem }>('/admin/features', payload)
  }

  /**
   * PATCH /api/admin/features/{uuid}
   * Admin — update a master feature definition
   */
  updateFeature(uuid: string, payload: Partial<{
    name: string
    description: string
    is_active: boolean
  }>) {
    return this.patch<{ success: boolean; message: string; feature?: FeatureItem }>(`/admin/features/${uuid}`, payload)
  }

  /**
   * DELETE /api/admin/features/{uuid}
   * Admin — delete a master feature definition
   */
  deleteFeature(uuid: string) {
    return this.delete<{ success: boolean; message: string }>(`/admin/features/${uuid}`)
  }

  // ─── ADMIN: SUBSCRIBERS & TRANSACTIONS ──────────────────────────────────────

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

  // ─── CAFE OWNER: SUBSCRIPTION ──────────────────────────────────────────────

  /**
   * GET /api/owner/subscription/current
   * Cafe Owner — get current active subscription plan
   */
  getCurrentPlan() {
    return this.get<{ success: boolean; subscription?: SubscriptionItem; message?: string }>('/owner/subscription/current')
  }

  /**
   * GET /api/owner/subscription-plans
   * Cafe Owner — view active available subscription plans for selection/upgrade
   */
  getAvailablePlans(params: { per_page?: number; page?: number } = {}) {
    return this.get<{ success: boolean; plans: PaginatedResponse<SubscriptionPlanItem> }>('/owner/subscription-plans', params)
  }

  /**
   * GET /api/owner/subscription/history
   * Cafe Owner — view own subscription history
   */
  getPlanHistory(params: { per_page?: number; page?: number } = {}) {
    return this.get<{ success: boolean; history: PaginatedResponse<SubscriptionItem> }>('/owner/subscription/history', params)
  }
}
