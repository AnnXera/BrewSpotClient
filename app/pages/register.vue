<!-- Unified Step-by-Step Business Registration Wizard -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import logoFull from '~/assets/images/logo-with-tag.svg'

const authService = useAuthService()

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

function sanitizeName(val: string): string {
  return val.replace(/[^a-zA-Z\s\-'ñÑÀ-ÿ]/g, '')
}

function isValidName(val: string): boolean {
  if (!val) return true
  return /^[a-zA-Z\s\-'ñÑÀ-ÿ]+$/.test(val.trim())
}

function onFirstNameInput(event: Event) {
  const target = event.target as HTMLInputElement
  firstname.value = sanitizeName(target.value)
  target.value = firstname.value
}

function onLastNameInput(event: Event) {
  const target = event.target as HTMLInputElement
  lastname.value = sanitizeName(target.value)
  target.value = lastname.value
}

function onMiddleNameInput(event: Event) {
  const target = event.target as HTMLInputElement
  middlename.value = sanitizeName(target.value)
  target.value = middlename.value
}
const phoneType = ref<'mobile' | 'telephone'>('mobile')
const mobileDigits = ref('')
const landlineDigits = ref('')
const phoneNumber = ref('')

function cleanMobileDigits(val: string): string {
  let cleaned = val.replace(/\D/g, '')
  if (cleaned.startsWith('639')) {
    cleaned = cleaned.slice(2)
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.replace(/^0+/, '')
  }
  return cleaned.slice(0, 10)
}

function syncPhoneNumber() {
  if (phoneType.value === 'mobile') {
    mobileDigits.value = cleanMobileDigits(mobileDigits.value)
    phoneNumber.value = mobileDigits.value ? `+63${mobileDigits.value}` : ''
  } else {
    phoneNumber.value = landlineDigits.value.trim()
  }
}

function onPhoneTypeChange() {
  error.value = ''
  syncPhoneNumber()
}

function onMobileInput(event: Event) {
  const target = event.target as HTMLInputElement
  mobileDigits.value = cleanMobileDigits(target.value)
  target.value = mobileDigits.value
  syncPhoneNumber()
}

function onLandlineInput(event: Event) {
  const target = event.target as HTMLInputElement
  landlineDigits.value = target.value.replace(/[^\d\s\-()]/g, '')
  syncPhoneNumber()
}

function isValidPhPhone(phoneStr: string): boolean {
  const digits = phoneStr.replace(/\D/g, '')
  if (digits.startsWith('639') && digits.length === 12) return true
  if (digits.startsWith('09') && digits.length === 11) return true
  if (digits.startsWith('9') && digits.length === 10) return true
  if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 11) return true
  return false
}

function validatePhoneNumber(): boolean {
  if (phoneType.value === 'mobile') {
    const cleaned = mobileDigits.value.replace(/\D/g, '')
    if (!cleaned) {
      error.value = 'Please enter your PH mobile phone number.'
      return false
    }
    if (!/^9\d{9}$/.test(cleaned)) {
      error.value = 'Invalid PH mobile number format. Must be 10 digits starting with 9 (e.g., 9171234567).'
      return false
    }
    phoneNumber.value = `+63${cleaned}`
  } else {
    const digitsOnly = landlineDigits.value.replace(/\D/g, '')
    if (!digitsOnly) {
      error.value = 'Please enter your telephone number.'
      return false
    }
    if (!/^0\d{8,10}$/.test(digitsOnly)) {
      error.value = 'Invalid PH telephone format. Must include area code starting with 0 (e.g., 082-123-4567 or 02-8123-4567).'
      return false
    }
    phoneNumber.value = landlineDigits.value.trim()
  }
  return true
}
const ownerAddress = ref('')
const idType = ref('drivers_license')
const isBackIdRequired = computed(() => idType.value !== 'passport')
const governmentIdFile = ref<File | null>(null)
const governmentIdFileName = ref('')
const governmentIdFileBack = ref<File | null>(null)
const governmentIdFileBackName = ref('')
const fieldErrors = ref<Record<string, string>>({})

function clearFieldError(field: string) {
  if (fieldErrors.value[field]) {
    delete fieldErrors.value[field]
  }
}

watch(idType, (newVal) => {
  if (newVal === 'passport') {
    governmentIdFileBack.value = null
    governmentIdFileBackName.value = ''
  }
})

// Step 4: Business Details & Documents
const businessSubPage = ref(1)
const cafeName = ref('')
const cafeDocType = ref<'DTI' | 'SEC'>('DTI')
const branchName = ref('')
const address = ref('')
const cafePhoneType = ref<'mobile' | 'telephone'>('mobile')
const cafeMobileDigits = ref('')
const cafeLandlineDigits = ref('')
const cafePhone = ref('')
const cafeEmail = ref('')

function syncCafePhone() {
  if (cafePhoneType.value === 'mobile') {
    cafeMobileDigits.value = cleanMobileDigits(cafeMobileDigits.value)
    cafePhone.value = cafeMobileDigits.value ? `+63${cafeMobileDigits.value}` : ''
  } else {
    cafePhone.value = cafeLandlineDigits.value.trim()
  }
}

function onCafePhoneTypeChange() {
  error.value = ''
  syncCafePhone()
}

function onCafeMobileInput(event: Event) {
  const target = event.target as HTMLInputElement
  cafeMobileDigits.value = cleanMobileDigits(target.value)
  target.value = cafeMobileDigits.value
  syncCafePhone()
}

function onCafeLandlineInput(event: Event) {
  const target = event.target as HTMLInputElement
  cafeLandlineDigits.value = target.value.replace(/[^\d\s\-()]/g, '')
  syncCafePhone()
}

function validateCafePhone(): boolean {
  if (cafePhoneType.value === 'mobile') {
    const cleaned = cafeMobileDigits.value.replace(/\D/g, '')
    if (!cleaned) {
      error.value = 'Please enter your branch mobile phone number.'
      return false
    }
    if (!/^9\d{9}$/.test(cleaned)) {
      error.value = 'Invalid Branch mobile phone format. Must be 10 digits starting with 9 (e.g., 9171234567).'
      return false
    }
    cafePhone.value = `+63${cleaned}`
  } else {
    const digitsOnly = cafeLandlineDigits.value.replace(/\D/g, '')
    if (!digitsOnly) {
      error.value = 'Please enter your branch telephone number.'
      return false
    }
    if (!/^0\d{8,10}$/.test(digitsOnly)) {
      error.value = 'Invalid Branch telephone format. Must include area code starting with 0 (e.g., 082-123-4567 or 02-8123-4567).'
      return false
    }
    cafePhone.value = cafeLandlineDigits.value.trim()
  }
  return true
}

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

function isValidEmail(emailStr: string): boolean {
  if (!emailStr) return false
  const trimmed = emailStr.trim()
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(trimmed)
}

// Step 1: Send Code
async function handleSendCode() {
  error.value = ''
  const trimmedEmail = email.value.trim()
  if (!trimmedEmail) {
    error.value = 'Please enter your email address.'
    return
  }
  if (!isValidEmail(trimmedEmail)) {
    error.value = 'Invalid email format. Email must follow standard user@domain.com syntax with an "@" symbol and a valid domain (e.g., name@gmail.com).'
    return
  }
  loading.value = true
  try {
    const res = await authService.sendRegistrationCode(trimmedEmail) as any
    if (res) {
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
    const res = await authService.verifyRegistrationCode(email.value.trim(), otpCode.value) as any
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
    const res = await authService.resendRegistrationCode(email.value.trim())
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

function isValidFileType(file: File): boolean {
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf']
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  return allowedExtensions.includes(ext)
}

// Step 3: Personal Info
function handleGovIdChange(event: Event) {
  error.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (!isValidFileType(file)) {
      error.value = 'Government ID (Front) must be a JPG, JPEG, PNG, or PDF file.'
      input.value = ''
      governmentIdFile.value = null
      governmentIdFileName.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      error.value = 'Government ID (Front) file size must not exceed 5MB.'
      input.value = ''
      governmentIdFile.value = null
      governmentIdFileName.value = ''
      return
    }
    governmentIdFile.value = file
    governmentIdFileName.value = file.name
  }
}

function handleGovIdBackChange(event: Event) {
  error.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (!isValidFileType(file)) {
      error.value = 'Government ID (Back) must be a JPG, JPEG, PNG, or PDF file.'
      input.value = ''
      governmentIdFileBack.value = null
      governmentIdFileBackName.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      error.value = 'Government ID (Back) file size must not exceed 5MB.'
      input.value = ''
      governmentIdFileBack.value = null
      governmentIdFileBackName.value = ''
      return
    }
    governmentIdFileBack.value = file
    governmentIdFileBackName.value = file.name
  }
}

function onPhoneNumberInput(event: Event) {
  clearFieldError('phone_number')
  const target = event.target as HTMLInputElement
  let val = target.value.replace(/\D/g, '')
  if (val.startsWith('63')) {
    val = '0' + val.slice(2)
  }
  val = val.slice(0, 11)
  phoneNumber.value = val
  target.value = val
}

function onCafePhoneInput(event: Event) {
  clearFieldError('cafe_phonenumber')
  const target = event.target as HTMLInputElement
  let val = target.value.replace(/\D/g, '')
  if (val.startsWith('63')) {
    val = '0' + val.slice(2)
  }
  val = val.slice(0, 11)
  cafePhone.value = val
  target.value = val
}

function normalizePhoneNumber(num: string): string {
  const digits = (num || '').replace(/\D/g, '')
  return digits.replace(/^63/, '0')
}

async function checkUsernameAvailability() {
  if (!username.value.trim()) return
  try {
    const res = await authService.validateRegistrationStep(userUuid.value, { username: username.value.trim() })
    if (res.errors?.username) {
      fieldErrors.value.username = res.errors.username[0]
    } else {
      delete fieldErrors.value.username
    }
  } catch (e: any) {
    const errs = e?.data?.errors || e?.response?._data?.errors
    if (errs?.username?.[0]) {
      fieldErrors.value.username = errs.username[0]
    }
  }
}

async function checkPhoneAvailability() {
  if (!phoneNumber.value.trim()) return
  if (!/^09\d{9}$/.test(phoneNumber.value)) {
    fieldErrors.value.phone_number = 'Personal contact number must start with 09 and be 11 digits long (e.g., 09123456789).'
    return
  }
  try {
    const res = await authService.validateRegistrationStep(userUuid.value, { phone_number: phoneNumber.value.trim() })
    if (res.errors?.phone_number) {
      fieldErrors.value.phone_number = res.errors.phone_number[0]
    } else {
      delete fieldErrors.value.phone_number
    }
  } catch (e: any) {
    const errs = e?.data?.errors || e?.response?._data?.errors
    if (errs?.phone_number?.[0]) {
      fieldErrors.value.phone_number = errs.phone_number[0]
    }
  }
}

async function checkCafeEmailAvailability() {
  if (!cafeEmail.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cafeEmail.value.trim())) return
  try {
    const res = await authService.validateRegistrationStep(userUuid.value, { cafe_email: cafeEmail.value.trim() })
    if (res.errors?.cafe_email) {
      fieldErrors.value.cafe_email = res.errors.cafe_email[0]
    } else {
      delete fieldErrors.value.cafe_email
    }
  } catch (e: any) {
    const errs = e?.data?.errors || e?.response?._data?.errors
    if (errs?.cafe_email?.[0]) {
      fieldErrors.value.cafe_email = errs.cafe_email[0]
    }
  }
}

async function checkCafePhoneAvailability() {
  if (!cafePhone.value.trim()) return
  if (!/^09\d{9}$/.test(cafePhone.value)) {
    fieldErrors.value.cafe_phonenumber = 'Branch phone number must start with 09 and be 11 digits long (e.g., 09123456789).'
    return
  }
  try {
    const res = await authService.validateRegistrationStep(userUuid.value, {
      cafe_phonenumber: cafePhone.value.trim(),
      phone_number: phoneNumber.value.trim(),
    })
    if (res.errors?.cafe_phonenumber) {
      fieldErrors.value.cafe_phonenumber = res.errors.cafe_phonenumber[0]
    } else {
      delete fieldErrors.value.cafe_phonenumber
    }
  } catch (e: any) {
    const errs = e?.data?.errors || e?.response?._data?.errors
    if (errs?.cafe_phonenumber?.[0]) {
      fieldErrors.value.cafe_phonenumber = errs.cafe_phonenumber[0]
    }
  }
}

async function handleNextToBusiness() {
  error.value = ''
  fieldErrors.value = {}

  if (!firstname.value || !lastname.value || !username.value || !phoneNumber.value || !ownerAddress.value) {
    error.value = 'Please complete all required personal fields.'
    return
  }
  if (!/^09\d{9}$/.test(phoneNumber.value)) {
    fieldErrors.value.phone_number = 'Personal contact number must start with 09 and be 11 digits long (e.g., 09123456789).'
    error.value = 'Please correct the phone number format.'
    return
  }
  if (cafePhone.value.trim()) {
    const normPersonal = normalizePhoneNumber(phoneNumber.value)
    const normCafe = normalizePhoneNumber(cafePhone.value)
    if (normPersonal && normCafe && normPersonal === normCafe) {
      fieldErrors.value.phone_number = 'Personal contact number and café phone number must be different.'
      error.value = 'Personal contact number and café phone number must be different.'
      return
    }
  }
  if (!governmentIdFile.value) {
    error.value = isBackIdRequired.value
      ? 'Please upload the Front of your Government ID.'
      : 'Please upload your Passport file.'
    return
  }
  if (isBackIdRequired.value && !governmentIdFileBack.value) {
    error.value = 'Please upload the Back of your Government ID.'
    return
  }

  loading.value = true
  try {
    const res = await authService.validateRegistrationStep(userUuid.value, {
      step: 'personal',
      username: username.value.trim(),
      phone_number: phoneNumber.value.trim(),
    })
    if (res.errors) {
      for (const [k, msgs] of Object.entries(res.errors)) {
        if (Array.isArray(msgs) && msgs.length > 0) {
          fieldErrors.value[k] = msgs[0]
        }
      }
      error.value = Object.values(fieldErrors.value)[0] || 'Please resolve the errors above.'
      return
    }
  } catch (e: any) {
    const errs = e?.data?.errors || e?.response?._data?.errors
    if (errs && typeof errs === 'object') {
      for (const [k, msgs] of Object.entries(errs)) {
        if (Array.isArray(msgs) && msgs.length > 0) {
          fieldErrors.value[k] = msgs[0] as string
        }
      }
      error.value = Object.values(fieldErrors.value)[0] || 'Please resolve the errors above.'
      return
    }
    error.value = extractErrorMessage(e, 'Validation failed. Please check your personal details.')
    return
  } finally {
    loading.value = false
  }

  currentStep.value = 4
  businessSubPage.value = 1
}

// Step 4: Business Details & 4 Documents
async function nextBusinessSubPage() {
  error.value = ''
  fieldErrors.value = {}

  if (!cafeName.value.trim()) {
    error.value = 'Café / Business Name is required.'
    return
  }
  if (!branchName.value.trim()) {
    error.value = 'Branch Name is required.'
    return
  }
  if (!address.value.trim()) {
    error.value = 'Branch Address is required.'
    return
  }
  if (!cafePhone.value.trim()) {
    fieldErrors.value.cafe_phonenumber = 'Branch Phone Number is required.'
    error.value = 'Branch Phone Number is required.'
    return
  }
  if (!/^09\d{9}$/.test(cafePhone.value)) {
    fieldErrors.value.cafe_phonenumber = 'Branch phone number must start with 09 and be 11 digits long (e.g., 09123456789).'
    error.value = 'Branch phone number must start with 09 and be 11 digits long (e.g., 09123456789).'
    return
  }
  const normPersonal = normalizePhoneNumber(phoneNumber.value)
  const normCafe = normalizePhoneNumber(cafePhone.value)
  if (normPersonal && normCafe && normPersonal === normCafe) {
    fieldErrors.value.cafe_phonenumber = 'Branch phone number must be different from your personal contact number.'
    error.value = 'Branch phone number must be different from your personal contact number.'
    return
  }
  if (!cafeEmail.value.trim()) {
    fieldErrors.value.cafe_email = 'Café Email is required.'
    error.value = 'Café Email is required.'
    return
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(cafeEmail.value.trim())) {
    fieldErrors.value.cafe_email = 'Please enter a valid Café Email address.'
    error.value = 'Please enter a valid Café Email address.'
    return
  }

  loading.value = true
  try {
    const res = await authService.validateRegistrationStep(userUuid.value, {
      step: 'cafe',
      cafe_email: cafeEmail.value.trim(),
      cafe_phonenumber: cafePhone.value.trim(),
      phone_number: phoneNumber.value.trim(),
    })
    if (res.errors) {
      for (const [k, msgs] of Object.entries(res.errors)) {
        if (Array.isArray(msgs) && msgs.length > 0) {
          fieldErrors.value[k] = msgs[0]
        }
      }
      error.value = Object.values(fieldErrors.value)[0] || 'Please resolve the errors above.'
      return
    }
  } catch (e: any) {
    const errs = e?.data?.errors || e?.response?._data?.errors
    if (errs && typeof errs === 'object') {
      for (const [k, msgs] of Object.entries(errs)) {
        if (Array.isArray(msgs) && msgs.length > 0) {
          fieldErrors.value[k] = msgs[0] as string
        }
      }
      error.value = Object.values(fieldErrors.value)[0] || 'Please resolve the errors above.'
      return
    }
    error.value = extractErrorMessage(e, 'Validation failed. Please check your café details.')
    return
  } finally {
    loading.value = false
  }

  businessSubPage.value = 2
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
    if (!isValidFileType(file)) {
      error.value = 'BIR Certificate must be a JPG, JPEG, PNG, or PDF file.'
      input.value = ''
      clearBirFile()
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      error.value = 'BIR Certificate file size must not exceed 5MB.'
      input.value = ''
      clearBirFile()
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
    if (!isValidFileType(file)) {
      error.value = "Mayor's Permit must be a JPG, JPEG, PNG, or PDF file."
      input.value = ''
      clearMayorsFile()
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      error.value = "Mayor's Permit file size must not exceed 5MB."
      input.value = ''
      clearMayorsFile()
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
    if (!isValidFileType(file)) {
      error.value = `${cafeDocType.value} Document must be a JPG, JPEG, PNG, or PDF file.`
      input.value = ''
      clearDtiSecFile()
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      error.value = `${cafeDocType.value} document file size must not exceed 5MB.`
      input.value = ''
      clearDtiSecFile()
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
    if (!isValidFileType(file)) {
      error.value = 'Sanitary Permit must be a JPG, JPEG, PNG, or PDF file.'
      input.value = ''
      clearSanitaryFile()
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      error.value = 'Sanitary Permit file size must not exceed 5MB.'
      input.value = ''
      clearSanitaryFile()
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

  if (!governmentIdFile.value || (isBackIdRequired.value && !governmentIdFileBack.value)) {
    error.value = isBackIdRequired.value
      ? 'Missing Government ID files (Front & Back). Please return to Personal Information step.'
      : 'Missing Passport file. Please return to Personal Information step.'
    return
  }

  if (!/^09\d{9}$/.test(phoneNumber.value)) {
    error.value = 'Personal contact number must start with 09 and be 11 digits long (e.g., 09123456789).'
    return
  }
  if (!/^09\d{9}$/.test(cafePhone.value)) {
    error.value = 'Branch phone number must start with 09 and be 11 digits long (e.g., 09123456789).'
    return
  }
  if (phoneNumber.value === cafePhone.value) {
    error.value = 'Branch phone number must be different from your personal contact number.'
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
    if (isBackIdRequired.value && governmentIdFileBack.value) {
      payload.append('file_back', governmentIdFileBack.value)
    }

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
    const errs = e?.data?.errors || e?.response?._data?.errors
    if (errs && typeof errs === 'object') {
      fieldErrors.value = {}
      for (const [k, msgs] of Object.entries(errs)) {
        if (Array.isArray(msgs) && msgs.length > 0) {
          fieldErrors.value[k] = msgs[0] as string
        }
      }
      const personalFields = ['username', 'phone_number', 'firstname', 'middlename', 'lastname', 'owner_address', 'id_type', 'file', 'file_back']
      const businessFields = ['cafe_name', 'branch_name', 'address', 'cafe_email', 'cafe_phonenumber', 'cafe_picture', 'cafe_doc_type']

      const hasPersonalErr = personalFields.some(f => fieldErrors.value[f])
      const hasBusinessErr = businessFields.some(f => fieldErrors.value[f])

      if (hasPersonalErr) {
        currentStep.value = 3
      } else if (hasBusinessErr) {
        currentStep.value = 4
        businessSubPage.value = 1
      } else {
        currentStep.value = 4
        businessSubPage.value = 2
      }
      error.value = Object.values(fieldErrors.value)[0] || 'Please review the highlighted fields and fix any errors.'
      return
    }
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
                  placeholder="John"
                  class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                  required
                  @input="onFirstNameInput"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1 text-[#2d201b]">Last Name *</label>
                <input
                  v-model="lastname"
                  type="text"
                  placeholder="Doe"
                  class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                  required
                  @input="onLastNameInput"
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
                  @input="onMiddleNameInput"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1 text-[#2d201b]">Username *</label>
                <input
                  v-model="username"
                  type="text"
                  placeholder="Username"
                  :class="[
                    'w-full h-11 rounded-md border px-3 outline-none transition bg-white text-sm text-[#2d201b]',
                    fieldErrors.username
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-gray-300 focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20'
                  ]"
                  required
                  @input="clearFieldError('username')"
                  @blur="checkUsernameAvailability"
                />
                <p v-if="fieldErrors.username" class="text-xs text-red-600 mt-1 font-medium">{{ fieldErrors.username }}</p>
              </div>
            </div>

            <div class="grid grid-cols-12 gap-2.5">
              <!-- Contact No. (7 of 12 cols - extended width so all input numbers fit) -->
              <div class="col-span-7">
                <label class="block text-sm font-medium mb-1 text-[#2d201b]">Contact No. *</label>
                <input
                  v-model="phoneNumber"
                  type="tel"
                  inputmode="numeric"
                  maxlength="11"
                  placeholder="09123456789"
                  :class="[
                    'w-full h-11 rounded-md border px-3 outline-none transition bg-white text-sm text-[#2d201b]',
                    fieldErrors.phone_number
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-gray-300 focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20'
                  ]"
                  required
                  @input="onPhoneNumberInput"
                  @blur="checkPhoneAvailability"
                />
                <p v-if="fieldErrors.phone_number" class="text-xs text-red-600 mt-1 font-medium">{{ fieldErrors.phone_number }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1 text-[#2d201b]">ID Type *</label>
                <select
                  v-model="idType"
                  class="w-full h-11 rounded-md border border-gray-300 px-2 outline-none transition bg-white text-xs font-medium text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20 truncate"
                >
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

            <div>
              <label class="block text-sm font-medium mb-1 text-[#2d201b]">Personal Address *</label>
              <input
                v-model="ownerAddress"
                type="text"
                placeholder="Street, Barangay, District, Davao City"
                class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1 text-[#2d201b]">
                {{ isBackIdRequired ? 'Government ID (Front & Back) *' : 'Passport (Photo / Bio-page) *' }}
              </label>
              <div :class="isBackIdRequired ? 'grid grid-cols-2 gap-3' : ''">
                <div>
                  <input
                    type="file"
                    @change="handleGovIdChange"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    class="w-full text-sm text-[#2d201b] border border-gray-300 rounded-md bg-white p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#7B5A50] file:text-white hover:file:bg-[#65463d] cursor-pointer"
                    required
                  />
                  <p v-if="governmentIdFileName" class="mt-1 text-xs text-[#7B5A50] truncate font-medium">
                    {{ isBackIdRequired ? `Front: ${governmentIdFileName}` : `File: ${governmentIdFileName}` }}
                  </p>
                </div>
                <div v-if="isBackIdRequired">
                  <input
                    type="file"
                    @change="handleGovIdBackChange"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    class="w-full text-sm text-[#2d201b] border border-gray-300 rounded-md bg-white p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#7B5A50] file:text-white hover:file:bg-[#65463d] cursor-pointer"
                    :required="isBackIdRequired"
                  />
                  <p v-if="governmentIdFileBackName" class="mt-1 text-xs text-[#7B5A50] truncate font-medium">
                    Back: {{ governmentIdFileBackName }}
                  </p>
                </div>
              </div>
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

              <div class="grid grid-cols-12 gap-2.5">
                <!-- Branch Name (5 of 12 cols) -->
                <div class="col-span-5">
                  <label class="block text-sm font-medium mb-1 text-[#2d201b]">Branch Name *</label>
                  <input
                    v-model="branchName"
                    type="text"
                    placeholder="Main Branch"
                    class="w-full h-11 rounded-md border border-gray-300 px-3 outline-none transition bg-white text-sm text-[#2d201b] focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                    required
                  />
                </div>

                <!-- Branch Phone (7 of 12 cols - extended width so all input numbers fit) -->
                <div class="col-span-7">
                  <label class="block text-sm font-medium mb-1 text-[#2d201b]">Branch Phone *</label>
                  <input
                    v-model="cafePhone"
                    type="tel"
                    inputmode="numeric"
                    maxlength="11"
                    placeholder="09123456789"
                    :class="[
                      'w-full h-11 rounded-md border px-3 outline-none transition bg-white text-sm text-[#2d201b]',
                      fieldErrors.cafe_phonenumber
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-gray-300 focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20'
                    ]"
                    required
                    @input="onCafePhoneInput"
                    @blur="checkCafePhoneAvailability"
                  />
                  <p v-if="fieldErrors.cafe_phonenumber" class="text-xs text-red-600 mt-1 font-medium">{{ fieldErrors.cafe_phonenumber }}</p>
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
                  :class="[
                    'w-full h-11 rounded-md border px-3 outline-none transition bg-white text-sm text-[#2d201b]',
                    fieldErrors.cafe_email
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-gray-300 focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20'
                  ]"
                  required
                  @input="clearFieldError('cafe_email')"
                  @blur="checkCafeEmailAvailability"
                />
                <p v-if="fieldErrors.cafe_email" class="text-xs text-red-600 mt-1 font-medium">{{ fieldErrors.cafe_email }}</p>
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
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
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
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
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
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
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
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
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
