<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import MenuPageHeader from '~/components/menu/MenuPageHeader.vue'
import MenuToolbar from '~/components/menu/MenuToolbar.vue'
import CategoryCard from '~/components/menu/CategoryCard.vue'
import EmptyState from '~/components/menu/EmptyState.vue'
import CategoryModal from '~/components/menu/CategoryModal.vue'
import Pagination from '~/components/common/Pagination.vue'
import ConfirmModal from '~/components/common/ConfirmModal.vue'
import AlertModal from '~/components/common/AlertModal.vue'
import { useDialogs } from '~/composables/useDialogs'

definePageMeta({
  layout: 'owner',
})

const route = useRoute()
const router = useRouter()
const menuService = useMenuService()
const { confirmDialog, alertDialog, askConfirm, runConfirm, showAlert } = useDialogs()

const categories = ref<any[]>([])
const items = ref<any[]>([])
const isLoading = ref(true)

const searchQuery = ref('')
const sortBy = ref('name-asc')

const sortOptions = [
  { label: 'Alphabetically: A to Z', value: 'name-asc' },
  { label: 'Alphabetically: Z to A', value: 'name-desc' },
]

const filteredAndSortedCategories = computed(() => {
  let result = [...categories.value]
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(cat => 
      (cat.name || '').toLowerCase().includes(q)
    )
  }
  
  result.sort((a, b) => {
    const nameA = (a.name || '').toLowerCase()
    const nameB = (b.name || '').toLowerCase()
    if (sortBy.value === 'name-asc') return nameA.localeCompare(nameB)
    if (sortBy.value === 'name-desc') return nameB.localeCompare(nameA)
    return 0
  })
  
  return result
})

const currentPage = ref(1)
const itemsPerPage = ref(12)

const paginatedCategories = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredAndSortedCategories.value.slice(start, start + itemsPerPage.value)
})

const lastPage = computed(() => Math.max(1, Math.ceil(filteredAndSortedCategories.value.length / itemsPerPage.value)))
const totalItems = computed(() => filteredAndSortedCategories.value.length)
const fromItem = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1)
const toItem = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalItems.value))

watch([searchQuery, sortBy], () => {
  currentPage.value = 1
})

async function fetchData() {
  isLoading.value = true
  try {
    const [catsRes, itemsRes] = await Promise.all([
      menuService.getMenuCategories(),
      menuService.getMenuItems()
    ])

    const fetchedCats = catsRes.categories?.data || catsRes.categories || []
    items.value = itemsRes.items?.data || itemsRes.items || []

    const hasUncategorizedItems = items.value.some((item: any) => !item.category_uuid)

    categories.value = [...fetchedCats]
    
    if (hasUncategorizedItems) {
      categories.value.push({
        id: 'uncategorized',
        uuid: 'uncategorized',
        name: 'Uncategorized',
        description: 'Items that do not belong to any category',
      })
    }
  } catch (error) {
    console.error('Failed to fetch data', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)

const pageTitle = computed(() => 'Menu Management')
const pageSubtitle = computed(() => 'Add, edit, and delete your menu category and items')

function handleCategoryClick(id: string | number) {
  router.push({ path: `/owner/menu-management/category/${id}` })
}

function handleAddAction() {
  router.push({ query: { ...route.query, action: 'add-category' } })
}

const isCategoryModalOpen = computed(() => {
  return route.query.action === 'add-category' || route.query.action === 'edit-category'
})

const categoryToEdit = computed(() => {
  if (route.query.action === 'edit-category' && route.query.category_id) {
    return categories.value.find(c => c.uuid === route.query.category_id) || null
  }
  return null
})

function handleEditCategory(catUuid: string) {
  router.push({ query: { ...route.query, action: 'edit-category', category_id: catUuid } })
}

function closeCategoryModal() {
  const newQuery = { ...route.query }
  delete newQuery.action
  delete newQuery.category_id
  router.push({ query: newQuery })
}

function onCategorySaved() {
  fetchData()
}

function handleDeleteCategory(catUuid: string) {
  askConfirm({
    title: 'Delete Category',
    message: 'Are you sure you want to delete this category?',
    confirmText: 'Delete',
    isDestructive: true,
    onConfirm: () => menuService.deleteMenuCategory(catUuid)
      .then(() => fetchData())
      .catch((error) => {
        console.error('Failed to delete category', error)
        showAlert('Delete Failed', 'Failed to delete category. Please try again.')
      }),
  })
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
      />

      <div :class="['bg-white border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm', filteredAndSortedCategories.length > 0 ? 'rounded-t-2xl border-b-0' : 'rounded-2xl']">
        
        <!-- Toolbar Section -->
        <div class="p-4 sm:p-6 border-b border-[#EEDFC4]">
          <MenuToolbar 
            searchPlaceholder="Search Category"
            addButtonLabel="+ Add Category"
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
            <!-- Categories Grid -->
            <div v-if="filteredAndSortedCategories.length > 0">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <CategoryCard 
                  v-for="cat in paginatedCategories" 
                  :key="cat.id" 
                  :category="cat"
                @click="handleCategoryClick"
                @edit="handleEditCategory(cat.uuid || cat.id)"
                @delete="handleDeleteCategory(cat.uuid || cat.id)"
              />
              </div>
            </div>

            <EmptyState 
              v-else
              title="No Categories Yet"
              message="Create your first category to start building your menu."
              actionLabel="Create Category"
              icon="heroicons:folder-plus"
              @action="handleAddAction"
            />
          </template>
        </div>
      </div>
      
      <!-- Pagination (Separate Frame) -->
      <div v-if="filteredAndSortedCategories.length > 0" class="bg-white rounded-b-2xl border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm">
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

    <CategoryModal
      :show="isCategoryModalOpen"
      :category="categoryToEdit"
      :items="items"
      @close="closeCategoryModal"
      @saved="onCategorySaved"
    />

    <ConfirmModal
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirmText="confirmDialog.confirmText"
      :isDestructive="confirmDialog.isDestructive"
      @close="confirmDialog.show = false"
      @confirm="runConfirm"
    />
    <AlertModal
      :show="alertDialog.show"
      :title="alertDialog.title"
      :message="alertDialog.message"
      @close="alertDialog.show = false"
    />
  </div>
</template>
