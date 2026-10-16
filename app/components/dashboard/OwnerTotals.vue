<script setup lang="ts">
import type { OwnerDashboardStats } from '~/services/OwnerProfileService'
import { formatCount, formatPeso, formatPesoCents } from '~/utils/dashboardFormat'

// Lifetime figures, every branch combined.
defineProps<{
  totals: OwnerDashboardStats['totals'] | null
  loading: boolean
}>()
</script>

<template>
  <section
    aria-label="All-time totals"
    class="totals relative overflow-hidden rounded-[22px] bg-[#3B1F0E] text-[#FFF0D1] shadow-[0_18px_40px_-24px_rgba(59,31,14,0.7)]"
  >
    <div class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.35fr]">
      <!-- Branches -->
      <div class="px-6 py-6 md:px-8 md:py-7 border-b sm:border-r border-[#FFF0D1]/10 lg:border-b-0">
        <p class="text-[13px] font-medium text-[#E5C9AE]">Registered branches</p>
        <p class="mt-3 font-display text-4xl md:text-[44px] leading-none font-semibold tabular-nums">
          <span v-if="loading || !totals" class="skeleton-dark inline-block h-[0.85em] w-14 rounded-md align-middle" />
          <template v-else>{{ formatCount(totals.branches) }}</template>
        </p>
        <p class="mt-3 text-[13px] text-[#D9BFA8] min-h-[20px] flex flex-wrap items-center gap-x-3 gap-y-1">
          <template v-if="totals && !loading">
            <span class="inline-flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-[#7FD49B]" aria-hidden="true" />
              {{ totals.active_branches }} active
            </span>
            <span v-if="totals.pending_branches" class="inline-flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-[#F2B66D]" aria-hidden="true" />
              {{ totals.pending_branches }} awaiting approval
            </span>
            <NuxtLink
              to="/owner/cafes"
              class="ml-auto inline-flex items-center gap-1 rounded text-[#FFF0D1] underline decoration-[#FFF0D1]/30 underline-offset-4 hover:decoration-[#FFF0D1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF0D1]/70"
            >
              Manage
              <Icon name="heroicons:arrow-up-right-20-solid" class="h-3.5 w-3.5" />
            </NuxtLink>
          </template>
        </p>
      </div>

      <!-- Orders -->
      <div class="px-6 py-6 md:px-8 md:py-7 border-b lg:border-b-0 lg:border-r border-[#FFF0D1]/10">
        <p class="text-[13px] font-medium text-[#E5C9AE]">Total orders</p>
        <p class="mt-3 font-display text-4xl md:text-[44px] leading-none font-semibold tabular-nums">
          <span v-if="loading || !totals" class="skeleton-dark inline-block h-[0.85em] w-24 rounded-md align-middle" />
          <template v-else>{{ formatCount(totals.orders) }}</template>
        </p>
        <p class="mt-3 text-[13px] text-[#D9BFA8] min-h-[20px]">
          <template v-if="totals && !loading">
            <span class="font-semibold text-[#FFF0D1] tabular-nums">{{ formatCount(totals.today_orders) }}</span> rung up today
          </template>
        </p>
      </div>

      <!-- Income: the figure the owner opens this page for -->
      <div class="relative px-6 py-6 md:px-8 md:py-7 sm:col-span-2 lg:col-span-1 bg-[#4A2A17]">
        <p class="text-[13px] font-medium text-[#E5C9AE]">Total income</p>
        <p class="mt-3 font-display text-[clamp(2.25rem,3.6vw,3.5rem)] leading-none font-semibold tracking-[-0.02em] tabular-nums whitespace-nowrap">
          <span v-if="loading || !totals" class="skeleton-dark inline-block h-[0.8em] w-48 rounded-md align-middle" />
          <template v-else>{{ formatPeso(totals.revenue) }}</template>
        </p>
        <p class="mt-3 text-[13px] text-[#D9BFA8] min-h-[20px]">
          <template v-if="totals && !loading">
            <span class="font-semibold text-[#FFF0D1] tabular-nums">{{ formatPesoCents(totals.today_revenue) }}</span> earned today
          </template>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.totals::before {
  /* Faint crema ring in the corner: the cup seen from above. */
  content: '';
  position: absolute;
  right: -120px;
  top: -140px;
  width: 360px;
  height: 360px;
  border-radius: 9999px;
  background: radial-gradient(circle, transparent 55%, rgba(255, 240, 209, 0.035) 56%, rgba(255, 240, 209, 0.035) 62%, transparent 63%);
  pointer-events: none;
}

.skeleton-dark {
  background: linear-gradient(90deg, rgba(255, 240, 209, 0.08), rgba(255, 240, 209, 0.18), rgba(255, 240, 209, 0.08));
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-dark { animation: none; }
}
</style>
