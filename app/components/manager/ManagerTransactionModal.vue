<!-- app/components/manager/ManagerTransactionModal.vue -->
<script setup lang="ts">
import type { ManagerTransactionDetail } from '~/services/ManagerDashboardService'
import type { OwnerTransactionDetail } from '~/services/OwnerAnalyticsService'
import { formatCount, formatMethod, formatPeso, formatPesoCents } from '~/utils/dashboardFormat'
import { variantLabel } from '~/utils/variant'

// The owner's transaction log passes its own loader (no branch needed) and gets the
// branch and refund details on top of the manager receipt.
type Detail = ManagerTransactionDetail & Partial<Pick<OwnerTransactionDetail, 'branch_name' | 'changed_at' | 'refund'>>

const props = defineProps<{
  show: boolean
  transactionUuid: string | null
  branchUuid?: string
  loader?: (uuid: string) => Promise<{ success: boolean; transaction: Detail }>
}>()

const emit = defineEmits<{
  close: []
}>()

const service = useManagerDashboardService()
const detail = ref<Detail | null>(null)
const loading = ref(false)
const error = ref('')
const copied = ref(false)
let copyTimer: any

async function loadDetail() {
  if (!props.transactionUuid || (!props.loader && !props.branchUuid)) return
  loading.value = true
  error.value = ''
  try {
    const res = props.loader
      ? await props.loader(props.transactionUuid)
      : await service.getTransaction(props.branchUuid!, props.transactionUuid)
    if (res.success) {
      detail.value = res.transaction
    } else {
      error.value = 'Failed to load transaction receipt.'
    }
  } catch (err: any) {
    error.value = err?.data?.message || 'Could not load transaction.'
  } finally {
    loading.value = false
  }
}

watch(() => props.transactionUuid, (val) => {
  if (val && props.show) {
    loadDetail()
  } else {
    detail.value = null
  }
}, { immediate: true })

async function copyReceipt() {
  if (!detail.value?.receipt_number) return
  try {
    await navigator.clipboard.writeText(detail.value.receipt_number)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Clipboard permission fallback
  }
}

onUnmounted(() => clearTimeout(copyTimer))

function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function statusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'paid':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    case 'refunded':
      return 'bg-amber-100 text-amber-800 border-amber-300'
    case 'void':
    case 'voided':
      return 'bg-rose-100 text-rose-800 border-rose-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-[#EADFD3] animate-in fade-in zoom-in-95 duration-200"
      >
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-[#FBF7F2] border-b border-[#EADFD3] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-full bg-[#7D5A50]/10 text-[#7D5A50] flex items-center justify-center shrink-0">
              <Icon name="heroicons:receipt-percent" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-display text-base font-bold text-[#2D201B]">
                Transaction Receipt
              </h3>
              <p class="text-xs text-[#8A6E64]">
                {{ detail?.receipt_number ? `#${detail.receipt_number}` : 'Loading...' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full text-[#8A6E64] hover:text-[#2D201B] hover:bg-[#EADFD3]/40 flex items-center justify-center transition-colors"
            @click="emit('close')"
          >
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div v-if="loading" class="py-12 text-center space-y-3">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 mx-auto text-[#7D5A50] animate-spin" />
            <p class="text-xs text-[#8A6E64]">Retrieving sale details...</p>
          </div>

          <div v-else-if="error" class="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {{ error }}
          </div>

          <template v-else-if="detail">
            <!-- Summary Bar -->
            <div class="p-3.5 rounded-xl bg-[#FDF8F3] border border-[#EADFD3] flex items-center justify-between">
              <div>
                <span class="text-xs text-[#8A6E64]">Cashier</span>
                <p class="font-semibold text-sm text-[#2D201B]">{{ detail.staff_name }}</p>
              </div>
              <div class="text-right">
                <span class="text-xs text-[#8A6E64]">Status</span>
                <div>
                  <span :class="['px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border', statusBadgeClass(detail.status)]">
                    {{ detail.status }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Timestamp -->
            <p class="text-xs text-[#8A6E64]">
              Recorded on <span class="font-medium text-[#2D201B]">{{ formatDate(detail.created_at) }}</span>
              <template v-if="detail.branch_name"> at <span class="font-medium text-[#2D201B]">{{ detail.branch_name }}</span></template>
            </p>

            <!-- Refund / void trail (owner transaction log) -->
            <div v-if="detail.changed_at" class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1 text-amber-900">
              <p>
                <span class="font-semibold capitalize">{{ detail.status }}</span> on {{ formatDate(detail.changed_at) }}
                <template v-if="detail.refund"> · approved by <span class="font-semibold">{{ detail.refund.by }}</span><template v-if="detail.refund.role"> ({{ detail.refund.role }})</template></template>
              </p>
              <p v-if="detail.refund?.reason">Reason: {{ detail.refund.reason }}</p>
              <p v-if="detail.refund && detail.refund.restocked !== null">
                {{ detail.refund.restocked ? 'Order was not made; servings went back on sale.' : 'Order was already made; servings stay used up.' }}
              </p>
            </div>

            <!-- Line Items -->
            <div>
              <p class="text-xs font-bold text-[#8A6E64] uppercase tracking-wider mb-2">Order Items</p>
              <div class="border border-[#EADFD3] rounded-xl overflow-hidden divide-y divide-[#EADFD3]">
                <div
                  v-for="item in detail.items"
                  :key="item.uuid"
                  class="p-3 bg-white flex items-start justify-between gap-3 text-sm"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-[#2D201B]">{{ item.quantity }}x</span>
                      <span class="font-medium text-[#2D201B]">{{ item.menu_name }}</span>
                      <span v-if="item.size_name || item.temperature" class="text-xs text-[#8A6E64]">({{ variantLabel(item.temperature, item.size_name) }})</span>
                    </div>
                    <div v-if="item.addons?.length" class="mt-1 pl-4 text-xs text-[#8A6E64] space-y-0.5">
                      <div v-for="a in item.addons" :key="a.name">
                        + {{ a.quantity }}x {{ a.name }} ({{ formatPesoCents(a.price) }})
                      </div>
                    </div>
                  </div>
                  <span class="font-semibold text-[#2D201B] tabular-nums shrink-0">
                    {{ formatPesoCents(item.line_total) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Financials Breakdown -->
            <div class="space-y-1.5 border-t border-[#EADFD3] pt-3 text-sm">
              <div class="flex justify-between text-[#8A6E64]">
                <span>Subtotal</span>
                <span class="tabular-nums font-medium text-[#2D201B]">{{ formatPesoCents(detail.subtotal) }}</span>
              </div>
              <div v-if="detail.discount_amount > 0" class="flex justify-between text-red-700">
                <span>Discount {{ detail.discount_type ? `(${detail.discount_type})` : '' }}</span>
                <span class="tabular-nums font-medium">-{{ formatPesoCents(detail.discount_amount) }}</span>
              </div>
              <div class="flex justify-between text-base font-bold text-[#2D201B] pt-1 border-t border-[#EADFD3]">
                <span>Total Amount</span>
                <span class="text-lg text-[#3B1F0E] tabular-nums">{{ formatPesoCents(detail.total_amount) }}</span>
              </div>
            </div>

            <!-- Payment Details -->
            <div v-if="detail.payment" class="p-3 rounded-xl bg-[#FBF7F2] border border-[#EADFD3] text-xs space-y-1">
              <div class="flex justify-between">
                <span class="text-[#8A6E64]">Payment Method:</span>
                <span class="font-semibold text-[#2D201B]">{{ formatMethod(detail.payment.method) }}</span>
              </div>
              <div v-if="detail.payment.amount_tendered" class="flex justify-between">
                <span class="text-[#8A6E64]">Amount Tendered:</span>
                <span class="font-medium text-[#2D201B]">{{ formatPesoCents(detail.payment.amount_tendered) }}</span>
              </div>
              <div v-if="detail.payment.change" class="flex justify-between">
                <span class="text-[#8A6E64]">Change:</span>
                <span class="font-medium text-[#2D201B]">{{ formatPesoCents(detail.payment.change) }}</span>
              </div>
              <div v-if="detail.payment.reference_number" class="flex justify-between">
                <span class="text-[#8A6E64]">Ref Number:</span>
                <span class="font-mono text-[#2D201B]">{{ detail.payment.reference_number }}</span>
              </div>
            </div>

            <!-- Walk-in Note -->
            <div v-if="detail.walk_in_note" class="text-xs text-[#8A6E64] italic">
              Note: "{{ detail.walk_in_note }}"
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="px-6 py-3.5 bg-[#FBF7F2] border-t border-[#EADFD3] flex items-center justify-between">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7D5A50] hover:text-[#5B3E32]"
            @click="copyReceipt"
          >
            <Icon :name="copied ? 'heroicons:check' : 'heroicons:clipboard-document'" class="w-4 h-4" />
            <span>{{ copied ? 'Receipt # Copied!' : 'Copy Receipt #' }}</span>
          </button>
          <button
            type="button"
            class="h-9 px-4 rounded-lg bg-[#7D5A50] hover:bg-[#6D4C42] text-white text-xs font-semibold transition-colors"
            @click="emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
