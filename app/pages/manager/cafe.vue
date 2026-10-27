<!-- app/pages/manager/cafe.vue -->
<!-- Cafe Management (manager side): the assigned branch's details, same layout as the owner's Branch Details. -->
<script setup lang="ts">
import type { ManagedBranch } from '~/services/ServingService'
import type { BranchDetail } from '~/services/OwnerProfileService'

definePageMeta({
  role: 'Manager',
})

const links = [
  { label: 'Dashboard', to: '/manager/dashboard', icon: 'squares-2x2' },
  { label: 'Cafe Management', to: '/manager/cafe', icon: 'building-storefront' },
  { label: 'Servings', to: '/manager/servings', icon: 'cake' },
  { label: 'Reservations', to: '/manager/reservations', icon: 'calendar-days' },
  { label: 'Floor Plan', to: '/manager/floor-plan', icon: 'map' },
]

const route = useRoute()
const router = useRouter()
const service = useServingService('manager')

const branches = ref<ManagedBranch[]>([])
const branchUuid = ref('') // a manager runs exactly one branch

const branch = ref<BranchDetail | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const activeTab = ref<'details' | 'employees'>(
  route.query.tab === 'employees' ? 'employees' : 'details'
)

watch(() => route.query.tab, (newTab) => {
  if (newTab === 'details' || newTab === 'employees') {
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

function selectTab(tab: 'details' | 'employees') {
  activeTab.value = tab
  if (viewedEmployee.value) {
    const { employee, ...restQuery } = route.query
    router.replace({ query: { ...restQuery, tab } })
  }
}

const isMain = computed(() => (branch.value?.branch_type || '').toLowerCase() === 'main')

const pageTitle = computed(() => {
  if (!branch.value) return 'Cafe Management'
  const { cafe_name, branch_name } = branch.value
  if (cafe_name && branch_name && !branch_name.toLowerCase().startsWith(cafe_name.toLowerCase())) {
    return `${cafe_name} - ${branch_name}`
  }
  return branch_name || cafe_name || 'Cafe Management'
})

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

async function fetchBranch() {
  if (!branchUuid.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await service.managedBranch(branchUuid.value)
    if (res.success && res.branch) {
      branch.value = res.branch
    } else {
      errorMessage.value = res.message || 'Branch not found.'
    }
  } catch (e: any) {
    errorMessage.value = e?.data?.message || 'Failed to load branch details.'
  } finally {
    loading.value = false
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
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FFF8EA]">
    <NavBar :links="links" />
    <main class="flex-1 p-6 sm:p-8 lg:p-12 font-display">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-medium text-[#9E7060]">Cafe Management</p>
          <h1 class="mt-1 text-2xl sm:text-[32px] font-bold text-[#3D2B24] break-words">{{ pageTitle }}</h1>
        </div>
      </div>

      <!-- Tabs -->
      <div class="relative flex items-center mt-4">
        <button
          type="button"
          class="font-display transition-colors relative z-10
                 min-[360px]:px-5 min-[360px]:py-3.5 min-[360px]:text-[14px]
                 md:px-5 md:py-3.5 md:text-[16px]"
          :class="activeTab === 'details'
            ? 'text-[#3B1F0E] font-bold'
            : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
          @click="selectTab('details')"
        >
          Branch Details
          <span
            v-if="activeTab === 'details'"
            class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full"
          />
        </button>

        <button
          type="button"
          class="font-display transition-colors relative z-10
                 min-[360px]:px-5 min-[360px]:py-3.5 min-[360px]:text-[14px]
                 md:px-5 md:py-3.5 md:text-[16px]"
          :class="activeTab === 'employees'
            ? 'text-[#3B1F0E] font-bold'
            : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
          @click="selectTab('employees')"
        >
          Employees
          <span
            v-if="activeTab === 'employees'"
            class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full"
          />
        </button>

        <!-- full-width baseline underneath both tabs -->
        <div class="absolute left-0 right-0 bottom-0 h-px bg-[#EEDFC4]" />
      </div>

      <div v-if="loading" class="flex justify-center items-center py-16">
        <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-[#7D5A50]" />
      </div>

      <div v-else-if="errorMessage" class="mt-4 bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 flex items-center gap-3">
        <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0" />
        <span class="text-sm font-medium">{{ errorMessage }}</span>
        <button class="ml-auto text-sm font-bold underline hover:text-red-900" @click="retry">Retry</button>
      </div>

      <template v-else-if="branch">
        <!-- Branch Details Tab -->
        <div v-if="activeTab === 'details'" class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <!-- Branch Information -->
          <section class="bg-white border border-[#EDD8CC] rounded-2xl p-6 flex flex-col gap-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-2xl font-bold text-[#3D2B24]">Branch Information</h2>
              <div class="flex items-center gap-1.5">
                <span class="bg-[#FFF0D1] border border-[#EDD8CC] rounded-lg px-2.5 py-1 text-xs font-bold text-[#7D5A50] uppercase">
                  {{ branch.branch_type }}
                </span>
                <StatusBadge :status="branch.status" />
              </div>
            </div>

            <div class="flex items-start gap-4">
              <img
                v-if="branch.cafe_picture_url"
                :src="branch.cafe_picture_url"
                :alt="pageTitle"
                class="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-xl object-cover shrink-0 border border-[#EDD8CC]"
              />
              <div v-else class="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-xl bg-[#F4ECE1] border border-[#EDD8CC] flex items-center justify-center shrink-0">
                <Icon name="heroicons:building-storefront" class="w-10 h-10 text-[#9E7060]" />
              </div>

              <div class="flex-1 min-w-0 flex flex-col gap-3">
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Branch Name</p>
                  <p class="text-[15px] font-medium text-[#3D2B24] break-words">{{ branch.branch_name }}</p>
                </div>
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">{{ isMain ? 'Main Address' : 'Address' }}</p>
                  <p class="text-base font-medium text-[#3D2B24] break-words">{{ branch.address || '—' }}</p>
                </div>
              </div>
            </div>

            <hr class="border-t border-[#EDD8CC]" />

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex flex-col gap-1 min-w-0">
                <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Email Address</p>
                <p class="text-base font-medium text-[#3D2B24] break-all">{{ branch.cafe_email || '—' }}</p>
              </div>
              <div class="flex flex-col gap-1 min-w-0">
                <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Phone Number</p>
                <p class="text-base font-medium text-[#3D2B24]">{{ branch.cafe_phonenumber || '—' }}</p>
              </div>
            </div>
          </section>

          <!-- BIR Document (file download stays owner/admin only) -->
          <section class="bg-white border border-[#EDD8CC] rounded-2xl p-6 flex flex-col gap-4">
            <h2 class="text-[22px] font-bold text-[#3D2B24]">BIR Document</h2>

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
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">TIN Number</p>
                  <p class="text-[15px] font-medium text-[#3D2B24] break-all">{{ birDocument.tin_number || '—' }}</p>
                </div>
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">VAT Type</p>
                  <p class="text-[15px] font-medium text-[#3D2B24]">{{ formatVat(birDocument.vat) }}</p>
                </div>
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Registered Date</p>
                  <p class="text-[15px] font-medium text-[#3D2B24]">{{ formatDate(birDocument.registered_at) }}</p>
                </div>
              </div>
            </div>

            <p v-else class="text-sm text-[#9E7060]">No BIR document uploaded for this branch.</p>
          </section>

          <!-- POS Registers (full width, under both cards) -->
          <PosDevicesCard class="lg:col-span-2" :branch-uuid="branch.uuid" scope="manager" />
        </div>

        <!-- Employees Tab: the list, or one employee's details. Managers can only add / edit cashiers and staff. -->
        <EmployeesDetails
          v-else-if="viewedEmployee"
          :branch-uuid="branch.uuid"
          :employee-uuid="viewedEmployee"
          scope="manager"
          @back="backToEmployees"
        />
        <EmployeesTab v-else :branch-uuid="branch.uuid" scope="manager" @view-employee="viewEmployee($event.uuid)" />
      </template>
    </main>
  </div>
</template>
