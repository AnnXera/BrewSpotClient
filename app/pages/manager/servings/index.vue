<!-- app/pages/manager/servings.vue -->
<script setup lang="ts">
import type {
  IngredientUsage,
  IngredientUsageSort,
  ManagedBranch,
  ServingCategorySort,
  ServingCategorySummary,
  ServingLogEntry,
} from '~/services/ServingService'

definePageMeta({
  role: 'Manager',
})

const links = [
  { label: 'Dashboard', to: '/manager/dashboard', icon: 'squares-2x2' },
  { label: 'Servings', to: '/manager/servings', icon: 'cake' },
]

const CATEGORIES_PER_PAGE = 6
const REFRESH_MS = 30_000

const service = useServingService('manager')

const branches = ref<ManagedBranch[]>([])
const branchUuid = ref('')

// Live clock in the header
const now = ref(new Date())
const timeLabel = computed(() =>
  now.value.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '').toUpperCase(),
)
const dateLabel = computed(() =>
  now.value.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
)

// Categories
const categorySearch = ref('')
const categorySort = ref<ServingCategorySort>('name')
const categoryPage = ref(1)
const categories = ref<ServingCategorySummary[]>([])
const categoryLastPage = ref(1)
const categorySortOptions: { label: string; value: ServingCategorySort }[] = [
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Most left', value: 'remaining_desc' },
  { label: 'Least left', value: 'remaining_asc' },
]

// Ingredients used
const ingredientSearch = ref('')
const ingredientSort = ref<IngredientUsageSort>('name')
const ingredients = ref<IngredientUsage[]>([])

// Serving log
const log = ref<ServingLogEntry[]>([])

const loading = ref(true)
const errorMessage = ref('')
const planLocked = ref(false) // API 403: plan has no menu management

function failure(e: any, fallback: string) {
  planLocked.value = e?.response?.status === 403 && !!e?.data?.required_feature
  errorMessage.value = planLocked.value
    ? 'Servings management is not included in your cafe\'s plan.'
    : e?.data?.message ?? fallback
}

async function loadCategories() {
  const res = await service.categories(branchUuid.value, {
    search: categorySearch.value.trim(),
    sort: categorySort.value,
    page: categoryPage.value,
    per_page: CATEGORIES_PER_PAGE,
  })
  categories.value = res.categories.data
  categoryLastPage.value = res.categories.last_page
}

async function loadIngredients() {
  const res = await service.ingredientsUsed(branchUuid.value, {
    search: ingredientSearch.value.trim(),
    sort: ingredientSort.value,
  })
  ingredients.value = res.ingredients
}

async function loadLog() {
  const res = await service.log(branchUuid.value, { per_page: 50 })
  log.value = res.log.data
}

async function loadAll() {
  if (!branchUuid.value) return
  errorMessage.value = ''
  try {
    await Promise.all([loadCategories(), loadIngredients(), loadLog()])
  } catch (e: any) {
    failure(e, 'Could not load servings.')
  }
}

// Debounce the text searches; sort and page changes reload right away.
let searchTimer: ReturnType<typeof setTimeout> | undefined
function debounced(fn: () => Promise<void>) {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fn().catch((e) => failure(e, 'Could not load servings.')), 300)
}

watch(categorySearch, () => {
  categoryPage.value = 1
  debounced(loadCategories)
})
watch([categorySort], () => {
  categoryPage.value = 1
  loadCategories().catch((e) => failure(e, 'Could not load servings.'))
})
watch(categoryPage, () => loadCategories().catch((e) => failure(e, 'Could not load servings.')))
watch(ingredientSearch, () => debounced(loadIngredients))
watch(ingredientSort, () => loadIngredients().catch((e) => failure(e, 'Could not load servings.')))
watch(branchUuid, async () => {
  loading.value = true
  categoryPage.value = 1
  await loadAll()
  loading.value = false
})

let clockTimer: ReturnType<typeof setInterval> | undefined
let refreshTimer: ReturnType<typeof setInterval> | undefined

onMounted(async () => {
  clockTimer = setInterval(() => (now.value = new Date()), 1000)
  refreshTimer = setInterval(loadAll, REFRESH_MS)

  try {
    const res = await service.managedBranches()
    branches.value = res.branches
    if (!res.branches.length) errorMessage.value = 'You are not assigned to a branch yet.'
    else branchUuid.value = res.branches[0]!.uuid
  } catch (e: any) {
    failure(e, 'Could not load your branches.')
  }
  loading.value = false
})

onBeforeUnmount(() => {
  clearInterval(clockTimer)
  clearInterval(refreshTimer)
  clearTimeout(searchTimer)
})
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FFF8EA]">
    <NavBar :links="links" />
    <main class="flex-1 min-w-0 p-6 lg:p-12 flex flex-col gap-6">
      <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <h1 class="font-display font-bold text-[36px] leading-[39px] text-[#3D2B24]">Servings Management</h1>
          <p class="text-[16px] text-[#9E7060]">Manage your servings portions here.</p>
        </div>
        <div class="flex items-center gap-3">
          <select
            v-if="branches.length > 1"
            v-model="branchUuid"
            class="bg-white border border-[#3D2B24] rounded-2xl px-4 py-[18px] text-[16px] outline-none"
            aria-label="Branch"
          >
            <option v-for="b in branches" :key="b.uuid" :value="b.uuid">{{ b.branch_name }}</option>
          </select>
          <div class="bg-white border border-[#3D2B24] rounded-2xl p-[18px] flex items-center gap-3 text-[16px] text-black whitespace-nowrap">
            <span>{{ timeLabel }}</span>
            <span>|</span>
            <span>{{ dateLabel }}</span>
          </div>
        </div>
      </header>

      <p
        v-if="errorMessage"
        role="alert"
        class="bg-[#FFE0E0] text-[#B31E1E] border border-[#B31E1E]/20 rounded-xl px-4 py-3 text-[14px]"
      >
        {{ errorMessage }}
      </p>

      <template v-if="!planLocked && branchUuid">
        <!-- Categories -->
        <section class="bg-white border border-[#EDD8CC] rounded-2xl overflow-hidden">
          <div class="flex items-center justify-between gap-3 px-[22px] py-[18px] border-b border-[#EDD8CC]">
            <div class="flex-1 flex items-center gap-3 bg-[#FFF8EA] border border-[#EDD8CC] rounded-xl p-3">
              <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-[#7D5A50]/60 shrink-0" />
              <input
                v-model="categorySearch"
                type="text"
                placeholder="Search Category"
                class="w-full bg-transparent outline-none text-[14px] text-[#3D2B24] placeholder:text-[#7D5A50]/40"
              >
            </div>
            <label class="flex items-center gap-1.5 bg-[#FFF8EA] border border-[#EDD8CC] rounded-xl p-3 text-[14px] font-medium text-[#7D5A50]">
              <Icon name="heroicons:bars-3-bottom-left" class="w-4 h-4" />
              <select v-model="categorySort" class="bg-transparent outline-none cursor-pointer" aria-label="Sort categories">
                <option v-for="o in categorySortOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </label>
          </div>

          <div class="px-[22px] py-[18px] min-h-[120px]">
            <p v-if="loading" class="text-[14px] text-[#9E7060]">Loading...</p>
            <p v-else-if="!categories.length" class="text-[14px] text-[#9E7060]">
              No categories are visible at this branch.
            </p>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-6">
              <ServingsCategoryCard v-for="c in categories" :key="c.uuid ?? 'uncategorized'" :category="c" />
            </div>
          </div>

          <div class="border-t border-[#EDD8CC]">
            <CommonPagination :page="categoryPage" :last-page="categoryLastPage" @change="categoryPage = $event" />
          </div>
        </section>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <ServingsIngredientsUsedPanel
            v-model:search="ingredientSearch"
            v-model:sort="ingredientSort"
            :ingredients="ingredients"
            :loading="loading"
          />
          <ServingsServingLogPanel :entries="log" :loading="loading" />
        </div>
      </template>
    </main>
  </div>
</template>
