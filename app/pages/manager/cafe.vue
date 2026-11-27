<!-- app/pages/manager/cafe.vue -->
<!-- Cafe Management (manager side): the assigned branch's details, same layout as the owner's Branch Details. -->
<script setup lang="ts">
import type { ManagedBranch } from '~/services/ServingService'
import type { BranchDetail } from '~/services/OwnerProfileService'

definePageMeta({
  role: 'Manager',
})

const links = MANAGER_NAV_LINKS

const route = useRoute()
const router = useRouter()
const service = useServingService('manager')

const branches = ref<ManagedBranch[]>([])
const branchUuid = ref('') // a manager runs exactly one branch

const branch = ref<BranchDetail | null>(null)
const loading = ref(true)
const errorMessage = ref('')

type BranchTab = 'details' | 'employees'
// Same tabs as the owner's branch page (no Floor Plans: managers build theirs on the Floor Plan page).
const branchTabs: { value: BranchTab; label: string; icon: string; walkthrough?: string }[] = [
  { value: 'details', label: 'Branch Details', icon: 'heroicons:building-storefront-solid' },
  { value: 'employees', label: 'Employees', icon: 'heroicons:users-solid', walkthrough: 'cafe-employees-tab' },
]

const activeTab = ref<BranchTab>(route.query.tab === 'employees' ? 'employees' : 'details')

watch(() => route.query.tab, (newTab) => {
  activeTab.value = newTab === 'employees' ? 'employees' : 'details'
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
// Refresh button; if it fails, the last details stay up with a notice (as on the owner's page).
const refreshing = ref(false)
const refreshError = ref('')

async function fetchBranch() {
  if (!branchUuid.value) return
  const isRefresh = !!branch.value
  if (isRefresh) refreshing.value = true
  else loading.value = true
  errorMessage.value = ''
  refreshError.value = ''
  try {
    const res = await service.managedBranch(branchUuid.value)
    if (res.success && res.branch) {
      branch.value = res.branch
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

async function init() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await service.managedBranches()
    branches.value = res.branches
    if (!res.branches.length) {
      errorMessage.value = 'You are not assigned to a branch yet.'
      loading.value = false
      return
    }
    branchUuid.value = res.branches[0]!.uuid
  } catch (e: any) {
    errorMessage.value = e?.data?.message || 'Could not load your branches.'
    loading.value = false
  }
}

function retry() {
  if (branches.value.length) fetchBranch()
  else init()
}

watch(branchUuid, fetchBranch)

onMounted(init)
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7]">
    <NavBar :links="links" />
    <main class="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10 xl:px-12 font-display cafe-entrance">
      <div class="mx-auto max-w-[1360px]">
      <!-- Header, the same format as the owner's branch page -->
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <h1 class="font-display text-[30px] sm:text-[34px] md:text-[38px] font-bold leading-tight tracking-[-0.02em] text-[#3B1F0E] break-words">
            Cafe Management
          </h1>
          <p class="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#8B6656]">
            <Icon name="heroicons:building-storefront" class="h-3.5 w-3.5 shrink-0 text-[#B4846C]" />
            <span>Branch details, BIR documents, registers and employees<template v-if="branch"> for {{ branch.branch_name }}</template>.</span>
          </p>
        </div>

        <button
          type="button"
          class="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-xl border border-[#D8C7B5] bg-white px-4 text-[13px] font-bold text-[#3B1F0E] shadow-sm transition-colors hover:border-[#B4846C] hover:bg-[#FAF4ED] outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          :disabled="loading || refreshing"
          title="Refresh branch details"
          @click="retry"
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

      <!-- Same tabs as the owner's branch page: underline on the active tab, filled icons -->
      <nav
        role="tablist"
        aria-label="Branch sections"
        class="branch-tabs -mx-4 mt-5 flex gap-1 overflow-x-auto overflow-y-hidden px-4 shadow-[inset_0_-1px_0_#E9D7BF] sm:mx-0 sm:px-0"
      >
        <button
          v-for="t in branchTabs"
          :key="t.value"
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
          <button class="ml-auto text-sm font-bold underline hover:text-red-900" @click="retry">Retry</button>
        </div>

        <!-- Loaded Content with Staggered Card Entrance -->
        <div v-else-if="branch" key="content" class="fade-reveal">
          <Transition name="fade-tab" mode="out-in">
            <!-- Branch Details Tab -->
            <div v-if="activeTab === 'details'" key="details" class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              <!-- Low stock alert limit: cafe-wide, so it sits above both branch cards (owners change it) -->
              <div class="cafe-card cafe-card-1 lg:col-span-2 rounded-2xl bg-white border border-[#EDD8CC] shadow-sm px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Icon name="heroicons:bell-alert" class="size-5" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-[#3D2B24]">Low Stock Alert Limit</p>
                    <p class="text-xs text-[#9E7060]">Shared across all branches and set by the owner. You're alerted when an item's servings drop to this level.</p>
                  </div>
                </div>
                <span class="inline-flex items-center rounded-xl bg-white border border-[#E3CFB4] px-3 py-1.5 text-sm font-extrabold text-[#3D2B24] tabular-nums">
                  {{ branch.low_stock_threshold_percent ? `${branch.low_stock_threshold_percent}%` : 'Not set' }}
                </span>
              </div>

              <!-- Branch Information -->
              <section data-walkthrough="cafe-details-card" class="cafe-card cafe-card-1 bg-white border border-[#EDD8CC] rounded-2xl p-6 shadow-sm flex flex-col gap-5">
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
                  </div>
                </div>

                <div class="flex items-start gap-4">
                  <img
                    v-if="branch.cafe_picture_url"
                    :src="branch.cafe_picture_url"
                    :alt="branch.branch_name || 'Branch photo'"
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
                      <p class="text-xs font-bold text-[#9E7060] uppercase tracking-wider">{{ isMain ? 'Main Address' : 'Address' }}</p>
                      <p class="text-sm sm:text-base font-medium text-[#3D2B24] break-words">{{ branch.address || '—' }}</p>
                    </div>
                  </div>
                </div>

                <hr class="border-t border-[#EDD8CC]" />

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
              </section>

              <!-- BIR Document (file download stays owner/admin only) -->
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
              <div class="cafe-card cafe-card-3 lg:col-span-2">
                <PosDevicesCard :branch-uuid="branch.uuid" :branch-name="branch.branch_name" scope="manager" />
              </div>
            </div>

            <!-- Employees Tab -->
            <div v-else key="employees" class="mt-4">
              <EmployeesDetails
                v-if="viewedEmployee"
                :branch-uuid="branch.uuid"
                :employee-uuid="viewedEmployee"
                scope="manager"
                @back="backToEmployees"
              />
              <EmployeesTab v-else :branch-uuid="branch.uuid" scope="manager" @view-employee="viewEmployee($event.uuid)" />
            </div>
          </Transition>
        </div>
      </Transition>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Tabs scroll sideways on phones without showing a scrollbar, as on the owner's page. */
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
