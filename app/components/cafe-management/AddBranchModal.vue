<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  show: boolean
  saving?: boolean
  backendErrors?: Record<string, string[]>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: FormData): void
}>()

// Mirrors StoreBranchRequest on the server
const STEP_FIELDS: Record<number, string[]> = {
  1: ['branch_name', 'address', 'cafe_email', 'cafe_phonenumber', 'cafe_picture'],
  2: ['tin_number', 'vat', 'bir_registered_at', 'bir_file']
}

const ownerService = useOwnerProfileService()

const currentStep = ref(1)
const checkingContact = ref(false)

const form = ref({
  branch_name: '',
  address: '',
  cafe_email: '',
  cafeMobileDigits: '',
  tin_number: '',
  vat: 'vat-registered',
  bir_registered_at: ''
})
const birFile = ref<File | null>(null)
const cafePicture = ref<File | null>(null)

const errors = ref<Record<string, string>>({})

const hasBackendErrors = computed(() => Object.keys(props.backendErrors || {}).length > 0)

// Jump to the first step that has a backend error
watch(() => props.backendErrors, (newVal) => {
  if (!newVal || Object.keys(newVal).length === 0) return
  const fields = Object.keys(newVal)
  const step = Object.keys(STEP_FIELDS).map(Number).find(s => STEP_FIELDS[s]!.some(f => fields.includes(f)))
  currentStep.value = step ?? 1
}, { deep: true })

function fieldError(key: string): string | undefined {
  return errors.value[key] || props.backendErrors?.[key]?.[0]
}

function onCafeMobileInput(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.cafeMobileDigits = target.value.replace(/[^0-9]/g, '').slice(0, 10)
  target.value = form.value.cafeMobileDigits
}

function validateStep(step: number): boolean {
  errors.value = {}
  if (step === 1) {
    if (!form.value.branch_name.trim()) errors.value.branch_name = 'Branch name is required'
    if (!form.value.address.trim()) errors.value.address = 'Branch address is required'

    if (!form.value.cafe_email.trim()) errors.value.cafe_email = 'Branch email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.cafe_email.trim())) errors.value.cafe_email = 'Enter a valid email address'

    if (!form.value.cafeMobileDigits) errors.value.cafe_phonenumber = 'Branch phone number is required'
    else if (!/^9\d{9}$/.test(form.value.cafeMobileDigits)) errors.value.cafe_phonenumber = 'Phone number must be 10 digits starting with 9.'

    if (cafePicture.value && cafePicture.value.size > 2 * 1024 * 1024) errors.value.cafe_picture = 'Branch picture must not exceed 2MB.'
  } else if (step === 2) {
    if (!form.value.tin_number.trim()) errors.value.tin_number = 'TIN number is required'
    if (!form.value.bir_registered_at) errors.value.bir_registered_at = 'BIR registered date is required'
    if (!birFile.value) errors.value.bir_file = 'BIR file is required'
    else if (birFile.value.size > 5 * 1024 * 1024) errors.value.bir_file = 'BIR file must not exceed 5MB.'
  }
  return Object.keys(errors.value).length === 0
}

// Asks the server whether the email / phone is already used by another branch or user
async function checkContactAvailability(): Promise<boolean> {
  checkingContact.value = true
  try {
    await ownerService.checkBranchContact({
      cafe_email: form.value.cafe_email.trim(),
      cafe_phonenumber: `+63${form.value.cafeMobileDigits}`
    })
    return true
  } catch (e: any) {
    const serverErrors = (e?.response?._data || e?.response?.data || e?.data)?.errors as Record<string, string[]> | undefined
    if (serverErrors) {
      for (const [key, msgs] of Object.entries(serverErrors)) {
        if (msgs?.[0]) errors.value[key] = msgs[0]
      }
      return false
    }
    // Network or unexpected error: let the final submit validate instead of blocking here
    return true
  } finally {
    checkingContact.value = false
  }
}

async function nextStep() {
  if (!validateStep(currentStep.value)) return
  if (currentStep.value === 1 && !(await checkContactAvailability())) return
  currentStep.value++
}

function prevStep() {
  currentStep.value--
}

function handleFileChange(e: Event, type: 'bir' | 'picture') {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    if (type === 'bir') birFile.value = target.files[0]
    if (type === 'picture') cafePicture.value = target.files[0]
  }
}

function handleSubmit() {
  if (!validateStep(1)) {
    currentStep.value = 1
    return
  }
  if (!validateStep(2)) return

  const formData = new FormData()
  formData.append('branch_name', form.value.branch_name.trim())
  formData.append('address', form.value.address.trim())
  formData.append('cafe_email', form.value.cafe_email.trim())
  formData.append('cafe_phonenumber', `+63${form.value.cafeMobileDigits}`)
  if (cafePicture.value) formData.append('cafe_picture', cafePicture.value)

  formData.append('tin_number', form.value.tin_number.trim())
  formData.append('vat', form.value.vat)
  formData.append('bir_registered_at', form.value.bir_registered_at)
  if (birFile.value) formData.append('bir_file', birFile.value)

  emit('save', formData)
}
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
    <div v-if="show" class="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-y-auto">
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" @click="emit('close')"></div>
      <div class="relative bg-white border border-[#EEDFC4] rounded-3xl w-full max-w-[806px] p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] my-auto">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-[#F3E7D2] pb-4">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-[#7D5A50] text-white flex items-center justify-center shadow-md">
              <Icon name="heroicons:building-storefront" class="w-6 h-6" />
            </div>
            <div>
              <h2 class="font-display font-extrabold text-xl text-[#3D2B24]">Add New Cafe Branch</h2>
              <p class="text-xs text-[#9E7060]">Register an additional branch location with its details and legal documents.</p>
            </div>
          </div>
          <button @click="emit('close')" class="p-2 rounded-lg text-[#9E7060] hover:bg-[#FDF3E7] transition-colors">
            <Icon name="heroicons:x-mark" class="w-6 h-6" />
          </button>
        </div>

        <!-- Backend Errors Alert -->
        <div v-if="hasBackendErrors" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs shrink-0">
          <p class="font-bold mb-2 text-sm flex items-center gap-2">
            <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-red-500" />
            Please correct the following errors:
          </p>
          <ul class="list-disc pl-8 space-y-1">
            <template v-for="(msgs, field) in backendErrors" :key="field">
              <li v-for="msg in msgs" :key="msg">{{ msg }}</li>
            </template>
          </ul>
        </div>

        <!-- Form Fields -->
        <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto py-3 pr-1">
          <!-- SECTION 1: General Information -->
          <div v-show="currentStep === 1" class="space-y-4">
            <h3 class="text-sm font-extrabold text-[#7D5A50] uppercase tracking-wider">1. General Information</h3>
            <div>
              <label class="block text-xs font-bold text-[#3D2B24] mb-1">Branch Name *</label>
              <input
                type="text"
                v-model="form.branch_name"
                maxlength="150"
                placeholder="e.g. La Vida Cafe - Brew City Branch"
                class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
              />
              <p v-if="fieldError('branch_name')" class="text-xs text-red-600 mt-1 font-medium">{{ fieldError('branch_name') }}</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#3D2B24] mb-1">Full Branch Address *</label>
              <input
                type="text"
                v-model="form.address"
                placeholder="e.g. 78 Latte Lane, Espresso Heights, Metro City"
                class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
              />
              <p v-if="fieldError('address')" class="text-xs text-red-600 mt-1 font-medium">{{ fieldError('address') }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">Branch Email *</label>
                <input
                  type="email"
                  v-model="form.cafe_email"
                  maxlength="255"
                  placeholder="branch@brewspot.com"
                  class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
                />
                <p v-if="fieldError('cafe_email')" class="text-xs text-red-600 mt-1 font-medium">{{ fieldError('cafe_email') }}</p>
              </div>

              <div class="space-y-1">
                <label class="block text-xs font-bold text-[#3D2B24]">Branch Phone Number *</label>
                <div
                  class="flex items-center rounded-xl border bg-[#FDF8F3] overflow-hidden transition focus-within:border-[#7D5A50] focus-within:ring-2 focus-within:ring-[#7D5A50]/20 h-[42px]"
                  :class="fieldError('cafe_phonenumber') ? 'border-red-500' : 'border-[#EEDFC4]'"
                >
                  <span class="bg-gray-100 border-r border-[#EEDFC4] shrink-0 h-full flex items-center px-3 text-[#3D2B24] font-semibold text-xs">+63</span>
                  <input
                    v-model="form.cafeMobileDigits"
                    type="tel"
                    inputmode="numeric"
                    maxlength="10"
                    placeholder="9123456789"
                    class="w-full h-full px-3 text-sm text-[#3D2B24] bg-transparent outline-none"
                    @input="onCafeMobileInput"
                  />
                </div>
                <p v-if="fieldError('cafe_phonenumber')" class="text-xs text-red-600 font-medium">{{ fieldError('cafe_phonenumber') }}</p>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#3D2B24] mb-1">Branch Picture</label>
              <div class="relative group cursor-pointer border-2 border-dashed border-[#EEDFC4] rounded-xl hover:border-[#7D5A50] hover:bg-[#FDF8F3] transition-all overflow-hidden flex items-center justify-center p-3 h-11 bg-[#FDF8F3]">
                <input type="file" @change="e => handleFileChange(e, 'picture')" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".jpg,.jpeg,.png,.webp" />
                <div class="flex items-center gap-2 text-[#9E7060] group-hover:text-[#7D5A50] transition-colors truncate">
                  <Icon name="heroicons:photo" class="w-5 h-5 shrink-0" />
                  <span class="text-xs font-bold truncate">{{ cafePicture ? cafePicture.name : 'Upload Branch Picture (JPG, PNG, WEBP, max 2MB)' }}</span>
                </div>
              </div>
              <p v-if="fieldError('cafe_picture')" class="text-xs text-red-600 mt-1 font-medium">{{ fieldError('cafe_picture') }}</p>
            </div>
          </div>

          <!-- SECTION 2: Legal Documents -->
          <div v-show="currentStep === 2" class="space-y-4">
            <h3 class="text-sm font-extrabold text-[#7D5A50] uppercase tracking-wider">2. Legal Documents (BIR)</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">TIN Number *</label>
                <input
                  type="text"
                  v-model="form.tin_number"
                  maxlength="50"
                  placeholder="e.g. 123-456-789-000"
                  class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
                />
                <p v-if="fieldError('tin_number')" class="text-xs text-red-600 mt-1 font-medium">{{ fieldError('tin_number') }}</p>
              </div>
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">VAT Status *</label>
                <select v-model="form.vat" class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]">
                  <option value="vat-registered">VAT Registered</option>
                  <option value="non-vat">Non-VAT</option>
                </select>
                <p v-if="fieldError('vat')" class="text-xs text-red-600 mt-1 font-medium">{{ fieldError('vat') }}</p>
              </div>
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">BIR Registered Date *</label>
                <input type="date" v-model="form.bir_registered_at" class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]" />
                <p v-if="fieldError('bir_registered_at')" class="text-xs text-red-600 mt-1 font-medium">{{ fieldError('bir_registered_at') }}</p>
              </div>
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">BIR File *</label>
                <div class="relative group cursor-pointer border-2 border-dashed border-[#EEDFC4] rounded-xl hover:border-[#7D5A50] hover:bg-[#FDF8F3] transition-all overflow-hidden flex items-center justify-center p-3 h-11 bg-[#FDF8F3]">
                  <input type="file" @change="e => handleFileChange(e, 'bir')" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".jpg,.jpeg,.png,.pdf" />
                  <div class="flex items-center gap-2 text-[#9E7060] group-hover:text-[#7D5A50] transition-colors truncate">
                    <Icon name="heroicons:arrow-up-tray" class="w-5 h-5 shrink-0" />
                    <span class="text-xs font-bold truncate">{{ birFile ? birFile.name : 'Upload BIR Document (JPG, PNG, PDF, max 5MB)' }}</span>
                  </div>
                </div>
                <p v-if="fieldError('bir_file')" class="text-xs text-red-600 mt-1 font-medium">{{ fieldError('bir_file') }}</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-4 mt-6 border-t border-[#F3E7D2]">
            <div class="flex items-center gap-2">
              <button
                v-if="currentStep > 1"
                type="button"
                @click="prevStep"
                class="px-4 py-2 rounded-xl border border-[#EEDFC4] text-[#7D5A50] font-bold text-xs hover:bg-[#FDF3E7] transition"
              >
                Back
              </button>
              <button
                v-if="currentStep < 2"
                type="button"
                @click="nextStep"
                :disabled="checkingContact"
                class="px-4 py-2 rounded-xl bg-[#FDF8F3] border border-[#EEDFC4] text-[#7D5A50] font-bold text-xs hover:bg-[#FCDEC0]/40 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Icon v-if="checkingContact" name="heroicons:arrow-path" class="w-3.5 h-3.5 animate-spin" />
                Next Step
              </button>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                @click="emit('close')"
                class="px-5 py-2.5 rounded-xl border border-[#EEDFC4] text-[#7D5A50] font-semibold text-sm hover:bg-[#FDF3E7] transition"
              >
                Cancel
              </button>
              <button
                v-if="currentStep === 2"
                type="button"
                @click="handleSubmit"
                :disabled="saving"
                class="px-6 py-2.5 rounded-xl bg-[#7D5A50] text-white font-bold text-sm hover:bg-[#65463D] transition shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <Icon v-if="saving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                <span>Create Branch</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>
