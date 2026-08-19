<!-- Unified Step-by-Step Business Registration Wizard -->
<script setup lang="ts">
import { ref, computed } from 'vue'

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
const idType = ref('Driver License')
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
    error.value = e?.data?.message ?? e?.message ?? 'Unable to send verification code.'
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
    error.value = e?.data?.message ?? e?.message ?? 'Verification failed.'
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
    error.value = e?.data?.message ?? e?.message ?? 'Could not resend code.'
  }
}

// Step 3: Personal Info
function handleGovIdChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    governmentIdFile.value = file
    governmentIdFileName.value = file.name
  }
}

function handleNextToBusiness() {
  error.value = ''
  if (!firstname.value || !lastname.value || !username.value || !phoneNumber.value) {
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
    payload.append('id_type', idType.value || 'Driver License')
    payload.append('file', governmentIdFile.value)

    payload.append('cafe_name', cafeName.value)
    payload.append('cafe_doc_type', cafeDocType.value)
    payload.append('branch_name', branchName.value)
    payload.append('address', address.value)
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
    error.value = e?.data?.message ?? e?.message ?? 'Registration failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-[#f2e9de] p-4 overflow-x-hidden" style="font-family: 'Poppins', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <div class="w-full max-w-[940px] h-auto md:h-[620px] rounded-[36px] overflow-hidden shadow-2xl flex flex-col md:flex-row bg-white">
      <!-- Left side branding panel -->
      <div class="relative w-full md:w-6/12 bg-[#6f4227] p-6 md:p-8 text-[#f5eddc] flex flex-col justify-between min-h-full">
        <div>
          <span class="text-2xl font-semibold tracking-[0.24em] uppercase">BrewSpot</span>
          <div class="mt-8">
            <h2 class="text-3xl font-semibold leading-tight">
              Every great cup starts<br />with great management.
            </h2>
            <p class="mt-3 max-w-[16rem] text-sm text-[#f5eddc]/80">
              BrewSpot · Café Management System · Davao City
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div class="rounded-3xl border border-[#f5eddc]/15 bg-[#7b4d36]/70 p-3 text-center">
            <p class="text-[0.65rem] uppercase tracking-[0.18em] text-[#f5eddc]/80">Today's Sales</p>
            <p class="mt-2 text-xl font-semibold">₱9,240</p>
          </div>
          <div class="rounded-3xl border border-[#f5eddc]/15 bg-[#7b4d36]/70 p-3 text-center">
            <p class="text-[0.65rem] uppercase tracking-[0.18em] text-[#f5eddc]/80">Reservation</p>
            <p class="mt-2 text-xl font-semibold">14</p>
          </div>
          <div class="rounded-3xl border border-[#f5eddc]/15 bg-[#7b4d36]/70 p-3 text-center">
            <p class="text-[0.65rem] uppercase tracking-[0.18em] text-[#f5eddc]/80">Table Turnover</p>
            <p class="mt-2 text-xl font-semibold">2.4×</p>
          </div>
        </div>
      </div>

      <!-- Right side step wizard form container -->
      <div class="w-full md:w-6/12 bg-[#fdf3e7] flex items-center justify-center p-6 overflow-y-auto max-h-full">
        
        <!-- STEP 1: Email Verification -->
        <form v-if="currentStep === 1" class="w-full max-w-[320px] space-y-5" @submit.prevent="handleSendCode">
          <div class="space-y-3">
            <button type="button" class="text-xs text-[#6f4227]/70 hover:text-[#6f4227] focus:outline-none" @click="goLogin">
              &lsaquo; Back to Login
            </button>
            <div>
              <p class="text-xs uppercase tracking-[0.24em] font-semibold text-[#6f4227]">Register your business</p>
              <h1 class="mt-2 text-2xl font-semibold text-[#3b1f0e]">Start with your email</h1>
              <p class="mt-2 text-xs text-[#3b1f0e]/60">
                Enter your email address to receive a verification code before completing registration.
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-medium text-[#3b1f0e]/80">Email address *</label>
            <input
              v-model="email"
              type="email"
              placeholder="jakimabdil22@gmail.com"
              class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-4 py-2.5 text-xs text-[#3b1f0e] placeholder:text-[#3b1f0e]/40 focus:outline-none focus:ring-2 focus:ring-[#3b1f0e]/25"
              required
            />
          </div>

          <p v-if="error" class="text-red-600 text-xs">{{ error }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full rounded-full bg-[#6f4227] text-[#fdf3e7] py-2.5 text-xs font-semibold hover:bg-[#5c3622] transition disabled:opacity-60"
          >
            {{ loading ? 'Sending...' : 'Send Verification Code' }}
          </button>
        </form>

        <!-- STEP 2: OTP Verification -->
        <div v-else-if="currentStep === 2" class="w-full max-w-[320px] space-y-5">
          <div class="space-y-3">
            <button type="button" class="text-xs text-[#6f4227]/70 hover:text-[#6f4227] focus:outline-none" @click="currentStep = 1">
              &lsaquo; Change Email
            </button>
            <div>
              <p class="text-xs uppercase tracking-[0.24em] font-semibold text-[#6f4227]">Check your inbox</p>
              <h1 class="mt-2 text-xl font-bold text-[#3b1f0e]">Enter the verification code</h1>
              <p class="mt-2 text-xs text-[#3b1f0e]/60">
                We sent a 6-digit code to <span class="font-medium text-[#3b1f0e]">{{ email }}</span>.
              </p>
            </div>
          </div>

          <form class="space-y-4" @submit.prevent="handleVerifyOTP">
            <div class="grid grid-cols-6 gap-2">
              <input
                v-for="(digit, index) in digits"
                :key="index"
                ref="inputs"
                v-model="digits[index]"
                type="text"
                inputmode="numeric"
                maxlength="1"
                class="w-full h-12 text-center text-base rounded-xl border border-[#3b1f0e]/15 bg-[#fffdf9] text-[#3b1f0e] focus:outline-none focus:ring-2 focus:ring-[#3b1f0e]/30 font-semibold"
                @input="onDigitInput(index, $event)"
                @keydown="onDigitKeydown(index, $event)"
              />
            </div>

            <button
              type="submit"
              :disabled="loading || otpCode.length < 6"
              class="w-full rounded-full bg-[#6f4227] text-[#fdf3e7] py-2.5 text-xs font-semibold hover:bg-[#5c3622] transition disabled:opacity-60"
            >
              {{ loading ? 'Verifying...' : 'Verify and Continue' }}
            </button>

            <div class="text-center">
              <button
                type="button"
                :disabled="cooldown > 0"
                class="text-xs text-[#3b1f0e]/60 hover:text-[#3b1f0e] disabled:opacity-50 focus:outline-none"
                @click="handleResendOTP"
              >
                {{ cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Didn't receive? Resend OTP" }}
              </button>
            </div>

            <p v-if="error" class="text-red-600 text-xs text-center">{{ error }}</p>
          </form>
        </div>

        <!-- STEP 3: Personal Details -->
        <form v-else-if="currentStep === 3" class="w-full max-w-[360px] space-y-4" @submit.prevent="handleNextToBusiness">
          <div class="space-y-2">
            <button type="button" class="text-xs text-[#6f4227]/70 hover:text-[#6f4227] focus:outline-none" @click="currentStep = 2">
              &lsaquo; Back to OTP Verification
            </button>
            <div>
              <p class="text-xs uppercase tracking-[0.24em] font-semibold text-[#6f4227]">Step 1 of 2: Personal Info</p>
              <h1 class="mt-1 text-xl font-bold text-[#3b1f0e]">Personal details</h1>
              <p class="text-xs text-[#3b1f0e]/60">
                Provide your identity information to verify your account.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label class="block mb-1 font-medium text-[#3b1f0e]/80">First Name *</label>
              <input v-model="firstname" type="text" placeholder="Jaime" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2" required />
            </div>
            <div>
              <label class="block mb-1 font-medium text-[#3b1f0e]/80">Last Name *</label>
              <input v-model="lastname" type="text" placeholder="Banani" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2" required />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label class="block mb-1 font-medium text-[#3b1f0e]/80">Middle Name</label>
              <input v-model="middlename" type="text" placeholder="Optional" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2" />
            </div>
            <div>
              <label class="block mb-1 font-medium text-[#3b1f0e]/80">Username *</label>
              <input v-model="username" type="text" placeholder="user_handle" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2" required />
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
                <option value="Driver License">Driver License</option>
                <option value="Passport">Passport</option>
                <option value="PRC ID">PRC ID</option>
              </select>
            </div>
          </div>

          <div class="text-xs">
            <label class="block mb-1 font-medium text-[#3b1f0e]/80">Government ID File *</label>
            <div class="flex items-center space-x-2">
              <input type="file" @change="handleGovIdChange" accept="image/*,.pdf" class="w-full text-xs text-[#3b1f0e]/80 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#6f4227] file:text-white hover:file:bg-[#5c3622]" required />
            </div>
            <p v-if="governmentIdFileName" class="mt-1 text-[0.7rem] text-[#6f4227] truncate font-medium">
              Uploaded: {{ governmentIdFileName }}
            </p>
          </div>

          <p v-if="error" class="text-red-600 text-xs text-center">{{ error }}</p>

          <button type="submit" class="w-full rounded-full bg-[#6f4227] text-[#fdf3e7] py-2.5 text-xs font-semibold hover:bg-[#5c3622] transition">
            Next: Business Registration &rsaquo;
          </button>
        </form>

        <!-- STEP 4: Business Details & 4 Requirements -->
        <div v-else-if="currentStep === 4" class="w-full">
          <!-- Page 1: Business Information -->
          <form v-if="businessSubPage === 1" class="w-full max-w-[360px] space-y-4 mx-auto" @submit.prevent="nextBusinessSubPage">
            <div class="space-y-2">
              <button type="button" class="text-xs text-[#6f4227]/70 hover:text-[#6f4227] focus:outline-none" @click="currentStep = 3">
                &lsaquo; Back to Personal Info
              </button>
              <div>
                <div class="flex items-center justify-between">
                  <p class="text-xs uppercase tracking-[0.24em] font-semibold text-[#6f4227]">Business Registration</p>
                  <span class="text-[0.7rem] bg-[#6f4227]/10 text-[#6f4227] px-2 py-0.5 rounded-full font-medium">Page 1 of 2</span>
                </div>
                <h1 class="mt-1 text-xl font-bold text-[#3b1f0e]">Business details</h1>
                <p class="text-xs text-[#3b1f0e]/60">
                  Enter your café and main branch information.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label class="block mb-1 font-medium text-[#3b1f0e]/80">Café / Business Name *</label>
                <input v-model="cafeName" type="text" placeholder="BrewSpot Davao" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2 focus:ring-1 focus:ring-[#6f4227] outline-none" required />
              </div>
              <div>
                <label class="block mb-1 font-medium text-[#3b1f0e]/80">Document Type *</label>
                <select v-model="cafeDocType" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2 focus:ring-1 focus:ring-[#6f4227] outline-none">
                  <option value="DTI">DTI</option>
                  <option value="SEC">SEC</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label class="block mb-1 font-medium text-[#3b1f0e]/80">Branch Name *</label>
                <input v-model="branchName" type="text" placeholder="Main Branch" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2 focus:ring-1 focus:ring-[#6f4227] outline-none" required />
              </div>
              <div>
                <label class="block mb-1 font-medium text-[#3b1f0e]/80">Branch Phone *</label>
                <input v-model="cafePhone" type="text" placeholder="+63 0912 345 678" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2 focus:ring-1 focus:ring-[#6f4227] outline-none" required />
              </div>
            </div>

            <div class="text-xs space-y-2">
              <div>
                <label class="block mb-1 font-medium text-[#3b1f0e]/80">Branch Address *</label>
                <input v-model="address" type="text" placeholder="Street, Barangay, District, Davao City" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2 focus:ring-1 focus:ring-[#6f4227] outline-none" required />
              </div>
              <div>
                <label class="block mb-1 font-medium text-[#3b1f0e]/80">Café Email *</label>
                <input v-model="cafeEmail" type="email" placeholder="contact@brewspot.com" class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-3 py-2 focus:ring-1 focus:ring-[#6f4227] outline-none" required />
              </div>
            </div>

            <p v-if="error" class="text-red-600 text-xs text-center font-medium">{{ error }}</p>

            <button
              type="submit"
              class="w-full rounded-full bg-[#6f4227] text-[#fdf3e7] py-2.5 text-xs font-semibold hover:bg-[#5c3622] transition shadow-sm"
            >
              Next: Upload Business Requirements &rsaquo;
            </button>
          </form>

          <!-- Page 2: 4 Required Business Documents & Final Submission -->
          <form v-else class="w-full max-w-[370px] space-y-3 mx-auto" @submit.prevent="handleFinalSubmit">
            <div class="space-y-1">
              <button type="button" class="text-xs text-[#6f4227]/70 hover:text-[#6f4227] focus:outline-none flex items-center gap-1 font-medium" @click="prevBusinessSubPage">
                &lsaquo; Back to Business Details
              </button>
              <div>
                <div class="flex items-center justify-between">
                  <p class="text-xs uppercase tracking-[0.24em] font-semibold text-[#6f4227]">Business Registration</p>
                  <span class="text-[0.7rem] bg-[#6f4227]/10 text-[#6f4227] px-2.5 py-0.5 rounded-full font-semibold">Page 2 of 2</span>
                </div>
                <h1 class="mt-0.5 text-lg font-bold text-[#3b1f0e]">Required Business Requirements</h1>
                <p class="text-[0.75rem] text-[#3b1f0e]/70">
                  Upload the 4 required business documents below.
                </p>
              </div>
            </div>

            <div class="bg-white/80 border border-[#3b1f0e]/10 rounded-2xl p-2.5 flex items-center justify-between shadow-sm">
              <div class="flex items-center space-x-2">
                <div class="w-5 h-5 rounded-full text-white flex items-center justify-center text-[0.65rem] font-bold" :class="uploadedCount === 4 ? 'bg-emerald-600' : 'bg-[#6f4227]'">
                  {{ uploadedCount }}
                </div>
                <span class="text-[0.75rem] font-semibold text-[#3b1f0e]">
                  {{ uploadedCount === 4 ? 'All 4 requirements uploaded ✓' : `${uploadedCount} of 4 requirements uploaded` }}
                </span>
              </div>
              <div class="w-20 bg-[#3b1f0e]/10 rounded-full h-1.5 overflow-hidden">
                <div class="h-full transition-all duration-300" :class="uploadedCount === 4 ? 'bg-emerald-600' : 'bg-[#6f4227]'" :style="{ width: `${(uploadedCount / 4) * 100}%` }"></div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs">
              <!-- 1. BIR Certificate -->
              <div class="bg-white rounded-2xl p-2.5 border transition shadow-sm" :class="birFile ? 'border-emerald-500 bg-emerald-50/30' : 'border-[#3b1f0e]/15 hover:border-[#6f4227]/50'">
                <div class="flex items-center justify-between mb-1">
                  <label class="font-semibold text-[0.72rem] text-[#3b1f0e]">1. BIR Certificate <span class="text-red-500">*</span></label>
                  <span v-if="birFile" class="text-[0.65rem] text-emerald-700 font-bold flex items-center gap-0.5">✓ Uploaded</span>
                </div>
                <div v-if="!birFile" class="relative">
                  <input type="file" @change="onBirChange" accept="image/*,.pdf" class="w-full text-[0.68rem] text-[#3b1f0e]/70 file:mr-1.5 file:py-0.5 file:px-2 file:rounded-full file:border-0 file:text-[0.62rem] file:font-semibold file:bg-[#6f4227] file:text-white hover:file:bg-[#5c3622] cursor-pointer" required />
                </div>
                <div v-else class="flex items-center justify-between text-[0.68rem] bg-emerald-100/60 p-1.5 rounded-xl text-emerald-900">
                  <div class="truncate mr-1">
                    <p class="font-medium truncate">{{ birFileName }}</p>
                    <p class="text-[0.6rem] text-emerald-700">{{ birFileSize }}</p>
                  </div>
                  <button type="button" @click="clearBirFile" class="text-emerald-800 hover:text-red-600 font-bold text-xs p-0.5 rounded focus:outline-none" title="Remove file">&times;</button>
                </div>
              </div>

              <!-- 2. Mayor's Permit -->
              <div class="bg-white rounded-2xl p-2.5 border transition shadow-sm" :class="mayorsFile ? 'border-emerald-500 bg-emerald-50/30' : 'border-[#3b1f0e]/15 hover:border-[#6f4227]/50'">
                <div class="flex items-center justify-between mb-1">
                  <label class="font-semibold text-[0.72rem] text-[#3b1f0e]">2. Mayor's Permit <span class="text-red-500">*</span></label>
                  <span v-if="mayorsFile" class="text-[0.65rem] text-emerald-700 font-bold flex items-center gap-0.5">✓ Uploaded</span>
                </div>
                <div v-if="!mayorsFile" class="relative">
                  <input type="file" @change="onMayorsChange" accept="image/*,.pdf" class="w-full text-[0.68rem] text-[#3b1f0e]/70 file:mr-1.5 file:py-0.5 file:px-2 file:rounded-full file:border-0 file:text-[0.62rem] file:font-semibold file:bg-[#6f4227] file:text-white hover:file:bg-[#5c3622] cursor-pointer" required />
                </div>
                <div v-else class="flex items-center justify-between text-[0.68rem] bg-emerald-100/60 p-1.5 rounded-xl text-emerald-900">
                  <div class="truncate mr-1">
                    <p class="font-medium truncate">{{ mayorsFileName }}</p>
                    <p class="text-[0.6rem] text-emerald-700">{{ mayorsFileSize }}</p>
                  </div>
                  <button type="button" @click="clearMayorsFile" class="text-emerald-800 hover:text-red-600 font-bold text-xs p-0.5 rounded focus:outline-none" title="Remove file">&times;</button>
                </div>
              </div>

              <!-- 3. DTI or SEC Document -->
              <div class="bg-white rounded-2xl p-2.5 border transition shadow-sm" :class="dtiSecFile ? 'border-emerald-500 bg-emerald-50/30' : 'border-[#3b1f0e]/15 hover:border-[#6f4227]/50'">
                <div class="flex items-center justify-between mb-1">
                  <label class="font-semibold text-[0.72rem] text-[#3b1f0e]">3. {{ cafeDocType }} Document <span class="text-red-500">*</span></label>
                  <span v-if="dtiSecFile" class="text-[0.65rem] text-emerald-700 font-bold flex items-center gap-0.5">✓ Uploaded</span>
                </div>
                <div v-if="!dtiSecFile" class="relative">
                  <input type="file" @change="onDtiSecChange" accept="image/*,.pdf" class="w-full text-[0.68rem] text-[#3b1f0e]/70 file:mr-1.5 file:py-0.5 file:px-2 file:rounded-full file:border-0 file:text-[0.62rem] file:font-semibold file:bg-[#6f4227] file:text-white hover:file:bg-[#5c3622] cursor-pointer" required />
                </div>
                <div v-else class="flex items-center justify-between text-[0.68rem] bg-emerald-100/60 p-1.5 rounded-xl text-emerald-900">
                  <div class="truncate mr-1">
                    <p class="font-medium truncate">{{ dtiSecFileName }}</p>
                    <p class="text-[0.6rem] text-emerald-700">{{ dtiSecFileSize }}</p>
                  </div>
                  <button type="button" @click="clearDtiSecFile" class="text-emerald-800 hover:text-red-600 font-bold text-xs p-0.5 rounded focus:outline-none" title="Remove file">&times;</button>
                </div>
              </div>

              <!-- 4. Sanitary Permit -->
              <div class="bg-white rounded-2xl p-2.5 border transition shadow-sm" :class="sanitaryFile ? 'border-emerald-500 bg-emerald-50/30' : 'border-[#3b1f0e]/15 hover:border-[#6f4227]/50'">
                <div class="flex items-center justify-between mb-1">
                  <label class="font-semibold text-[0.72rem] text-[#3b1f0e]">4. Sanitary Permit <span class="text-red-500">*</span></label>
                  <span v-if="sanitaryFile" class="text-[0.65rem] text-emerald-700 font-bold flex items-center gap-0.5">✓ Uploaded</span>
                </div>
                <div v-if="!sanitaryFile" class="relative">
                  <input type="file" @change="onSanitaryChange" accept="image/*,.pdf" class="w-full text-[0.68rem] text-[#3b1f0e]/70 file:mr-1.5 file:py-0.5 file:px-2 file:rounded-full file:border-0 file:text-[0.62rem] file:font-semibold file:bg-[#6f4227] file:text-white hover:file:bg-[#5c3622] cursor-pointer" required />
                </div>
                <div v-else class="flex items-center justify-between text-[0.68rem] bg-emerald-100/60 p-1.5 rounded-xl text-emerald-900">
                  <div class="truncate mr-1">
                    <p class="font-medium truncate">{{ sanitaryFileName }}</p>
                    <p class="text-[0.6rem] text-emerald-700">{{ sanitaryFileSize }}</p>
                  </div>
                  <button type="button" @click="clearSanitaryFile" class="text-emerald-800 hover:text-red-600 font-bold text-xs p-0.5 rounded focus:outline-none" title="Remove file">&times;</button>
                </div>
              </div>
            </div>

            <p v-if="error" class="text-red-600 text-xs text-center font-medium whitespace-pre-line">{{ error }}</p>
            <p v-if="success" class="text-emerald-700 text-xs text-center font-semibold">{{ success }}</p>

            <div class="flex items-center space-x-2 pt-1">
              <button
                type="button"
                class="w-1/3 rounded-full border border-[#6f4227] text-[#6f4227] py-2.5 text-xs font-semibold hover:bg-[#6f4227]/10 transition"
                @click="prevBusinessSubPage"
              >
                &lsaquo; Back
              </button>
              <button
                type="submit"
                :disabled="loading || uploadedCount < 4"
                class="w-2/3 rounded-full bg-[#6f4227] text-[#fdf3e7] py-2.5 text-xs font-semibold hover:bg-[#5c3622] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {{ loading ? 'Submitting...' : 'Submit Registration' }}
              </button>
            </div>
          </form>
        </div>

        <!-- STEP 5: Review / Submitted Screen -->
        <div v-else-if="currentStep === 5" class="w-full max-w-[340px] space-y-5">
          <div class="space-y-3">
            <p class="text-xs uppercase tracking-[0.24em] font-semibold text-[#6f4227]">Registration Submitted</p>
            <h1 class="mt-2 text-2xl font-bold text-[#3b1f0e]">Admin is currently reviewing</h1>
            <p class="mt-2 text-xs text-[#3b1f0e]/60">
              Your business registration has been sent. Our team will review your documents and approve your account within 1-3 business days.
            </p>
          </div>

          <div class="rounded-3xl border border-[#6f4227]/10 bg-[#fff6eb] p-4">
            <p class="text-xs font-semibold text-[#3b1f0e]">What happens next</p>
            <ul class="mt-3 space-y-2 text-xs text-[#3b1f0e]/80">
              <li>• Document Review</li>
              <li>• Email Notification</li>
              <li>• Account Activation</li>
            </ul>
          </div>

          <button type="button" class="w-full rounded-full bg-[#6f4227] text-[#fdf3e7] py-2.5 text-xs font-semibold hover:bg-[#5c3622] transition" @click="goLogin">
            Back to Login
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
