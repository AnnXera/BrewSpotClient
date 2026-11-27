<!--app/pages/admin/approvals.vue-->
<script setup lang="ts">
import SearchInput from '~/components/common/SearchInput.vue'
import Pagination from '~/components/common/Pagination.vue'
import type { ApprovalListItem, ApprovalStats, Paginated } from '~/services/OwnerManagementService'
import type { CafeUpdateRequest } from '~/services/CafeUpdateService'

definePageMeta({
  role: 'Admin',
})

const links = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'squares-2x2' },
  { label: 'Owner Management', to: '/admin/owners', icon: 'users' },
  { label: 'Approval Status', to: '/admin/approvals', icon: 'check-circle' },
  { label: 'Subscriptions', to: '/admin/subscriptions', icon: 'credit-card' },
  { label: 'Payment History', to: '/admin/payments', icon: 'clipboard' },
]

const ownerService = useOwnerManagementService()
const cafeUpdateService = useCafeUpdateService()
const route = useRoute()

// 'cafe_update': owner requests to change registered cafe details (the cafe name, or a branch address)
type RegistrationTab = 'owner' | 'branch' | 'cafe_update'
// 'pending' and 'resubmitted' split what awaits review (the API's 'pending_approval')
type StatusTab = 'general' | 'pending' | 'resubmitted' | 'approved' | 'rejected'

const registrationTab = ref<RegistrationTab>('owner')
const statusTab = ref<StatusTab>('general')
const search = ref('')

const statsByType = ref<Record<RegistrationTab, ApprovalStats | null>>({ owner: null, branch: null, cafe_update: null })
const stats = computed(() => statsByType.value[registrationTab.value])
const approvals = ref<ApprovalListItem[]>([])
const cafeUpdates = ref<CafeUpdateRequest[]>([])
const loading = ref(false)
const refreshing = ref(false)
const loaded = ref(false)

useScrollReveal(loaded)

const isCafeUpdateTab = computed(() => registrationTab.value === 'cafe_update')
const rowCount = computed(() => (isCafeUpdateTab.value ? cafeUpdates.value.length : approvals.value.length))

const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)
const perPage = 15

// Fetch both types so the registration tabs can show their pending counts
async function fetchStats() {
  const types: Array<'owner' | 'branch'> = ['owner', 'branch']
  await Promise.all([
    ...types.map(async (type) => {
      try {
        const res = await ownerService.approvalStats(type)
        if (res.success) statsByType.value[type] = res.stats
      } catch {
        // badges just show placeholders if this fails
      }
    }),
    (async () => {
      try {
        const res = await cafeUpdateService.stats()
        if (res.success) statsByType.value.cafe_update = res.stats
      } catch {
        // same
      }
    })(),
  ])
}

async function fetchCafeUpdates(silent = false) {
  if (!silent) loading.value = true
  try {
    const res = await cafeUpdateService.list({
      per_page: perPage,
      page: currentPage.value,
      status: statusTab.value === 'general' ? undefined : statusTab.value,
      search: search.value || undefined,
    })
    if (res.success) {
      cafeUpdates.value = res.requests.data
      currentPage.value = res.requests.current_page
      lastPage.value = res.requests.last_page
      total.value = res.requests.total
    }
  } catch {
    cafeUpdates.value = []
  } finally {
    loading.value = false
    loaded.value = true
  }
}

async function fetchApprovals(silent = false) {
  if (registrationTab.value === 'cafe_update') return fetchCafeUpdates(silent)
  if (!silent) loading.value = true
  try {
    const res = await ownerService.approvals({
      per_page: perPage,
      page: currentPage.value,
      type: registrationTab.value as 'owner' | 'branch',
      status: statusTab.value === 'general' ? undefined : statusTab.value,
      search: search.value || undefined,
    })

    if (res.success) {
      approvals.value = res.approvals.data
      currentPage.value = res.approvals.current_page
      lastPage.value = res.approvals.last_page
      total.value = res.approvals.total
    }
  } catch {
    approvals.value = []
  } finally {
    loading.value = false
    loaded.value = true
  }
}

async function refreshData() {
  refreshing.value = true
  await Promise.all([fetchStats(), fetchApprovals()])
  refreshing.value = false
}

function switchRegistrationTab(tab: RegistrationTab) {
  if (tab === registrationTab.value) return
  registrationTab.value = tab
  statusTab.value = 'general'
  search.value = ''
  currentPage.value = 1
  fetchApprovals()
}

function switchStatusTab(tab: StatusTab) {
  if (tab === statusTab.value) return
  statusTab.value = tab
  currentPage.value = 1
  fetchApprovals()
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchApprovals()
  }, 400)
})

function goToPage(page: number) {
  if (page < 1 || page > lastPage.value || page === currentPage.value) return
  currentPage.value = page
  fetchApprovals()
}

// Detail modal
const modalOpen = ref(false)
const modalLoading = ref(false)
const modalApproval = ref<ApprovalListItem | null>(null)
const modalOwnerDetails = ref<any>(null)

async function openDetails(approval: ApprovalListItem) {
  modalApproval.value = approval
  modalOwnerDetails.value = null
  modalOpen.value = true

  modalLoading.value = true
  try {
    const res = await ownerService.approvalSnapshot(approval.uuid)
    if (res.success) modalOwnerDetails.value = res
  } catch (e) {
    console.error('Failed to load approval snapshot', e)
  } finally {
    modalLoading.value = false
  }
}

function closeModal() {
  decisionError.value = ''
  modalOpen.value = false
  modalApproval.value = null
  modalOwnerDetails.value = null
  cafeUpdateOpen.value = false
  cafeUpdate.value = null
}

// Cafe update (name change) detail modal
const cafeUpdateOpen = ref(false)
const cafeUpdateLoading = ref(false)
const cafeUpdate = ref<CafeUpdateRequest | null>(null)

async function openCafeUpdate(uuid: string, preview?: CafeUpdateRequest) {
  cafeUpdate.value = preview ?? null
  cafeUpdateOpen.value = true
  cafeUpdateLoading.value = true
  try {
    // The detail adds each branch's current COR beside the new one
    const res = await cafeUpdateService.show(uuid)
    if (res.success) cafeUpdate.value = res.request
  } catch (e) {
    console.error('Failed to load cafe update', e)
    if (!preview) cafeUpdateOpen.value = false
  } finally {
    cafeUpdateLoading.value = false
  }
}

const decisionLoading = ref(false)
const decisionError = ref('')

// Owner application (main branch) or side-branch submission. Taken from the
// approval itself: an approval opened from a notification link may not match
// the tab that happens to be selected.
function kindOf(approval: Pick<ApprovalListItem, 'branch'> | null): RegistrationTab {
  const type = approval?.branch?.branch_type
  return type === 'side' ? 'branch' : type === 'main' ? 'owner' : registrationTab.value
}
const modalKind = computed<RegistrationTab>(() => kindOf(modalApproval.value))

// Which kind of request the open modal (and the shared reject dialog) is deciding
const decisionKind = computed<RegistrationTab>(() => (cafeUpdateOpen.value ? 'cafe_update' : modalKind.value))

async function handleDecision(status: 'approved' | 'rejected', reason?: string) {
  if (cafeUpdateOpen.value) return decideCafeUpdate(status, reason)
  if (!modalApproval.value) return
  decisionError.value = ''

  const isBranch = modalKind.value === 'branch'
  const targetUuid = isBranch ? modalApproval.value.branch?.uuid : modalApproval.value.user?.uuid
  if (!targetUuid) {
    decisionError.value = 'This approval is missing its owner or branch, so it cannot be reviewed. Refresh and try again.'
    return
  }

  decisionLoading.value = true
  try {
    const res = isBranch
      ? await ownerService.updateBranchStatus(targetUuid, status, reason, allowResubmit.value)
      : await ownerService.updateStatus(targetUuid, status, reason, allowResubmit.value)

    if (!res.success) {
      decisionError.value = res.message || 'The decision could not be saved. Please try again.'
      return
    }

    closeModal()
    rejectModalOpen.value = false
    rejectReason.value = ''
    allowResubmit.value = true
    fetchStats()
    fetchApprovals()
  } catch (e: any) {
    console.error('Failed to update status', e)
    decisionError.value = e?.data?.message || e?.response?._data?.message || 'The decision could not be saved. Please try again.'
  } finally {
    decisionLoading.value = false
  }
}

async function decideCafeUpdate(status: 'approved' | 'rejected', reason?: string) {
  if (!cafeUpdate.value) return
  decisionError.value = ''
  decisionLoading.value = true
  try {
    const res = await cafeUpdateService.review(cafeUpdate.value.uuid, status, reason, allowResubmit.value)
    if (!res.success) {
      decisionError.value = res.message || 'The decision could not be saved. Please try again.'
      return
    }
    closeModal()
    rejectModalOpen.value = false
    rejectReason.value = ''
    allowResubmit.value = true
    fetchStats()
    fetchApprovals()
  } catch (e: any) {
    decisionError.value = e?.data?.message || 'The decision could not be saved. Please try again.'
  } finally {
    decisionLoading.value = false
  }
}

// Reject modal
const rejectModalOpen = ref(false)
const rejectReason = ref('')
// Owner applications and branches: unchecked makes the rejection final
const allowResubmit = ref(true)

function openRejectModal() {
  rejectReason.value = ''
  allowResubmit.value = true
  rejectModalOpen.value = true
}

function closeRejectModal() {
  decisionError.value = ''
  rejectModalOpen.value = false
  rejectReason.value = ''
  allowResubmit.value = true
}

async function confirmReject() {
  await handleDecision('rejected', rejectReason.value)
}

useAutoRefresh(() => Promise.all([fetchStats(), fetchApprovals(true)]))

// Opens the approval named in ?uuid= (links from emails and the notification bell)
async function openFromQuery(uuid: string) {
  const target = approvals.value.find((a) => a.uuid === uuid)
  if (target) {
    openDetails(target)
    return
  }
  try {
    const res = await ownerService.approvalSnapshot(uuid)
    if (res.success) {
      // A branch submission link opens on the Branch tab, so the list and the
      // modal both match the approval.
      const kind = kindOf({ branch: res.branch } as any)
      if (kind !== registrationTab.value) switchRegistrationTab(kind)

      modalApproval.value = {
        uuid,
        status: res.approval?.status ?? 'pending_approval',
        display_status: res.approval?.display_status,
        reason: res.approval?.reason ?? null,
        reviewed_at: res.approval?.reviewed_at ?? null,
        user: res.owner,
        cafe: res.cafe,
        branch: res.branch,
      } as any
      modalOwnerDetails.value = res
      modalOpen.value = true
    }
  } catch (err) {
    console.warn('Could not auto-open approval from query param:', err)
  }
}

// ?type=cafe_update&request=<uuid> (the admin notification for a name change)
async function openCafeUpdateFromQuery(uuid: string) {
  if (!isCafeUpdateTab.value) switchRegistrationTab('cafe_update')
  await openCafeUpdate(uuid)
}

onMounted(async () => {
  if (route.query.type === 'cafe_update') registrationTab.value = 'cafe_update'
  fetchStats()
  await fetchApprovals()

  if (route.query.uuid) await openFromQuery(route.query.uuid as string)
  else if (route.query.request) await openCafeUpdateFromQuery(route.query.request as string)
})

watch(() => route.query.request, async (uuid) => {
  if (!uuid) return
  await openCafeUpdateFromQuery(uuid as string)
  fetchStats()
})

// A notification clicked while already on this page only changes the query, so the page doesn't remount.
watch(() => route.query.uuid, async (uuid) => {
  if (!uuid) return
  await Promise.all([fetchStats(), fetchApprovals(true)])
  await openFromQuery(uuid as string)
})
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7]">
    <NavBar :links="links" />

    <main class="flex-1 min-w-0 overflow-x-hidden p-3.5 min-[360px]:p-4 sm:p-6 md:p-10 max-w-[1400px]">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 class="font-display text-2xl font-black text-[#3D2B24] tracking-tight min-[360px]:text-3xl sm:text-[32px] sm:leading-tight">
            Approval Status
          </h1>
          <p class="font-sans text-xs sm:text-sm text-[#9E7060] mt-1">
            Review and manage owner applications by approval status.
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

      <!-- Registration Category Tabs -->
      <div class="scroll-reveal overflow-x-auto scrollbar-none flex items-center gap-1 sm:gap-2 mb-6 border-b border-[#EEDFC4]">
        <button
          type="button"
          class="flex items-center gap-2 px-4 py-2.5 font-display text-sm sm:text-base transition-colors relative z-10 active:scale-[0.98] duration-140 cursor-pointer shrink-0"
          :class="registrationTab === 'owner' ? 'text-[#3D2B24] font-bold' : 'text-[#9E7060] font-medium hover:text-[#3D2B24]'"
          @click="switchRegistrationTab('owner')"
        >
          <span>Owner Registration</span>
          <span
            v-if="statsByType.owner?.pending_approval"
            class="rounded-full px-2 py-0.5 text-[11px] font-bold font-sans"
            :class="registrationTab === 'owner' ? 'bg-[#7D5A50] text-[#FDF3E7]' : 'bg-[#FAF4ED] text-[#7D5A50] border border-[#EEDFC4]'"
            :title="`${statsByType.owner.pending_approval} pending`"
          >{{ statsByType.owner.pending_approval }}</span>
          <span v-if="registrationTab === 'owner'" class="absolute left-0 right-0 -bottom-px h-[2.5px] bg-[#3D2B24] rounded-full" />
        </button>

        <button
          type="button"
          class="flex items-center gap-2 px-4 py-2.5 font-display text-sm sm:text-base transition-colors relative z-10 active:scale-[0.98] duration-140 cursor-pointer shrink-0"
          :class="registrationTab === 'branch' ? 'text-[#3D2B24] font-bold' : 'text-[#9E7060] font-medium hover:text-[#3D2B24]'"
          @click="switchRegistrationTab('branch')"
        >
          <span>Branch Registration</span>
          <span
            v-if="statsByType.branch?.pending_approval"
            class="rounded-full px-2 py-0.5 text-[11px] font-bold font-sans"
            :class="registrationTab === 'branch' ? 'bg-[#7D5A50] text-[#FDF3E7]' : 'bg-[#FAF4ED] text-[#7D5A50] border border-[#EEDFC4]'"
            :title="`${statsByType.branch.pending_approval} pending`"
          >{{ statsByType.branch.pending_approval }}</span>
          <span v-if="registrationTab === 'branch'" class="absolute left-0 right-0 -bottom-px h-[2.5px] bg-[#3D2B24] rounded-full" />
        </button>

        <button
          type="button"
          class="flex items-center gap-2 px-4 py-2.5 font-display text-sm sm:text-base transition-colors relative z-10 active:scale-[0.98] duration-140 cursor-pointer shrink-0"
          :class="registrationTab === 'cafe_update' ? 'text-[#3D2B24] font-bold' : 'text-[#9E7060] font-medium hover:text-[#3D2B24]'"
          @click="switchRegistrationTab('cafe_update')"
        >
          <span>Cafe Updates</span>
          <span
            v-if="statsByType.cafe_update?.pending_approval"
            class="rounded-full px-2 py-0.5 text-[11px] font-bold font-sans"
            :class="registrationTab === 'cafe_update' ? 'bg-[#7D5A50] text-[#FDF3E7]' : 'bg-[#FAF4ED] text-[#7D5A50] border border-[#EEDFC4]'"
            :title="`${statsByType.cafe_update.pending_approval} pending`"
          >{{ statsByType.cafe_update.pending_approval }}</span>
          <span v-if="registrationTab === 'cafe_update'" class="absolute left-0 right-0 -bottom-px h-[2.5px] bg-[#3D2B24] rounded-full" />
        </button>
      </div>

      <!-- Combined Search/Tabs + Table Card -->
      <div
        class="scroll-reveal bg-white border border-[#EEDFC4] rounded-[20px] shadow-sm overflow-hidden transition-[box-shadow,border-color,opacity] duration-200 ease-out"
        :class="{ 'opacity-60': refreshing }"
      >
        <!-- Search + Status Tabs Bar -->
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3.5 sm:p-5 border-b border-[#F3E7D2] bg-[#FCF8F3]/40">
          <!-- Search -->
          <div class="flex-1 min-w-0 w-full lg:max-w-xs">
            <SearchInput
              v-model="search"
              :placeholder="isCafeUpdateTab ? 'Search cafe or owner' : 'Search owner'"
              clearable
              class="w-full"
            />
          </div>

          <!-- General / Pending / Resubmitted / Approved / Rejected -->
          <div class="flex flex-wrap items-center gap-1 sm:gap-1.5 p-1 bg-[#FAF4ED] border border-[#EDD8CC] rounded-xl font-sans text-xs sm:text-sm font-medium">
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg active:scale-95 transition-[transform,background-color,color] duration-140 ease-out cursor-pointer"
              :class="statusTab === 'general' ? 'bg-[#7D5A50] text-[#FDF3E7] font-semibold shadow-xs' : 'text-[#7D5A50] hover:bg-white hover:text-[#3D2B24]'"
              @click="switchStatusTab('general')"
            >
              General
            </button>

            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg active:scale-95 transition-[transform,background-color,color] duration-140 ease-out cursor-pointer"
              :class="statusTab === 'pending' ? 'bg-[#7D5A50] text-[#FDF3E7] font-semibold shadow-xs' : 'text-[#7D5A50] hover:bg-white hover:text-[#3D2B24]'"
              @click="switchStatusTab('pending')"
            >
              <span>Pending</span>
              <span
                class="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
                :class="statusTab === 'pending' ? 'bg-white/20 text-[#FDF3E7]' : 'bg-white text-[#7D5A50] border border-[#EDD8CC]'"
              >{{ stats?.pending ?? stats?.pending_approval ?? 0 }}</span>
            </button>

            <!-- Owners correcting a rejected application or name change -->
            <button
              v-if="registrationTab === 'owner' || registrationTab === 'cafe_update'"
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg active:scale-95 transition-[transform,background-color,color] duration-140 ease-out cursor-pointer"
              :class="statusTab === 'resubmitted' ? 'bg-[#7D5A50] text-[#FDF3E7] font-semibold shadow-xs' : 'text-[#7D5A50] hover:bg-white hover:text-[#3D2B24]'"
              @click="switchStatusTab('resubmitted')"
            >
              <span>Resubmitted</span>
              <span
                class="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
                :class="statusTab === 'resubmitted' ? 'bg-white/20 text-[#FDF3E7]' : 'bg-white text-[#7D5A50] border border-[#EDD8CC]'"
              >{{ stats?.resubmitted ?? 0 }}</span>
            </button>

            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg active:scale-95 transition-[transform,background-color,color] duration-140 ease-out cursor-pointer"
              :class="statusTab === 'approved' ? 'bg-[#7D5A50] text-[#FDF3E7] font-semibold shadow-xs' : 'text-[#7D5A50] hover:bg-white hover:text-[#3D2B24]'"
              @click="switchStatusTab('approved')"
            >
              <span>Approved</span>
              <span
                class="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
                :class="statusTab === 'approved' ? 'bg-white/20 text-[#FDF3E7]' : 'bg-white text-[#7D5A50] border border-[#EDD8CC]'"
              >{{ stats?.approved ?? 0 }}</span>
            </button>

            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg active:scale-95 transition-[transform,background-color,color] duration-140 ease-out cursor-pointer"
              :class="statusTab === 'rejected' ? 'bg-[#7D5A50] text-[#FDF3E7] font-semibold shadow-xs' : 'text-[#7D5A50] hover:bg-white hover:text-[#3D2B24]'"
              @click="switchStatusTab('rejected')"
            >
              <span>Rejected</span>
              <span
                class="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
                :class="statusTab === 'rejected' ? 'bg-white/20 text-[#FDF3E7]' : 'bg-white text-[#7D5A50] border border-[#EDD8CC]'"
              >{{ stats?.rejected ?? 0 }}</span>
            </button>
          </div>

          <!-- Record count -->
          <span class="hidden xl:inline-block font-sans text-xs font-medium text-[#9E7060] whitespace-nowrap">
            Showing <strong class="text-[#3D2B24] font-bold">{{ total }}</strong> {{ total === 1 ? 'record' : 'records' }}
          </span>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <!-- Owner Registration columns -->
            <thead v-if="registrationTab === 'owner'">
              <tr class="bg-[#FAF4ED] border-b border-[#EEDFC4]">
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Owner</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Cafe</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Contacts</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Status</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Submitted At</th>
                <th class="w-12 px-4 py-3.5"><span class="sr-only">Open</span></th>
              </tr>
            </thead>

            <!-- Cafe Updates columns -->
            <thead v-else-if="isCafeUpdateTab">
              <tr class="bg-[#FAF4ED] border-b border-[#EEDFC4]">
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Change</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Owner</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">CORs</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Status</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Submitted At</th>
                <th class="w-12 px-4 py-3.5"><span class="sr-only">Open</span></th>
              </tr>
            </thead>

            <!-- Branch Registration columns -->
            <thead v-else>
              <tr class="bg-[#FAF4ED] border-b border-[#EEDFC4]">
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Cafe</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Owner</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Address</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Status</th>
                <th class="font-sans text-[11px] font-bold tracking-wider text-[#7D5A50] uppercase px-6 py-3.5">Submitted At</th>
                <th class="w-12 px-4 py-3.5"><span class="sr-only">Open</span></th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="px-6 py-16 text-center">
                  <div class="flex flex-col items-center justify-center gap-3">
                    <div class="w-8 h-8 rounded-full border-2 border-[#EEDFC4] border-t-[#B4846C] animate-spin" />
                    <span class="font-sans text-xs font-semibold text-[#9E7060]">Loading applications…</span>
                  </div>
                </td>
              </tr>
              <tr v-else-if="!rowCount">
                <td colspan="6" class="px-6 py-16 text-center">
                  <div class="max-w-xs mx-auto flex flex-col items-center justify-center text-center">
                    <div class="w-12 h-12 rounded-2xl bg-[#F7EFE6] border border-[#E8D9CB] flex items-center justify-center text-[#7D5A50] mb-3 shadow-xs">
                      <Icon name="heroicons:inbox" class="w-6 h-6" />
                    </div>
                    <h3 class="font-display font-bold text-base text-[#3D2B24]">No applications found</h3>
                    <p class="font-sans text-xs text-[#9E7060] mt-1 leading-relaxed">
                      {{ isCafeUpdateTab ? 'No cafe updates found for this filter.' : 'No applications found for this filter.' }}
                    </p>
                  </div>
                </td>
              </tr>

              <template v-else-if="isCafeUpdateTab">
                <tr
                  v-for="req in cafeUpdates"
                  :key="req.uuid"
                  class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FAF4ED]/60 transition-colors duration-150 ease-out cursor-pointer group font-sans outline-none focus-visible:bg-[#FAF4ED] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B4846C]/40"
                  tabindex="0"
                  :aria-label="`Open ${req.type === 'address_change' ? 'address change' : 'name change'} request from ${req.owner?.name || 'owner'}`"
                  @click="openCafeUpdate(req.uuid, req)"
                  @keydown.enter.prevent="openCafeUpdate(req.uuid, req)"
                  @keydown.space.prevent="openCafeUpdate(req.uuid, req)"
                >
                  <td class="px-6 py-4 max-w-[320px]">
                    <template v-if="req.type === 'address_change'">
                      <p class="font-sans text-[11px] font-semibold uppercase tracking-wide text-[#9E7060] truncate">
                        Address change · {{ req.branch?.branch_name || 'Deleted branch' }}
                      </p>
                      <p class="font-sans text-sm text-[#8B6656] truncate" :title="req.old_address || undefined">{{ req.old_address }}</p>
                      <p class="font-display text-[15px] font-bold text-[#3D2B24] truncate" :title="req.new_address || undefined">→ {{ req.new_address }}</p>
                    </template>
                    <template v-else>
                      <p class="font-sans text-[11px] font-semibold uppercase tracking-wide text-[#9E7060]">Name change</p>
                      <p class="font-sans text-sm text-[#8B6656] truncate">{{ req.old_name }}</p>
                      <p class="font-display text-[15px] font-bold text-[#3D2B24] truncate">→ {{ req.new_name }}</p>
                    </template>
                  </td>
                  <td class="px-6 py-4">
                    <p class="font-sans text-sm font-semibold text-[#3D2B24]">{{ req.owner?.name || '—' }}</p>
                    <p class="font-sans text-xs text-[#9E7060]">{{ req.owner?.email }}</p>
                  </td>
                  <td class="px-6 py-4 font-sans text-sm text-[#3D2B24]">
                    {{ req.documents.length }} {{ req.documents.length === 1 ? 'branch' : 'branches' }}
                  </td>
                  <td class="px-6 py-4"><StatusBadge :status="req.status" /></td>
                  <td class="px-6 py-4 font-sans text-sm text-[#5E4A42] whitespace-nowrap">
                    {{ req.submitted_at ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(req.submitted_at)) : '—' }}
                  </td>
                  <td class="w-12 px-4 py-4 text-right">
                    <Icon name="heroicons:chevron-right" class="w-5 h-5 text-[#C2A592] transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-[#7D5A50]" aria-hidden="true" />
                  </td>
                </tr>
              </template>

              <template v-else-if="registrationTab === 'owner'">
                <ApprovalTableRow
                  v-for="(approval, index) in approvals"
                  :key="approval.uuid"
                  :approval="approval"
                  :index="index"
                  @view="openDetails"
                />
              </template>

              <template v-else>
                <ApprovalBranchApprovalTableRow
                  v-for="(approval, index) in approvals"
                  :key="approval.uuid"
                  :approval="approval"
                  :index="index"
                  @view="openDetails"
                />
              </template>
            </tbody>
          </table>
        </div>

        <!-- Pagination: the shared component -->
        <nav v-if="rowCount > 0" aria-label="Table pages" class="border-t border-[#F3E7D2]">
          <Pagination :page="currentPage" :last-page="lastPage" @change="goToPage" />
        </nav>
      </div>
    </main>

    <ApprovalDetailsModal
      v-if="modalKind === 'owner'"
      :open="modalOpen"
      :loading="modalLoading"
      :approval="modalApproval"
      :owner-details="modalOwnerDetails"
      :registration-type="modalKind"
      :decision-loading="decisionLoading"
      @close="closeModal"
      @approve="handleDecision('approved')"
      @reject="openRejectModal"
    />

    <!-- NOTE: same auto-import naming rule — app/components/approval/BranchDetailsModal.vue
         resolves to <ApprovalBranchDetailsModal>, not <BranchDetailsModal>. -->
    <ApprovalBranchDetailsModal
      v-else
      :open="modalOpen"
      :loading="modalLoading"
      :approval="modalApproval"
      :owner-details="modalOwnerDetails"
      :decision-loading="decisionLoading"
      @close="closeModal"
      @approve="handleDecision('approved')"
      @reject="openRejectModal"
    />

    <ApprovalCafeUpdateDetailsModal
      :open="cafeUpdateOpen"
      :loading="cafeUpdateLoading && !cafeUpdate"
      :request="cafeUpdate"
      :decision-loading="decisionLoading"
      @close="closeModal"
      @approve="handleDecision('approved')"
      @reject="openRejectModal"
    />

    <!-- Approve failures (reject failures show inside the reason dialog) -->
    <Teleport to="body">
      <div
        v-if="decisionError && (modalOpen || cafeUpdateOpen) && !rejectModalOpen"
        class="fixed top-6 left-1/2 -translate-x-1/2 z-[70] max-w-md w-[calc(100%-2rem)] rounded-xl bg-white border border-[#F5C2C0] shadow-lg px-4 py-3 flex items-start gap-3"
        role="alert"
      >
        <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-[#D9534F] shrink-0 mt-0.5" />
        <p class="flex-1 font-sans text-sm text-[#3B1F0E]">{{ decisionError }}</p>
        <button type="button" class="text-[#3B1F0E]/50 hover:text-[#3B1F0E]" aria-label="Dismiss" @click="decisionError = ''">
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>
    </Teleport>

    <!-- Rejection reason prompt -->
    <Teleport to="body">
      <div
        v-if="rejectModalOpen"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-[#3B1F0E]/40 backdrop-blur-sm p-4"
        @click.self="closeRejectModal"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <h2 class="font-display text-lg font-semibold text-[#3B1F0E] mb-2">Reason for rejection</h2>
          <p class="font-sans text-sm text-[#3B1F0E]/70 mb-4">
            {{ decisionKind === 'cafe_update'
              ? 'The owner sees this reason in Cafe Management and in their notifications.'
              : 'This reason will be included in the email sent to the owner.' }}
          </p>

          <textarea
            v-model="rejectReason"
            rows="4"
            placeholder="e.g. Submitted documents are unclear or expired."
            class="w-full rounded-xl border border-[#EDD8CC] px-4 py-3 font-sans text-sm text-[#3B1F0E] placeholder:text-[#3B1F0E]/40 focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30 resize-none"
          />

          <label class="flex items-start gap-3 mt-4 cursor-pointer select-none">
            <input
              v-model="allowResubmit"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-[#EDD8CC] text-[#7D5A50] focus:ring-[#7D5A50]/30"
            />
            <span class="font-sans text-sm text-[#3B1F0E]">
              {{ decisionKind === 'cafe_update'
                ? `Let the owner request this ${cafeUpdate?.type === 'address_change' ? 'address' : 'name'} again`
                : decisionKind === 'branch' ? 'Let the owner edit and resubmit this branch' : 'Let the applicant edit and resubmit' }}
              <span class="block text-xs text-[#3B1F0E]/60 mt-0.5">
                <template v-if="decisionKind === 'cafe_update' && cafeUpdate?.type === 'address_change'">
                  {{ allowResubmit
                    ? 'They can fix the COR and send the same address back for review.'
                    : 'This address is final. They can still request a different one.' }}
                </template>
                <template v-else-if="decisionKind === 'cafe_update'">
                  {{ allowResubmit
                    ? 'They can fix the CORs and send the same name back for review.'
                    : 'This name is final. They can still request a different name.' }}
                </template>
                <template v-else-if="decisionKind === 'branch'">
                  {{ allowResubmit
                    ? 'They can fix the issue and send the same branch back for review.'
                    : 'Final rejection. The owner can only delete this branch.' }}
                </template>
                <template v-else>
                  {{ allowResubmit
                    ? 'They can fix the issue and send the same application back for review.'
                    : 'Final rejection. Use for ineligible or suspicious applications; they cannot reapply with this email.' }}
                </template>
              </span>
            </span>
          </label>

          <p v-if="decisionError" class="mt-4 rounded-lg bg-[#FDE8E8] px-3 py-2 font-sans text-sm text-[#B42318]" role="alert">
            {{ decisionError }}
          </p>

          <div class="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              class="rounded-lg px-4 py-2 font-sans text-sm font-medium text-[#3B1F0E]/70 hover:bg-[#F3E7D2] transition-colors"
              :disabled="decisionLoading"
              @click="closeRejectModal"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="!rejectReason.trim() || decisionLoading"
              class="rounded-lg px-4 py-2 font-sans text-sm font-semibold bg-[#D9534F] text-white hover:bg-[#C24541] transition-colors disabled:opacity-50"
              @click="confirmReject"
            >
              {{ decisionLoading ? 'Rejecting...' : 'Reject & Notify Owner' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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