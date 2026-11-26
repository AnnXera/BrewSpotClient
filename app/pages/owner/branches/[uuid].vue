<script setup lang="ts">
import type { BranchDetail, BranchReview } from '~/services/OwnerProfileService'
import type { AddressChangeOverview, CafeUpdateRequest } from '~/services/CafeUpdateService'
import { isOperationalBranchStatus } from '~/utils/branchStatus'

definePageMeta({
  role: 'Cafe Owner',
})

const links = OWNER_NAV_LINKS

const route = useRoute()
const router = useRouter()
const ownerService = useOwnerProfileService()

const branch = ref<BranchDetail | null>(null)
const review = ref<BranchReview | null>(null)
const loading = ref(true)
const errorMessage = ref('')
type BranchTab = 'details' | 'employees' | 'floor-plans'
const TABS: BranchTab[] = ['details', 'employees', 'floor-plans']
const isTab = (value: unknown): value is BranchTab => TABS.includes(value as BranchTab)

// Employees and Floor Plans only show for a branch that can be operated.
const branchTabs: { value: BranchTab; label: string; icon: string; walkthrough: string }[] = [
  { value: 'details', label: 'Branch Details', icon: 'heroicons:building-storefront-solid', walkthrough: 'branch-tab-details' },
  { value: 'employees', label: 'Employees', icon: 'heroicons:users-solid', walkthrough: 'cafe-employees-tab' },
  { value: 'floor-plans', label: 'Floor Plans', icon: 'heroicons:map-solid', walkthrough: 'branch-tab-floor-plans' },
]

const activeTab = ref<BranchTab>(isTab(route.query.tab) ? route.query.tab : 'details')

watch(() => route.query.tab, (newTab) => {
  if (isTab(newTab)) {
    activeTab.value = newTab
  }
})

// ?employee=<uuid> opens that employee's details inside the Employees tab,
// so the view survives a refresh and the browser Back button returns to the list.
const viewedEmployee = computed(() =>
  typeof route.query.employee === 'string' ? route.query.employee : null
)

function viewEmployee(uuid: string) {
  router.push({ query: { ...route.query, tab: 'employees', employee: uuid } })
}

function backToEmployees() {
  const { employee, ...restQuery } = route.query
  router.push({ query: { ...restQuery, tab: 'employees' } })
}

function selectTab(tab: BranchTab) {
  activeTab.value = tab
  // Keep the tab in the URL so a refresh stays on it.
  const { employee, ...restQuery } = route.query
  router.replace({ query: { ...restQuery, tab: tab === 'details' ? undefined : tab } })
}

const isMain = computed(() => (branch.value?.branch_type || '').toLowerCase() === 'main')

// Only approved branches can be operated. A pending or rejected branch shows its
// details and documents, but no employees, floor plans or registers.
const branchStatus = computed(() => (branch.value?.status || '').toLowerCase())
const isOperational = computed(() => !branch.value || isOperationalBranchStatus(branchStatus.value))
watch(isOperational, (ok) => {
  if (!ok && activeTab.value !== 'details') selectTab('details')
})

const pageTitle = computed(() => branch.value?.branch_name || 'Branch Details')

const breadcrumbs = computed(() => [
  { label: 'Cafe Management', to: '/owner/cafes' },
  { label: pageTitle.value },
])

const birDocument = computed(() =>
  branch.value?.documents?.find(doc => doc.doc_type === 'BIR') ?? null,
)

function formatDate(value: string | null | undefined, month: 'short' | 'long' = 'long') {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month, day: 'numeric', year: 'numeric' })
}

function formatVat(value: string | null | undefined) {
  if (value === 'vat-registered') return 'VAT'
  if (value === 'non-vat') return 'Non-VAT'
  return '—'
}

// The first load shows the spinner. A refresh keeps the page on screen and only spins the
// Refresh button, so the cards and the employee list don't vanish and reload; if it fails,
// the last details stay up with a notice instead of being replaced by an error.
const refreshing = ref(false)
const refreshError = ref('')

async function fetchBranch() {
  const isRefresh = !!branch.value && branch.value.uuid === route.params.uuid
  if (isRefresh) refreshing.value = true
  else loading.value = true
  errorMessage.value = ''
  refreshError.value = ''
  try {
    const res = await ownerService.getBranch(route.params.uuid as string)
    if (res.success && res.branch) {
      branch.value = res.branch
      review.value = res.review ?? null
      fetchAddressChange()
    } else if (isRefresh) {
      refreshError.value = res.message || 'The branch details could not be refreshed.'
    } else {
      errorMessage.value = res.message || 'Branch not found.'
    }
  } catch (e: any) {
    if (isRefresh) refreshError.value = e?.data?.message || 'The branch details could not be refreshed.'
    else errorMessage.value = e?.data?.message || 'Failed to load branch details.'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// Going from one branch's page to another reuses this page, so load the new branch.
watch(() => route.params.uuid, (next, prev) => {
  if (next && next !== prev) {
    branch.value = null
    review.value = null
    addressChange.value = null
    fetchBranch()
  }
})

const { openDocument } = useDocumentViewer()

// ── Edit contact details (email, phone, picture) ──
const showEditContact = ref(false)
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(msg: string) {
  toastMessage.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 4000)
}
onBeforeUnmount(() => clearTimeout(toastTimer))

// ── Branch under review / rejected ──
const isSide = computed(() => (branch.value?.branch_type || '').toLowerCase() === 'side')
const canResubmit = computed(() => isSide.value && branchStatus.value === 'rejected' && review.value?.status === 'rejected' && review.value.can_resubmit)
const canRemove = computed(() => isSide.value && (branchStatus.value === 'rejected' || branchStatus.value === 'pending_approval'))
const showResubmit = ref(false)
const confirmRemove = ref(false)
const removing = ref(false)
const removeError = ref('')

function onResubmitted(updated: BranchDetail | undefined) {
  showResubmit.value = false
  showToast('Branch resubmitted. An admin will review it again.')
  if (updated) branch.value = { ...branch.value!, ...updated }
  fetchBranch()
}

async function removeBranch() {
  if (!branch.value) return
  removing.value = true
  removeError.value = ''
  try {
    const res = await ownerService.deleteBranch(branch.value.uuid)
    if (res.success) {
      confirmRemove.value = false
      router.push('/owner/cafes')
    } else {
      removeError.value = res.message || 'The branch could not be removed.'
      confirmRemove.value = false
    }
  } catch (e: any) {
    removeError.value = e?.data?.message || 'The branch could not be removed. Please try again.'
    confirmRemove.value = false
  } finally {
    removing.value = false
  }
}

function onContactSaved(updated: Partial<BranchDetail> | undefined) {
  showEditContact.value = false
  if (branch.value && updated) {
    branch.value = {
      ...branch.value,
      cafe_email: updated.cafe_email ?? branch.value.cafe_email,
      cafe_phonenumber: updated.cafe_phonenumber ?? branch.value.cafe_phonenumber,
      cafe_picture_url: updated.cafe_picture_url ?? branch.value.cafe_picture_url,
    }
  }
  showToast('Branch details updated. Managers have been notified.')
}

// ── Address change ──
// The address is on the branch's BIR COR, so moving goes to an admin with the updated COR.
// The current address stays until it is approved.
const cafeUpdateService = useCafeUpdateService()
const addressChange = ref<AddressChangeOverview | null>(null)
const showAddressChange = ref(false)
const confirmCancelAddress = ref(false)
const cancellingAddress = ref(false)
const addressError = ref('')

const addressRequest = computed(() => addressChange.value?.request ?? null)
const addressPending = computed(() => addressRequest.value?.status === 'pending_approval' || addressRequest.value?.status === 'resubmitted')
const addressRejected = computed(() => addressRequest.value?.status === 'rejected')
// Blocked for another reason than its own pending request (e.g. a cafe rename under review)
const addressBlockedReason = computed(() => (addressPending.value ? null : addressChange.value?.blocked ?? null))

async function fetchAddressChange() {
  const uuid = branch.value?.uuid
  if (!uuid || !isOperationalBranchStatus(branchStatus.value)) {
    addressChange.value = null
    return
  }
  try {
    const res = await cafeUpdateService.addressOverview(uuid)
    if (branch.value?.uuid === uuid) addressChange.value = res
  } catch {
    // Not critical: the page works without it, and the server still blocks conflicting requests
  }
}

function onAddressSubmitted(request: CafeUpdateRequest) {
  showAddressChange.value = false
  if (addressChange.value) addressChange.value = { ...addressChange.value, request, blocked: null }
  showToast('Address change sent. An admin will review it.')
  fetchAddressChange()
}

async function cancelAddressChange() {
  const request = addressRequest.value
  if (!branch.value || !request) return
  cancellingAddress.value = true
  addressError.value = ''
  try {
    await cafeUpdateService.withdrawAddressChange(branch.value.uuid, request.uuid)
    confirmCancelAddress.value = false
    showToast('Address change cancelled.')
    await fetchAddressChange()
  } catch (e: any) {
    addressError.value = e?.data?.message || 'Could not cancel the address change.'
    confirmCancelAddress.value = false
  } finally {
    cancellingAddress.value = false
  }
}

onMounted(fetchBranch)
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7]">
    <NavBar :links="links" />
    <main class="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10 xl:px-12 font-display cafe-entrance">
      <div class="mx-auto max-w-[1360px]">
      <!-- Breadcrumbs, the same as Menu Management's -->
      <MenuBreadcrumbs :items="breadcrumbs" />

      <!-- Header, in the same format as the other pages -->
      <header class="mt-1.5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <h1 class="font-display text-[30px] sm:text-[34px] md:text-[38px] font-bold leading-tight tracking-[-0.02em] text-[#3B1F0E] break-words">
            {{ pageTitle }}
          </h1>
          <p class="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#8B6656]">
            <Icon name="heroicons:building-storefront" class="h-3.5 w-3.5 shrink-0 text-[#B4846C]" />
            <span>Branch details, BIR documents, registers, employees and floor plans.</span>
          </p>
        </div>

        <button
          type="button"
          class="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-xl border border-[#D8C7B5] bg-white px-4 text-[13px] font-bold text-[#3B1F0E] shadow-sm transition-colors hover:border-[#B4846C] hover:bg-[#FAF4ED] outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          :disabled="loading || refreshing"
          title="Refresh branch details"
          @click="fetchBranch"
        >
          <Icon name="heroicons:arrow-path" class="size-4 text-[#7D5A50]" :class="refreshing ? 'animate-spin' : ''" />
          <span>{{ refreshing ? 'Refreshing…' : 'Refresh' }}</span>
        </button>
      </header>

      <div v-if="refreshError" role="alert" class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">
        <Icon name="heroicons:exclamation-triangle" class="size-4 shrink-0 text-red-500" />
        <span class="flex-1">{{ refreshError }} Showing the last details that loaded.</span>
        <button type="button" class="font-bold underline underline-offset-2 hover:text-red-900" @click="fetchBranch">Try again</button>
      </div>

      <!-- Clean Navigation Tabs -->
      <!-- Same tabs as Analytics: underline on the active tab, filled icons -->
      <nav
        role="tablist"
        aria-label="Branch sections"
        class="branch-tabs -mx-4 mt-5 flex gap-1 overflow-x-auto overflow-y-hidden px-4 shadow-[inset_0_-1px_0_#E9D7BF] sm:mx-0 sm:px-0"
      >
        <template v-for="t in branchTabs" :key="t.value">
          <button
            v-if="t.value === 'details' || isOperational"
            type="button"
            role="tab"
            :aria-selected="activeTab === t.value"
            :data-walkthrough="t.walkthrough"
            class="relative inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7D5A50]"
            :class="activeTab === t.value ? 'border-[#3B1F0E] text-[#3B1F0E]' : 'border-transparent text-[#8B6656] hover:border-[#D8C7B5] hover:text-[#3B1F0E]'"
            @click="selectTab(t.value)"
          >
            <Icon :name="t.icon" class="h-[18px] w-[18px]" />
            {{ t.label }}
          </button>
        </template>
      </nav>

      <!-- Smooth Content Transition after Loading -->
      <Transition name="fade-content" mode="out-in">
        <!-- Loading Spinner -->
        <div v-if="loading" key="loading" class="flex flex-col items-center justify-center py-20 gap-3">
          <div class="relative flex items-center justify-center">
            <div class="size-9 rounded-full border-2 border-[#EDD8CC] border-t-[#7D5A50] animate-spin" />
          </div>
          <p class="text-xs font-medium text-[#8C6E63] animate-pulse">Loading cafe details...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="errorMessage" key="error" class="mt-4 bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0" />
          <span class="text-sm font-medium">{{ errorMessage }}</span>
          <button class="ml-auto text-sm font-bold underline hover:text-red-900" @click="fetchBranch">Retry</button>
        </div>

        <!-- Loaded Content with Staggered Card Entrance -->
        <div v-else-if="branch" key="content" class="fade-reveal">
          <div
            v-if="!isOperational"
            class="mt-4 rounded-xl border px-4 py-3 flex items-start gap-3"
            :class="branchStatus === 'rejected' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'"
            role="status"
          >
            <Icon
              :name="branchStatus === 'rejected' ? 'heroicons:no-symbol' : 'heroicons:clock'"
              class="w-5 h-5 shrink-0 mt-0.5"
              :class="branchStatus === 'rejected' ? 'text-red-600' : 'text-amber-600'"
            />
            <div class="text-sm flex-1 min-w-0">
              <p class="font-bold">
                <template v-if="branchStatus === 'rejected'">This branch was rejected</template>
                <template v-else-if="review?.resubmitted">This branch was resubmitted and is waiting for review</template>
                <template v-else>This branch is waiting for approval</template>
              </p>

              <template v-if="branchStatus === 'rejected'">
                <p class="mt-1.5 rounded-lg bg-white/70 border border-red-200 px-3 py-2">
                  <span class="font-semibold">Reason:</span> {{ review?.reason || 'No reason was given.' }}
                </p>
                <p class="mt-1.5 text-xs text-red-800">
                  <template v-if="review?.reviewed_at">Reviewed {{ formatDate(review.reviewed_at, 'short') }}. </template>
                  <template v-if="canResubmit">Fix what the admin pointed out and resubmit it, or delete the branch.</template>
                  <template v-else-if="isSide">This rejection is final, so the branch can't be resubmitted. You can delete it.</template>
                  <template v-else>Employees, registers, menu, servings, reservations and floor plans are unavailable for it.</template>
                </p>
              </template>
              <p v-else class="mt-0.5">
                <template v-if="review?.submitted_at">Submitted {{ formatDate(review.submitted_at, 'short') }}. </template>
                Employees, registers, menu, servings, reservations and floor plans unlock once an administrator approves this branch.
              </p>

              <div v-if="canResubmit || canRemove" class="mt-3 flex flex-wrap gap-2">
                <button
                  v-if="canResubmit"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#7D5A50] text-white text-xs font-bold hover:bg-[#6A4A41] transition-colors"
                  @click="showResubmit = true"
                >
                  <Icon name="heroicons:pencil-square" class="size-4" />
                  Edit and resubmit
                </button>
                <button
                  v-if="canRemove"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border bg-white text-xs font-bold transition-colors"
                  :class="branchStatus === 'rejected' ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-amber-300 text-amber-800 hover:bg-amber-50'"
                  @click="confirmRemove = true"
                >
                  <Icon :name="branchStatus === 'rejected' ? 'heroicons:trash' : 'heroicons:arrow-uturn-left'" class="size-4" />
                  {{ branchStatus === 'rejected' ? 'Delete branch' : 'Withdraw submission' }}
                </button>
              </div>
              <p v-if="removeError" role="alert" class="mt-2 text-xs font-semibold text-red-700">{{ removeError }}</p>
            </div>
          </div>

          <Transition name="fade-tab" mode="out-in">
            <!-- Branch Details Tab -->
            <div v-if="activeTab === 'details'" key="details" class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              <!-- Address change: waiting for review, or not approved (same banner as the cafe rename) -->
              <section
                v-if="(addressPending || addressRejected) && addressRequest"
                :role="addressRejected ? 'alert' : 'status'"
                aria-label="Branch address change"
                class="lg:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-[#EEDFC4] rounded-2xl shadow-sm px-5 py-4"
              >
                <div class="flex items-center gap-3.5 min-w-0 flex-1">
                  <span class="w-10 h-10 shrink-0 rounded-xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center">
                    <Icon :name="addressRejected ? 'heroicons:exclamation-circle' : 'heroicons:clock'" class="w-5 h-5" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-sm text-[#3D2B24] break-words">
                      <template v-if="addressRejected">Moving to <strong class="font-bold">{{ addressRequest.new_address }}</strong> was not approved</template>
                      <template v-else>Moving to <strong class="font-bold">{{ addressRequest.new_address }}</strong> is waiting for review</template>
                    </p>
                    <p class="mt-0.5 text-[13px] text-[#9E7060]">
                      <template v-if="addressRejected">{{ addressRequest.reason || 'No reason was given.' }}</template>
                      <template v-else>The branch keeps its current address until an admin approves it.</template>
                    </p>
                    <p v-if="addressError" role="alert" class="mt-1 text-xs font-semibold text-red-700">{{ addressError }}</p>
                  </div>
                </div>

                <button
                  v-if="addressRejected"
                  type="button"
                  :disabled="!!addressBlockedReason"
                  :title="addressBlockedReason || undefined"
                  class="shrink-0 self-start sm:self-auto h-9 px-4 rounded-xl bg-[#7D5A50] text-sm font-semibold text-[#FFF8EA] hover:bg-[#684940] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                  @click="showAddressChange = true"
                >
                  {{ addressRequest.can_resubmit ? 'Edit and resubmit' : 'Request a different address' }}
                </button>
                <button
                  v-else
                  type="button"
                  :disabled="cancellingAddress"
                  class="shrink-0 self-start sm:self-auto h-9 px-4 rounded-xl border border-[#EEDFC4] bg-white text-sm font-semibold text-[#7D5A50] hover:bg-[#FAF4ED] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                  @click="confirmCancelAddress = true"
                >
                  Cancel request
                </button>
              </section>

              <!-- Low stock alert limit: cafe-wide, so it sits above both branch cards -->
              <div class="cafe-card cafe-card-1 lg:col-span-2 rounded-2xl bg-white border border-[#EDD8CC] shadow-sm px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Icon name="heroicons:bell-alert" class="size-5" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-[#3D2B24]">Low Stock Alert Limit</p>
                    <p class="text-xs text-[#9E7060]">Shared across all branches. Managers and you are alerted when an item's servings drop to this level.</p>
                  </div>
                </div>
                <NuxtLink
                  :to="{ path: '/owner/cafes', query: { edit: 'stock-limit' } }"
                  title="Change the low stock alert limit"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#E3CFB4] hover:border-[#7D5A50] px-3 py-1.5 text-sm font-extrabold text-[#3D2B24] tabular-nums transition-colors"
                >
                  <span>{{ branch.low_stock_threshold_percent ? `${branch.low_stock_threshold_percent}%` : 'Not set' }}</span>
                  <Icon name="heroicons:pencil-square" class="size-4 text-[#7D5A50]" />
                </NuxtLink>
              </div>

              <!-- Branch Information -->
              <section class="cafe-card cafe-card-1 bg-white border border-[#EDD8CC] rounded-2xl p-6 shadow-sm flex flex-col gap-5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h2 class="text-lg sm:text-xl font-bold text-[#3D2B24] flex items-center gap-2">
                    <Icon name="heroicons:information-circle" class="size-6 text-[#A96746]" />
                    Branch Information
                  </h2>
                  <div class="flex items-center gap-1.5">
                    <!-- Same pill shape and size as the status badge beside it -->
                    <span class="inline-flex items-center rounded-full px-2 min-[360px]:px-2.5 py-0.5 min-[360px]:py-1 font-display font-semibold text-xs min-[360px]:text-[13px] sm:text-[14px] shrink-0 bg-[#FFF0D1] text-[#7D5A50]">
                      {{ isMain ? 'Main' : 'Side' }}
                    </span>
                    <StatusBadge :status="branch.status" />
                    <button
                      v-if="isOperational"
                      type="button"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#DED4CA] bg-white text-xs font-semibold text-[#5B463C] hover:border-[#7D5A50] hover:bg-[#F8EFE7] transition-colors"
                      @click="showEditContact = true"
                    >
                      <Icon name="heroicons:pencil-square" class="size-3.5 text-[#7D5A50]" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                <div class="flex items-start gap-4">
                  <img
                    v-if="branch.cafe_picture_url"
                    :src="branch.cafe_picture_url"
                    :alt="pageTitle"
                    class="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-2xl object-cover shrink-0 border border-[#EDD8CC] shadow-sm"
                  />
                  <div v-else class="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-2xl bg-[#F4ECE1] border border-[#EDD8CC] flex items-center justify-center shrink-0 shadow-sm">
                    <Icon name="heroicons:building-storefront" class="w-10 h-10 text-[#9E7060]" />
                  </div>

                  <div class="flex-1 min-w-0 flex flex-col gap-3">
                    <div class="flex flex-col gap-1">
                      <p class="text-xs font-bold text-[#9E7060] uppercase tracking-wider">Branch Name</p>
                      <p class="text-base font-semibold text-[#3D2B24] break-words">{{ branch.branch_name }}</p>
                    </div>
                    <div class="flex flex-col gap-1">
                      <div class="flex items-center justify-between gap-2">
                        <p class="text-xs font-bold text-[#9E7060] uppercase tracking-wider">{{ isMain ? 'Main Address' : 'Address' }}</p>
                        <!-- Moving needs an admin and the updated COR, so it's a request, not an edit -->
                        <button
                          v-if="addressChange && !addressPending && !addressRejected"
                          type="button"
                          :disabled="!!addressBlockedReason"
                          :title="addressBlockedReason || 'Request an address change'"
                          class="inline-flex items-center gap-1 text-xs font-semibold text-[#7D5A50] hover:text-[#3B1F0E] underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline transition-colors"
                          @click="showAddressChange = true"
                        >
                          <Icon name="heroicons:map-pin" class="size-3.5" />
                          Change
                        </button>
                      </div>
                      <p class="text-sm sm:text-base font-medium text-[#3D2B24] break-words">{{ branch.address || '—' }}</p>
                      <p v-if="addressBlockedReason && !addressRejected" class="text-xs text-[#9E7060]">{{ addressBlockedReason }}</p>
                    </div>
                  </div>
                </div>

                <hr class="border-t border-[#EDD8CC]" />

                <div class="flex flex-col gap-3">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1 min-w-0">
                      <p class="text-xs font-bold text-[#9E7060] uppercase tracking-wider">Email Address</p>
                      <p class="text-sm sm:text-base font-medium text-[#3D2B24] break-all">{{ branch.cafe_email || '—' }}</p>
                    </div>
                    <div class="flex flex-col gap-1 min-w-0">
                      <p class="text-xs font-bold text-[#9E7060] uppercase tracking-wider">Phone Number</p>
                      <p class="text-sm sm:text-base font-medium text-[#3D2B24]">{{ branch.cafe_phonenumber || '—' }}</p>
                    </div>
                  </div>
                </div>
              </section>

              <!-- BIR Document -->
              <section class="cafe-card cafe-card-2 bg-white border border-[#EDD8CC] rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <h2 class="text-lg sm:text-xl font-bold text-[#3D2B24] flex items-center gap-2">
                  <Icon name="heroicons:document-text" class="size-6 text-[#A96746]" />
                  BIR Document
                </h2>

                <div v-if="birDocument" class="flex flex-col gap-5">
                  <div class="border border-[#EDD8CC] rounded-xl p-4 flex items-center gap-3">
                    <div class="bg-[#FFF0D1] rounded-[10px] w-12 h-12 flex items-center justify-center shrink-0">
                      <img src="/images/file-text.svg" alt="" width="20" height="20" />
                    </div>
                    <div class="flex-1 min-w-0 flex flex-col gap-1">
                      <p class="text-sm font-semibold text-[#3D2B24] truncate">BIR Certificate</p>
                      <p class="text-xs text-[#9E7060]">Uploaded {{ formatDate(birDocument.uploaded_at, 'short') }}</p>
                    </div>
                    <button
                      type="button"
                      class="border border-[#EDD8CC] rounded-[10px] px-4 py-2 text-[13px] font-semibold text-[#7D5A50] hover:bg-[#FFF8EA] transition-colors shrink-0"
                      @click="openDocument(birDocument.download_url, 'BIR Certificate')"
                    >
                      View
                    </button>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1 min-w-0">
                      <p class="text-xs font-bold text-[#9E7060] uppercase tracking-wider">TIN Number</p>
                      <p class="text-sm sm:text-base font-medium text-[#3D2B24] break-all">{{ birDocument.tin_number || '—' }}</p>
                    </div>
                    <div class="flex flex-col gap-1">
                      <p class="text-xs font-bold text-[#9E7060] uppercase tracking-wider">VAT Type</p>
                      <p class="text-sm sm:text-base font-medium text-[#3D2B24]">{{ formatVat(birDocument.vat) }}</p>
                    </div>
                    <div class="flex flex-col gap-1">
                      <p class="text-xs font-bold text-[#9E7060] uppercase tracking-wider">Registered Date</p>
                      <p class="text-sm sm:text-base font-medium text-[#3D2B24]">{{ formatDate(birDocument.registered_at) }}</p>
                    </div>
                  </div>
                </div>

                <p v-else class="text-sm text-[#9E7060]">No BIR document uploaded for this branch.</p>
              </section>

              <!-- POS Registers (full width, under both cards) -->
              <div v-if="isOperational" class="cafe-card cafe-card-3 lg:col-span-2">
                <PosDevicesCard :branch-uuid="branch.uuid" scope="owner" />
              </div>
            </div>

            <!-- Floor Plans Tab: what the branch manager has built, view only -->
            <div v-else-if="activeTab === 'floor-plans'" key="floor-plans" class="mt-4">
              <FloorPlanViewer :branch-uuid="branch.uuid" />
            </div>

            <!-- Employees Tab: the list, or one employee's details -->
            <div v-else key="employees" class="mt-4">
              <EmployeesDetails
                v-if="viewedEmployee"
                :branch-uuid="branch.uuid"
                :employee-uuid="viewedEmployee"
                @back="backToEmployees"
              />
              <EmployeesTab v-else :branch-uuid="branch.uuid" @view-employee="viewEmployee($event.uuid)" />
            </div>
          </Transition>
        </div>
      </Transition>
      </div>
    </main>

    <CafeManagementResubmitBranchModal
      v-if="branch && canResubmit"
      :show="showResubmit"
      :branch="branch"
      :reason="review?.reason ?? null"
      @close="showResubmit = false"
      @resubmitted="onResubmitted"
    />

    <ConfirmDialog
      :open="confirmRemove"
      :title="branchStatus === 'rejected' ? 'Delete this branch?' : 'Withdraw this branch?'"
      :message="branchStatus === 'rejected'
        ? 'The rejected branch and its documents will be removed. Its application history is kept.'
        : 'The branch will be taken out of the admin review queue and removed. You can add it again later.'"
      :confirm-label="branchStatus === 'rejected' ? 'Delete' : 'Withdraw'"
      danger
      :loading="removing"
      @confirm="removeBranch"
      @cancel="confirmRemove = false"
    />

    <CafeManagementChangeBranchAddressModal
      v-if="branch"
      :show="showAddressChange"
      :branch-uuid="branch.uuid"
      :branch-name="branch.branch_name"
      :current-address="branch.address"
      :current-registered-at="addressChange?.current_registered_at"
      :previous="addressRequest"
      @close="showAddressChange = false"
      @submitted="onAddressSubmitted"
    />

    <ConfirmDialog
      :open="confirmCancelAddress"
      title="Cancel address change?"
      :message="`Cancel the request to move this branch to ${addressRequest?.new_address ?? 'the new address'}? You can send a new one any time.`"
      confirm-label="Cancel request"
      danger
      :loading="cancellingAddress"
      @confirm="cancelAddressChange"
      @cancel="confirmCancelAddress = false"
    />

    <CafeManagementEditBranchContactModal
      v-if="branch"
      :show="showEditContact"
      :branch="branch"
      @close="showEditContact = false"
      @saved="onContactSaved"
    />

    <Teleport to="body">
      <transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="toastMessage" role="status" aria-live="polite" class="fixed top-6 right-6 z-[3100] bg-[#7D5A50] text-[#FFF8EA] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-[#B4846C]">
          <Icon name="heroicons:check-circle" class="w-5 h-5 text-emerald-400 shrink-0" />
          <span class="text-sm font-bold">{{ toastMessage }}</span>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Tabs scroll sideways on phones without showing a scrollbar, like Analytics. */
.branch-tabs {
  scrollbar-width: none;
}
.branch-tabs::-webkit-scrollbar {
  display: none;
}

/* Page entrance */
.cafe-entrance {
  animation: cafePageEnter 260ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

@keyframes cafePageEnter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Smooth content transition after loading */
.fade-content-enter-active,
.fade-content-leave-active {
  transition: opacity 240ms cubic-bezier(0.23, 1, 0.32, 1), transform 240ms cubic-bezier(0.23, 1, 0.32, 1);
}

.fade-content-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-content-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Staggered card entrance on load */
.fade-reveal .cafe-card {
  opacity: 0;
  animation: cardGlideUp 280ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

.fade-reveal .cafe-card-1 {
  animation-delay: 0ms;
}

.fade-reveal .cafe-card-2 {
  animation-delay: 60ms;
}

.fade-reveal .cafe-card-3 {
  animation-delay: 120ms;
}

@keyframes cardGlideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Tab change transition */
.fade-tab-enter-active,
.fade-tab-leave-active {
  transition: opacity 180ms cubic-bezier(0.23, 1, 0.32, 1), transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
}

.fade-tab-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-tab-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  .cafe-entrance,
  .fade-reveal .cafe-card {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .fade-content-enter-active,
  .fade-content-leave-active,
  .fade-tab-enter-active,
  .fade-tab-leave-active {
    transition: opacity 120ms ease !important;
    transform: none !important;
  }
  .fade-content-enter-from,
  .fade-content-leave-to,
  .fade-tab-enter-from,
  .fade-tab-leave-to {
    transform: none !important;
  }
}
</style>
