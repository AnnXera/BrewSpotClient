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
const { canEditMenu } = useMenuEditGate()
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
const itemsPerPage = ref(15) // divisible by 3, so the 3-column grid fills whole rows

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

const loadError = ref('')

async function fetchData() {
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await menuService.getIngredients({ includeRetired: true })
    ingredients.value = res.ingredients ?? []
    // Drop selections for ingredients that are gone (e.g. after a bulk delete)
    const known = new Set(ingredients.value.map(i => i.uuid))
    for (const uuid of selectedUuids.value) if (!known.has(uuid)) selectedUuids.value.delete(uuid)
  } catch (error) {
    console.error('Failed to fetch ingredients', error)
    loadError.value = 'Couldn\'t load your ingredients. Check your connection and try again.'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)

const ingredientToEdit = computed(() => {
  if (route.query.action === 'edit-ingredient' && route.query.ingredient) {
    return ingredients.value.find(i => i.uuid === route.query.ingredient) || null
  }
  return null
})

// The edit modal waits for its ingredient: opened from a link before the list
// loads, it would otherwise start blank with the default unit and could save that.
const isModalOpen = computed(() =>
  route.query.action === 'add-ingredient' || !!ingredientToEdit.value
)

// An edit link for an ingredient that no longer exists just drops back to the list.
watch([isLoading, () => route.query.ingredient], ([loading]) => {
  if (!loading && route.query.action === 'edit-ingredient' && !ingredientToEdit.value) closeModal()
})

function handleAddAction() {
  if (!canEditMenu()) return
  router.push({ query: { ...route.query, action: 'add-ingredient' } })
}

function editIngredient(uuid: string) {
  if (!canEditMenu()) return
  router.push({ query: { ...route.query, action: 'edit-ingredient', ingredient: uuid } })
}

function closeModal() {
  const newQuery = { ...route.query }
  delete newQuery.action
  delete newQuery.ingredient
  router.push({ query: newQuery })
}

function toggleSelection(uuid: string, isSelected: boolean) {
  if (isSelected) {
    selectedUuids.value.add(uuid)
  } else {
    selectedUuids.value.delete(uuid)
  }
}

function ingredientCount(n: number) {
  return n === 1 ? '1 ingredient' : `${n} ingredients`
}

// Each bulk action only touches the selected ingredients it applies to.
const selectedIngredients = computed(() => ingredients.value.filter(i => selectedUuids.value.has(i.uuid)))
const bulkTargets = computed(() => ({
  retire: selectedIngredients.value.filter(i => i.is_active),
  restore: selectedIngredients.value.filter(i => !i.is_active),
  delete: selectedIngredients.value,
}))

// Bulk changes run a few requests at a time to stay under the API rate limit.
const BULK_CONCURRENCY = 4

async function runWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let index = 0
  const worker = async () => {
    while (index < items.length) {
      const i = index++
      try {
        results[i] = { status: 'fulfilled', value: await task(items[i]!) }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function confirmBulkAction(action: 'retire'|'restore'|'delete') {
  if (!canEditMenu()) return
  const targets = bulkTargets.value[action]
  if (!targets.length) return
  bulkActionType.value = action
  const count = ingredientCount(targets.length)
  const inUse = targets.filter(i => i.used_in > 0).length
  const allInUse = inUse > 1 && inUse === targets.length
  let msg = ''
  let title = ''
  if (action === 'retire') {
    title = 'Retire Ingredients?'
    msg = `Retire ${count}? Retired ingredients stay in the recipes that use them but won't show when adding new recipes.`
      + (allInUse ? ` ${inUse === 2 ? 'Both are' : 'All of them are'} used in recipes.`
        : inUse ? ` ${targets.length === 1 ? 'It is' : inUse === 1 ? '1 of them is' : `${inUse} of them are`} used in a recipe.` : '')
  } else if (action === 'restore') {
    title = 'Restore Ingredients?'
    msg = `Restore ${count}? They'll show again when adding recipes.`
  } else {
    title = 'Delete Ingredients?'
    msg = `Permanently delete ${count}? This cannot be undone.`
      + (inUse ? ` ${allInUse ? (inUse === 2 ? 'Both are' : 'All of them are') : targets.length === 1 ? 'It is' : inUse === 1 ? '1 is' : `${inUse} are`} still used in a menu item or add-on and will be skipped; retire ${targets.length === 1 ? 'it' : 'those'} instead.` : '')
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
  errorMessage.value = ''
  const action = bulkActionType.value
  const uuids = bulkTargets.value[action].map(i => i.uuid)

  try {
    const results = await runWithConcurrency(uuids, BULK_CONCURRENCY, uuid => action === 'delete'
      ? menuService.deleteIngredient(uuid)
      : menuService.updateIngredient(uuid, { is_active: action === 'restore' }))

    selectedUuids.value.clear()
    await fetchData()

    // The server refuses some (e.g. deleting an ingredient a recipe still uses); say which and why.
    const reasons = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason?.data?.message as string | undefined)
    if (reasons.length) {
      const explained = reasons.filter((m): m is string => !!m)
      errorMessage.value = reasons.length === uuids.length && reasons.length === 1
        ? (explained[0] ?? 'That ingredient could not be updated. Please try again.')
        : `${reasons.length} of ${ingredientCount(uuids.length)} were not changed.` + (explained.length ? ' ' + [...new Set(explained)].join(' ') : '')
    }
  } catch (error) {
    console.error('Bulk action failed', error)
    errorMessage.value = 'Failed to process some ingredients. Please try again.'
  } finally {
    isBulkLoading.value = false
  }
}

const retiredCount = computed(() => ingredients.value.filter(i => !i.is_active).length)
const pageSubtitle = computed(() => {
  if (isLoading.value || loadError.value) return 'The ingredients your recipes use. Rename or retire them here.'
  const total = ingredients.value.length
  if (!total) return 'The ingredients your recipes use. Rename or retire them here.'
  return `${ingredientCount(total)}` + (retiredCount.value ? ` · ${retiredCount.value} retired` : '') + '. Rename or retire them here.'
})

const breadcrumbs = [
  { label: 'Menu Management', to: '/owner/menu-management' },
  { label: 'Ingredients' }
]

const links = OWNER_NAV_LINKS
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#fdf3e7]">
    <NavBar :links="links" />
    <main class="flex-1 p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full">
      <MenuPageHeader
        title="Ingredients"
        :subtitle="pageSubtitle"
        :breadcrumbs="breadcrumbs"
        icon="heroicons:beaker"
      />

      <div :class="['bg-white border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm', filteredAndSorted.length > 0 && !loadError && !isLoading ? 'rounded-t-2xl border-b-0' : 'rounded-2xl']">

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
            <div v-if="errorMessage" role="alert" class="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start justify-between gap-3">
              <span class="flex items-start gap-2 text-sm font-medium">
                <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 shrink-0 mt-0.5" />
                {{ errorMessage }}
              </span>
              <button type="button" aria-label="Dismiss" @click="errorMessage = ''" class="shrink-0 inline-flex items-center justify-center text-red-500 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 rounded-lg p-1 hover:bg-red-100 transition-colors">
                <Icon name="heroicons:x-mark" class="w-4 h-4"/>
              </button>
            </div>
          </Transition>

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
            <div v-if="filteredAndSorted.length > 0">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <IngredientCard
                  v-for="ingredient in paginatedIngredients"
                  :key="ingredient.uuid"
                  :ingredient="ingredient"
                  :selected="selectedUuids.has(ingredient.uuid)"
                  @edit="editIngredient(ingredient.uuid)"
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
      <div v-if="filteredAndSorted.length > 0 && !loadError && !isLoading" class="bg-white rounded-b-2xl border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm">
        <Pagination
          :page="currentPage"
          :last-page="lastPage"
          :total="totalItems"
          :from="fromItem"
          :to="toItem"
          @change="page => currentPage = page"
        />
      </div>

      <!-- Bulk Actions Bar: sticks to the bottom of the page content, centered in it (not under the sidebar) -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform translate-y-full opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform translate-y-full opacity-0"
      >
        <div v-if="selectedUuids.size > 0" role="toolbar" aria-label="Bulk actions" class="sticky bottom-6 z-40 mt-6 mx-auto w-fit max-w-full bg-white rounded-2xl shadow-2xl border border-[#EEDFC4] p-2.5 flex flex-wrap items-center gap-2.5">
          <span class="px-3 py-1.5 bg-[#FAF4ED] border border-[#EEDFC4] rounded-lg text-[#3B1F0E] font-bold text-sm whitespace-nowrap tabular-nums">
            {{ selectedUuids.size }} selected
          </span>
          <span class="h-6 w-px bg-[#EEDFC4]" aria-hidden="true"></span>
          <button
            type="button"
            :disabled="isBulkLoading || !bulkTargets.retire.length"
            class="h-9 px-3.5 rounded-xl border border-[#D8C7B5] bg-white text-sm font-bold text-[#5C4037] inline-flex items-center gap-1.5 hover:bg-[#FAF4ED] transition-colors disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="confirmBulkAction('retire')"
          >
            <Icon name="heroicons:archive-box-arrow-down" class="w-4 h-4" />
            Retire<span v-if="bulkTargets.retire.length && bulkTargets.retire.length !== selectedUuids.size" class="tabular-nums">({{ bulkTargets.retire.length }})</span>
          </button>
          <button
            type="button"
            :disabled="isBulkLoading || !bulkTargets.restore.length"
            class="h-9 px-3.5 rounded-xl border border-emerald-200 bg-white text-sm font-bold text-emerald-700 inline-flex items-center gap-1.5 hover:bg-emerald-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            @click="confirmBulkAction('restore')"
          >
            <Icon name="heroicons:arrow-uturn-left" class="w-4 h-4" />
            Restore<span v-if="bulkTargets.restore.length && bulkTargets.restore.length !== selectedUuids.size" class="tabular-nums">({{ bulkTargets.restore.length }})</span>
          </button>
          <button
            type="button"
            :disabled="isBulkLoading"
            class="h-9 px-3.5 rounded-xl border border-red-200 bg-white text-sm font-bold text-red-600 inline-flex items-center gap-1.5 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            @click="confirmBulkAction('delete')"
          >
            <Icon name="heroicons:trash" class="w-4 h-4" />
            Delete
          </button>
          <Icon v-if="isBulkLoading" name="heroicons:arrow-path" class="w-4 h-4 text-[#7D5A50] animate-spin" aria-label="Working" />
          <span class="h-6 w-px bg-[#EEDFC4]" aria-hidden="true"></span>
          <button type="button" @click="selectedUuids.clear()" :disabled="isBulkLoading" class="inline-flex items-center justify-center w-9 h-9 text-[#7D5A50] hover:bg-[#FAF4ED] rounded-xl transition-colors disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40" aria-label="Clear selection" title="Clear selection">
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>
      </Transition>
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

  </div>
</template>
