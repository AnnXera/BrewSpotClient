//app/services/ServingService.ts
import type { $Fetch } from 'nitropack'
import { BaseService } from './BaseService'
import type { Paginated } from './OwnerManagementService'

export type ServingCategorySort = 'name' | 'remaining_desc' | 'remaining_asc'
export type IngredientUsageSort = 'name' | 'quantity_desc' | 'quantity_asc'

export interface ManagedBranch {
    uuid: string
    branch_name: string
    address: string | null
    status: string
}

// One category card: today's servings of its items added together.
export interface ServingCategorySummary {
    uuid: string | null // null = items without a category
    name: string
    picture: string | null
    items: number
    expected_servings: number
    servings_sold: number
    remaining: number
    status: 'available' | 'sold_out'
}

export interface IngredientUsage {
    name: string
    unit: string
    quantity: number
    percent: number // share of the most-used ingredient, for the bar
}

export interface ServingLogEntry {
    uuid: string
    order_number: string
    menu_name: string | null
    picture: string | null
    quantity: number
    sold_at: string
}

export interface ServingListParams {
    search?: string
    sort?: string
    page?: number
    per_page?: number
}

/**
 * Servings Management screen. The same routes exist under /owner and
 * /manager, so the scope is chosen per instance.
 */
export class ServingService extends BaseService {
    constructor(client: $Fetch, private readonly scope: 'owner' | 'manager' = 'manager') {
        super(client)
    }

    private base(branchUuid: string) {
        return `/${this.scope}/branches/${branchUuid}/servings`
    }

    private clean(params: ServingListParams) {
        const out: Record<string, any> = {}
        for (const [key, value] of Object.entries(params)) {
            if (value !== '' && value !== undefined && value !== null) out[key] = value
        }
        return out
    }

    // Branch switcher (manager only).
    managedBranches() {
        return this.get<{ success: boolean; branches: ManagedBranch[] }>('/manager/branches')
    }

    categories(branchUuid: string, params: ServingListParams = {}) {
        return this.get<{ success: boolean; date: string; categories: Paginated<ServingCategorySummary> }>(
            `${this.base(branchUuid)}/categories`, this.clean(params))
    }

    ingredientsUsed(branchUuid: string, params: ServingListParams = {}) {
        return this.get<{ success: boolean; date: string; ingredients: IngredientUsage[] }>(
            `${this.base(branchUuid)}/ingredients-used`, this.clean(params))
    }

    log(branchUuid: string, params: ServingListParams = {}) {
        return this.get<{ success: boolean; date: string; log: Paginated<ServingLogEntry> }>(
            `${this.base(branchUuid)}/log`, this.clean(params))
    }
}
