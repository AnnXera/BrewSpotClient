<!-- app/components/payments/PaymentAnalyticsCards.vue -->
<script setup lang="ts">
const props = defineProps<{
  totalTransactions: number
  totalRevenue: number
  registeredSubscribers: number
}>()

function formatRevenue(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0.00'
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 mb-6 md:mb-8 w-full">
    <!-- Total Transactions -->
    <div
      class="rise bg-white border border-[#EEDFC4] rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(61,43,36,0.04)] cursor-default flex items-center gap-3.5 min-w-0"
      style="--i: 0"
    >
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#7D5A50]/10 text-[#7D5A50]"
        aria-hidden="true"
      >
        <Icon name="heroicons:receipt-percent" class="size-5" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="font-display text-[24px] sm:text-[28px] leading-none font-extrabold tracking-tight text-[#3D2B24] truncate">
          {{ totalTransactions }}
        </p>
        <p class="font-sans text-[13px] font-medium text-[#3B1F0E]/60 mt-1.5 truncate">
          Total Transactions
        </p>
      </div>
    </div>

    <!-- Total Revenue: Consistent number color with green accent icon -->
    <div
      class="rise bg-white border border-[#EEDFC4] rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(61,43,36,0.04)] cursor-default flex items-center gap-3.5 min-w-0"
      style="--i: 1"
    >
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#2E9E5B]/10 text-[#2E9E5B]"
        aria-hidden="true"
      >
        <Icon name="heroicons:banknotes" class="size-5" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="font-display text-[24px] sm:text-[28px] leading-none font-extrabold tracking-tight text-[#3D2B24] truncate">
          ₱{{ formatRevenue(totalRevenue) }}
        </p>
        <p class="font-sans text-[13px] font-medium text-[#3B1F0E]/60 mt-1.5 truncate">
          Total Revenue
        </p>
      </div>
    </div>

    <!-- Registered Subscribers -->
    <div
      class="rise bg-white border border-[#EEDFC4] rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(61,43,36,0.04)] cursor-default flex items-center gap-3.5 min-w-0 col-span-1 sm:col-span-2 lg:col-span-1"
      style="--i: 2"
    >
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#B4846C]/15 text-[#B4846C]"
        aria-hidden="true"
      >
        <Icon name="heroicons:user-group" class="size-5" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="font-display text-[24px] sm:text-[28px] leading-none font-extrabold tracking-tight text-[#3D2B24] truncate">
          {{ registeredSubscribers }}
        </p>
        <p class="font-sans text-[13px] font-medium text-[#3B1F0E]/60 mt-1.5 truncate">
          Registered Subscribers
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rise {
  animation: rise 320ms cubic-bezier(0.23, 1, 0.32, 1) both;
  animation-delay: calc(var(--i, 0) * 50ms);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .rise {
    animation: fade 200ms ease both;
    animation-delay: 0ms;
  }
  @keyframes fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
</style>
