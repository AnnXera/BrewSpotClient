<!-- app/components/employees/FormModal.vue -->
<!-- Add / Edit Employee modal (owner side). Pass `employee` to edit an existing person. -->
<script setup lang="ts">
import type {
  CreateStaffPayload,
  EmploymentStatus,
  StaffMember,
  StaffRole,
  StaffScheduleInput,
  UpdateStaffPayload,
} from '~/services/StaffService'

const props = defineProps<{
  show: boolean
  branchUuid: string
  // When set, the form edits this person instead of adding a new one.
  employee?: StaffMember | null
}>()

const emit = defineEmits<{
  close: []
  saved: [result: { message: string; warnings: string[]; staff?: StaffMember }]
}>()

const staffService = useStaffService('owner')

const isEdit = computed(() => !!props.employee)

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
    hint: 'Manages the branch dashboard and approves voids/refunds. They\'ll get an email to set their own password and PIN.',
  },
  {
    value: 'Cashier',
    label: 'Cashier',
    hint: 'Signs in on this branch\'s register with this PIN.',
  },
  {
    value: 'Staff',
    label: 'Staff',
    hint: 'Records only (e.g. barista, kitchen staff). No login and no register access.',
  },
]

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

const form = ref(emptyForm())
// What the server has right now (edit mode), to send only what changed.
const baseline = ref(emptyForm())
// Steps already saved during this edit, in case a later step fails and the modal is closed.
const savedSteps = ref<{ message: string; warnings: string[]; staff?: StaffMember }[]>([])
const pinSaved = ref(false)
const errors = ref<Record<string, string>>({})
const scheduleErrors = ref<Record<number, string>>({})
const serverError = ref('')
const saving = ref(false)

// Managers choose their own PIN when they set up their password.
const usesPin = computed(() => form.value.role === 'Cashier')
// When editing, a cashier who already has a PIN keeps it unless a new one is typed.
const pinRequired = computed(() => usesPin.value && !(isEdit.value && (props.employee?.pin_set || pinSaved.value)))
const positionHint = computed(() => positionOptions.find(o => o.value === form.value.role)?.hint ?? '')

watch(() => props.show, (open) => {
  if (open) {
    form.value = props.employee ? formFrom(props.employee) : emptyForm()
    baseline.value = structuredClone(toRaw(form.value))
    savedSteps.value = []
    pinSaved.value = false
    errors.value = {}
    scheduleErrors.value = {}
    serverError.value = ''
  }
})

// Phone is stored as the 10 digits after +63 (e.g. 9123456789). Pasted
// "09…", "639…" or "+639…" numbers are trimmed down to those digits.
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
}

function onPinInput(event: Event) {
  const input = event.target as HTMLInputElement
  form.value.pin = input.value.replace(/\D/g, '').slice(0, 6)
  input.value = form.value.pin
}

function validate() {
  const e: Record<string, string> = {}
  const f = form.value

  if (!f.firstname.trim()) e.firstname = 'First name is required.'
  if (!f.lastname.trim()) e.lastname = 'Last name is required.'
  if (!f.phone_number) e.phone_number = 'Phone number is required.'
  else if (!/^9\d{9}$/.test(f.phone_number)) e.phone_number = 'Enter 10 digits starting with 9 (e.g. 9123456789).'
  if (!f.email.trim()) e.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address.'
  if (!f.address.trim()) e.address = 'Address is required.'
  if (!f.role) e.role = 'Select a position.'
  if (!f.hired_at) e.hired_at = 'Hired date is required.'
  if (usesPin.value && (pinRequired.value || f.pin) && !/^\d{6}$/.test(f.pin)) e.pin = 'PIN must be exactly 6 digits.'

  const se: Record<number, string> = {}
  for (const day of f.schedule) {
    if (day.is_day_off) continue
    if (!day.start_time || !day.end_time) se[day.day_of_week] = 'Enter a start and end time.'
    else if (day.end_time <= day.start_time) se[day.day_of_week] = 'End time must be after start time.'
  }

  errors.value = e
  scheduleErrors.value = se
  return !Object.keys(e).length && !Object.keys(se).length
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

// The PATCH body for fields that differ from what the server has.
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

// Edit runs up to three calls: details, then schedule, then PIN (a PIN can
// only be set once the person is a cashier). Each step that succeeds becomes
// the new baseline, so retrying after a failure doesn't resend it.
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
      const f = structuredClone(toRaw(form.value))
      baseline.value = { ...f, schedule: baseline.value.schedule }
    }

    if (newSchedule) {
      const res = await staffService.updateBranchStaffSchedule(props.branchUuid, employee.uuid, newSchedule)
      if (!res.success) throw { data: { message: res.message } }
      savedSteps.value.push({ message: res.message, warnings: res.warnings ?? [], staff: res.staff })
      baseline.value.schedule = structuredClone(toRaw(form.value.schedule))
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
  if (!validate() || saving.value) return
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
  // A partly saved edit still changed the employee, so the page should refresh.
  if (savedSteps.value.length) emit('saved', savedResult())
  else emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.show) close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const labelClass = 'font-display font-bold text-sm sm:text-base text-[#9E7060] uppercase tracking-[0.12px]'
function fieldClass(key: string) {
  return [
    'flex h-11 items-center gap-3 px-3 rounded-xl border bg-[#FFF8EA] transition-colors focus-within:ring-2 focus-within:ring-[#B4846C]/40',
    errors.value[key] ? 'border-red-400' : 'border-[#EDD8CC] hover:border-[#D9C4B8]',
  ]
}
const inputClass = 'flex-1 min-w-0 bg-transparent font-sans text-sm text-black placeholder:text-[#7D5A50]/40 focus:outline-none'
</script>

<template>
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
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-form-title"
    >
      <form
        class="bg-white rounded-2xl w-full max-w-[811px] max-h-[92vh] flex flex-col shadow-2xl"
        novalidate
        @submit.prevent="submit"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-4 px-4 py-4 border-b border-[#EDD8CC] sm:px-[22px] sm:py-[18px]">
          <h2 id="employee-form-title" class="font-display font-semibold text-xl text-[#3D2B24] sm:text-2xl">
            {{ isEdit ? 'Edit Employee Information' : 'Add Employee Information' }}
          </h2>
          <button
            type="button"
            aria-label="Close"
            class="w-6 h-6 rounded-md bg-[#F0E8E5] flex items-center justify-center text-[#3D2B24] hover:bg-[#EDD8CC] transition-colors"
            @click="close"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto">
          <!-- Personal Information -->
          <section class="flex flex-col gap-4 px-4 py-3 sm:px-[22px]">
            <h3 class="font-display font-semibold text-xl text-[#3D2B24] sm:text-2xl">Personal Information</h3>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label class="flex flex-col gap-1.5 min-w-0">
                <span :class="labelClass">First name*</span>
                <div :class="fieldClass('firstname')">
                  <Icon name="heroicons:pencil" class="w-4 h-4 shrink-0 text-[#7D5A50]" />
                  <input v-model="form.firstname" type="text" autocomplete="given-name" maxlength="100" :class="inputClass" />
                </div>
                <span v-if="errors.firstname" class="font-sans text-xs text-red-600">{{ errors.firstname }}</span>
              </label>

              <label class="flex flex-col gap-1.5 min-w-0">
                <span :class="labelClass">Middle name</span>
                <div :class="fieldClass('middlename')">
                  <Icon name="heroicons:pencil" class="w-4 h-4 shrink-0 text-[#7D5A50]" />
                  <input v-model="form.middlename" type="text" autocomplete="additional-name" maxlength="100" :class="inputClass" />
                </div>
                <span v-if="errors.middlename" class="font-sans text-xs text-red-600">{{ errors.middlename }}</span>
              </label>

              <label class="flex flex-col gap-1.5 min-w-0">
                <span :class="labelClass">Last name*</span>
                <div :class="fieldClass('lastname')">
                  <Icon name="heroicons:pencil" class="w-4 h-4 shrink-0 text-[#7D5A50]" />
                  <input v-model="form.lastname" type="text" autocomplete="family-name" maxlength="100" :class="inputClass" />
                </div>
                <span v-if="errors.lastname" class="font-sans text-xs text-red-600">{{ errors.lastname }}</span>
              </label>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="flex flex-col gap-1.5 min-w-0">
                <span :class="labelClass">Phone number*</span>
                <div :class="fieldClass('phone_number')">
                  <Icon name="heroicons:phone" class="w-4 h-4 shrink-0 text-[#7D5A50]" />
                  <span class="font-sans text-sm text-[#3D2B24] pr-2 border-r border-[#EDD8CC]">+63</span>
                  <input
                    :value="form.phone_number"
                    type="tel"
                    inputmode="numeric"
                    autocomplete="tel-national"
                    placeholder="9123456789"
                    :class="inputClass"
                    @input="onPhoneInput"
                  />
                </div>
                <span v-if="errors.phone_number" class="font-sans text-xs text-red-600">{{ errors.phone_number }}</span>
              </label>

              <label class="flex flex-col gap-1.5 min-w-0">
                <span :class="labelClass">Email*</span>
                <div :class="fieldClass('email')">
                  <Icon name="heroicons:at-symbol" class="w-4 h-4 shrink-0 text-[#7D5A50]" />
                  <input v-model="form.email" type="email" autocomplete="email" maxlength="255" :class="inputClass" />
                </div>
                <span v-if="errors.email" class="font-sans text-xs text-red-600">{{ errors.email }}</span>
              </label>
            </div>

            <label class="flex flex-col gap-1.5 pb-3 border-b border-[#EDD8CC]">
              <span :class="labelClass">Address*</span>
              <div :class="fieldClass('address')">
                <Icon name="heroicons:map-pin" class="w-4 h-4 shrink-0 text-[#7D5A50]" />
                <input v-model="form.address" type="text" autocomplete="street-address" maxlength="255" :class="inputClass" />
              </div>
              <span v-if="errors.address" class="font-sans text-xs text-red-600">{{ errors.address }}</span>
            </label>
          </section>

          <!-- Employment Details -->
          <section class="flex flex-col gap-4 px-4 pt-3 pb-[18px] sm:px-[22px]">
            <h3 class="font-display font-semibold text-xl text-[#3D2B24] sm:text-2xl">Employment Details</h3>

            <div class="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <!-- Position -->
              <label class="flex flex-col gap-1.5 flex-1 min-w-0">
                <span :class="labelClass">Position*</span>
                <div :class="fieldClass('role')" class="relative">
                  <Icon name="heroicons:user-circle" class="w-4 h-4 shrink-0 text-[#7D5A50]" />
                  <select
                    v-model="form.role"
                    class="flex-1 min-w-0 appearance-none bg-transparent font-sans text-sm pr-6 cursor-pointer focus:outline-none"
                    :class="form.role ? 'text-black' : 'text-[#7D5A50]/40'"
                  >
                    <option value="" disabled>Select position</option>
                    <option v-for="opt in positionOptions" :key="opt.value" :value="opt.value" class="text-black">
                      {{ opt.label }}
                    </option>
                  </select>
                  <Icon name="heroicons:chevron-down" class="w-4 h-4 text-[#7D5A50] absolute right-3 pointer-events-none" />
                </div>
                <span v-if="errors.role" class="font-sans text-xs text-red-600">{{ errors.role }}</span>
              </label>

              <!-- Hired At -->
              <label class="flex flex-col gap-1.5 flex-1 min-w-0">
                <span :class="labelClass">Hired At*</span>
                <div :class="fieldClass('hired_at')">
                  <Icon name="heroicons:calendar" class="w-4 h-4 shrink-0 text-[#7D5A50]" />
                  <input v-model="form.hired_at" type="date" :class="inputClass" />
                </div>
                <span v-if="errors.hired_at" class="font-sans text-xs text-red-600">{{ errors.hired_at }}</span>
              </label>

              <!-- PIN (Cashier only) -->
              <label v-if="usesPin" class="flex flex-col gap-1.5 sm:w-[173px] sm:shrink-0">
                <span :class="labelClass">{{ pinRequired ? 'PIN*' : 'New PIN' }}</span>
                <div :class="fieldClass('pin')">
                  <Icon name="heroicons:finger-print" class="w-4 h-4 shrink-0 text-[#7D5A50]" />
                  <input
                    :value="form.pin"
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    :placeholder="pinRequired ? '6 digits' : 'Keep current'"
                    :class="inputClass"
                    @input="onPinInput"
                  />
                </div>
                <span v-if="errors.pin" class="font-sans text-xs text-red-600">{{ errors.pin }}</span>
              </label>
            </div>

            <p v-if="positionHint" class="-mt-2 font-sans text-xs text-[#9E7060]">{{ positionHint }}</p>

            <!-- Employment status (edit only; ending employment is done with Terminate) -->
            <label v-if="isEdit" class="flex flex-col gap-1.5 sm:max-w-[calc(50%-8px)]">
              <span :class="labelClass">Status*</span>
              <div :class="fieldClass('employment_status')" class="relative">
                <Icon name="heroicons:signal" class="w-4 h-4 shrink-0 text-[#7D5A50]" />
                <select
                  v-model="form.employment_status"
                  class="flex-1 min-w-0 appearance-none bg-transparent font-sans text-sm text-black pr-6 cursor-pointer focus:outline-none"
                >
                  <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <Icon name="heroicons:chevron-down" class="w-4 h-4 text-[#7D5A50] absolute right-3 pointer-events-none" />
              </div>
              <span v-if="errors.employment_status" class="font-sans text-xs text-red-600">{{ errors.employment_status }}</span>
            </label>

            <!-- Weekly schedule -->
            <div class="flex flex-col gap-3">
              <span :class="labelClass">Weekly Schedule</span>
              <EmployeesScheduleEditor v-model="form.schedule" :errors="scheduleErrors" :disabled="saving" />
            </div>
          </section>
        </div>

        <!-- Footer -->
        <div class="flex flex-col-reverse gap-3 px-4 py-3 border-t border-[#EDD8CC] sm:flex-row sm:items-center sm:justify-end sm:px-[22px]">
          <p v-if="serverError" class="font-sans text-sm text-red-600 sm:mr-auto">{{ serverError }}</p>
          <button
            type="submit"
            :disabled="saving"
            class="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[10px] bg-[#3D2B24] font-display font-semibold text-base text-[#FFF0D1] hover:bg-[#2C1609] transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
          >
            <Icon v-if="saving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            {{ saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Employee' }}
          </button>
          <button
            type="button"
            :disabled="saving"
            class="px-5 py-3 rounded-[10px] border border-[#3D2B24] font-display font-semibold text-base text-[#3D2B24] hover:bg-[#FFF8EA] transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
            @click="close"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </transition>
</template>
