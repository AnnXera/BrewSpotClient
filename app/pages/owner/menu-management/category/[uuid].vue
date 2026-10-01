<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import { useMenuItemSort } from '~/composables/useMenuItemSort'
import MenuPageHeader from '~/components/menu/MenuPageHeader.vue'
import MenuToolbar from '~/components/menu/MenuToolbar.vue'
import ItemCard from '~/components/menu/ItemCard.vue'
import EmptyState from '~/components/menu/EmptyState.vue'
import ItemModal from '~/components/menu/ItemModal.vue'
import AddEditItemToCategory from '~/components/menu/AddEditItemToCategory.vue'
import CategoryBranchesPanel from '~/components/menu/CategoryBranchesPanel.vue'
import Pagination from '~/components/common/Pagination.vue'

definePageMeta({
  layout: 'owner',
})

const route = useRoute()
const router = useRouter()
const menuService = useMenuService()

const currentCategoryUuid = computed(() => route.params.uuid as string)

const items = ref<any[]>([])
const allCafeItems = ref<any[]>([])
const categories = ref<any[]>([])
const currentCategory = ref<any>(null)
const isLoading = ref(true)

const { searchQuery, sortBy, sortOptions, filteredAndSortedItems } = useMenuItemSort(items)

const currentPage = ref(1)
const itemsPerPage = ref(12)

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredAndSortedItems.value.slice(start, start + itemsPerPage.value)
})

const lastPage = computed(() => Math.max(1, Math.ceil(filteredAndSortedItems.value.length / itemsPerPage.value)))
const totalItems = computed(() => filteredAndSortedItems.value.length)
const fromItem = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1)
const toItem = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalItems.value))

watch([searchQuery, sortBy], () => {
  currentPage.value = 1
})

async function fetchData() {
  isLoading.value = true
  try {
    const [res, allItemsRes, catRes] = await Promise.all([
      menuService.getMenuItems({ category_uuid: currentCategoryUuid.value }),
      menuService.getMenuItems(),
      menuService.getMenuCategories()
    ])
    
    items.value = res.items?.data || res.items || []
    allCafeItems.value = allItemsRes.items?.data || allItemsRes.items || []
    
    const allCats = catRes.categories?.data || catRes.categories || []
    categories.value = allCats
    
    if (currentCategoryUuid.value === 'uncategorized') {
      currentCategory.value = {
        uuid: 'uncategorized',
        name: 'Uncategorized',
        description: 'Items that do not belong to any category'
      }
    } else {
      currentCategory.value = allCats.find((c: any) => c.uuid === currentCategoryUuid.value || c.id == currentCategoryUuid.value)
    }
  } catch (error) {
    console.error('Failed to fetch data', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)

const pageTitle = computed(() => currentCategory.value?.name || 'Category Items')
const pageSubtitle = computed(() => currentCategory.value?.description || 'Manage items for this category.')

const breadcrumbs = computed(() => {
  return [
    { label: 'Menu Management', to: '/owner/menu-management' },
    { label: currentCategory.value?.name || 'Category' }
  ]
})

const showInnerItemModal = ref(false)
const isItemModalOpen = computed(() => route.query.action === 'add-item' || route.query.action === 'edit-item' || showInnerItemModal.value)

const itemToEdit = computed(() => {
  if (route.query.action === 'edit-item' && route.query.item) {
    return items.value.find(i => i.uuid === route.query.item) || null
  }
  return null
})

function handleAddAction() {
  router.push({ query: { ...route.query, action: 'assign-items' } })
}

function viewItem(itemUuid: string) {
  router.push({ path: `/owner/menu-management/item/${itemUuid}`, query: { category: currentCategoryUuid.value } })
}

function closeItemModal() {
  if (showInnerItemModal.value) {
    showInnerItemModal.value = false
    return
  }
  const newQuery = { ...route.query }
  delete newQuery.action
  delete newQuery.item
  router.push({ query: newQuery })
}

function onItemSaved() {
  fetchData()
}

function handleDeleteItem(itemUuid: string) {
  if (window.confirm('Are you sure you want to delete this item?')) {
    menuService.deleteMenuItem(itemUuid)
      .then(() => fetchData())
      .catch((error) => {
        console.error('Failed to delete item', error)
        alert('Failed to delete item. Please try again.')
      })
  }
}

const isAssignItemsModalOpen = computed(() => route.query.action === 'assign-items')

function closeAssignItemsModal() {
  const newQuery = { ...route.query }
  delete newQuery.action
  router.push({ query: newQuery })
}

function openAddItemModal() {
  showInnerItemModal.value = true
}

async function onAssignItemsConfirm(selectedItemUuids: string[]) {
  try {
    const formData = new FormData()
    formData.append('name', currentCategory.value.name)
    formData.append('items', JSON.stringify(selectedItemUuids))
    formData.append('_method', 'PATCH')
    
    await menuService.updateMenuCategory(currentCategory.value.uuid, formData)
    fetchData()
    closeAssignItemsModal()
  } catch (error) {
    console.error('Failed to update category items', error)
    alert('Failed to update category items. Please try again.')
  }
}

const links = [
  { label: 'Dashboard', to: '/owner/dashboard', icon: 'squares-2x2' },
  { label: 'Cafe Management', to: '/owner/cafes', icon: 'building-storefront' },
  { label: 'Menu Management', to: '/owner/menu-management', icon: 'book-open' },
  { label: 'Subscription', to: '/owner/subscription', icon: 'credit-card' },
]
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#fdf3e7]">
    <NavBar :links="links" />
    <main class="flex-1 p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full">
      <MenuPageHeader 
        :title="pageTitle"
        :subtitle="pageSubtitle"
        :breadcrumbs="breadcrumbs"
      />

      <div class="flex flex-col lg:flex-row gap-6 items-start">
      <div :class="['flex-1 min-w-0 w-full bg-white border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm', filteredAndSortedItems.length > 0 ? 'rounded-t-2xl border-b-0' : 'rounded-2xl']">
        
        <!-- Toolbar Section -->
        <div class="p-4 sm:p-6 border-b border-[#EEDFC4]">
          <MenuToolbar 
            searchPlaceholder="Search Item"
            addButtonLabel="+ Add Item"
            v-model="searchQuery"
            v-model:sortValue="sortBy"
            :sortOptions="sortOptions"
            @add="handleAddAction"
          />
        </div>

        <!-- Content Section -->
        <div class="p-4 sm:p-6">
          <div v-if="isLoading" class="flex justify-center py-20">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 text-[#7D5A50] animate-spin" />
          </div>

          <template v-else>
            <!-- Items Grid -->
            <div v-if="filteredAndSortedItems.length > 0">
              <div :class="['grid gap-6', currentCategoryUuid === 'uncategorized' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3']">
                <ItemCard 
                  v-for="item in paginatedItems" 
                  :key="item.id" 
                  :item="item"
                  @view="viewItem(item.uuid)"
                  @delete="handleDeleteItem(item.uuid)"
                />
              </div>
            </div>

            <EmptyState 
              v-else
              title="No Items Found"
              message="This category doesn't have any items yet. Add your first item now."
              actionLabel="Add Item"
              icon="heroicons:plus-circle"
              @action="handleAddAction"
            />
          </template>
        </div>
      </div>
      
      <!-- Pagination (Separate Frame) -->
      <div v-if="filteredAndSortedItems.length > 0" class="bg-white rounded-b-2xl border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm">
        <Pagination
          :page="currentPage"
          :last-page="lastPage"
          :total="totalItems"
          :from="fromItem"
          :to="toItem"
          @change="page => currentPage = page"
        />
      </div>

      <CategoryBranchesPanel
        v-if="currentCategoryUuid !== 'uncategorized'"
        :category-uuid="currentCategoryUuid"
      />
      </div>
    </main>

    <ItemModal 
      :show="isItemModalOpen"
      :item="itemToEdit"
      :categories="categories"
      :defaultCategoryUuid="currentCategoryUuid"
      @close="closeItemModal"
      @saved="onItemSaved"
    />

    <AddEditItemToCategory
      :show="isAssignItemsModalOpen"
      :category="currentCategory"
      :items="allCafeItems"
      @close="closeAssignItemsModal"
      @confirm="onAssignItemsConfirm"
      @add-item="openAddItemModal"
    />
  </div>
</template>
