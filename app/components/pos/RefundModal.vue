<script setup lang="ts">
// Refund a whole sale. Left side is the cashier's part (what, made or not, why);
// right side is handed to the manager, who approves with their PIN.
import type { PosTransactionDetail } from '~/services/PosService'

interface ApprovingManager {
  uuid: string
  name: string
  role: string
  has_pin: boolean
  is_locked: boolean
}

const props = defineProps<{
  show: boolean
  transaction: PosTransactionDetail
}>()

const emit = defineEmits<{
  close: []
  refunded: [transaction: any]
}>()

const devicePosService = useDevicePosService()

const PIN_LENGTH = 6

const managers = ref<ApprovingManager[]>([])
const selectedManagerUuid = ref<string>('')
const pin = ref('')
const reason = ref('')
// Made orders can't be sold again: their servings count as refunded. Not made: back on sale.
const wasMade = ref(true)
const selectedReasonChip = ref('')
const loading = ref(false)
const loadingManagers = ref(false)
const managersError = ref('')
const errorMessage = ref('')
const attemptsLeft = ref<number | null>(null)
const successMessage = ref('')
// Bumped on each rejected PIN so the boxes replay their shake.
const rejectCount = ref(0)

const quickReasons = [
  'Wrong Item Charged',
  'Quality / Spoilage Issue',
  'Duplicate Charge',
]

const madeOptions = [
  { value: true, title: 'Yes, it was made', hint: 'Servings stay used up' },
  { value: false, title: 'No, not made yet', hint: 'Servings go back on sale' },
]

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
function formatCurrency(amount: number) {
  return money.format(amount || 0)
}

const formattedReceipt = computed(() => {
  const num = props.transaction.receipt_number || props.transaction.uuid
  return /^\d+$/.test(num) ? `#${num}` : num
})

const items = computed(() => props.transaction.items ?? [])
const itemCount = computed(() => items.value.reduce((n, i) => n + i.quantity, 0))

const paymentLabels: Record<string, string> = { cash: 'Cash', card: 'Card', ewallet: 'E-Wallet' }
const paymentLabel = computed(() => {
  const method = props.transaction.payment?.method
  return method ? (paymentLabels[method] ?? method) : 'Payment not recorded'
})

function lineDetails(item: PosTransactionDetail['items'][number]) {
  const parts = item.size_name ? [item.size_name] : []
  for (const a of item.addons ?? []) parts.push(a.quantity > 1 ? `${a.quantity}x ${a.name}` : a.name)
  return parts.join(' · ')
}

const selectedManager = computed(() => managers.value.find(m => m.uuid === selectedManagerUuid.value))
const busy = computed(() => loading.value || !!successMessage.value)

const effectiveReason = computed(() => {
  if (selectedReasonChip.value && reason.value) {
    return `${selectedReasonChip.value} - ${reason.value}`
  }
  return selectedReasonChip.value || reason.value || 'Customer refund'
})

async function fetchManagers() {
  loadingManagers.value = true
  managersError.value = ''
  try {
    const res = await devicePosService.getApprovingManagers()
    if (res.success && res.managers) {
      managers.value = res.managers
      const valid = res.managers.find(m => m.has_pin && !m.is_locked)
      selectedManagerUuid.value = valid?.uuid ?? ''
    }
  } catch (err: any) {
    managersError.value = err?.data?.message || 'Could not load managers for this branch.'
  } finally {
    loadingManagers.value = false
  }
}

watch(() => props.show, (val) => {
  if (val) {
    pin.value = ''
    reason.value = ''
    selectedReasonChip.value = ''
    wasMade.value = true
    errorMessage.value = ''
    attemptsLeft.value = null
    successMessage.value = ''
    fetchManagers()
  }
})

let closeTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  if (props.show) fetchManagers()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  clearTimeout(closeTimer)
})

function close() {
  if (loading.value) return
  emit('close')
}

function handleChipClick(chip: string) {
  selectedReasonChip.value = selectedReasonChip.value === chip ? '' : chip
}

function handleNumpad(digit: string) {
  if (busy.value) return
  if (pin.value.length < PIN_LENGTH) {
    pin.value += digit
    errorMessage.value = ''
  }
}

function handleBackspace() {
  if (busy.value) return
  if (pin.value.length > 0) {
    pin.value = pin.value.slice(0, -1)
    errorMessage.value = ''
  }
}

function clearPin() {
  if (busy.value) return
  pin.value = ''
  errorMessage.value = ''
}

function handleKeyDown(e: KeyboardEvent) {
  if (!props.show || busy.value) return

  // Don't intercept if user is typing in the reason text input
  if (e.target instanceof HTMLInputElement && e.target.type === 'text') {
    if (e.key === 'Escape') close()
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
    close()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (canSubmit.value) submitRefund()
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

// What the confirm button needs before it can be pressed, said plainly.
const submitHint = computed(() => {
  if (successMessage.value) return ''
  if (!selectedManagerUuid.value) return 'Pick a manager to approve'
  if (pin.value.length < 4) return 'Enter PIN to refund'
  return ''
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
      effectiveReason.value,
      !wasMade.value
    )

    if (res.success) {
      successMessage.value = res.message || 'Refund processed.'
      closeTimer = setTimeout(() => {
        emit('refunded', res.transaction)
        emit('close')
      }, 1200)
    } else {
      errorMessage.value = res.message || 'Refund was not approved.'
      pin.value = ''
      rejectCount.value++
    }
  } catch (err: any) {
    const data = err?.data
    errorMessage.value = data?.message || 'Incorrect PIN, or this manager cannot approve refunds.'
    if (data?.attempts_left != null) {
      attemptsLeft.value = data.attempts_left
    }
    pin.value = ''
    rejectCount.value++
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    v-if="show"
    class="refund-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2d201b]/55"
    role="dialog"
    aria-modal="true"
    aria-labelledby="refund-modal-title"
  >
    <div class="refund-sheet relative w-full max-w-[60rem] max-h-[94vh] flex flex-col bg-white rounded-2xl overflow-hidden">

      <!-- Header: which sale, how much goes back -->
      <header class="shrink-0 flex items-center gap-4 pl-6 pr-3 py-4 border-b border-[#EADFD3]">
        <div class="min-w-0 flex-1">
          <h3 id="refund-modal-title" class="font-display text-xl font-semibold text-[#2d201b] leading-tight">
            Refund sale {{ formattedReceipt }}
          </h3>
          <p class="text-sm text-[#6B5048] mt-0.5 truncate">
            Rung up by {{ transaction.staff_name }} &middot; {{ paymentLabel }}
          </p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-xs font-semibold text-[#8A6E64]">Back to customer</p>
          <p class="font-display text-[1.75rem] leading-none font-semibold tabular-nums tracking-tight text-[#2d201b]">
            {{ formatCurrency(transaction.total_amount) }}
          </p>
        </div>
        <button
          type="button"
          @click="close"
          :disabled="loading"
          class="ml-1 w-11 h-11 shrink-0 rounded-full text-[#8A6E64] hover:text-[#2d201b] hover:bg-[#F3EBE2] disabled:opacity-40 flex items-center justify-center transition-colors"
          aria-label="Cancel refund"
        >
          <Icon name="heroicons:x-mark" class="w-6 h-6" />
        </button>
      </header>

      <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_23rem] md:grid-rows-1 overflow-y-auto md:overflow-hidden">

        <!-- Cashier side -->
        <div class="space-y-5 px-5 sm:px-6 py-5 md:space-y-0 md:min-h-0 md:flex md:flex-col md:gap-5 md:overflow-y-auto refund-scroll">

          <section aria-labelledby="refund-items-heading" class="md:min-h-0 md:flex-1 flex flex-col">
            <div class="flex items-baseline justify-between mb-1">
              <h4 id="refund-items-heading" class="text-sm font-semibold text-[#2d201b]">What's being refunded</h4>
              <span class="text-sm text-[#8A6E64] tabular-nums">{{ itemCount }} {{ itemCount === 1 ? 'item' : 'items' }}</span>
            </div>
            <p v-if="!items.length" class="py-3 text-sm text-[#6B5048]">No items were recorded on this sale.</p>
            <ul v-else class="divide-y divide-[#F3EBE2] max-h-52 md:max-h-none md:flex-1 md:min-h-0 overflow-y-auto refund-scroll -mr-2 pr-2">
              <li v-for="item in items" :key="item.uuid" class="py-2.5 grid grid-cols-[2rem_1fr_auto] gap-x-3 items-start">
                <span class="text-sm font-semibold text-[#7B5A50] tabular-nums">{{ item.quantity }}&times;</span>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-[#2d201b] leading-snug break-words">{{ item.menu_name }}</p>
                  <p v-if="lineDetails(item)" class="text-xs text-[#6B5048] leading-snug break-words">{{ lineDetails(item) }}</p>
                </div>
                <span class="text-sm font-semibold text-[#2d201b] tabular-nums text-right">{{ formatCurrency(item.line_total) }}</span>
              </li>
            </ul>
            <dl v-if="transaction.discount_amount > 0" class="pt-2 mt-1 border-t border-[#EADFD3] space-y-1 text-sm tabular-nums">
              <div class="flex justify-between text-[#6B5048]">
                <dt>Subtotal</dt>
                <dd>{{ formatCurrency(transaction.subtotal) }}</dd>
              </div>
              <div class="flex justify-between text-red-800">
                <dt>Discount<template v-if="transaction.discount_type"> ({{ transaction.discount_type }})</template></dt>
                <dd>&minus; {{ formatCurrency(transaction.discount_amount) }}</dd>
              </div>
            </dl>
          </section>

          <fieldset :disabled="busy">
            <legend class="text-sm font-semibold text-[#2d201b] mb-2">Was the order already made?</legend>
            <div class="grid grid-cols-2 gap-2">
              <label
                v-for="opt in madeOptions"
                :key="String(opt.value)"
                class="choice relative flex flex-col justify-center min-h-16 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors"
                :class="wasMade === opt.value
                  ? 'border-[#7B5A50] bg-[#7B5A50]/[0.07] shadow-[inset_0_0_0_1px_#7B5A50]'
                  : 'border-[#EADFD3] bg-white hover:bg-[#FBF7F2]'"
              >
                <input v-model="wasMade" type="radio" name="was-made" :value="opt.value" class="sr-only" />
                <span class="text-sm font-semibold text-[#2d201b]">{{ opt.title }}</span>
                <span class="text-xs text-[#6B5048]">{{ opt.hint }}</span>
                <Icon
                  v-if="wasMade === opt.value"
                  name="heroicons:check-circle-solid"
                  class="absolute top-2 right-2 w-5 h-5 text-[#7B5A50]"
                  aria-hidden="true"
                />
              </label>
            </div>
          </fieldset>

          <fieldset :disabled="busy">
            <legend class="text-sm font-semibold text-[#2d201b] mb-2">
              Reason <span class="font-normal text-[#8A6E64]">(optional)</span>
            </legend>
            <div class="flex flex-wrap gap-2 mb-2">
              <button
                v-for="chip in quickReasons"
                :key="chip"
                type="button"
                @click="handleChipClick(chip)"
                :aria-pressed="selectedReasonChip === chip"
                class="min-h-11 px-4 rounded-full text-sm font-medium border transition-colors"
                :class="selectedReasonChip === chip
                  ? 'bg-[#7B5A50] text-white border-[#7B5A50]'
                  : 'bg-white text-[#6B5048] border-[#D6C5B8] hover:bg-[#FBF7F2]'"
              >
                {{ chip }}
              </button>
            </div>
            <label for="refund-note" class="sr-only">Refund note</label>
            <input
              id="refund-note"
              v-model="reason"
              type="text"
              maxlength="200"
              placeholder="Add a note for the record"
              class="w-full h-11 px-3.5 rounded-lg border border-[#D6C5B8] bg-white text-sm text-[#2d201b] placeholder:text-[#8A6E64] focus:outline-none focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/25 disabled:bg-[#FBF7F2]"
            />
          </fieldset>
        </div>

        <!-- Manager side -->
        <section
          aria-labelledby="refund-approval-heading"
          class="md:min-h-0 flex flex-col bg-[#FBF7F2] border-t md:border-t-0 md:border-l border-[#EADFD3] px-5 py-4 md:overflow-y-auto refund-scroll"
        >
          <h4 id="refund-approval-heading" class="font-display text-lg font-semibold text-[#2d201b] leading-tight">Manager approval</h4>

          <!-- Who approves -->
          <div class="mt-3">
            <div v-if="loadingManagers" class="flex gap-2" aria-busy="true" aria-label="Loading managers">
              <div class="h-14 flex-1 rounded-xl bg-[#F3EBE2] animate-pulse" />
              <div class="h-14 flex-1 rounded-xl bg-[#F3EBE2] animate-pulse" />
            </div>
            <div v-else-if="managersError" class="flex items-center justify-between gap-3 text-sm text-red-800">
              <span>{{ managersError }}</span>
              <button type="button" @click="fetchManagers" class="min-h-11 px-3 shrink-0 rounded-lg border border-[#D6C5B8] bg-white font-semibold text-[#2d201b] hover:bg-[#F3EBE2]">Retry</button>
            </div>
            <p v-else-if="!managers.length" class="text-sm text-[#6B5048]">
              No one at this branch can approve refunds yet. An owner can give a staff member the manager role and a PIN.
            </p>
            <fieldset v-else :disabled="busy">
              <legend class="sr-only">Approving manager</legend>
              <div class="flex flex-wrap gap-2 max-h-[7.5rem] overflow-y-auto refund-scroll">
                <label
                  v-for="m in managers"
                  :key="m.uuid"
                  class="choice flex-1 basis-[9.5rem] min-h-14 flex flex-col justify-center px-3.5 py-2 rounded-xl border transition-colors"
                  :class="[
                    selectedManagerUuid === m.uuid
                      ? 'border-[#7B5A50] bg-white shadow-[inset_0_0_0_1px_#7B5A50]'
                      : 'border-[#E2D5C8] bg-white/60 hover:bg-white',
                    (!m.has_pin || m.is_locked) ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
                  ]"
                >
                  <input
                    v-model="selectedManagerUuid"
                    type="radio"
                    name="manager"
                    :value="m.uuid"
                    :disabled="!m.has_pin || m.is_locked"
                    class="sr-only"
                    @change="clearPin"
                  />
                  <span class="text-sm font-semibold text-[#2d201b] truncate">{{ m.name }}</span>
                  <span class="text-xs truncate" :class="!m.has_pin ? 'text-amber-800' : m.is_locked ? 'text-red-800' : 'text-[#6B5048]'">
                    {{ !m.has_pin ? 'No PIN set' : m.is_locked ? 'PIN locked' : m.role }}
                  </span>
                </label>
              </div>
            </fieldset>
          </div>

          <!-- PIN -->
          <div class="mt-4">
            <p id="refund-pin-label" class="sr-only">
              <template v-if="selectedManager">{{ selectedManager.name }}'s PIN</template>
              <template v-else>Manager PIN</template>
            </p>
            <div
              :key="rejectCount"
              class="flex justify-center gap-2"
              :class="{ 'pin-reject': rejectCount > 0 }"
              role="img"
              :aria-label="`${pin.length} of ${PIN_LENGTH} digits entered`"
            >
              <span
                v-for="i in PIN_LENGTH"
                :key="i"
                class="w-10 h-12 rounded-lg border-2 flex items-center justify-center transition-colors duration-150"
                :class="pin.length >= i
                  ? 'border-[#7B5A50] bg-white'
                  : pin.length + 1 === i && !busy
                    ? 'border-[#7B5A50]/50 bg-white'
                    : 'border-[#E2D5C8] bg-white/60'"
              >
                <span v-if="pin.length >= i" class="w-3 h-3 rounded-full bg-[#2d201b]" />
              </span>
            </div>

            <div class="min-h-9 mt-2 text-center text-sm" aria-live="polite">
              <p v-if="successMessage" class="font-semibold text-emerald-800 inline-flex items-center gap-1.5">
                <Icon name="heroicons:check-circle-solid" class="w-5 h-5" /> {{ successMessage }}
              </p>
              <template v-else-if="errorMessage">
                <p class="font-semibold text-red-800">{{ errorMessage }}</p>
                <p v-if="attemptsLeft != null && attemptsLeft > 0" class="text-xs text-red-800">
                  {{ attemptsLeft }} {{ attemptsLeft === 1 ? 'try' : 'tries' }} left before this PIN locks
                </p>
              </template>
            </div>
          </div>

          <!-- Keypad -->
          <div class="grid grid-cols-3 gap-2" aria-labelledby="refund-pin-label">
            <button
              v-for="n in ['1','2','3','4','5','6','7','8','9']"
              :key="n"
              type="button"
              @click="handleNumpad(n)"
              :disabled="busy"
              class="key h-14 rounded-xl bg-white border border-[#E2D5C8] text-xl font-semibold text-[#2d201b] tabular-nums"
            >
              {{ n }}
            </button>
            <button
              type="button"
              @click="clearPin"
              :disabled="busy || !pin.length"
              class="key h-14 rounded-xl text-sm font-semibold text-[#6B5048]"
            >
              Clear
            </button>
            <button
              type="button"
              @click="handleNumpad('0')"
              :disabled="busy"
              class="key h-14 rounded-xl bg-white border border-[#E2D5C8] text-xl font-semibold text-[#2d201b] tabular-nums"
            >
              0
            </button>
            <button
              type="button"
              @click="handleBackspace"
              :disabled="busy || !pin.length"
              aria-label="Delete last digit"
              class="key h-14 rounded-xl flex items-center justify-center text-[#6B5048]"
            >
              <Icon name="heroicons:backspace" class="w-6 h-6" />
            </button>
          </div>

          <!-- Confirm -->
          <div class="mt-auto pt-4">
            <button
              type="button"
              @click="submitRefund"
              :disabled="!canSubmit"
              class="w-full h-14 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors"
              :class="successMessage
                ? 'bg-emerald-700 text-white'
                : 'bg-red-700 hover:bg-red-800 text-white disabled:bg-[#E2D5C8] disabled:text-[#6B5048] disabled:cursor-not-allowed'"
            >
              <Icon v-if="loading" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
              <Icon v-else-if="successMessage" name="heroicons:check" class="w-5 h-5" />
              <template v-if="successMessage">Refunded</template>
              <template v-else-if="loading">Processing refund</template>
              <template v-else-if="submitHint">{{ submitHint }}</template>
              <template v-else>Refund {{ formatCurrency(transaction.total_amount) }}</template>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.refund-backdrop {
  animation: refund-fade 180ms ease-out;
}
.refund-sheet {
  box-shadow: 0 24px 60px -12px rgb(45 32 27 / 0.35), 0 4px 12px -4px rgb(45 32 27 / 0.12);
  animation: refund-rise 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes refund-fade {
  from { opacity: 0; }
}
@keyframes refund-rise {
  from { transform: translateY(12px) scale(0.985); opacity: 0; }
}

.key {
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 120ms, transform 80ms;
}
.key:not(:disabled):hover { background-color: #F3EBE2; }
.key:not(:disabled):active { background-color: #EADFD3; transform: scale(0.96); }
.key:disabled { opacity: 0.45; }

/* Wrong PIN: the boxes shake once, like a lock refusing the key. */
.pin-reject {
  animation: pin-shake 360ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
@keyframes pin-shake {
  15%, 85% { transform: translateX(-2px); }
  30%, 70% { transform: translateX(5px); }
  45% { transform: translateX(-7px); }
  60% { transform: translateX(7px); }
}

button:focus-visible,
.choice:has(input:focus-visible) {
  outline: 2px solid #7B5A50;
  outline-offset: 2px;
}

.refund-scroll {
  scrollbar-width: thin;
  scrollbar-color: #D6C5B8 transparent;
}

@media (prefers-reduced-motion: reduce) {
  .refund-backdrop,
  .refund-sheet,
  .pin-reject { animation: none; }
  .key:not(:disabled):active { transform: none; }
}
</style>
