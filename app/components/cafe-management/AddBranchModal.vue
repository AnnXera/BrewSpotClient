<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import DropdownList from '~/components/common/DropdownList.vue'
import EmilCalendar from '~/components/common/EmilCalendar.vue'

const props = defineProps<{
  show: boolean
  saving?: boolean
  backendErrors?: Record<string, string[]>
  // Main branch's 9-digit TIN (XXX-XXX-XXX). Side branches share it and only add their own branch code.
  mainTinPrefix?: string | null
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
const cafePicturePreview = ref<string | null>(null)

const pictureInputRef = ref<HTMLInputElement | null>(null)
const birInputRef = ref<HTMLInputElement | null>(null)

const errors = ref<Record<string, string>>({})

const hasBackendErrors = computed(() => Object.keys(props.backendErrors || {}).length > 0)

// Reset or populate on show
watch(() => props.show, (open) => {
  if (open) {
    currentStep.value = 1
    errors.value = {}
    checkingContact.value = false
  } else {
    if (cafePicturePreview.value) {
      URL.revokeObjectURL(cafePicturePreview.value)
      cafePicturePreview.value = null
    }
  }
})

// Jump to the first step that has a backend error
watch(() => props.backendErrors, (newVal) => {
  if (!newVal || Object.keys(newVal).length === 0) return
  const fields = Object.keys(newVal)
  const step = Object.keys(STEP_FIELDS).map(Number).find(s => STEP_FIELDS[s]!.some(f => fields.includes(f)))
  currentStep.value = step ?? 1
}, { deep: true })

onBeforeUnmount(() => {
  if (cafePicturePreview.value) URL.revokeObjectURL(cafePicturePreview.value)
})

function fieldError(key: string): string | undefined {
  return errors.value[key] || props.backendErrors?.[key]?.[0]
}

function onCafeMobileInput(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.cafeMobileDigits = target.value.replace(/[^0-9]/g, '').slice(0, 10)
  target.value = form.value.cafeMobileDigits
  if (errors.value.cafe_phonenumber) delete errors.value.cafe_phonenumber
}

// With a main TIN on file, tin_number holds only the 5-digit branch code; otherwise the full TIN
function onTinInput(event: Event) {
  const target = event.target as HTMLInputElement
  const digits = target.value.replace(/[^0-9]/g, '')
  form.value.tin_number = props.mainTinPrefix
    ? digits.slice(0, 5)
    : [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 14)].filter(Boolean).join('-')
  target.value = form.value.tin_number
  if (errors.value.tin_number) delete errors.value.tin_number
}

const fullTin = computed(() =>
  props.mainTinPrefix ? `${props.mainTinPrefix}-${form.value.tin_number}` : form.value.tin_number
)

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function onPictureSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      errors.value.cafe_picture = 'Branch picture must not exceed 2MB.'
      return
    }
    delete errors.value.cafe_picture
    cafePicture.value = file
    if (cafePicturePreview.value) URL.revokeObjectURL(cafePicturePreview.value)
    cafePicturePreview.value = URL.createObjectURL(file)
  }
}

function removePicture() {
  if (cafePicturePreview.value) URL.revokeObjectURL(cafePicturePreview.value)
  cafePicture.value = null
  cafePicturePreview.value = null
  if (pictureInputRef.value) pictureInputRef.value.value = ''
}

function onBirSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      errors.value.bir_file = 'BIR file must not exceed 5MB.'
      return
    }
    delete errors.value.bir_file
    birFile.value = file
  }
}

function removeBirFile() {
  birFile.value = null
  if (birInputRef.value) birInputRef.value.value = ''
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
    const tinDigits = fullTin.value.replace(/[^0-9]/g, '')
    if (!form.value.tin_number.trim()) errors.value.tin_number = props.mainTinPrefix ? 'Branch code is required' : 'TIN number is required'
    else if (tinDigits.length !== 14) errors.value.tin_number = props.mainTinPrefix ? 'Branch code must be 5 digits (e.g. 00001).' : 'TIN must follow the format XXX-XXX-XXX-XXXXX.'
    else if (tinDigits.endsWith('00000')) errors.value.tin_number = 'Branch code 00000 is reserved for the main branch.'
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

async function goToStep(step: number) {
  if (step === currentStep.value) return
  if (step === 2) {
    if (!validateStep(1)) return
    if (!(await checkContactAvailability())) return
  }
  currentStep.value = step
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

  formData.append('tin_number', fullTin.value)
  formData.append('vat', form.value.vat)
  formData.append('bir_registered_at', form.value.bir_registered_at)
  if (birFile.value) formData.append('bir_file', birFile.value)

  emit('save', formData)
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
    <!-- Backdrop with subtle blur -->
    <div
      class="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200"
      @click="emit('close')"
      aria-hidden="true"
    ></div>

    <!-- Dialog Card: Emil Kowalski Polish, Clean Step Tabs, Card Grouping, Zero Overlap -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="branch-modal-title"
      class="relative bg-white rounded-3xl w-full max-w-[820px] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="flex items-center justify-between gap-4 px-6 md:px-8 pt-5 pb-4 border-b border-[#EEDFC4] bg-[#FDFBF7]">
        <div class="flex items-center gap-3.5">
          <div class="w-10 h-10 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="heroicons:building-storefront" class="w-5 h-5" />
          </div>
          <div>
            <h2 id="branch-modal-title" class="text-xl font-display font-extrabold text-[#3B1F0E]">
              Add New Cafe Branch
            </h2>
            <p class="text-xs text-[#8A6E64] mt-0.5">
              Register an additional branch location with its details and legal documents.
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="emit('close')"
          aria-label="Close modal"
          class="w-8.5 h-8.5 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3B1F0E] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>

      <!-- Segmented Step Navigation (Emil Kowalski Style) -->
      <div class="px-6 md:px-8 py-2.5 border-b border-[#F0E4D3] bg-[#FCFAF6] flex items-center justify-between gap-3 select-none">
        <div class="inline-flex p-1 rounded-2xl bg-[#EFE7DC] border border-[#E5D7C6] gap-1">
          <button
            type="button"
            @click="goToStep(1)"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            :class="currentStep === 1
              ? 'bg-white text-[#3B1F0E] shadow-sm font-extrabold'
              : 'text-[#8A6E64] hover:text-[#3B1F0E]'"
          >
            <Icon name="heroicons:information-circle" class="w-3.5 h-3.5" :class="currentStep === 1 ? 'text-[#7D5A50]' : 'text-[#A8988B]'" />
            <span>1. General Information</span>
          </button>

          <button
            type="button"
            @click="goToStep(2)"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            :class="currentStep === 2
              ? 'bg-white text-[#3B1F0E] shadow-sm font-extrabold'
              : 'text-[#8A6E64] hover:text-[#3B1F0E]'"
          >
            <Icon name="heroicons:document-text" class="w-3.5 h-3.5" :class="currentStep === 2 ? 'text-[#7D5A50]' : 'text-[#A8988B]'" />
            <span>2. Legal Documents (BIR)</span>
          </button>
        </div>

        <span class="text-xs font-bold text-[#8A6E64]">
          Step {{ currentStep }} of 2
        </span>
      </div>

      <!-- Backend Errors Alert Banner -->
      <div v-if="hasBackendErrors" role="alert" class="mx-6 md:mx-8 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs shrink-0 shadow-2xs">
        <p class="font-bold mb-1.5 text-xs flex items-center gap-1.5">
          <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 text-red-500 shrink-0" />
          <span>Please correct the following errors:</span>
        </p>
        <ul class="list-disc pl-5 space-y-0.5 text-[11px] font-medium">
          <template v-for="(msgs, field) in backendErrors" :key="field">
            <li v-for="msg in msgs" :key="msg">{{ msg }}</li>
          </template>
        </ul>
      </div>

      <!-- Form Content: Scrollable Body -->
      <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto px-6 md:px-8 py-4.5 space-y-4 max-h-[68vh]">
        <!-- ════════════ STEP 1: General Information ════════════ -->
        <div v-show="currentStep === 1" class="space-y-4">
          <!-- Card 1: Branch Identity & Location -->
          <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4.5 sm:p-5 shadow-2xs space-y-3.5">
            <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              <span>Branch Identity & Location</span>
            </div>

            <!-- Branch Name -->
            <div>
              <label class="block text-xs font-bold text-[#3B1F0E] mb-1">
                Branch Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                v-model="form.branch_name"
                maxlength="150"
                placeholder="e.g. La Vida Cafe - Brew City Branch"
                class="w-full h-11 px-3.5 rounded-xl border border-[#D8C7B5] bg-white text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                :class="{ 'border-red-400 bg-red-50/30': fieldError('branch_name') }"
              />
              <p v-if="fieldError('branch_name')" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                <span>{{ fieldError('branch_name') }}</span>
              </p>
            </div>

            <!-- Full Branch Address -->
            <div>
              <label class="block text-xs font-bold text-[#3B1F0E] mb-1">
                Full Branch Address <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                v-model="form.address"
                placeholder="e.g. 78 Latte Lane, Espresso Heights, Metro City"
                class="w-full h-11 px-3.5 rounded-xl border border-[#D8C7B5] bg-white text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                :class="{ 'border-red-400 bg-red-50/30': fieldError('address') }"
              />
              <p v-if="fieldError('address')" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                <span>{{ fieldError('address') }}</span>
              </p>
            </div>
          </div>

          <!-- Card 2: Contact Details -->
          <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4.5 sm:p-5 shadow-2xs space-y-3.5">
            <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              <span>Contact Details</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <!-- Branch Email -->
              <div>
                <label class="block text-xs font-bold text-[#3B1F0E] mb-1">
                  Branch Email <span class="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  v-model="form.cafe_email"
                  maxlength="255"
                  placeholder="branch@brewspot.com"
                  class="w-full h-11 px-3.5 rounded-xl border border-[#D8C7B5] bg-white text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                  :class="{ 'border-red-400 bg-red-50/30': fieldError('cafe_email') }"
                />
                <p v-if="fieldError('cafe_email')" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                  <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ fieldError('cafe_email') }}</span>
                </p>
              </div>

              <!-- Branch Phone Number with +63 prefix -->
              <div>
                <label class="block text-xs font-bold text-[#3B1F0E] mb-1">
                  Branch Phone Number <span class="text-red-500">*</span>
                </label>
                <div
                  class="h-11 rounded-xl border bg-white flex items-center overflow-hidden transition-all shadow-2xs focus-within:border-[#3B1F0E] focus-within:ring-2 focus-within:ring-[#3B1F0E]/15"
                  :class="fieldError('cafe_phonenumber') ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
                >
                  <span class="bg-[#F5EFE6] border-r border-[#E0D0BE] text-[#3B1F0E] font-bold text-xs px-3.5 h-full flex items-center shrink-0 select-none">
                    +63
                  </span>
                  <input
                    v-model="form.cafeMobileDigits"
                    type="tel"
                    inputmode="numeric"
                    maxlength="10"
                    placeholder="9123456789"
                    class="w-full h-full px-3 text-sm font-bold text-[#2D201B] bg-transparent outline-none tracking-wider placeholder:text-[#A8988B] placeholder:font-normal"
                    @input="onCafeMobileInput"
                  />
                </div>
                <p v-if="fieldError('cafe_phonenumber')" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                  <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ fieldError('cafe_phonenumber') }}</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Card 3: Storefront Branding -->
          <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4.5 sm:p-5 shadow-2xs space-y-3.5">
            <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              <span>Storefront Branding (Optional)</span>
            </div>

            <!-- Hidden File Input -->
            <input
              ref="pictureInputRef"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              class="hidden"
              @change="onPictureSelected"
            />

            <!-- Empty Dropzone State -->
            <div
              v-if="!cafePicture"
              @click="pictureInputRef?.click()"
              class="border-2 border-dashed border-[#D8C7B5] hover:border-[#3B1F0E] bg-white hover:bg-[#FAF6F0] rounded-2xl p-4 transition-all duration-150 flex items-center justify-center gap-3.5 cursor-pointer group shadow-2xs"
            >
              <div class="w-10 h-10 rounded-xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] group-hover:text-[#3B1F0E] flex items-center justify-center shrink-0 transition-colors">
                <Icon name="heroicons:photo" class="w-5 h-5" />
              </div>
              <div class="text-left">
                <p class="text-xs font-bold text-[#3B1F0E] group-hover:underline">
                  Upload Branch Picture
                </p>
                <p class="text-[11px] text-[#8A6E64] mt-0.5">
                  JPG, PNG, WEBP up to 2MB
                </p>
              </div>
            </div>

            <!-- Attached Picture State -->
            <div
              v-else
              class="flex items-center justify-between gap-3 p-2.5 bg-white rounded-2xl border border-[#D8C7B5] shadow-2xs"
            >
              <div class="flex items-center gap-3 min-w-0">
                <img
                  v-if="cafePicturePreview"
                  :src="cafePicturePreview"
                  alt="Branch preview"
                  class="w-12 h-12 rounded-xl object-cover border border-[#E8DAC8] shrink-0"
                />
                <div class="min-w-0">
                  <p class="text-xs font-bold text-[#3B1F0E] truncate">
                    {{ cafePicture.name }}
                  </p>
                  <p class="text-[11px] text-[#8A6E64] mt-0.5">
                    {{ formatFileSize(cafePicture.size) }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  @click="pictureInputRef?.click()"
                  class="px-2.5 py-1.5 rounded-lg border border-[#D8C7B5] bg-white text-xs font-bold text-[#5C4037] hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer"
                >
                  Change
                </button>
                <button
                  type="button"
                  @click="removePicture"
                  aria-label="Remove picture"
                  class="p-1.5 rounded-lg text-red-600 hover:bg-red-50 active:scale-90 transition-all cursor-pointer"
                  title="Remove"
                >
                  <Icon name="heroicons:trash" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <p v-if="fieldError('cafe_picture')" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
              <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
              <span>{{ fieldError('cafe_picture') }}</span>
            </p>
          </div>
        </div>

        <!-- ════════════ STEP 2: Legal Documents (BIR) ════════════ -->
        <div v-show="currentStep === 2" class="space-y-4">
          <!-- Card 1: Tax Identification & Registration -->
          <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4.5 sm:p-5 shadow-2xs space-y-3.5">
            <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              <span>Tax Identification & Registration</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <!-- TIN Number -->
              <div>
                <label class="block text-xs font-bold text-[#3B1F0E] mb-1">
                  {{ mainTinPrefix ? 'BIR Branch Code *' : 'TIN Number *' }}
                </label>

                <!-- With Main TIN Prefix -->
                <div
                  v-if="mainTinPrefix"
                  class="h-11 rounded-xl border bg-white flex items-center overflow-hidden transition-all shadow-2xs focus-within:border-[#3B1F0E] focus-within:ring-2 focus-within:ring-[#3B1F0E]/15"
                  :class="fieldError('tin_number') ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
                >
                  <span class="bg-[#F5EFE6] border-r border-[#E0D0BE] text-[#3B1F0E] font-bold text-xs font-mono px-3.5 h-full flex items-center shrink-0 select-none tracking-wider">
                    {{ mainTinPrefix }}-
                  </span>
                  <input
                    :value="form.tin_number"
                    type="text"
                    inputmode="numeric"
                    maxlength="5"
                    placeholder="00001"
                    class="w-full h-full px-3 text-sm font-bold font-mono text-[#2D201B] bg-transparent outline-none tracking-wider placeholder:text-[#A8988B] placeholder:font-normal"
                    @input="onTinInput"
                  />
                </div>

                <!-- Without Main TIN Prefix -->
                <input
                  v-else
                  :value="form.tin_number"
                  type="text"
                  inputmode="numeric"
                  maxlength="17"
                  placeholder="XXX-XXX-XXX-00001"
                  class="w-full h-11 px-3.5 rounded-xl border border-[#D8C7B5] bg-white text-sm font-bold font-mono text-[#2D201B] tracking-wider placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                  :class="{ 'border-red-400 bg-red-50/30': fieldError('tin_number') }"
                  @input="onTinInput"
                />

                <p v-if="fieldError('tin_number')" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                  <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ fieldError('tin_number') }}</span>
                </p>
                <p v-else class="text-[11px] text-[#8A6E64] mt-1">
                  {{ mainTinPrefix ? 'Shares main branch TIN. Enter 5-digit BIR branch code.' : '9-digit TIN followed by 5-digit branch code.' }}
                </p>
              </div>

              <!-- VAT Status -->
              <div>
                <label class="block text-xs font-bold text-[#3B1F0E] mb-1">
                  VAT Status <span class="text-red-500">*</span>
                </label>
                <DropdownList
                  v-model="form.vat"
                  :options="[{ value: 'vat-registered', label: 'VAT Registered' }, { value: 'non-vat', label: 'Non-VAT' }]"
                  size="md"
                  :invalid="!!fieldError('vat')"
                />
                <p v-if="fieldError('vat')" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                  <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ fieldError('vat') }}</span>
                </p>
              </div>
            </div>

            <!-- BIR Registered Date -->
            <div>
              <label class="block text-xs font-bold text-[#3B1F0E] mb-1">
                BIR Registered Date <span class="text-red-500">*</span>
              </label>
              <EmilCalendar
                v-model="form.bir_registered_at"
                placeholder="Select BIR registration date"
                align="left"
                :invalid="!!fieldError('bir_registered_at')"
                button-class="w-full h-11 px-3.5 rounded-xl border border-[#D8C7B5] bg-white text-sm font-semibold text-[#2D201B] shadow-2xs hover:border-[#3B1F0E]"
              />
              <p v-if="fieldError('bir_registered_at')" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                <span>{{ fieldError('bir_registered_at') }}</span>
              </p>
            </div>
          </div>

          <!-- Card 2: BIR Registration Document -->
          <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4.5 sm:p-5 shadow-2xs space-y-3.5">
            <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              <span>BIR Certificate of Registration (Form 2303) <span class="text-red-500">*</span></span>
            </div>

            <!-- Hidden File Input -->
            <input
              ref="birInputRef"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              class="hidden"
              @change="onBirSelected"
            />

            <!-- Empty Dropzone State -->
            <div
              v-if="!birFile"
              @click="birInputRef?.click()"
              class="border-2 border-dashed border-[#D8C7B5] hover:border-[#3B1F0E] bg-white hover:bg-[#FAF6F0] rounded-2xl p-4 transition-all duration-150 flex items-center justify-center gap-3.5 cursor-pointer group shadow-2xs"
            >
              <div class="w-10 h-10 rounded-xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] group-hover:text-[#3B1F0E] flex items-center justify-center shrink-0 transition-colors">
                <Icon name="heroicons:document-text" class="w-5 h-5" />
              </div>
              <div class="text-left">
                <p class="text-xs font-bold text-[#3B1F0E] group-hover:underline">
                  Upload BIR Document (Form 2303)
                </p>
                <p class="text-[11px] text-[#8A6E64] mt-0.5">
                  JPG, PNG, or PDF up to 5MB
                </p>
              </div>
            </div>

            <!-- Attached File State -->
            <div
              v-else
              class="flex items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-[#D8C7B5] shadow-2xs"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon name="heroicons:document-check" class="w-6 h-6 text-amber-700" />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-[#3B1F0E] truncate">
                    {{ birFile.name }}
                  </p>
                  <p class="text-[11px] text-[#8A6E64] mt-0.5 flex items-center gap-1.5">
                    <span>{{ formatFileSize(birFile.size) }}</span>
                    <span>·</span>
                    <span class="text-emerald-700 font-bold flex items-center gap-0.5">
                      <Icon name="heroicons:check-circle" class="w-3.5 h-3.5" />
                      Ready to submit
                    </span>
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  @click="birInputRef?.click()"
                  class="px-2.5 py-1.5 rounded-lg border border-[#D8C7B5] bg-white text-xs font-bold text-[#5C4037] hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer"
                >
                  Change
                </button>
                <button
                  type="button"
                  @click="removeBirFile"
                  aria-label="Remove BIR file"
                  class="p-1.5 rounded-lg text-red-600 hover:bg-red-50 active:scale-90 transition-all cursor-pointer"
                  title="Remove"
                >
                  <Icon name="heroicons:trash" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <p v-if="fieldError('bir_file')" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
              <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
              <span>{{ fieldError('bir_file') }}</span>
            </p>
          </div>
        </div>
      </form>

      <!-- Footer: Intuitive Progression & Balanced Actions -->
      <div class="flex items-center justify-between px-6 md:px-8 py-3.5 border-t border-[#EEDFC4] bg-[#FAF8F5] rounded-b-3xl">
        <!-- Left Action -->
        <div>
          <button
            v-if="currentStep === 1"
            type="button"
            @click="emit('close')"
            class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            Cancel
          </button>
          <button
            v-else
            type="button"
            @click="prevStep"
            class="px-4 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        <!-- Right Action -->
        <div class="flex items-center gap-3">
          <button
            v-if="currentStep === 2"
            type="button"
            @click="emit('close')"
            class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            Cancel
          </button>

          <!-- Step 1 Primary: Next Step -->
          <button
            v-if="currentStep === 1"
            type="button"
            @click="nextStep"
            :disabled="checkingContact"
            class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            <Icon v-if="checkingContact" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            <span>Continue to Legal Documents</span>
            <Icon v-if="!checkingContact" name="heroicons:arrow-right" class="w-4 h-4" />
          </button>

          <!-- Step 2 Primary: Create Branch -->
          <button
            v-else
            type="button"
            @click="handleSubmit"
            :disabled="saving"
            class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            <Icon v-if="saving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            <span>Create Branch</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
