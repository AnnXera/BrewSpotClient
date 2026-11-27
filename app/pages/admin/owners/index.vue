<!-- pages/admin/ownermanagement.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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
const refreshing = ref(false)
const loaded = ref(false)

useScrollReveal(loaded)

const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)
const perPage = 15

const search = ref('')
const status = ref('')
const date = ref('')

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
]

const hasActiveFilters = computed(() => Boolean(search.value || status.value || date.value))

const paginationFrom = computed(() => {
  if (total.value === 0) return 0
  return (currentPage.value - 1) * perPage + 1
})

const paginationTo = computed(() => {
  if (total.value === 0) return 0
  return Math.min(currentPage.value * perPage, total.value)
})

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
    await new Promise((resolve) => setTimeout(resolve, 200))

    const filtered = getFilteredMockOwners()
    total.value = filtered.length
    lastPage.value = Math.max(1, Math.ceil(filtered.length / perPage))
    currentPage.value = Math.min(currentPage.value, lastPage.value)

    const start = (currentPage.value - 1) * perPage
    owners.value = filtered.slice(start, start + perPage)
    loading.value = false
    loaded.value = true
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
    loaded.value = true
  }
}

async function refreshData() {
  refreshing.value = true
  await Promise.all([fetchStats(), fetchOwners()])
  refreshing.value = false
}

function resetFilters() {
  search.value = ''
  status.value = ''
  date.value = ''
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchOwners()
  }, 350)
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
</script>

<template>
  <div class="flex flex-col min-h-screen bg-[#FDF3E7] md:flex-row">
    <NavBar :links="links" />

    <main class="flex-1 p-3.5 min-[360px]:p-4 sm:p-6 md:p-10 max-w-[1400px]">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 class="font-display text-2xl font-black text-[#3D2B24] tracking-tight min-[360px]:text-3xl sm:text-[32px] sm:leading-tight">
            Owner Management
          </h1>
          <p class="font-sans text-xs sm:text-sm text-[#9E7060] mt-1">
            Manage, verify, and monitor all registered cafe owners across the platform.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#EDD8CC] text-[#7D5A50] font-sans font-semibold text-sm hover:bg-[#FDF3E7] hover:border-[#D9C4B8] hover:text-[#3D2B24] active:scale-95 transition-[transform,background-color,border-color] duration-160 ease-out shadow-xs self-start sm:self-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
          :disabled="loading || refreshing"
          @click="refreshData"
        >
          <Icon name="heroicons:arrow-path" class="w-4 h-4 text-[#7D5A50]" :class="{ 'animate-spin': loading || refreshing }" />
          <span>Refresh</span>
        </button>
      </div>

      <!-- Stat cards -->
      <div
        class="scroll-reveal grid grid-cols-2 gap-3 mb-6 sm:gap-4 md:grid-cols-3 md:gap-5 md:mb-8 transition-opacity duration-200 ease-out"
        :class="{ 'opacity-60': refreshing }"
      >
        <div class="col-span-2 md:col-span-1">
          <OwnerManagementStatCard
            :value="stats?.total_owners"
            label="Total Owners"
            icon="heroicons:users"
            description="Registered operators"
          />
        </div>
        <OwnerManagementStatCard
          :value="stats?.active"
          label="Active"
          icon="heroicons:check-circle"
          description="Active on platform"
        />
        <OwnerManagementStatCard
          :value="stats?.inactive_or_suspended"
          label="Suspended/ Inactive"
          icon="heroicons:no-symbol"
          description="Suspended or inactive"
        />
      </div>

      <!-- Main Content Card -->
      <div
        class="scroll-reveal bg-white border border-[#EEDFC4] rounded-[20px] shadow-sm overflow-hidden transition-[box-shadow,border-color,opacity] duration-200 ease-out"
        :class="{ 'opacity-60': refreshing }"
      >
        <!-- Filter Toolbar -->
        <OwnerManagementFilterBar
          v-model:search="search"
          v-model:status="status"
          v-model:date="date"
          :status-options="statusOptions"
          :total="total"
          @reset="resetFilters"
        />

        <!-- Mobile Card List View (visible on small screens) -->
        <div class="block md:hidden">
          <div v-if="loading" class="p-12 flex flex-col items-center justify-center gap-3 text-[#7D5A50]">
            <div class="w-8 h-8 rounded-full border-2 border-[#EEDFC4] border-t-[#B4846C] animate-spin" />
            <span class="font-sans text-xs font-semibold text-[#9E7060]">Loading owners…</span>
          </div>
          <div v-else-if="!owners.length" class="p-12 flex flex-col items-center justify-center text-center">
            <div class="w-12 h-12 rounded-2xl bg-[#F7EFE6] border border-[#E8D9CB] flex items-center justify-center text-[#7D5A50] mb-3 shadow-xs">
              <Icon name="heroicons:user-group" class="w-6 h-6" />
            </div>
            <h3 class="font-display font-bold text-base text-[#3D2B24]">No owners found</h3>
            <p class="font-sans text-xs text-[#9E7060] mt-1 leading-relaxed max-w-xs">
              {{ hasActiveFilters ? 'No cafe owners matched your active search or filters.' : 'No registered cafe owners yet.' }}
            </p>
            <button
              v-if="hasActiveFilters"
              type="button"
              class="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#5C3A28] bg-[#F7EFE6] border border-[#E8D9CB] hover:bg-[#EEDFC4] active:scale-95 transition-[transform,background-color] duration-140 ease-out"
              @click="resetFilters"
            >
              <Icon name="heroicons:arrow-path" class="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
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
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-[#FAF4ED] border-b border-[#EEDFC4]">
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Owner</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Cafe</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Email</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Status</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Joined</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              <!-- Loading State -->
              <tr v-if="loading">
                <td colspan="6" class="px-6 py-16 text-center">
                  <div class="flex flex-col items-center justify-center gap-3">
                    <div class="w-8 h-8 rounded-full border-2 border-[#EEDFC4] border-t-[#B4846C] animate-spin" />
                    <span class="font-sans text-xs font-semibold text-[#9E7060]">Loading cafe owners…</span>
                  </div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr v-else-if="!owners.length">
                <td colspan="6" class="px-6 py-16 text-center">
                  <div class="max-w-xs mx-auto flex flex-col items-center justify-center text-center">
                    <div class="w-12 h-12 rounded-2xl bg-[#F7EFE6] border border-[#E8D9CB] flex items-center justify-center text-[#7D5A50] mb-3 shadow-xs">
                      <Icon name="heroicons:user-group" class="w-6 h-6" />
                    </div>
                    <h3 class="font-display font-bold text-base text-[#3D2B24]">No owners found</h3>
                    <p class="font-sans text-xs text-[#9E7060] mt-1 leading-relaxed">
                      {{ hasActiveFilters ? 'No cafe owners matched your active search or filters. Try adjusting them.' : 'No registered cafe owners yet.' }}
                    </p>
                    <button
                      v-if="hasActiveFilters"
                      type="button"
                      class="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#5C3A28] bg-[#F7EFE6] border border-[#E8D9CB] hover:bg-[#EEDFC4] active:scale-95 transition-[transform,background-color] duration-140 ease-out"
                      @click="resetFilters"
                    >
                      <Icon name="heroicons:arrow-path" class="w-3.5 h-3.5" />
                      <span>Reset filters</span>
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Rows -->
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

        <!-- Integrated Pagination Footer -->
        <div v-if="owners.length > 0" class="border-t border-[#F3E7D2] px-6 py-3.5 bg-[#FAF4ED]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="font-sans text-xs text-[#9E7060]">
            Showing <strong class="text-[#3D2B24] font-semibold">{{ paginationFrom }}</strong> to <strong class="text-[#3D2B24] font-semibold">{{ paginationTo }}</strong> of <strong class="text-[#3D2B24] font-semibold">{{ total }}</strong> registered owners
          </div>
          
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[#EDD8CC] bg-white text-[#7D5A50] hover:bg-[#FDF3E7] hover:text-[#3D2B24] disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-[transform,background-color] duration-140 ease-out shadow-xs"
              :disabled="currentPage <= 1"
              aria-label="Previous page"
              @click="goToPage(currentPage - 1)"
            >
              <Icon name="heroicons:chevron-left" class="w-4 h-4" />
            </button>

            <span class="font-sans text-xs font-bold text-[#5C3A28] px-2.5">
              Page {{ currentPage }} of {{ Math.max(1, lastPage) }}
            </span>

            <button
              type="button"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[#EDD8CC] bg-white text-[#7D5A50] hover:bg-[#FDF3E7] hover:text-[#3D2B24] disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-[transform,background-color] duration-140 ease-out shadow-xs"
              :disabled="currentPage >= Math.max(1, lastPage)"
              aria-label="Next page"
              @click="goToPage(currentPage + 1)"
            >
              <Icon name="heroicons:chevron-right" class="w-4 h-4" />
            </button>
          </div>
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
.scroll-reveal {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}

.scroll-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
</style>
