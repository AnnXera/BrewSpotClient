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
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7]">
    <NavBar :links="links" />

    <main class="flex-1 p-12">
      <!-- Header -->
      <header class="mb-8">
        <h1 class="font-display text-[26px] leading-[39px] font-bold text-[#3D2B24]">Owner Management</h1>
        <p class="font-sans text-[14px] leading-[21px] text-[#9E7060] mt-[2px]">
          Manage all registered cafe owners across the platform.
        </p>
      </header>

      <!-- Stat cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <OwnerManagementStatCard :value="stats?.total_owners" label="Total Owners" />
        <OwnerManagementStatCard :value="stats?.active" label="Active" color="#2E9E5B" />
        <OwnerManagementStatCard :value="stats?.inactive_or_suspended" label="Inactive/Suspended" color="#D9622B" />
      </div>

      <!-- Table card -->
      <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden">
        <OwnerManagementFilterBar
          v-model:search="search"
          v-model:status="status"
          v-model:date="date"
          :status-options="statusOptions"
          :total="total"
        />

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-[#FBF2E1] border-b border-[#F3E7D2]">
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Owner</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Cafe</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Contacts</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Status</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Joined</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="px-6 py-10 text-center font-sans text-sm text-[#3B1F0E]/50">
                  Loading owners…
                </td>
              </tr>
              <tr v-else-if="!owners.length">
                <td colspan="6" class="px-6 py-10 text-center font-sans text-sm text-[#3B1F0E]/50">
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

        <CommonPagination :page="currentPage" :last-page="lastPage" @change="goToPage" />
      </div>
    </main>
  </div>

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
</template>