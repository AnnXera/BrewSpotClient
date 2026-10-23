<script setup lang="ts">
import { computed } from 'vue'
import type { OwnerDashboardStats } from '~/services/OwnerProfileService'
import { formatCount, formatPeso, formatPesoCents } from '~/utils/dashboardFormat'

// Lifetime figures, every branch combined.
const props = defineProps<{
  totals: OwnerDashboardStats['totals'] | null
  loading: boolean
}>()

const avgOrderValue = computed(() => {
  if (!props.totals || !props.totals.orders) return 0
  return props.totals.revenue / props.totals.orders
})

const todayAvgOrderValue = computed(() => {
  if (!props.totals || !props.totals.today_orders) return 0
  return props.totals.today_revenue / props.totals.today_orders
})
</script>

<template>
  <section
    aria-label="All-time totals"
    class="totals relative overflow-hidden rounded-[22px] bg-[#3B1F0E] text-[#FFF0D1] shadow-[0_18px_40px_-24px_rgba(59,31,14,0.7)]"
  >
    <div class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Branches -->
      <div class="animate-card-enter px-6 py-6 border-b sm:border-r border-[#FFF0D1]/10 lg:border-b-0" style="--card-delay: 0ms;">
        <p class="text-[13px] font-medium text-[#E5C9AE]">Registered branches</p>
        <p class="mt-3 font-display text-3xl sm:text-[36px] leading-none font-semibold tabular-nums">
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
              class="ml-auto inline-flex items-center gap-1 rounded text-[#FFF0D1] underline decoration-[#FFF0D1]/30 underline-offset-4 hover:decoration-[#FFF0D1] active:scale-[0.97] transition-transform duration-160 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF0D1]/70"
            >
              Manage
              <Icon name="heroicons:arrow-up-right-20-solid" class="h-3.5 w-3.5" />
            </NuxtLink>
          </template>
        </p>
      </div>

      <!-- Orders -->
      <div class="animate-card-enter px-6 py-6 border-b lg:border-b-0 lg:border-r border-[#FFF0D1]/10" style="--card-delay: 70ms;">
        <p class="text-[13px] font-medium text-[#E5C9AE]">Total orders</p>
        <p class="mt-3 font-display text-3xl sm:text-[36px] leading-none font-semibold tabular-nums">
          <span v-if="loading || !totals" class="skeleton-dark inline-block h-[0.85em] w-20 rounded-md align-middle" />
          <template v-else>{{ formatCount(totals.orders) }}</template>
        </p>
        <p class="mt-3 text-[13px] text-[#D9BFA8] min-h-[20px]">
          <template v-if="totals && !loading">
            <span class="font-semibold text-[#FFF0D1] tabular-nums">{{ formatCount(totals.today_orders) }}</span> rung up today
          </template>
        </p>
      </div>

      <!-- Total Income -->
      <div class="animate-card-enter px-6 py-6 border-b sm:border-b-0 sm:border-r border-[#FFF0D1]/10" style="--card-delay: 140ms;">
        <p class="text-[13px] font-medium text-[#E5C9AE]">Total income</p>
        <p class="mt-3 font-display text-3xl sm:text-[36px] leading-none font-semibold tabular-nums tracking-[-0.015em]">
          <span v-if="loading || !totals" class="skeleton-dark inline-block h-[0.85em] w-32 rounded-md align-middle" />
          <template v-else>{{ formatPeso(totals.revenue) }}</template>
        </p>
        <p class="mt-3 text-[13px] text-[#D9BFA8] min-h-[20px] flex items-center justify-between">
          <template v-if="totals && !loading">
            <span>
              <span class="font-semibold text-[#FFF0D1] tabular-nums">{{ formatPesoCents(totals.today_revenue) }}</span> earned today
            </span>
          </template>
        </p>
      </div>

      <!-- Avg Order Value -->
      <div class="animate-card-enter px-6 py-6 bg-[#4A2A17]" style="--card-delay: 210ms;">
        <p class="text-[13px] font-medium text-[#E5C9AE]">Avg. order value</p>
        <p class="mt-3 font-display text-3xl sm:text-[36px] leading-none font-semibold tabular-nums tracking-[-0.015em]">
          <span v-if="loading || !totals" class="skeleton-dark inline-block h-[0.85em] w-24 rounded-md align-middle" />
          <template v-else>{{ formatPeso(avgOrderValue) }}</template>
        </p>
        <p class="mt-3 text-[13px] text-[#D9BFA8] min-h-[20px] flex items-center justify-between">
          <template v-if="totals && !loading">
            <span v-if="totals.today_orders > 0">
              <span class="font-semibold text-[#FFF0D1] tabular-nums">{{ formatPesoCents(todayAvgOrderValue) }}</span> today
            </span>
            <span v-else>
              Across all branches
            </span>
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

@keyframes cardEnter {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-card-enter {
  animation: cardEnter 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--card-delay, 0ms);
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-dark, .animate-card-enter {
    animation: none !important;
    transform: none !important;
  }
}
</style>
