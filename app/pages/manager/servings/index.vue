<!-- app/pages/manager/servings/index.vue -->
<script setup lang="ts">
import type { PlanLock } from '~/utils/planLock'
import DropdownList from '~/components/common/DropdownList.vue'
import SearchInput from '~/components/common/SearchInput.vue'
import CommonPagination from '~/components/common/Pagination.vue'
import ServingsCategoryCard from '~/components/servings/CategoryCard.vue'
import ServingsIngredientsUsedPanel from '~/components/servings/IngredientsUsedPanel.vue'
import ServingsServingLogPanel from '~/components/servings/ServingLogPanel.vue'
import ServingsLogIngredientsModal from '~/components/servings/LogIngredientsModal.vue'
import BranchPicker from '~/components/common/BranchPicker.vue'
import LiveClock from '~/components/common/LiveClock.vue'
import type {
  IngredientUsage,
  IngredientUsageSort,
  ServingCategorySort,
  ServingCategorySummary,
  ServingLogDetail,
  ServingLogEntry,
  ServingLogIngredient,
} from '~/services/ServingService'
import { spoilageItemLabel, type SpoilageLog } from '~/services/PosService'

// Shared with owners, who reach it at /owner/servings for any of their branches.
definePageMeta({
  role: ['Manager', 'Cafe Owner'],
  alias: ['/owner/servings'],
})

const workspace = useBranchWorkspace()
const { links, basePath, lockAudience, branchUuid, branchOptions, showBranchPicker } = workspace

// Opens the category's items (for the selected branch).
function openCategory(c: ServingCategorySummary) {
  navigateTo({ path: `${basePath}/servings/${c.uuid ?? 'uncategorized'}`, query: workspace.isOwner ? { branch: branchUuid.value } : {} })
}

const CATEGORIES_PER_PAGE = 6
const REFRESH_MS = 30_000

const service = useServingService(workspace.scope)

// Live clock in the header

// Categories
const categorySearch = ref('')
const categorySort = ref<ServingCategorySort>('name')
const categoryPage = ref(1)
const categories = ref<ServingCategorySummary[]>([])
const categoryLastPage = ref(1)
const lowStockThresholdPercent = ref<number | null>(null)
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

// Spoilage (logged on the registers; voided here)
const spoilage = ref<SpoilageLog[]>([])
const spoilageTotal = ref(0)
const voidTarget = ref<SpoilageLog | null>(null)
const voidingUuid = ref<string | null>(null)

const loading = ref(true)
const errorMessage = ref('')
// API 403: the cafe's plan lacks the feature or its subscription has expired.
const planLock = ref<PlanLock | null>(null)
const planLocked = computed(() => !!planLock.value)

// Scroll reveal observer that activates sections as they scroll into view
useScrollReveal(categories)

// Refresh trigger counter to animate circle graphs and panels on refresh
const refreshKey = ref(0)

// Export today: every list for the selected branch as an Excel file.
const { exporting, exportToday } = useServingsExport(service)
async function handleExport() {
  if (!branchUuid.value || exporting.value) return
  try {
    await exportToday(branchUuid.value, workspace.branchName.value || 'Branch')
  } catch (e: any) {
    console.warn('Servings export error:', e)
    errorMessage.value = e?.data?.message ?? 'The Excel file could not be created. Please try again.'
  }
}

function failure(e: any, fallback: string) {
  planLock.value = planLockFromError(e)
  errorMessage.value = planLock.value ? '' : e?.data?.message ?? fallback
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
  lowStockThresholdPercent.value = res.low_stock_threshold_percent ?? null
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

// Ingredients one log entry used, shown in a modal when its row is clicked.
const logEntry = ref<ServingLogEntry | null>(null)
const logDetail = ref<ServingLogDetail | null>(null)
const logIngredients = ref<ServingLogIngredient[]>([])
const logIngredientsLoading = ref(false)
const logIngredientsError = ref('')
let logRequest = 0

async function openLogEntry(entry: ServingLogEntry) {
  const id = ++logRequest
  logEntry.value = entry
  logDetail.value = null
  logIngredients.value = []
  logIngredientsError.value = ''
  logIngredientsLoading.value = true
  try {
    const res = await service.logIngredients(branchUuid.value, entry.uuid)
    if (id !== logRequest) return
    logDetail.value = res.entry
    logIngredients.value = res.ingredients
  } catch (e: any) {
    if (id !== logRequest) return
    logIngredientsError.value = e?.data?.message ?? 'Could not load the ingredients for this serving.'
  } finally {
    if (id === logRequest) logIngredientsLoading.value = false
  }
}

function closeLogEntry() {
  logRequest++
  logEntry.value = null
}

async function loadSpoilage() {
  const res = await service.spoilage(branchUuid.value)
  spoilage.value = res.logs
  spoilageTotal.value = res.total
}

async function confirmVoid() {
  const entry = voidTarget.value
  voidTarget.value = null
  if (!entry) return
  voidingUuid.value = entry.uuid
  errorMessage.value = ''
  try {
    await service.voidSpoilage(branchUuid.value, entry.uuid)
    // Remaining servings on the category cards change with it.
    await Promise.all([loadSpoilage(), loadCategories()])
  } catch (e: any) {
    failure(e, 'Could not void the spoilage entry.')
  } finally {
    voidingUuid.value = null
  }
}

async function loadAll() {
  if (!branchUuid.value) return
  errorMessage.value = ''
  try {
    await Promise.all([loadCategories(), loadIngredients(), loadLog(), loadSpoilage()])
  } catch (e: any) {
    failure(e, 'Could not load servings.')
  }
}

async function handleRefresh() {
  refreshKey.value++
  await loadAll()
}

// Debounce the text searches; sort and page changes reload right away.
// Each search has its own timer, so typing in one doesn't cancel the other's pending load.
const searchTimers = new Map<() => Promise<void>, ReturnType<typeof setTimeout>>()
function debounced(fn: () => Promise<void>) {
  clearTimeout(searchTimers.get(fn))
  searchTimers.set(fn, setTimeout(() => fn().catch((e) => failure(e, 'Could not load servings.')), 300))
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
  closeLogEntry()
  loading.value = true
  categoryPage.value = 1
  await loadAll()
  loading.value = false
})

useAutoRefresh(async () => {
  refreshKey.value++
  await loadAll()
}, { interval: REFRESH_MS })

onMounted(async () => {
  try {
    if (!(await workspace.loadBranches())) errorMessage.value = workspace.noBranchMessage
  } catch (e: any) {
    failure(e, 'Could not load your branches.')
  }
  loading.value = false
})

onBeforeUnmount(() => {
  for (const timer of searchTimers.values()) clearTimeout(timer)
})
</script>

<template>
  <div class="dashboard flex min-h-screen flex-col bg-[#FDF3E7] md:flex-row">
    <NavBar :links="links" />

    <!-- Extra bottom room so the floating clock never covers the last card -->
    <main class="flex-1 overflow-x-hidden px-4 pt-6 pb-24 sm:px-6 md:px-10 md:pt-10 md:pb-24 xl:px-12">
      <div class="mx-auto max-w-[1360px] space-y-6">
        
        <!-- Header: Consistent Editorial Aesthetic -->
        <!-- Wraps: the controls drop below the title only when they can't fit beside it -->
        <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-2">
          <div class="min-w-0">
            <!-- Title + Badge -->
            <div class="flex flex-wrap items-end gap-x-3 gap-y-2">
              <h1 class="font-display text-[30px] sm:text-[34px] md:text-[38px] font-bold leading-tight tracking-[-0.02em] text-[#3B1F0E]">
                Servings Management
              </h1>
              <!-- Bottom-aligned with a small lift so the pills settle low beside the title -->
              <div class="mb-0.5 flex flex-wrap items-center gap-2">
                <ServingsHeaderBadge variant="live" />
                <ServingsHeaderBadge v-if="lowStockThresholdPercent" variant="alert" :percent="lowStockThresholdPercent" />
              </div>
            </div>

            <!-- Subtitle line -->
            <p class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#8B6656]">
              <span class="flex items-center gap-1.5">
                <Icon name="heroicons:cake" class="h-3.5 w-3.5 shrink-0 text-[#B4846C]" />
                <span>Portion limits & real-time inventory countdown</span>
              </span>
              <span class="text-[#D9C3A5]">/</span>
              <span>Updated automatically every 30s</span>
            </p>
          </div>

          <!-- Right side: branch + export beside the title (the clock floats bottom-right) -->
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <BranchPicker v-if="showBranchPicker" v-model="branchUuid" :options="branchOptions" />

          <button
            v-if="!planLocked && branchUuid"
            type="button"
            class="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[#E3CFB4] bg-white px-4 text-[13px] font-bold text-[#3B1F0E] shadow-[0_1px_2px_rgba(59,31,14,0.04)] transition-colors hover:border-[#B4846C] hover:bg-[#FAF4ED] outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            :disabled="loading || exporting"
            :title="`Excel file of today's servings, items, serving log, ingredients and spoilage${workspace.branchName.value ? ` at ${workspace.branchName.value}` : ''}`"
            @click="handleExport"
          >
            <Icon :name="exporting ? 'heroicons:arrow-path' : 'heroicons:arrow-down-tray'" class="h-[18px] w-[18px]" :class="{ 'animate-spin': exporting }" />
            {{ exporting ? 'Preparing…' : 'Export today' }}
          </button>
          </div>
        </header>

        <LiveClock floating />

        <!-- Error Message Alert -->
        <div
          v-if="errorMessage"
          role="alert"
          class="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-[14px] text-rose-800 shadow-2xs"
        >
          <Icon name="heroicons:exclamation-circle" class="h-5 w-5 shrink-0 text-rose-600" />
          <p class="font-medium">{{ errorMessage }}</p>
        </div>

        <SubscriptionLockedState v-if="planLock" :lock="planLock" :audience="lockAudience" />

        <template v-if="!planLocked && branchUuid">
          <!-- Categories Card Section with Scroll Reveal -->
          <section
            data-walkthrough="servings-categories"
            class="scroll-reveal bg-white border border-[#E3CFB4] rounded-2xl shadow-xs overflow-hidden"
          >
            <!-- Toolbar: Search, Sort, Title -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-[#E3CFB4] bg-[#FFFDF9]/60">
              <div class="flex items-center gap-2">
                <h2 class="font-display font-bold text-[18px] text-[#3B1F0E]">Menu Categories</h2>
                <span class="hidden sm:inline-block rounded-full bg-[#FDF3E7] border border-[#E3CFB4] px-2.5 py-0.5 text-xs font-semibold text-[#7D5A50]">
                  Click to manage portions
                </span>
              </div>

              <div class="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
                <SearchInput v-model="categorySearch" placeholder="Search category..." class="flex-1 sm:w-60" />
                <div class="flex items-center gap-1.5 h-11 px-3 bg-white border border-[#E3CFB4] rounded-xl font-sans text-sm font-medium text-[#7D5A50] shrink-0 shadow-2xs">
                  <Icon name="heroicons:bars-3-bottom-left" class="w-4 h-4 text-[#B4846C]" />
                  <DropdownList v-model="categorySort" :options="categorySortOptions" bare align="right" aria-label="Sort categories" />
                </div>
              </div>
            </div>

            <!-- Categories Content -->
            <div class="p-5 min-h-[160px]">
              <!-- Loading Skeleton -->
              <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <div v-for="n in 6" :key="n" class="h-[108px] rounded-2xl bg-[#FAF4ED]/60 border border-[#E3CFB4]/60 animate-pulse p-5 flex items-center gap-4">
                  <div class="size-[68px] rounded-full bg-[#EBE0D2]" />
                  <div class="flex-1 space-y-2">
                    <div class="h-4 w-28 bg-[#EBE0D2] rounded" />
                    <div class="h-6 w-16 bg-[#EBE0D2] rounded" />
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else-if="!categories.length" class="flex flex-col items-center justify-center py-12 text-center">
                <div class="size-14 rounded-full bg-[#FDF3E7] border border-[#E3CFB4] flex items-center justify-center text-[#9E7060] mb-3">
                  <Icon name="heroicons:folder-open" class="w-7 h-7" />
                </div>
                <p class="font-display font-semibold text-[16px] text-[#3B1F0E]">No categories found</p>
                <p class="text-[13px] text-[#8B6656] mt-1 max-w-sm">
                  {{ categorySearch ? 'No categories matched your search term.' : 'There are no active menu categories assigned to this branch.' }}
                </p>
              </div>

              <!-- Categories Grid with Emil Stagger Animation & Circle Graph Refresh Trigger -->
              <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <div
                  v-for="(c, idx) in categories"
                  :key="c.uuid ?? 'uncategorized'"
                  class="stagger-card"
                  :style="{ animationDelay: `${idx * 40}ms` }"
                >
                  <ServingsCategoryCard
                    :category="c"
                    :refresh-trigger="refreshKey"
                    @select="openCategory(c)"
                  />
                </div>
              </div>
            </div>

            <!-- Pagination Footer (only if more than 1 page) -->
            <div v-if="categoryLastPage > 1" class="border-t border-[#E3CFB4] bg-[#FFFDF9]/60 px-5">
              <CommonPagination :page="categoryPage" :last-page="categoryLastPage" @change="categoryPage = $event" />
            </div>
          </section>

          <div
            data-walkthrough="servings-usage"
            class="grid grid-cols-1 xl:grid-cols-2 gap-5"
          >
            <ServingsIngredientsUsedPanel
              v-model:search="ingredientSearch"
              v-model:sort="ingredientSort"
              :ingredients="ingredients"
              :loading="loading"
            />
            <ServingsServingLogPanel :entries="log" :loading="loading" @select="openLogEntry" />
            <ServingsLogIngredientsModal
              :entry="logEntry"
              :detail="logDetail"
              :ingredients="logIngredients"
              :loading="logIngredientsLoading"
              :error="logIngredientsError"
              @close="closeLogEntry"
              @retry="logEntry && openLogEntry(logEntry)"
            />
          </div>

          <ServingsSpoilagePanel
            :entries="spoilage"
            :total="spoilageTotal"
            :loading="loading"
            :voiding-uuid="voidingUuid"
            @void="voidTarget = $event"
          />
        </template>
      </div>

      <CommonConfirmModal
        :show="!!voidTarget"
        title="Void this spoilage entry?"
        :message="voidTarget ? `${voidTarget.quantity} ${spoilageItemLabel(voidTarget)} logged by ${voidTarget.logged_by ?? 'staff'} will go back into today's servings. The entry stays in the list as voided.` : ''"
        confirm-text="Void entry"
        is-destructive
        @close="voidTarget = null"
        @confirm="confirmVoid"
      />
    </main>
  </div>
</template>

<style scoped>
/* Scroll reveal: Elements start slightly offset and fade/translate in when scrolled into view */
.scroll-reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 750ms cubic-bezier(0.16, 1, 0.3, 1), transform 750ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}

.scroll-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@keyframes staggerIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.stagger-card {
  animation: staggerIn 220ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal,
  .stagger-card {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
</style>
