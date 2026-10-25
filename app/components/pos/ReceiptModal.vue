<!-- app/components/pos/ReceiptModal.vue -->
<script setup lang="ts">
import type { PosTransactionDetail } from '~/services/PosService'
import { useReceiptDownload, type ReceiptDownloadData } from '~/composables/useReceiptDownload'

const props = defineProps<{
  show: boolean
  transaction?: PosTransactionDetail | null
  order?: any | null
  cafeName?: string
  branchName?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { isDownloading, downloadReceiptImage, downloadReceiptText, formatCurrency, formatDate } = useReceiptDownload()
const downloadedSuccess = ref(false)
let successTimer: any

const receiptData = computed<ReceiptDownloadData>(() => {
  if (props.transaction) {
    const t = props.transaction
    return {
      receiptNumber: t.receipt_number || '000000',
      transactionUuid: t.uuid,
      date: t.created_at,
      cashier: t.staff_name || 'Admin',
      cafeName: t.cafe_name || props.cafeName || 'BrewSpot Cafe',
      branchName: t.branch_name || props.branchName || 'Main Branch',
      branchAddress: t.branch_address ?? null,
      items: (t.items || []).map(i => ({
        name: i.menu_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        lineTotal: i.line_total,
        sizeName: i.size_name,
        addons: i.addons,
      })),
      subtotal: t.subtotal,
      discountType: t.discount_type,
      discountAmount: t.discount_amount,
      total: t.total_amount,
      paymentMethod: t.payment?.method ?? 'Cash',
      amountTendered: t.payment?.amount_tendered,
      change: t.payment?.change,
      referenceNumber: t.payment?.reference_number,
      walkInNote: t.walk_in_note,
      status: t.status,
    }
  }

  if (props.order) {
    const o = props.order
    return {
      receiptNumber: o.receiptNumber || '000000',
      date: o.date || new Date(),
      cashier: o.staff || 'Admin',
      cafeName: props.cafeName || 'BrewSpot Cafe',
      branchName: props.branchName || 'Main Branch',
      items: (o.items || []).map((i: any) => ({
        name: i.menu_name,
        quantity: i.quantity,
        unitPrice: i.price,
        lineTotal: (i.price || 0) * (i.quantity || 1),
        sizeName: i.size_name,
        addons: i.addons,
      })),
      subtotal: o.subtotal || o.baseItemsTotal || 0,
      discountType: o.discountType !== 'none' ? o.discountType : null,
      discountAmount: o.discountAmount || 0,
      total: o.total,
      paymentMethod: o.paymentMethod ?? 'Cash',
      amountTendered: o.amountTendered,
      change: o.change,
      referenceNumber: o.referenceNumber,
      walkInNote: o.walkInNote,
      status: 'completed',
    }
  }

  return {
    receiptNumber: '000000',
    date: new Date(),
    cashier: 'Staff',
    items: [],
    subtotal: 0,
    total: 0,
  }
})

async function handleDownloadImage() {
  const success = await downloadReceiptImage(receiptData.value)
  if (success) {
    downloadedSuccess.value = true
    clearTimeout(successTimer)
    successTimer = setTimeout(() => { downloadedSuccess.value = false }, 2500)
  }
}

function handleDownloadText() {
  const success = downloadReceiptText(receiptData.value)
  if (success) {
    downloadedSuccess.value = true
    clearTimeout(successTimer)
    successTimer = setTimeout(() => { downloadedSuccess.value = false }, 2500)
  }
}

function handlePrint() {
  window.print()
}

onUnmounted(() => clearTimeout(successTimer))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-view-title"
    >
      <div
        class="receipt-dialog relative bg-white rounded-2xl shadow-2xl w-full max-w-[420px] flex flex-col max-h-[92vh] border border-[#EADFD3] overflow-hidden print:max-h-none print:border-none print:shadow-none print:w-full"
      >
        <!-- Modal Top Bar -->
        <header class="px-5 py-3.5 bg-[#FBF7F2] border-b border-[#EADFD3] flex items-center justify-between shrink-0 print:hidden">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-[#7D5A50]/10 text-[#7D5A50] flex items-center justify-center shrink-0">
              <Icon name="heroicons:receipt-percent" class="w-4 h-4" />
            </div>
            <div>
              <h3 id="receipt-view-title" class="font-display text-sm font-bold text-[#2D201B]">
                Receipt
              </h3>
              <p class="text-[11px] font-mono text-[#8A6E64]">
                #{{ receiptData.receiptNumber }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              @click="handlePrint"
              title="Print Receipt"
              aria-label="Print receipt"
              class="h-8 px-2.5 rounded-lg border border-[#D6C5B8] bg-white text-[#2D201B] hover:bg-[#F3EBE2] text-xs font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <Icon name="heroicons:printer" class="w-3.5 h-3.5 text-[#6B5048]" />
              <span class="hidden xs:inline">Print</span>
            </button>
            <button
              type="button"
              @click="emit('close')"
              aria-label="Close receipt view"
              class="w-8 h-8 rounded-full text-[#8A6E64] hover:text-[#2D201B] hover:bg-[#EADFD3]/50 flex items-center justify-center transition-colors"
            >
              <Icon name="heroicons:x-mark" class="w-5 h-5" />
            </button>
          </div>
        </header>

        <!-- Thermal Paper Slip Container -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#F5EFE6]/60 receipt-slip-scroll print:p-0 print:overflow-visible">
          <div class="receipt-paper relative bg-white rounded-xl border border-[#E2D5C8] p-5 shadow-sm space-y-4 print:border-none print:shadow-none print:p-2">
            <!-- Paper notch effect at top -->
            <div class="receipt-notch-top print:hidden"></div>

            <!-- Receipt Header -->
            <div class="text-center space-y-0.5">
              <div class="w-9 h-9 rounded-full bg-[#3B1F0E]/5 text-[#3B1F0E] mx-auto flex items-center justify-center mb-1">
                <Icon name="heroicons:sparkles" class="w-4 h-4 text-[#7B5A50]" />
              </div>
              <h2 class="font-display text-lg font-bold text-[#3B1F0E] uppercase tracking-wide">
                {{ receiptData.cafeName }}
              </h2>
              <p v-if="receiptData.branchName" class="text-xs font-medium text-[#6B5048]">
                {{ receiptData.branchName }}
              </p>
              <p v-if="receiptData.branchAddress" class="text-[11px] text-[#8A6E64]">
                {{ receiptData.branchAddress }}
              </p>
              <div class="pt-1">
                <span class="inline-block text-[10px] font-bold text-[#7B5A50] uppercase tracking-widest px-2 py-0.5 rounded bg-[#7B5A50]/10">
                  Official Receipt
                </span>
              </div>
            </div>

            <!-- Dashed separator -->
            <div class="border-b border-dashed border-[#A38F85]/50"></div>

            <!-- Receipt Meta -->
            <dl class="text-xs space-y-1 font-mono text-[#4A3B32]">
              <div class="flex justify-between">
                <dt class="text-[#8A6E64]">Receipt No:</dt>
                <dd class="font-bold text-[#2D201B]">#{{ receiptData.receiptNumber }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-[#8A6E64]">Date:</dt>
                <dd>{{ formatDate(receiptData.date) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-[#8A6E64]">Cashier:</dt>
                <dd class="font-medium">{{ receiptData.cashier }}</dd>
              </div>
              <div v-if="receiptData.status?.toLowerCase() === 'refunded'" class="flex justify-between text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                <dt>Status:</dt>
                <dd>REFUNDED</dd>
              </div>
            </dl>

            <!-- Dashed separator -->
            <div class="border-b border-dashed border-[#A38F85]/50"></div>

            <!-- Items -->
            <div>
              <div class="flex justify-between text-[11px] font-bold text-[#8A6E64] uppercase tracking-wider mb-2">
                <span>Item</span>
                <span>Amount</span>
              </div>

              <ul class="space-y-2 text-xs">
                <li v-for="(item, idx) in receiptData.items" :key="idx" class="space-y-0.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <span class="font-bold text-[#2D201B] tabular-nums">{{ item.quantity }}x </span>
                      <span class="font-semibold text-[#2D201B] break-words">{{ item.name }}</span>
                      <span v-if="item.sizeName" class="text-[#8A6E64] ml-1">({{ item.sizeName }})</span>
                    </div>
                    <span class="font-semibold text-[#2D201B] tabular-nums shrink-0">
                      {{ formatCurrency(item.lineTotal) }}
                    </span>
                  </div>

                  <!-- Add-ons -->
                  <div v-if="item.addons?.length" class="pl-4 text-[11px] text-[#7A6258] space-y-0.5">
                    <div v-for="a in item.addons" :key="a.name" class="flex justify-between">
                      <span>+ {{ a.quantity && a.quantity > 1 ? `${a.quantity}x ` : '' }}{{ a.name }}</span>
                      <span v-if="a.price" class="tabular-nums">+{{ formatCurrency(a.price * (a.quantity || 1)) }}</span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Dashed separator -->
            <div class="border-b border-dashed border-[#A38F85]/50"></div>

            <!-- Totals -->
            <dl class="text-xs space-y-1.5 tabular-nums">
              <div class="flex justify-between text-[#6B5048]">
                <dt>Subtotal</dt>
                <dd>{{ formatCurrency(receiptData.subtotal) }}</dd>
              </div>
              <div v-if="receiptData.discountAmount && receiptData.discountAmount > 0" class="flex justify-between text-red-700 font-medium">
                <dt>Discount <template v-if="receiptData.discountType">({{ receiptData.discountType }})</template></dt>
                <dd>- {{ formatCurrency(receiptData.discountAmount) }}</dd>
              </div>
              <div class="flex justify-between items-baseline pt-2 border-t border-[#2D201B] text-sm font-bold text-[#2D201B]">
                <dt class="font-display uppercase tracking-tight">Total</dt>
                <dd class="text-base text-[#3B1F0E] font-extrabold">{{ formatCurrency(receiptData.total) }}</dd>
              </div>
            </dl>

            <!-- Dashed separator -->
            <div class="border-b border-dashed border-[#A38F85]/50"></div>

            <!-- Payment -->
            <dl class="text-xs space-y-1 text-[#6B5048] tabular-nums">
              <div class="flex justify-between">
                <dt>Payment Method</dt>
                <dd class="font-bold text-[#2D201B] capitalize">{{ receiptData.paymentMethod }}</dd>
              </div>
              <template v-if="receiptData.paymentMethod?.toLowerCase() === 'cash'">
                <div v-if="receiptData.amountTendered" class="flex justify-between">
                  <dt>Cash Received</dt>
                  <dd class="text-[#2D201B]">{{ formatCurrency(receiptData.amountTendered) }}</dd>
                </div>
                <div v-if="receiptData.change !== null && receiptData.change !== undefined" class="flex justify-between">
                  <dt>Change</dt>
                  <dd class="font-bold text-emerald-800">{{ formatCurrency(receiptData.change) }}</dd>
                </div>
              </template>
              <div v-if="receiptData.referenceNumber" class="flex justify-between gap-3">
                <dt class="shrink-0">Reference No.</dt>
                <dd class="font-mono text-[#2D201B] break-all text-right">{{ receiptData.referenceNumber }}</dd>
              </div>
              <div v-if="receiptData.walkInNote" class="pt-1 italic text-[11px] text-[#8A6E64]">
                Note: {{ receiptData.walkInNote }}
              </div>
            </dl>

            <!-- Footer Message -->
            <div class="text-center pt-2 border-t border-dashed border-[#A38F85]/40 text-[11px] text-[#6B5048] space-y-0.5">
              <p class="font-semibold">Thank you for visiting!</p>
              <p class="text-[10px] text-[#8A6E64]">Please keep this receipt for your records.</p>
            </div>
          </div>
        </div>

        <!-- Modal Bottom Actions (Download & Print Options) -->
        <footer class="p-4 bg-white border-t border-[#EADFD3] space-y-2 shrink-0 print:hidden">
          <div v-if="downloadedSuccess" class="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5">
            <Icon name="heroicons:check-circle" class="w-4 h-4 text-emerald-600" />
            <span>Receipt downloaded successfully!</span>
          </div>

          <div class="flex gap-2">
            <!-- Main Download Option -->
            <button
              type="button"
              @click="handleDownloadImage"
              :disabled="isDownloading"
              class="flex-1 h-11 rounded-xl bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            >
              <Icon :name="isDownloading ? 'heroicons:arrow-path' : 'heroicons:arrow-down-tray'" class="w-4 h-4" :class="{ 'animate-spin': isDownloading }" />
              <span>{{ isDownloading ? 'Preparing...' : 'Download Receipt' }}</span>
            </button>

            <!-- Text file option -->
            <button
              type="button"
              @click="handleDownloadText"
              title="Download as Plain Text (.txt)"
              class="h-11 px-3.5 rounded-xl border border-[#D6C5B8] bg-white hover:bg-[#FBF7F2] text-[#2D201B] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Icon name="heroicons:document-text" class="w-4 h-4 text-[#7B5A50]" />
              <span class="hidden sm:inline">.TXT</span>
            </button>

            <!-- Close button -->
            <button
              type="button"
              @click="emit('close')"
              class="h-11 px-4 rounded-xl border border-[#D6C5B8] bg-white hover:bg-[#FBF7F2] text-[#6B5048] font-semibold text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.receipt-dialog {
  animation: receipt-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes receipt-in {
  from {
    transform: scale(0.96) translateY(8px);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
.receipt-paper {
  background-image: radial-gradient(#F5EFE6 0.75px, transparent 0.75px);
  background-size: 16px 16px;
}
.receipt-slip-scroll {
  scrollbar-width: thin;
  scrollbar-color: #D6C5B8 transparent;
}
@media print {
  body * {
    visibility: hidden;
  }
  .receipt-paper, .receipt-paper * {
    visibility: visible;
  }
  .receipt-paper {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm;
  }
}
</style>
