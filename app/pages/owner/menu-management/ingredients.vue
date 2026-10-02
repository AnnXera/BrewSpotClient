<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import type { Ingredient } from '~/services/MenuService'
import MenuPageHeader from '~/components/menu/MenuPageHeader.vue'
import MenuToolbar from '~/components/menu/MenuToolbar.vue'
import EmptyState from '~/components/menu/EmptyState.vue'
import IngredientCard from '~/components/menu/IngredientCard.vue'
import IngredientModal from '~/components/menu/IngredientModal.vue'
import ConfirmModal from '~/components/common/ConfirmModal.vue'
import Pagination from '~/components/common/Pagination.vue'

definePageMeta({
  layout: 'owner',
})

const route = useRoute()
const router = useRouter()
const menuService = useMenuService()

const ingredients = ref<Ingredient[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

const confirmModal = ref({
  show: false,
  title: '',
  message: '',
  confirmText: '',
  isDestructive: false,
  onConfirm: () => {}
})

const selectedUuids = ref<Set<string>>(new Set())
const isBulkLoading = ref(false)
const bulkActionType = ref<'retire'|'restore'|'delete'>('retire')

const searchQuery = ref('')
const sortBy = ref('name-asc')
const sortOptions = [
  { label: 'Alphabetically: A to Z', value: 'name-asc' },
  { label: 'Alphabetically: Z to A', value: 'name-desc' },
  { label: 'Most Used', value: 'used-desc' },
  { label: 'Least Used', value: 'used-asc' },
]

// Retired ingredients always sink to the bottom.
const filteredAndSorted = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const list = q ? ingredients.value.filter(i => i.name.toLowerCase().includes(q)) : ingredients.value

  return [...list].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
    if (sortBy.value === 'name-desc') return b.name.localeCompare(a.name)
    if (sortBy.value === 'used-desc') return b.used_in - a.used_in || a.name.localeCompare(b.name)
    if (sortBy.value === 'used-asc') return a.used_in - b.used_in || a.name.localeCompare(b.name)
    return a.name.localeCompare(b.name)
  })
})

const currentPage = ref(1)
const itemsPerPage = ref(24) // 24 is a good grid number (divisible by 2, 3, 4)

const paginatedIngredients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredAndSorted.value.slice(start, start + itemsPerPage.value)
})

const lastPage = computed(() => Math.max(1, Math.ceil(filteredAndSorted.value.length / itemsPerPage.value)))
const totalItems = computed(() => filteredAndSorted.value.length)
const fromItem = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1)
const toItem = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalItems.value))

watch([searchQuery, sortBy], () => {
  currentPage.value = 1
})

async function fetchData() {
  isLoading.value = true
  try {
    const res = await menuService.getIngredients({ includeRetired: true })
    ingredients.value = res.ingredients ?? []
  } catch (error) {
    console.error('Failed to fetch ingredients', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)

const isModalOpen = computed(() =>
  route.query.action === 'add-ingredient' || route.query.action === 'edit-ingredient'
)

const ingredientToEdit = computed(() => {
  if (route.query.action === 'edit-ingredient' && route.query.ingredient) {
    return ingredients.value.find(i => i.uuid === route.query.ingredient) || null
  }
  return null
})

function handleAddAction() {
  router.push({ query: { ...route.query, action: 'add-ingredient' } })
}

function editIngredient(uuid: string) {
  router.push({ query: { ...route.query, action: 'edit-ingredient', ingredient: uuid } })
}

function closeModal() {
  const newQuery = { ...route.query }
  delete newQuery.action
  delete newQuery.ingredient
  router.push({ query: newQuery })
}

function toggleActive(ingredient: Ingredient) {
  const retiring = ingredient.is_active

  if (retiring && ingredient.used_in > 0) {
    const items = ingredient.used_in === 1 ? '1 menu item' : `${ingredient.used_in} menu items`
    
    confirmModal.value = {
      show: true,
      title: 'Retire Ingredient?',
      message: `${ingredient.name} is used in ${items}. Those recipes keep it, but it won't show when adding new recipes. Retire it?`,
      confirmText: 'Retire',
      isDestructive: true,
      onConfirm: async () => {
        confirmModal.value.show = false
        await executeToggle(ingredient, retiring)
      }
    }
    return
  }

  executeToggle(ingredient, retiring)
}

async function executeToggle(ingredient: Ingredient, retiring: boolean) {
  try {
    await menuService.updateIngredient(ingredient.uuid, { is_active: !retiring })
    await fetchData()
  } catch (error) {
    console.error('Failed to update ingredient', error)
    errorMessage.value = 'Failed to update ingredient. Please try again.'
    setTimeout(() => { errorMessage.value = '' }, 4000)
  }
}

function toggleSelection(uuid: string, isSelected: boolean) {
  if (isSelected) {
    selectedUuids.value.add(uuid)
  } else {
    selectedUuids.value.delete(uuid)
  }
}

function confirmBulkAction(action: 'retire'|'restore'|'delete') {
  bulkActionType.value = action
  let msg = ''
  let title = ''
  if (action === 'retire') {
    title = 'Retire Ingredients?'
    msg = `You are about to retire ${selectedUuids.value.size} ingredients. Some may be in use in recipes. Proceed?`
  } else if (action === 'restore') {
    title = 'Restore Ingredients?'
    msg = `You are about to restore ${selectedUuids.value.size} ingredients. Proceed?`
  } else {
    title = 'Delete Ingredients?'
    msg = `You are about to permanently delete ${selectedUuids.value.size} ingredients. This cannot be undone. Proceed?`
  }
  
  confirmModal.value = {
    show: true,
    title,
    message: msg,
    confirmText: action.charAt(0).toUpperCase() + action.slice(1),
    isDestructive: action !== 'restore',
    onConfirm: async () => {
      confirmModal.value.show = false
      await executeBulkAction()
    }
  }
}

async function executeBulkAction() {
  isBulkLoading.value = true
  const uuids = Array.from(selectedUuids.value)
  const action = bulkActionType.value
  
  try {
    const promises = uuids.map(uuid => {
      if (action === 'delete') {
        return menuService.deleteIngredient(uuid)
      } else {
        const is_active = action === 'restore'
        return menuService.updateIngredient(uuid, { is_active })
      }
    })
    
    await Promise.allSettled(promises)
    selectedUuids.value.clear()
    await fetchData()
  } catch (error) {
    console.error('Bulk action failed', error)
    errorMessage.value = 'Failed to process some ingredients. Please try again.'
    setTimeout(() => { errorMessage.value = '' }, 4000)
  } finally {
    isBulkLoading.value = false
  }
}

const breadcrumbs = [
  { label: 'Menu Management', to: '/owner/menu-management' },
  { label: 'Ingredients' }
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
        title="Ingredients"
        subtitle="The ingredients your recipes use. Rename or retire them here."
        :breadcrumbs="breadcrumbs"
      />

      <div :class="['bg-white border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm', filteredAndSorted.length > 0 ? 'rounded-t-2xl border-b-0' : 'rounded-2xl']">

        <!-- Toolbar Section -->
        <div class="p-4 sm:p-6 border-b border-[#EEDFC4]">
          <MenuToolbar
            searchPlaceholder="Search Ingredient"
            addButtonLabel="+ Add Ingredient"
            v-model="searchQuery"
            v-model:sortValue="sortBy"
            :sortOptions="sortOptions"
            @add="handleAddAction"
          />
        </div>

        <!-- Content Section -->
        <div class="p-4 sm:p-6">
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="transform -translate-y-4 opacity-0"
            enter-to-class="transform translate-y-0 opacity-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="transform translate-y-0 opacity-100"
            leave-to-class="transform -translate-y-4 opacity-0"
          >
            <div v-if="errorMessage" class="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between shadow-sm">
              <span class="font-medium text-sm">{{ errorMessage }}</span>
              <button @click="errorMessage = ''" class="text-red-500 hover:text-red-700 focus:outline-none rounded-lg p-1 hover:bg-red-100 transition-colors">
                <Icon name="heroicons:x-mark" class="w-5 h-5"/>
              </button>
            </div>
          </Transition>

          <div v-if="isLoading" class="flex justify-center py-20">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 text-[#7D5A50] animate-spin" />
          </div>

          <template v-else>
            <div v-if="filteredAndSorted.length > 0">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <IngredientCard
                  v-for="ingredient in paginatedIngredients"
                  :key="ingredient.uuid"
                  :ingredient="ingredient"
                  :selected="selectedUuids.has(ingredient.uuid)"
                  @edit="editIngredient(ingredient.uuid)"
                  @toggle-active="toggleActive(ingredient)"
                  @update:selected="(val) => toggleSelection(ingredient.uuid, val)"
                />
              </div>
            </div>

            <p v-else-if="searchQuery.trim()" class="text-center text-sm text-[#7D5A50] py-20">
              No ingredients match "{{ searchQuery.trim() }}".
            </p>

            <EmptyState
              v-else
              title="No Ingredients Yet"
              message="Ingredients are added here or when you add them to a menu item's recipe."
              actionLabel="Add Ingredient"
              icon="heroicons:beaker"
              @action="handleAddAction"
            />
          </template>
        </div>
      </div>
      
      <!-- Pagination (Separate Frame) -->
      <div v-if="filteredAndSorted.length > 0" class="bg-white rounded-b-2xl border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm">
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

    <IngredientModal
      :show="isModalOpen"
      :ingredient="ingredientToEdit"
      @close="closeModal"
      @saved="fetchData"
    />

    <ConfirmModal
      :show="confirmModal.show"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :confirmText="confirmModal.confirmText"
      :isDestructive="confirmModal.isDestructive"
      @close="confirmModal.show = false"
      @confirm="confirmModal.onConfirm"
    />

    <!-- Bulk Actions Bar -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-full opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-full opacity-0"
    >
      <div v-if="selectedUuids.size > 0" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-2xl border border-[#EEDFC4] p-3 flex items-center gap-4 min-w-[320px]">
        <div class="px-3 py-1 bg-[#F5F5F5] rounded-lg text-[#7D5A50] font-bold text-sm whitespace-nowrap">
          {{ selectedUuids.size }} selected
        </div>
        <div class="h-6 w-[1px] bg-[#EEDFC4]"></div>
        <div class="flex items-center gap-2">
          <button @click="confirmBulkAction('retire')" :disabled="isBulkLoading" class="px-4 py-2 text-sm font-bold text-[#9E7060] hover:bg-[#FDF8F3] rounded-xl transition-colors disabled:opacity-50">Retire</button>
          <button @click="confirmBulkAction('restore')" :disabled="isBulkLoading" class="px-4 py-2 text-sm font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50">Restore</button>
          <button @click="confirmBulkAction('delete')" :disabled="isBulkLoading" class="px-4 py-2 text-sm font-bold text-[#D9534F] hover:bg-[#FDE8E8] rounded-xl transition-colors disabled:opacity-50">Delete</button>
        </div>
        <div class="h-6 w-[1px] bg-[#EEDFC4]"></div>
        <button @click="selectedUuids.clear()" class="p-2 text-[#B4846C] hover:bg-[#F5F5F5] rounded-xl transition-colors" title="Clear selection">
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>
    </Transition>
  </div>
</template>
