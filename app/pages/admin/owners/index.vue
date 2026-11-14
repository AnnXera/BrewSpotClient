<!-- pages/admin/ownermanagement.vue -->
<script setup lang="ts">
import type { OwnerListItem, OwnerStats } from '~/services/OwnerManagementService'
import { mockOwners, mockOwnerStats } from '~/mocks/mockOwners'

definePageMeta({
  role: 'Admin',
})

// DEV/DEMO MODE — flip to false once real owners exist in the database.
// While true, the page never calls the API; it filters/paginates mockOwners
// locally so search, status, and date filters are all testable right now.
const USE_MOCK_DATA = false

const links = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'squares-2x2' },
  { label: 'Owner Management', to: '/admin/owners', icon: 'users' },
  { label: 'Approval Status', to: '/admin/approvals', icon: 'check-circle' },
  { label: 'Subscriptions', to: '/admin/subscriptions', icon: 'credit-card' },
  { label: 'Payment History', to: '/admin/payments', icon: 'clipboard' },
]

const ownerService = useOwnerManagementService()

const stats = ref<OwnerStats | null>(null)
const owners = ref<OwnerListItem[]>([])
const loading = ref(false)

const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)
const perPage = 15

const search = ref('')
const status = ref('')
const date = ref('')

const statusOptions = [
  { value: '', label: 'Status' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
]

async function fetchStats() {
  if (USE_MOCK_DATA) {
    stats.value = mockOwnerStats
    return
  }

  try {
    const res = await ownerService.stats()
    if (res.success) stats.value = res.stats
  } catch {
    // stat cards just show placeholders if this fails
  }
}

function getFilteredMockOwners(): OwnerListItem[] {
  let list = [...mockOwners]

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.cafe_name ?? '').toLowerCase().includes(q)
    )
  }

  if (status.value) {
    list = list.filter((o) => o.status === status.value)
  }

  if (date.value) {
    list = list.filter((o) => o.date_joined?.slice(0, 10) === date.value)
  }

  return list
}

async function fetchOwners() {
  loading.value = true

  if (USE_MOCK_DATA) {
    // small artificial delay so the loading state is visible, same as a real request
    await new Promise((resolve) => setTimeout(resolve, 250))

    const filtered = getFilteredMockOwners()
    total.value = filtered.length
    lastPage.value = Math.max(1, Math.ceil(filtered.length / perPage))
    currentPage.value = Math.min(currentPage.value, lastPage.value)

    const start = (currentPage.value - 1) * perPage
    owners.value = filtered.slice(start, start + perPage)
    loading.value = false
    return
  }

  try {
    const res = await ownerService.list({
      per_page: perPage,
      page: currentPage.value,
      search: search.value || undefined,
      status: status.value || undefined,
      date: date.value || undefined,
    })

    if (res.success) {
      owners.value = res.owners.data
      currentPage.value = res.owners.current_page
      lastPage.value = res.owners.last_page
      total.value = res.owners.total
    }
  } catch {
    owners.value = []
  } finally {
    loading.value = false
  }
}

async function refreshData() {
  await Promise.all([fetchStats(), fetchOwners()])
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchOwners()
  }, 400)
})

watch([status, date], () => {
  currentPage.value = 1
  fetchOwners()
})

function goToPage(page: number) {
  if (page < 1 || page > lastPage.value || page === currentPage.value) return
  currentPage.value = page
  fetchOwners()
}

function viewOwner(owner: OwnerListItem) {
  navigateTo(`/admin/owners/${owner.uuid}`)
}

const confirmDialog = ref<{ owner: OwnerListItem; newStatus: 'active' | 'suspended' } | null>(null)

function requestStatusChange(owner: OwnerListItem, newStatus: 'active' | 'suspended') {
  confirmDialog.value = { owner, newStatus }
}

function cancelStatusChange() {
  confirmDialog.value = null
}

async function confirmStatusChange() {
  if (!confirmDialog.value) return
  const { owner, newStatus } = confirmDialog.value
  confirmDialog.value = null
  await changeStatus(owner, newStatus)
}

// Admin can only ever move an owner between 'active' and 'suspended'.
// 'inactive' (owner self-deactivated) has no admin-facing reactivate action —
// see OwnerManagementService::ALLOWED_TRANSITIONS on the backend.
const statusChangeLoading = ref<string | null>(null)

async function changeStatus(owner: OwnerListItem, newStatus: 'active' | 'suspended') {
  const previousStatus = owner.status
  statusChangeLoading.value = owner.uuid

  // Optimistic update — reflect the change immediately in the UI
  owner.status = newStatus

  // DEV/DEMO MODE — mutate the mock array directly, never touch the real API.
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200)) // fake latency

    const mockOwner = mockOwners.find((o) => o.uuid === owner.uuid)
    if (mockOwner) mockOwner.status = newStatus

    stats.value = {
      total_owners: mockOwners.length,
      active: mockOwners.filter((o) => o.status === 'active').length,
      suspended: mockOwners.filter((o) => o.status === 'suspended').length,
      inactive: mockOwners.filter((o) => o.status === 'inactive').length,
      inactive_or_suspended: mockOwners.filter((o) => ['inactive', 'suspended'].includes(o.status)).length,
    }

    statusChangeLoading.value = null
    return
  }

  try {
    const res = await ownerService.updateStatus(owner.uuid, newStatus)
    if (!res.success) {
      owner.status = previousStatus // revert on failure
    } else {
      await fetchStats()
    }
  } catch (e: any) {
    owner.status = previousStatus // revert on error
    console.error(`Failed to update status for ${owner.uuid}:`, JSON.stringify(e?.data, null, 2))
  } finally {
    statusChangeLoading.value = null
  }
}

onMounted(() => {
  fetchStats()
  fetchOwners()
})

// ── Status tabs (replace the old status dropdown) ───────────────────────────
const statusTabs = computed(() => [
  { value: '', label: 'All', count: stats.value?.total_owners },
  { value: 'active', label: 'Active', count: stats.value?.active },
  { value: 'suspended', label: 'Suspended', count: stats.value?.suspended },
  { value: 'inactive', label: 'Inactive', count: stats.value?.inactive },
])

const hasFilters = computed(() => !!(search.value || status.value || date.value))

function clearFilters() {
  search.value = ''
  status.value = ''
  date.value = ''
}

// ── Export the owners currently shown as CSV ────────────────────────────────
function exportCsv() {
  if (!owners.value.length) return
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [
    ['Owner', 'Cafe', 'Phone', 'Email', 'Status', 'Joined'],
    ...owners.value.map((o) => [o.name, o.cafe_name, o.phone_number, o.email, o.status, o.date_joined?.slice(0, 10)]),
  ]
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `owners-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const showingFrom = computed(() => (total.value ? (currentPage.value - 1) * perPage + 1 : 0))
const showingTo = computed(() => Math.min(currentPage.value * perPage, total.value))
</script>

<template>
  <div class="flex flex-col min-h-screen bg-[#FDF3E7]
              md:flex-row">
    <NavBar :links="links" />

    <main class="flex-1 p-3.5
                min-[360px]:p-4
                sm:p-6
                md:p-12">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4
                  min-[360px]:mb-5
                  sm:mb-6
                  md:mb-8">
        <div>
          <h1 class="font-display text-2xl font-extrabold text-[#3D2B24] tracking-tight
                     min-[360px]:text-3xl
                     sm:text-[32px] sm:leading-[40px]">
            Owner Management
          </h1>
          <p class="font-sans text-[13px] text-[#9E7060] mt-1
                    min-[360px]:text-sm
                    sm:text-[15px]">
            Manage all registered cafe owners.
          </p>
        </div>

        <div class="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 h-10 rounded-[10px] bg-white border border-[#EDD8CC] text-[#7D5A50] font-sans font-medium text-[14px] shadow-[0_1px_2px_rgba(61,43,36,0.04)] cursor-pointer transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#FDF3E7] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#D9C4B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]/40"
            :disabled="!owners.length"
            @click="exportCsv"
          >
            <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 h-10 rounded-[10px] bg-white border border-[#EDD8CC] text-[#7D5A50] font-sans font-medium text-[14px] shadow-[0_1px_2px_rgba(61,43,36,0.04)] cursor-pointer transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] disabled:opacity-60 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#FDF3E7] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#D9C4B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]/40"
            :disabled="loading"
            @click="refreshData"
          >
            <Icon name="heroicons:arrow-path" class="w-4 h-4" :class="{ 'animate-spin': loading }" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Stat cards -->
      <div class="grid grid-cols-2 gap-2.5 mb-4
                  min-[360px]:gap-3 min-[360px]:mb-5
                  sm:gap-4
                  md:grid-cols-4 md:gap-4 md:mb-8">
        <OwnerManagementStatCard class="rise" style="--i: 0" :value="stats?.total_owners" label="Total owners" icon="heroicons:users" accent="#7D5A50" />
        <OwnerManagementStatCard class="rise" style="--i: 1" :value="stats?.active" label="Active" icon="heroicons:check-circle" accent="#2E9E5B" />
        <OwnerManagementStatCard class="rise" style="--i: 2" :value="stats?.suspended" label="Suspended" icon="heroicons:no-symbol" accent="#D9622B" />
        <OwnerManagementStatCard class="rise" style="--i: 3" :value="stats?.inactive" label="Inactive" icon="heroicons:pause-circle" accent="#8B6656" />
      </div>

      <!-- Main Content Card -->
      <div class="rise bg-white border border-[#EEDFC4] rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgba(61,43,36,0.04)]" style="--i: 4">
        <!-- Status tabs + clear filters -->
        <div class="flex items-center justify-between gap-3 px-3 pt-3 md:px-6 md:pt-5">
          <div class="flex items-center gap-1 overflow-x-auto" role="tablist" aria-label="Filter owners by status">
            <button
              v-for="tab in statusTabs"
              :key="tab.value"
              type="button"
              role="tab"
              :aria-selected="status === tab.value"
              class="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] font-sans text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]/40"
              :class="status === tab.value
                ? 'bg-[#7D5A50] text-white'
                : 'text-[#7D5A50] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#F6EBDD]'"
              @click="status = tab.value"
            >
              {{ tab.label }}
              <span
                class="tabular-nums text-[11px] rounded-full px-1.5 py-px"
                :class="status === tab.value ? 'bg-white/20 text-white' : 'bg-[#F3E7D2] text-[#7D5A50]'"
              >{{ tab.count ?? '–' }}</span>
            </button>
          </div>

          <button
            v-if="hasFilters"
            type="button"
            class="shrink-0 inline-flex items-center gap-1 h-9 px-2.5 rounded-[10px] font-sans text-[13px] font-semibold text-[#9E7060] cursor-pointer transition-[transform,color,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[#3D2B24] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#F6EBDD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]/40"
            @click="clearFilters"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" aria-hidden="true" />
            Clear
          </button>
        </div>
        <OwnerManagementFilterBar
          v-model:search="search"
          v-model:status="status"
          v-model:date="date"
          :status-options="statusOptions"
          :total="total"
        />

        <!-- Mobile Card List View (visible on small screens) -->
        <div class="block
                    md:hidden">
          <div v-if="loading && !owners.length" class="divide-y divide-[#F3E7D2]" aria-hidden="true">
            <div v-for="i in 3" :key="i" class="p-4 flex items-center gap-3">
              <span class="skeleton w-9 h-9 rounded-full shrink-0" />
              <span class="flex-1 space-y-2">
                <span class="skeleton block h-3.5 w-1/2 rounded" />
                <span class="skeleton block h-3 w-2/3 rounded" />
              </span>
            </div>
          </div>
          <div v-else-if="!owners.length" class="px-6 py-12 text-center font-sans text-sm text-[#3B1F0E]/50">
            No owners found.
          </div>
          <OwnerManagementMobileCard
            v-for="(owner, index) in owners"
            :key="owner.uuid"
            :owner="owner"
            :index="index"
            :status-change-loading="statusChangeLoading === owner.uuid"
            @view="viewOwner"
            @status-change="requestStatusChange"
          />
        </div>

        <!-- Desktop Table View (visible on medium screens and up) -->
        <div class="hidden overflow-x-auto
                    md:block">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-[#FBF2E1] border-b border-[#F3E7D2]">
                <th class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-6 py-3">Owner</th>
                <th class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-6 py-3">Cafe</th>
                <th class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-6 py-3">Contacts</th>
                <th class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-6 py-3">Status</th>
                <th class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-6 py-3">Joined</th>
                <th class="font-sans text-[11px] font-semibold tracking-[0.06em] text-[#3B1F0E]/50 uppercase px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="loading && !owners.length">
                <tr v-for="i in 3" :key="`sk-${i}`" aria-hidden="true" class="border-b border-[#F3E7D2] last:border-b-0">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <span class="skeleton w-9 h-9 rounded-full shrink-0" />
                      <span class="skeleton block h-3.5 w-28 rounded" />
                    </div>
                  </td>
                  <td class="px-6 py-4"><span class="skeleton block h-3.5 w-24 rounded" /></td>
                  <td class="px-6 py-4 space-y-2"><span class="skeleton block h-3.5 w-32 rounded" /><span class="skeleton block h-3 w-40 rounded" /></td>
                  <td class="px-6 py-4"><span class="skeleton block h-6 w-16 rounded-full" /></td>
                  <td class="px-6 py-4"><span class="skeleton block h-3.5 w-20 rounded" /></td>
                  <td class="px-6 py-4"><span class="skeleton block h-6 w-16 rounded ml-auto" /></td>
                </tr>
              </template>
              <tr v-else-if="!owners.length">
                <td colspan="6" class="px-6 py-12 text-center font-sans text-sm text-[#3B1F0E]/50">
                  No owners found.
                </td>
              </tr>
              <OwnerManagementTableRow
                v-for="(owner, index) in owners"
                :key="owner.uuid"
                :owner="owner"
                :index="index"
                :status-change-loading="statusChangeLoading === owner.uuid"
                @view="viewOwner"
                @status-change="requestStatusChange"
              />
            </tbody>
          </table>
        </div>

        <!-- Footer: result count + pagination -->
        <div v-if="owners.length > 0" class="relative border-t border-[#F3E7D2]">
          <p class="hidden md:block absolute left-6 top-1/2 -translate-y-1/2 font-sans text-[13px] text-[#3B1F0E]/55 tabular-nums">
            Showing {{ showingFrom }}–{{ showingTo }} of {{ total }}
          </p>
          <CommonPagination :page="currentPage" :last-page="lastPage" @change="goToPage" />
        </div>
      </div>
    </main>

    <ConfirmDialog
      :open="!!confirmDialog"
      :title="confirmDialog?.newStatus === 'suspended' ? 'Suspend this owner?' : 'Reactivate this owner?'"
      :message="confirmDialog?.newStatus === 'suspended'
        ? `This will suspend ${confirmDialog?.owner.name}, deactivate their branches, and cancel their active subscription. This action can be reversed later.`
        : `This will reactivate ${confirmDialog?.owner.name} and restore their branches.`"
      :confirm-label="confirmDialog?.newStatus === 'suspended' ? 'Suspend' : 'Reactivate'"
      :danger="confirmDialog?.newStatus === 'suspended'"
      @confirm="confirmStatusChange"
      @cancel="cancelStatusChange"
    />
  </div>
</template>

<style scoped>
/* Staggered entrance: short, ease-out, transform + opacity only. */
.rise {
  animation: rise 320ms cubic-bezier(0.23, 1, 0.32, 1) both;
  animation-delay: calc(var(--i, 0) * 50ms);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.skeleton {
  background: linear-gradient(90deg, #F6ECDD, #FBF4EA, #F6ECDD);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .rise { animation: fade 200ms ease both; animation-delay: 0ms; }
  .skeleton { animation: none; }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
}
</style>