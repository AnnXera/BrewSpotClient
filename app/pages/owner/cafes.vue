<script setup lang="ts">
import type { BranchSummary } from '~/services/OwnerProfileService'
import { usePlanFeature } from '~/composables/usePlanFeature'
import { useOperatingHours, type DaySchedule } from '~/composables/useOperatingHours'
import Pagination from '~/components/common/Pagination.vue'

definePageMeta({
  role: 'Cafe Owner',
})

const links = OWNER_NAV_LINKS

const ownerService = useOwnerProfileService()
const { hasFeature, fetchCurrentSubscription } = usePlanFeature()

// State
const branches = ref<BranchSummary[]>([])
const loading = ref(false)
const errorMessage = ref('')
const { saveOperatingHours } = useOperatingHours()

const currentPage = ref(1)
const lastPage = ref(1)
const perPage = 6

const search = ref('')
const status = ref('')

// Business Info
const cafeName = ref('')
const mainTinPrefix = ref<string | null>(null)

// Modal Controls
const isAddBranchOpen = ref(false)
const isOperatingHoursOpen = ref(false)
const savingBranch = ref(false)
const savingHours = ref(false)
const hoursError = ref('')
const toastMessage = ref('')
const backendErrors = ref<Record<string, string[]>>({})

function showToast(msg: string) {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

// No mock data - relies on actual API responses

// Computed Summary Metrics
const totalBranchesCount = computed(() => branches.value.length)
const activeBranchesCount = computed(() => {
  return branches.value.filter(b => (b.status || '').toLowerCase() === 'active').length
})
const inactiveBranchesCount = computed(() => {
  return branches.value.filter(b => (b.status || '').toLowerCase() === 'inactive' || (b.status || '').toLowerCase() === 'suspended').length
})
const pendingBranchesCount = computed(() => {
  return branches.value.filter(b => (b.status || '').toLowerCase().includes('pending')).length
})

const canAddBranch = computed(() => hasFeature('multi_branch'))

async function fetchBranches() {
  errorMessage.value = ''
  loading.value = true
  try {
    const res = await ownerService.getBranches(perPage, currentPage.value, search.value, status.value)
    if (res.success && res.cafe_name) {
      cafeName.value = res.cafe_name
    }
    if (res.success) mainTinPrefix.value = res.main_tin_prefix ?? null
    if (res.success && res.branches?.data) {
      branches.value = res.branches.data
      currentPage.value = res.branches.current_page
      lastPage.value = res.branches.last_page
    } else {
      branches.value = []
    }
  } catch (e) {
    branches.value = []
    errorMessage.value = 'Failed to load branches.'
  } finally {
    loading.value = false
  }
}

// Handle Add Branch Creation
async function handleCreateBranch(data: FormData | any) {
  savingBranch.value = true
  backendErrors.value = {}
  try {
    const res = await ownerService.createBranch(data)
    if (res.success) {
      const bName = data instanceof FormData ? data.get('branch_name') : data.branch_name;
      showToast(`Branch "${bName}" added successfully!`)
      isAddBranchOpen.value = false
      fetchBranches()
    } else {
      errorMessage.value = res.message || 'Failed to add branch.'
      isAddBranchOpen.value = false
    }
  } catch (e: any) {
    const errorData = e.response?._data || e.response?.data || e.data;
    if (errorData && errorData.errors) {
      backendErrors.value = errorData.errors
      // Do not close modal on validation errors
    } else if (errorData && errorData.message) {
      errorMessage.value = errorData.message
      isAddBranchOpen.value = false
    } else {
      errorMessage.value = 'An error occurred while creating the branch.'
      isAddBranchOpen.value = false
    }
  } finally {
    savingBranch.value = false
  }
}

// Opening hours are cafe-wide: one week shared by every branch.
async function handleSaveOperatingHours(schedule: DaySchedule[]) {
  savingHours.value = true
  hoursError.value = ''
  try {
    await saveOperatingHours(schedule)
    isOperatingHoursOpen.value = false
    showToast('Operating hours updated for all branches.')
  } catch (e: any) {
    const errors = e?.data?.errors as Record<string, string[]> | undefined
    hoursError.value = errors
      ? Object.values(errors).flat().join('\n')
      : (e?.data?.message ?? 'Could not save operating hours. Please try again.')
  } finally {
    savingHours.value = false
  }
}

function goToPage(page: number) {
  if (page < 1 || page > lastPage.value || page === currentPage.value) return
  currentPage.value = page
  fetchBranches()
}

onMounted(() => {
  fetchCurrentSubscription(true, true)
  fetchBranches()
})

watch(status, () => {
  currentPage.value = 1
  fetchBranches()
})

let searchTimeout: any = null
watch(search, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchBranches()
  }, 300)
})

const selectedBranches = ref<string[]>([])
const bulkLoading = ref(false)

function toggleSelectAll(checked: boolean) {
  selectedBranches.value = checked ? branches.value.map(b => b.uuid) : []
}

async function bulkUpdateStatus(newStatus: string) {
  if (!selectedBranches.value.length || bulkLoading.value) return
  bulkLoading.value = true
  
  const promises = selectedBranches.value.map(uuid => ownerService.updateBranch(uuid, { status: newStatus }))
  await Promise.allSettled(promises)
  
  selectedBranches.value = []
  bulkLoading.value = false
  await fetchBranches()
}

function viewDetails(uuid: string) {
  navigateTo(`/owner/branches/${uuid}`)
}
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FFF8EA]">
    <NavBar :links="links" />
    <!-- Toast: teleported to body so it floats over the page instead of taking a slot in main's spacing -->
    <Teleport to="body">
      <transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="toastMessage" role="status" aria-live="polite" class="fixed top-6 right-6 z-[1000] bg-[#7D5A50] text-[#FFF8EA] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-[#B4846C]">
          <Icon name="heroicons:check-circle" class="w-5 h-5 text-emerald-400 shrink-0" />
          <span class="text-sm font-bold">{{ toastMessage }}</span>
        </div>
      </transition>
    </Teleport>
    <main class="flex-1 p-6 sm:p-8 lg:p-10 space-y-8">
      <!-- Header: cafe title + cafe-wide opening hours (click to edit) -->
      <header class="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl sm:text-4xl font-extrabold text-[#3D2B24] tracking-tight">{{ cafeName || 'Cafe Management' }}</h1>
          <p class="text-xs sm:text-sm text-[#9E7060] mt-1 font-medium">Manage your branches and the opening hours they share.</p>
        </div>

        <CafeManagementOperatingHoursPanel class="shrink-0" @edit="isOperatingHoursOpen = true" />
      </header>

      <!-- 4 Metric Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div class="bg-white border border-[#F3E7D2] rounded-[20px] p-6 shadow-sm space-y-2 hover:border-[#7D5A50] transition-colors">
          <p class="text-[11px] font-bold text-[#9E7060] uppercase tracking-wider">Total Branches</p>
          <p class="text-3xl font-extrabold text-[#3D2B24]">{{ totalBranchesCount }}</p>
        </div>

        <div class="bg-white border border-[#F3E7D2] rounded-[20px] p-6 shadow-sm space-y-2 hover:border-[#7D5A50] transition-colors">
          <p class="text-[11px] font-bold text-[#9E7060] uppercase tracking-wider">Active Branches</p>
          <p class="text-3xl font-extrabold text-[#3D2B24]">{{ activeBranchesCount }}</p>
        </div>

        <div class="bg-white border border-[#F3E7D2] rounded-[20px] p-6 shadow-sm space-y-2 hover:border-[#7D5A50] transition-colors">
          <p class="text-[11px] font-bold text-[#9E7060] uppercase tracking-wider">Inactive Branches</p>
          <p class="text-3xl font-extrabold text-[#3D2B24]">{{ inactiveBranchesCount }}</p>
        </div>

        <div class="bg-white border border-[#F3E7D2] rounded-[20px] p-6 shadow-sm space-y-2 hover:border-[#7D5A50] transition-colors">
          <p class="text-[11px] font-bold text-[#9E7060] uppercase tracking-wider">Pending/Registering</p>
          <p class="text-3xl font-extrabold text-[#3D2B24]">{{ pendingBranchesCount }}</p>
        </div>
      </div>

      <!-- Main Container with Filter Bar and Branch List (wrapped with pagination so main's space-y gap doesn't split them) -->
      <div>
      <div :class="['bg-white border border-[#EEDFC4] shadow-sm flex flex-col', branches.length > 0 ? 'rounded-t-[24px] border-b-0' : 'rounded-[24px]']">
        <!-- Filter Bar -->
        <CafeManagementCafeFilterBar
          class="sticky top-0 z-20 bg-white rounded-t-[24px]"
          v-model:search="search"
          v-model:status="status"
          :selected-count="selectedBranches.length"
          :total-count="branches.length"
          :can-add-branch="canAddBranch"
          :bulk-loading="bulkLoading"
          @toggle-select-all="toggleSelectAll"
          @bulk-action="bulkUpdateStatus"
          @cancel-selection="selectedBranches = []"
          @open-add-branch="isAddBranchOpen = true"
        />

        <!-- List Content -->
        <div>
          <div v-if="errorMessage" class="m-6 bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0" />
            <span class="text-sm font-medium">{{ errorMessage }}</span>
            <button @click="fetchBranches" class="ml-auto text-sm font-bold underline hover:text-red-900 focus:outline-none">Retry</button>
          </div>

          <div v-if="loading" class="flex justify-center items-center py-12">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-[#7D5A50]" />
          </div>

          <div v-else-if="branches.length === 0 && !errorMessage" class="px-6 py-14 text-center">
            <p class="font-display font-extrabold text-lg text-[#3D2B24]">
              {{ search || status ? 'No branches match these filters' : 'No branches yet' }}
            </p>
            <p class="text-sm text-[#9E7060] mt-1">
              {{ search || status ? 'Try a different search or status.' : 'Add your first branch to start managing it here.' }}
            </p>
            <button
              v-if="search || status"
              type="button"
              @click="search = ''; status = ''"
              class="mt-4 text-sm font-bold text-[#7D5A50] underline underline-offset-4 hover:text-[#3D2B24]"
            >
              Clear filters
            </button>
          </div>

          <template v-else-if="branches.length">
            <!-- Column labels (wide screens only; rows stack on small screens) -->
            <div
              class="hidden lg:grid grid-cols-[auto_minmax(0,2.2fr)_minmax(0,2fr)_minmax(0,1.3fr)_8.5rem_auto] items-center gap-x-4 px-6 py-2.5 bg-[#FDF8F3] border-b border-[#F3E7D2] text-[11px] font-bold text-[#9E7060]"
            >
              <input
                type="checkbox"
                :checked="selectedBranches.length === branches.length"
                :indeterminate="selectedBranches.length > 0 && selectedBranches.length < branches.length"
                @change="toggleSelectAll(($event.target as HTMLInputElement).checked)"
                aria-label="Select all branches on this page"
                class="w-5 h-5 rounded border-[#D9C4A8] text-[#7D5A50] focus:ring-[#7D5A50] cursor-pointer"
              />
              <span>Branch</span>
              <span>Address</span>
              <span>Manager</span>
              <span>Status</span>
              <span class="w-9" aria-hidden="true"></span>
            </div>

            <ul class="divide-y divide-[#F3E7D2]">
              <li v-for="branch in branches" :key="branch.uuid">
                <CafeManagementBranchCard
                  :branch="branch"
                  :selected="selectedBranches.includes(branch.uuid)"
                  @update:selected="$event ? selectedBranches.push(branch.uuid) : selectedBranches = selectedBranches.filter(id => id !== branch.uuid)"
                  @view="viewDetails"
                />
              </li>
            </ul>
          </template>
        </div>
      </div>
      
      <!-- Pagination (Separate Frame) -->
      <div v-if="branches.length > 0" class="sticky bottom-0 z-20 bg-white rounded-b-[24px] border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm">
        <Pagination
          :page="currentPage"
          :last-page="lastPage"
          @change="goToPage"
        />
      </div>
      </div>

      <!-- Interactive Modals -->
      <CafeManagementAddBranchModal
        :show="isAddBranchOpen"
        :saving="savingBranch"
        :backend-errors="backendErrors"
        :main-tin-prefix="mainTinPrefix"
        @close="isAddBranchOpen = false"
        @save="handleCreateBranch"
      />

      <CafeManagementOperatingHoursModal
        :show="isOperatingHoursOpen"
        :saving="savingHours"
        :error="hoursError"
        @close="isOperatingHoursOpen = false; hoursError = ''"
        @save="handleSaveOperatingHours"
      />
    </main>
  </div>
</template>
