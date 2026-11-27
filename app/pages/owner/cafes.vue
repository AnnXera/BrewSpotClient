<script setup lang="ts">
import type { BranchSummary } from '~/services/OwnerProfileService'
import { usePlanFeature } from '~/composables/usePlanFeature'
import { useOperatingHours, type DaySchedule } from '~/composables/useOperatingHours'
import { isOperationalBranchStatus } from '~/utils/branchStatus'
import Pagination from '~/components/common/Pagination.vue'
import ConfirmModal from '~/components/common/ConfirmModal.vue'
import { useDialogs } from '~/composables/useDialogs'
import type { CafeUpdateRequest, NameChangeBranch } from '~/services/CafeUpdateService'

definePageMeta({
  role: 'Cafe Owner',
})

const links = OWNER_NAV_LINKS

const ownerService = useOwnerProfileService()
const { hasFeature, fetchCurrentSubscription } = usePlanFeature()
const { refresh: refreshNotifications } = useNotifications()

// State
const branches = ref<BranchSummary[]>([])
const loading = ref(false)
const errorMessage = ref('')
const { saveOperatingHours } = useOperatingHours()

const currentPage = ref(1)
const lastPage = ref(1)
// For the "Showing x to y of z branches" footer
const pageTotal = ref(0)
const pageFrom = ref<number | null>(null)
const pageTo = ref<number | null>(null)
const perPage = 6

const search = ref('')
const status = ref('')

// Business Info
const cafeName = ref('')
const mainTinPrefix = ref<string | null>(null)
const lowStockThresholdPercent = ref<number | null>(null)

// Modal Controls
const isAddBranchOpen = ref(false)
const isOperatingHoursOpen = ref(false)
const isLowStockModalOpen = ref(false)

// ?edit=stock-limit (the branch page's Low Stock Alert Limit link) opens the limit editor
// straight away, then drops the query so a refresh doesn't open it again.
const route = useRoute()
const router = useRouter()
onMounted(() => {
  if (route.query.edit !== 'stock-limit') return
  isLowStockModalOpen.value = true
  const { edit, ...rest } = route.query
  router.replace({ query: rest })
})
const savingBranch = ref(false)
const savingHours = ref(false)
const savingLowStock = ref(false)
const hoursError = ref('')
const lowStockError = ref('')
const toastMessage = ref('')
const backendErrors = ref<Record<string, string[]>>({})

const toastKind = ref<'success' | 'error'>('success')
let toastTimer: ReturnType<typeof setTimeout> | undefined

// One timer at a time, so an earlier toast's timeout can't cut a newer one short.
function showToast(msg: string, kind: 'success' | 'error' = 'success') {
  toastMessage.value = msg
  toastKind.value = kind
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, kind === 'error' ? 6000 : 4000)
}
onBeforeUnmount(() => clearTimeout(toastTimer))

// Summary cards count every branch the owner has. The list below is one page (6) and follows
// the search and status filter, so counting it would undercount as soon as there are more.
const branchCounts = ref<{ total: number; active: number; inactive: number; pending: number; rejected: number } | null>(null)
const totalBranchesCount = computed(() => branchCounts.value?.total ?? branches.value.length)
const activeBranchesCount = computed(() => branchCounts.value?.active ?? 0)
const inactiveBranchesCount = computed(() => branchCounts.value?.inactive ?? 0)
const pendingBranchesCount = computed(() => branchCounts.value?.pending ?? 0)
const rejectedBranchesCount = computed(() => branchCounts.value?.rejected ?? 0)

const canAddBranch = computed(() => hasFeature('multi_branch'))
const { requireFeature } = useSubscriptionGate()

// ── Cafe name change ──
// The cafe name is the trade name on every branch's COR, so a rename goes to an admin with
// an updated COR per branch. The old name stays in use until it is approved.
const cafeUpdateService = useCafeUpdateService()
const { confirmDialog, askConfirm, runConfirm } = useDialogs()
const nameChange = ref<CafeUpdateRequest | null>(null)
const nameChangeBranches = ref<NameChangeBranch[]>([])
const isRenameOpen = ref(false)
const cancellingRename = ref(false)

const renamePending = computed(() => nameChange.value?.status === 'pending_approval' || nameChange.value?.status === 'resubmitted')
const renameRejected = computed(() => nameChange.value?.status === 'rejected')

async function fetchNameChange() {
  try {
    const res = await cafeUpdateService.overview()
    nameChange.value = res.request
    nameChangeBranches.value = res.branches
    if (res.cafe_name) cafeName.value = res.cafe_name
  } catch {
    // Not critical: the page works without it, and the server still blocks conflicting actions
  }
}

async function openRename() {
  await fetchNameChange() // the branch list must be current: every one needs a COR
  isRenameOpen.value = true
}

function onRenameSubmitted(request: CafeUpdateRequest) {
  nameChange.value = request
  isRenameOpen.value = false
  showToast('Name change sent. An admin will review it.')
}

function cancelRename() {
  const request = nameChange.value
  if (!request) return
  askConfirm({
    title: 'Cancel name change',
    message: `Cancel the request to rename the cafe to ${request.new_name}? You can send a new one any time.`,
    confirmText: 'Cancel request',
    isDestructive: true,
    onConfirm: async () => {
      cancellingRename.value = true
      try {
        await cafeUpdateService.withdraw(request.uuid)
        await fetchNameChange()
        showToast('Name change cancelled.')
      } catch (e: any) {
        showToast(e?.data?.message || 'Could not cancel the name change.', 'error')
      } finally {
        cancellingRename.value = false
      }
    },
  })
}

function openAddBranch() {
  if (renamePending.value) {
    showToast('Add branches after your cafe name change is decided, so their COR shows the right name.', 'error')
    return
  }
  if (requireFeature('multi_branch', 'Multiple branches')) isAddBranchOpen.value = true
}

async function fetchBranches() {
  errorMessage.value = ''
  loading.value = true
  try {
    const res = await ownerService.getBranches(perPage, currentPage.value, search.value, status.value)
    if (res.success && res.cafe_name) {
      cafeName.value = res.cafe_name
    }
    if (res.success) {
      if (res.branch_counts) branchCounts.value = res.branch_counts
      mainTinPrefix.value = res.main_tin_prefix ?? null
      if (res.low_stock_threshold_percent !== undefined) {
        lowStockThresholdPercent.value = res.low_stock_threshold_percent
      }
    }
    if (res.success && res.branches?.data) {
      branches.value = res.branches.data
      currentPage.value = res.branches.current_page
      lastPage.value = res.branches.last_page
      pageTotal.value = res.branches.total ?? branches.value.length
      pageFrom.value = res.branches.from ?? null
      pageTo.value = res.branches.to ?? null
    } else {
      branches.value = []
    }
    // Only branches still on screen stay selected, so a bulk action never reaches ones the
    // page, search or filter has since hidden.
    const visible = new Set(branches.value.map(b => b.uuid))
    selectedBranches.value = selectedBranches.value.filter(uuid => visible.has(uuid))
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

// Low stock threshold (%) is cafe-wide: shared across every branch, alerting both Manager and Owner.
async function handleSaveLowStockThreshold(percent: number) {
  savingLowStock.value = true
  lowStockError.value = ''
  try {
    const res = await ownerService.updateLowStockThreshold(percent)
    if (res.success) {
      lowStockThresholdPercent.value = res.low_stock_threshold_percent
      isLowStockModalOpen.value = false
      showToast(res.message || `Low stock alert limit updated to ${percent}% for all branches.`)
      refreshNotifications().catch(() => {})
    }
  } catch (e: any) {
    const errors = e?.data?.errors as Record<string, string[]> | undefined
    lowStockError.value = errors
      ? Object.values(errors).flat().join('\n')
      : (e?.data?.message ?? 'Could not save low stock threshold. Please try again.')
  } finally {
    savingLowStock.value = false
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
  fetchNameChange()
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

// Pending and rejected branches are admin-controlled, so bulk activate/deactivate skips them
const selectableBranches = computed(() => branches.value.filter(b => isOperationalBranchStatus(b.status)))

function toggleSelectAll(checked: boolean) {
  selectedBranches.value = checked ? selectableBranches.value.map(b => b.uuid) : []
}

async function bulkUpdateStatus(newStatus: string) {
  if (!selectedBranches.value.length || bulkLoading.value) return
  bulkLoading.value = true

  const uuids = [...selectedBranches.value]
  const results = await Promise.allSettled(uuids.map(uuid => ownerService.updateBranch(uuid, { status: newStatus })))
  // A request can resolve with success: false as well as reject; both mean that branch didn't change.
  const failed = results.filter(r => r.status === 'rejected' || (r.value as any)?.success === false).length
  const changed = uuids.length - failed
  const verb = newStatus === 'active' ? 'activated' : 'deactivated'
  const count = (n: number) => `${n} branch${n === 1 ? '' : 'es'}`

  selectedBranches.value = []
  bulkLoading.value = false
  await fetchBranches()

  if (!failed) showToast(`${count(changed)} ${verb}.`)
  else if (!changed) showToast(`Couldn't change ${count(failed)}. Please try again.`, 'error')
  else showToast(`${count(changed)} ${verb}, but ${count(failed)} couldn't be changed.`, 'error')
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
        <div
          v-if="toastMessage"
          :role="toastKind === 'error' ? 'alert' : 'status'"
          aria-live="polite"
          class="fixed top-6 right-6 z-[1000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border"
          :class="toastKind === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-[#7D5A50] text-[#FFF8EA] border-[#B4846C]'"
        >
          <Icon
            :name="toastKind === 'error' ? 'heroicons:exclamation-triangle' : 'heroicons:check-circle'"
            class="w-5 h-5 shrink-0"
            :class="toastKind === 'error' ? 'text-red-500' : 'text-emerald-400'"
          />
          <span class="text-sm font-bold">{{ toastMessage }}</span>
        </div>
      </transition>
    </Teleport>
    <main class="flex-1 p-6 sm:p-8 lg:p-10 space-y-8">
      <!-- Header: cafe title + cafe-wide opening hours (click to edit) -->
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Same format as the Servings header: big tight title, icon-led subtitle line -->
        <div class="min-w-0">
          <!-- Bottom-aligned with a small lift so the Rename pill rests beside the title's baseline (as on Servings) -->
          <div class="flex flex-wrap items-end gap-x-3 gap-y-2">
            <h1 class="font-display text-[30px] sm:text-[34px] md:text-[38px] font-bold leading-tight tracking-[-0.02em] text-[#3B1F0E]">{{ cafeName || 'Cafe Management' }}</h1>
            <!-- Rename: hidden while a request is waiting (the banner below handles it) -->
            <button
              v-if="cafeName && !renamePending"
              type="button"
              class="mb-0.5 inline-flex items-center gap-1.5 h-7 pl-2.5 pr-3 rounded-full border border-[#DED4CA] bg-white text-xs font-semibold text-[#5B463C] shadow-2xs hover:border-[#7D5A50] hover:bg-[#F8EFE7] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
              title="Rename your cafe (an admin reviews it)"
              @click="openRename"
            >
              <Icon name="heroicons:pencil-square" class="size-3.5 text-[#7D5A50]" />
              Rename
            </button>
          </div>
          <p class="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#8B6656]">
            <Icon name="heroicons:building-storefront" class="h-3.5 w-3.5 shrink-0 text-[#B4846C]" />
            <span>Manage your branches and the opening hours they share.</span>
          </p>
        </div>

        <CafeManagementOperatingHoursPanel
          data-walkthrough="cafe-hours-btn"
          class="shrink-0"
          @edit="isOperatingHoursOpen = true"
        />
      </header>

      <!-- Cafe name change: waiting for review, or not approved -->
      <section
        v-if="(renamePending || renameRejected) && nameChange"
        :role="renameRejected ? 'alert' : 'status'"
        aria-label="Cafe name change"
        class="-mt-3 flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-[#EEDFC4] rounded-[20px] shadow-sm px-5 py-4"
      >
        <div class="flex items-center gap-3.5 min-w-0 flex-1">
          <span class="w-10 h-10 shrink-0 rounded-xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center">
            <Icon :name="renameRejected ? 'heroicons:exclamation-circle' : 'heroicons:clock'" class="w-5 h-5" />
          </span>
          <div class="min-w-0">
            <p class="text-sm text-[#3D2B24]">
              <template v-if="renameRejected">Renaming to <strong class="font-bold">{{ nameChange.new_name }}</strong> was not approved</template>
              <template v-else>Renaming to <strong class="font-bold">{{ nameChange.new_name }}</strong> is waiting for review</template>
            </p>
            <p class="mt-0.5 text-[13px] text-[#9E7060]">
              <template v-if="renameRejected">{{ nameChange.reason || 'No reason was given.' }}</template>
              <template v-else>Your cafe stays {{ nameChange.old_name }} until an admin approves it.</template>
            </p>
          </div>
        </div>

        <button
          v-if="renameRejected"
          type="button"
          class="shrink-0 self-start sm:self-auto h-9 px-4 rounded-xl bg-[#7D5A50] text-sm font-semibold text-[#FFF8EA] hover:bg-[#684940] active:scale-[0.98] transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          @click="openRename"
        >
          {{ nameChange.can_resubmit ? 'Edit and resubmit' : 'Request a different name' }}
        </button>
        <button
          v-else
          type="button"
          :disabled="cancellingRename"
          class="shrink-0 self-start sm:self-auto h-9 px-4 rounded-xl border border-[#EEDFC4] bg-white text-sm font-semibold text-[#7D5A50] hover:bg-[#FAF4ED] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          @click="cancelRename"
        >
          Cancel request
        </button>
      </section>

      <!-- 4 Metric Summary Cards -->
      <div
        data-walkthrough="cafe-kpis"
        class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
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
          <p class="text-[11px] font-bold text-[#9E7060] uppercase tracking-wider">Pending Approval</p>
          <p class="text-3xl font-extrabold text-[#3D2B24]">{{ pendingBranchesCount }}</p>
          <p v-if="rejectedBranchesCount" class="text-[11px] font-semibold text-[#A4472E]">
            + {{ rejectedBranchesCount }} rejected
          </p>
        </div>
      </div>

      <!-- Main Container with Filter Bar and Branch List (wrapped with pagination so main's space-y gap doesn't split them) -->
      <div>
      <div :class="['bg-white border border-[#EEDFC4] shadow-sm flex flex-col', branches.length > 0 ? 'rounded-t-[20px] border-b-0' : 'rounded-[20px]']">
        <!-- Filter Bar -->
        <CafeManagementCafeFilterBar
          data-walkthrough="cafe-filter-bar"
          class="sticky top-0 z-20 bg-white rounded-t-[20px]"
          v-model:search="search"
          v-model:status="status"
          :selected-count="selectedBranches.length"
          :total-count="branches.length"
          :can-add-branch="canAddBranch"
          :bulk-loading="bulkLoading"
          :low-stock-threshold-percent="lowStockThresholdPercent"
          @toggle-select-all="toggleSelectAll"
          @bulk-action="bulkUpdateStatus"
          @cancel-selection="selectedBranches = []"
          @open-add-branch="openAddBranch"
          @open-low-stock="isLowStockModalOpen = true"
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
            <!-- Same header row as the admin Owner Management table; the arrow column has no label -->
            <div
              class="hidden lg:grid grid-cols-[auto_minmax(0,2.2fr)_minmax(0,2fr)_minmax(0,1.3fr)_8.5rem_auto] items-center gap-x-4 px-6 py-3.5 bg-[#FAF4ED] border-b border-[#EEDFC4] font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase"
            >
              <CommonBrandCheckbox
                :checked="selectableBranches.length > 0 && selectedBranches.length === selectableBranches.length"
                :indeterminate="selectedBranches.length > 0 && selectedBranches.length < selectableBranches.length"
                :disabled="selectableBranches.length === 0"
                @change="toggleSelectAll"
                aria-label="Select all branches on this page"
              />
              <span>Branch</span>
              <span>Address</span>
              <span>Manager</span>
              <span>Status</span>
              <span class="w-9" aria-hidden="true"></span>
            </div>

            <ul class="divide-y divide-[#F3E7D2]" data-walkthrough="cafe-branch-list">
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
      <!-- Pagination: the shared component -->
      <div v-if="branches.length > 0" class="sticky bottom-0 z-20 bg-white rounded-b-[20px] border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm">
        <Pagination
          :page="currentPage"
          :last-page="lastPage"
          :total="pageTotal"
          :from="pageFrom"
          :to="pageTo"
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

      <CafeManagementLowStockLimitModal
        :show="isLowStockModalOpen"
        :current-percent="lowStockThresholdPercent"
        :saving="savingLowStock"
        :error="lowStockError"
        @close="isLowStockModalOpen = false; lowStockError = ''"
        @save="handleSaveLowStockThreshold"
      />

      <CafeManagementRenameCafeModal
        :show="isRenameOpen"
        :current-name="cafeName"
        :branches="nameChangeBranches"
        :previous="nameChange"
        @close="isRenameOpen = false"
        @submitted="onRenameSubmitted"
      />

      <ConfirmModal
        :show="confirmDialog.show"
        :title="confirmDialog.title"
        :message="confirmDialog.message"
        :confirmText="confirmDialog.confirmText"
        :isDestructive="confirmDialog.isDestructive"
        @close="confirmDialog.show = false"
        @confirm="runConfirm"
      />
    </main>
  </div>
</template>
