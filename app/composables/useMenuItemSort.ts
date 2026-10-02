import type { Ref } from 'vue'

export const menuItemSortOptions = [
  { label: 'Alphabetically: A to Z', value: 'name-asc' },
  { label: 'Alphabetically: Z to A', value: 'name-desc' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
]

export function sortMenuItems<T extends { menu_name?: string; base_price?: string | number }>(items: T[], sortBy: string): T[] {
  return [...items].sort((a, b) => {
    if (sortBy === 'name-asc') return (a.menu_name || '').localeCompare(b.menu_name || '')
    if (sortBy === 'name-desc') return (b.menu_name || '').localeCompare(a.menu_name || '')

    const priceA = parseFloat(String(a.base_price)) || 0
    const priceB = parseFloat(String(b.base_price)) || 0

    if (sortBy === 'price-asc') return priceA - priceB
    if (sortBy === 'price-desc') return priceB - priceA

    return 0
  })
}

// Search by name plus the shared sort options used across Menu Management.
export function useMenuItemSort<T extends { menu_name?: string; base_price?: string | number }>(items: Ref<T[]>) {
  const searchQuery = ref('')
  const sortBy = ref('name-asc')

  const filteredAndSortedItems = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    const list = q
      ? items.value.filter(item => (item.menu_name || '').toLowerCase().includes(q))
      : items.value
    return sortMenuItems(list, sortBy.value)
  })

  return { searchQuery, sortBy, sortOptions: menuItemSortOptions, filteredAndSortedItems }
}
