<script setup lang="ts">
// One sale opened from Today's sales: what was ordered, how it was paid, and who rang it up.
import type { PosTransactionDetail } from '~/services/PosService'

const props = defineProps<{
  transactionUuid: string
  // The row that was tapped, so the header reads right while the details load.
  preview: { created_at: string; staff_name: string; total_amount: number; status: string }
  branchName?: string
}>()

const emit = defineEmits<{
  back: []
  refunded: [transaction: any]
}>()

const showRefundModal = ref(false)
const showReceiptModal = ref(false)

function onRefundSuccess(updated: any) {
  if (updated) {
    detail.value = updated
  } else if (detail.value) {
    detail.value.status = 'refunded'
  }
  emit('refunded', detail.value)
}

const devicePosService = useDevicePosService()
const detail = ref<PosTransactionDetail | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await devicePosService.getTransaction(props.transactionUuid)
    if (res.success) detail.value = res.transaction
    else error.value = 'This sale could not be loaded.'
  } catch (e: any) {
    const status = e?.response?.status ?? e?.status
    error.value = status === 404
      ? 'This sale was not found at this branch.'
      : navigator.onLine ? 'This sale could not be loaded.' : 'No internet connection.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const backButton = ref<HTMLButtonElement | null>(null)
onMounted(() => backButton.value?.focus())

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
function formatCurrency(amount: number) {
  return money.format(amount || 0)
}

const createdAt = computed(() => new Date(detail.value?.created_at ?? props.preview.created_at))
const timeLabel = computed(() => createdAt.value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
const dateLabel = computed(() => createdAt.value.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }))

const status = computed(() => detail.value?.status ?? props.preview.status)
const isSettled = computed(() => ['completed', 'paid'].includes(status.value?.toLowerCase()))
const itemCount = computed(() => detail.value?.items.reduce((n, i) => n + i.quantity, 0) ?? 0)

const paymentLabels: Record<string, string> = { cash: 'Cash', card: 'Card', ewallet: 'E-Wallet' }
const paymentLabel = computed(() => {
  const method = detail.value?.payment?.method
  return method ? (paymentLabels[method] ?? method) : 'Not recorded'
})

function lineDetails(item: PosTransactionDetail['items'][number]) {
  const parts = item.size_name ? [item.size_name] : []
  for (const a of item.addons) parts.push(a.quantity > 1 ? `${a.quantity}x ${a.name}` : a.name)
  return parts.join(' · ')
}

const copied = ref(false)
let copiedTimer: any
async function copyId() {
  try {
    await navigator.clipboard.writeText(props.transactionUuid)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 1800)
  } catch {
    // Clipboard blocked (non-secure origin); the ID is still selectable on screen.
  }
}
onUnmounted(() => clearTimeout(copiedTimer))
</script>

<template>
  <div class="txn-detail absolute inset-0 z-20 bg-white flex flex-col" role="region" aria-labelledby="txn-detail-title">
    <!-- Back + sale headline -->
    <div class="px-5 pt-2 pb-4 border-b border-[#EADFD3] shrink-0">
      <button
        ref="backButton"
        @click="emit('back')"
        class="min-h-11 -ml-2 pl-1 pr-3 inline-flex items-center gap-1 rounded-md text-sm font-semibold text-[#7B5A50] hover:bg-[#7B5A50]/10 transition-colors"
      >
        <Icon name="heroicons:chevron-left" class="w-5 h-5" /> All sales
      </button>
      <div class="flex items-end justify-between gap-4 mt-1">
        <div class="min-w-0">
          <h3 id="txn-detail-title" class="font-display text-xl font-semibold text-[#2d201b] leading-tight">Sale at {{ timeLabel }}</h3>
          <p class="text-sm text-[#6B5048] mt-0.5 truncate">
            {{ detail?.staff_name ?? preview.staff_name }}<template v-if="detail"> &middot; {{ itemCount }} {{ itemCount === 1 ? 'item' : 'items' }}</template>
          </p>
        </div>
        <div class="text-right shrink-0">
          <span v-if="status?.toLowerCase() === 'refunded'" class="inline-block mb-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">REFUNDED</span>
          <span v-else-if="!isSettled" class="inline-block mb-1 text-[11px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-800 border border-red-200">{{ status }}</span>
          <p class="font-display text-[1.75rem] leading-none font-semibold tabular-nums tracking-tight" :class="isSettled ? 'text-[#7B5A50]' : 'text-[#8A6E64] line-through'">
            {{ formatCurrency(detail?.total_amount ?? preview.total_amount) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 px-5 py-5 space-y-4" aria-busy="true" aria-label="Loading sale details">
      <div v-for="i in 3" :key="i" class="flex justify-between">
        <div class="space-y-2">
          <div class="h-4 w-44 rounded bg-[#F3EBE2] animate-pulse" />
          <div class="h-3 w-28 rounded bg-[#F7F1EA] animate-pulse" />
        </div>
        <div class="h-4 w-16 rounded bg-[#F3EBE2] animate-pulse" />
      </div>
      <div class="h-24 rounded bg-[#F7F1EA] animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="error" role="alert" class="flex-1 flex flex-col items-center justify-center text-center px-8">
      <p class="text-base font-semibold text-[#2d201b]">{{ error }}</p>
      <div class="mt-4 flex gap-3">
        <button @click="emit('back')" class="min-h-11 px-4 rounded-md border border-[#D6C5B8] text-[#2d201b] font-semibold hover:bg-[#FBF7F2] transition-colors">All sales</button>
        <button @click="load" class="min-h-11 px-5 bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md transition-colors">Try again</button>
      </div>
    </div>

    <div v-else-if="detail" class="flex-1 overflow-y-auto overscroll-contain min-h-0 txn-detail-scroll">
      <!-- Order -->
      <section class="px-5 pt-4" aria-labelledby="txn-order-heading">
        <h4 id="txn-order-heading" class="text-xs font-semibold text-[#8A6E64] uppercase tracking-wide mb-1">Order</h4>
        <p v-if="!detail.items.length" class="py-3 text-sm text-[#6B5048]">No items were recorded on this sale.</p>
        <ul v-else class="divide-y divide-[#F3EBE2]">
          <li v-for="item in detail.items" :key="item.uuid" class="py-3 grid grid-cols-[2rem_1fr_auto] gap-x-3 items-start">
            <span class="text-base font-semibold text-[#7B5A50] tabular-nums">{{ item.quantity }}&times;</span>
            <div class="min-w-0">
              <p class="text-base font-semibold text-[#2d201b] leading-snug break-words">{{ item.menu_name }}</p>
              <p v-if="lineDetails(item)" class="text-sm text-[#6B5048] leading-snug break-words">{{ lineDetails(item) }}</p>
              <p v-if="item.quantity > 1" class="text-sm text-[#8A6E64] tabular-nums">{{ formatCurrency(item.unit_price) }} each</p>
            </div>
            <span class="text-base font-semibold text-[#2d201b] tabular-nums text-right">{{ formatCurrency(item.line_total) }}</span>
          </li>
        </ul>
      </section>

      <!-- Totals -->
      <dl class="mx-5 mt-1 py-3 border-t border-[#EADFD3] space-y-1.5 text-sm tabular-nums">
        <div class="flex justify-between text-[#6B5048]">
          <dt>Subtotal</dt>
          <dd>{{ formatCurrency(detail.subtotal) }}</dd>
        </div>
        <div v-if="detail.discount_amount > 0" class="flex justify-between text-red-800">
          <dt>Discount<template v-if="detail.discount_type"> ({{ detail.discount_type }})</template></dt>
          <dd>&minus; {{ formatCurrency(detail.discount_amount) }}</dd>
        </div>
        <div class="flex justify-between items-baseline pt-1.5 text-base font-semibold text-[#2d201b]">
          <dt>Total</dt>
          <dd>{{ formatCurrency(detail.total_amount) }}</dd>
        </div>
      </dl>

      <!-- Payment -->
      <section class="mx-5 mt-2 py-3 border-t border-[#EADFD3]" aria-labelledby="txn-payment-heading">
        <h4 id="txn-payment-heading" class="text-xs font-semibold text-[#8A6E64] uppercase tracking-wide mb-2">Payment</h4>
        <dl class="space-y-1.5 text-sm tabular-nums">
          <div class="flex justify-between">
            <dt class="text-[#6B5048]">Method</dt>
            <dd class="font-semibold text-[#2d201b]">{{ paymentLabel }}</dd>
          </div>
          <template v-if="detail.payment">
            <div v-if="detail.payment.reference_number" class="flex justify-between gap-4">
              <dt class="text-[#6B5048] shrink-0">Reference no.</dt>
              <dd class="font-semibold text-[#2d201b] break-all text-right">{{ detail.payment.reference_number }}</dd>
            </div>
            <template v-if="detail.payment.method === 'cash'">
              <div class="flex justify-between">
                <dt class="text-[#6B5048]">Cash received</dt>
                <dd class="text-[#2d201b]">{{ formatCurrency(detail.payment.amount_tendered) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-[#6B5048]">Change</dt>
                <dd class="font-semibold text-emerald-800">{{ formatCurrency(detail.payment.change) }}</dd>
              </div>
            </template>
          </template>
        </dl>
      </section>

      <!-- Record -->
      <section class="mx-5 mt-2 mb-5 py-3 border-t border-[#EADFD3]" aria-labelledby="txn-record-heading">
        <h4 id="txn-record-heading" class="text-xs font-semibold text-[#8A6E64] uppercase tracking-wide mb-2">Record</h4>
        <dl class="space-y-1.5 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-[#6B5048] shrink-0">Date</dt>
            <dd class="text-[#2d201b] text-right">{{ dateLabel }}, {{ timeLabel }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-[#6B5048] shrink-0">Cashier</dt>
            <dd class="text-[#2d201b] text-right">{{ detail.staff_name }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-[#6B5048] shrink-0">Receipt no.</dt>
            <dd class="text-[#2d201b] tabular-nums text-right">{{ detail.receipt_number }}</dd>
          </div>
          <div class="pt-1">
            <dt class="text-[#6B5048]">Transaction ID</dt>
            <dd class="mt-1 flex items-center gap-2">
              <span class="flex-1 min-w-0 text-[13px] font-semibold text-[#2d201b] tabular-nums break-all select-all">{{ detail.uuid }}</span>
              <button
                @click="copyId"
                :aria-label="copied ? 'Transaction ID copied' : 'Copy transaction ID'"
                class="min-h-11 px-3 shrink-0 inline-flex items-center gap-1.5 rounded-md border border-[#D6C5B8] text-sm font-semibold text-[#2d201b] hover:bg-[#FBF7F2] transition-colors"
              >
                <Icon :name="copied ? 'heroicons:check' : 'heroicons:clipboard-document'" class="w-4 h-4" :class="{ 'text-emerald-700': copied }" />
                {{ copied ? 'Copied' : 'Copy' }}
              </button>
            </dd>
          </div>
        </dl>
      </section>

      <!-- Actions: View Receipt & Refund Buttons -->
      <section v-if="detail" class="mx-5 mt-2 mb-6 pt-3 border-t border-[#EADFD3] space-y-2.5">
        <button
          type="button"
          @click="showReceiptModal = true"
          class="w-full h-12 rounded-lg bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 focus:ring-2 focus:ring-[#7B5A50]/30 active:scale-[0.99]"
        >
          <Icon name="heroicons:receipt-percent" class="w-5 h-5" />
          View Receipt
        </button>

        <button
          v-if="isSettled"
          type="button"
          @click="showRefundModal = true"
          class="w-full h-11 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-sm transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-red-600/30 active:scale-[0.99]"
        >
          <Icon name="heroicons:arrow-uturn-left" class="w-4 h-4" />
          Refund Sale (Requires Manager PIN)
        </button>
      </section>

      <section v-if="detail && status?.toLowerCase() === 'refunded'" class="mx-5 mt-0 mb-6 p-3.5 rounded-lg bg-amber-50 border border-amber-200">
        <div class="flex items-start gap-2.5">
          <Icon name="heroicons:information-circle" class="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p class="text-xs font-bold text-amber-900 uppercase tracking-wide">Sale Refunded</p>
            <p v-if="detail.walk_in_note" class="text-xs text-amber-800 mt-0.5 break-words">{{ detail.walk_in_note }}</p>
            <p v-else class="text-xs text-amber-800 mt-0.5">This transaction has been refunded by a manager. Serving quantities were restored to inventory.</p>
          </div>
        </div>
      </section>
    </div>

    <!-- Receipt View Modal -->
    <PosReceiptModal
      v-if="showReceiptModal && detail"
      :show="showReceiptModal"
      :transaction="detail"
      :branch-name="props.branchName"
      @close="showReceiptModal = false"
    />

    <!-- Refund Authorization Modal -->
    <PosRefundModal
      v-if="showRefundModal && detail"
      :show="showRefundModal"
      :transaction="detail"
      @close="showRefundModal = false"
      @refunded="onRefundSuccess"
    />
  </div>
</template>

<style scoped>
button:focus-visible {
  outline: 2px solid #7B5A50;
  outline-offset: 2px;
}
.txn-detail {
  animation: txn-detail-in 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes txn-detail-in {
  from { transform: translateX(16px); opacity: 0; }
  to { transform: none; opacity: 1; }
}
.txn-detail-scroll {
  scrollbar-width: thin;
  scrollbar-color: #D6C5B8 transparent;
}
@media (prefers-reduced-motion: reduce) {
  .txn-detail { animation: none; }
}
</style>
