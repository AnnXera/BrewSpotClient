<!-- Unified Step-by-Step Business Registration Wizard -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import logoFull from '~/assets/images/logo-with-tag.svg'

const authService = useAuthService()

// Wizard Steps:
// 1 = Email Input
// 2 = OTP Verification
// 3 = Personal Info & Gov ID Upload
// 4 = Business Details & 4 Required Business Documents
// 5 = Registration Review / Submission Confirmation
const currentStep = ref(1)

const error = ref('')
const success = ref('')
const loading = ref(false)

// Step 1: Email
const email = ref('')

// Step 2: OTP Verification
const digits = ref(['', '', '', '', '', ''])
const inputs = ref<HTMLInputElement[]>([])
const otpCode = computed(() => digits.value.join(''))
const cooldown = ref(0)

// Step 3: Personal Information
const userUuid = ref('')
const firstname = ref('')
const middlename = ref('')
const lastname = ref('')
const username = ref('')
const phoneNumber = ref('')
const ownerAddress = ref('')
const idType = ref('drivers_license')
const governmentIdFile = ref<File | null>(null)
const governmentIdFileName = ref('')

// Step 4: Business Details & Documents
const businessSubPage = ref(1)
const cafeName = ref('')
const cafeDocType = ref<'DTI' | 'SEC'>('DTI')
const branchName = ref('')
const address = ref('')
const cafePhone = ref('')
const cafeEmail = ref('')

// 4 Required Business Files
const birFile = ref<File | null>(null)
const mayorsFile = ref<File | null>(null)
const dtiSecFile = ref<File | null>(null)
const sanitaryFile = ref<File | null>(null)

const birFileName = ref('')
const birFileSize = ref('')
const mayorsFileName = ref('')
const mayorsFileSize = ref('')
const dtiSecFileName = ref('')
const dtiSecFileSize = ref('')
const sanitaryFileName = ref('')
const sanitaryFileSize = ref('')

const uploadedCount = computed(() => {
  let count = 0
  if (birFile.value) count++
  if (mayorsFile.value) count++
  if (dtiSecFile.value) count++
  if (sanitaryFile.value) count++
  return count
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function goLogin() {
  navigateTo('/login')
}

// Step 1: Send Code
async function handleSendCode() {
  error.value = ''
  if (!email.value) {
    error.value = 'Please enter a valid email address.'
    return
  }
  loading.value = true
  try {
    const res = await authService.sendRegistrationCode(email.value) as any
    if (res) {
      cafeEmail.value = email.value
      digits.value = ['', '', '', '', '', '']
      currentStep.value = 2
    } else {
      error.value = 'Unable to send verification code.'
    }
  } catch (e: any) {
    error.value = extractErrorMessage(e, 'Unable to send verification code.')
  } finally {
    loading.value = false
  }
}

// Step 2: OTP Verification
function onDigitInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/[^0-9]/g, '').slice(-1)
  digits.value[index] = value
  if (value && index < 5) {
    inputs.value[index + 1]?.focus()
  }
}

function onDigitKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    inputs.value[index - 1]?.focus()
  }
}

async function handleVerifyOTP() {
  error.value = ''
  loading.value = true
  try {
    const res = await authService.verifyRegistrationCode(email.value, otpCode.value) as any
    if (res.user_uuid) {
      userUuid.value = res.user_uuid
      currentStep.value = 3
    } else {
      error.value = res.message || 'Invalid verification code.'
    }
  } catch (e: any) {
    error.value = extractErrorMessage(e, 'Verification failed.')
  } finally {
    loading.value = false
  }
}

async function handleResendOTP() {
  if (cooldown.value > 0) return
  error.value = ''
  try {
    const res = await authService.resendRegistrationCode(email.value)
    if (res.success) {
      cooldown.value = 60
      const interval = setInterval(() => {
        cooldown.value--
        if (cooldown.value <= 0) clearInterval(interval)
      }, 1000)
    } else if (res.retry_after_seconds) {
      cooldown.value = res.retry_after_seconds
      const interval = setInterval(() => {
        cooldown.value--
        if (cooldown.value <= 0) clearInterval(interval)
      }, 1000)
    } else {
      error.value = res.message || 'Unable to resend code.'
    }
  } catch (e: any) {
    error.value = extractErrorMessage(e, 'Could not resend code.')
  }
}

function extractErrorMessage(e: any, defaultMsg: string): string {
  const errs = e?.data?.errors || e?.response?._data?.errors
  if (errs && typeof errs === 'object') {
    const list = Object.values(errs).flat().filter(Boolean)
    if (list.length > 0) return list.join('\n')
  }
  return e?.data?.message ?? e?.response?._data?.message ?? e?.message ?? defaultMsg
}

// Step 3: Personal Info
function handleGovIdChange(event: Event) {
  error.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      error.value = 'Government ID file size must not exceed 5MB.'
      input.value = ''
      return
    }
    governmentIdFile.value = file
    governmentIdFileName.value = file.name
  }
}

function handleNextToBusiness() {
  error.value = ''
  if (!firstname.value || !lastname.value || !username.value || !phoneNumber.value || !ownerAddress.value) {
    error.value = 'Please complete all required personal fields.'
    return
  }
  if (!governmentIdFile.value) {
    error.value = 'Please upload a valid Government ID file.'
    return
  }
  currentStep.value = 4
  businessSubPage.value = 1
}

// Step 4: Business Details & 4 Documents
function validateBusinessPage1(): boolean {
  error.value = ''
  if (!cafeName.value.trim()) {
    error.value = 'Café / Business Name is required.'
    return false
  }
  if (!branchName.value.trim()) {
    error.value = 'Branch Name is required.'
    return false
  }
  if (!address.value.trim()) {
    error.value = 'Branch Address is required.'
    return false
  }
  if (!cafePhone.value.trim()) {
    error.value = 'Branch Phone Number is required.'
    return false
  }
  if (!cafeEmail.value.trim()) {
    error.value = 'Café Email is required.'
    return false
  }
  return true
}

function nextBusinessSubPage() {
  if (validateBusinessPage1()) {
    businessSubPage.value = 2
  }
}

function prevBusinessSubPage() {
  error.value = ''
  businessSubPage.value = 1
}

function onBirChange(event: Event) {
  error.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      error.value = 'BIR Certificate file size must not exceed 5MB.'
      input.value = ''
      return
    }
    birFile.value = file
    birFileName.value = file.name
    birFileSize.value = formatBytes(file.size)
  }
}

function clearBirFile() {
  birFile.value = null
  birFileName.value = ''
  birFileSize.value = ''
}

function onMayorsChange(event: Event) {
  error.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      error.value = "Mayor's Permit file size must not exceed 5MB."
      input.value = ''
      return
    }
    mayorsFile.value = file
    mayorsFileName.value = file.name
    mayorsFileSize.value = formatBytes(file.size)
  }
}

function clearMayorsFile() {
  mayorsFile.value = null
  mayorsFileName.value = ''
  mayorsFileSize.value = ''
}

function onDtiSecChange(event: Event) {
  error.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      error.value = `${cafeDocType.value} document file size must not exceed 5MB.`
      input.value = ''
      return
    }
    dtiSecFile.value = file
    dtiSecFileName.value = file.name
    dtiSecFileSize.value = formatBytes(file.size)
  }
}

function clearDtiSecFile() {
  dtiSecFile.value = null
  dtiSecFileName.value = ''
  dtiSecFileSize.value = ''
}

function onSanitaryChange(event: Event) {
  error.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      error.value = 'Sanitary Permit file size must not exceed 5MB.'
      input.value = ''
      return
    }
    sanitaryFile.value = file
    sanitaryFileName.value = file.name
    sanitaryFileSize.value = formatBytes(file.size)
  }
}

function clearSanitaryFile() {
  sanitaryFile.value = null
  sanitaryFileName.value = ''
  sanitaryFileSize.value = ''
}

async function handleFinalSubmit() {
  error.value = ''
  success.value = ''

  if (!userUuid.value) {
    error.value = 'Invalid registration session. Please restart registration.'
    return
  }

  const missingDocs: string[] = []
  if (!birFile.value) missingDocs.push('1. BIR Certificate')
  if (!mayorsFile.value) missingDocs.push("2. Mayor's Permit")
  if (!dtiSecFile.value) missingDocs.push(`3. ${cafeDocType.value} Document`)
  if (!sanitaryFile.value) missingDocs.push('4. Sanitary Permit')

  if (missingDocs.length > 0) {
    error.value = `Missing required documents:\n${missingDocs.join(', ')}`
    return
  }

  if (!governmentIdFile.value) {
    error.value = 'Missing Government ID file. Please return to Personal Information step.'
    return
  }

  loading.value = true
  try {
    const payload = new FormData()
    payload.append('firstname', firstname.value)
    payload.append('middlename', middlename.value || '')
    payload.append('lastname', lastname.value)
    payload.append('username', username.value)
    payload.append('phone_number', phoneNumber.value)
    payload.append('owner_address', ownerAddress.value)
    payload.append('id_type', idType.value || 'drivers_license')
    payload.append('file', governmentIdFile.value)

    payload.append('cafe_name', cafeName.value)
    payload.append('cafe_doc_type', cafeDocType.value)
    payload.append('branch_name', branchName.value)
    payload.append('address', address.value)
    payload.append('owner_address', address.value)
    payload.append('cafe_phonenumber', cafePhone.value)
    payload.append('cafe_email', cafeEmail.value)

    payload.append('bir_file', birFile.value!)
    payload.append('mayors_permit_file', mayorsFile.value!)
    payload.append('dti_sec_file', dtiSecFile.value!)
    payload.append('sanitary_permit_file', sanitaryFile.value!)

    const res = await authService.register(userUuid.value, payload)
    if (res.success) {
      currentStep.value = 5
    } else {
      error.value = res.message || 'Registration failed.'
    }
  } catch (e: any) {
    error.value = extractErrorMessage(e, 'Registration failed.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2">
    <!-- Left Hero Section (Matches login.vue & verify-login-code.vue) -->
    <section class="hidden lg:flex flex-col justify-center bg-[#7B5A50] font-display text-white px-16 py-12">
      <div class="max-w-lg mx-auto text-center space-y-12">
        <!-- Brand Header -->
        <div>
          <img :src="logoFull" alt="BrewSpot" class="h-16 mx-auto" />
        </div>

        <!-- Tagline -->
        <div class="space-y-3">
          <h2 class="text-3xl font-bold leading-tight">
            Every great cup starts with great management.
          </h2>
          <p class="text-sm text-[#e5d9d4] leading-relaxed">
            Streamline your daily orders, table reservations, and cafe sales with ease.
          </p>
        </div>

        <!-- System Features Highlight -->
        <div class="grid grid-cols-3 gap-3 pt-4">
          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <Icon name="heroicons:shopping-bag" class="w-6 h-6 mx-auto text-white" />
            <p class="text-xs font-semibold mt-2 text-white">POS & Inventory</p>
          </div>

          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <Icon name="heroicons:calendar-days" class="w-6 h-6 mx-auto text-white" />
            <p class="text-xs font-semibold mt-2 text-white">Reservations</p>
          </div>

          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <Icon name="heroicons:chart-bar" class="w-6 h-6 mx-auto text-white" />
            <p class="text-xs font-semibold mt-2 text-white">Sales Analytics</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Right Form Section -->
    <section class="flex items-center justify-center bg-[#FFF8EA] px-8 py-12 min-h-screen lg:min-h-0 overflow-y-auto">
      <div class="w-full max-w-md space-y-6 my-auto">

        <!-- STEP 1: Email Verification -->
        <div v-if="currentStep === 1" class="space-y-6">
          <NuxtLink
            to="/"
            class="flex items-center gap-1 text-sm font-semibold text-[#7B5A50] hover:opacity-80 transition-opacity"
          >
            <Icon name="heroicons:chevron-left" class="w-4 h-4" />
            Back to Home
          </NuxtLink>

          <div>
            <h1 class="text-3xl font-bold text-[#2d201b]">Register your business</h1>
            <p class="text-gray-600 text-sm mt-1">
              Enter your email address to receive a verification code before completing registration.
            </p>
          </div>

          <!-- Auth Error Banner -->
          <div
            v-if="error"
            class="p-3.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-3"
          >
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
            <span class="font-medium">{{ error }}</span>
          </div>

          <form @submit.prevent="handleSendCode" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1.5 text-[#2d201b]">Email Address *</label>
              <input
                v-model="email"
                type="email"
                placeholder="Enter your email"
                class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                required
              />
            </div>

            <div class="pt-2">
              <button
                type="submit"
                :disabled="loading"
                class="w-full h-11 rounded-md bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {{ loading ? 'Sending Code...' : 'Send Verification Code' }}
              </button>
            </div>

            <p class="text-sm text-gray-600 text-center pt-2">
              Already registered?
              <button
                type="button"
                class="font-semibold text-[#7B5A50] hover:underline ml-1"
                @click="goLogin"
              >
                Sign In
              </button>
            </p>
          </form>
        </div>

        <!-- STEP 2: OTP Verification -->
        <div v-else-if="currentStep === 2" class="space-y-6">
          <button
            type="button"
            class="flex items-center gap-1 text-sm font-semibold text-[#7B5A50] hover:opacity-80 transition-opacity"
            @click="currentStep = 1"
          >
            <Icon name="heroicons:chevron-left" class="w-4 h-4" />
            Change Email
          </button>

          <div>
            <h1 class="text-3xl font-bold text-[#2d201b]">Check your inbox</h1>
            <p class="text-gray-600 text-sm mt-2 leading-relaxed">
              We sent a 6-digit code to <span class="font-semibold text-[#2d201b]">{{ email }}</span>. Enter it below to continue.
            </p>
          </div>

          <!-- Auth Error Banner -->
          <div
            v-if="error"
            class="p-3.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-3"
          >
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
            <span class="font-medium">{{ error }}</span>
          </div>

          <form @submit.prevent="handleVerifyOTP" class="space-y-6">
            <div class="flex justify-between gap-2">
              <input
                v-for="(digit, index) in digits"
                :key="index"
                ref="inputs"
                v-model="digits[index]"
                type="text"
                inputmode="numeric"
                maxlength="1"
                class="w-full h-14 text-center text-lg font-semibold rounded-lg border border-gray-300 bg-white text-[#2d201b] outline-none focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20 transition"
                @input="onDigitInput(index, $event)"
                @keydown="onDigitKeydown(index, $event)"
              />
            </div>

            <button
              type="submit"
              :disabled="loading || otpCode.length < 6"
              class="w-full h-11 rounded-md bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ loading ? 'Verifying...' : 'Verify and Continue' }}
            </button>

            <p class="text-sm text-gray-600 text-center">
              Didn't receive it?
              <button
                type="button"
                :disabled="cooldown > 0"
                class="font-semibold text-[#7B5A50] hover:underline disabled:opacity-50 disabled:no-underline ml-1"
                @click="handleResendOTP"
              >
                {{ cooldown > 0 ? `Resend OTP (${cooldown}s)` : 'Resend OTP' }}
              </button>
            </p>
          </form>
        </div>

        <!-- STEP 3: Personal Details -->
        <div v-else-if="currentStep === 3" class="space-y-5">
          <button
            type="button"
            class="flex items-center gap-1 text-sm font-semibold text-[#7B5A50] hover:opacity-80 transition-opacity"
            @click="currentStep = 2"
          >
            <Icon name="heroicons:chevron-left" class="w-4 h-4" />
            Back to Verification
          </button>

          <div>
            <span class="text-xs uppercase tracking-wider font-semibold text-[#7B5A50]">Step 1 of 2: Personal Info</span>
            <h1 class="text-2xl font-bold text-[#2d201b] mt-0.5">Personal details</h1>
            <p class="text-gray-600 text-sm mt-1">Provide your identity information to verify your account.</p>
          </div>

          <!-- Auth Error Banner -->
          <div
            v-if="error"
            class="p-3.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-3"
          >
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
            <span class="font-medium">{{ error }}</span>
          </div>

          <form @submit.prevent="handleNextToBusiness" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1 text-[#2d201b]">First Name *</label>
                <input
                  v-model="firstname"
                  type="text"
                  placeholder="Jaime"
                  class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1 text-[#2d201b]">Last Name *</label>
                <input
                  v-model="lastname"
                  type="text"
                  placeholder="Banani"
                  class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                  required
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1 text-[#2d201b]">Middle Name</label>
                <input
                  v-model="middlename"
                  type="text"
                  placeholder="Optional"
                  class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1 text-[#2d201b]">Username *</label>
                <input
                  v-model="username"
                  type="text"
                  placeholder="user_handle"
                  class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                  required
                />
              </div>
            </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label class="block mb-1 font-medium text-[#3b1f0e]/80">Contact No. *</label>
              <input v-model="phoneNumber" type="text" placeholder="+63 0912 345 678" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2" required />
            </div>
            <div>
              <label class="block mb-1 font-medium text-[#3b1f0e]/80">ID Type *</label>
              <select v-model="idType" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2">
                <option value="drivers_license">Driver's License</option>
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="sss">SSS ID</option>
                <option value="philhealth">PhilHealth ID</option>
                <option value="pagibig">Pag-IBIG ID</option>
                <option value="voters_id">Voter's ID</option>
              </select>
            </div>
          </div>

          <div class="text-xs">
            <label class="block mb-1 font-medium text-[#3b1f0e]/80">Personal Address *</label>
            <input v-model="ownerAddress" type="text" placeholder="Street, Barangay, District, Davao City" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2" required />
          </div>

            <div>
              <label class="block text-sm font-medium mb-1 text-[#2d201b]">Government ID File *</label>
              <input
                type="file"
                @change="handleGovIdChange"
                accept="image/*,.pdf"
                class="w-full text-sm text-[#2d201b] border border-gray-300 rounded-md bg-white p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#7B5A50] file:text-white hover:file:bg-[#65463d] cursor-pointer"
                required
              />
              <p v-if="governmentIdFileName" class="mt-1 text-xs text-[#7B5A50] truncate font-medium">
                Uploaded: {{ governmentIdFileName }}
              </p>
            </div>

            <div class="pt-2">
              <button
                type="submit"
                class="w-full h-11 rounded-md bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition flex items-center justify-center gap-2"
              >
                Next: Business Registration
                <Icon name="heroicons:chevron-right" class="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        <!-- STEP 4: Business Details & Requirements -->
        <div v-else-if="currentStep === 4" class="space-y-5">
          <!-- Page 1: Business Information -->
          <div v-if="businessSubPage === 1" class="space-y-5">
            <button
              type="button"
              class="flex items-center gap-1 text-sm font-semibold text-[#7B5A50] hover:opacity-80 transition-opacity"
              @click="currentStep = 3"
            >
              <Icon name="heroicons:chevron-left" class="w-4 h-4" />
              Back to Personal Info
            </button>

            <div>
              <div class="flex items-center justify-between">
                <span class="text-xs uppercase tracking-wider font-semibold text-[#7B5A50]">Business Registration</span>
                <span class="text-xs bg-[#7B5A50]/10 text-[#7B5A50] px-2.5 py-0.5 rounded-full font-semibold">Page 1 of 2</span>
              </div>
              <h1 class="text-2xl font-bold text-[#2d201b] mt-0.5">Business details</h1>
              <p class="text-gray-600 text-sm mt-1">Enter your café and main branch information.</p>
            </div>

            <!-- Auth Error Banner -->
            <div
              v-if="error"
              class="p-3.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-3"
            >
              <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
              <span class="font-medium">{{ error }}</span>
            </div>

            <form @submit.prevent="nextBusinessSubPage" class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium mb-1 text-[#2d201b]">Café / Business Name *</label>
                  <input
                    v-model="cafeName"
                    type="text"
                    placeholder="BrewSpot Davao"
                    class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1 text-[#2d201b]">Document Type *</label>
                  <select
                    v-model="cafeDocType"
                    class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                  >
                    <option value="DTI">DTI</option>
                    <option value="SEC">SEC</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium mb-1 text-[#2d201b]">Branch Name *</label>
                  <input
                    v-model="branchName"
                    type="text"
                    placeholder="Main Branch"
                    class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1 text-[#2d201b]">Branch Phone *</label>
                  <input
                    v-model="cafePhone"
                    type="text"
                    placeholder="+63 0912 345 678"
                    class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1 text-[#2d201b]">Branch Address *</label>
                <input
                  v-model="address"
                  type="text"
                  placeholder="Street, Barangay, District, Davao City"
                  class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-1 text-[#2d201b]">Café Email *</label>
                <input
                  v-model="cafeEmail"
                  type="email"
                  placeholder="contact@brewspot.com"
                  class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                  required
                />
              </div>

              <div class="pt-2">
                <button
                  type="submit"
                  class="w-full h-11 rounded-md bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition flex items-center justify-center gap-2"
                >
                  Next: Upload Business Requirements
                  <Icon name="heroicons:chevron-right" class="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          <!-- Page 2: 4 Required Business Documents -->
          <div v-else class="space-y-4">
            <button
              type="button"
              class="flex items-center gap-1 text-sm font-semibold text-[#7B5A50] hover:opacity-80 transition-opacity"
              @click="prevBusinessSubPage"
            >
              <Icon name="heroicons:chevron-left" class="w-4 h-4" />
              Back to Business Details
            </button>

            <div>
              <div class="flex items-center justify-between">
                <span class="text-xs uppercase tracking-wider font-semibold text-[#7B5A50]">Business Registration</span>
                <span class="text-xs bg-[#7B5A50]/10 text-[#7B5A50] px-2.5 py-0.5 rounded-full font-semibold">Page 2 of 2</span>
              </div>
              <h1 class="text-2xl font-bold text-[#2d201b] mt-0.5">Required Requirements</h1>
              <p class="text-gray-600 text-sm mt-1">Upload the 4 required business documents below.</p>
            </div>

            <!-- Upload Progress Card -->
            <div class="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
              <div class="flex items-center space-x-2.5">
                <div
                  class="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold transition-colors"
                  :class="uploadedCount === 4 ? 'bg-emerald-600' : 'bg-[#7B5A50]'"
                >
                  {{ uploadedCount }}
                </div>
                <span class="text-xs font-semibold text-[#2d201b]">
                  {{ uploadedCount === 4 ? 'All 4 requirements uploaded ✓' : `${uploadedCount} of 4 requirements uploaded` }}
                </span>
              </div>
              <div class="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  class="h-full transition-all duration-300"
                  :class="uploadedCount === 4 ? 'bg-emerald-600' : 'bg-[#7B5A50]'"
                  :style="{ width: `${(uploadedCount / 4) * 100}%` }"
                ></div>
              </div>
            </div>

            <!-- Auth Error Banner -->
            <div
              v-if="error"
              class="p-3.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-3"
            >
              <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
              <span class="font-medium whitespace-pre-line">{{ error }}</span>
            </div>

            <form @submit.prevent="handleFinalSubmit" class="space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <!-- 1. BIR Certificate -->
                <div
                  class="bg-white rounded-lg p-3 border transition shadow-sm"
                  :class="birFile ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-300 hover:border-[#7B5A50]'"
                >
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="font-semibold text-xs text-[#2d201b]">1. BIR Certificate <span class="text-red-500">*</span></label>
                    <span v-if="birFile" class="text-[0.65rem] text-emerald-700 font-bold flex items-center gap-0.5">✓ Uploaded</span>
                  </div>
                  <div v-if="!birFile">
                    <input
                      type="file"
                      @change="onBirChange"
                      accept="image/*,.pdf"
                      class="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#7B5A50] file:text-white hover:file:bg-[#65463d] cursor-pointer"
                      required
                    />
                  </div>
                  <div v-else class="flex items-center justify-between text-xs bg-emerald-100/70 p-2 rounded-md text-emerald-900">
                    <div class="truncate mr-2">
                      <p class="font-medium truncate text-xs">{{ birFileName }}</p>
                      <p class="text-[0.65rem] text-emerald-700">{{ birFileSize }}</p>
                    </div>
                    <button
                      type="button"
                      @click="clearBirFile"
                      class="text-emerald-800 hover:text-red-600 font-bold text-sm px-1 rounded focus:outline-none"
                      title="Remove file"
                    >&times;</button>
                  </div>
                </div>

                <!-- 2. Mayor's Permit -->
                <div
                  class="bg-white rounded-lg p-3 border transition shadow-sm"
                  :class="mayorsFile ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-300 hover:border-[#7B5A50]'"
                >
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="font-semibold text-xs text-[#2d201b]">2. Mayor's Permit <span class="text-red-500">*</span></label>
                    <span v-if="mayorsFile" class="text-[0.65rem] text-emerald-700 font-bold flex items-center gap-0.5">✓ Uploaded</span>
                  </div>
                  <div v-if="!mayorsFile">
                    <input
                      type="file"
                      @change="onMayorsChange"
                      accept="image/*,.pdf"
                      class="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#7B5A50] file:text-white hover:file:bg-[#65463d] cursor-pointer"
                      required
                    />
                  </div>
                  <div v-else class="flex items-center justify-between text-xs bg-emerald-100/70 p-2 rounded-md text-emerald-900">
                    <div class="truncate mr-2">
                      <p class="font-medium truncate text-xs">{{ mayorsFileName }}</p>
                      <p class="text-[0.65rem] text-emerald-700">{{ mayorsFileSize }}</p>
                    </div>
                    <button
                      type="button"
                      @click="clearMayorsFile"
                      class="text-emerald-800 hover:text-red-600 font-bold text-sm px-1 rounded focus:outline-none"
                      title="Remove file"
                    >&times;</button>
                  </div>
                </div>

                <!-- 3. DTI or SEC Document -->
                <div
                  class="bg-white rounded-lg p-3 border transition shadow-sm"
                  :class="dtiSecFile ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-300 hover:border-[#7B5A50]'"
                >
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="font-semibold text-xs text-[#2d201b]">3. {{ cafeDocType }} Document <span class="text-red-500">*</span></label>
                    <span v-if="dtiSecFile" class="text-[0.65rem] text-emerald-700 font-bold flex items-center gap-0.5">✓ Uploaded</span>
                  </div>
                  <div v-if="!dtiSecFile">
                    <input
                      type="file"
                      @change="onDtiSecChange"
                      accept="image/*,.pdf"
                      class="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#7B5A50] file:text-white hover:file:bg-[#65463d] cursor-pointer"
                      required
                    />
                  </div>
                  <div v-else class="flex items-center justify-between text-xs bg-emerald-100/70 p-2 rounded-md text-emerald-900">
                    <div class="truncate mr-2">
                      <p class="font-medium truncate text-xs">{{ dtiSecFileName }}</p>
                      <p class="text-[0.65rem] text-emerald-700">{{ dtiSecFileSize }}</p>
                    </div>
                    <button
                      type="button"
                      @click="clearDtiSecFile"
                      class="text-emerald-800 hover:text-red-600 font-bold text-sm px-1 rounded focus:outline-none"
                      title="Remove file"
                    >&times;</button>
                  </div>
                </div>

                <!-- 4. Sanitary Permit -->
                <div
                  class="bg-white rounded-lg p-3 border transition shadow-sm"
                  :class="sanitaryFile ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-300 hover:border-[#7B5A50]'"
                >
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="font-semibold text-xs text-[#2d201b]">4. Sanitary Permit <span class="text-red-500">*</span></label>
                    <span v-if="sanitaryFile" class="text-[0.65rem] text-emerald-700 font-bold flex items-center gap-0.5">✓ Uploaded</span>
                  </div>
                  <div v-if="!sanitaryFile">
                    <input
                      type="file"
                      @change="onSanitaryChange"
                      accept="image/*,.pdf"
                      class="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#7B5A50] file:text-white hover:file:bg-[#65463d] cursor-pointer"
                      required
                    />
                  </div>
                  <div v-else class="flex items-center justify-between text-xs bg-emerald-100/70 p-2 rounded-md text-emerald-900">
                    <div class="truncate mr-2">
                      <p class="font-medium truncate text-xs">{{ sanitaryFileName }}</p>
                      <p class="text-[0.65rem] text-emerald-700">{{ sanitaryFileSize }}</p>
                    </div>
                    <button
                      type="button"
                      @click="clearSanitaryFile"
                      class="text-emerald-800 hover:text-red-600 font-bold text-sm px-1 rounded focus:outline-none"
                      title="Remove file"
                    >&times;</button>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  class="w-1/3 h-11 rounded-md border border-[#7B5A50] text-[#7B5A50] font-medium hover:bg-[#7B5A50]/10 transition"
                  @click="prevBusinessSubPage"
                >
                  Back
                </button>
                <button
                  type="submit"
                  :disabled="loading || uploadedCount < 4"
                  class="w-2/3 h-11 rounded-md bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {{ loading ? 'Submitting...' : 'Submit Registration' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- STEP 5: Review / Submitted Screen -->
        <div v-else-if="currentStep === 5" class="space-y-6">
          <div>
            <span class="text-xs uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">Registration Submitted ✓</span>
            <h1 class="text-2xl font-bold text-[#2d201b] mt-2">Application Received! 🎉</h1>
            <p class="text-gray-600 text-sm mt-2 leading-relaxed">
              We've sent a confirmation email to <span class="font-semibold text-[#2d201b]">{{ email }}</span> with a direct link to view your submitted details and track review progress.
            </p>
          </div>

          <!-- Direct View Details CTA Card -->
          <div class="rounded-xl border border-[#7B5A50]/20 bg-white p-5 space-y-4 shadow-sm">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-[#7B5A50]/10 text-[#7B5A50] flex items-center justify-center shrink-0">
                <Icon name="heroicons:document-text" class="w-5 h-5" />
              </div>
              <div>
                <p class="text-sm font-bold text-[#2d201b]">View Your Submitted Application</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  Check all the information and uploaded documents you entered anytime.
                </p>
              </div>
            </div>

            <NuxtLink
              v-if="userUuid"
              :to="`/application/${userUuid}`"
              class="w-full h-10 rounded-lg bg-[#7B5A50] text-white text-xs font-bold hover:bg-[#65463d] transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Icon name="heroicons:eye" class="w-4 h-4" />
              View Application Details
            </NuxtLink>
          </div>

          <div class="rounded-lg border border-[#7B5A50]/15 bg-[#FFF8EA]/60 p-4 space-y-2.5">
            <p class="text-xs font-bold text-[#2d201b] uppercase tracking-wide">What happens next?</p>
            <ul class="space-y-2 text-xs text-gray-600">
              <li class="flex items-center gap-2">
                <Icon name="heroicons:check-circle" class="w-4 h-4 text-[#7B5A50]" />
                1. Document Verification & Compliance Review (1–3 business days)
              </li>
              <li class="flex items-center gap-2">
                <Icon name="heroicons:check-circle" class="w-4 h-4 text-[#7B5A50]" />
                2. Email Notification upon Admin Approval
              </li>
              <li class="flex items-center gap-2">
                <Icon name="heroicons:check-circle" class="w-4 h-4 text-[#7B5A50]" />
                3. Password Setup & Immediate Dashboard Access
              </li>
            </ul>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <NuxtLink
              to="/"
              class="w-1/2 h-10 rounded-md border border-[#7B5A50] text-[#7B5A50] font-medium hover:bg-[#7B5A50]/10 transition flex items-center justify-center gap-1.5 text-xs"
            >
              <Icon name="heroicons:home" class="w-4 h-4" />
              Back to Home
            </NuxtLink>
            <button
              type="button"
              class="w-1/2 h-10 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition flex items-center justify-center gap-1.5 text-xs"
              @click="goLogin"
            >
              Go to Sign In
            </button>
          </div>
        </div>

      </div>
    </section>
  </div>
</template>
