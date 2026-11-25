<!-- app/components/activity/ActivityLogView.vue -->
<!-- The Activity Log page body, shared by owners (whole cafe, with a branch picker)
     and managers (their one branch, plus cafe-wide menu changes). -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AnalyticsFilterBar from '~/components/analytics/AnalyticsFilterBar.vue'
import DropdownList from '~/components/common/DropdownList.vue'
import Pagination from '~/components/common/Pagination.vue'
import SearchInput from '~/components/common/SearchInput.vue'
import type { ActivityCategory, ActivityLogQuery, ActivityLogResponse, ActivityLogRow, ActivityRole, ServingChange } from '~/services/ActivityLogService'
import { rangeFor, type AnalyticsFilterState } from '~/utils/analyticsRange'
import { formatCount } from '~/utils/dashboardFormat'

const props = defineProps<{
  scope: 'owner' | 'manager'
  branchUuid?: string // manager: the branch to show
  branchName?: string // manager: shown under the title
}>()

const PER_PAGE = 20
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
  { value: null, label: 'All activity', key: 'all' },
  { value: 'pos', label: 'Register', key: 'pos' },
  { value: 'employees', label: 'Employees', key: 'employees' },
  { value: 'menu', label: 'Menu', key: 'menu' },
  { value: 'servings', label: 'Servings', key: 'servings' },
  { value: 'floor_plans', label: 'Floor plans', key: 'floor_plans' },
  { value: 'reservations', label: 'Reservations', key: 'reservations' },
  { value: 'branch', label: 'Branch details', key: 'branch' },
  { value: 'auth', label: 'Dashboard sign-ins', key: 'auth' },
]

// The activity type dropdown, each option with how many entries it has in this period.
const categoryOptions = computed(() => categoryTabs.map(c => ({
  value: c.value,
  label: data.value ? `${c.label} (${formatCount(data.value.counts[c.key] ?? 0)})` : c.label,
})))

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
  ? 'Who signed in or out, who used a register, and who changed employees, the menu, servings, floor plans, reservations or branch details. Newest first.'
  : 'Who used this branch\'s registers, and who changed its employees, servings, floor plans, reservations or details. Menu changes the owner made for the whole cafe are listed too. Newest first.')

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
    if (res?.success) {
      data.value = res
      expanded.value = new Set() // a new page or filter starts with every entry folded
    } else failed.value = true
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

// Moving to another page starts at the top of the list, not halfway down it.
const listTop = ref<HTMLElement | null>(null)
function goToPage(next: number) {
  if (refreshing.value || next === page.value) return
  page.value = next
  listTop.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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
  'pos.device_registered': { label: 'Register set up', icon: 'heroicons:computer-desktop', tone: ADD },
  'pos.device_removed': { label: 'Register removed', icon: 'heroicons:computer-desktop', tone: REMOVE },
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
  'reservation.created': { label: 'Reservation booked', icon: 'heroicons:calendar-days', tone: ADD },
  'reservation.updated': { label: 'Reservation edited', icon: 'heroicons:pencil-square', tone: EDIT },
  'reservation.cancelled': { label: 'Reservation cancelled', icon: 'heroicons:x-circle', tone: REMOVE },
  'employee.created': { label: 'Employee added', icon: 'heroicons:user-plus', tone: ADD },
  'employee.updated': { label: 'Employee edited', icon: 'heroicons:pencil-square', tone: EDIT },
  'employee.schedule_updated': { label: 'Schedule changed', icon: 'heroicons:calendar-days', tone: EDIT },
  'employee.pin_reset': { label: 'PIN reset', icon: 'heroicons:key', tone: EDIT },
  'employee.pin_changed': { label: 'Own PIN changed', icon: 'heroicons:key', tone: EDIT },
  'employee.terminated': { label: 'Terminated', icon: 'heroicons:user-minus', tone: REMOVE },
  'menu.item_created': { label: 'Item added', icon: 'heroicons:plus-circle', tone: ADD },
  'menu.item_updated': { label: 'Item edited', icon: 'heroicons:pencil-square', tone: EDIT },
  'menu.item_deleted': { label: 'Item deleted', icon: 'heroicons:trash', tone: REMOVE },
  'menu.category_created': { label: 'Category added', icon: 'heroicons:plus-circle', tone: ADD },
  'menu.category_updated': { label: 'Category edited', icon: 'heroicons:pencil-square', tone: EDIT },
  'menu.category_deleted': { label: 'Category deleted', icon: 'heroicons:trash', tone: REMOVE },
  'branch.details_updated': { label: 'Branch details edited', icon: 'heroicons:building-storefront', tone: EDIT },
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
// Lines under "Show changes": a category save's items, the days a schedule change touched, or what a reservation edit changed.
function detailLines(l: ActivityLogRow): string[] {
  if (l.meta?.items?.length) return l.meta.items.map(changeLine)
  if ((l.action === 'reservation.updated' || l.action === 'branch.details_updated') && l.meta?.changes?.length) {
    return l.meta.changes.map(c => ('before' in c || 'after' in c)
      ? `${c.field}: ${c.before || 'none'} → ${c.after || 'none'}`
      : `${c.field} changed`)
  }
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

// ── Timeline ──
// Summary tiles double as shortcuts into a category.
const statTiles = computed(() => {
  const c = data.value?.counts ?? {}
  return [
    { key: 'all' as const, value: null, label: 'All activity', icon: 'heroicons:clipboard-document-list', count: c.all ?? 0 },
    { key: 'pos' as const, value: 'pos' as ActivityCategory, label: 'Register', icon: 'heroicons:computer-desktop', count: c.pos ?? 0 },
    { key: 'menu' as const, value: 'menu' as ActivityCategory, label: 'Menu changes', icon: 'heroicons:book-open', count: c.menu ?? 0 },
    { key: 'employees' as const, value: 'employees' as ActivityCategory, label: 'Employees', icon: 'heroicons:user-group', count: c.employees ?? 0 },
  ]
})

const dayKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
const longDay = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })
const timeOnly = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' })
const formatTime = (iso: string) => timeOnly.format(new Date(iso))

function dayLabel(iso: string) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (dayKey(iso) === dayKey(today.toISOString())) return 'Today'
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Yesterday'
  return longDay.format(new Date(iso))
}

// Rows arrive newest first; keep that order and break them into one group per day.
const dayGroups = computed(() => {
  const groups: { key: string; label: string; rows: ActivityLogRow[] }[] = []
  for (const row of rows.value) {
    const key = dayKey(row.created_at)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.rows.push(row)
    else groups.push({ key, label: dayLabel(row.created_at), rows: [row] })
  }
  return groups
})

function initials(name: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toUpperCase()
}

// Avatar colour by role, so owner, manager and cashier entries are easy to tell apart.
function avatarTone(r: string | null) {
  if (r === 'Cafe Owner') return 'bg-[#3B1F0E] text-[#FFF8EA]'
  if (r === 'Manager') return 'bg-[#E4ECF4] text-[#2A4A6B]'
  if (r === 'Cashier') return 'bg-[#E7F1E4] text-[#2F5D2A]'
  return 'bg-[#F3E7D2] text-[#6B4A3A]'
}

const hasFilters = computed(() => !!(query.value || category.value || role.value))
function clearFilters() {
  search.value = ''
  query.value = ''
  category.value = null
  role.value = null
}
</script>

<template>
  <div class="space-y-6">
    <!-- Same format as the Servings header: big tight title, icon-led subtitle line -->
    <header>
      <h1 class="font-display text-[30px] sm:text-[34px] md:text-[38px] font-bold leading-tight tracking-[-0.02em] text-[#3B1F0E]">Activity Log</h1>
      <p class="mt-1.5 flex items-start gap-1.5 text-[13px] text-[#8B6656]">
        <Icon name="heroicons:clipboard-document-list" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B4846C]" />
        <span class="max-w-3xl">{{ note }}</span>
      </p>
      <!-- Managers have no branch picker, so name their branch here -->
      <p v-if="!isOwner" class="mt-1 pl-5 text-[12px] font-semibold text-[#A8988B]">{{ scopeLabel }}</p>
    </header>

    <AnalyticsFilterBar v-model="state" :branches="branches" />

    <!-- Summary tiles: counts for the period, and a quick way into each kind of activity -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <button
        v-for="t in statTiles"
        :key="t.key"
        type="button"
        class="group flex items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
        :class="category === t.value ? 'border-[#3B1F0E] ring-1 ring-[#3B1F0E]' : 'border-[#EEDFC4] hover:border-[#D8C7B5] hover:shadow-sm'"
        :aria-pressed="category === t.value"
        @click="category = t.value"
      >
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors"
          :class="category === t.value ? 'bg-[#3B1F0E] text-[#FFF8EA]' : 'bg-[#FAF4ED] text-[#7D5A50] group-hover:text-[#3B1F0E]'"
        >
          <Icon :name="t.icon" class="size-5" />
        </span>
        <span class="min-w-0">
          <span class="block text-[11px] font-bold uppercase tracking-wider text-[#8A6E64]">{{ t.label }}</span>
          <span class="block font-display text-2xl font-bold leading-tight text-[#3B1F0E] tabular-nums">
            <template v-if="data">{{ formatCount(t.count) }}</template>
            <span v-else class="skeleton inline-block h-6 w-10 rounded" />
          </span>
        </span>
      </button>
    </div>

    <section class="overflow-hidden rounded-2xl border border-[#EEDFC4] bg-white shadow-sm">
      <!-- Toolbar -->
      <!-- One row: what kind of activity and who on the left, search on the right -->
      <div ref="listTop" class="scroll-mt-6 flex flex-col gap-2 border-b border-[#F3E7D2] bg-[#FDFBF7] px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-5">
        <div class="w-full sm:w-56">
          <DropdownList
            v-model="category"
            :options="categoryOptions"
            size="sm"
            card
            icon="heroicons:funnel"
            aria-label="Activity type"
          />
        </div>
        <div class="w-full sm:w-44">
          <DropdownList
            v-model="role"
            :options="roleOptions"
            size="sm"
            card
            icon="heroicons:user-circle"
            aria-label="Person"
          />
        </div>
        <span v-if="refreshing" class="hidden items-center gap-1.5 text-[12px] font-semibold text-[#8B6656] sm:inline-flex" role="status">
          <Icon name="heroicons:arrow-path" class="size-3.5 animate-spin" />
          Updating
        </span>
        <div class="w-full sm:ml-auto sm:w-[260px]">
          <SearchInput v-model="search" placeholder="Name or what they did" aria-label="Search activity" clearable white />
        </div>
      </div>

      <!-- Body -->
      <div class="px-4 py-4 sm:px-5">
        <!-- Loading -->
        <div v-if="loading" class="space-y-3">
          <div v-for="i in 6" :key="i" class="flex items-center gap-3">
            <span class="skeleton size-9 shrink-0 rounded-full" />
            <span class="flex-1 space-y-1.5">
              <span class="skeleton block h-3.5 w-1/3 rounded" />
              <span class="skeleton block h-3 w-2/3 rounded" />
            </span>
          </div>
        </div>

        <!-- Failed -->
        <div v-else-if="failed && !data" role="alert" class="flex flex-col items-center py-12 text-center">
          <Icon name="heroicons:exclamation-triangle" class="mb-2 size-8 text-red-400" />
          <p class="text-sm font-semibold text-[#3B1F0E]">The activity log could not be loaded.</p>
          <button
            type="button"
            class="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#D8C7B5] bg-white px-3.5 text-sm font-bold text-[#3B1F0E] transition-colors hover:bg-[#FAF4ED] outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="load"
          >
            <Icon name="heroicons:arrow-path" class="size-4" />
            Try again
          </button>
        </div>

        <!-- Empty -->
        <div v-else-if="!rows.length" class="flex flex-col items-center py-12 text-center">
          <span class="mb-2 flex size-12 items-center justify-center rounded-full border border-[#E3CFB4] bg-[#FDF3E7] text-[#9E7060]">
            <Icon name="heroicons:clipboard-document-list" class="size-6" />
          </span>
          <p class="font-display text-[15px] font-semibold text-[#3B1F0E]">{{ emptyText }}</p>
          <button
            v-if="hasFilters"
            type="button"
            class="mt-2 text-sm font-bold text-[#7D5A50] underline decoration-[#EEDFC4] underline-offset-2 hover:decoration-[#7D5A50]"
            @click="clearFilters"
          >
            Clear filters
          </button>
          <p v-else class="mt-1 text-[12px] text-[#8B6656]">Try a wider date range above.</p>
        </div>

        <!-- Timeline, one group per day -->
        <div v-else class="transition-opacity" :class="{ 'opacity-60': refreshing }" :aria-busy="refreshing">
          <!-- A filter or page change failed: the entries below are from before it -->
          <div v-if="failed" role="alert" class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">
            <Icon name="heroicons:exclamation-triangle" class="size-4 shrink-0 text-red-500" />
            <span class="flex-1">Couldn't update the list. Showing the last entries that loaded.</span>
            <button type="button" class="font-bold underline underline-offset-2 hover:text-red-900" @click="load">Try again</button>
          </div>
          <section v-for="g in dayGroups" :key="g.key" class="mb-5 last:mb-0" :aria-label="g.label">
            <h3 class="mb-1 flex items-center gap-2 py-1.5">
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-[#7D5A50]">{{ g.label }}</span>
              <span class="h-px flex-1 bg-[#F3E7D2]" aria-hidden="true" />
              <span class="text-[11px] font-semibold text-[#A8988B] tabular-nums">{{ g.rows.length }} {{ g.rows.length === 1 ? 'entry' : 'entries' }}</span>
            </h3>

            <ol class="relative">
              <!-- The timeline's spine -->
              <span class="absolute bottom-3 left-[17px] top-3 w-px bg-[#F0E4D3]" aria-hidden="true" />
              <li v-for="l in g.rows" :key="l.uuid" class="relative flex gap-3 rounded-xl py-2.5 pr-2 transition-colors hover:bg-[#FDFBF7]">
                <span
                  class="relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ring-4 ring-white"
                  :class="avatarTone(l.actor.role)"
                  :title="roleLabel(l.actor.role) || undefined"
                >
                  {{ initials(l.actor.name) }}
                </span>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span class="text-[14px] font-bold text-[#2D201B]">{{ l.actor.name ?? 'Removed account' }}</span>
                    <span v-if="l.actor.role" class="text-[11px] font-semibold text-[#A8988B]">{{ roleLabel(l.actor.role) }}</span>
                    <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="actionInfo(l).tone">
                      <Icon :name="actionInfo(l).icon" class="size-3.5" />
                      {{ actionInfo(l).label }}
                    </span>
                  </div>

                  <p class="mt-0.5 text-[13px] leading-relaxed text-[#3D2B24]">{{ l.description }}</p>

                  <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[#8B6656]">
                    <span class="inline-flex items-center gap-1 tabular-nums">
                      <Icon name="heroicons:clock" class="size-3.5 text-[#B4846C]" />
                      {{ formatTime(l.created_at) }}
                    </span>
                    <span v-if="allBranches" class="inline-flex items-center gap-1">
                      <Icon name="heroicons:building-storefront" class="size-3.5 text-[#B4846C]" />
                      {{ branchLabel(l) }}
                    </span>
                    <button
                      v-if="hasDetails(l)"
                      type="button"
                      class="inline-flex items-center gap-0.5 font-semibold text-[#7D5A50] hover:text-[#3B1F0E] outline-none focus-visible:underline"
                      :aria-expanded="expanded.has(l.uuid)"
                      @click="toggle(l.uuid)"
                    >
                      {{ expanded.has(l.uuid) ? 'Hide changes' : `Show ${detailLines(l).length} ${detailLines(l).length === 1 ? 'change' : 'changes'}` }}
                      <Icon name="heroicons:chevron-down" class="size-3.5 transition-transform" :class="expanded.has(l.uuid) ? 'rotate-180' : ''" />
                    </button>
                  </p>

                  <ul v-if="hasDetails(l) && expanded.has(l.uuid)" class="mt-2 space-y-1 rounded-xl border border-[#F0E4D3] bg-[#FDFBF7] px-3 py-2 text-[12px] text-[#5C4037]">
                    <li v-for="(line, i) in detailLines(l)" :key="i" class="flex gap-2">
                      <span class="mt-1.5 size-1 shrink-0 rounded-full bg-[#B4846C]" aria-hidden="true" />
                      <span>{{ line }}</span>
                    </li>
                  </ul>
                </div>
              </li>
            </ol>
          </section>
        </div>
      </div>

      <!-- The app's shared pagination, under a "Showing x–y of z" line -->
      <nav v-if="data && rows.length" aria-label="Activity log pages" class="border-t border-[#F3E7D2]">
        <p v-if="range" class="pt-3 text-center text-[12px] tabular-nums text-[#8B6656]">Showing {{ range }}</p>
        <Pagination
          :page="page"
          :last-page="data.pagination.last_page"
          @change="goToPage"
        />
      </nav>
    </section>
  </div>
</template>

<style scoped>
/* Loading placeholders. The Analytics page defines its own under .analytics; this page needs one too. */
.skeleton {
  background: linear-gradient(90deg, #F6ECDD, #FBF4EA, #F6ECDD);
  background-size: 200% 100%;
  animation: activity-shimmer 1.4s ease-in-out infinite;
}

@keyframes activity-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
</style>
