<!-- Editable version of the application page, shown only for a rejected application the admin allowed to be resubmitted -->
<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { KEEP_FILE, type PreviousApplication } from '~/services/AuthService'

const props = defineProps<{
  uuid: string
  email: string
  editable: PreviousApplication
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'submitted'): void
}>()

const authService = useAuthService()

const ID_TYPES = [
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'sss', label: 'SSS ID' },
  { value: 'philhealth', label: 'PhilHealth ID' },
  { value: 'pagibig', label: 'Pag-IBIG ID' },
  { value: 'voters_id', label: "Voter's ID" }
]

const prev = props.editable

const form = reactive({
  firstname: prev.firstname || '',
  middlename: prev.middlename || '',
  lastname: prev.lastname || '',
  username: prev.username || '',
  phone_number: prev.phone_number || '',
  owner_address: prev.owner_address || '',
  id_type: prev.id_type || 'drivers_license',
  cafe_name: prev.cafe_name || '',
  cafe_doc_type: (prev.cafe_doc_type || 'DTI') as 'DTI' | 'SEC',
  branch_name: prev.branch_name || '',
  address: prev.address || '',
  cafe_email: prev.cafe_email || '',
  cafe_phonenumber: prev.cafe_phonenumber || '',
  tin_number: prev.tin_number || '',
  vat: (prev.vat || 'non-vat') as 'vat-registered' | 'non-vat',
  bir_registered_at: prev.bir_registered_at || ''
})

type FileField = 'file' | 'file_back' | 'dti_sec_file' | 'bir_file' | 'cafe_picture'

// Each document is either kept from the rejected application (KEEP_FILE),
// replaced by a new temp upload, or empty.
const files = reactive<Record<FileField, { path: string; name: string; uploading: boolean }>>({
  file: keepOrEmpty(prev.documents.file),
  file_back: keepOrEmpty(prev.documents.file_back),
  dti_sec_file: keepOrEmpty(prev.documents.dti_sec_file),
  bir_file: keepOrEmpty(prev.documents.bir_file),
  cafe_picture: keepOrEmpty(prev.documents.cafe_picture)
})

function keepOrEmpty(name: string | null) {
  return { path: name ? KEEP_FILE : '', name: name || '', uploading: false }
}

const FILE_LABELS: Record<FileField, string> = {
  file: 'Government ID (front)',
  file_back: 'Government ID (back)',
  dti_sec_file: 'DTI/SEC document',
  bir_file: 'BIR certificate',
  cafe_picture: 'Café picture'
}

const needsBack = computed(() => form.id_type !== 'passport')

// A kept document only counts for the type it was submitted as
watch(() => form.id_type, (type) => {
  if (type === prev.id_type) return
  for (const f of ['file', 'file_back'] as const) {
    if (files[f].path === KEEP_FILE) files[f] = { path: '', name: '', uploading: false }
  }
})
watch(() => form.cafe_doc_type, (type) => {
  if (type !== prev.cafe_doc_type && files.dti_sec_file.path === KEEP_FILE) {
    files.dti_sec_file = { path: '', name: '', uploading: false }
  }
})

const errors = ref<Record<string, string>>({})
const formError = ref('')
const submitting = ref(false)

async function onFilePicked(field: FileField, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const isPicture = field === 'cafe_picture'
  const allowed = isPicture ? ['jpg', 'jpeg', 'png'] : ['jpg', 'jpeg', 'png', 'pdf']
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const maxBytes = (isPicture ? 2 : 5) * 1024 * 1024
  if (!allowed.includes(ext)) {
    errors.value[field] = `${FILE_LABELS[field]} must be ${allowed.join(', ').toUpperCase()}.`
    return
  }
  if (file.size > maxBytes) {
    errors.value[field] = `${FILE_LABELS[field]} must not exceed ${isPicture ? 2 : 5}MB.`
    return
  }

  files[field].uploading = true
  delete errors.value[field]
  try {
    const payload = new FormData()
    payload.append('file', file)
    const res = await authService.uploadTempFile(payload)
    if (res.success && res.path) {
      files[field] = { path: res.path, name: file.name, uploading: false }
    } else {
      errors.value[field] = res.message || 'Upload failed. Please try again.'
    }
  } catch (e: any) {
    errors.value[field] = e?.data?.message || 'Upload failed. Please try again.'
  } finally {
    files[field].uploading = false
  }
}

function clearFile(field: FileField) {
  files[field] = { path: '', name: '', uploading: false }
}

function onTinInput() {
  const raw = form.tin_number.replace(/\D/g, '').slice(0, 14)
  form.tin_number = [raw.slice(0, 3), raw.slice(3, 6), raw.slice(6, 9), raw.slice(9, 14)].filter(Boolean).join('-')
}

const uploading = computed(() => Object.values(files).some(f => f.uploading))

async function submit() {
  formError.value = ''
  errors.value = {}

  const missing: string[] = []
  if (!files.file.path) missing.push(FILE_LABELS.file)
  if (needsBack.value && !files.file_back.path) missing.push(FILE_LABELS.file_back)
  if (!files.dti_sec_file.path) missing.push(`${form.cafe_doc_type} document`)
  if (!files.bir_file.path) missing.push(FILE_LABELS.bir_file)
  if (missing.length) {
    formError.value = `Please upload: ${missing.join(', ')}.`
    return
  }

  const payload: Record<string, string> = {
    ...form,
    tin_number: form.tin_number.trim(),
    file: files.file.path,
    dti_sec_file: files.dti_sec_file.path,
    bir_file: files.bir_file.path
  }
  if (needsBack.value) payload.file_back = files.file_back.path
  if (files.cafe_picture.path) payload.cafe_picture = files.cafe_picture.path

  submitting.value = true
  try {
    const res = await authService.resubmitApplication(props.uuid, payload)
    if (res.success) {
      emit('submitted')
    } else {
      formError.value = res.message || 'Resubmission failed. Please try again.'
    }
  } catch (e: any) {
    const errs = e?.data?.errors || e?.response?._data?.errors
    if (errs && typeof errs === 'object') {
      for (const [k, msgs] of Object.entries(errs)) {
        if (Array.isArray(msgs) && msgs.length) errors.value[k] = msgs[0] as string
      }
      formError.value = 'Please fix the highlighted fields.'
    } else {
      formError.value = e?.data?.message || 'Resubmission failed. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

const inputClass = (field: string) =>
  `mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm text-[#2d201b] focus:outline-none focus:ring-2 focus:ring-[#7B5A50]/30 ${errors.value[field] ? 'border-red-400' : 'border-[#7B5A50]/25'}`
</script>

<template>
  <form class="space-y-6" novalidate @submit.prevent="submit">
    <!-- Stays in view below the site header while scrolling the form -->
    <div
      v-if="editable.reason"
      class="sticky top-24 z-40 rounded-lg bg-white border-l-4 border-red-500 border-y border-r border-red-200 shadow-md px-4 py-3 flex items-start gap-3"
    >
      <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div class="min-w-0">
        <p class="text-[0.7rem] font-bold uppercase tracking-wider text-red-600">Fix this before resubmitting</p>
        <p class="text-sm font-semibold text-[#2d201b] whitespace-pre-line">{{ editable.reason }}</p>
      </div>
    </div>

    <div
      v-if="formError"
      class="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700"
      role="alert"
    >
      {{ formError }}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Owner Information -->
      <div class="bg-white rounded-2xl border border-[#7B5A50]/15 p-6 shadow-sm space-y-5">
        <div class="flex items-center gap-2.5 border-b border-gray-100 pb-3">
          <div class="w-8 h-8 rounded-lg bg-[#7B5A50]/10 text-[#7B5A50] flex items-center justify-center">
            <Icon name="heroicons:user" class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-base font-bold text-[#2d201b]">Owner Information</h2>
            <p class="text-[0.7rem] text-gray-500">Edit anything that needs correcting</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <label class="block">
            <span class="text-gray-500 font-medium">First Name</span>
            <input v-model="form.firstname" :class="inputClass('firstname')" />
            <span v-if="errors.firstname" class="text-red-600">{{ errors.firstname }}</span>
          </label>
          <label class="block">
            <span class="text-gray-500 font-medium">Last Name</span>
            <input v-model="form.lastname" :class="inputClass('lastname')" />
            <span v-if="errors.lastname" class="text-red-600">{{ errors.lastname }}</span>
          </label>
          <label class="block">
            <span class="text-gray-500 font-medium">Middle Name <span class="text-gray-400">(optional)</span></span>
            <input v-model="form.middlename" :class="inputClass('middlename')" />
          </label>
          <label class="block">
            <span class="text-gray-500 font-medium">Username</span>
            <input v-model="form.username" :class="inputClass('username')" />
            <span v-if="errors.username" class="text-red-600">{{ errors.username }}</span>
          </label>
          <div class="block">
            <span class="text-gray-500 font-medium">Email Address</span>
            <p class="mt-1 px-3 py-2 text-sm text-gray-500 break-all">{{ email }}</p>
          </div>
          <label class="block">
            <span class="text-gray-500 font-medium">Phone Number</span>
            <input v-model="form.phone_number" placeholder="+639XXXXXXXXX or 082XXXXXXX" :class="inputClass('phone_number')" />
            <span v-if="errors.phone_number" class="text-red-600">{{ errors.phone_number }}</span>
          </label>
          <label class="block sm:col-span-2">
            <span class="text-gray-500 font-medium">Residential / Owner Address</span>
            <input v-model="form.owner_address" :class="inputClass('owner_address')" />
            <span v-if="errors.owner_address" class="text-red-600">{{ errors.owner_address }}</span>
          </label>
          <label class="block sm:col-span-2">
            <span class="text-gray-500 font-medium">ID Type</span>
            <select v-model="form.id_type" :class="inputClass('id_type')">
              <option v-for="t in ID_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
            <span v-if="errors.id_type" class="text-red-600">{{ errors.id_type }}</span>
          </label>
        </div>
      </div>

      <!-- Cafe & Branch -->
      <div class="bg-white rounded-2xl border border-[#7B5A50]/15 p-6 shadow-sm space-y-5">
        <div class="flex items-center gap-2.5 border-b border-gray-100 pb-3">
          <div class="w-8 h-8 rounded-lg bg-[#7B5A50]/10 text-[#7B5A50] flex items-center justify-center">
            <Icon name="heroicons:building-storefront" class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-base font-bold text-[#2d201b]">Café & Branch Details</h2>
            <p class="text-[0.7rem] text-gray-500">Commercial entity and main location details</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <label class="block">
            <span class="text-gray-500 font-medium">Café / Business Name</span>
            <input v-model="form.cafe_name" :class="inputClass('cafe_name')" />
            <span v-if="errors.cafe_name" class="text-red-600">{{ errors.cafe_name }}</span>
          </label>
          <label class="block">
            <span class="text-gray-500 font-medium">Business Structure</span>
            <select v-model="form.cafe_doc_type" :class="inputClass('cafe_doc_type')">
              <option value="DTI">DTI</option>
              <option value="SEC">SEC</option>
            </select>
          </label>
          <label class="block sm:col-span-2">
            <span class="text-gray-500 font-medium">Main Branch Name</span>
            <input v-model="form.branch_name" :class="inputClass('branch_name')" />
            <span v-if="errors.branch_name" class="text-red-600">{{ errors.branch_name }}</span>
          </label>
          <label class="block sm:col-span-2">
            <span class="text-gray-500 font-medium">Branch Location Address</span>
            <input v-model="form.address" :class="inputClass('address')" />
            <span v-if="errors.address" class="text-red-600">{{ errors.address }}</span>
          </label>
          <label class="block">
            <span class="text-gray-500 font-medium">Branch Contact Email</span>
            <input v-model="form.cafe_email" type="email" :class="inputClass('cafe_email')" />
            <span v-if="errors.cafe_email" class="text-red-600">{{ errors.cafe_email }}</span>
          </label>
          <label class="block">
            <span class="text-gray-500 font-medium">Branch Contact Phone</span>
            <input v-model="form.cafe_phonenumber" placeholder="+639XXXXXXXXX or 082XXXXXXX" :class="inputClass('cafe_phonenumber')" />
            <span v-if="errors.cafe_phonenumber" class="text-red-600">{{ errors.cafe_phonenumber }}</span>
          </label>
          <label class="block">
            <span class="text-gray-500 font-medium">TIN</span>
            <input
              v-model="form.tin_number"
              placeholder="XXX-XXX-XXX-00000"
              :class="inputClass('tin_number') + ' font-mono'"
              @input="onTinInput"
            />
            <span v-if="errors.tin_number" class="text-red-600">{{ errors.tin_number }}</span>
          </label>
          <label class="block">
            <span class="text-gray-500 font-medium">BIR Registration Date</span>
            <input v-model="form.bir_registered_at" type="date" :class="inputClass('bir_registered_at')" />
            <span v-if="errors.bir_registered_at" class="text-red-600">{{ errors.bir_registered_at }}</span>
          </label>
          <label class="block sm:col-span-2">
            <span class="text-gray-500 font-medium">VAT Registration</span>
            <select v-model="form.vat" :class="inputClass('vat')">
              <option value="non-vat">Non-VAT</option>
              <option value="vat-registered">VAT Registered</option>
            </select>
          </label>
        </div>
      </div>
    </div>

    <!-- Documents -->
    <div class="bg-white rounded-2xl border border-[#7B5A50]/15 p-6 md:p-8 shadow-sm space-y-5">
      <div class="flex items-center gap-2.5 border-b border-gray-100 pb-4">
        <div class="w-8 h-8 rounded-lg bg-[#7B5A50]/10 text-[#7B5A50] flex items-center justify-center">
          <Icon name="heroicons:document-check" class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-base font-bold text-[#2d201b]">Documents</h2>
          <p class="text-[0.7rem] text-gray-500">Your previous files are kept. Replace only the ones that need it.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <template v-for="field in (['file', 'file_back', 'bir_file', 'dti_sec_file', 'cafe_picture'] as const)" :key="field">
          <div
            v-if="field !== 'file_back' || needsBack"
            class="p-3.5 rounded-xl border text-xs space-y-2"
            :class="errors[field] ? 'border-red-300 bg-red-50/40' : files[field].path ? 'border-emerald-200 bg-emerald-50/30' : 'border-[#7B5A50]/20 bg-[#FFF8EA]/50'"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="font-bold text-[#2d201b]">
                {{ field === 'dti_sec_file' ? `${form.cafe_doc_type} Document` : FILE_LABELS[field] }}
                <span v-if="field === 'cafe_picture'" class="font-normal text-gray-400">(optional)</span>
              </p>
              <span v-if="files[field].path === KEEP_FILE" class="text-[0.65rem] font-bold text-emerald-700 uppercase">Kept</span>
              <span v-else-if="files[field].path" class="text-[0.65rem] font-bold text-emerald-700 uppercase">New file</span>
            </div>
            <p v-if="files[field].name" class="text-gray-600 break-all">{{ files[field].name }}</p>
            <div class="flex items-center gap-3">
              <label class="cursor-pointer font-semibold text-[#7B5A50] hover:underline">
                {{ files[field].uploading ? 'Uploading...' : files[field].path ? 'Replace' : 'Upload' }}
                <input
                  type="file"
                  class="sr-only"
                  :disabled="files[field].uploading"
                  :accept="field === 'cafe_picture' ? '.jpg,.jpeg,.png,image/jpeg,image/png' : '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf'"
                  @change="onFilePicked(field, $event)"
                />
              </label>
              <button
                v-if="field === 'cafe_picture' && files[field].path"
                type="button"
                class="font-semibold text-gray-500 hover:underline"
                @click="clearFile(field)"
              >
                Remove
              </button>
            </div>
            <p v-if="errors[field]" class="text-red-600">{{ errors[field] }}</p>
          </div>
        </template>
      </div>
    </div>

    <div class="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
      <button
        type="button"
        class="w-full sm:w-auto px-4 py-2 rounded-lg border border-[#7B5A50] text-[#7B5A50] text-xs font-medium hover:bg-[#7B5A50]/10 transition"
        :disabled="submitting"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="w-full sm:w-auto px-5 py-2 rounded-lg bg-[#7B5A50] hover:bg-[#65463d] text-white text-xs font-bold transition disabled:opacity-50"
        :disabled="submitting || uploading"
      >
        {{ submitting ? 'Resubmitting...' : 'Resubmit for Review' }}
      </button>
    </div>
  </form>
</template>
