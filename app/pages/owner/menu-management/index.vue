<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import MenuPageHeader from '~/components/menu/MenuPageHeader.vue'
import MenuToolbar from '~/components/menu/MenuToolbar.vue'
import CategoryCard from '~/components/menu/CategoryCard.vue'
import ItemCard from '~/components/menu/ItemCard.vue'
import EmptyState from '~/components/menu/EmptyState.vue'

definePageMeta({
  layout: 'owner',
})

const route = useRoute()
const router = useRouter()
const menuService = useMenuService()

const isCategoryView = computed(() => !!route.query.category)
const currentCategoryUuid = computed(() => route.query.category as string)

const categories = ref<any[]>([])
const items = ref<any[]>([])
const currentCategory = ref<any>(null)
const isLoading = ref(true)

async function fetchData() {
  isLoading.value = true
  try {
    if (isCategoryView.value) {
      // Fetch items for this category
      const res = await menuService.getMenuItems({ category_uuid: currentCategoryUuid.value })
      items.value = res.items?.data || res.items || []
      
      // We also need the category details for the header
      const catRes = await menuService.getMenuCategories()
      const allCats = catRes.categories?.data || catRes.categories || []
      currentCategory.value = allCats.find((c: any) => c.uuid === currentCategoryUuid.value || c.id == currentCategoryUuid.value)
    } else {
      // Fetch all categories
      const res = await menuService.getMenuCategories()
      categories.value = res.categories?.data || res.categories || []
    }
  } catch (error) {
    console.error('Failed to fetch data', error)
  } finally {
    isLoading.value = false
  }
}

watch(() => route.query.category, fetchData, { immediate: true })

const pageTitle = computed(() => {
  if (isCategoryView.value) return currentCategory.value?.name || 'Category Items'
  return 'Menu Management'
})

const pageSubtitle = computed(() => {
  if (isCategoryView.value) return currentCategory.value?.description || 'Manage items for this category.'
  return 'Add, edit, and delete your menu category and items'
})

const breadcrumbs = computed(() => {
  if (isCategoryView.value) {
    return [
      { label: 'Menu Management', to: '/owner/menu-management' },
      { label: currentCategory.value?.name || 'Category' }
    ]
  }
  return undefined
})

function handleCategoryClick(id: string | number) {
  router.push({ path: '/owner/menu-management', query: { category: id } })
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
            :searchPlaceholder="isCategoryView ? 'Search Item' : 'Search Category'"
            :addButtonLabel="isCategoryView ? '+ Add Item' : '+ Add Category'"
            @add="() => {}"
          />
        </div>

        <!-- Content Section -->
        <div class="p-4 sm:p-6 min-h-[400px]">
          <div v-if="isLoading" class="flex justify-center py-20">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 text-[#7D5A50] animate-spin" />
          </div>

          <template v-else>
            <!-- Categories Grid -->
            <div v-if="!isCategoryView && categories.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <CategoryCard 
                v-for="cat in categories" 
                :key="cat.id" 
                :category="cat"
                @click="handleCategoryClick"
                @edit="() => {}"
                @delete="() => {}"
              />
            </div>

            <!-- Items Grid -->
            <div v-else-if="isCategoryView && items.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <ItemCard 
                v-for="item in items" 
                :key="item.id" 
                :item="item"
                @edit="() => {}"
                @delete="() => {}"
              />
            </div>

            <!-- Empty States -->
            <EmptyState 
              v-else-if="!isCategoryView"
              title="No Categories Yet"
              message="Create your first category to start building your menu."
              actionLabel="Create Category"
              icon="heroicons:folder-plus"
              @action="() => {}"
            />

            <EmptyState 
              v-else
              title="No Items Found"
              message="This category doesn't have any items yet. Add your first item now."
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
  </div>
</template>
