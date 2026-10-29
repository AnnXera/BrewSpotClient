import { BaseService } from './BaseService'

export interface Paginated<T> {
    current_page: number
    data: T[]
    first_page_url: string
    from: number | null
    last_page: number
    last_page_url: string
    links: Array<{ url: string | null; label: string; active: boolean }>
    next_page_url: string | null
    path: string
    per_page: number
    prev_page_url: string | null
    to: number | null
    total: number
}

export interface Ingredient {
    uuid: string
    name: string
    unit: string
    is_measured: boolean
    is_active: boolean
    used_in: number // number of menu items and add-ons using it
    used_in_names?: string[] // their names; sent with the ingredient list
}

export interface IngredientPayload {
    name?: string
    unit?: string
    is_active?: boolean
}

type IngredientResponse = { success: boolean; message: string; ingredient?: Ingredient; errors?: Record<string, string[]> }

// One size of a menu item (Small, Large). An item with no sizes sells at base_price.
// On an item sold hot and iced, price is the hot price and iced_price the iced one.
export interface MenuItemSize {
    uuid: string
    name: string
    price: string
    iced_price: string | null
}

export interface AddonRecipe {
    ingredient_uuid: string | null
    ingredient_name: string
    quantity: string
    unit: string
}

// An extra for a drink (Oreo crumbles +20), offered on the items linked to it.
export interface MenuAddon {
    uuid: string
    name: string
    price: string
    max_quantity: number // most one drink can have
    is_available: boolean
    recipes: AddonRecipe[]
    items: Array<{ uuid: string; menu_name: string }>
}

export interface MenuAddonPayload {
    name?: string
    price?: number
    max_quantity?: number
    is_available?: boolean
    recipes?: Array<{ ingredient_uuid?: string; ingredient_name?: string; quantity: number; unit: string }>
    item_uuids?: string[]
}

type AddonResponse = { success: boolean; message: string; addon?: MenuAddon; errors?: Record<string, string[]> }

export class MenuService extends BaseService {
    // --- Menu Categories ---

    getMenuCategories(params?: Record<string, any>) {
        return this.get<{ success: boolean; categories: Paginated<any> | any[] }>('/owner/menu-categories', params)
    }

    createMenuCategory(payload: Record<string, any> | FormData) {
        return this.post<{ success: boolean; message: string; category?: any }>('/owner/menu-categories', payload)
    }

    updateMenuCategory(uuid: string, payload: Record<string, any> | FormData) {
        return this.post<{ success: boolean; message: string; category?: any }>(`/owner/menu-categories/${uuid}`, payload) // Using POST for form data with _method: PATCH, or use patch directly if JSON
    }

    deleteMenuCategory(uuid: string) {
        return this.delete<{ success: boolean; message: string }>(`/owner/menu-categories/${uuid}`)
    }

    // --- Ingredients (one list per cafe, used by recipes) ---

    // Active only (recipe picker) unless includeRetired (Ingredients page).
    getIngredients(options: { search?: string; includeRetired?: boolean } = {}) {
        const params: Record<string, any> = {}
        if (options.search) params.search = options.search
        if (options.includeRetired) params.include_retired = 1
        return this.get<{ success: boolean; ingredients: Ingredient[] }>('/owner/ingredients', params)
    }

    createIngredient(payload: IngredientPayload) {
        return this.post<IngredientResponse>('/owner/ingredients', payload)
    }

    // Rename, change unit (only while unused), or retire/restore via is_active.
    updateIngredient(uuid: string, payload: IngredientPayload) {
        return this.patch<IngredientResponse>(`/owner/ingredients/${uuid}`, payload)
    }

    deleteIngredient(uuid: string) {
        return this.delete<{ success: boolean; message: string }>(`/owner/ingredients/${uuid}`)
    }

    // --- Add-ons ---

    getAddons() {
        return this.get<{ success: boolean; addons: MenuAddon[] }>('/owner/menu-addons')
    }

    createAddon(payload: MenuAddonPayload) {
        return this.post<AddonResponse>('/owner/menu-addons', payload)
    }

    updateAddon(uuid: string, payload: MenuAddonPayload) {
        return this.patch<AddonResponse>(`/owner/menu-addons/${uuid}`, payload)
    }

    deleteAddon(uuid: string) {
        return this.delete<{ success: boolean; message: string }>(`/owner/menu-addons/${uuid}`)
    }

    // --- Menu Items ---

    getMenuItems(params?: Record<string, any>) {
        return this.get<{ success: boolean; items: Paginated<any> | any[] }>('/owner/menu-items', params)
    }

    getMenuItem(uuid: string) {
        return this.get<{ success: boolean; message?: string; item?: any }>(`/owner/menu-items/${uuid}`)
    }

    createMenuItem(payload: Record<string, any> | FormData) {
        return this.post<{ success: boolean; message: string; item?: any }>('/owner/menu-items', payload)
    }

    updateMenuItem(uuid: string, payload: Record<string, any> | FormData) {
        // Nuxt $fetch with FormData usually requires POST. If payload is FormData, add _method: PATCH inside the form data.
        return this.post<{ success: boolean; message: string; item?: any }>(`/owner/menu-items/${uuid}`, payload)
    }

    deleteMenuItem(uuid: string) {
        return this.delete<{ success: boolean; message: string }>(`/owner/menu-items/${uuid}`)
    }

    // --- Category Branches ---

    getCategoryBranches(uuid: string) {
        return this.get<{ success: boolean; branches: any[] }>(`/owner/menu-categories/${uuid}/branches`)
    }

    getCategoryBranchesStatus(uuid: string) {
        return this.get<{
            success: boolean
            category: { uuid: string; name: string; is_available: boolean }
            branches: Array<{ branch_uuid: string; branch_name: string; is_available: boolean; has_override: boolean }>
        }>(`/owner/menu-categories/${uuid}/branches-status`)
    }

    updateCategoryBranch(categoryUuid: string, branchUuid: string, payload: Record<string, any>) {
        return this.patch<{
            success: boolean
            message: string
            branch: { branch_uuid: string; branch_name: string; is_available: boolean; has_override: boolean }
        }>(`/owner/menu-categories/${categoryUuid}/branches/${branchUuid}`, payload)
    }

    // --- Item Branches ---

    getItemBranchesStatus(uuid: string) {
        return this.get<{
            success: boolean
            item: { uuid: string; name: string; is_available: boolean }
            branches: Array<{ branch_uuid: string; branch_name: string; is_available: boolean; has_override: boolean }>
        }>(`/owner/menu-items/${uuid}/branches-status`)
    }

    updateItemBranch(itemUuid: string, branchUuid: string, payload: Record<string, any>) {
        return this.patch<{
            success: boolean
            message: string
            branch: { branch_uuid: string; branch_name: string; is_available: boolean; has_override: boolean }
        }>(`/owner/menu-items/${itemUuid}/branches/${branchUuid}`, payload)
    }
}
