<!--app/pages/admin/approvals.vue-->
<script setup lang="ts">
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

type RegistrationTab = 'owner' | 'branch'
type StatusTab = 'general' | 'pending_approval' | 'approved' | 'rejected'

const registrationTab = ref<RegistrationTab>('owner')
const statusTab = ref<StatusTab>('general')
const search = ref('')

const stats = ref<ApprovalStats | null>(null)
const approvals = ref<ApprovalListItem[]>([])
const loading = ref(false)

const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)
const perPage = 15

async function fetchStats() {
  try {
    const res = await ownerService.approvalStats(registrationTab.value)
    if (res.success) stats.value = res.stats
  } catch {
    // badges just show placeholders if this fails
  }
}

async function fetchApprovals() {
  loading.value = true
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

function switchRegistrationTab(tab: RegistrationTab) {
  if (tab === registrationTab.value) return
  registrationTab.value = tab
  statusTab.value = 'general'
  search.value = ''
  currentPage.value = 1
  fetchStats()
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
  modalOpen.value = false
  modalApproval.value = null
  modalOwnerDetails.value = null
}

const decisionLoading = ref(false)

async function handleDecision(status: 'approved' | 'rejected', reason?: string) {
  if (!modalApproval.value) return
  decisionLoading.value = true

  try {
    if (registrationTab.value === 'owner') {
      const ownerUuid = modalApproval.value.user?.uuid
      if (!ownerUuid) return
      await ownerService.updateStatus(ownerUuid, status, reason)
    } else {
      const branchUuid = modalApproval.value.branch?.uuid
      if (!branchUuid) return
      await ownerService.updateBranchStatus(branchUuid, status, reason)
    }

    closeModal()
    await Promise.all([fetchStats(), fetchApprovals()])
  } catch (e) {
    console.error('Failed to update approval decision', e)
  } finally {
    decisionLoading.value = false
  }
}

// Rejection reason prompt — collected before calling handleDecision('rejected', reason)
const rejectReasonPrompt = ref(false)
const rejectReason = ref('')

function requestReject() {
  rejectReason.value = ''
  rejectReasonPrompt.value = true
}

function cancelReject() {
  rejectReasonPrompt.value = false
  rejectReason.value = ''
}

async function confirmReject() {
  rejectReasonPrompt.value = false
  await handleDecision('rejected', rejectReason.value)
}

onMounted(() => {
  fetchStats()
  fetchApprovals()
})
</script>

<template>
  <div class="flex min-h-screen bg-[#FDF3E7]">
    <NavBar :links="links" />

    <main class="flex-1 p-12">
      <header class="mb-6">
        <h1 class="font-display text-[26px] leading-[39px] font-bold text-[#3D2B24]">Approval Status</h1>
        <p class="font-sans text-[14px] leading-[21px] text-[#9E7060] mt-[2px]">
          Review and manage owner applications by approval status.
        </p>
      </header>

      <!-- Owner Registration / Branch Registration -->
      <div class="relative flex items-center mb-6 border-b border-[#EEDFC4]">
        <button
          type="button"
          class="px-5 py-[10px] font-display text-[16px] transition-colors relative z-10"
          :class="registrationTab === 'owner' ? 'text-[#3B1F0E] font-bold' : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
          @click="switchRegistrationTab('owner')"
        >
          Owner Registration
          <span v-if="registrationTab === 'owner'" class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full" />
        </button>

        <button
          type="button"
          class="px-5 py-[10px] font-display text-[16px] transition-colors relative z-10"
          :class="registrationTab === 'branch' ? 'text-[#3B1F0E] font-bold' : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
          @click="switchRegistrationTab('branch')"
        >
          Branch Registration
          <span v-if="registrationTab === 'branch'" class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full" />
        </button>
      </div>

      <!-- Search -->
      <div class="relative mb-6 max-w-sm">
        <Icon
          name="heroicons:magnifying-glass"
          class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E7060]"
        />
        <input
          v-model="search"
          type="text"
          placeholder="Search owner or cafe"
          class="w-full rounded-full border border-[#EEDFC4] bg-white pl-11 pr-4 py-3 font-sans text-sm text-[#3B1F0E] placeholder:text-[#9E7060] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30"
        />
      </div>

      <!-- General / Pending / Approved / Rejected -->
      <div class="inline-flex items-center gap-1 font-display font-medium text-[16px] bg-white border border-[#EDD8CC] rounded-[16px] p-[8px] mb-6">
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

      <!-- Table card -->
      <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden">
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
                <td colspan="6" class="px-6 py-10 text-center font-sans text-sm text-[#3B1F0E]/50">
                  Loading applications…
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

              <!-- NOTE: Nuxt auto-import name for app/components/approval/BranchApprovalTableRow.vue
                   is <ApprovalBranchApprovalTableRow> — the folder "approval" only dedupes
                   against a filename that STARTS with "Approval", not one that starts with
                   "Branch". Using <BranchApprovalTableRow> here silently fails to resolve. -->
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

        <CommonPagination :page="currentPage" :last-page="lastPage" @change="goToPage" />
      </div>
    </main>
  </div>

  <ApprovalDetailsModal
    v-if="registrationTab === 'owner'"
    :open="modalOpen"
    :loading="modalLoading"
    :approval="modalApproval"
    :owner-details="modalOwnerDetails"
    :registration-type="registrationTab"
    :decision-loading="decisionLoading"
    @close="closeModal"
    @approve="handleDecision('approved')"
    @reject="requestReject"
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
    @reject="requestReject"
  />

  <!-- Rejection reason prompt -->
  <Teleport to="body">
    <div
      v-if="rejectReasonPrompt"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-[#3B1F0E]/40 backdrop-blur-sm p-4"
      @click.self="cancelReject"
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

        <div class="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            class="rounded-lg px-4 py-2 font-sans text-sm font-medium text-[#3B1F0E]/70 hover:bg-[#F3E7D2] transition-colors"
            @click="cancelReject"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!rejectReason.trim()"
            class="rounded-lg px-4 py-2 font-sans text-sm font-semibold bg-[#D9534F] text-white hover:bg-[#C24541] transition-colors disabled:opacity-50"
            @click="confirmReject"
          >
            Reject &amp; Notify Owner
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>