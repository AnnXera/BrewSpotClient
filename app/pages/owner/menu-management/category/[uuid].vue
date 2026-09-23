<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import MenuPageHeader from '~/components/menu/MenuPageHeader.vue'
import MenuToolbar from '~/components/menu/MenuToolbar.vue'
import ItemCard from '~/components/menu/ItemCard.vue'
import EmptyState from '~/components/menu/EmptyState.vue'
import ItemModal from '~/components/menu/ItemModal.vue'
import AddEditItemToCategory from '~/components/menu/AddEditItemToCategory.vue'

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

const searchQuery = ref('')
const sortBy = ref('name-asc')

const sortOptions = [
  { label: 'Alphabetically: A to Z', value: 'name-asc' },
  { label: 'Alphabetically: Z to A', value: 'name-desc' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
]

const filteredAndSortedItems = computed(() => {
  let result = [...items.value]
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(item => 
      (item.menu_name || '').toLowerCase().includes(q)
    )
  }
  
  result.sort((a, b) => {
    if (sortBy.value === 'name-asc') return (a.menu_name || '').localeCompare(b.menu_name || '')
    if (sortBy.value === 'name-desc') return (b.menu_name || '').localeCompare(a.menu_name || '')
    
    const priceA = parseFloat(a.base_price) || 0
    const priceB = parseFloat(b.base_price) || 0
    
    if (sortBy.value === 'price-asc') return priceA - priceB
    if (sortBy.value === 'price-desc') return priceB - priceA
    
    return 0
  })
  
  return result
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

function handleEditItem(itemUuid: string) {
  router.push({ query: { ...route.query, action: 'edit-item', item: itemUuid } })
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

      <div class="bg-white rounded-2xl border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm">
        
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
        <div class="p-4 sm:p-6 min-h-[400px]">
          <div v-if="isLoading" class="flex justify-center py-20">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 text-[#7D5A50] animate-spin" />
          </div>

          <template v-else>
            <!-- Items Grid -->
            <div v-if="filteredAndSortedItems.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <ItemCard 
                v-for="item in filteredAndSortedItems" 
                :key="item.id" 
                :item="item"
                @edit="handleEditItem(item.uuid)"
                @delete="handleDeleteItem(item.uuid)"
              />
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

        <!-- Pagination -->
        <div class="p-4 border-t border-[#EEDFC4] flex justify-center items-center gap-6">
          <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FBF2E1] transition-colors group">
            <Icon name="heroicons:chevron-left" class="w-5 h-5 text-[#B4846C] group-hover:text-[#7D5A50]" />
          </button>
          <span class="text-sm font-bold text-[#7D5A50]">Page 1 of 1</span>
          <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FBF2E1] transition-colors group">
            <Icon name="heroicons:chevron-right" class="w-5 h-5 text-[#B4846C] group-hover:text-[#7D5A50]" />
          </button>
        </div>
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
