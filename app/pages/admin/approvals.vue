<!--app/pages/admin/approvals.vue-->
<script setup lang="ts">
import SearchInput from '~/components/common/SearchInput.vue'
import type { ApprovalListItem, ApprovalStats, Paginated } from '~/services/OwnerManagementService'

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
const route = useRoute()

type RegistrationTab = 'owner' | 'branch'
type StatusTab = 'general' | 'pending_approval' | 'approved' | 'rejected'

const registrationTab = ref<RegistrationTab>('owner')
const statusTab = ref<StatusTab>('general')
const search = ref('')

const statsByType = ref<Record<RegistrationTab, ApprovalStats | null>>({ owner: null, branch: null })
const stats = computed(() => statsByType.value[registrationTab.value])
const approvals = ref<ApprovalListItem[]>([])
const loading = ref(false)

const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)
const perPage = 15

// Fetch both types so the registration tabs can show their pending counts
async function fetchStats() {
  const types: RegistrationTab[] = ['owner', 'branch']
  await Promise.all(types.map(async (type) => {
    try {
      const res = await ownerService.approvalStats(type)
      if (res.success) statsByType.value[type] = res.stats
    } catch {
      // badges just show placeholders if this fails
    }
  }))
}

async function fetchApprovals(silent = false) {
  if (!silent) loading.value = true
  try {
    const res = await ownerService.approvals({
      per_page: perPage,
      page: currentPage.value,
      type: registrationTab.value,
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
  }
}

async function refreshData() {
  await Promise.all([fetchStats(), fetchApprovals()])
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

async function handleDecision(status: 'approved' | 'rejected', reason?: string) {
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
      ? await ownerService.updateBranchStatus(targetUuid, status, reason)
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

// Reject modal
const rejectModalOpen = ref(false)
const rejectReason = ref('')
// Owner applications only: unchecked makes the rejection final
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

onMounted(async () => {
  fetchStats()
  await fetchApprovals()

  if (route.query.uuid) await openFromQuery(route.query.uuid as string)
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

    <main class="flex-1 p-12">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="font-display text-[26px] leading-[39px] font-bold text-[#3D2B24]">Approval Status</h1>
          <p class="font-sans text-[14px] leading-[21px] text-[#9E7060] mt-[2px]">
            Review and manage owner applications by approval status.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 px-[16px] py-[8px] rounded-[8px] bg-white border border-[#EDD8CC] text-[#7D5A50] font-display font-medium text-[14px] hover:bg-[#FBF2E1] transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          :disabled="loading"
          @click="refreshData"
        >
          <Icon name="heroicons:arrow-path" class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          <span>Refresh</span>
        </button>
      </div>

      <!-- Owner Registration / Branch Registration -->
      <div class="relative flex items-center mb-6 border-b border-[#EEDFC4]">
        <button
          type="button"
          class="flex items-center gap-2 px-5 py-[10px] font-display text-[16px] transition-colors relative z-10"
          :class="registrationTab === 'owner' ? 'text-[#3B1F0E] font-bold' : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
          @click="switchRegistrationTab('owner')"
        >
          Owner Registration
          <span
            v-if="statsByType.owner?.pending_approval"
            class="rounded-full px-2 py-0.5 text-[11px] font-bold font-sans"
            :class="registrationTab === 'owner' ? 'bg-[#7D5A50] text-[#FDF3E7]' : 'bg-[#F0E3CE] text-[#8B6656]'"
            :title="`${statsByType.owner.pending_approval} pending`"
          >{{ statsByType.owner.pending_approval }}</span>
          <span v-if="registrationTab === 'owner'" class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full" />
        </button>

        <button
          type="button"
          class="flex items-center gap-2 px-5 py-[10px] font-display text-[16px] transition-colors relative z-10"
          :class="registrationTab === 'branch' ? 'text-[#3B1F0E] font-bold' : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
          @click="switchRegistrationTab('branch')"
        >
          Branch Registration
          <span
            v-if="statsByType.branch?.pending_approval"
            class="rounded-full px-2 py-0.5 text-[11px] font-bold font-sans"
            :class="registrationTab === 'branch' ? 'bg-[#7D5A50] text-[#FDF3E7]' : 'bg-[#F0E3CE] text-[#8B6656]'"
            :title="`${statsByType.branch.pending_approval} pending`"
          >{{ statsByType.branch.pending_approval }}</span>
          <span v-if="registrationTab === 'branch'" class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full" />
        </button>
      </div>

      <!-- Combined Search/Tabs + Table Card -->
      <div :class="['bg-white border border-[#EEDFC4] overflow-hidden', approvals.length > 0 ? 'rounded-t-2xl border-b-0' : 'rounded-2xl']">

        <!-- Search + Status Tabs Bar -->
        <div class="flex items-center gap-[24px] px-[20px] py-[18px] border-b border-[#F3E7D2]">
          <!-- Search -->
          <SearchInput v-model="search" placeholder="Search owner" class="flex-1 min-w-[220px]" />

          <!-- General / Pending / Approved / Rejected -->
          <div class="inline-flex items-center bg-white border border-[#EDD8CC] rounded-xl gap-1 p-[8px] font-display font-medium text-[16px]">
            <button
              type="button"
              class="px-[20px] py-[8px] rounded-[8px] transition-colors"
              :class="statusTab === 'general' ? 'bg-[#7D5A50] text-[#FDF3E7] font-semibold' : 'text-[#7D5A50] hover:bg-[#FBF2E1]'"
              @click="switchStatusTab('general')"
            >
              General
            </button>

            <button
              type="button"
              class="flex items-center gap-2 px-[20px] py-[8px] rounded-[8px] transition-colors"
              :class="statusTab === 'pending_approval' ? 'bg-[#7D5A50] text-[#FDF3E7] font-semibold' : 'text-[#7D5A50] hover:bg-[#FBF2E1]'"
              @click="switchStatusTab('pending_approval')"
            >
              Pending
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-bold"
                :class="statusTab === 'pending_approval' ? 'bg-[#FDF3E7]/20 text-[#FDF3E7]' : 'bg-[#F0E3CE] text-[#8B6656]'"
              >{{ stats?.pending_approval ?? 0 }}</span>
            </button>

            <button
              type="button"
              class="flex items-center gap-2 px-[20px] py-[8px] rounded-[8px] transition-colors"
              :class="statusTab === 'approved' ? 'bg-[#7D5A50] text-[#FDF3E7] font-semibold' : 'text-[#7D5A50] hover:bg-[#FBF2E1]'"
              @click="switchStatusTab('approved')"
            >
              Approved
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-bold"
                :class="statusTab === 'approved' ? 'bg-[#FDF3E7]/20 text-[#FDF3E7]' : 'bg-[#D4EDDA] text-[#28A745]'"
              >{{ stats?.approved ?? 0 }}</span>
            </button>

            <button
              type="button"
              class="flex items-center gap-2 px-[20px] py-[8px] rounded-[8px] transition-colors"
              :class="statusTab === 'rejected' ? 'bg-[#7D5A50] text-[#FDF3E7] font-semibold' : 'text-[#7D5A50] hover:bg-[#FBF2E1]'"
              @click="switchStatusTab('rejected')"
            >
              Rejected
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-bold"
                :class="statusTab === 'rejected' ? 'bg-[#FDF3E7]/20 text-[#FDF3E7]' : 'bg-[#FDE8E8] text-[#DC3545]'"
              >{{ stats?.rejected ?? 0 }}</span>
            </button>
          </div>

          <!-- Record count -->
          <span class="ml-auto font-sans text-sm text-[#9E7060] whitespace-nowrap">{{ total }} record{{ total === 1 ? '' : 's' }}</span>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <!-- Owner Registration columns -->
            <thead v-if="registrationTab === 'owner'">
              <tr class="bg-[#FBF2E1] border-b border-[#F3E7D2]">
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Owner</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Cafe</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Contacts</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Status</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Submitted At</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>

            <!-- Branch Registration columns -->
            <thead v-else>
              <tr class="bg-[#FBF2E1] border-b border-[#F3E7D2]">
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Cafe</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Owner</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Address</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Status</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Submitted At</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="px-6 py-10 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 text-[#3B1F0E]/50">
                    <Icon name="heroicons:arrow-path" class="w-5 h-5 animate-spin text-[#B4846C]" />
                    <span class="font-sans text-sm">Loading applications…</span>
                  </div>
                </td>
              </tr>
              <tr v-else-if="!approvals.length">
                <td colspan="6" class="px-6 py-10 text-center font-sans text-sm text-[#3B1F0E]/50">
                  No applications found.
                </td>
              </tr>

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
      </div>
      
      <!-- Pagination (Separate Frame) -->
      <div v-if="approvals.length > 0" class="bg-white rounded-b-2xl border border-[#EEDFC4] overflow-hidden flex flex-col shadow-sm">
        <CommonPagination :page="currentPage" :last-page="lastPage" @change="goToPage" />
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

    <!-- Approve failures (reject failures show inside the reason dialog) -->
    <Teleport to="body">
      <div
        v-if="decisionError && modalOpen && !rejectModalOpen"
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
            This reason will be included in the email sent to the owner.
          </p>

          <textarea
            v-model="rejectReason"
            rows="4"
            placeholder="e.g. Submitted documents are unclear or expired."
            class="w-full rounded-xl border border-[#EDD8CC] px-4 py-3 font-sans text-sm text-[#3B1F0E] placeholder:text-[#3B1F0E]/40 focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30 resize-none"
          />

          <label
            v-if="modalKind === 'owner'"
            class="flex items-start gap-3 mt-4 cursor-pointer select-none"
          >
            <input
              v-model="allowResubmit"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-[#EDD8CC] text-[#7D5A50] focus:ring-[#7D5A50]/30"
            />
            <span class="font-sans text-sm text-[#3B1F0E]">
              Let the applicant edit and resubmit
              <span class="block text-xs text-[#3B1F0E]/60 mt-0.5">
                {{ allowResubmit
                  ? 'They can fix the issue and send the same application back for review.'
                  : 'Final rejection. Use for ineligible or suspicious applications; they cannot reapply with this email.' }}
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