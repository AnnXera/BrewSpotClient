<!-- app/pages/manager/servings/[uuid].vue -->
<!-- One category's items: set each item's daily limit and switch it on or off for today, then Save Changes. -->
<script setup lang="ts">
import DropdownList from '~/components/common/DropdownList.vue'
import SearchInput from '~/components/common/SearchInput.vue'
import CommonPagination from '~/components/common/Pagination.vue'
import ServingsItemCard from '~/components/servings/ItemCard.vue'
import type {
  CategoryServingChange,
  CategoryServingItem,
  ServingItemSort,
} from '~/services/ServingService'

definePageMeta({
  role: 'Manager',
})

const links = [
  { label: 'Dashboard', to: '/manager/dashboard', icon: 'squares-2x2' },
  { label: 'Servings', to: '/manager/servings', icon: 'cake' },
  { label: 'Floor Plan', to: '/manager/floor-plan', icon: 'map' },
]

const PER_PAGE = 6

const route = useRoute()
const service = useServingService('manager')
const { timeLabel, dateLabel } = useNowClock()

const categoryUuid = computed(() => route.params.uuid as string)
const branchUuid = ref(typeof route.query.branch === 'string' ? route.query.branch : '')

const categoryName = ref('')
const items = ref<CategoryServingItem[]>([])
const page = ref(1)
const lastPage = ref(1)
const search = ref('')
const sort = ref<ServingItemSort>('name')
const sortOptions: { label: string; value: ServingItemSort }[] = [
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Most stock', value: 'stock_desc' },
  { label: 'Least stock', value: 'stock_asc' },
]

// Unsaved edits by item uuid. They survive paging, searching and sorting until saved.
const drafts = ref<Record<string, { daily_limit: number; enabled: boolean }>>({})

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const rowErrors = ref<Record<string, string>>({}) // item uuid -> message from the server
const planLocked = ref(false)

// Activate scroll reveal when items load
useScrollReveal(items)

function limitOf(i: CategoryServingItem) {
  return drafts.value[i.uuid]?.daily_limit ?? i.daily_limit
}
function enabledOf(i: CategoryServingItem) {
  return drafts.value[i.uuid]?.enabled ?? i.enabled
}

// Visible items start on; the manager decides to switch one off. Drops a draft that went back to the saved values.
function settle(i: CategoryServingItem) {
  const d = drafts.value[i.uuid]
  if (d && d.daily_limit === i.daily_limit && d.enabled === i.enabled) delete drafts.value[i.uuid]
}

function setLimit(i: CategoryServingItem, value: number) {
  drafts.value[i.uuid] = { daily_limit: value, enabled: enabledOf(i) }
  delete rowErrors.value[i.uuid]
  settle(i)
}

function toggle(i: CategoryServingItem) {
  drafts.value[i.uuid] = { daily_limit: limitOf(i), enabled: !enabledOf(i) }
  delete rowErrors.value[i.uuid]
  settle(i)
}

const dirtyCount = computed(() => Object.keys(drafts.value).length)

function failure(e: any, fallback: string) {
  planLocked.value = e?.response?.status === 403 && !!e?.data?.required_feature
  errorMessage.value = planLocked.value
    ? 'Servings management is not included in your cafe\'s plan.'
    : e?.data?.message ?? fallback
}

async function load() {
  if (!branchUuid.value) return
  try {
    const res = await service.categoryItems(branchUuid.value, categoryUuid.value, {
      search: search.value.trim(),
      sort: sort.value,
      page: page.value,
      per_page: PER_PAGE,
    })
    categoryName.value = res.category.name
    items.value = res.items.data
    lastPage.value = res.items.last_page
    errorMessage.value = ''
  } catch (e: any) {
    failure(e, 'Could not load this category.')
  }
}

async function save() {
  if (!dirtyCount.value || saving.value) return
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  rowErrors.value = {}

  const changes: CategoryServingChange[] = Object.entries(drafts.value).map(([uuid, d]) => ({
    menu_item_uuid: uuid,
    daily_limit: d.daily_limit,
    enabled: d.enabled,
  }))

  try {
    const res = await service.saveCategoryItems(branchUuid.value, categoryUuid.value, changes)
    drafts.value = {}
    successMessage.value = res.message
    await load()
  } catch (e: any) {
    const errors = e?.data?.errors as Record<string, string[]> | undefined
    for (const [key, messages] of Object.entries(errors ?? {})) {
      const row = key.match(/^items\.(\d+)\./)
      const uuid = row ? changes[Number(row[1])]?.menu_item_uuid : undefined
      if (uuid) rowErrors.value[uuid] ??= messages[0]!
    }
    errorMessage.value = Object.keys(rowErrors.value).length
      ? 'Some changes could not be saved. Nothing was changed; fix the highlighted items and save again.'
      : e?.data?.message ?? 'Could not save your changes.'
  } finally {
    saving.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  page.value = 1
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 300)
})
watch(sort, () => {
  page.value = 1
  load()
})
watch(page, load)

onBeforeRouteLeave(() => {
  if (dirtyCount.value && !window.confirm('You have unsaved changes. Leave without saving?')) return false
})

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (dirtyCount.value) e.preventDefault()
}

onMounted(async () => {
  window.addEventListener('beforeunload', onBeforeUnload)
  try {
    if (!branchUuid.value) {
      const res = await service.managedBranches()
      if (!res.branches.length) {
        errorMessage.value = 'You are not assigned to a branch yet.'
        return
      }
      branchUuid.value = res.branches[0]!.uuid
    }
    await load()
  } catch (e: any) {
    failure(e, 'Could not load your branches.')
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  clearTimeout(searchTimer)
})
</script>

<template>
  <div class="dashboard flex min-h-screen flex-col bg-[#FDF3E7] md:flex-row">
    <NavBar :links="links" />

    <main class="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10 xl:px-12">
      <div class="mx-auto max-w-[1360px] space-y-6">
        
        <!-- Header: Breadcrumbs, Category Title, Time -->
        <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-2">
          <div class="min-w-0">
            <!-- Breadcrumb Navigation -->
            <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-[13px] font-medium mb-1.5">
              <NuxtLink
                :to="{ path: '/manager/servings', query: { branch: branchUuid } }"
                class="inline-flex items-center gap-1.5 text-[#8B6656] hover:text-[#3B1F0E] transition-colors duration-160"
              >
                <Icon name="heroicons:arrow-left" class="w-3.5 h-3.5 text-[#B4846C]" />
                <span>Servings Management</span>
              </NuxtLink>
              <span class="text-[#D9C3A5]">/</span>
              <span class="text-[#3B1F0E] font-semibold truncate">{{ categoryName || 'Loading...' }}</span>
            </nav>

            <!-- Title & Status Tag -->
            <div class="flex flex-wrap items-baseline gap-3">
              <h1 class="font-display text-[30px] sm:text-[34px] md:text-[38px] font-bold leading-tight tracking-[-0.02em] text-[#3B1F0E]">
                {{ categoryName || 'Category Items' }}
              </h1>
              <span
                v-if="dirtyCount"
                class="inline-block rounded-md border border-amber-300 bg-amber-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-800 animate-pulse"
              >
                {{ dirtyCount }} unsaved change{{ dirtyCount === 1 ? '' : 's' }}
              </span>
            </div>

            <!-- Subtitle -->
            <p class="mt-1 text-[13px] text-[#8B6656]">
              Set daily limits and switch items on/off for today's service.
            </p>
          </div>

          <!-- Live Time Pill -->
          <div class="inline-flex items-center gap-2 rounded-xl border border-[#E3CFB4] bg-white px-3.5 py-2 text-[13px] font-medium text-[#7D5A50] shadow-2xs shrink-0 self-start sm:self-auto">
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span class="tabular-nums font-mono">{{ timeLabel }}</span>
            <span class="text-[#D9C3A5]">/</span>
            <span>{{ dateLabel }}</span>
          </div>
        </header>

        <!-- Error Notification -->
        <div
          v-if="errorMessage"
          role="alert"
          class="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-[14px] text-rose-800 shadow-2xs"
        >
          <Icon name="heroicons:exclamation-circle" class="h-5 w-5 shrink-0 text-rose-600" />
          <p class="font-medium">{{ errorMessage }}</p>
        </div>

        <!-- Success Notification -->
        <div
          v-else-if="successMessage"
          role="status"
          class="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] text-emerald-800 shadow-2xs"
        >
          <Icon name="heroicons:check-circle" class="h-5 w-5 shrink-0 text-emerald-600" />
          <p class="font-medium">{{ successMessage }}</p>
        </div>

        <!-- Items Card Section with Scroll Reveal -->
        <section v-if="!planLocked && branchUuid" class="scroll-reveal bg-white border border-[#E3CFB4] rounded-2xl shadow-xs overflow-hidden">
          <!-- Toolbar: Search, Sort, Save Button -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-[#E3CFB4] bg-[#FFFDF9]/60">
            <div class="flex-1 flex items-center gap-3">
              <SearchInput v-model="search" placeholder="Search item..." class="flex-1 sm:max-w-xs" />
              <div class="flex items-center gap-1.5 h-11 px-3 bg-white border border-[#E3CFB4] rounded-xl font-sans text-sm font-medium text-[#7D5A50] shrink-0 shadow-2xs">
                <Icon name="heroicons:bars-3-bottom-left" class="w-4 h-4 text-[#B4846C]" />
                <DropdownList v-model="sort" :options="sortOptions" bare align="right" aria-label="Sort items" />
              </div>
            </div>

            <!-- Save Changes Button with Tactile Active State -->
            <button
              type="button"
              class="save-btn inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-display font-semibold text-[13px] shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
              :class="[
                dirtyCount
                  ? 'bg-[#7D5A50] text-[#FFF0D1] hover:bg-[#684940] active:scale-[0.97] cursor-pointer'
                  : 'bg-[#FAF4ED] text-[#A89F91] border border-[#EBE0D2] cursor-not-allowed opacity-75'
              ]"
              :disabled="!dirtyCount || saving"
              @click="save"
            >
              <Icon v-if="saving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin text-[#FFF0D1]" />
              <Icon v-else name="heroicons:check" class="w-4 h-4" />
              <span>{{ saving ? 'Saving...' : dirtyCount ? `Save Changes (${dirtyCount})` : 'Save Changes' }}</span>
            </button>
          </div>

          <!-- Items Content -->
          <div class="p-5 min-h-[160px]">
            <!-- Loading Skeletons -->
            <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <div v-for="n in 6" :key="n" class="h-[180px] rounded-2xl bg-[#FAF4ED]/60 border border-[#E3CFB4]/60 animate-pulse p-5 flex flex-col gap-3">
                <div class="flex items-center gap-3">
                  <div class="size-10 rounded-xl bg-[#EBE0D2]" />
                  <div class="h-5 w-32 bg-[#EBE0D2] rounded" />
                </div>
                <div class="flex-1 rounded-xl bg-[#EBE0D2]/50" />
              </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="!items.length" class="flex flex-col items-center justify-center py-12 text-center">
              <div class="size-14 rounded-full bg-[#FDF3E7] border border-[#E3CFB4] flex items-center justify-center text-[#9E7060] mb-3">
                <Icon name="heroicons:cake" class="w-7 h-7" />
              </div>
              <p class="font-display font-semibold text-[16px] text-[#3B1F0E]">No items found</p>
              <p class="text-[13px] text-[#8B6656] mt-1 max-w-sm">
                {{ search ? 'No items match your search.' : 'This category has no items yet.' }}
              </p>
            </div>

            <!-- Items Grid with Stagger Motion -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
              <div
                v-for="(i, idx) in items"
                :key="i.uuid"
                class="stagger-card"
                :style="{ animationDelay: `${idx * 40}ms` }"
              >
                <ServingsItemCard
                  :item="i"
                  :limit="limitOf(i)"
                  :enabled="enabledOf(i)"
                  :error="rowErrors[i.uuid]"
                  @update:limit="setLimit(i, $event)"
                  @toggle="toggle(i)"
                />
              </div>
            </div>
          </div>

          <!-- Pagination Footer -->
          <div class="border-t border-[#E3CFB4] bg-[#FFFDF9]/60 px-5">
            <CommonPagination :page="page" :last-page="lastPage" @change="page = $event" />
          </div>
        </section>
      </div>
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

.save-btn {
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
              background-color 160ms ease-out,
              color 160ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal,
  .stagger-card,
  .save-btn {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
</style>
