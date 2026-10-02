<!-- app/components/employees/Details.vue -->
<!-- One employee inside a branch's Employees tab: information card + weekly schedule. -->
<script setup lang="ts">
import type { StaffMember, StaffScheduleDay } from '~/services/StaffService'

const props = defineProps<{
  branchUuid: string
  employeeUuid: string
}>()

const emit = defineEmits<{
  back: []
}>()

const staffService = useStaffService('owner')

const member = ref<StaffMember | null>(null)
const loading = ref(true)
const errorMessage = ref('')

const confirmTerminate = ref(false)
const terminating = ref(false)
const actionError = ref('')
const actionNotice = ref('')

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await staffService.getBranchStaff(props.branchUuid, props.employeeUuid)
    member.value = res.staff ?? null
    if (!res.staff) errorMessage.value = res.message || 'Employee not found at this branch.'
  } catch (e: any) {
    member.value = null
    errorMessage.value = e?.data?.message || 'Could not load this employee.'
  } finally {
    loading.value = false
  }
}

watch(() => props.employeeUuid, load, { immediate: true })

const isTerminated = computed(() => member.value?.assignment?.employment_status === 'terminated')

const fullName = computed(() => {
  const m = member.value
  if (!m) return ''
  return [m.firstname, m.middlename, m.lastname].filter(Boolean).join(' ')
})

// Short, readable reference for this person's assignment at the branch.
const employeeId = computed(() => member.value?.assignment?.staff_uuid.slice(0, 8).toUpperCase() ?? '')

// Stored as +639XXXXXXXXX; shown the way people write it locally (09XXXXXXXXX).
const phoneDisplay = computed(() => {
  const phone = member.value?.phone_number
  if (!phone) return '—'
  return phone.startsWith('+63') ? `0${phone.slice(3)}` : phone
})

// hired_at is a plain YYYY-MM-DD date; build it locally so no time zone can shift the day.
const hiredDisplay = computed(() => {
  const value = member.value?.assignment?.hired_at
  if (!value) return '—'
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
})

// Always Sunday → Saturday, even if some days were never set.
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const week = computed(() =>
  DAY_NAMES.map((name, index) => ({
    name,
    day: member.value?.schedule.find(s => s.day_of_week === index) as StaffScheduleDay | undefined,
  }))
)

async function terminate() {
  if (!member.value) return
  terminating.value = true
  actionError.value = ''
  actionNotice.value = ''
  try {
    const res = await staffService.terminateBranchStaff(props.branchUuid, member.value.uuid)
    confirmTerminate.value = false
    await load()
    actionNotice.value = res.message
  } catch (e: any) {
    confirmTerminate.value = false
    actionError.value = e?.data?.message || 'Could not terminate this employee. Please try again.'
  } finally {
    terminating.value = false
  }
}
</script>

<template>
  <div class="mt-4 bg-white border border-[#EDD8CC] rounded-2xl p-4 sm:p-6">
    <!-- Header: back + actions -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        class="inline-flex items-center gap-3 font-display font-semibold text-base text-[#3D2B24] hover:text-[#7D5A50] transition-colors"
        @click="emit('back')"
      >
        <Icon name="heroicons:chevron-left" class="w-4 h-4" />
        Back to Employees
      </button>

      <div v-if="member" class="flex items-center gap-3 sm:gap-[18px]">
        <template v-if="member.can_manage && !isTerminated">
          <!-- The edit form isn't built yet. -->
          <button
            type="button"
            disabled
            title="Editing employees is coming soon"
            class="inline-flex items-center gap-2 px-4 py-3 rounded-[10px] bg-[#7D5A50] font-display font-semibold text-sm text-[#FFF0D1] opacity-60 cursor-not-allowed"
          >
            <Icon name="heroicons:pencil-square" class="w-4 h-4" />
            Edit Employee
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 px-3 py-3 rounded-[10.5px] bg-[#FDE8E8] border border-[#DC3545] font-display font-semibold text-sm text-[#B31E1E] hover:bg-[#FBD5D5] transition-colors"
            @click="confirmTerminate = true"
          >
            <Icon name="heroicons:trash" class="w-4 h-4" />
            Terminate
          </button>
        </template>

        <span
          v-else-if="isTerminated"
          class="inline-flex items-center gap-2 px-3 py-3 rounded-[10.5px] bg-[#FDE8E8] border border-[#DC3545] font-display font-semibold text-sm text-[#B31E1E]"
        >
          <Icon name="heroicons:trash" class="w-4 h-4" />
          Terminated
        </span>
      </div>
    </div>

    <p v-if="actionNotice" class="mt-4 text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
      {{ actionNotice }}
    </p>

    <p v-if="actionError" class="mt-4 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      {{ actionError }}
    </p>

    <div v-if="loading" class="flex justify-center py-16">
      <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-[#7D5A50]" />
    </div>

    <div v-else-if="errorMessage" class="mt-4 bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 flex items-center gap-3">
      <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0" />
      <span class="text-sm font-medium">{{ errorMessage }}</span>
      <button class="ml-auto text-sm font-bold underline hover:text-red-900" @click="load">Retry</button>
    </div>

    <div v-else-if="member" class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
      <!-- Employee Information -->
      <section class="bg-white border border-[#EDD8CC] rounded-2xl p-6 flex flex-col gap-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-display font-bold text-2xl text-[#3D2B24]">Employee Information</h2>
          <StatusBadge v-if="member.assignment" :status="member.assignment.employment_status" />
        </div>

        <div class="flex items-center gap-4">
          <CommonAvatar :firstname="member.firstname" :lastname="member.lastname" :size="65" />
          <div class="min-w-0">
            <p class="font-display font-bold text-xl text-[#3D2B24] break-words">{{ fullName }}</p>
            <p v-if="employeeId" class="font-display text-sm text-[#9E7060]">ID: {{ employeeId }}</p>
            <EmployeesFlags :member="member" />
          </div>
        </div>

        <div class="h-px bg-[#EDD8CC]" />

        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
          <div class="flex flex-col gap-1 min-w-0">
            <dt class="font-display font-bold text-xs uppercase tracking-[0.09px] text-[#9E7060]">Position</dt>
            <dd class="font-display font-medium text-base text-[#3D2B24]">{{ member.role }}</dd>
          </div>
          <div class="flex flex-col gap-1 min-w-0">
            <dt class="font-display font-bold text-xs uppercase tracking-[0.09px] text-[#9E7060]">Hired At</dt>
            <dd class="font-display font-medium text-base text-[#3D2B24]">{{ hiredDisplay }}</dd>
          </div>
          <div class="flex flex-col gap-1 min-w-0">
            <dt class="font-display font-bold text-xs uppercase tracking-[0.09px] text-[#9E7060]">Email Address</dt>
            <dd class="font-display font-medium text-base text-[#3D2B24] break-all">{{ member.email }}</dd>
          </div>
          <div class="flex flex-col gap-1 min-w-0">
            <dt class="font-display font-bold text-xs uppercase tracking-[0.09px] text-[#9E7060]">Phone Contact</dt>
            <dd class="font-display font-medium text-base text-[#3D2B24]">{{ phoneDisplay }}</dd>
          </div>
          <div class="flex flex-col gap-1 min-w-0 sm:col-span-2">
            <dt class="font-display font-bold text-xs uppercase tracking-[0.09px] text-[#9E7060]">Address</dt>
            <dd class="font-display font-medium text-base text-[#3D2B24] break-words">{{ member.address || '—' }}</dd>
          </div>
        </dl>
      </section>

      <!-- Employee Schedule -->
      <section class="bg-white border border-[#EDD8CC] rounded-2xl px-6 pt-6 pb-2 flex flex-col gap-5">
        <h2 class="font-display font-bold text-2xl text-[#3D2B24]">Employee Schedule</h2>

        <ul>
          <li
            v-for="row in week"
            :key="row.name"
            class="flex items-center justify-between gap-3 py-3 border-b-[0.5px] border-[#EDD8CC] last:border-b-0"
          >
            <span class="font-sans font-semibold text-base leading-[26px] text-[#3D2B24]">{{ row.name }}</span>

            <div class="w-[162px] shrink-0">
              <div
                v-if="!row.day"
                class="w-full flex items-center justify-center px-4 py-1.5 rounded-lg border border-dashed border-[#EDD8CC] font-display text-sm text-[#9E7060] leading-[26px]"
              >
                Not scheduled
              </div>
              <div
                v-else-if="row.day.is_day_off"
                class="w-full flex items-center justify-center px-4 py-1.5 rounded-lg bg-[#DDDDDD] font-display font-semibold text-base text-[#5A5A5A] leading-[26px]"
              >
                Day Off
              </div>
              <div v-else class="flex items-center justify-between">
                <span class="bg-white border-[0.5px] border-[#EDD8CC] rounded-lg p-2.5 font-display font-medium text-sm text-black">
                  {{ row.day.start_time }}
                </span>
                <span class="font-sans font-medium text-sm text-black">-</span>
                <span class="bg-white border-[0.5px] border-[#EDD8CC] rounded-lg p-2.5 font-display font-medium text-sm text-black">
                  {{ row.day.end_time }}
                </span>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <ConfirmDialog
      :open="confirmTerminate"
      title="Terminate employee?"
      :message="`${fullName} will be terminated at this branch. They lose access here, and this can't be undone from this page.`"
      :confirm-label="terminating ? 'Terminating…' : 'Terminate'"
      danger
      @confirm="!terminating && terminate()"
      @cancel="confirmTerminate = false"
    />
  </div>
</template>
