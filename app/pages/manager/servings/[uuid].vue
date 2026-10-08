<!-- app/pages/manager/servings/[uuid].vue -->
<!-- One category's items: set each item's daily limit and switch it on or off for today, then Save Changes. -->
<script setup lang="ts">
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
    // Errors come back keyed "items.N.field"; N is the row in what we sent.
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

// Rows are saved only on Save Changes, so warn before losing them.
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
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FFF8EA]">
    <NavBar :links="links" />
    <main class="flex-1 min-w-0 p-6 lg:p-12 flex flex-col gap-6">
      <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div class="flex flex-col gap-3">
          <nav aria-label="Breadcrumb" class="flex items-center gap-2 font-display text-[14px]">
            <NuxtLink
              :to="{ path: '/manager/servings', query: { branch: branchUuid } }"
              class="font-medium text-[#9E7060] hover:text-[#3D2B24]"
            >
              Servings Management
            </NuxtLink>
            <span class="font-medium text-[#9E7060]">/</span>
            <span class="font-semibold text-[#3D2B24]">{{ categoryName || '...' }}</span>
          </nav>
          <h1 class="font-display font-bold text-[36px] leading-[39px] text-[#3D2B24]">{{ categoryName || '...' }}</h1>
        </div>
        <div class="bg-white border border-[#3D2B24] rounded-2xl p-[18px] flex items-center gap-3 text-[16px] text-black whitespace-nowrap self-start sm:self-auto">
          <span>{{ timeLabel }}</span>
          <span>|</span>
          <span>{{ dateLabel }}</span>
        </div>
      </header>

      <p
        v-if="errorMessage"
        role="alert"
        class="bg-[#FFE0E0] text-[#B31E1E] border border-[#B31E1E]/20 rounded-xl px-4 py-3 text-[14px]"
      >
        {{ errorMessage }}
      </p>
      <p
        v-else-if="successMessage"
        role="status"
        class="bg-[#D4EDDA] text-[#28A745] border border-[#28A745]/20 rounded-xl px-4 py-3 text-[14px]"
      >
        {{ successMessage }}
      </p>

      <section v-if="!planLocked && branchUuid" class="bg-white border border-[#EDD8CC] rounded-2xl overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-[22px] py-[18px] border-b border-[#EDD8CC]">
          <div class="flex-1 flex items-center gap-3">
            <div class="flex-1 flex items-center gap-3 bg-[#FFF8EA] border border-[#EDD8CC] rounded-xl p-3">
              <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-[#7D5A50]/60 shrink-0" />
              <input
                v-model="search"
                type="text"
                placeholder="Search Item"
                class="w-full bg-transparent outline-none text-[14px] text-[#3D2B24] placeholder:text-[#7D5A50]/40"
              >
            </div>
            <label class="flex items-center gap-1.5 bg-[#FFF8EA] border border-[#EDD8CC] rounded-xl p-3 text-[14px] font-medium text-[#7D5A50]">
              <Icon name="heroicons:bars-3-bottom-left" class="w-4 h-4" />
              <select v-model="sort" class="bg-transparent outline-none cursor-pointer" aria-label="Sort items">
                <option v-for="o in sortOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            class="bg-[#7D5A50] text-[#FFF0D1] font-display font-semibold text-[14px] rounded-[10px] px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#6a4b42] transition-colors"
            :disabled="!dirtyCount || saving"
            @click="save"
          >
            {{ saving ? 'Saving...' : dirtyCount ? `Save Changes (${dirtyCount})` : 'Save Changes' }}
          </button>
        </div>

        <div class="px-[22px] py-[18px] min-h-[120px]">
          <p v-if="loading" class="text-[14px] text-[#9E7060]">Loading...</p>
          <p v-else-if="!items.length" class="text-[14px] text-[#9E7060]">
            {{ search ? 'No items match your search.' : 'This category has no items yet.' }}
          </p>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            <ServingsItemCard
              v-for="i in items"
              :key="i.uuid"
              :item="i"
              :limit="limitOf(i)"
              :enabled="enabledOf(i)"
              :error="rowErrors[i.uuid]"
              @update:limit="setLimit(i, $event)"
              @toggle="toggle(i)"
            />
          </div>
        </div>

        <div class="border-t border-[#EDD8CC]">
          <CommonPagination :page="page" :last-page="lastPage" @change="page = $event" />
        </div>
      </section>
    </main>
  </div>
</template>
