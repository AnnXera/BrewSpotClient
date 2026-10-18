<script setup lang="ts">
interface ApprovingManager {
  uuid: string
  name: string
  role: string
  has_pin: boolean
  is_locked: boolean
}

const props = defineProps<{
  show: boolean
  transaction: any
}>()

const emit = defineEmits<{
  close: []
  refunded: [transaction: any]
}>()

const devicePosService = useDevicePosService()

const managers = ref<ApprovingManager[]>([])
const selectedManagerUuid = ref<string>('')
const pin = ref('')
const reason = ref('')
const selectedReasonChip = ref('')
const loading = ref(false)
const loadingManagers = ref(false)
const errorMessage = ref('')
const attemptsLeft = ref<number | null>(null)
const successMessage = ref('')

const quickReasons = [
  'Customer Request',
  'Wrong Item Charged',
  'Quality / Spoilage Issue',
  'Customer Changed Mind',
  'Duplicate Charge',
]

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
function formatCurrency(amount: number) {
  return money.format(amount || 0)
}

const formattedReceipt = computed(() => {
  const num = props.transaction.receipt_number || props.transaction.uuid
  return /^\d+$/.test(num) ? `#${num}` : num
})

const effectiveReason = computed(() => {
  if (selectedReasonChip.value && reason.value) {
    return `${selectedReasonChip.value} - ${reason.value}`
  }
  return selectedReasonChip.value || reason.value || 'Customer refund'
})

async function fetchManagers() {
  loadingManagers.value = true
  errorMessage.value = ''
  try {
    const res = await devicePosService.getApprovingManagers()
    if (res.success && res.managers) {
      managers.value = res.managers
      const valid = res.managers.find(m => m.has_pin && !m.is_locked)
      const firstManager = res.managers[0]
      if (valid) {
        selectedManagerUuid.value = valid.uuid
      } else if (firstManager) {
        selectedManagerUuid.value = firstManager.uuid
      }
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.message || 'Could not load authorized managers.'
  } finally {
    loadingManagers.value = false
  }
}

watch(() => props.show, (val) => {
  if (val) {
    pin.value = ''
    reason.value = ''
    selectedReasonChip.value = ''
    errorMessage.value = ''
    attemptsLeft.value = null
    successMessage.value = ''
    fetchManagers()
  }
})

onMounted(() => {
  if (props.show) fetchManagers()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

function handleChipClick(chip: string) {
  if (selectedReasonChip.value === chip) {
    selectedReasonChip.value = ''
  } else {
    selectedReasonChip.value = chip
  }
}

function handleNumpad(digit: string) {
  if (loading.value || successMessage.value) return
  if (pin.value.length < 6) {
    pin.value += digit
    errorMessage.value = ''
  }
}

function handleBackspace() {
  if (loading.value || successMessage.value) return
  if (pin.value.length > 0) {
    pin.value = pin.value.slice(0, -1)
    errorMessage.value = ''
  }
}

function clearPin() {
  if (loading.value || successMessage.value) return
  pin.value = ''
  errorMessage.value = ''
}

function handleKeyDown(e: KeyboardEvent) {
  if (!props.show || loading.value || successMessage.value) return

  // Don't intercept if user is typing in the reason text input
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    if (e.key === 'Escape') {
      emit('close')
    }
    return
  }

  if (e.key >= '0' && e.key <= '9') {
    e.preventDefault()
    handleNumpad(e.key)
  } else if (e.key === 'Backspace') {
    e.preventDefault()
    handleBackspace()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (canSubmit.value) {
      submitRefund()
    }
  }
}

const canSubmit = computed(() => {
  return (
    !!selectedManagerUuid.value &&
    pin.value.length >= 4 &&
    !loading.value &&
    !successMessage.value
  )
})

async function submitRefund() {
  if (!canSubmit.value) return

  loading.value = true
  errorMessage.value = ''
  attemptsLeft.value = null

  try {
    const res = await devicePosService.refundTransaction(
      props.transaction.uuid,
      selectedManagerUuid.value,
      pin.value,
      effectiveReason.value
    )

    if (res.success) {
      successMessage.value = res.message || 'Refund successfully processed.'
      setTimeout(() => {
        emit('refunded', res.transaction)
        emit('close')
      }, 1200)
    } else {
      errorMessage.value = res.message || 'Refund authorization failed.'
      pin.value = ''
    }
  } catch (err: any) {
    const data = err?.data
    errorMessage.value = data?.message || 'Incorrect manager PIN or unauthorized account.'
    if (data?.attempts_left != null) {
      attemptsLeft.value = data.attempts_left
    }
    pin.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="refund-modal-title">
    <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] border border-[#EADFD3] animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Header -->
      <div class="px-6 py-4 bg-[#FBF7F2] border-b border-[#EADFD3] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <Icon name="heroicons:arrow-uturn-left" class="w-5 h-5" />
          </div>
          <div>
            <h3 id="refund-modal-title" class="font-display text-lg font-bold text-[#2d201b]">
              Manager Refund Authorization
            </h3>
            <p class="text-xs text-[#8A6E64]">
              Sale {{ formattedReceipt }} &middot; Authorized by Manager PIN
            </p>
          </div>
        </div>
        <button
          @click="emit('close')"
          :disabled="loading"
          class="w-8 h-8 rounded-full text-[#8A6E64] hover:text-[#2d201b] hover:bg-[#EADFD3]/40 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        
        <!-- Sale Summary Card -->
        <div class="p-4 rounded-xl bg-[#FBF7F2] border border-[#EADFD3] flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-[#8A6E64] uppercase tracking-wider">Refund Amount</span>
            <div class="text-2xl font-bold text-red-700 tabular-nums">
              {{ formatCurrency(transaction.total_amount) }}
            </div>
            <p class="text-xs text-[#6B5048] mt-0.5">
              Orig. Cashier: <span class="font-medium text-[#2d201b]">{{ transaction.staff_name }}</span>
            </p>
          </div>
          <div class="text-right">
            <span class="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
              {{ transaction.payment?.method ? transaction.payment.method.toUpperCase() : 'PAID' }}
            </span>
            <p class="text-xs text-[#8A6E64] mt-1 tabular-nums">
              {{ transaction.items?.length || 0 }} items
            </p>
          </div>
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-sm font-semibold flex items-center gap-2">
          <Icon name="heroicons:check-circle" class="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{{ successMessage }}</span>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="p-3 bg-red-50 border border-red-300 text-red-800 rounded-lg text-sm font-medium flex items-start gap-2">
          <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <p class="font-semibold">{{ errorMessage }}</p>
            <p v-if="attemptsLeft != null && attemptsLeft > 0" class="text-xs text-red-700 mt-0.5">
              {{ attemptsLeft }} attempt{{ attemptsLeft === 1 ? '' : 's' }} remaining before account PIN locks.
            </p>
          </div>
        </div>

        <!-- Step 1: Select Manager -->
        <div>
          <label class="block text-xs font-bold text-[#8A6E64] uppercase tracking-wide mb-1.5">
            1. Authorizing Manager
          </label>
          <div v-if="loadingManagers" class="h-11 rounded-lg bg-gray-100 animate-pulse" />
          <div v-else-if="!managers.length" class="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs">
            No managers found for this branch. Please ask an owner or manager to set up staff roles.
          </div>
          <div v-else class="grid grid-cols-1 gap-2">
            <label
              v-for="m in managers"
              :key="m.uuid"
              :class="[
                'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all',
                selectedManagerUuid === m.uuid
                  ? 'border-[#7B5A50] bg-[#7B5A50]/5 ring-1 ring-[#7B5A50]'
                  : 'border-[#EADFD3] bg-white hover:bg-[#FBF7F2]',
                (!m.has_pin || m.is_locked) ? 'opacity-60 cursor-not-allowed' : ''
              ]"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <input
                  type="radio"
                  name="manager"
                  :value="m.uuid"
                  v-model="selectedManagerUuid"
                  :disabled="!m.has_pin || m.is_locked"
                  class="w-4 h-4 text-[#7B5A50] focus:ring-[#7B5A50]"
                />
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-[#2d201b] truncate">{{ m.name }}</p>
                  <p class="text-xs text-[#8A6E64]">{{ m.role }}</p>
                </div>
              </div>
              <span v-if="!m.has_pin" class="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                No PIN set
              </span>
              <span v-else-if="m.is_locked" class="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                PIN locked
              </span>
            </label>
          </div>
        </div>

        <!-- Step 2: Reason -->
        <div>
          <label class="block text-xs font-bold text-[#8A6E64] uppercase tracking-wide mb-1.5">
            2. Reason for Refund (Optional)
          </label>
          <div class="flex flex-wrap gap-1.5 mb-2">
            <button
              v-for="chip in quickReasons"
              :key="chip"
              type="button"
              @click="handleChipClick(chip)"
              :class="[
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                selectedReasonChip === chip
                  ? 'bg-[#7B5A50] text-white border-[#7B5A50]'
                  : 'bg-white text-[#6B5048] border-[#EADFD3] hover:bg-[#FBF7F2]'
              ]"
            >
              {{ chip }}
            </button>
          </div>
          <input
            v-model="reason"
            type="text"
            maxlength="200"
            placeholder="Additional notes / details..."
            class="w-full h-10 px-3 rounded-lg border border-[#EADFD3] bg-white text-sm text-[#2d201b] placeholder:text-[#8A6E64] focus:outline-none focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50]"
          />
        </div>

        <!-- Step 3: Enter Manager PIN -->
        <div>
          <label class="block text-xs font-bold text-[#8A6E64] uppercase tracking-wide mb-2 text-center">
            3. Enter Manager's 6-Digit PIN
          </label>
          
          <!-- PIN Dots Indicator -->
          <div class="flex justify-center gap-2 mb-4">
            <div
              v-for="i in 6"
              :key="i"
              class="w-9 h-11 rounded-lg border flex items-center justify-center text-2xl transition-all font-bold"
              :class="pin.length >= i
                ? 'border-[#7B5A50] bg-[#7B5A50] text-white shadow-sm'
                : 'border-[#D6C5B8] bg-white text-gray-400'"
            >
              <span v-if="pin.length >= i">&bull;</span>
            </div>
          </div>

          <!-- Numpad Keypad -->
          <div class="max-w-xs mx-auto grid grid-cols-3 gap-2">
            <button
              v-for="n in ['1','2','3','4','5','6','7','8','9']"
              :key="n"
              type="button"
              @click="handleNumpad(n)"
              :disabled="loading"
              class="h-11 rounded-lg bg-white border border-[#E2D5C8] text-lg font-bold text-[#2d201b] hover:bg-[#FBF7F2] active:bg-[#F3EBE2] active:scale-95 transition-all shadow-xs select-none"
            >
              {{ n }}
            </button>
            <button
              type="button"
              @click="clearPin"
              :disabled="loading"
              class="h-11 rounded-lg bg-[#FBF7F2] border border-[#E2D5C8] text-xs font-bold text-[#8A6E64] hover:bg-[#F3EBE2] active:scale-95 transition-all select-none"
            >
              Clear
            </button>
            <button
              type="button"
              @click="handleNumpad('0')"
              :disabled="loading"
              class="h-11 rounded-lg bg-white border border-[#E2D5C8] text-lg font-bold text-[#2d201b] hover:bg-[#FBF7F2] active:bg-[#F3EBE2] active:scale-95 transition-all shadow-xs select-none"
            >
              0
            </button>
            <button
              type="button"
              @click="handleBackspace"
              :disabled="loading"
              aria-label="Backspace"
              class="h-11 rounded-lg bg-[#FBF7F2] border border-[#E2D5C8] flex items-center justify-center text-[#8A6E64] hover:bg-[#F3EBE2] active:scale-95 transition-all select-none"
            >
              <Icon name="heroicons:backspace" class="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>

      <!-- Footer Buttons -->
      <div class="px-6 py-4 bg-[#FBF7F2] border-t border-[#EADFD3] flex items-center justify-end gap-3">
        <button
          type="button"
          @click="emit('close')"
          :disabled="loading"
          class="h-11 px-5 rounded-lg border border-[#D6C5B8] bg-white text-[#6B5048] font-semibold text-sm hover:bg-[#FBF7F2] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="submitRefund"
          :disabled="!canSubmit"
          class="h-11 px-6 rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-sm flex items-center gap-2"
        >
          <Icon v-if="loading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else name="heroicons:arrow-uturn-left" class="w-4 h-4" />
          Confirm Refund
        </button>
      </div>

    </div>
  </div>
</template>
