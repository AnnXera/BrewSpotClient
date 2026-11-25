<!-- app/components/employees/FormModal.vue -->
<!-- Add / Edit Employee modal (owner and manager side). Pass `employee` to edit an existing person. -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type {
  CreateStaffPayload,
  EmploymentStatus,
  StaffMember,
  StaffRole,
  StaffScheduleInput,
  UpdateStaffPayload,
} from '~/services/StaffService'
import DropdownList from '~/components/common/DropdownList.vue'
import EmilCalendar from '~/components/common/EmilCalendar.vue'

const props = defineProps<{
  show: boolean
  branchUuid: string
  // When set, the form edits this person instead of adding a new one.
  employee?: StaffMember | null
  // 'manager': only Cashier / Staff can be added, and the position can't be changed (server enforces both).
  scope?: 'owner' | 'manager'
}>()

const emit = defineEmits<{
  close: []
  saved: [result: { message: string; warnings: string[]; staff?: StaffMember }]
}>()

const isManager = computed(() => props.scope === 'manager')
const staffService = useStaffService(props.scope ?? 'owner')

const isEdit = computed(() => !!props.employee)
const activeTab = ref<'personal' | 'employment'>('personal')

type EditableStatus = Exclude<EmploymentStatus, 'terminated'>
const statusOptions: { value: EditableStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
]

const positionOptions: { value: StaffRole; label: string; hint: string }[] = [
  {
    value: 'Manager',
    label: 'Manager',
    hint: "Manages the branch dashboard and approves voids/refunds. They'll receive an email invitation to set their password and PIN.",
  },
  {
    value: 'Cashier',
    label: 'Cashier',
    hint: "Signs in directly on this branch's POS register using their assigned 6-digit PIN.",
  },
  {
    value: 'Staff',
    label: 'Staff (Barista / Kitchen)',
    hint: "Records only (e.g. barista, kitchen staff). No dashboard or register access required.",
  },
]

// Managers adding someone only get Cashier / Staff; when editing, the current role stays listed so it still shows.
const positionSelectOptions = computed(() => positionOptions
  .filter(o => !isManager.value || o.value !== 'Manager' || (isEdit.value && props.employee?.role === 'Manager'))
  .map(({ value, label }) => ({ value, label })))

function defaultSchedule(): StaffScheduleInput[] {
  // Sunday (0) and Saturday (6) off; weekdays 9–5.
  return [0, 1, 2, 3, 4, 5, 6].map(day => ({
    day_of_week: day,
    is_day_off: day === 0 || day === 6,
    start_time: '09:00',
    end_time: '17:00',
  }))
}

function emptyForm() {
  return {
    firstname: '',
    middlename: '',
    lastname: '',
    phone_number: '',
    email: '',
    address: '',
    role: '' as StaffRole | '',
    hired_at: new Date().toISOString().split('T')[0] as string,
    employment_status: 'active' as EditableStatus,
    pin: '',
    schedule: defaultSchedule(),
  }
}

// Days that were never set start as a day off, so saving without touching them changes nothing.
function formFrom(member: StaffMember): ReturnType<typeof emptyForm> {
  const status = member.assignment?.employment_status
  return {
    firstname: member.firstname,
    middlename: member.middlename ?? '',
    lastname: member.lastname,
    phone_number: cleanMobileDigits(member.phone_number ?? ''),
    email: member.email,
    address: member.address ?? '',
    role: member.role,
    hired_at: member.assignment?.hired_at ?? '',
    employment_status: status && status !== 'terminated' ? status : 'active',
    pin: '',
    schedule: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
      const day = member.schedule.find(s => s.day_of_week === dayOfWeek)
      return day
        ? { day_of_week: dayOfWeek, is_day_off: day.is_day_off, start_time: day.start_time, end_time: day.end_time }
        : { day_of_week: dayOfWeek, is_day_off: true, start_time: '09:00', end_time: '17:00' }
    }),
  }
}

function snapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

const form = ref(emptyForm())
const baseline = ref(emptyForm())
const savedSteps = ref<{ message: string; warnings: string[]; staff?: StaffMember }[]>([])
const pinSaved = ref(false)
const errors = ref<Record<string, string>>({})
const scheduleErrors = ref<Record<number, string>>({})
const serverError = ref('')
const saving = ref(false)

const usesPin = computed(() => form.value.role === 'Cashier')
const pinRequired = computed(() => usesPin.value && !(isEdit.value && (props.employee?.pin_set || pinSaved.value)))
const positionHint = computed(() => positionOptions.find(o => o.value === form.value.role)?.hint ?? '')

const personalErrorCount = computed(() => {
  return ['firstname', 'lastname', 'phone_number', 'email', 'address'].filter(k => !!errors.value[k]).length
})

const employmentErrorCount = computed(() => {
  const roleAndPin = ['role', 'hired_at', 'pin', 'employment_status'].filter(k => !!errors.value[k]).length
  const scheduleCount = Object.keys(scheduleErrors.value).length
  return roleAndPin + scheduleCount
})

// Step indicator: an error count wins over the step number; step 1 shows a check once passed.
const steps = computed(() => [
  { key: 'personal' as const, label: 'Personal details', errors: personalErrorCount.value, done: activeTab.value === 'employment' },
  { key: 'employment' as const, label: 'Role & schedule', errors: employmentErrorCount.value, done: false },
])

watch(() => props.show, (open) => {
  if (open) {
    form.value = props.employee ? formFrom(props.employee) : emptyForm()
    baseline.value = snapshot(form.value)
    savedSteps.value = []
    pinSaved.value = false
    errors.value = {}
    scheduleErrors.value = {}
    serverError.value = ''
    activeTab.value = 'personal'
  }
})

function cleanMobileDigits(value: string) {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('639')) digits = digits.slice(2)
  else if (digits.startsWith('09')) digits = digits.slice(1)
  else if (digits.startsWith('0')) digits = digits.replace(/^0+/, '')
  return digits.slice(0, 10)
}

function onPhoneInput(event: Event) {
  const input = event.target as HTMLInputElement
  form.value.phone_number = cleanMobileDigits(input.value)
  input.value = form.value.phone_number
  if (errors.value.phone_number) delete errors.value.phone_number
}

function onPinInput(event: Event) {
  const input = event.target as HTMLInputElement
  form.value.pin = input.value.replace(/\D/g, '').slice(0, 6)
  input.value = form.value.pin
  if (errors.value.pin) delete errors.value.pin
}

function validatePersonalFields() {
  const e: Record<string, string> = { ...errors.value }
  const f = form.value
  let valid = true

  delete e.firstname
  delete e.lastname
  delete e.phone_number
  delete e.email
  delete e.address

  if (!f.firstname.trim()) { e.firstname = 'First name is required.'; valid = false }
  if (!f.lastname.trim()) { e.lastname = 'Last name is required.'; valid = false }
  if (!f.phone_number) { e.phone_number = 'Phone number is required.'; valid = false }
  else if (!/^9\d{9}$/.test(f.phone_number)) { e.phone_number = 'Enter 10 digits starting with 9 (e.g. 9123456789).'; valid = false }
  if (!f.email.trim()) { e.email = 'Email address is required.'; valid = false }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { e.email = 'Enter a valid email address.'; valid = false }
  if (!f.address.trim()) { e.address = 'Residential address is required.'; valid = false }

  errors.value = e
  return valid
}

function validate() {
  const e: Record<string, string> = {}
  const f = form.value

  if (!f.firstname.trim()) e.firstname = 'First name is required.'
  if (!f.lastname.trim()) e.lastname = 'Last name is required.'
  if (!f.phone_number) e.phone_number = 'Phone number is required.'
  else if (!/^9\d{9}$/.test(f.phone_number)) e.phone_number = 'Enter 10 digits starting with 9 (e.g. 9123456789).'
  if (!f.email.trim()) e.email = 'Email address is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address.'
  if (!f.address.trim()) e.address = 'Residential address is required.'
  if (!f.role) e.role = 'Please select a position.'
  if (!f.hired_at) e.hired_at = 'Hired date is required.'
  if (usesPin.value && (pinRequired.value || f.pin) && !/^\d{6}$/.test(f.pin)) e.pin = 'PIN must be exactly 6 digits.'

  const se: Record<number, string> = {}
  for (const day of f.schedule) {
    if (day.is_day_off) continue
    if (!day.start_time || !day.end_time) se[day.day_of_week] = 'Enter start and end times.'
    else if (day.end_time <= day.start_time) se[day.day_of_week] = 'End time must be after start time.'
  }

  errors.value = e
  scheduleErrors.value = se
  return !Object.keys(e).length && !Object.keys(se).length
}

function goToEmploymentTab() {
  if (validatePersonalFields()) {
    activeTab.value = 'employment'
  }
}

function applyServerErrors(raw: Record<string, string[]> | undefined) {
  if (!raw) return
  const e: Record<string, string> = {}
  const se: Record<number, string> = {}

  for (const [key, messages] of Object.entries(raw)) {
    const message = messages?.[0] ?? 'Invalid value.'
    const scheduleMatch = key.match(/^schedule\.(\d+)\./)
    if (scheduleMatch) {
      const day = form.value.schedule[Number(scheduleMatch[1])]
      if (day) se[day.day_of_week] = message
    } else {
      e[key] = message
    }
  }

  errors.value = e
  scheduleErrors.value = se
}

function cleanSchedule(schedule: StaffScheduleInput[]): StaffScheduleInput[] {
  return schedule.map(day => ({
    day_of_week: day.day_of_week,
    is_day_off: day.is_day_off,
    start_time: day.is_day_off ? null : day.start_time,
    end_time: day.is_day_off ? null : day.end_time,
  }))
}

function changedFields(): UpdateStaffPayload {
  const f = form.value
  const b = baseline.value
  const payload: UpdateStaffPayload = {}
  if (f.firstname.trim() !== b.firstname.trim()) payload.firstname = f.firstname.trim()
  if (f.middlename.trim() !== b.middlename.trim()) payload.middlename = f.middlename.trim() || null
  if (f.lastname.trim() !== b.lastname.trim()) payload.lastname = f.lastname.trim()
  if (f.phone_number !== b.phone_number) payload.phone_number = `+63${f.phone_number}`
  if (f.email.trim() !== b.email.trim()) payload.email = f.email.trim()
  if (f.address.trim() !== b.address.trim()) payload.address = f.address.trim()
  if (f.role !== b.role) payload.role = f.role as StaffRole
  if (f.hired_at !== b.hired_at) payload.hired_at = f.hired_at
  if (f.employment_status !== b.employment_status) payload.employment_status = f.employment_status
  return payload
}

function scheduleChanged() {
  return JSON.stringify(cleanSchedule(form.value.schedule)) !== JSON.stringify(cleanSchedule(baseline.value.schedule))
}

function savedResult() {
  return {
    message: savedSteps.value.map(step => step.message).join(' '),
    warnings: savedSteps.value.flatMap(step => step.warnings),
    staff: [...savedSteps.value].reverse().find(step => step.staff)?.staff,
  }
}

function onSaveError(e: any, fallback: string) {
  if (e?.status === 422 && e?.data?.errors) {
    applyServerErrors(e.data.errors)
    serverError.value = 'Please fix the highlighted fields.'
  } else {
    serverError.value = e?.data?.message || fallback
  }
  if (savedSteps.value.length) serverError.value = `Some changes were saved. ${serverError.value}`
}

async function submitEdit() {
  const employee = props.employee!
  const details = changedFields()
  const newSchedule = scheduleChanged() ? cleanSchedule(form.value.schedule) : null
  const newPin = usesPin.value && form.value.pin ? form.value.pin : null

  if (!Object.keys(details).length && !newSchedule && !newPin) {
    close()
    return
  }

  saving.value = true
  try {
    if (Object.keys(details).length) {
      const res = await staffService.updateBranchStaff(props.branchUuid, employee.uuid, details)
      if (!res.success) throw { data: { message: res.message } }
      savedSteps.value.push({ message: res.message, warnings: [], staff: res.staff })
      const f = snapshot(form.value)
      baseline.value = { ...f, schedule: baseline.value.schedule }
    }

    if (newSchedule) {
      const res = await staffService.updateBranchStaffSchedule(props.branchUuid, employee.uuid, newSchedule)
      if (!res.success) throw { data: { message: res.message } }
      savedSteps.value.push({ message: res.message, warnings: res.warnings ?? [], staff: res.staff })
      baseline.value.schedule = snapshot(form.value.schedule)
    }

    if (newPin) {
      const res = await staffService.setBranchStaffPin(props.branchUuid, employee.uuid, newPin)
      if (!res.success) throw { data: { message: res.message } }
      savedSteps.value.push({ message: res.message, warnings: [] })
      pinSaved.value = true
      form.value.pin = ''
    }

    emit('saved', savedResult())
  } catch (e: any) {
    onSaveError(e, 'Could not save the changes. Please try again.')
  } finally {
    saving.value = false
  }
}

async function submit() {
  serverError.value = ''
  if (!validate()) {
    const hasPersonalErrors = ['firstname', 'lastname', 'phone_number', 'email', 'address'].some(k => !!errors.value[k])
    if (hasPersonalErrors) {
      activeTab.value = 'personal'
    } else {
      activeTab.value = 'employment'
    }
    return
  }
  if (saving.value) return
  if (isEdit.value) return submitEdit()

  const f = form.value
  const payload: CreateStaffPayload = {
    firstname: f.firstname.trim(),
    middlename: f.middlename.trim() || null,
    lastname: f.lastname.trim(),
    phone_number: `+63${f.phone_number}`,
    email: f.email.trim(),
    address: f.address.trim(),
    role: f.role as StaffRole,
    hired_at: f.hired_at || undefined,
    schedule: cleanSchedule(f.schedule),
  }
  if (usesPin.value) payload.pin = f.pin

  saving.value = true
  try {
    const res = await staffService.createBranchStaff(props.branchUuid, payload)
    if (res.success) {
      emit('saved', { message: res.message, warnings: res.warnings ?? [], staff: res.staff })
    } else {
      serverError.value = res.message || 'Could not add the employee.'
    }
  } catch (e: any) {
    onSaveError(e, 'Could not add the employee. Please try again.')
  } finally {
    saving.value = false
  }
}

function close() {
  if (saving.value) return
  if (savedSteps.value.length) emit('saved', savedResult())
  else emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.show) close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- On body, so it covers the sidebar too and centres on the whole window -->
  <Teleport to="body">
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-[3000] bg-black/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-form-title"
    >
      <!-- Capped to the window: header, steps and footer stay put, only the body scrolls -->
      <form
        class="relative bg-white rounded-3xl w-full max-w-[860px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        novalidate
        @submit.prevent="submit"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-4 px-6 md:px-8 pt-5 pb-4 border-b border-[#EEDFC4] bg-[#FDFBF7] shrink-0">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0 shadow-2xs">
              <Icon :name="isEdit ? 'heroicons:user-circle' : 'heroicons:user-plus'" class="w-5 h-5" />
            </div>
            <div>
              <h2 id="employee-form-title" class="text-xl font-display font-extrabold text-[#3B1F0E]">
                {{ isEdit ? 'Edit Employee' : 'Add New Employee' }}
              </h2>
              <p class="text-xs text-[#8A6E64] mt-0.5">
                {{ isEdit ? 'Update the employee profile, role, and work schedule.' : 'Register a new team member, assign their role, and set their schedule.' }}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close"
            class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3B1F0E] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="close"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Steps -->
        <nav aria-label="Form steps" class="px-6 md:px-8 py-3 border-b border-[#F0E4D3] bg-[#FCFAF6] select-none shrink-0">
          <ol class="flex items-center gap-3">
            <li v-for="(step, i) in steps" :key="step.key" class="flex items-center gap-3" :class="i === 0 ? '' : 'flex-1 sm:flex-none'">
              <span v-if="i > 0" class="h-px w-6 shrink-0 bg-[#E3D3BF] sm:w-10" aria-hidden="true" />
              <button
                type="button"
                class="group inline-flex items-center gap-2.5 rounded-xl py-1 pr-2 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                :aria-current="activeTab === step.key ? 'step' : undefined"
                @click="step.key === 'employment' ? goToEmploymentTab() : activeTab = step.key"
              >
                <span
                  class="flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors"
                  :class="step.errors
                    ? 'bg-red-500 text-white'
                    : activeTab === step.key
                      ? 'bg-[#3B1F0E] text-[#FFF8EA]'
                      : step.done
                        ? 'bg-[#EAD9C6] text-[#5C4037]'
                        : 'bg-white border border-[#E0D0BE] text-[#8A6E64]'"
                >
                  <template v-if="step.errors">{{ step.errors }}</template>
                  <Icon v-else-if="step.done && activeTab !== step.key" name="heroicons:check" class="h-3.5 w-3.5" />
                  <template v-else>{{ i + 1 }}</template>
                </span>
                <span class="text-[13px] font-semibold whitespace-nowrap" :class="activeTab === step.key ? 'text-[#3B1F0E]' : 'text-[#8A6E64] group-hover:text-[#3B1F0E]'">
                  {{ step.label }}
                </span>
              </button>
            </li>
          </ol>
        </nav>

        <!-- Body: only this part scrolls -->
        <div class="custom-form-scroll flex-1 min-h-0 px-6 md:px-8 py-4 overflow-y-auto overscroll-contain">
          <!-- STEP 1: Personal details -->
          <div v-if="activeTab === 'personal'" class="space-y-4">
            <!-- Card 1: Basic Information -->
            <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                <span>Basic Information</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <!-- First Name -->
                <label class="block min-w-0">
                  <span class="block text-xs font-bold text-[#3B1F0E] mb-1">First Name <span class="text-red-500">*</span></span>
                  <input
                    v-model="form.firstname"
                    type="text"
                    autocomplete="given-name"
                    maxlength="100"
                    placeholder="e.g. Juan"
                    class="w-full h-11 px-3.5 rounded-xl border bg-white text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                    :class="errors.firstname ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
                  />
                  <span v-if="errors.firstname" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                    <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                    <span>{{ errors.firstname }}</span>
                  </span>
                </label>

                <!-- Middle Name -->
                <label class="block min-w-0">
                  <span class="block text-xs font-bold text-[#3B1F0E] mb-1">Middle Name <span class="font-semibold text-[#8A6E64]">(Optional)</span></span>
                  <input
                    v-model="form.middlename"
                    type="text"
                    autocomplete="additional-name"
                    maxlength="100"
                    placeholder="e.g. Santos"
                    class="w-full h-11 px-3.5 rounded-xl border bg-white text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                    :class="errors.middlename ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
                  />
                  <span v-if="errors.middlename" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                    <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                    <span>{{ errors.middlename }}</span>
                  </span>
                </label>

                <!-- Last Name -->
                <label class="block min-w-0">
                  <span class="block text-xs font-bold text-[#3B1F0E] mb-1">Last Name <span class="text-red-500">*</span></span>
                  <input
                    v-model="form.lastname"
                    type="text"
                    autocomplete="family-name"
                    maxlength="100"
                    placeholder="e.g. Dela Cruz"
                    class="w-full h-11 px-3.5 rounded-xl border bg-white text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                    :class="errors.lastname ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
                  />
                  <span v-if="errors.lastname" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                    <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                    <span>{{ errors.lastname }}</span>
                  </span>
                </label>
              </div>
            </div>

            <!-- Card 2: Contact & Residential Details -->
            <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                <span>Contact & Residential Details</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <!-- Mobile Number with +63 prefix -->
                <label class="block min-w-0">
                  <span class="block text-xs font-bold text-[#3B1F0E] mb-1">Mobile Number <span class="text-red-500">*</span></span>
                  <div
                    class="h-11 rounded-xl border bg-white flex items-center overflow-hidden transition-all shadow-2xs focus-within:border-[#3B1F0E] focus-within:ring-2 focus-within:ring-[#3B1F0E]/15"
                    :class="errors.phone_number ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
                  >
                    <span class="bg-[#F5EFE6] border-r border-[#E0D0BE] text-[#3B1F0E] font-bold text-xs px-3.5 h-full flex items-center shrink-0 select-none">
                      +63
                    </span>
                    <input
                      :value="form.phone_number"
                      type="tel"
                      inputmode="numeric"
                      autocomplete="tel-national"
                      placeholder="9123456789"
                      class="w-full h-full px-3 text-sm font-bold text-[#2D201B] bg-transparent outline-none tracking-wider placeholder:text-[#A8988B] placeholder:font-normal"
                      @input="onPhoneInput"
                    />
                  </div>
                  <span v-if="errors.phone_number" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                    <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                    <span>{{ errors.phone_number }}</span>
                  </span>
                </label>

                <!-- Email -->
                <label class="block min-w-0">
                  <span class="block text-xs font-bold text-[#3B1F0E] mb-1">Email Address <span class="text-red-500">*</span></span>
                  <input
                    v-model="form.email"
                    type="email"
                    autocomplete="email"
                    maxlength="255"
                    placeholder="employee@brewspot.com"
                    class="w-full h-11 px-3.5 rounded-xl border bg-white text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                    :class="errors.email ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
                  />
                  <span v-if="errors.email" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                    <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                    <span>{{ errors.email }}</span>
                  </span>
                </label>
              </div>

              <!-- Address -->
              <label class="block">
                <span class="block text-xs font-bold text-[#3B1F0E] mb-1">Residential Address <span class="text-red-500">*</span></span>
                <input
                  v-model="form.address"
                  type="text"
                  autocomplete="street-address"
                  maxlength="255"
                  placeholder="Street, Barangay, City, Province"
                  class="w-full h-11 px-3.5 rounded-xl border bg-white text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                  :class="errors.address ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
                />
                <span v-if="errors.address" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                  <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ errors.address }}</span>
                </span>
              </label>
            </div>
          </div>

          <!-- STEP 2: Role & schedule -->
          <div v-else class="space-y-4">
            <!-- Card 1: Role & Branch Assignment -->
            <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                <span>Role & Branch Assignment</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5" :class="usesPin ? 'lg:grid-cols-3' : ''">
                <!-- Position -->
                <div class="min-w-0">
                  <span class="block text-xs font-bold text-[#3B1F0E] mb-1">Position <span class="text-red-500">*</span></span>
                  <DropdownList
                    v-model="form.role"
                    :options="positionSelectOptions"
                    placeholder="Select position"
                    size="md"
                    :invalid="!!errors.role"
                    :disabled="isManager && isEdit"
                  />
                  <span v-if="errors.role" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                    <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                    <span>{{ errors.role }}</span>
                  </span>
                  <span v-else-if="isManager && isEdit" class="block text-[11px] text-[#8A6E64] mt-1">Only owners can reassign roles.</span>
                </div>

                <!-- Date Hired -->
                <div class="min-w-0">
                  <span class="block text-xs font-bold text-[#3B1F0E] mb-1">Date Hired <span class="text-red-500">*</span></span>
                  <EmilCalendar
                    v-model="form.hired_at"
                    class="sm:!w-full"
                    placeholder="Select hired date"
                    align="left"
                    :invalid="!!errors.hired_at"
                    button-class="w-full h-11 px-3.5 rounded-xl border border-[#D8C7B5] bg-white text-sm font-semibold text-[#2D201B] shadow-2xs hover:border-[#3B1F0E]"
                  />
                  <span v-if="errors.hired_at" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                    <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                    <span>{{ errors.hired_at }}</span>
                  </span>
                </div>

                <!-- Cashier PIN (only when role is Cashier) -->
                <label v-if="usesPin" class="block min-w-0">
                  <span class="block text-xs font-bold text-[#3B1F0E] mb-1">
                    <template v-if="pinRequired">Cashier PIN (6 Digits) <span class="text-red-500">*</span></template>
                    <template v-else>New PIN <span class="font-semibold text-[#8A6E64]">(Optional)</span></template>
                  </span>
                  <input
                    :value="form.pin"
                    type="password"
                    inputmode="numeric"
                    autocomplete="off"
                    maxlength="6"
                    :placeholder="pinRequired ? '6-digit PIN' : 'Keep current PIN'"
                    class="w-full h-11 px-3.5 rounded-xl border bg-white text-sm font-bold tracking-widest text-[#2D201B] placeholder:text-[#A8988B] placeholder:tracking-normal placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                    :class="errors.pin ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
                    @input="onPinInput"
                  />
                  <span v-if="errors.pin" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                    <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                    <span>{{ errors.pin }}</span>
                  </span>
                </label>
              </div>

              <!-- Position hint -->
              <div v-if="positionHint" class="flex items-start gap-2.5 p-3 rounded-xl bg-[#FAF4ED] border border-[#EEDFC4] text-xs text-[#7D5A50] leading-relaxed">
                <Icon name="heroicons:information-circle" class="w-4 h-4 text-[#B4846C] shrink-0 mt-0.5" />
                <span>{{ positionHint }}</span>
              </div>

              <!-- Employment Status (edit only) -->
              <div v-if="isEdit" class="sm:max-w-[280px]">
                <span class="block text-xs font-bold text-[#3B1F0E] mb-1">Employment Status <span class="text-red-500">*</span></span>
                <DropdownList
                  v-model="form.employment_status"
                  :options="statusOptions"
                  size="md"
                  :invalid="!!errors.employment_status"
                />
                <span v-if="errors.employment_status" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                  <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ errors.employment_status }}</span>
                </span>
              </div>
            </div>

            <!-- Card 2: Weekly Work Schedule -->
            <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div>
                <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                  <span>Weekly Work Schedule</span>
                </div>
                <p class="text-[11px] text-[#8A6E64] mt-1">
                  Set daily shift hours or mark days off for this employee.
                </p>
              </div>

              <EmployeesScheduleEditor v-model="form.schedule" :errors="scheduleErrors" :disabled="saving" />
            </div>
          </div>
        </div>

        <!-- Global Server Error Banner -->
        <div v-if="serverError" role="alert" class="px-6 md:px-8 py-2.5 bg-red-50 border-t border-red-100 flex items-center gap-2 shrink-0">
          <Icon name="heroicons:exclamation-circle" class="w-4 h-4 text-red-600 shrink-0" />
          <p class="text-xs font-bold text-red-700 whitespace-pre-line">{{ serverError }}</p>
        </div>

        <!-- Footer: Cancel stays on the left; back and the main action on the right -->
        <div class="flex items-center justify-between px-6 md:px-8 py-3.5 border-t border-[#EEDFC4] bg-[#FAF8F5] rounded-b-3xl shrink-0">
          <button
            type="button"
            class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="close"
          >
            Cancel
          </button>

          <div class="flex items-center gap-3">
            <template v-if="activeTab === 'personal'">
              <button
                v-if="isEdit"
                type="submit"
                :disabled="saving"
                class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#3B1F0E] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
              >
                Save Changes
              </button>
              <button
                type="button"
                class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                @click="goToEmploymentTab"
              >
                <span>Continue to Role & Schedule</span>
                <Icon name="heroicons:arrow-right" class="w-4 h-4" />
              </button>
            </template>

            <template v-else>
              <button
                type="button"
                class="px-4 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                @click="activeTab = 'personal'"
              >
                <Icon name="heroicons:arrow-left" class="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
              >
                <Icon v-if="saving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                <span>{{ saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Employee' }}</span>
              </button>
            </template>
          </div>
        </div>
      </form>
    </div>
  </transition>
  </Teleport>
</template>

<style scoped>
.custom-form-scroll {
  scrollbar-width: thin;
  scrollbar-color: #D8C7B5 transparent;
}
.custom-form-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-form-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-form-scroll::-webkit-scrollbar-thumb {
  background-color: #D8C7B5;
  border-radius: 9999px;
}
.custom-form-scroll::-webkit-scrollbar-thumb:hover {
  background-color: #B4846C;
}
</style>
