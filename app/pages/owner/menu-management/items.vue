<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import { useMenuItemSort } from '~/composables/useMenuItemSort'
import MenuPageHeader from '~/components/menu/MenuPageHeader.vue'
import MenuToolbar from '~/components/menu/MenuToolbar.vue'
import ItemCard from '~/components/menu/ItemCard.vue'
import EmptyState from '~/components/menu/EmptyState.vue'
import ItemModal from '~/components/menu/ItemModal.vue'
import Pagination from '~/components/common/Pagination.vue'

definePageMeta({
  layout: 'owner',
})

const route = useRoute()
const router = useRouter()
const menuService = useMenuService()

const items = ref<any[]>([])
const categories = ref<any[]>([])
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

function viewItem(itemUuid: string) {
  router.push(`/owner/menu-management/item/${itemUuid}`)
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

      <div :class="['bg-white border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm', filteredAndSortedItems.length > 0 ? 'rounded-t-2xl border-b-0' : 'rounded-2xl']">
        
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
            <div v-if="filteredAndSortedItems.length > 0">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              title="No Items Yet"
              message="You haven't added any menu items yet."
              actionLabel="Add Item"
              icon="heroicons:plus-circle"
              @action="() => {}"
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
