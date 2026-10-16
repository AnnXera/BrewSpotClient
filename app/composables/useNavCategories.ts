import { useMenuService } from './useMenuService'

export interface NavCategory {
    uuid: string
    name: string
}

/**
 * The menu categories listed in the sidebar. Shared state, so a page that adds,
 * renames or deletes a category calls refresh() and the sidebar updates at once.
 */
export function useNavCategories() {
    const categories = useState<NavCategory[]>('nav-menu-categories', () => [])
    const menuService = useMenuService()

    async function refresh() {
        try {
            const res = await menuService.getMenuCategories()
            const list: any[] = (res.categories as any)?.data || res.categories || []
            categories.value = list.map(cat => ({ uuid: cat.uuid || cat.id, name: cat.name || 'Category' }))
        } catch (e) {
            console.error('Failed to fetch menu categories for sidebar', e)
        }
    }

    return { categories, refresh }
}
