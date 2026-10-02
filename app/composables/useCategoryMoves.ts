import type { Ref } from 'vue'

interface CategorizedItem {
  uuid: string
  menu_name?: string
  category_uuid?: string | null
  category_name?: string | null
}

// An item belongs to one category, so selecting one that is already elsewhere moves it.
export function useCategoryMoves<T extends CategorizedItem>(
  items: Ref<T[]>,
  selectedUuids: Ref<string[]>,
  targetCategoryUuid: Ref<string | null | undefined>,
) {
  function otherCategoryName(item: T): string | null {
    if (!item.category_uuid || item.category_uuid === targetCategoryUuid.value) return null
    return item.category_name || 'another category'
  }

  const movedItems = computed(() =>
    items.value.filter(item => selectedUuids.value.includes(item.uuid) && otherCategoryName(item) !== null),
  )

  return { otherCategoryName, movedItems }
}
