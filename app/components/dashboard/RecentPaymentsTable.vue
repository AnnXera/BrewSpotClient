<script setup lang="ts">
import type { PaymentTransaction } from '~/components/common/PaymentHistoryTable.vue'
import { formatPesoCents } from '~/utils/dashboardFormat'

// Latest subscription payments across every cafe owner.
defineProps<{
  transactions: PaymentTransaction[]
  loading?: boolean
}>()

function amount(val?: string | number): number {
  if (val === undefined || val === null) return 0
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

// Same pill colors as the manager's transaction history.
function statusClass(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
    case 'success':
    case 'paid':
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'failed':
    case 'cancelled':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200'
  }
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}
</script>

<template>
  <section class="flex flex-col gap-4 rounded-[22px] border border-[#EEDFC4] bg-white p-5 sm:p-7 shadow-[0_1px_2px_rgba(59,31,14,0.04)]" aria-labelledby="recent-payments-heading">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h2 id="recent-payments-heading" class="font-display text-[18px] font-bold text-[#3B1F0E]">Recent payments</h2>
        <p class="mt-1 text-[13px] text-[#8B6656]">Latest subscription billing across all cafes</p>
      </div>
      <NuxtLink
        to="/admin/payments"
        class="inline-flex shrink-0 items-center gap-1 rounded font-display text-[13px] font-semibold text-[#7D5A50] underline decoration-[#7D5A50]/30 underline-offset-4 hover:decoration-[#7D5A50] active:scale-[0.97] transition-transform duration-160 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
      >
        View all
        <Icon name="heroicons:arrow-up-right-20-solid" class="h-3.5 w-3.5" />
      </NuxtLink>
    </header>

    <ul v-if="loading" class="space-y-4 py-1" aria-hidden="true">
      <li v-for="i in 4" :key="i" class="flex items-center gap-3">
        <span class="flex-1 space-y-2"><span class="skeleton block h-3.5 w-1/2 rounded" /><span class="skeleton block h-3 w-1/3 rounded" /></span>
        <span class="skeleton h-4 w-16 rounded" />
      </li>
    </ul>

    <ul v-else-if="transactions.length" class="flex flex-col divide-y divide-[#F3E7D2]">
      <li
        v-for="(item, i) in transactions.slice(0, 5)"
        :key="item.transaction_id"
        class="animate-row-enter flex items-center gap-3 py-3"
        :style="{ '--row-delay': `${i * 60}ms` }"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-[14px] font-semibold text-[#3B1F0E]">{{ item.owner_name || item.description }}</p>
          <p class="truncate text-[13px] text-[#8B6656]">
            {{ item.owner_name ? item.description : '' }}<template v-if="item.owner_name"> · </template><span class="font-mono text-[12px] text-[#9E7060]">{{ item.transaction_id }}</span>
          </p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1">
          <span class="text-[14px] font-semibold text-[#3B1F0E] tabular-nums">{{ formatPesoCents(amount(item.amount)) }}</span>
          <span class="rounded-full border px-2 py-px text-[11px] font-semibold" :class="statusClass(item.status)">
            {{ statusLabel(item.status) }}
          </span>
        </div>
      </li>
    </ul>

    <div v-else class="animate-row-enter flex-1 rounded-2xl bg-[#FDF8F3] px-5 py-8 text-center">
      <Icon name="heroicons:receipt-percent" class="mx-auto h-7 w-7 text-[#C2A592]" />
      <p class="mt-2 font-display font-semibold text-[#3B1F0E]">No payments yet</p>
      <p class="mt-1 text-[13px] text-[#8B6656]">Subscription payments will appear here as owners subscribe.</p>
    </div>
  </section>
</template>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, #F6ECDD, #FBF4EA, #F6ECDD);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

@keyframes rowEnter {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-row-enter {
  animation: rowEnter 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--row-delay, 0ms);
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton, .animate-row-enter {
    animation: none !important;
    transform: none !important;
  }
}
</style>
