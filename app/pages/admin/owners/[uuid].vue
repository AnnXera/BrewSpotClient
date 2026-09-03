<!--app/pages/admin/owners/[uuid].vue -->
<script setup lang="ts">
import { useRoute } from 'vue-router'

definePageMeta({
  role: 'Admin',
})

const route = useRoute()
const uuid = route.params.uuid as string

const links = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'squares-2x2' },
  { label: 'Owner Management', to: '/admin/owners', icon: 'users' },
  { label: 'Approval Status', to: '/admin/approvals', icon: 'check-circle' },
  { label: 'Subscriptions', to: '/admin/subscriptions', icon: 'credit-card' },
  { label: 'Payment History', to: '/admin/payments', icon: 'clipboard' },
]

const ownerService = useOwnerManagementService()

const loading = ref(true)
const owner = ref<any>(null)
const ownerDocuments = ref<any[]>([])
const cafes = ref<any[]>([])
const subscription = ref<any>(null)
const paymentHistory = ref<any[]>([])

const activeTab = ref<'profile' | 'branches'>('profile')

async function fetchOwner() {
  loading.value = true
  try {
    const res = await ownerService.show(uuid)
    if (res.success) {
      owner.value = res.owner
      ownerDocuments.value = res.owner_documents ?? []
      cafes.value = res.cafes ?? []
      subscription.value = res.subscription
      paymentHistory.value = res.payment_history ?? []
    }
  } catch (e) {
    console.error('Failed to load owner', e)
  } finally {
    loading.value = false
  }
}

const primaryCafe = computed(() => cafes.value[0] ?? null)
const primaryBranch = computed(() => primaryCafe.value?.branches?.[0] ?? null)
const allBranches = computed(() =>
  cafes.value.flatMap((c) =>
    (c.branches ?? []).map((b: any) => ({
      ...b,
      cafe_name: c.cafe_name,
    }))
  )
)

const branchPage = ref(1)
const branchesPerPage = 5
const totalBranchPages = computed(() => Math.max(1, Math.ceil(allBranches.value.length / branchesPerPage)))
const paginatedBranches = computed(() => {
  const start = (branchPage.value - 1) * branchesPerPage
  return allBranches.value.slice(start, start + branchesPerPage)
})

const selectedBranch = ref<any | null>(null)
const branchModalOpen = ref(false)

function openBranchDetails(branch: any) {
  selectedBranch.value = branch
  branchModalOpen.value = true
}

function closeBranchDetails() {
  branchModalOpen.value = false
  selectedBranch.value = null
}

async function viewDocument(url: string) {
  const newTab = window.open('', '_blank')

  const config = useRuntimeConfig()
  const token = useCookie<string | null>('auth_token')
  const origin = config.public.apiBase.replace(/\/api\/?$/, '')

  try {
    const response = await fetch(`${origin}${url}`, {
      headers: {
        Authorization: `Bearer ${token.value}`,
        Accept: 'application/pdf, image/*',
      },
    })

    if (!response.ok) throw new Error(`Request failed: ${response.status}`)

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)

    if (newTab) {
      newTab.location.href = objectUrl
    } else {
      window.open(objectUrl, '_blank')
    }
  } catch (e) {
    newTab?.close()
    console.error('Failed to load document', e)
  }
}

// Suspend / reactivate — reuses the same status flow as the list page
const confirmDialog = ref<{ newStatus: 'active' | 'suspended' } | null>(null)
const statusChangeLoading = ref(false)

function requestStatusChange(newStatus: 'active' | 'suspended') {
  confirmDialog.value = { newStatus }
}

function cancelStatusChange() {
  confirmDialog.value = null
}

async function confirmStatusChange() {
  if (!confirmDialog.value) return
  const { newStatus } = confirmDialog.value
  confirmDialog.value = null
  statusChangeLoading.value = true

  try {
    const res = await ownerService.updateStatus(uuid, newStatus)
    if (res.success) {
      await fetchOwner() // refresh owner + cascaded branch statuses
    }
  } catch (e) {
    console.error('Failed to update owner status', e)
  } finally {
    statusChangeLoading.value = false
  }
}

onMounted(fetchOwner)
</script>

<template>
  <div class="flex flex-col min-h-screen bg-[#FDF3E7] md:flex-row">
    <NavBar :links="links" />

    <main class="flex-1 p-3.5 min-[360px]:p-4 sm:p-6 md:p-12">
      <div v-if="loading" class="font-sans text-sm text-[#3B1F0E]/50">Loading owner…</div>

      <template v-else-if="owner">
        <!-- Breadcrumb -->
        <div class="font-display text-[12px] min-[360px]:text-[13px] sm:text-[14px] mb-[6px]">
          <NuxtLink to="/admin/owners" class="text-[#9E7060] hover:underline">Owner Management</NuxtLink>
          <span class="text-[#9E7060] mx-1">/</span>
          <span class="text-[#3D2B24] font-semibold">Owner Details</span>
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between gap-3 
                    min-[360px]:mb-[8px]
                    md:mb-[6px]">
          <h1 class="font-display font-bold text-[#3D2B24] truncate
                     min-[360px]:text-[24px]
                     md:text-[32px]">
            {{ owner.firstname }} {{ owner.lastname }}
          </h1>

          <button
            v-if="owner.status === 'active'"
            type="button"
            class="px-2.5 py-1.5 rounded-lg font-display font-semibold bg-[#FDE8E8] text-[#DC3545] border border-[#DC3545] hover:opacity-80 transition-opacity disabled:opacity-50 shrink-0 flex items-center justify-center
                   min-[360px]:px-3 min-[360px]:py-2 min-[360px]:rounded-[8px] min-[360px]:text-[10px]
                   md:px-3 md:py-2 md:rounded-[12px] md:text-[14px]"
            :disabled="statusChangeLoading"
            @click="requestStatusChange('suspended')"
          >
            Suspend Account
          </button>
          <button
            v-else-if="owner.status === 'suspended'"
            type="button"
            class="px-2.5 py-1.5 rounded-lg font-display font-semibold bg-[#E3F3E7] text-[#1F8A4C] border border-[#1F8A4C] hover:bg-[#D3ECD8] transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center
                   min-[360px]:px-3 min-[360px]:py-2 min-[360px]:rounded-[8px] min-[360px]:text-[10px]
                   md:px-3 md:py-2 md:rounded-[12px] md:text-[14px]"
            :disabled="statusChangeLoading"
            @click="requestStatusChange('active')"
          >
            Reactivate Account
          </button>
        </div>

        <!-- Tabs -->
        <div class="relative flex items-center 
                    min-[360px]:mb-[16px]
                    md:mb-[24px]">
          <button
            type="button"
            class="font-display font-bold transition-colors relative z-10
                   min-[360px]:px-5 min-[360px]:py-3.5 min-[360px]:text-[14px]
                   md:px-5 md:py-3.5 md:text-[16px]"
            :class="activeTab === 'profile'
              ? 'text-[#3B1F0E] font-bold'
              : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
            @click="activeTab = 'profile'"
          >
            Profile
            <span
              v-if="activeTab === 'profile'"
              class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full"
            />
          </button>

          <button
            type="button"
            class="font-display transition-colors relative z-10
                   min-[360px]:px-5 min-[360px]:py-3.5 min-[360px]:text-[14px]
                   md:px-5 md:py-3.5 md:text-[16px]"
            :class="activeTab === 'branches'
              ? 'text-[#3B1F0E] font-bold'
              : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
            @click="activeTab = 'branches'"
          >
            Cafe Branches ({{ allBranches.length }})
            <span
              v-if="activeTab === 'branches'"
              class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full"
            />
          </button>

          <!-- full-width baseline underneath both tabs -->
          <div class="absolute left-0 right-0 bottom-0 h-px bg-[#EEDFC4]" />
        </div>

        <!-- PROFILE TAB -->
        <template v-if="activeTab === 'profile'">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 min-[360px]:gap-5 md:gap-6 mb-[20px] min-[360px]:mb-[24px]">
            <OwnerDetailAccountDetailsCard :owner="owner" :branch-count="allBranches.length" />
            <OwnerDetailCafeDetailsCard :cafe="primaryCafe" :branch="primaryBranch" />
            <OwnerDetailSubscriptionCard :subscription="subscription" />
          </div>

          <OwnerDetailDocumentsPanel
            :owner-documents="ownerDocuments"
            :cafe-documents="primaryCafe?.documents ?? []"
            @view="viewDocument"
          />

          <OwnerDetailPaymentHistoryTable :history="paymentHistory" />
        </template>

        <!-- BRANCHES TAB -->
        <template v-else>
          <div class="bg-white border border-[#EEDFC4] rounded-2xl md:rounded-3xl shadow-sm overflow-hidden">
            <div v-if="allBranches.length === 0" class="p-8 text-center font-sans text-sm text-[#9E7060]">
              No branches found for this owner.
            </div>

            <div v-else class="p-4 sm:p-6 space-y-4">
              <OwnerDetailBranchCard
                v-for="branch in paginatedBranches"
                :key="branch.uuid"
                :branch="branch"
                @view-details="openBranchDetails"
              />
            </div>

            <!-- Pagination Bar -->
            <CommonPagination
              :page="branchPage"
              :last-page="totalBranchPages"
              @change="(p) => (branchPage = p)"
            />
          </div>
        </template>
      </template>
    </main>
  </div>

  <OwnerDetailBranchDetailsModal
    :open="branchModalOpen"
    :branch="selectedBranch"
    :owner="owner"
    @close="closeBranchDetails"
  />

  <ConfirmDialog
    :open="!!confirmDialog"
    :title="confirmDialog?.newStatus === 'suspended' ? 'Suspend this owner?' : 'Reactivate this owner?'"
    :message="confirmDialog?.newStatus === 'suspended'
      ? 'This will suspend this owner, deactivate their branches, and cancel their active subscription. This action can be reversed later.'
      : 'This will reactivate this owner and restore their branches.'"
    :confirm-label="confirmDialog?.newStatus === 'suspended' ? 'Suspend' : 'Reactivate'"
    :danger="confirmDialog?.newStatus === 'suspended'"
    @confirm="confirmStatusChange"
    @cancel="cancelStatusChange"
  />
</template>