<!-- app/components/employees/EmployeesTab.vue -->
<!-- Employees tab of a branch (owner side). View Positions / View Details emit events until those screens exist. -->
<script setup lang="ts">
import type { BranchStaffStats, EmploymentStatus, StaffMember, StaffRole } from '~/services/StaffService'

const props = defineProps<{
  branchUuid: string
}>()

const emit = defineEmits<{
  'view-employee': [member: StaffMember]
  'view-positions': []
}>()

const showAddModal = ref(false)
// Shown after a successful save; warnings are non-blocking (e.g. shift outside opening hours).
const notice = ref<{ message: string; warnings: string[] } | null>(null)

function onEmployeeSaved(result: { message: string; warnings: string[] }) {
  showAddModal.value = false
  notice.value = { message: result.message, warnings: result.warnings }
  refresh()
}

const staffService = useStaffService('owner')

const perPage = 10

const statusOptions: { value: EmploymentStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'terminated', label: 'Terminated' },
]

const positionOptions: { value: StaffRole | ''; label: string }[] = [
  { value: '', label: 'All positions' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Cashier', label: 'Cashier' },
  { value: 'Staff', label: 'Staff' },
]

const search = ref('')
const status = ref<EmploymentStatus | ''>('')
const position = ref<StaffRole | ''>('')

const members = ref<StaffMember[]>([])
const stats = ref<BranchStaffStats | null>(null)
const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)
const from = ref<number | null>(null)
const to = ref<number | null>(null)

const loading = ref(true)
const errorMessage = ref('')
// Set when the owner's plan doesn't include staff management (API 403 + required_feature).
const planLocked = ref(false)

const hasFilters = computed(() => !!(search.value.trim() || status.value || position.value))
const branchIsEmpty = computed(() => !loading.value && stats.value?.total === 0)

const inactiveHint = computed(() =>
  stats.value && stats.value.suspended > 0 ? `incl. ${stats.value.suspended} suspended` : null,
)

function handleError(e: any, fallback: string) {
  if (e?.status === 403 && e?.data?.required_feature) {
    planLocked.value = true
    return
  }
  errorMessage.value = e?.data?.message || fallback
}

async function fetchStats() {
  try {
    const res = await staffService.getBranchStaffStats(props.branchUuid)
    if (res.success) stats.value = res.stats
  } catch (e: any) {
    handleError(e, 'Failed to load employee counts.')
  }
}

async function fetchMembers() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await staffService.listBranchStaff(props.branchUuid, {
      search: search.value.trim(),
      status: status.value,
      role: position.value,
      page: currentPage.value,
      per_page: perPage,
    })
    if (res.success) {
      members.value = res.staff.data
      currentPage.value = res.staff.current_page
      lastPage.value = res.staff.last_page
      total.value = res.staff.total
      from.value = res.staff.from
      to.value = res.staff.to
    }
  } catch (e: any) {
    members.value = []
    handleError(e, 'Failed to load employees.')
  } finally {
    loading.value = false
  }
}

function refresh() {
  planLocked.value = false
  return Promise.all([fetchStats(), fetchMembers()])
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchMembers()
  }, 400)
})

watch([status, position], () => {
  currentPage.value = 1
  fetchMembers()
})

watch(() => props.branchUuid, () => {
  currentPage.value = 1
  refresh()
})

function goToPage(page: number) {
  if (page < 1 || page > lastPage.value || page === currentPage.value) return
  currentPage.value = page
  fetchMembers()
}

function clearFilters() {
  search.value = ''
  status.value = ''
  position.value = ''
}

onMounted(refresh)
onBeforeUnmount(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})
</script>

<template>
  <div class="mt-4 flex flex-col gap-4">
    <!-- Plan doesn't include staff management -->
    <div v-if="planLocked" class="bg-white border border-[#EDD8CC] rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
      <Icon name="heroicons:lock-closed" class="w-10 h-10 text-[#9E7060]" />
      <p class="font-display text-lg font-bold text-[#3D2B24]">Employee management isn't in your plan</p>
      <p class="font-sans text-sm text-[#9E7060] max-w-md">Upgrade your subscription to add employees, set schedules, and give cashiers access to the register.</p>
      <NuxtLink
        to="/owner/subscription"
        class="mt-2 px-4 py-3 rounded-[10px] bg-[#7D5A50] font-display font-semibold text-sm text-[#FFF0D1] hover:bg-[#6B4A40] transition-colors"
      >
        View plans
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Stat cards -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        <EmployeesStatCard label="Total Employees" :value="stats?.total" />
        <EmployeesStatCard label="Active" :value="stats?.active" />
        <EmployeesStatCard
          label="Inactive"
          :value="stats ? stats.inactive + stats.suspended : null"
          :hint="inactiveHint"
        />
        <EmployeesStatCard label="Terminated" :value="stats?.terminated" />
      </div>

      <!-- Saved notice -->
      <div v-if="notice" class="bg-[#D4EDDA]/60 border border-[#28A745]/30 rounded-xl p-4 flex items-start gap-3 text-[#1E7B34]">
        <Icon name="heroicons:check-circle" class="w-5 h-5 shrink-0 mt-0.5" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold">{{ notice.message }}</p>
          <ul v-if="notice.warnings.length" class="mt-1.5 space-y-0.5 text-sm text-[#8A5A00]">
            <li v-for="warning in notice.warnings" :key="warning" class="flex items-start gap-1.5">
              <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 shrink-0 mt-0.5" />
              <span>{{ warning }}</span>
            </li>
          </ul>
        </div>
        <button type="button" aria-label="Dismiss" class="p-1 rounded hover:bg-black/5" @click="notice = null">
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>

      <!-- Error -->
      <div v-if="errorMessage" class="bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 flex items-center gap-3">
        <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0" />
        <span class="text-sm font-medium">{{ errorMessage }}</span>
        <button class="ml-auto text-sm font-bold underline hover:text-red-900" @click="refresh">Retry</button>
      </div>

      <!-- Table card -->
      <div class="bg-white border border-[#EDD8CC] rounded-2xl overflow-hidden">
        <!-- Toolbar -->
        <div class="flex flex-col gap-3 p-4 border-b border-[#EDD8CC]
                    sm:px-[22px] sm:py-[18px]
                    xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <div class="flex flex-col gap-3 flex-1 min-w-0 sm:flex-row sm:items-center">
            <!-- Search -->
            <div class="relative flex-1 min-w-0">
              <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-[#7D5A50]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="search"
                type="text"
                placeholder="Search Employee"
                class="w-full rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] py-3 pl-10 pr-3 font-sans text-sm text-[#3D2B24] placeholder:text-[#7D5A50]/40 hover:border-[#D9C4B8] focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
              />
            </div>

            <div class="grid grid-cols-2 gap-3 sm:flex">
              <!-- Status -->
              <div class="relative sm:w-[149px]">
                <select
                  v-model="status"
                  aria-label="Status"
                  class="w-full appearance-none rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] py-3 pl-3 pr-9 font-sans text-sm cursor-pointer hover:border-[#D9C4B8] focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
                  :class="status ? 'text-[#3D2B24]' : 'text-[#7D5A50]/40'"
                >
                  <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value" class="text-[#3D2B24]">
                    {{ opt.value ? opt.label : 'Status' }}
                  </option>
                </select>
                <Icon name="heroicons:chevron-down" class="w-4 h-4 text-[#7D5A50]/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <!-- Position -->
              <div class="relative sm:w-[149px]">
                <select
                  v-model="position"
                  aria-label="Position"
                  class="w-full appearance-none rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] py-3 pl-3 pr-9 font-sans text-sm cursor-pointer hover:border-[#D9C4B8] focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
                  :class="position ? 'text-[#3D2B24]' : 'text-[#7D5A50]/40'"
                >
                  <option v-for="opt in positionOptions" :key="opt.value" :value="opt.value" class="text-[#3D2B24]">
                    {{ opt.value ? opt.label : 'Position' }}
                  </option>
                </select>
                <Icon name="heroicons:chevron-down" class="w-4 h-4 text-[#7D5A50]/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="grid grid-cols-2 gap-3 sm:flex sm:gap-4 sm:justify-end">
            <button
              type="button"
              class="px-4 py-3 rounded-[10px] bg-[#7D5A50] font-display font-semibold text-sm text-[#FFF0D1] whitespace-nowrap hover:bg-[#6B4A40] transition-colors focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
              @click="emit('view-positions')"
            >
              View Positions
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[10px] bg-[#7D5A50] font-display font-semibold text-sm text-[#FFF0D1] whitespace-nowrap hover:bg-[#6B4A40] transition-colors focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
              @click="showAddModal = true"
            >
              <Icon name="heroicons:plus" class="w-4 h-4" />
              Add Employee
            </button>
          </div>
        </div>

        <!-- Empty branch -->
        <div v-if="branchIsEmpty && !hasFilters" class="px-6 py-14 flex flex-col items-center gap-2 text-center">
          <Icon name="heroicons:user-group" class="w-10 h-10 text-[#9E7060]" />
          <p class="font-display text-base font-bold text-[#3D2B24]">No employees at this branch yet</p>
          <p class="font-sans text-sm text-[#9E7060]">Add your first manager or cashier to get started.</p>
          <button
            type="button"
            class="mt-3 inline-flex items-center gap-2 px-4 py-3 rounded-[10px] bg-[#7D5A50] font-display font-semibold text-sm text-[#FFF0D1] hover:bg-[#6B4A40] transition-colors"
            @click="showAddModal = true"
          >
            <Icon name="heroicons:plus" class="w-4 h-4" />
            Add Employee
          </button>
        </div>

        <template v-else>
          <!-- Mobile list -->
          <div class="md:hidden">
            <template v-if="loading">
              <div v-for="n in 3" :key="n" class="p-4 border-b border-[#EDD8CC] last:border-b-0 animate-pulse">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-[#F3E7D2]" />
                  <div class="flex-1 space-y-2">
                    <div class="h-3 w-1/2 rounded bg-[#F3E7D2]" />
                    <div class="h-3 w-1/3 rounded bg-[#F3E7D2]" />
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="members.length">
              <EmployeesMobileCard
                v-for="(member, index) in members"
                :key="member.uuid"
                :member="member"
                :index="index"
                @view="emit('view-employee', $event)"
              />
            </template>
          </div>

          <!-- Desktop table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-[#FFF8EA] border-b border-[#EDD8CC]">
                  <th class="px-5 py-4 font-sans font-bold text-[11px] text-[#9E7060] uppercase tracking-[0.08px] whitespace-nowrap">Employee</th>
                  <th class="px-5 py-4 font-sans font-bold text-[11px] text-[#9E7060] uppercase tracking-[0.08px] whitespace-nowrap">Contacts</th>
                  <th class="px-5 py-4 font-sans font-bold text-[11px] text-[#9E7060] uppercase tracking-[0.08px] whitespace-nowrap">Position</th>
                  <th class="px-5 py-4 font-sans font-bold text-[11px] text-[#9E7060] uppercase tracking-[0.08px] whitespace-nowrap">Status</th>
                  <th class="px-5 py-4"><span class="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                <template v-if="loading">
                  <tr v-for="n in 3" :key="n" class="border-b border-[#EDD8CC] last:border-b-0 animate-pulse">
                    <td class="px-5 py-3.5">
                      <div class="flex items-center gap-3">
                        <div class="w-[43px] h-[43px] rounded-full bg-[#F3E7D2]" />
                        <div class="h-3 w-28 rounded bg-[#F3E7D2]" />
                      </div>
                    </td>
                    <td class="px-5 py-3.5"><div class="h-3 w-32 rounded bg-[#F3E7D2]" /></td>
                    <td class="px-5 py-3.5"><div class="h-3 w-16 rounded bg-[#F3E7D2]" /></td>
                    <td class="px-5 py-3.5"><div class="h-6 w-16 rounded-full bg-[#F3E7D2]" /></td>
                    <td class="px-5 py-3.5"><div class="ml-auto h-9 w-[130px] rounded-[10px] bg-[#F3E7D2]" /></td>
                  </tr>
                </template>
                <template v-else>
                  <EmployeesTableRow
                    v-for="(member, index) in members"
                    :key="member.uuid"
                    :member="member"
                    :index="index"
                    @view="emit('view-employee', $event)"
                  />
                </template>
              </tbody>
            </table>
          </div>

          <!-- No results for the current filters -->
          <div v-if="!loading && !members.length && !errorMessage" class="px-6 py-12 flex flex-col items-center gap-2 text-center">
            <Icon name="heroicons:magnifying-glass" class="w-8 h-8 text-[#9E7060]" />
            <p class="font-display text-base font-bold text-[#3D2B24]">No employees match your filters</p>
            <button
              v-if="hasFilters"
              type="button"
              class="mt-1 font-sans text-sm font-semibold text-[#7D5A50] underline hover:text-[#3D2B24]"
              @click="clearFilters"
            >
              Clear filters
            </button>
          </div>

          <CommonPagination
            :page="currentPage"
            :last-page="lastPage"
            :total="total"
            :from="from"
            :to="to"
            @change="goToPage"
          />
        </template>
      </div>
    </template>

    <EmployeesFormModal
      :show="showAddModal"
      :branch-uuid="branchUuid"
      @close="showAddModal = false"
      @saved="onEmployeeSaved"
    />
  </div>
</template>
