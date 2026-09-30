<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import type { Ingredient } from '~/services/MenuService'
import MenuPageHeader from '~/components/menu/MenuPageHeader.vue'
import MenuToolbar from '~/components/menu/MenuToolbar.vue'
import EmptyState from '~/components/menu/EmptyState.vue'
import IngredientCard from '~/components/menu/IngredientCard.vue'
import IngredientModal from '~/components/menu/IngredientModal.vue'

definePageMeta({
  layout: 'owner',
})

const route = useRoute()
const router = useRouter()
const menuService = useMenuService()

const ingredients = ref<Ingredient[]>([])
const isLoading = ref(true)

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

async function toggleActive(ingredient: Ingredient) {
  const retiring = ingredient.is_active

  if (retiring && ingredient.used_in > 0) {
    const items = ingredient.used_in === 1 ? '1 menu item' : `${ingredient.used_in} menu items`
    const ok = window.confirm(
      `${ingredient.name} is used in ${items}. Those recipes keep it, but it won't show when adding new recipes. Retire it?`
    )
    if (!ok) return
  }

  try {
    await menuService.updateIngredient(ingredient.uuid, { is_active: !retiring })
    await fetchData()
  } catch (error) {
    console.error('Failed to update ingredient', error)
    alert('Failed to update ingredient. Please try again.')
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

      <div class="bg-white rounded-2xl border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm">

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
        <div class="p-4 sm:p-6 min-h-[400px]">
          <div v-if="isLoading" class="flex justify-center py-20">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 text-[#7D5A50] animate-spin" />
          </div>

          <template v-else>
            <div v-if="filteredAndSorted.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <IngredientCard
                v-for="ingredient in filteredAndSorted"
                :key="ingredient.uuid"
                :ingredient="ingredient"
                @edit="editIngredient(ingredient.uuid)"
                @toggle-active="toggleActive(ingredient)"
              />
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
    </main>

    <IngredientModal
      :show="isModalOpen"
      :ingredient="ingredientToEdit"
      @close="closeModal"
      @saved="fetchData"
    />
  </div>
</template>
