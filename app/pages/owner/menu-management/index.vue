<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import MenuPageHeader from '~/components/menu/MenuPageHeader.vue'
import MenuToolbar from '~/components/menu/MenuToolbar.vue'
import CategoryCard from '~/components/menu/CategoryCard.vue'
import EmptyState from '~/components/menu/EmptyState.vue'
import CategoryModal from '~/components/menu/CategoryModal.vue'

definePageMeta({
  layout: 'owner',
})

const route = useRoute()
const router = useRouter()
const menuService = useMenuService()

const categories = ref<any[]>([])
const items = ref<any[]>([])
const isLoading = ref(true)

async function fetchData() {
  isLoading.value = true
  try {
    const res = await menuService.getMenuCategories()
    const fetchedCats = res.categories?.data || res.categories || []
    categories.value = [
      ...fetchedCats,
      {
        id: 'uncategorized',
        uuid: 'uncategorized',
        name: 'Uncategorized',
        description: 'Items that do not belong to any category',
      }
    ]

    const itemsRes = await menuService.getMenuItems()
    items.value = itemsRes.items?.data || itemsRes.items || []
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
  if (window.confirm('Are you sure you want to delete this category?')) {
    menuService.deleteMenuCategory(catUuid)
      .then(() => fetchData())
      .catch((error) => {
        console.error('Failed to delete category', error)
        alert('Failed to delete category. Please try again.')
      })
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
      />

      <div class="bg-white rounded-2xl border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm">
        
        <!-- Toolbar Section -->
        <div class="p-4 sm:p-6 border-b border-[#EEDFC4]">
          <MenuToolbar 
            searchPlaceholder="Search Category"
            addButtonLabel="+ Add Category"
            @add="handleAddAction"
          />
        </div>

        <!-- Content Section -->
        <div class="p-4 sm:p-6 min-h-[400px]">
          <div v-if="isLoading" class="flex justify-center py-20">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 text-[#7D5A50] animate-spin" />
          </div>

          <template v-else>
            <!-- Categories Grid -->
            <div v-if="categories.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <CategoryCard 
                v-for="cat in categories" 
                :key="cat.id" 
                :category="cat"
                @click="handleCategoryClick"
                @edit="handleEditCategory(cat.uuid || cat.id)"
                @delete="handleDeleteCategory(cat.uuid || cat.id)"
              />
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

    <CategoryModal
      :show="isCategoryModalOpen"
      :category="categoryToEdit"
      :items="items"
      @close="closeCategoryModal"
      @saved="onCategorySaved"
    />
  </div>
</template>
