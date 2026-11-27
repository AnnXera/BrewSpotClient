<!-- Unified Step-by-Step Business Registration Wizard -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import logoFull from '~/assets/images/logo-with-tag.svg'
import DropdownList, { type DropdownListOption } from '~/components/common/DropdownList.vue'
import EmilCalendar from '~/components/common/EmilCalendar.vue'
import { KEEP_FILE, type PreviousApplication } from '~/services/AuthService'

const PHONE_TYPE_OPTIONS: DropdownListOption<'mobile' | 'telephone'>[] = [
  { value: 'mobile', label: 'Phone (+63)' },
  { value: 'telephone', label: 'Landline' }
]

const ID_TYPE_OPTIONS: DropdownListOption<string>[] = [
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'sss', label: 'SSS ID' },
  { value: 'philhealth', label: 'PhilHealth ID' },
  { value: 'pagibig', label: 'Pag-IBIG ID' },
  { value: 'voters_id', label: "Voter's ID" }
]

const CAFE_DOC_TYPE_OPTIONS: DropdownListOption<'DTI' | 'SEC'>[] = [
  { value: 'DTI', label: 'DTI' },
  { value: 'SEC', label: 'SEC' }
]

const authService = useAuthService()
const route = useRoute()

const currentStep = ref(1)

// Resubmitting a rejected application: the admin's reason, shown above the form,
// and the document types the kept files belong to (a kept file is sent as KEEP_FILE).
const resubmitting = ref(false)
const resubmitReason = ref('')
const keptIdType = ref('')
const keptCafeDocType = ref('')
const reapplyHint = ref('') // step 1 note when arriving from "Edit and Resubmit"

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
const resending = ref(false)
const notice = ref('')
const RESEND_COOLDOWN = 30
let cooldownTimer: ReturnType<typeof setInterval> | null = null

// Step 3: Your Details
const userUuid = ref('')
const verifiedEmail = ref('') // the email userUuid was verified for; going back with it skips the code
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
  } else if (cleaned.startsWith('09')) {
    cleaned = cleaned.slice(1)
  } else if (cleaned.startsWith('0') && cleaned.length > 1) {
    cleaned = cleaned.replace(/^0+/, '')
  }
  return cleaned.slice(0, 10)
}

function cleanLandlineDigits(val: string): string {
  let cleaned = val.replace(/\D/g, '')
  return cleaned.slice(0, 10)
}

function isValidPhLandline(val: string): boolean {
  const digits = cleanLandlineDigits(val)
  return /^082\d{7}$/.test(digits)
}

function formatLandlineForBackend(val: string): string {
  return cleanLandlineDigits(val)
}

function syncPhoneNumber() {
  clearFieldError('phone_number')
  if (phoneType.value === 'mobile') {
    mobileDigits.value = cleanMobileDigits(mobileDigits.value)
    phoneNumber.value = mobileDigits.value ? `+63${mobileDigits.value}` : ''
  } else {
    const cleaned = cleanLandlineDigits(landlineDigits.value)
    phoneNumber.value = cleaned ? formatLandlineForBackend(cleaned) : ''
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
  landlineDigits.value = target.value.replace(/[^\d\s\-()]/g, '').slice(0, 15)
  syncPhoneNumber()
}

function isValidPhPhone(phoneStr: string): boolean {
  const digits = phoneStr.replace(/\D/g, '')
  if (digits.startsWith('639') && digits.length === 12) return true
  if (digits.startsWith('09') && digits.length === 11) return true
  if (digits.startsWith('9') && digits.length === 10) return true
  if (digits.startsWith('0') && digits.length >= 7 && digits.length <= 11) return true
  return false
}

function validatePhoneNumber(): boolean {
  if (phoneType.value === 'mobile') {
    const cleaned = cleanMobileDigits(mobileDigits.value)
    if (!cleaned) {
      fieldErrors.value.phone_number = 'Personal phone number is required.'
      return false
    }
    if (!/^9\d{9}$/.test(cleaned)) {
      fieldErrors.value.phone_number = 'Personal phone number must be 10 digits starting with 9 (e.g., 9123456789).'
      return false
    }
    delete fieldErrors.value.phone_number
    phoneNumber.value = `+63${cleaned}`
  } else {
    if (!landlineDigits.value.trim()) {
      fieldErrors.value.phone_number = 'Personal landline number is required.'
      return false
    }
    if (!isValidPhLandline(landlineDigits.value)) {
      fieldErrors.value.phone_number = 'Invalid PH landline format. Include area code (e.g., 082-299-1234 or 02-8123-4567).'
      return false
    }
    delete fieldErrors.value.phone_number
    phoneNumber.value = formatLandlineForBackend(landlineDigits.value)
  }
  if (cafePhone.value.trim()) {
    const normPersonal = normalizePhoneNumber(phoneNumber.value)
    const normCafe = normalizePhoneNumber(cafePhone.value)
    if (normPersonal && normCafe && normPersonal === normCafe) {
      fieldErrors.value.phone_number = 'Personal contact number and café phone number must be different.'
      return false
    }
  }
  if (phoneNumber.value.trim()) {
    const normPersonal = normalizePhoneNumber(phoneNumber.value)
    const normCafe = normalizePhoneNumber(cafePhone.value)
    if (normPersonal && normCafe && normPersonal === normCafe) {
      fieldErrors.value.cafe_phonenumber = 'Branch phone number must be different from your personal contact number.'
      return false
    }
  }
  return true
}
const ownerAddress = ref('')
const idType = ref('drivers_license')
const isBackIdRequired = computed(() => idType.value !== 'passport')
const governmentIdFile = ref<File | null>(null)
const governmentIdFileName = ref('')
const governmentIdFilePath = ref('')
const governmentIdFileBack = ref<File | null>(null)
const governmentIdFileBackName = ref('')
const governmentIdFileBackPath = ref('')
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
  // A kept ID only counts for the ID type it was submitted as
  if (newVal !== keptIdType.value) {
    if (governmentIdFilePath.value === KEEP_FILE) {
      governmentIdFile.value = null; governmentIdFileName.value = ''; governmentIdFilePath.value = ''
    }
    if (governmentIdFileBackPath.value === KEEP_FILE) {
      governmentIdFileBack.value = null; governmentIdFileBackName.value = ''; governmentIdFileBackPath.value = ''
    }
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
  clearFieldError('cafe_phonenumber')
  if (cafePhoneType.value === 'mobile') {
    cafeMobileDigits.value = cleanMobileDigits(cafeMobileDigits.value)
    cafePhone.value = cafeMobileDigits.value ? `+63${cafeMobileDigits.value}` : ''
  } else {
    const cleaned = cleanLandlineDigits(cafeLandlineDigits.value)
    cafePhone.value = cleaned ? formatLandlineForBackend(cleaned) : ''
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
  cafeLandlineDigits.value = target.value.replace(/[^\d\s\-()]/g, '').slice(0, 15)
  syncCafePhone()
}

function validateCafePhone(): boolean {
  if (cafePhoneType.value === 'mobile') {
    const cleaned = cleanMobileDigits(cafeMobileDigits.value)
    if (!cleaned) {
      fieldErrors.value.cafe_phonenumber = 'Branch phone number is required.'
      return false
    }
    if (!/^9\d{9}$/.test(cleaned)) {
      fieldErrors.value.cafe_phonenumber = 'Branch phone number must be 10 digits starting with 9 (e.g., 9123456789).'
      return false
    }
    delete fieldErrors.value.cafe_phonenumber
    cafePhone.value = `+63${cleaned}`
  } else {
    if (!cafeLandlineDigits.value.trim()) {
      fieldErrors.value.cafe_phonenumber = 'Branch landline number is required.'
      return false
    }
    if (!isValidPhLandline(cafeLandlineDigits.value)) {
      fieldErrors.value.cafe_phonenumber = 'Invalid PH landline format. Include area code (e.g., 082-299-1234 or 02-8123-4567).'
      return false
    }
    delete fieldErrors.value.cafe_phonenumber
    cafePhone.value = formatLandlineForBackend(cafeLandlineDigits.value)
  }
  return true
}

// 2 Required Business Files
const birFile = ref<File | null>(null)
const dtiSecFile = ref<File | null>(null)

const birFileName = ref('')
const birFileSize = ref('')
const birFilePath = ref('')
const dtiSecFileName = ref('')
const dtiSecFileSize = ref('')
const dtiSecFilePath = ref('')

// Optional café picture (shown publicly on the branch)
const cafePictureName = ref('')
const cafePicturePath = ref('')
const cafePicturePreview = ref('') // object URL; empty after a draft restore, when only the name is known

// BIR Certificate Additional Details
const birRegisteredAt = ref('')
const tinNumber = ref('')
const vat = ref<'vat-registered' | 'non-vat'>('non-vat')

// A kept DTI/SEC file only counts for the document type it was submitted as
watch(cafeDocType, (newVal) => {
  if (newVal !== keptCafeDocType.value && dtiSecFilePath.value === KEEP_FILE) {
    dtiSecFile.value = null; dtiSecFileName.value = ''; dtiSecFilePath.value = ''; dtiSecFileSize.value = ''
  }
})

// XXX-XXX-XXX-XXXXX: 9-digit TIN + 5-digit branch code (00000 = head office / main branch)
function formatTinNumber(val: string): string {
  const raw = val.replace(/[^0-9]/g, '').slice(0, 14)
  return [raw.slice(0, 3), raw.slice(3, 6), raw.slice(6, 9), raw.slice(9, 14)].filter(Boolean).join('-')
}

function onTinInput(event: Event) {
  clearFieldError('tin_number')
  const target = event.target as HTMLInputElement
  tinNumber.value = formatTinNumber(target.value)
  target.value = tinNumber.value
}

const uploadedCount = computed(() => {
  let count = 0
  if (birFile.value) count++
  if (dtiSecFile.value) count++
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

function clearAllInputs() {
  // Step 1
  email.value = ''
  // Step 2
  digits.value = ['', '', '', '', '', '']
  cooldown.value = 0
  notice.value = ''
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
  // Step 3
  userUuid.value = ''
  verifiedEmail.value = ''
  firstname.value = ''
  middlename.value = ''
  lastname.value = ''
  username.value = ''
  phoneType.value = 'mobile'
  mobileDigits.value = ''
  landlineDigits.value = ''
  phoneNumber.value = ''
  ownerAddress.value = ''
  idType.value = 'drivers_license'
  governmentIdFile.value = null
  governmentIdFileName.value = ''
  governmentIdFilePath.value = ''
  governmentIdFileBack.value = null
  governmentIdFileBackName.value = ''
  governmentIdFileBackPath.value = ''
  // Step 4
  businessSubPage.value = 1
  cafeName.value = ''
  cafeDocType.value = 'DTI'
  branchName.value = ''
  address.value = ''
  cafePhoneType.value = 'mobile'
  cafeMobileDigits.value = ''
  cafeLandlineDigits.value = ''
  cafePhone.value = ''
  cafeEmail.value = ''
  birFile.value = null
  birFileName.value = ''
  birFileSize.value = ''
  birFilePath.value = ''
  dtiSecFile.value = null
  dtiSecFileName.value = ''
  dtiSecFileSize.value = ''
  dtiSecFilePath.value = ''
  clearCafePicture()
  birRegisteredAt.value = ''
  tinNumber.value = ''
  vat.value = 'non-vat'
  // Resubmission
  resubmitting.value = false
  resubmitReason.value = ''
  keptIdType.value = ''
  keptCafeDocType.value = ''
  reapplyHint.value = ''
  // Errors & state
  error.value = ''
  success.value = ''
  fieldErrors.value = {}
  // Clear draft
  sessionStorage.removeItem('registrationDraft')
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
  // Already verified this email in this tab: go straight back to the application.
  if (userUuid.value && trimmedEmail.toLowerCase() === verifiedEmail.value.toLowerCase()) {
    currentStep.value = 3
    if (!resubmitting.value) await loadPreviousApplication()
    return
  }
  loading.value = true
  try {
    const res = await authService.sendRegistrationCode(trimmedEmail) as any
    if (res) {
      digits.value = ['', '', '', '', '', '']
      notice.value = ''
      currentStep.value = 2
      startCooldown(RESEND_COOLDOWN)
      nextTick(() => inputs.value[0]?.focus())
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
function startCooldown(seconds: number) {
  cooldown.value = seconds
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

const cooldownLabel = computed(() => {
  const m = Math.floor(cooldown.value / 60)
  const sec = String(cooldown.value % 60).padStart(2, '0')
  return `${m}:${sec}`
})

function resetDigits() {
  digits.value = ['', '', '', '', '', '']
  nextTick(() => inputs.value[0]?.focus())
}

function fillFrom(index: number, raw: string) {
  const chars = raw.replace(/\D/g, '').slice(0, 6 - index).split('')
  chars.forEach((c, i) => (digits.value[index + i] = c))
  inputs.value[Math.min(index + chars.length, 5)]?.focus()
  if (otpCode.value.length === 6) handleVerifyOTP()
}

function onDigitInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const cleaned = target.value.replace(/\D/g, '')
  if (cleaned.length > 1) {
    // Browser autofill or OTP suggestion delivers the whole code in one field
    fillFrom(index, cleaned)
    return
  }
  digits.value[index] = cleaned
  target.value = cleaned
  if (cleaned && index < 5) inputs.value[index + 1]?.focus()
  if (otpCode.value.length === 6) handleVerifyOTP()
}

function onDigitKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    inputs.value[index - 1]?.focus()
  } else if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault()
    inputs.value[index - 1]?.focus()
  } else if (event.key === 'ArrowRight' && index < 5) {
    event.preventDefault()
    inputs.value[index + 1]?.focus()
  }
}

function onDigitPaste(index: number, event: ClipboardEvent) {
  event.preventDefault()
  fillFrom(index, event.clipboardData?.getData('text') ?? '')
}

async function handleVerifyOTP() {
  if (loading.value || otpCode.value.length < 6) return
  error.value = ''
  notice.value = ''
  loading.value = true
  try {
    const res = await authService.verifyRegistrationCode(email.value.trim(), otpCode.value) as any
    if (res.user_uuid) {
      userUuid.value = res.user_uuid
      verifiedEmail.value = email.value.trim()
      await loadPreviousApplication()
      currentStep.value = 3
    } else {
      error.value = res.message || 'That code did not work. Check it and try again.'
      resetDigits()
    }
  } catch (e: any) {
    error.value = extractErrorMessage(e, 'Verification failed. Check your connection and try again.')
    resetDigits()
  } finally {
    loading.value = false
    if (error.value) nextTick(() => inputs.value[0]?.focus())
  }
}

async function handleResendOTP() {
  if (cooldown.value > 0 || resending.value) return
  error.value = ''
  notice.value = ''
  resending.value = true
  try {
    const res = await authService.resendRegistrationCode(email.value.trim())
    if (res.success) {
      notice.value = `A new code was sent to ${email.value.trim()}.`
      startCooldown(RESEND_COOLDOWN)
      resetDigits()
    } else if (res.retry_after_seconds) {
      startCooldown(res.retry_after_seconds)
    } else {
      error.value = res.message || 'Unable to resend code.'
    }
  } catch (e: any) {
    error.value = extractErrorMessage(e, 'Could not resend code.')
  } finally {
    resending.value = false
  }
}

/** Splits a stored phone (+639xxxxxxxxx or 082xxxxxxx) into the wizard's type and digits */
function splitPhone(value: string | null): { type: 'mobile' | 'telephone'; mobile: string; landline: string } {
  if (value && value.startsWith('082')) return { type: 'telephone', mobile: '', landline: value }
  return { type: 'mobile', mobile: value ? cleanMobileDigits(value) : '', landline: '' }
}

/** Marks a previous document as kept: shown as uploaded, sent back as KEEP_FILE */
function keptFile(name: string | null) {
  return name
    ? { file: new File([''], name, { type: 'application/octet-stream' }), name, path: KEEP_FILE }
    : { file: null, name: '', path: '' }
}

/**
 * Resubmitting after a rejection: prefill every step from the rejected
 * application so the owner only changes what the admin flagged.
 */
async function loadPreviousApplication() {
  if (!userUuid.value) return
  let prev: PreviousApplication | null = null
  try {
    const res = await authService.previousApplication(userUuid.value)
    prev = res.application ?? null
  } catch {
    return // nothing to resubmit, or not available: continue as a new application
  }
  if (!prev) return

  resubmitting.value = true
  resubmitReason.value = prev.reason || ''
  keptIdType.value = prev.id_type || ''
  keptCafeDocType.value = prev.cafe_doc_type || ''

  firstname.value = prev.firstname || ''
  middlename.value = prev.middlename || ''
  lastname.value = prev.lastname || ''
  username.value = prev.username || ''
  ownerAddress.value = prev.owner_address || ''
  const phone = splitPhone(prev.phone_number)
  phoneType.value = phone.type
  mobileDigits.value = phone.mobile
  landlineDigits.value = phone.landline
  syncPhoneNumber()

  if (prev.id_type) idType.value = prev.id_type
  const front = keptFile(prev.documents.file)
  governmentIdFile.value = front.file; governmentIdFileName.value = front.name; governmentIdFilePath.value = front.path
  const back = keptFile(prev.documents.file_back)
  governmentIdFileBack.value = back.file; governmentIdFileBackName.value = back.name; governmentIdFileBackPath.value = back.path

  cafeName.value = prev.cafe_name || ''
  if (prev.cafe_doc_type) cafeDocType.value = prev.cafe_doc_type
  branchName.value = prev.branch_name || ''
  address.value = prev.address || ''
  cafeEmail.value = prev.cafe_email || ''
  const cafePhoneParts = splitPhone(prev.cafe_phonenumber)
  cafePhoneType.value = cafePhoneParts.type
  cafeMobileDigits.value = cafePhoneParts.mobile
  cafeLandlineDigits.value = cafePhoneParts.landline
  syncCafePhone()

  const bir = keptFile(prev.documents.bir_file)
  birFile.value = bir.file; birFileName.value = bir.name; birFilePath.value = bir.path; birFileSize.value = ''
  const dti = keptFile(prev.documents.dti_sec_file)
  dtiSecFile.value = dti.file; dtiSecFileName.value = dti.name; dtiSecFilePath.value = dti.path; dtiSecFileSize.value = ''
  if (prev.documents.cafe_picture) {
    cafePictureName.value = prev.documents.cafe_picture
    cafePicturePath.value = KEEP_FILE
    cafePicturePreview.value = ''
  }
  birRegisteredAt.value = prev.bir_registered_at || ''
  tinNumber.value = prev.tin_number ? formatTinNumber(prev.tin_number) : ''
  if (prev.vat) vat.value = prev.vat
  fieldErrors.value = {}
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
async function handleGovIdChange(event: Event) {
  error.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (!isValidFileType(file)) {
      error.value = 'Government ID (Front) must be a JPG, JPEG, PNG, or PDF file.'
      input.value = ''
      governmentIdFile.value = null
      governmentIdFileName.value = ''
      governmentIdFilePath.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      error.value = 'Government ID (Front) file size must not exceed 5MB.'
      input.value = ''
      governmentIdFile.value = null
      governmentIdFileName.value = ''
      governmentIdFilePath.value = ''
      return
    }
    
    loading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await authService.uploadTempFile(formData)
      if (res.success && res.path) {
        governmentIdFilePath.value = res.path
        governmentIdFile.value = file
        governmentIdFileName.value = file.name
      } else {
        error.value = res.message || 'Failed to upload Government ID (Front).'
        input.value = ''
      }
    } catch (e: any) {
      error.value = extractErrorMessage(e, 'Upload failed.')
      input.value = ''
    } finally {
      loading.value = false
    }
  }
}

async function handleGovIdBackChange(event: Event) {
  error.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (!isValidFileType(file)) {
      error.value = 'Government ID (Back) must be a JPG, JPEG, PNG, or PDF file.'
      input.value = ''
      governmentIdFileBack.value = null
      governmentIdFileBackName.value = ''
      governmentIdFileBackPath.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      error.value = 'Government ID (Back) file size must not exceed 5MB.'
      input.value = ''
      governmentIdFileBack.value = null
      governmentIdFileBackName.value = ''
      governmentIdFileBackPath.value = ''
      return
    }
    
    loading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await authService.uploadTempFile(formData)
      if (res.success && res.path) {
        governmentIdFileBackPath.value = res.path
        governmentIdFileBack.value = file
        governmentIdFileBackName.value = file.name
      } else {
        error.value = res.message || 'Failed to upload Government ID (Back).'
        input.value = ''
      }
    } catch (e: any) {
      error.value = extractErrorMessage(e, 'Upload failed.')
      input.value = ''
    } finally {
      loading.value = false
    }
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
    const errMsg = res.errors?.username?.[0]
    if (errMsg) {
      fieldErrors.value.username = errMsg
    } else {
      delete fieldErrors.value.username
    }
  } catch (e: any) {
    const errs = e?.data?.errors || e?.response?._data?.errors
    const errMsg = errs?.username?.[0]
    if (errMsg) {
      fieldErrors.value.username = errMsg
    }
  }
}

async function checkPhoneAvailability() {
  syncPhoneNumber()
  if (!phoneNumber.value.trim()) return
  if (!validatePhoneNumber()) return
  try {
    const res = await authService.validateRegistrationStep(userUuid.value, { phone_number: phoneNumber.value.trim() })
    const errMsg = res.errors?.phone_number?.[0]
    if (errMsg) {
      fieldErrors.value.phone_number = errMsg
    } else {
      delete fieldErrors.value.phone_number
    }
  } catch (e: any) {
    const errs = e?.data?.errors || e?.response?._data?.errors
    const errMsg = errs?.phone_number?.[0]
    if (errMsg) {
      fieldErrors.value.phone_number = errMsg
    }
  }
}

async function checkCafeEmailAvailability() {
  if (!cafeEmail.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cafeEmail.value.trim())) return

  // Client-side guard: café email must differ from personal email
  if (cafeEmail.value.trim().toLowerCase() === email.value.trim().toLowerCase()) {
    fieldErrors.value.cafe_email = 'The café email must be different from your personal email.'
    return
  }

  try {
    const res = await authService.validateRegistrationStep(userUuid.value, { cafe_email: cafeEmail.value.trim() })
    const errMsg = res.errors?.cafe_email?.[0]
    if (errMsg) {
      fieldErrors.value.cafe_email = errMsg
    } else {
      delete fieldErrors.value.cafe_email
    }
  } catch (e: any) {
    const errs = e?.data?.errors || e?.response?._data?.errors
    const errMsg = errs?.cafe_email?.[0]
    if (errMsg) {
      fieldErrors.value.cafe_email = errMsg
    }
  }
}

async function checkCafePhoneAvailability() {
  syncCafePhone()
  if (!cafePhone.value.trim()) return
  if (!validateCafePhone()) return
  try {
    const res = await authService.validateRegistrationStep(userUuid.value, {
      cafe_phonenumber: cafePhone.value.trim(),
      phone_number: phoneNumber.value.trim(),
    })
    const errMsg = res.errors?.cafe_phonenumber?.[0]
    if (errMsg) {
      fieldErrors.value.cafe_phonenumber = errMsg
    } else {
      delete fieldErrors.value.cafe_phonenumber
    }
  } catch (e: any) {
    const errs = e?.data?.errors || e?.response?._data?.errors
    const errMsg = errs?.cafe_phonenumber?.[0]
    if (errMsg) {
      fieldErrors.value.cafe_phonenumber = errMsg
    }
  }
}

async function handleNextToBusiness() {
  error.value = ''
  fieldErrors.value = {}

  if (!firstname.value || !lastname.value || !username.value || !ownerAddress.value) {
    error.value = 'Please complete all required personal fields.'
    return
  }
  if (!validatePhoneNumber()) {
    error.value = fieldErrors.value.phone_number || 'Please correct your personal contact number.'
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
          fieldErrors.value[k] = msgs[0] as string
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
    error.value = extractErrorMessage(e, 'Please check the highlighted fields and try again.')
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
  if (!validateCafePhone()) {
    error.value = fieldErrors.value.cafe_phonenumber || 'Please correct the branch phone number.'
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
  if (cafeEmail.value.trim().toLowerCase() === email.value.trim().toLowerCase()) {
    fieldErrors.value.cafe_email = 'The café email must be different from your personal email.'
    error.value = 'The café email must be different from your personal email.'
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
          fieldErrors.value[k] = msgs[0] as string
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
    error.value = extractErrorMessage(e, 'Please check the highlighted fields and try again.')
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

async function onBirChange(event: Event) {
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
    
    loading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await authService.uploadTempFile(formData)
      if (res.success && res.path) {
        birFilePath.value = res.path
        birFile.value = file
        birFileName.value = file.name
        birFileSize.value = formatBytes(file.size)
      } else {
        error.value = res.message || 'Failed to upload BIR Certificate.'
        input.value = ''
        clearBirFile()
      }
    } catch (e: any) {
      error.value = extractErrorMessage(e, 'Upload failed.')
      input.value = ''
      clearBirFile()
    } finally {
      loading.value = false
    }
  }
}

function clearBirFile() {
  birFile.value = null
  birFileName.value = ''
  birFileSize.value = ''
  birFilePath.value = ''
}

async function onDtiSecChange(event: Event) {
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
    
    loading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await authService.uploadTempFile(formData)
      if (res.success && res.path) {
        dtiSecFilePath.value = res.path
        dtiSecFile.value = file
        dtiSecFileName.value = file.name
        dtiSecFileSize.value = formatBytes(file.size)
      } else {
        error.value = res.message || `Failed to upload ${cafeDocType.value} Document.`
        input.value = ''
        clearDtiSecFile()
      }
    } catch (e: any) {
      error.value = extractErrorMessage(e, 'Upload failed.')
      input.value = ''
      clearDtiSecFile()
    } finally {
      loading.value = false
    }
  }
}

function clearDtiSecFile() {
  dtiSecFile.value = null
  dtiSecFileName.value = ''
  dtiSecFileSize.value = ''
  dtiSecFilePath.value = ''
}

async function onCafePictureChange(event: Event) {
  error.value = ''
  delete fieldErrors.value.cafe_picture
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    error.value = 'Café picture must be a JPG or PNG image.'
    input.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    error.value = 'Café picture must not exceed 2MB.'
    input.value = ''
    return
  }

  loading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await authService.uploadTempFile(formData)
    if (res.success && res.path) {
      clearCafePicture()
      cafePicturePath.value = res.path
      cafePictureName.value = file.name
      cafePicturePreview.value = URL.createObjectURL(file)
    } else {
      error.value = res.message || 'Failed to upload café picture.'
    }
  } catch (e: any) {
    error.value = extractErrorMessage(e, 'Upload failed.')
  } finally {
    input.value = ''
    loading.value = false
  }
}

function clearCafePicture() {
  if (cafePicturePreview.value) URL.revokeObjectURL(cafePicturePreview.value)
  cafePicturePreview.value = ''
  cafePictureName.value = ''
  cafePicturePath.value = ''
}

async function handleFinalSubmit() {
  error.value = ''
  success.value = ''

  if (!userUuid.value) {
    error.value = 'Your session has expired. Please restart the registration process.'
    return
  }

  const missingDocs: string[] = []
  if (!birFile.value) missingDocs.push('1. BIR Certificate')
  if (!dtiSecFile.value) missingDocs.push(`2. ${cafeDocType.value} Document`)

  if (missingDocs.length > 0) {
    error.value = `Missing required documents:\n${missingDocs.join(', ')}`
    return
  }

  if (birFile.value) {
    if (!tinNumber.value.trim()) {
      fieldErrors.value.tin_number = 'TIN Number is required.'
      error.value = 'Please enter the TIN Number.'
      return
    }
    const tinRaw = tinNumber.value.replace(/[^0-9]/g, '')
    if (tinRaw.length !== 14) {
      fieldErrors.value.tin_number = 'TIN Number must follow format XXX-XXX-XXX-00000.'
      error.value = 'TIN Number must follow format XXX-XXX-XXX-00000.'
      return
    }
    if (!tinRaw.endsWith('00000')) {
      fieldErrors.value.tin_number = 'Main branch TIN must end in 00000 (head office branch code).'
      error.value = 'Main branch TIN must end in 00000 (head office branch code).'
      return
    }
    if (!vat.value) {
      fieldErrors.value.vat = 'VAT Type is required.'
      error.value = 'Please select VAT or Non-VAT.'
      return
    }
    if (!birRegisteredAt.value) {
      fieldErrors.value.bir_registered_at = 'BIR Registered Date is required.'
      error.value = 'Please enter the BIR Registered Date.'
      return
    }
  }

  if (!governmentIdFile.value || (isBackIdRequired.value && !governmentIdFileBack.value)) {
    error.value = isBackIdRequired.value
      ? 'Missing Government ID files (Front & Back). Please return to Personal Information step.'
      : 'Missing Passport file. Please return to Personal Information step.'
    return
  }

  if (!validatePhoneNumber()) {
    error.value = fieldErrors.value.phone_number || 'Please correct your personal contact number.'
    return
  }
  if (!validateCafePhone()) {
    error.value = fieldErrors.value.cafe_phonenumber || 'Please correct the branch phone number.'
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
    payload.append('file', governmentIdFilePath.value)
    if (isBackIdRequired.value && governmentIdFileBackPath.value) {
      payload.append('file_back', governmentIdFileBackPath.value)
    }

    payload.append('cafe_name', cafeName.value)
    payload.append('cafe_doc_type', cafeDocType.value)
    payload.append('branch_name', branchName.value)
    payload.append('address', address.value)
    payload.append('cafe_phonenumber', cafePhone.value)
    payload.append('cafe_email', cafeEmail.value)
    if (cafePicturePath.value) payload.append('cafe_picture', cafePicturePath.value)

    payload.append('bir_file', birFilePath.value)
    payload.append('dti_sec_file', dtiSecFilePath.value)
    payload.append('bir_registered_at', birRegisteredAt.value)
    payload.append('tin_number', tinNumber.value.trim())
    payload.append('vat', vat.value)

    const res = await authService.register(userUuid.value, payload)
    if (res.success) {
      clearAllInputs()
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
      // An expired/missing upload: drop the stale file so its upload box shows again.
      if (fieldErrors.value.file) {
        governmentIdFile.value = null; governmentIdFileName.value = ''; governmentIdFilePath.value = ''
      }
      if (fieldErrors.value.file_back) {
        governmentIdFileBack.value = null; governmentIdFileBackName.value = ''; governmentIdFileBackPath.value = ''
      }
      if (fieldErrors.value.bir_file) clearBirFile()
      if (fieldErrors.value.dti_sec_file) clearDtiSecFile()
      if (fieldErrors.value.cafe_picture) clearCafePicture()

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

// Data Loss Prevention & Drafting
function saveDraft() {
  const draft = {
    // Where to resume: only the application steps, once the email is verified
    userUuid: userUuid.value,
    verifiedEmail: verifiedEmail.value,
    step: currentStep.value === 4 ? 4 : 3,
    businessSubPage: businessSubPage.value,
    email: email.value,
    firstname: firstname.value,
    middlename: middlename.value,
    lastname: lastname.value,
    username: username.value,
    phoneType: phoneType.value,
    mobileDigits: mobileDigits.value,
    landlineDigits: landlineDigits.value,
    ownerAddress: ownerAddress.value,
    idType: idType.value,
    cafeName: cafeName.value,
    cafeDocType: cafeDocType.value,
    branchName: branchName.value,
    address: address.value,
    cafePhoneType: cafePhoneType.value,
    cafeMobileDigits: cafeMobileDigits.value,
    cafeLandlineDigits: cafeLandlineDigits.value,
    cafeEmail: cafeEmail.value,
    birRegisteredAt: birRegisteredAt.value,
    tinNumber: tinNumber.value,
    vat: vat.value,
    governmentIdFilePath: governmentIdFilePath.value,
    governmentIdFileBackPath: governmentIdFileBackPath.value,
    birFilePath: birFilePath.value,
    dtiSecFilePath: dtiSecFilePath.value,
    cafePicturePath: cafePicturePath.value,
    cafePictureName: cafePictureName.value,
    resubmitting: resubmitting.value,
    resubmitReason: resubmitReason.value,
    keptIdType: keptIdType.value,
    keptCafeDocType: keptCafeDocType.value,
    // File names for display
    governmentIdFileName: governmentIdFileName.value,
    governmentIdFileBackName: governmentIdFileBackName.value,
    birFileName: birFileName.value,
    dtiSecFileName: dtiSecFileName.value
  }
  sessionStorage.setItem('registrationDraft', JSON.stringify(draft))
}

function restoreDraft() {
  const saved = sessionStorage.getItem('registrationDraft')
  if (saved) {
    try {
      const draft = JSON.parse(saved)
      if (draft.resubmitting) {
        resubmitting.value = true
        resubmitReason.value = draft.resubmitReason || ''
        keptIdType.value = draft.keptIdType || ''
        keptCafeDocType.value = draft.keptCafeDocType || ''
      }
      if (draft.email) email.value = draft.email
      if (draft.firstname) firstname.value = draft.firstname
      if (draft.middlename) middlename.value = draft.middlename
      if (draft.lastname) lastname.value = draft.lastname
      if (draft.username) username.value = draft.username
      if (draft.phoneType) phoneType.value = draft.phoneType
      if (draft.mobileDigits) mobileDigits.value = draft.mobileDigits
      if (draft.landlineDigits) landlineDigits.value = draft.landlineDigits
      if (draft.ownerAddress) ownerAddress.value = draft.ownerAddress
      if (draft.idType) idType.value = draft.idType
      if (draft.cafeName) cafeName.value = draft.cafeName
      if (draft.cafeDocType) cafeDocType.value = draft.cafeDocType
      if (draft.branchName) branchName.value = draft.branchName
      if (draft.address) address.value = draft.address
      if (draft.cafePhoneType) cafePhoneType.value = draft.cafePhoneType
      if (draft.cafeMobileDigits) cafeMobileDigits.value = draft.cafeMobileDigits
      if (draft.cafeLandlineDigits) cafeLandlineDigits.value = draft.cafeLandlineDigits
      if (draft.cafeEmail) cafeEmail.value = draft.cafeEmail
      if (draft.birRegisteredAt) birRegisteredAt.value = draft.birRegisteredAt
      if (draft.tinNumber) tinNumber.value = draft.tinNumber
      if (draft.vat) vat.value = draft.vat
      
      // File paths and names
      if (draft.governmentIdFilePath) {
        governmentIdFilePath.value = draft.governmentIdFilePath
        governmentIdFileName.value = draft.governmentIdFileName || 'Uploaded File'
        // Mock a File object so validation passes
        governmentIdFile.value = new File([''], governmentIdFileName.value, { type: 'application/octet-stream' })
      }
      if (draft.governmentIdFileBackPath) {
        governmentIdFileBackPath.value = draft.governmentIdFileBackPath
        governmentIdFileBackName.value = draft.governmentIdFileBackName || 'Uploaded File'
        governmentIdFileBack.value = new File([''], governmentIdFileBackName.value, { type: 'application/octet-stream' })
      }
      if (draft.birFilePath) {
        birFilePath.value = draft.birFilePath
        birFileName.value = draft.birFileName || 'Uploaded File'
        birFile.value = new File([''], birFileName.value, { type: 'application/octet-stream' })
      }
      if (draft.dtiSecFilePath) {
        dtiSecFilePath.value = draft.dtiSecFilePath
        dtiSecFileName.value = draft.dtiSecFileName || 'Uploaded File'
        dtiSecFile.value = new File([''], dtiSecFileName.value, { type: 'application/octet-stream' })
      }

      // Email already verified: resume the application instead of the email step
      if (draft.userUuid) {
        userUuid.value = draft.userUuid
        verifiedEmail.value = draft.verifiedEmail || draft.email || ''
        currentStep.value = draft.step === 4 ? 4 : 3
        if (draft.businessSubPage === 2) businessSubPage.value = 2
      }
      if (draft.cafePicturePath) {
        cafePicturePath.value = draft.cafePicturePath
        cafePictureName.value = draft.cafePictureName || 'Uploaded Picture'
      }
    } catch (e) {
      console.warn('Failed to parse draft from sessionStorage', e)
    }
  }
}

watch(
  [userUuid, currentStep, businessSubPage, email, firstname, middlename, lastname, username, phoneType, mobileDigits, landlineDigits, ownerAddress, idType, cafeName, cafeDocType, branchName, address, cafePhoneType, cafeMobileDigits, cafeLandlineDigits, cafeEmail, birRegisteredAt, tinNumber, vat, governmentIdFilePath, governmentIdFileBackPath, birFilePath, dtiSecFilePath, cafePicturePath],
  () => {
    saveDraft()
  },
  { deep: true }
)

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (currentStep.value > 1 && currentStep.value < 5) {
    e.preventDefault()
    e.returnValue = ''
  }
}

// Arriving from a rejected application's "Edit and Resubmit": start at the email
// step with the applicant's email filled in; verifying it loads the old answers.
async function startReapply(applicationUuid: string) {
  try {
    const res = await authService.getApplicationDetails(applicationUuid)
    if (res.success && res.application?.user.email) {
      email.value = res.application.user.email
      reapplyHint.value = 'We\'ll send a code to this email. Once verified, your previous application opens with your details and documents filled in.'
    }
  } catch {
    // Unknown link: leave the normal registration start
  }
}

onMounted(() => {
  restoreDraft()
  const reapply = route.query.reapply
  if (typeof reapply === 'string' && reapply && !userUuid.value) startReapply(reapply)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (cooldownTimer) clearInterval(cooldownTimer)
})
</script>

<template>
  <div class="h-screen w-full overflow-hidden grid lg:grid-cols-2">
    <!-- Left Hero Section (Matches login.vue & verify-login-code.vue) -->
    <section class="hidden lg:flex flex-col justify-center bg-[#7B5A50] font-display text-white px-16 py-12 h-full relative">
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
    <section class="flex flex-col items-center justify-start bg-[#FFF8EA] px-5 sm:px-8 py-8 sm:py-12 h-full overflow-y-auto nav-scroll">
      <div class="w-full max-w-[560px] space-y-6 my-auto relative">
        <!-- Resubmitting a rejected application: what the admin flagged -->
        <div
          v-if="resubmitting && (currentStep === 3 || currentStep === 4)"
          class="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3 shadow-sm"
        >
          <div class="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
            <Icon name="heroicons:pencil-square" class="w-4 h-4" />
          </div>
          <div class="text-sm">
            <p class="font-bold text-[#2D201B]">Editing your rejected application</p>
            <p v-if="resubmitReason" class="mt-1 text-xs text-amber-900"><span class="font-bold">Reason:</span> {{ resubmitReason }}</p>
            <p class="text-xs text-amber-800/80 mt-1">
              Your previous details and documents are filled in. Change what was flagged, then resubmit for review.
            </p>
          </div>
        </div>

        <Transition name="fade-slide" mode="out-in">
        <!-- STEP 1: Email Verification -->
        <div v-if="currentStep === 1" key="step1" class="space-y-6">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B6656] hover:text-[#3B1F0E] transition-colors py-1 px-2.5 -ml-2.5 rounded-lg hover:bg-[#7B5A50]/8 active:scale-[0.97]"
          >
            <Icon name="heroicons:chevron-left" class="w-4 h-4" />
            Back to Home
          </NuxtLink>

          <div>
            <span class="text-xs uppercase tracking-wider font-bold text-[#7B5A50] block mb-1">Get Started</span>
            <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#2D201B] tracking-tight">
              {{ reapplyHint ? 'Resubmit your application' : 'Register your business' }}
            </h1>
            <p class="text-xs sm:text-sm text-[#7D5A50]/80 mt-1.5">
              {{ reapplyHint || "Create your BrewSpot account. We'll need a few documents to verify your business." }}
            </p>
          </div>

          <!-- Onboarding Checklist (Parchment Card) -->
          <div class="bg-white rounded-2xl border border-[#EEDFC4] p-5 shadow-[0_2px_12px_rgba(59,31,14,0.03)] space-y-3.5">
            <h3 class="font-display font-bold text-[#2D201B] text-sm flex items-center gap-2 pb-2.5 border-b border-[#F5ECE0]">
              <div class="w-6 h-6 rounded-lg bg-[#FFF8EA] text-[#7B5A50] border border-[#EEDFC4] flex items-center justify-center shrink-0">
                <Icon name="heroicons:document-text" class="w-3.5 h-3.5" />
              </div>
              What you'll need
            </h3>
            <ul class="text-xs sm:text-sm text-[#5C3E33] space-y-2.5">
              <li class="flex items-start gap-2.5">
                <div class="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mt-0.5 shrink-0">
                  <Icon name="heroicons:check" class="w-3 h-3 stroke-[2.5]" />
                </div>
                <span>Valid Government ID (Front & Back required for some)</span>
              </li>
              <li class="flex items-start gap-2.5">
                <div class="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mt-0.5 shrink-0">
                  <Icon name="heroicons:check" class="w-3 h-3 stroke-[2.5]" />
                </div>
                <span>BIR Certificate of Registration (Form 2303)</span>
              </li>
              <li class="flex items-start gap-2.5">
                <div class="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mt-0.5 shrink-0">
                  <Icon name="heroicons:check" class="w-3 h-3 stroke-[2.5]" />
                </div>
                <span>DTI Business Name Registration or SEC Certificate</span>
              </li>
              <li class="flex items-start gap-2.5">
                <div class="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mt-0.5 shrink-0">
                  <Icon name="heroicons:check" class="w-3 h-3 stroke-[2.5]" />
                </div>
                <span>Basic business details (TIN, address, contacts)</span>
              </li>
            </ul>
          </div>

          <!-- Auth Error Banner -->
          <div
            v-if="error"
            class="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-3 shadow-xs"
          >
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
            <span class="font-medium">{{ error }}</span>
          </div>

          <form @submit.prevent="handleSendCode" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-[#3B1F0E] uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                v-model="email"
                type="email"
                maxlength="255"
                placeholder="name@yourcafe.com"
                class="w-full h-11 rounded-xl border border-[#D9C7B6] bg-[#FFFEFD] px-3.5 text-sm text-[#2D201B] placeholder:text-[#A8988B] outline-none transition-all duration-150 ease-out focus:border-[#7B5A50] focus:ring-4 focus:ring-[#7B5A50]/10 hover:border-[#B49A85]"
                required
              />
            </div>

            <div class="pt-2">
              <button
                type="submit"
                :disabled="loading"
                class="w-full h-12 rounded-xl bg-[#3B1F0E] text-[#FFF8EA] font-display font-semibold tracking-wide hover:bg-[#2A150A] active:scale-[0.98] transition-all duration-160 ease-out flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(59,31,14,0.18)] hover:shadow-[0_6px_20px_rgba(59,31,14,0.24)] cursor-pointer disabled:opacity-50 group"
              >
                <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ loading ? 'Sending Code...' : 'Continue with Email' }}</span>
                <Icon v-if="!loading" name="heroicons:arrow-right" class="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-160" />
              </button>
            </div>

            <p class="text-xs sm:text-sm text-[#8B6656] text-center pt-2">
              Already registered?
              <button
                type="button"
                class="font-bold text-[#3B1F0E] hover:underline ml-1 cursor-pointer"
                @click="goLogin"
              >
                Sign In
              </button>
            </p>
          </form>
        </div>

        <!-- STEP 2: OTP Verification (same size and format as verify-login-code.vue) -->
        <div v-else-if="currentStep === 2" key="step2" class="mx-auto w-full max-w-sm">
          <!-- Change Email -->
          <button
            type="button"
            class="flex items-center gap-1 text-sm font-semibold text-[#7B5A50] hover:opacity-80 transition-opacity mb-8"
            @click="currentStep = 1"
          >
            <Icon name="heroicons:chevron-left" class="w-4 h-4" />
            Change Email
          </button>

          <!-- Header -->
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-[#2d201b]">Check your inbox</h1>
            <p class="text-gray-600 text-sm mt-1.5 leading-relaxed">
              We sent a 6-digit code to <span class="font-semibold text-[#2d201b]">{{ email }}</span>.
              Enter it below to continue.
            </p>
          </div>

          <!-- Auth Error Banner -->
          <div
            v-if="error"
            role="alert"
            class="p-3.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-3 mb-6"
          >
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
            <span class="font-medium">{{ error }}</span>
          </div>

          <!-- Resend confirmation -->
          <p
            v-if="notice && !error"
            role="status"
            class="mb-6 flex items-center gap-2 text-sm font-medium text-[#1F8A4C]"
          >
            <Icon name="heroicons:check-circle" class="w-5 h-5 shrink-0" />
            {{ notice }}
          </p>

          <form @submit.prevent="handleVerifyOTP" class="space-y-6">
            <!-- Digit Inputs -->
            <div class="flex justify-between gap-2" role="group" aria-label="6-digit verification code">
              <input
                v-for="(digit, index) in digits"
                :key="index"
                ref="inputs"
                :value="digit"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                :autocomplete="index === 0 ? 'one-time-code' : 'off'"
                :aria-label="`Digit ${index + 1} of 6`"
                :disabled="loading"
                :class="digit ? 'border-[#7B5A50]' : 'border-gray-300'"
                class="min-w-0 w-full h-14 text-center text-xl font-semibold tabular-nums rounded-md border bg-white text-[#2d201b] outline-none focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20 transition"
                @input="onDigitInput(index, $event)"
                @keydown="onDigitKeydown(index, $event)"
                @paste="onDigitPaste(index, $event)"
                @focus="($event.target as HTMLInputElement).select()"
              />
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="loading || otpCode.length < 6"
              class="w-full h-11 rounded-md bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ loading ? 'Verifying...' : 'Verify and Continue' }}
            </button>

            <!-- Resend -->
            <p class="text-sm text-gray-600 text-center">
              Didn't receive it?
              <button
                type="button"
                :disabled="cooldown > 0 || resending"
                class="font-semibold tabular-nums text-[#7B5A50] hover:underline disabled:opacity-50 disabled:no-underline"
                @click="handleResendOTP"
              >
                {{ cooldown > 0 ? `Resend code in ${cooldownLabel}` : resending ? 'Sending...' : 'Resend code' }}
              </button>
            </p>
          </form>
        </div>

        <!-- STEP 3: Personal Details (Emil Kowalski Tactile Form Experience) -->
        <div v-else-if="currentStep === 3" key="step3" class="space-y-6">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B6656] hover:text-[#3B1F0E] transition-colors py-1 px-2.5 -ml-2.5 rounded-lg hover:bg-[#7B5A50]/8 active:scale-[0.97] cursor-pointer"
            @click="currentStep = 1"
          >
            <Icon name="heroicons:chevron-left" class="w-4 h-4" />
            Change Email Address
          </button>

          <!-- Emil Kowalski Segmented Stepper -->
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#7B5A50]/10 text-[#7B5A50] border border-[#7B5A50]/20 tracking-wide">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7B5A50] animate-pulse"></span>
                Step 1 of 2 · Personal Info
              </span>
              <span class="text-xs font-semibold text-[#8B6656]">50% Complete</span>
            </div>

            <!-- Two-stage progress track -->
            <div class="grid grid-cols-2 gap-2">
              <div class="h-1.5 rounded-full bg-[#7B5A50] shadow-xs"></div>
              <div class="h-1.5 rounded-full bg-[#E8DCD0]"></div>
            </div>

            <div class="pt-1">
              <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#2D201B] tracking-tight leading-tight">
                Personal details
              </h1>
              <p class="text-xs sm:text-sm text-[#7D5A50]/80 mt-1">
                Provide your identity information to verify your account.
              </p>
            </div>
          </div>

          <!-- Auth Error Banner -->
          <div
            v-if="error"
            role="alert"
            class="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-3 shadow-xs"
          >
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
            <span class="font-medium">{{ error }}</span>
          </div>

          <form @submit.prevent="handleNextToBusiness" class="space-y-5">
            <!-- 1. Basic Information Card -->
            <div class="bg-white rounded-2xl border border-[#EEDFC4] p-5 sm:p-6 shadow-[0_2px_12px_rgba(59,31,14,0.03)] hover:shadow-[0_4px_16px_rgba(59,31,14,0.06)] transition-shadow duration-200 space-y-4">
              <!-- Header with Icon Pill -->
              <div class="flex items-center gap-2.5 pb-3 border-b border-[#F5ECE0]">
                <div class="w-8 h-8 rounded-xl bg-[#FFF8EA] border border-[#EEDFC4] flex items-center justify-center text-[#7B5A50] shrink-0 shadow-xs">
                  <Icon name="heroicons:user" class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="font-display text-sm font-bold text-[#2D201B]">Basic Information</h3>
                  <p class="text-[11px] text-[#8B6656]">Legal owner identity and platform handle</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label class="block text-xs font-bold text-[#3B1F0E] uppercase tracking-wider mb-1.5">First Name <span class="text-red-500">*</span></label>
                  <input
                    v-model="firstname"
                    type="text"
                    placeholder="e.g. John"
                    class="w-full h-11 rounded-xl border border-[#D9C7B6] bg-[#FFFEFD] px-3.5 text-sm text-[#2D201B] placeholder:text-[#A8988B] outline-none transition-all duration-150 ease-out focus:border-[#7B5A50] focus:ring-4 focus:ring-[#7B5A50]/10 hover:border-[#B49A85]"
                    required
                    @input="onFirstNameInput"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#3B1F0E] uppercase tracking-wider mb-1.5">Last Name <span class="text-red-500">*</span></label>
                  <input
                    v-model="lastname"
                    type="text"
                    placeholder="e.g. Doe"
                    class="w-full h-11 rounded-xl border border-[#D9C7B6] bg-[#FFFEFD] px-3.5 text-sm text-[#2D201B] placeholder:text-[#A8988B] outline-none transition-all duration-150 ease-out focus:border-[#7B5A50] focus:ring-4 focus:ring-[#7B5A50]/10 hover:border-[#B49A85]"
                    required
                    @input="onLastNameInput"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label class="flex items-center justify-between text-xs font-bold text-[#3B1F0E] uppercase tracking-wider mb-1.5">
                    <span>Middle Name</span>
                    <span class="text-[10px] text-[#8B6656] font-normal normal-case italic">optional</span>
                  </label>
                  <input
                    v-model="middlename"
                    type="text"
                    placeholder="e.g. Santos"
                    class="w-full h-11 rounded-xl border border-[#D9C7B6] bg-[#FFFEFD] px-3.5 text-sm text-[#2D201B] placeholder:text-[#A8988B] outline-none transition-all duration-150 ease-out focus:border-[#7B5A50] focus:ring-4 focus:ring-[#7B5A50]/10 hover:border-[#B49A85]"
                    @input="onMiddleNameInput"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#3B1F0E] uppercase tracking-wider mb-1.5">Username <span class="text-red-500">*</span></label>
                  <input
                    v-model="username"
                    type="text"
                    placeholder="e.g. johndoe"
                    :class="[
                      'w-full h-11 rounded-xl border px-3.5 outline-none transition-all duration-150 ease-out bg-[#FFFEFD] text-sm text-[#2D201B] placeholder:text-[#A8988B]',
                      fieldErrors.username
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15'
                        : 'border-[#D9C7B6] focus:border-[#7B5A50] focus:ring-4 focus:ring-[#7B5A50]/10 hover:border-[#B49A85]'
                    ]"
                    required
                    @input="clearFieldError('username')"
                    @blur="checkUsernameAvailability"
                  />
                  <p v-if="fieldErrors.username" class="text-xs text-red-600 mt-1 font-medium">{{ fieldErrors.username }}</p>
                </div>
              </div>
            </div>

            <!-- 2. Contact & Location Card -->
            <div class="bg-white rounded-2xl border border-[#EEDFC4] p-5 sm:p-6 shadow-[0_2px_12px_rgba(59,31,14,0.03)] hover:shadow-[0_4px_16px_rgba(59,31,14,0.06)] transition-shadow duration-200 space-y-4">
              <!-- Header with Icon Pill -->
              <div class="flex items-center gap-2.5 pb-3 border-b border-[#F5ECE0]">
                <div class="w-8 h-8 rounded-xl bg-[#FFF8EA] border border-[#EEDFC4] flex items-center justify-center text-[#7B5A50] shrink-0 shadow-xs">
                  <Icon name="heroicons:map-pin" class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="font-display text-sm font-bold text-[#2D201B]">Contact & Location</h3>
                  <p class="text-[11px] text-[#8B6656]">Primary phone and physical owner address</p>
                </div>
              </div>

              <div class="space-y-1">
                <label class="block text-xs font-bold text-[#3B1F0E] uppercase tracking-wider mb-1.5">Contact No. <span class="text-red-500">*</span></label>
                <div
                  class="flex items-stretch rounded-xl border bg-[#FFFEFD] transition-all duration-150 ease-out focus-within:border-[#7B5A50] focus-within:ring-4 focus-within:ring-[#7B5A50]/10 overflow-hidden h-11"
                  :class="fieldErrors.phone_number ? 'border-red-500' : 'border-[#D9C7B6] hover:border-[#B49A85]'"
                >
                  <!-- Box-type Type Selector beside input number -->
                  <div class="bg-[#F8F4EE] border-r border-[#E8DCD0] flex items-center px-3 shrink-0">
                    <DropdownList
                      v-model="phoneType"
                      :options="PHONE_TYPE_OPTIONS"
                      bare
                      aria-label="Contact number type"
                      @change="onPhoneTypeChange"
                    />
                  </div>

                  <!-- Mobile Input (10 digits starting with 9) -->
                  <input
                    v-if="phoneType === 'mobile'"
                    v-model="mobileDigits"
                    type="tel"
                    inputmode="numeric"
                    maxlength="10"
                    placeholder="9123456789"
                    class="w-full h-full px-3.5 text-sm text-[#2D201B] placeholder:text-[#A8988B] bg-transparent outline-none tabular-nums"
                    required
                    @input="onMobileInput"
                    @blur="checkPhoneAvailability"
                  />

                  <!-- Landline Input -->
                  <input
                    v-else
                    v-model="landlineDigits"
                    type="tel"
                    placeholder="082-299-1234 or 02-8123-4567"
                    maxlength="15"
                    class="w-full h-full px-3.5 text-sm text-[#2D201B] placeholder:text-[#A8988B] bg-transparent outline-none tabular-nums"
                    required
                    @input="onLandlineInput"
                    @blur="checkPhoneAvailability"
                  />
                </div>
                <p v-if="fieldErrors.phone_number" class="text-xs text-red-600 mt-1 font-medium">{{ fieldErrors.phone_number }}</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-[#3B1F0E] uppercase tracking-wider mb-1.5">Personal Address <span class="text-red-500">*</span></label>
                <input
                  v-model="ownerAddress"
                  type="text"
                  placeholder="Street, Barangay, District, Davao City"
                  class="w-full h-11 rounded-xl border border-[#D9C7B6] bg-[#FFFEFD] px-3.5 text-sm text-[#2D201B] placeholder:text-[#A8988B] outline-none transition-all duration-150 ease-out focus:border-[#7B5A50] focus:ring-4 focus:ring-[#7B5A50]/10 hover:border-[#B49A85]"
                  required
                />
              </div>
            </div>

            <!-- 3. Identity Verification Card -->
            <div class="bg-white rounded-2xl border border-[#EEDFC4] p-5 sm:p-6 shadow-[0_2px_12px_rgba(59,31,14,0.03)] hover:shadow-[0_4px_16px_rgba(59,31,14,0.06)] transition-shadow duration-200 space-y-4">
              <!-- Header with Icon Pill -->
              <div class="flex items-center gap-2.5 pb-3 border-b border-[#F5ECE0]">
                <div class="w-8 h-8 rounded-xl bg-[#FFF8EA] border border-[#EEDFC4] flex items-center justify-center text-[#7B5A50] shrink-0 shadow-xs">
                  <Icon name="heroicons:identification" class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="font-display text-sm font-bold text-[#2D201B]">Identity Verification</h3>
                  <p class="text-[11px] text-[#8B6656]">Government-issued photo identification</p>
                </div>
              </div>
              
              <div class="space-y-1 w-full sm:w-1/2">
                <label class="block text-xs font-bold text-[#3B1F0E] uppercase tracking-wider mb-1">ID Type <span class="text-red-500">*</span></label>
                <DropdownList
                  v-model="idType"
                  :options="ID_TYPE_OPTIONS"
                  size="sm"
                  white
                  :invalid="!!fieldErrors.id_type"
                />
                <p v-if="fieldErrors.id_type" class="text-xs text-red-600 font-medium">{{ fieldErrors.id_type }}</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-[#3B1F0E] uppercase tracking-wider mb-2">
                  {{ isBackIdRequired ? 'Government ID (Front & Back) *' : 'Passport (Photo / Bio-page) *' }}
                </label>
                <div :class="isBackIdRequired ? 'grid grid-cols-1 sm:grid-cols-2 gap-3.5' : ''">
                  <!-- Front ID Dropzone -->
                  <div>
                    <label
                      v-if="!governmentIdFilePath"
                      for="gov-id-front"
                      class="border-2 border-dashed border-[#D9C7B6] hover:border-[#7B5A50] bg-[#FAF6F0]/60 hover:bg-[#FAF4ED] rounded-xl p-4 text-center cursor-pointer transition-all duration-150 active:scale-[0.98] block group shadow-xs"
                    >
                      <div class="w-9 h-9 rounded-xl bg-white border border-[#E8DCD0] text-[#7B5A50] flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform shadow-xs">
                        <Icon name="heroicons:arrow-up-tray" class="w-4 h-4" />
                      </div>
                      <p class="font-display text-xs font-bold text-[#2D201B]">{{ isBackIdRequired ? 'Upload Front ID' : 'Upload Passport' }} <span class="text-red-500">*</span></p>
                      <p class="text-[11px] text-[#8B6656] mt-0.5">Click or drop JPG, PNG, or PDF</p>
                      <input
                        id="gov-id-front"
                        type="file"
                        @change="handleGovIdChange"
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                        class="sr-only"
                        required
                      />
                    </label>
                    <div v-else class="flex items-center justify-between text-xs bg-emerald-50/80 border border-emerald-300 p-3 rounded-xl text-emerald-950 shadow-xs transition-all">
                      <div class="flex items-center gap-2.5 truncate mr-2">
                        <div class="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Icon name="heroicons:check" class="w-4 h-4" />
                        </div>
                        <div class="truncate">
                          <p class="font-bold truncate text-xs text-emerald-950">{{ governmentIdFileName || 'Uploaded File' }}</p>
                          <p class="text-[10px] text-emerald-700 font-semibold">{{ isBackIdRequired ? 'Front ID Ready' : 'Passport Ready' }}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        @click="governmentIdFile = null; governmentIdFileName = ''; governmentIdFilePath = ''; saveDraft()"
                        class="w-7 h-7 rounded-lg text-emerald-800 hover:text-red-600 hover:bg-red-50 flex items-center justify-center active:scale-90 transition-all font-bold text-base cursor-pointer"
                        title="Remove file"
                      >&times;</button>
                    </div>
                  </div>

                  <!-- Back ID Dropzone -->
                  <div v-if="isBackIdRequired">
                    <label
                      v-if="!governmentIdFileBackPath"
                      for="gov-id-back"
                      class="border-2 border-dashed border-[#D9C7B6] hover:border-[#7B5A50] bg-[#FAF6F0]/60 hover:bg-[#FAF4ED] rounded-xl p-4 text-center cursor-pointer transition-all duration-150 active:scale-[0.98] block group shadow-xs"
                    >
                      <div class="w-9 h-9 rounded-xl bg-white border border-[#E8DCD0] text-[#7B5A50] flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform shadow-xs">
                        <Icon name="heroicons:arrow-up-tray" class="w-4 h-4" />
                      </div>
                      <p class="font-display text-xs font-bold text-[#2D201B]">Upload Back ID <span class="text-red-500">*</span></p>
                      <p class="text-[11px] text-[#8B6656] mt-0.5">Click or drop JPG, PNG, or PDF</p>
                      <input
                        id="gov-id-back"
                        type="file"
                        @change="handleGovIdBackChange"
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                        class="sr-only"
                        required
                      />
                    </label>
                    <div v-else class="flex items-center justify-between text-xs bg-emerald-50/80 border border-emerald-300 p-3 rounded-xl text-emerald-950 shadow-xs transition-all">
                      <div class="flex items-center gap-2.5 truncate mr-2">
                        <div class="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Icon name="heroicons:check" class="w-4 h-4" />
                        </div>
                        <div class="truncate">
                          <p class="font-bold truncate text-xs text-emerald-950">{{ governmentIdFileBackName || 'Uploaded File' }}</p>
                          <p class="text-[10px] text-emerald-700 font-semibold">Back ID Ready</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        @click="governmentIdFileBack = null; governmentIdFileBackName = ''; governmentIdFileBackPath = ''; saveDraft()"
                        class="w-7 h-7 rounded-lg text-emerald-800 hover:text-red-600 hover:bg-red-50 flex items-center justify-center active:scale-90 transition-all font-bold text-base cursor-pointer"
                        title="Remove file"
                      >&times;</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Primary Action Button -->
            <div class="pt-2">
              <button
                type="submit"
                class="w-full h-12 rounded-xl bg-[#3B1F0E] text-[#FFF8EA] font-display font-semibold tracking-wide hover:bg-[#2A150A] active:scale-[0.98] transition-all duration-160 ease-out flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(59,31,14,0.18)] hover:shadow-[0_6px_20px_rgba(59,31,14,0.24)] cursor-pointer group"
              >
                <span>Next: Business Registration</span>
                <Icon name="heroicons:arrow-right" class="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-160" />
              </button>
            </div>
          </form>
        </div>

        <!-- STEP 4: Business Details & Requirements -->
        <div v-else-if="currentStep === 4" key="step4" class="space-y-6">
          <!-- Page 1: Business Information -->
          <div v-if="businessSubPage === 1" class="space-y-6">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A6E64] hover:text-[#2D201B] active:scale-95 transition-all group cursor-pointer"
              @click="currentStep = 3"
            >
              <Icon name="heroicons:arrow-left" class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-160" />
              <span>Back to Personal Info</span>
            </button>

            <!-- Emil Kowalski Segmented Progress Stepper -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between text-xs">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF4ED] text-[#7B5A50] font-bold tracking-wide border border-[#EEDFC4] shadow-xs">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#7B5A50] animate-pulse"></span>
                  Step 2 of 2 · Business Info
                </span>
                <span class="text-[#8A6E64] font-semibold text-xs tabular-nums">Page 1 of 2 · 75%</span>
              </div>
              <!-- Segmented Progress Bar -->
              <div class="grid grid-cols-2 gap-1.5 h-2 w-full bg-[#EFEAE2] rounded-full overflow-hidden p-0.5 shadow-inner">
                <div class="h-full rounded-full bg-[#7B5A50] transition-all duration-300"></div>
                <div class="h-full rounded-full bg-[#7B5A50]/35 transition-all duration-300"></div>
              </div>
            </div>

            <div>
              <h1 class="text-2xl sm:text-3xl font-display font-bold text-[#2D201B] tracking-tight">Business details</h1>
              <p class="text-[#8A6E64] text-xs sm:text-sm mt-1 leading-relaxed">Enter your café and main branch information.</p>
            </div>

            <!-- Auth Error Banner -->
            <div
              v-if="error"
              class="p-4 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-3 shadow-xs"
            >
              <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-rose-600 shrink-0" />
              <span class="font-medium">{{ error }}</span>
            </div>

            <form @submit.prevent="nextBusinessSubPage" class="space-y-5">
              <!-- General Info Card -->
              <div class="bg-white rounded-2xl border border-[#EEDFC4] p-5 sm:p-6 shadow-[0_2px_12px_rgba(59,31,14,0.03)] space-y-4">
                <div class="flex items-center gap-2 pb-3 border-b border-[#FAF4ED]">
                  <div class="w-7 h-7 rounded-lg bg-[#FAF4ED] text-[#7B5A50] flex items-center justify-center">
                    <Icon name="heroicons:building-storefront" class="w-4 h-4" />
                  </div>
                  <h3 class="text-xs uppercase tracking-wider font-bold text-[#482D25]">General Info</h3>
                </div>
                <div class="grid grid-cols-2 gap-3.5">
                  <div class="col-span-2 sm:col-span-1 space-y-1.5">
                    <label class="block text-xs font-bold text-[#5C3C32] uppercase tracking-wider">Business Name *</label>
                    <input
                      v-model="cafeName"
                      type="text"
                      placeholder="BrewSpot Davao"
                      class="w-full h-11 rounded-xl border border-[#D9C7B6] px-3.5 outline-none transition bg-[#FFFEFD] text-sm text-[#2D201B] placeholder-[#B5A196] focus:border-[#7B5A50] focus:ring-4 focus:ring-[#7B5A50]/10"
                      required
                    />
                  </div>
                  <div class="col-span-2 sm:col-span-1 space-y-1.5">
                    <label class="block text-xs font-bold text-[#5C3C32] uppercase tracking-wider">Document Type *</label>
                    <DropdownList
                      v-model="cafeDocType"
                      :options="CAFE_DOC_TYPE_OPTIONS"
                      size="sm"
                      white
                    />
                  </div>
                  <div class="col-span-2 space-y-1.5">
                    <label class="block text-xs font-bold text-[#5C3C32] uppercase tracking-wider">Branch Name *</label>
                    <input
                      v-model="branchName"
                      type="text"
                      placeholder="Main Branch"
                      class="w-full h-11 rounded-xl border border-[#D9C7B6] px-3.5 outline-none transition bg-[#FFFEFD] text-sm text-[#2D201B] placeholder-[#B5A196] focus:border-[#7B5A50] focus:ring-4 focus:ring-[#7B5A50]/10"
                      required
                    />
                  </div>
                </div>
              </div>

              <!-- Café Picture (optional) -->
              <div class="bg-white rounded-2xl border border-[#EEDFC4] p-5 sm:p-6 shadow-[0_2px_12px_rgba(59,31,14,0.03)] space-y-3.5">
                <div class="flex items-center justify-between pb-3 border-b border-[#FAF4ED]">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-[#FAF4ED] text-[#7B5A50] flex items-center justify-center">
                      <Icon name="heroicons:photo" class="w-4 h-4" />
                    </div>
                    <h3 class="text-xs uppercase tracking-wider font-bold text-[#482D25]">Café Picture</h3>
                  </div>
                  <span class="text-[11px] font-medium text-[#8A6E64] bg-[#FAF4ED] px-2.5 py-0.5 rounded-full border border-[#EEDFC4]">Optional</span>
                </div>

                <div v-if="!cafePicturePath">
                  <label
                    for="cafe-picture-input"
                    class="border-2 border-dashed border-[#D9C7B6] hover:border-[#7B5A50] bg-[#FAF6F0]/60 hover:bg-[#FAF4ED] active:scale-[0.99] rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-160 group select-none"
                  >
                    <div class="w-10 h-10 rounded-xl bg-white text-[#7B5A50] shadow-xs flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-160">
                      <Icon name="heroicons:arrow-up-tray" class="w-5 h-5" />
                    </div>
                    <p class="text-xs font-bold text-[#2D201B]">Upload Storefront or Interior Photo</p>
                    <p class="text-[11px] text-[#8A6E64] mt-0.5">JPG, JPEG or PNG · Max 2MB</p>
                    <input
                      id="cafe-picture-input"
                      type="file"
                      class="sr-only"
                      @change="onCafePictureChange"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    />
                  </label>
                </div>
                <div v-else class="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-300">
                  <div class="flex items-center gap-3 min-w-0">
                    <img
                      v-if="cafePicturePreview"
                      :src="cafePicturePreview"
                      alt="Café picture preview"
                      class="w-12 h-12 rounded-lg object-cover ring-2 ring-emerald-400 shrink-0"
                    />
                    <div class="truncate">
                      <p class="font-bold truncate text-xs text-emerald-950">{{ cafePictureName || 'Uploaded Picture' }}</p>
                      <p class="text-[10px] text-emerald-700 font-semibold">Storefront Photo Ready</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="clearCafePicture"
                    class="w-7 h-7 rounded-lg text-emerald-800 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center active:scale-90 transition-all font-bold text-base cursor-pointer shrink-0"
                    title="Remove picture"
                  >&times;</button>
                </div>
                <p v-if="fieldErrors.cafe_picture" class="text-xs text-rose-600 font-medium">{{ fieldErrors.cafe_picture }}</p>
              </div>

              <!-- Contact Info Card -->
              <div class="bg-white rounded-2xl border border-[#EEDFC4] p-5 sm:p-6 shadow-[0_2px_12px_rgba(59,31,14,0.03)] space-y-4">
                <div class="flex items-center gap-2 pb-3 border-b border-[#FAF4ED]">
                  <div class="w-7 h-7 rounded-lg bg-[#FAF4ED] text-[#7B5A50] flex items-center justify-center">
                    <Icon name="heroicons:phone" class="w-4 h-4" />
                  </div>
                  <h3 class="text-xs uppercase tracking-wider font-bold text-[#482D25]">Branch Contact</h3>
                </div>
                <div class="space-y-4">
                  <div class="space-y-1.5">
                    <label class="block text-xs font-bold text-[#5C3C32] uppercase tracking-wider">Branch Phone *</label>
                    <div
                      class="flex items-center rounded-xl border bg-[#FFFEFD] transition focus-within:border-[#7B5A50] focus-within:ring-4 focus-within:ring-[#7B5A50]/10 h-11 overflow-hidden"
                      :class="fieldErrors.cafe_phonenumber ? 'border-rose-400 ring-2 ring-rose-400/20' : 'border-[#D9C7B6]'"
                    >
                      <!-- Box-type Type Selector beside input number -->
                      <div class="bg-[#FAF6F0] border-r border-[#D9C7B6] shrink-0 h-full flex items-center px-3 text-[#2D201B] font-semibold text-xs">
                        <DropdownList
                          v-model="cafePhoneType"
                          :options="PHONE_TYPE_OPTIONS"
                          bare
                          aria-label="Branch phone type"
                          @change="onCafePhoneTypeChange"
                        />
                      </div>

                      <!-- Mobile Input (10 digits starting with 9) -->
                      <input
                        v-if="cafePhoneType === 'mobile'"
                        v-model="cafeMobileDigits"
                        type="tel"
                        inputmode="numeric"
                        maxlength="10"
                        placeholder="9123456789"
                        class="w-full h-full px-3 text-sm text-[#2D201B] placeholder-[#B5A196] bg-transparent outline-none"
                        required
                        @input="onCafeMobileInput"
                        @blur="checkCafePhoneAvailability"
                      />

                      <!-- Landline Input -->
                      <input
                        v-else
                        v-model="cafeLandlineDigits"
                        type="tel"
                        placeholder="082-299-1234 or 02-8123-4567"
                        maxlength="15"
                        class="w-full h-full px-3 text-sm text-[#2D201B] placeholder-[#B5A196] bg-transparent outline-none"
                        required
                        @input="onCafeLandlineInput"
                        @blur="checkCafePhoneAvailability"
                      />
                    </div>
                    <p v-if="fieldErrors.cafe_phonenumber" class="text-xs text-rose-600 font-medium">{{ fieldErrors.cafe_phonenumber }}</p>
                  </div>

                  <div class="space-y-1.5">
                    <label class="block text-xs font-bold text-[#5C3C32] uppercase tracking-wider">Branch Address *</label>
                    <input
                      v-model="address"
                      type="text"
                      placeholder="Street, Barangay, District, Davao City"
                      class="w-full h-11 rounded-xl border border-[#D9C7B6] px-3.5 outline-none transition bg-[#FFFEFD] text-sm text-[#2D201B] placeholder-[#B5A196] focus:border-[#7B5A50] focus:ring-4 focus:ring-[#7B5A50]/10"
                      required
                    />
                  </div>

                  <div class="space-y-1.5">
                    <label class="block text-xs font-bold text-[#5C3C32] uppercase tracking-wider">Café Email *</label>
                    <input
                      v-model="cafeEmail"
                      type="email"
                      placeholder="contact@brewspot.com"
                      :class="[
                        'w-full h-11 rounded-xl border px-3.5 outline-none transition bg-[#FFFEFD] text-sm text-[#2D201B] placeholder-[#B5A196]',
                        fieldErrors.cafe_email
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20'
                          : 'border-[#D9C7B6] focus:border-[#7B5A50] focus:ring-4 focus:ring-[#7B5A50]/10'
                      ]"
                      required
                      @input="clearFieldError('cafe_email')"
                      @blur="checkCafeEmailAvailability"
                    />
                    <p v-if="fieldErrors.cafe_email" class="text-xs text-rose-600 font-medium">{{ fieldErrors.cafe_email }}</p>
                  </div>
                </div>
              </div>

              <!-- Page 1 Submit Button -->
              <div class="pt-2">
                <button
                  type="submit"
                  class="w-full h-12 rounded-xl bg-[#3B1F0E] text-[#FFF8EA] font-display font-semibold tracking-wide hover:bg-[#2A150A] active:scale-[0.98] transition-all duration-160 ease-out flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(59,31,14,0.18)] hover:shadow-[0_6px_20px_rgba(59,31,14,0.24)] cursor-pointer group"
                >
                  <span>Next: Upload Business Requirements</span>
                  <Icon name="heroicons:arrow-right" class="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-160" />
                </button>
              </div>
            </form>
          </div>

          <!-- Page 2: 2 Required Business Documents & BIR Details -->
          <div v-else class="space-y-6">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A6E64] hover:text-[#2D201B] active:scale-95 transition-all group cursor-pointer"
              @click="prevBusinessSubPage"
            >
              <Icon name="heroicons:arrow-left" class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-160" />
              <span>Back to Business Details</span>
            </button>

            <!-- Emil Kowalski Segmented Progress Stepper -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between text-xs">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF4ED] text-[#7B5A50] font-bold tracking-wide border border-[#EEDFC4] shadow-xs">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Step 2 of 2 · Documents & BIR
                </span>
                <span class="text-emerald-700 font-semibold text-xs tabular-nums">Page 2 of 2 · 100%</span>
              </div>
              <!-- Segmented Progress Bar -->
              <div class="grid grid-cols-2 gap-1.5 h-2 w-full bg-[#EFEAE2] rounded-full overflow-hidden p-0.5 shadow-inner">
                <div class="h-full rounded-full bg-[#7B5A50] transition-all duration-300"></div>
                <div class="h-full rounded-full bg-[#7B5A50] transition-all duration-300"></div>
              </div>
            </div>

            <div>
              <h1 class="text-2xl sm:text-3xl font-display font-bold text-[#2D201B] tracking-tight">Required Requirements</h1>
              <p class="text-[#8A6E64] text-xs sm:text-sm mt-1 leading-relaxed">Upload the 2 required business documents below.</p>
            </div>

            <!-- Upload Progress Card -->
            <div class="bg-white rounded-2xl border border-[#EEDFC4] p-4 flex items-center justify-between shadow-[0_2px_12px_rgba(59,31,14,0.03)]">
              <div class="flex items-center space-x-3">
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-xs"
                  :class="uploadedCount === 2 ? 'bg-emerald-600 text-white' : 'bg-[#7B5A50] text-[#FFF8EA]'"
                >
                  <Icon v-if="uploadedCount === 2" name="heroicons:check" class="w-4 h-4" />
                  <span v-else>{{ uploadedCount }}</span>
                </div>
                <span class="text-xs font-bold text-[#2D201B]">
                  {{ uploadedCount === 2 ? 'All 2 requirements uploaded ✓' : `${uploadedCount} of 2 requirements uploaded` }}
                </span>
              </div>
              <div class="w-28 bg-[#FAF4ED] rounded-full h-2 p-0.5 border border-[#EEDFC4] overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="uploadedCount === 2 ? 'bg-emerald-600' : 'bg-[#7B5A50]'"
                  :style="{ width: `${(uploadedCount / 2) * 100}%` }"
                ></div>
              </div>
            </div>

            <!-- Auth Error Banner -->
            <div
              v-if="error"
              class="p-4 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-3 shadow-xs"
            >
              <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-rose-600 shrink-0" />
              <span class="font-medium whitespace-pre-line">{{ error }}</span>
            </div>

            <form @submit.prevent="handleFinalSubmit" class="space-y-5">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <!-- 1. BIR Certificate Dropzone Card -->
                <div class="bg-white rounded-2xl border border-[#EEDFC4] p-4 sm:p-5 shadow-[0_2px_12px_rgba(59,31,14,0.03)] space-y-3">
                  <div class="flex items-center justify-between">
                    <label class="font-bold text-xs text-[#2D201B] uppercase tracking-wider">1. BIR Certificate <span class="text-rose-500">*</span></label>
                    <span v-if="birFile" class="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Icon name="heroicons:check" class="w-3.5 h-3.5" /> Ready
                    </span>
                  </div>

                  <div v-if="!birFile">
                    <label
                      for="bir-cert-input"
                      class="border-2 border-dashed border-[#D9C7B6] hover:border-[#7B5A50] bg-[#FAF6F0]/60 hover:bg-[#FAF4ED] active:scale-[0.98] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-160 group select-none min-h-[110px]"
                    >
                      <div class="w-8 h-8 rounded-lg bg-white text-[#7B5A50] shadow-xs flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform duration-160">
                        <Icon name="heroicons:document-text" class="w-4 h-4" />
                      </div>
                      <p class="text-xs font-bold text-[#2D201B]">Upload BIR Certificate</p>
                      <p class="text-[10px] text-[#8A6E64] mt-0.5">PDF, JPG, PNG · Max 5MB</p>
                      <input
                        id="bir-cert-input"
                        type="file"
                        class="sr-only"
                        @change="onBirChange"
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                        required
                      />
                    </label>
                  </div>
                  <div v-else class="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-300">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Icon name="heroicons:check" class="w-4 h-4" />
                      </div>
                      <div class="truncate">
                        <p class="font-bold truncate text-xs text-emerald-950">{{ birFileName }}</p>
                        <p class="text-[10px] text-emerald-700 font-semibold">{{ birFileSize }}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      @click="clearBirFile"
                      class="w-7 h-7 rounded-lg text-emerald-800 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center active:scale-90 transition-all font-bold text-base cursor-pointer shrink-0"
                      title="Remove file"
                    >&times;</button>
                  </div>
                </div>

                <!-- 2. DTI or SEC Document Dropzone Card -->
                <div class="bg-white rounded-2xl border border-[#EEDFC4] p-4 sm:p-5 shadow-[0_2px_12px_rgba(59,31,14,0.03)] space-y-3">
                  <div class="flex items-center justify-between">
                    <label class="font-bold text-xs text-[#2D201B] uppercase tracking-wider">2. {{ cafeDocType }} Document <span class="text-rose-500">*</span></label>
                    <span v-if="dtiSecFile" class="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Icon name="heroicons:check" class="w-3.5 h-3.5" /> Ready
                    </span>
                  </div>

                  <div v-if="!dtiSecFile">
                    <label
                      for="dti-sec-input"
                      class="border-2 border-dashed border-[#D9C7B6] hover:border-[#7B5A50] bg-[#FAF6F0]/60 hover:bg-[#FAF4ED] active:scale-[0.98] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-160 group select-none min-h-[110px]"
                    >
                      <div class="w-8 h-8 rounded-lg bg-white text-[#7B5A50] shadow-xs flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform duration-160">
                        <Icon name="heroicons:document-text" class="w-4 h-4" />
                      </div>
                      <p class="text-xs font-bold text-[#2D201B]">Upload {{ cafeDocType }} Document</p>
                      <p class="text-[10px] text-[#8A6E64] mt-0.5">PDF, JPG, PNG · Max 5MB</p>
                      <input
                        id="dti-sec-input"
                        type="file"
                        class="sr-only"
                        @change="onDtiSecChange"
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                        required
                      />
                    </label>
                  </div>
                  <div v-else class="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-300">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Icon name="heroicons:check" class="w-4 h-4" />
                      </div>
                      <div class="truncate">
                        <p class="font-bold truncate text-xs text-emerald-950">{{ dtiSecFileName }}</p>
                        <p class="text-[10px] text-emerald-700 font-semibold">{{ dtiSecFileSize }}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      @click="clearDtiSecFile"
                      class="w-7 h-7 rounded-lg text-emerald-800 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center active:scale-90 transition-all font-bold text-base cursor-pointer shrink-0"
                      title="Remove file"
                    >&times;</button>
                  </div>
                </div>
              </div>

              <!-- BIR Registration Details Form (Visible once BIR File is uploaded) -->
              <div v-if="birFile" class="bg-white rounded-2xl border border-[#EEDFC4] p-5 sm:p-6 shadow-[0_2px_12px_rgba(59,31,14,0.03)] space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-[#FAF4ED]">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-[#FAF4ED] text-[#7B5A50] flex items-center justify-center">
                      <Icon name="heroicons:clipboard-document-check" class="w-4 h-4" />
                    </div>
                    <h3 class="text-xs uppercase tracking-wider font-bold text-[#482D25]">BIR Registration Details</h3>
                  </div>
                  <span class="text-[11px] bg-[#FAF4ED] text-[#7B5A50] font-bold px-2.5 py-0.5 rounded-full border border-[#EEDFC4]">
                    Required Details
                  </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- TIN Number -->
                  <div class="space-y-1.5">
                    <label class="block text-xs font-bold text-[#5C3C32] uppercase tracking-wider">TIN *</label>
                    <input
                      v-model="tinNumber"
                      type="text"
                      placeholder="XXX-XXX-XXX-00000"
                      maxlength="17"
                      :class="[
                        'w-full h-11 rounded-xl border px-3.5 outline-none transition bg-[#FFFEFD] text-xs font-mono tracking-wider text-[#2D201B] placeholder-[#B5A196]',
                        fieldErrors.tin_number
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20'
                          : 'border-[#D9C7B6] focus:border-[#7B5A50] focus:ring-4 focus:ring-[#7B5A50]/10'
                      ]"
                      required
                      @input="onTinInput"
                    />
                    <p v-if="fieldErrors.tin_number" class="text-xs text-rose-600 font-medium">{{ fieldErrors.tin_number }}</p>
                  </div>

                  <!-- VAT Status Option Buttons -->
                  <div class="space-y-1.5">
                    <label class="block text-xs font-bold text-[#5C3C32] uppercase tracking-wider">VAT Registration Type *</label>
                    <div class="grid grid-cols-2 gap-2 h-11">
                      <button
                        type="button"
                        @click="vat = 'vat-registered'; clearFieldError('vat')"
                        :class="[
                          'rounded-xl text-xs font-bold transition-all duration-160 ease-out flex items-center justify-center cursor-pointer active:scale-[0.98]',
                          vat === 'vat-registered'
                            ? 'bg-[#3B1F0E] text-[#FFF8EA] shadow-[0_2px_8px_rgba(59,31,14,0.18)]'
                            : 'bg-[#FAF6F0] text-[#5C3C32] border border-[#D9C7B6] hover:bg-[#F3ECE0]'
                        ]"
                      >
                        VAT
                      </button>
                      <button
                        type="button"
                        @click="vat = 'non-vat'; clearFieldError('vat')"
                        :class="[
                          'rounded-xl text-xs font-bold transition-all duration-160 ease-out flex items-center justify-center cursor-pointer active:scale-[0.98]',
                          vat === 'non-vat'
                            ? 'bg-[#3B1F0E] text-[#FFF8EA] shadow-[0_2px_8px_rgba(59,31,14,0.18)]'
                            : 'bg-[#FAF6F0] text-[#5C3C32] border border-[#D9C7B6] hover:bg-[#F3ECE0]'
                        ]"
                      >
                        Non-VAT
                      </button>
                    </div>
                    <p v-if="fieldErrors.vat" class="text-xs text-rose-600 font-medium">{{ fieldErrors.vat }}</p>
                  </div>

                  <!-- BIR Registered Date with EmilCalendar -->
                  <div class="space-y-1.5 sm:col-span-2">
                    <label class="block text-xs font-bold text-[#5C3C32] uppercase tracking-wider">BIR Registration Date *</label>
                    <EmilCalendar
                      v-model="birRegisteredAt"
                      placeholder="Select BIR registration date"
                      align="left"
                      :invalid="!!fieldErrors.bir_registered_at"
                      button-class="w-full h-11 rounded-xl border border-[#D9C7B6] px-3.5 text-xs sm:text-sm text-[#2D201B] bg-[#FFFEFD] hover:border-[#7B5A50] focus:border-[#7B5A50] focus:ring-4 focus:ring-[#7B5A50]/10"
                      @update:model-value="clearFieldError('bir_registered_at')"
                    />
                    <p v-if="fieldErrors.bir_registered_at" class="text-xs text-rose-600 font-medium">{{ fieldErrors.bir_registered_at }}</p>
                  </div>
                </div>
              </div>

              <!-- Page 2 Action Buttons -->
              <div class="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  class="w-1/3 h-12 rounded-xl border border-[#D9C7B6] bg-white text-[#5C3C32] font-semibold hover:bg-[#FAF6F0] active:scale-[0.98] transition-all duration-160 ease-out flex items-center justify-center cursor-pointer"
                  @click="prevBusinessSubPage"
                >
                  Back
                </button>
                <button
                  type="submit"
                  :disabled="loading || uploadedCount < 2 || (!!birFile && (!tinNumber || !birRegisteredAt || !vat))"
                  class="w-2/3 h-12 rounded-xl bg-[#3B1F0E] text-[#FFF8EA] font-display font-semibold tracking-wide hover:bg-[#2A150A] active:scale-[0.98] transition-all duration-160 ease-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(59,31,14,0.18)] hover:shadow-[0_6px_20px_rgba(59,31,14,0.24)] cursor-pointer group"
                >
                  <span v-if="loading" class="w-4 h-4 border-2 border-[#FFF8EA] border-t-transparent rounded-full animate-spin"></span>
                  <span>{{ loading ? 'Submitting Application...' : 'Submit Registration' }}</span>
                  <Icon v-if="!loading" name="heroicons:arrow-right" class="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-160" />
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- STEP 5: Review / Submitted Screen -->
        <div v-else-if="currentStep === 5" key="step5" class="space-y-6">
          <div class="space-y-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
              <Icon name="heroicons:check-circle" class="w-4 h-4 text-emerald-600" />
              Registration Submitted Successfully
            </span>
            <h1 class="text-2xl sm:text-3xl font-display font-bold text-[#2D201B] tracking-tight mt-1">Application Received!</h1>
            <p class="text-[#8A6E64] text-xs sm:text-sm leading-relaxed">
              We've sent a confirmation email to <span class="font-bold text-[#2D201B]">{{ email }}</span> with a direct link to view your submitted details and track review progress.
            </p>
          </div>

          <!-- Direct View Details CTA Card -->
          <div class="bg-white rounded-2xl border border-[#EEDFC4] p-5 sm:p-6 space-y-4 shadow-[0_2px_12px_rgba(59,31,14,0.03)]">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#FAF4ED] text-[#7B5A50] flex items-center justify-center shrink-0 shadow-xs">
                <Icon name="heroicons:document-text" class="w-5 h-5" />
              </div>
              <div>
                <p class="text-sm font-bold text-[#2D201B]">View Your Submitted Application</p>
                <p class="text-xs text-[#8A6E64] mt-0.5">
                  Check all the information and uploaded documents you entered anytime.
                </p>
              </div>
            </div>

            <NuxtLink
              v-if="userUuid"
              :to="`/application/${userUuid}`"
              class="w-full h-12 rounded-xl bg-[#3B1F0E] text-[#FFF8EA] text-xs sm:text-sm font-semibold hover:bg-[#2A150A] active:scale-[0.98] transition-all duration-160 ease-out flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(59,31,14,0.18)]"
            >
              <Icon name="heroicons:eye" class="w-4 h-4" />
              View Application Details
            </NuxtLink>
          </div>

          <!-- What happens next? Card -->
          <div class="rounded-2xl border border-[#EEDFC4] bg-[#FAF6F0] p-5 space-y-3">
            <p class="text-xs font-bold text-[#482D25] uppercase tracking-wider">What happens next?</p>
            <ul class="space-y-2.5 text-xs text-[#5C3C32]">
              <li class="flex items-center gap-2.5">
                <div class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Icon name="heroicons:check" class="w-3.5 h-3.5" />
                </div>
                <span>1. Document Verification & Compliance Review (1–3 business days)</span>
              </li>
              <li class="flex items-center gap-2.5">
                <div class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Icon name="heroicons:check" class="w-3.5 h-3.5" />
                </div>
                <span>2. Email Notification upon Admin Approval</span>
              </li>
              <li class="flex items-center gap-2.5">
                <div class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Icon name="heroicons:check" class="w-3.5 h-3.5" />
                </div>
                <span>3. Password Setup & Immediate Dashboard Access</span>
              </li>
            </ul>
          </div>

          <!-- Bottom Navigation Actions -->
          <div class="flex items-center gap-3 pt-2">
            <NuxtLink
              to="/"
              class="w-1/2 h-11 rounded-xl border border-[#D9C7B6] bg-white text-[#5C3C32] font-semibold hover:bg-[#FAF6F0] active:scale-[0.98] transition-all duration-160 ease-out flex items-center justify-center gap-1.5 text-xs"
            >
              <Icon name="heroicons:home" class="w-4 h-4" />
              Back to Home
            </NuxtLink>
            <button
              type="button"
              class="w-1/2 h-11 rounded-xl bg-[#3B1F0E] text-[#FFF8EA] font-semibold hover:bg-[#2A150A] active:scale-[0.98] transition-all duration-160 ease-out flex items-center justify-center gap-1.5 text-xs shadow-xs"
              @click="goLogin"
            >
              Go to Sign In
            </button>
          </div>
        </div>

        </Transition>
      </div>
    </section>
  </div>
</template>

<style scoped>
.fade-slide-enter-active {
  transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-leave-active {
  transition: opacity 150ms ease-in, transform 150ms ease-in;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (prefers-reduced-motion: reduce) {
  .fade-slide-enter-active,
  .fade-slide-leave-active {
    transition: opacity 100ms ease;
    transform: none !important;
  }
}
</style>
