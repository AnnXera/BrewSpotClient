<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import { useNavCategories } from '~/composables/useNavCategories'
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
const { canEditMenu } = useMenuEditGate()
const router = useRouter()
const menuService = useMenuService()
const { refresh: refreshNavCategories } = useNavCategories() // keeps the sidebar's category list current
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

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
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

// The pagination frame only joins the card when the grid is showing.
const showGrid = computed(() => !isLoading.value && !loadError.value && filteredAndSortedCategories.value.length > 0)

const loadError = ref('')

async function fetchData() {
  isLoading.value = true
  loadError.value = ''
  try {
    const [catsRes, itemsRes] = await Promise.all([
      menuService.getMenuCategories(),
      menuService.getMenuItems()
    ])

    const fetchedCats = (Array.isArray(catsRes.categories) ? catsRes.categories : catsRes.categories?.data || [])
    items.value = (Array.isArray(itemsRes.items) ? itemsRes.items : itemsRes.items?.data || [])

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
    loadError.value = 'Couldn\'t load your menu. Check your connection and try again.'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)

const pageTitle = computed(() => 'Menu Management')
const pageSubtitle = computed(() => {
  const fallback = 'Add, edit, and delete your menu categories and items.'
  if (isLoading.value || loadError.value) return fallback
  const categoryCount = categories.value.filter(c => c.uuid !== 'uncategorized').length
  const itemCount = items.value.length
  if (!categoryCount && !itemCount) return fallback
  const categoryLabel = categoryCount === 1 ? '1 category' : `${categoryCount} categories`
  const itemLabel = itemCount === 1 ? '1 item' : `${itemCount} items`
  return `${categoryLabel} · ${itemLabel} on your menu`
})

function handleCategoryClick(id: string | number) {
  router.push({ path: `/owner/menu-management/category/${id}` })
}

function handleAddAction() {
  if (!canEditMenu()) return
  router.push({ query: { ...route.query, action: 'add-category' } })
}

const categoryToEdit = computed(() => {
  if (route.query.action === 'edit-category' && route.query.category_id) {
    return categories.value.find(c => c.uuid === route.query.category_id && c.uuid !== 'uncategorized') || null
  }
  return null
})

// The edit modal waits for its category: opened from a link before the list loads,
// it would otherwise start blank and saving would empty the category's items.
const isCategoryModalOpen = computed(() => {
  return route.query.action === 'add-category' || !!categoryToEdit.value
})

// An edit link for a category that no longer exists just drops back to the list.
watch([isLoading, () => route.query.category_id], ([loading]) => {
  if (!loading && route.query.action === 'edit-category' && !categoryToEdit.value) closeCategoryModal()
})

function handleEditCategory(catUuid: string) {
  if (!canEditMenu()) return
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
  if (!canEditMenu()) return
  const name = categories.value.find(c => c.uuid === catUuid)?.name
  askConfirm({
    title: 'Delete Category',
    message: `Delete ${name ? `"${name}"` : 'this category'}? Its items move to Uncategorized; they aren't deleted.`,
    confirmText: 'Delete',
    isDestructive: true,
    onConfirm: () => menuService.deleteMenuCategory(catUuid)
      .then(() => {
        fetchData()
        refreshNavCategories()
      })
      .catch((error) => {
        console.error('Failed to delete category', error)
        showAlert('Delete Failed', 'Failed to delete category. Please try again.')
      }),
  })
}

const links = OWNER_NAV_LINKS
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#fdf3e7]">
    <NavBar :links="links" />
    <main class="flex-1 p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full">
      <MenuPageHeader 
        :title="pageTitle"
        :subtitle="pageSubtitle"
        icon="heroicons:book-open"
      />

      <div :class="['bg-white border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm', showGrid ? 'rounded-t-2xl border-b-0' : 'rounded-2xl']">
        
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

          <div v-else-if="loadError" role="alert" class="flex flex-col items-center text-center py-16">
            <Icon name="heroicons:exclamation-triangle" class="w-10 h-10 text-red-400 mb-3" />
            <p class="font-display font-bold text-[#3B1F0E]">{{ loadError }}</p>
            <button
              type="button"
              class="mt-4 h-10 px-4 rounded-xl border border-[#D8C7B5] bg-white text-[#3B1F0E] text-sm font-bold inline-flex items-center gap-1.5 hover:bg-[#FAF4ED] active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
              @click="fetchData"
            >
              <Icon name="heroicons:arrow-path" class="w-4 h-4" />
              Try again
            </button>
          </div>

          <template v-else>
            <!-- Categories Grid -->
            <div v-if="filteredAndSortedCategories.length > 0">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                <CategoryCard
                  v-for="cat in paginatedCategories"
                  :key="cat.uuid"
                  :category="cat"
                @click="handleCategoryClick"
                @edit="handleEditCategory(cat.uuid)"
                @delete="handleDeleteCategory(cat.uuid)"
              />
              </div>
            </div>

            <div v-else-if="searchQuery.trim()" class="flex flex-col items-center text-center py-16">
              <Icon name="heroicons:magnifying-glass" class="w-10 h-10 text-[#B4846C]/50 mb-3" />
              <p class="font-display font-bold text-[#3B1F0E]">No categories match "{{ searchQuery.trim() }}"</p>
              <button
                type="button"
                class="mt-3 text-sm font-bold text-[#7D5A50] underline underline-offset-2 decoration-[#EEDFC4] hover:decoration-[#7D5A50] rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                @click="searchQuery = ''"
              >
                Clear search
              </button>
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
      <div v-if="showGrid" class="bg-white rounded-b-2xl border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm">
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
