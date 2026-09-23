<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import MenuPageHeader from '~/components/menu/MenuPageHeader.vue'
import MenuToolbar from '~/components/menu/MenuToolbar.vue'
import ItemCard from '~/components/menu/ItemCard.vue'
import EmptyState from '~/components/menu/EmptyState.vue'
import ItemModal from '~/components/menu/ItemModal.vue'

definePageMeta({
  layout: 'owner',
})

const route = useRoute()
const router = useRouter()
const menuService = useMenuService()

const items = ref<any[]>([])
const categories = ref<any[]>([])
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
    const [itemsRes, catsRes] = await Promise.all([
      menuService.getMenuItems(),
      menuService.getMenuCategories()
    ])
    items.value = (itemsRes.items as any)?.data || itemsRes.items || []
    
    const fetchedCats = (catsRes.categories as any)?.data || catsRes.categories || []
    categories.value = [
      ...fetchedCats,
      {
        id: 'uncategorized',
        uuid: 'uncategorized',
        name: 'Uncategorized',
        description: 'Items that do not belong to any category',
      }
    ]
  } catch (error) {
    console.error('Failed to fetch all items', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)

const isItemModalOpen = computed(() => {
  return route.query.action === 'add-item' || route.query.action === 'edit-item'
})

const itemToEdit = computed(() => {
  if (route.query.action === 'edit-item' && route.query.item) {
    return items.value.find(i => i.uuid === route.query.item) || null
  }
  return null
})

function handleAddAction() {
  router.push({ query: { ...route.query, action: 'add-item' } })
}

function handleEditItem(itemUuid: string) {
  router.push({ query: { ...route.query, action: 'edit-item', item: itemUuid } })
}

function closeItemModal() {
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

const breadcrumbs = [
  { label: 'Menu Management', to: '/owner/menu-management' },
  { label: 'Menu Items' }
]

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
        title="Menu Items"
        subtitle="View and manage all items across all categories."
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
              title="No Items Yet"
              message="You haven't added any menu items yet."
              actionLabel="Add Item"
              icon="heroicons:plus-circle"
              @action="() => {}"
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
      @close="closeItemModal"
      @saved="onItemSaved"
    />
  </div>
</template>
