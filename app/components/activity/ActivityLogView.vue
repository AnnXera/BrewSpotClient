<!-- app/components/activity/ActivityLogView.vue -->
<!-- The Activity Log page body, shared by owners (whole cafe, with a branch picker)
     and managers (their one branch, plus cafe-wide menu changes). -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AnalyticsFilterBar from '~/components/analytics/AnalyticsFilterBar.vue'
import AnalyticsPanel from '~/components/analytics/AnalyticsPanel.vue'
import DropdownList from '~/components/common/DropdownList.vue'
import type { ActivityCategory, ActivityLogQuery, ActivityLogResponse, ActivityLogRow, ActivityRole, ServingChange } from '~/services/ActivityLogService'
import { rangeFor, type AnalyticsFilterState } from '~/utils/analyticsRange'
import { formatCount, formatSpan } from '~/utils/dashboardFormat'

const props = defineProps<{
  scope: 'owner' | 'manager'
  branchUuid?: string // manager: the branch to show
  branchName?: string // manager: shown under the title
}>()

const PER_PAGE = 25
const isOwner = computed(() => props.scope === 'owner')

const service = useActivityLogService()
const ownerProfileService = useOwnerProfileService()

// ── Filters ──
const state = ref<AnalyticsFilterState>({ preset: '7d', ...rangeFor('7d'), branch: null })
const category = ref<ActivityCategory | null>(null)
const role = ref<ActivityRole | null>(null)
const search = ref('')
const query = ref('') // search, debounced
const page = ref(1)

// Managers don't see dashboard sign-ins of the owner, but do see their branch's managers.
const categoryTabs: { value: ActivityCategory | null; label: string; key: 'all' | ActivityCategory }[] = [
  { value: null, label: 'All', key: 'all' },
  { value: 'pos', label: 'Register', key: 'pos' },
  { value: 'employees', label: 'Employees', key: 'employees' },
  { value: 'menu', label: 'Menu', key: 'menu' },
  { value: 'servings', label: 'Servings', key: 'servings' },
  { value: 'floor_plans', label: 'Floor plans', key: 'floor_plans' },
  { value: 'auth', label: 'Dashboard sign-ins', key: 'auth' },
]

const roleOptions = computed<{ value: ActivityRole | null; label: string }[]>(() => [
  { value: null, label: 'Everyone' },
  { value: 'manager', label: 'Managers' },
  { value: 'cashier', label: 'Cashiers' },
  { value: 'owner', label: isOwner.value ? 'You (owner)' : 'Owner' },
])

// ── Branch picker (owner only) ──
const branches = ref<{ value: string | null; label: string }[]>(isOwner.value ? [{ value: null, label: 'All branches' }] : [])

onMounted(async () => {
  if (!isOwner.value) return
  try {
    const res = await ownerProfileService.getBranches(100, 1)
    if (res?.success) {
      branches.value = [
        { value: null, label: 'All branches' },
        ...res.branches.data.map(b => ({ value: b.uuid, label: b.branch_name })),
      ]
    }
  } catch (err) {
    console.warn('Activity log branch list error:', err)
  }
})

const scopeLabel = computed(() => {
  if (!isOwner.value) return props.branchName ?? 'Your branch'
  return state.value.branch ? branches.value.find(b => b.value === state.value.branch)?.label ?? 'One branch' : 'All branches'
})

const note = computed(() => isOwner.value
  ? 'Who signed in or out, who used a register, and who changed employees, the menu, servings or floor plans. Newest first.'
  : 'Who used this branch\'s registers, and who changed its employees, servings or floor plans. Menu changes the owner made for the whole cafe are listed too. Newest first.')

// ── Loading ──
const data = ref<ActivityLogResponse | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const failed = ref(false)

function fetchLogs(q: ActivityLogQuery) {
  if (isOwner.value) return service.getLogs(q)
  return service.getBranchLogs(props.branchUuid!, q)
}

let requestId = 0
async function load() {
  if (!isOwner.value && !props.branchUuid) return
  const id = ++requestId
  if (data.value) refreshing.value = true
  failed.value = false
  try {
    const res = await fetchLogs({
      from: state.value.from,
      to: state.value.to,
      branch: state.value.branch,
      category: category.value,
      role: role.value,
      search: query.value,
      page: page.value,
      per_page: PER_PAGE,
    })
    if (id !== requestId) return
    if (res?.success) data.value = res
    else failed.value = true
  } catch {
    if (id !== requestId) return
    failed.value = true
  } finally {
    if (id === requestId) {
      loading.value = false
      refreshing.value = false
    }
  }
}

// New filters start again from the first page. Picking Custom alone doesn't refetch.
const filterKey = computed(() => JSON.stringify([props.branchUuid, state.value.from, state.value.to, state.value.branch, category.value, role.value, query.value]))
watch(filterKey, () => {
  if (page.value !== 1) page.value = 1 // the page watcher loads
  else load()
}, { immediate: true })
watch(page, load)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (v) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { query.value = v.trim() }, 300)
})
onUnmounted(() => clearTimeout(searchTimer))

const rows = computed(() => data.value?.logs ?? [])
// Branch column only for an owner looking at every branch.
const allBranches = computed(() => isOwner.value && !data.value?.filters.branch)
const range = computed(() => {
  const p = data.value?.pagination
  if (!p || !p.total) return ''
  const first = (p.page - 1) * p.per_page + 1
  return `${formatCount(first)}–${formatCount(first + rows.value.length - 1)} of ${formatCount(p.total)}`
})

// ── Presentation ──
const ADD = 'bg-[#E4ECF4] text-[#2A4A6B]'
const EDIT = 'bg-[#FBEBD3] text-[#8A5A12]'
const REMOVE = 'bg-[#F8E1DD] text-[#A2352A]'
const ON = 'bg-[#E7F1E4] text-[#2F5D2A]'
const OFF = 'bg-[#F3E7D2] text-[#6B4A3A]'

const ACTIONS: Record<string, { label: string; icon: string; tone: string }> = {
  'auth.login': { label: 'Signed in', icon: 'heroicons:arrow-right-end-on-rectangle', tone: ON },
  'auth.logout': { label: 'Signed out', icon: 'heroicons:arrow-left-start-on-rectangle', tone: OFF },
  'pos.unlock': { label: 'Register in', icon: 'heroicons:lock-open', tone: ON },
  'pos.lock': { label: 'Register out', icon: 'heroicons:lock-closed', tone: OFF },
  'serving.created': { label: 'Serving added', icon: 'heroicons:plus-circle', tone: ADD },
  'serving.updated': { label: 'Serving edited', icon: 'heroicons:pencil-square', tone: EDIT },
  'serving.category_saved': { label: 'Servings saved', icon: 'heroicons:pencil-square', tone: EDIT },
  'serving.deleted': { label: 'Serving removed', icon: 'heroicons:trash', tone: REMOVE },
  'floor_plan.created': { label: 'Floor plan added', icon: 'heroicons:plus-circle', tone: ADD },
  'floor_plan.updated': { label: 'Floor plan edited', icon: 'heroicons:pencil-square', tone: EDIT },
  'floor_plan.layout_saved': { label: 'Layout saved', icon: 'heroicons:map', tone: EDIT },
  'floor_plan.activated': { label: 'On register', icon: 'heroicons:eye', tone: ON },
  'floor_plan.deactivated': { label: 'Off register', icon: 'heroicons:eye-slash', tone: OFF },
  'floor_plan.deleted': { label: 'Floor plan deleted', icon: 'heroicons:trash', tone: REMOVE },
  'employee.created': { label: 'Employee added', icon: 'heroicons:user-plus', tone: ADD },
  'employee.updated': { label: 'Employee edited', icon: 'heroicons:pencil-square', tone: EDIT },
  'employee.schedule_updated': { label: 'Schedule changed', icon: 'heroicons:calendar-days', tone: EDIT },
  'employee.pin_reset': { label: 'PIN reset', icon: 'heroicons:key', tone: EDIT },
  'employee.terminated': { label: 'Terminated', icon: 'heroicons:user-minus', tone: REMOVE },
  'menu.item_created': { label: 'Item added', icon: 'heroicons:plus-circle', tone: ADD },
  'menu.item_updated': { label: 'Item edited', icon: 'heroicons:pencil-square', tone: EDIT },
  'menu.item_deleted': { label: 'Item deleted', icon: 'heroicons:trash', tone: REMOVE },
  'menu.category_created': { label: 'Category added', icon: 'heroicons:plus-circle', tone: ADD },
  'menu.category_updated': { label: 'Category edited', icon: 'heroicons:pencil-square', tone: EDIT },
  'menu.category_deleted': { label: 'Category deleted', icon: 'heroicons:trash', tone: REMOVE },
}
// Availability rows: on or off at a branch.
function actionInfo(l: ActivityLogRow) {
  if (l.action === 'menu.item_availability' || l.action === 'menu.category_availability') {
    const on = !!l.meta?.is_available
    const what = l.action === 'menu.item_availability' ? 'Item' : 'Category'
    return { label: `${what} ${on ? 'available' : 'unavailable'}`, icon: on ? 'heroicons:eye' : 'heroicons:eye-slash', tone: on ? ON : OFF }
  }
  return ACTIONS[l.action] ?? { label: l.action, icon: 'heroicons:clipboard-document-list', tone: OFF }
}

function roleLabel(r: string | null) {
  if (r === 'Cafe Owner') return 'Owner'
  return r ?? ''
}

// Cafe-wide rows (menu changes, an owner's sign-in) have no branch.
const branchLabel = (l: ActivityLogRow) => l.branch ?? (l.category === 'menu' ? 'Whole cafe' : 'All branches')

const dateTime = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const formatWhen = (iso: string) => dateTime.format(new Date(iso))

function changeLine(c: ServingChange) {
  const fmt = (s: { daily_limit: number; enabled: boolean }) =>
    `${s.daily_limit === 0 ? 'no limit' : `${s.daily_limit} servings`}${s.enabled ? '' : ', off'}`
  return `${c.item}: ${fmt(c.before)} → ${fmt(c.after)}`
}

const expanded = ref<Set<string>>(new Set())
function toggle(uuid: string) {
  const next = new Set(expanded.value)
  if (next.has(uuid)) next.delete(uuid)
  else next.add(uuid)
  expanded.value = next
}
// Lines under "Show changes": a category save's items, or the days a schedule change touched.
function detailLines(l: ActivityLogRow): string[] {
  if (l.meta?.items?.length) return l.meta.items.map(changeLine)
  if (l.action === 'employee.schedule_updated' && l.meta?.after) {
    const before = l.meta.before ?? {}
    const after = l.meta.after
    return Object.keys({ ...before, ...after })
      .filter(day => before[day] !== after[day])
      .map(day => `${day}: ${before[day] ?? 'not set'} → ${after[day] ?? 'not set'}`)
  }
  return []
}
const hasDetails = (l: ActivityLogRow) => detailLines(l).length > 0

const emptyText = computed(() =>
  query.value || category.value || role.value ? 'No activity matches these filters.' : 'No activity in this period.',
)
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="font-display text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[#3B1F0E] md:text-[34px]">Activity Log</h1>
      <p class="mt-1 text-sm text-[#8B6656]">{{ formatSpan(state.from, state.to) }} · {{ scopeLabel }}</p>
    </header>

    <AnalyticsFilterBar v-model="state" :branches="branches" />

    <AnalyticsPanel :title="isOwner ? 'Staff activity' : 'Branch activity'" :note="note">
      <template #actions>
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div class="w-full sm:w-44">
            <DropdownList
              v-model="role"
              :options="roleOptions"
              size="xs"
              icon="heroicons:user-circle"
              aria-label="Person"
              align="right"
            />
          </div>
          <label class="relative block w-full sm:w-[260px]">
            <span class="sr-only">Search activity</span>
            <Icon name="heroicons:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9E7060]" />
            <input
              v-model="search"
              type="search"
              placeholder="Name or what they did"
              class="h-9 w-full rounded-[10px] border border-[#E9D7BF] bg-white pl-9 pr-3 text-[13px] text-[#3B1F0E] placeholder:text-[#B09080] focus:border-[#7D5A50] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30"
            >
          </label>
        </div>
      </template>

      <div role="radiogroup" aria-label="Activity type" class="-mt-1 mb-4 flex flex-wrap gap-1.5">
        <button
          v-for="c in categoryTabs"
          :key="c.key"
          type="button"
          role="radio"
          :aria-checked="category === c.value"
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          :class="category === c.value ? 'border-[#7D5A50] bg-[#7D5A50] text-white' : 'border-[#E9D7BF] bg-white text-[#8B6656] hover:text-[#3B1F0E]'"
          @click="category = c.value"
        >
          {{ c.label }}
          <span v-if="data" class="tabular-nums" :class="category === c.value ? 'text-white/80' : 'text-[#B09080]'">{{ formatCount(data.counts[c.key] ?? 0) }}</span>
        </button>
      </div>

      <div v-if="loading" class="space-y-2">
        <span v-for="i in 8" :key="i" class="skeleton block h-10 rounded-lg" />
      </div>

      <div v-else-if="failed && !data" class="rounded-xl border border-[#F3E7D2] px-4 py-6 text-center text-[13px] text-[#8B6656]">
        The activity log could not be loaded.
        <button type="button" class="ml-1 font-semibold text-[#7D5A50] underline underline-offset-2" @click="load">Try again</button>
      </div>

      <p v-else-if="!rows.length" class="rounded-xl border border-dashed border-[#E9D7BF] px-4 py-8 text-center text-[13px] text-[#8B6656]">
        {{ emptyText }}
      </p>

      <div v-else :class="{ 'opacity-60 transition-opacity': refreshing }">
        <!-- Phones and tablets: one card per entry -->
        <ul class="divide-y divide-[#F3E7D2] lg:hidden">
          <li v-for="l in rows" :key="l.uuid" class="py-3">
            <div class="flex items-start gap-3">
              <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full" :class="actionInfo(l).tone">
                <Icon :name="actionInfo(l).icon" class="h-4 w-4" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-[14px] font-semibold text-[#3D2B24]">
                  {{ l.actor.name ?? 'Removed account' }}
                  <span v-if="l.actor.role" class="ml-1 text-[12px] font-medium text-[#9E7060]">{{ roleLabel(l.actor.role) }}</span>
                </p>
                <p class="text-[13px] text-[#3D2B24]">{{ l.description }}</p>
                <p class="mt-0.5 text-[12px] text-[#8B6656]">
                  {{ formatWhen(l.created_at) }}<template v-if="allBranches"> · {{ branchLabel(l) }}</template>
                </p>
                <template v-if="hasDetails(l)">
                  <button type="button" class="mt-1 text-[12px] font-semibold text-[#7D5A50] underline underline-offset-2" :aria-expanded="expanded.has(l.uuid)" @click="toggle(l.uuid)">
                    {{ expanded.has(l.uuid) ? 'Hide changes' : 'Show changes' }}
                  </button>
                  <ul v-if="expanded.has(l.uuid)" class="mt-1 space-y-0.5 text-[12px] text-[#6B4A3A]">
                    <li v-for="(line, i) in detailLines(l)" :key="i">{{ line }}</li>
                  </ul>
                </template>
              </div>
            </div>
          </li>
        </ul>

        <!-- Wide screens: table -->
        <div class="hidden overflow-x-auto lg:block">
          <table class="w-full text-left text-[13px]">
            <thead>
              <tr class="border-b border-[#F3E7D2] text-[12px] font-medium text-[#8B6656]">
                <th scope="col" class="py-2 pr-3 font-medium">Time</th>
                <th scope="col" class="py-2 pr-3 font-medium">Person</th>
                <th scope="col" class="py-2 pr-3 font-medium">Action</th>
                <th scope="col" class="py-2 pr-3 font-medium">Details</th>
                <th v-if="allBranches" scope="col" class="py-2 font-medium">Branch</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#F3E7D2]">
              <tr v-for="l in rows" :key="l.uuid" class="align-top text-[#3D2B24]">
                <td class="whitespace-nowrap py-2.5 pr-3 tabular-nums text-[#8B6656]">{{ formatWhen(l.created_at) }}</td>
                <td class="whitespace-nowrap py-2.5 pr-3">
                  <span class="font-semibold">{{ l.actor.name ?? 'Removed account' }}</span>
                  <span v-if="l.actor.role" class="block text-[11px] text-[#9E7060]">{{ roleLabel(l.actor.role) }}</span>
                </td>
                <td class="whitespace-nowrap py-2.5 pr-3">
                  <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="actionInfo(l).tone">
                    <Icon :name="actionInfo(l).icon" class="h-3.5 w-3.5" />
                    {{ actionInfo(l).label }}
                  </span>
                </td>
                <td class="py-2.5 pr-3">
                  {{ l.description }}
                  <template v-if="hasDetails(l)">
                    <button type="button" class="ml-1 text-[12px] font-semibold text-[#7D5A50] underline underline-offset-2" :aria-expanded="expanded.has(l.uuid)" @click="toggle(l.uuid)">
                      {{ expanded.has(l.uuid) ? 'Hide' : 'Show changes' }}
                    </button>
                    <ul v-if="expanded.has(l.uuid)" class="mt-1 space-y-0.5 text-[12px] text-[#6B4A3A]">
                      <li v-for="(line, i) in detailLines(l)" :key="i">{{ line }}</li>
                    </ul>
                  </template>
                </td>
                <td v-if="allBranches" class="whitespace-nowrap py-2.5">{{ branchLabel(l) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav v-if="data && data.pagination.last_page > 1" aria-label="Activity log pages" class="mt-4 flex items-center justify-between gap-3 border-t border-[#F3E7D2] pt-4 text-[12px] text-[#8B6656]">
          <span class="tabular-nums">{{ range }}</span>
          <span class="flex gap-1.5">
            <button
              type="button"
              class="rounded-[8px] border border-[#E9D7BF] bg-white px-3 py-1 font-semibold text-[#3B1F0E] transition-colors hover:bg-[#FBF4EA] disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="page <= 1 || refreshing"
              @click="page--"
            >Previous</button>
            <button
              type="button"
              class="rounded-[8px] border border-[#E9D7BF] bg-white px-3 py-1 font-semibold text-[#3B1F0E] transition-colors hover:bg-[#FBF4EA] disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="page >= data.pagination.last_page || refreshing"
              @click="page++"
            >Next</button>
          </span>
        </nav>
        <p v-else-if="range" class="mt-3 text-[12px] tabular-nums text-[#8B6656]">{{ range }}</p>
      </div>
    </AnalyticsPanel>
  </div>
</template>
