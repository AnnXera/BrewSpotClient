<script setup lang="ts">
// Edit a rejected side branch and send it back for admin review. Prefilled with the
// branch as it was rejected; the BIR file and picture are optional (current ones kept).
import type { BranchDetail } from '~/services/OwnerProfileService'

const props = defineProps<{
  show: boolean
  branch: BranchDetail
  reason: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'resubmitted', branch: BranchDetail | undefined): void
}>()

const ownerService = useOwnerProfileService()

const currentBir = computed(() => props.branch.documents?.find(d => d.doc_type === 'BIR') ?? null)

// Side branches share the main TIN (XXX-XXX-XXX); only the 5-digit branch code is theirs.
const tinPrefix = computed(() => {
  const m = (currentBir.value?.tin_number ?? '').match(/^(\d{3}-\d{3}-\d{3})-?(\d{0,5})$/)
  return m ? m[1] : null
})

const form = ref({
  branch_name: '',
  address: '',
  cafe_email: '',
  mobile: '', // 10 digits starting with 9
  tin: '', // branch code when tinPrefix is known, else the full TIN
  vat: 'vat-registered',
  bir_registered_at: '',
})
const birFile = ref<File | null>(null)
const picture = ref<File | null>(null)
const errors = ref<Record<string, string>>({})
const formError = ref('')
const saving = ref(false)

const toDateInput = (iso: string | null | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function reset() {
  const b = props.branch
  const bir = currentBir.value
  const tin = bir?.tin_number ?? ''
  form.value = {
    branch_name: b.branch_name ?? '',
    address: b.address ?? '',
    cafe_email: b.cafe_email ?? '',
    mobile: (b.cafe_phonenumber ?? '').replace(/^\+63/, '').replace(/\D/g, ''),
    tin: tinPrefix.value ? tin.slice(tinPrefix.value.length).replace(/\D/g, '') : tin,
    vat: bir?.vat ?? 'vat-registered',
    bir_registered_at: toDateInput(bir?.registered_at),
  }
  birFile.value = null
  picture.value = null
  errors.value = {}
  formError.value = ''
}

watch(() => props.show, (open) => { if (open) reset() }, { immediate: true })

const fullTin = computed(() => (tinPrefix.value ? `${tinPrefix.value}-${form.value.tin}` : form.value.tin))

function onTin(e: Event) {
  const input = e.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '')
  form.value.tin = tinPrefix.value
    ? digits.slice(0, 5)
    : [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 14)].filter(Boolean).join('-')
  input.value = form.value.tin
  delete errors.value.tin_number
}

function onMobile(e: Event) {
  const input = e.target as HTMLInputElement
  form.value.mobile = input.value.replace(/\D/g, '').slice(0, 10)
  input.value = form.value.mobile
  delete errors.value.cafe_phonenumber
}

function pickFile(e: Event, kind: 'bir' | 'picture') {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (!file) return
  const field = kind === 'bir' ? 'bir_file' : 'cafe_picture'
  delete errors.value[field]
  const limit = kind === 'bir' ? 5 : 2
  if (file.size > limit * 1024 * 1024) {
    errors.value[field] = `File must not exceed ${limit}MB.`
    return
  }
  if (kind === 'bir') birFile.value = file
  else picture.value = file
}

function validate() {
  const e: Record<string, string> = {}
  const f = form.value
  if (!f.branch_name.trim()) e.branch_name = 'Branch name is required.'
  if (!f.address.trim()) e.address = 'Branch address is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.cafe_email.trim())) e.cafe_email = 'Enter a valid email address.'
  if (!/^9\d{9}$/.test(f.mobile)) e.cafe_phonenumber = 'Phone number must be 10 digits starting with 9.'
  const tinDigits = fullTin.value.replace(/\D/g, '')
  if (tinDigits.length !== 14) e.tin_number = tinPrefix.value ? 'Branch code must be 5 digits (e.g. 00001).' : 'TIN must follow the format XXX-XXX-XXX-XXXXX.'
  else if (tinDigits.endsWith('00000')) e.tin_number = 'Branch code 00000 is reserved for the main branch.'
  if (!f.bir_registered_at) e.bir_registered_at = 'BIR registered date is required.'
  if (!birFile.value && !currentBir.value) e.bir_file = 'BIR file is required.'
  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  formError.value = ''
  if (saving.value || !validate()) return

  const fd = new FormData()
  fd.append('branch_name', form.value.branch_name.trim())
  fd.append('address', form.value.address.trim())
  fd.append('cafe_email', form.value.cafe_email.trim())
  fd.append('cafe_phonenumber', `+63${form.value.mobile}`)
  fd.append('tin_number', fullTin.value)
  fd.append('vat', form.value.vat)
  fd.append('bir_registered_at', form.value.bir_registered_at)
  if (birFile.value) fd.append('bir_file', birFile.value)
  if (picture.value) fd.append('cafe_picture', picture.value)

  saving.value = true
  try {
    const res = await ownerService.resubmitBranch(props.branch.uuid, fd)
    if (res.success) emit('resubmitted', res.branch)
    else formError.value = res.message || 'The branch could not be resubmitted.'
  } catch (err: any) {
    const apiErrors = err?.data?.errors as Record<string, string[]> | undefined
    if (apiErrors) errors.value = Object.fromEntries(Object.entries(apiErrors).map(([k, v]) => [k, v[0] ?? 'Invalid value.']))
    formError.value = apiErrors ? 'Please fix the highlighted fields.' : (err?.data?.message || 'The branch could not be resubmitted. Please try again.')
  } finally {
    saving.value = false
  }
}

const inputClass = (field: string) => [
  'w-full h-11 rounded-xl border bg-white px-3.5 text-sm font-semibold text-[#2D201B] outline-none transition-all placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15',
  errors.value[field] ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]',
]
const labelClass = 'block text-xs font-bold text-[#3B1F0E] mb-1'
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-6">
      <div class="fixed inset-0 bg-black/45 backdrop-blur-sm" aria-hidden="true" @click="emit('close')" />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="resubmit-branch-title"
        class="relative bg-white rounded-3xl w-full max-w-[640px] max-h-[calc(100dvh-1.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4]"
        novalidate
        @submit.prevent="submit"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-[#EEDFC4] bg-[#FDFBF7] rounded-t-3xl">
          <div class="flex items-center gap-4 min-w-0">
            <div class="w-11 h-11 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0">
              <Icon name="heroicons:arrow-path-rounded-square" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h2 id="resubmit-branch-title" class="text-xl font-display font-extrabold text-[#3B1F0E]">Edit and Resubmit</h2>
              <p class="mt-0.5 text-[13px] text-[#8A6E64] truncate">{{ branch.branch_name }}</p>
            </div>
          </div>
          <button type="button" aria-label="Close" class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] flex items-center justify-center shrink-0" @click="emit('close')">
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>

        <div class="px-6 py-5 flex flex-col gap-5 overflow-y-auto">
          <!-- Why it was rejected -->
          <div class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-900 flex items-start gap-2.5">
            <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0 text-red-600 mt-px" />
            <div>
              <p class="font-bold">Admin's reason for rejecting</p>
              <p class="mt-0.5">{{ reason || 'No reason was given.' }}</p>
            </div>
          </div>

          <!-- Branch details -->
          <fieldset class="flex flex-col gap-3.5" :disabled="saving">
            <legend class="text-sm font-bold text-[#3D2B24] mb-2">Branch details</legend>
            <div>
              <label for="rs-name" :class="labelClass">Branch Name</label>
              <input id="rs-name" v-model="form.branch_name" type="text" maxlength="150" :class="inputClass('branch_name')" @input="delete errors.branch_name" />
              <p v-if="errors.branch_name" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.branch_name }}</p>
            </div>
            <div>
              <label for="rs-address" :class="labelClass">Address</label>
              <input id="rs-address" v-model="form.address" type="text" :class="inputClass('address')" @input="delete errors.address" />
              <p v-if="errors.address" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.address }}</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label for="rs-email" :class="labelClass">Email Address</label>
                <input id="rs-email" v-model="form.cafe_email" type="email" :class="inputClass('cafe_email')" @input="delete errors.cafe_email" />
                <p v-if="errors.cafe_email" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.cafe_email }}</p>
              </div>
              <div>
                <label for="rs-phone" :class="labelClass">Phone Number</label>
                <div class="h-11 rounded-xl border bg-white flex items-center overflow-hidden focus-within:border-[#3B1F0E] focus-within:ring-2 focus-within:ring-[#3B1F0E]/15" :class="errors.cafe_phonenumber ? 'border-red-400' : 'border-[#D8C7B5]'">
                  <span class="bg-[#F5EFE6] border-r border-[#E0D0BE] text-[#3B1F0E] font-bold text-xs px-3 h-full flex items-center shrink-0 select-none">+63</span>
                  <input id="rs-phone" :value="form.mobile" type="tel" inputmode="numeric" maxlength="10" placeholder="9123456789" class="w-full h-full px-3 text-sm font-semibold text-[#2D201B] bg-transparent outline-none" @input="onMobile" />
                </div>
                <p v-if="errors.cafe_phonenumber" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.cafe_phonenumber }}</p>
              </div>
            </div>
            <div>
              <span :class="labelClass">Branch Picture <span class="font-normal text-[#9E7060]">(optional)</span></span>
              <label class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#DED4CA] bg-white text-xs font-semibold text-[#5B463C] hover:border-[#7D5A50] cursor-pointer">
                <Icon name="heroicons:photo" class="size-3.5 text-[#7D5A50]" />
                <span class="truncate max-w-[220px]">{{ picture ? picture.name : 'Keep current picture' }}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="pickFile($event, 'picture')" />
              </label>
              <p v-if="errors.cafe_picture" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.cafe_picture }}</p>
            </div>
          </fieldset>

          <!-- BIR -->
          <fieldset class="flex flex-col gap-3.5" :disabled="saving">
            <legend class="text-sm font-bold text-[#3D2B24] mb-2">BIR registration</legend>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label for="rs-tin" :class="labelClass">{{ tinPrefix ? 'BIR Branch Code' : 'TIN Number' }}</label>
                <div v-if="tinPrefix" class="h-11 rounded-xl border bg-white flex items-center overflow-hidden focus-within:border-[#3B1F0E] focus-within:ring-2 focus-within:ring-[#3B1F0E]/15" :class="errors.tin_number ? 'border-red-400' : 'border-[#D8C7B5]'">
                  <span class="bg-[#F5EFE6] border-r border-[#E0D0BE] text-[#3B1F0E] font-bold text-xs px-3 h-full flex items-center shrink-0 select-none tabular-nums">{{ tinPrefix }}-</span>
                  <input id="rs-tin" :value="form.tin" type="text" inputmode="numeric" maxlength="5" placeholder="00001" class="w-full h-full px-3 text-sm font-semibold text-[#2D201B] bg-transparent outline-none tabular-nums" @input="onTin" />
                </div>
                <input v-else id="rs-tin" :value="form.tin" type="text" inputmode="numeric" maxlength="17" placeholder="XXX-XXX-XXX-XXXXX" :class="inputClass('tin_number')" @input="onTin" />
                <p v-if="errors.tin_number" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.tin_number }}</p>
              </div>
              <div>
                <label for="rs-vat" :class="labelClass">VAT Status</label>
                <select id="rs-vat" v-model="form.vat" :class="inputClass('vat')">
                  <option value="vat-registered">VAT-registered</option>
                  <option value="non-vat">Non-VAT</option>
                </select>
              </div>
              <div>
                <label for="rs-date" :class="labelClass">Registered On</label>
                <input id="rs-date" v-model="form.bir_registered_at" type="date" :class="inputClass('bir_registered_at')" @input="delete errors.bir_registered_at" />
                <p v-if="errors.bir_registered_at" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.bir_registered_at }}</p>
              </div>
              <div>
                <span :class="labelClass">BIR Certificate <span v-if="currentBir" class="font-normal text-[#9E7060]">(optional)</span></span>
                <label class="h-11 inline-flex w-full items-center gap-2 px-3.5 rounded-xl border bg-white text-xs font-semibold text-[#5B463C] hover:border-[#7D5A50] cursor-pointer" :class="errors.bir_file ? 'border-red-400' : 'border-[#D8C7B5]'">
                  <Icon name="heroicons:document-arrow-up" class="size-4 text-[#7D5A50] shrink-0" />
                  <span class="truncate">{{ birFile ? birFile.name : currentBir ? 'Keep current file' : 'Upload BIR file' }}</span>
                  <input type="file" accept="image/jpeg,image/png,application/pdf" class="sr-only" @change="pickFile($event, 'bir')" />
                </label>
                <p v-if="errors.bir_file" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.bir_file }}</p>
              </div>
            </div>
          </fieldset>

          <p v-if="formError" role="alert" class="text-sm text-red-700 font-semibold">{{ formError }}</p>
        </div>

        <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#EEDFC4]">
          <button type="button" class="px-4 py-2.5 rounded-xl border border-[#DED4CA] bg-white text-sm font-semibold text-[#5B463C] hover:bg-[#F8EFE7]" @click="emit('close')">
            Cancel
          </button>
          <button type="submit" class="px-4 py-2.5 rounded-xl bg-[#7D5A50] text-sm font-bold text-[#FFF8EA] hover:bg-[#6A4A41] disabled:opacity-50 inline-flex items-center gap-2" :disabled="saving">
            <Icon v-if="saving" name="heroicons:arrow-path" class="size-4 animate-spin" />
            <span>{{ saving ? 'Resubmitting...' : 'Resubmit for review' }}</span>
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
