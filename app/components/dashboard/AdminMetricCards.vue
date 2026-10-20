<script setup lang="ts">
import { computed } from 'vue'
import { formatCount, formatPeso } from '~/utils/dashboardFormat'

// Platform-wide figures across every cafe owner. Same banner as the owner and manager dashboards.
const props = defineProps<{
  totalOwners: number
  activeOwners: number
  suspendedOwners: number
  ownerPending: number
  branchPending: number
  activeSubscriptions: number
  totalRevenue: number
  loading?: boolean
}>()

const pendingTotal = computed(() => props.ownerPending + props.branchPending)
</script>

<template>
  <section
    aria-label="Platform totals"
    class="totals relative overflow-hidden rounded-[22px] bg-[#3B1F0E] text-[#FFF0D1] shadow-[0_18px_40px_-24px_rgba(59,31,14,0.7)]"
  >
    <div class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Cafe owners -->
      <div class="animate-card-enter px-6 py-6 border-b sm:border-r border-[#FFF0D1]/10 lg:border-b-0" style="--card-delay: 0ms;">
        <p class="text-[13px] font-medium text-[#E5C9AE]">Cafe owners</p>
        <p class="mt-3 font-display text-3xl sm:text-[36px] leading-none font-semibold tabular-nums">
          <span v-if="loading" class="skeleton-dark inline-block h-[0.85em] w-14 rounded-md align-middle" />
          <template v-else>{{ formatCount(totalOwners) }}</template>
        </p>
        <p class="mt-3 text-[13px] text-[#D9BFA8] min-h-[20px] flex flex-wrap items-center gap-x-3 gap-y-1">
          <template v-if="!loading">
            <span class="inline-flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-[#7FD49B]" aria-hidden="true" />
              {{ formatCount(activeOwners) }} active
            </span>
            <span v-if="suspendedOwners" class="inline-flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-[#F2B66D]" aria-hidden="true" />
              {{ formatCount(suspendedOwners) }} suspended
            </span>
            <NuxtLink
              to="/admin/owners"
              class="ml-auto inline-flex items-center gap-1 rounded text-[#FFF0D1] underline decoration-[#FFF0D1]/30 underline-offset-4 hover:decoration-[#FFF0D1] active:scale-[0.97] transition-transform duration-160 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF0D1]/70"
            >
              Manage
              <Icon name="heroicons:arrow-up-right-20-solid" class="h-3.5 w-3.5" />
            </NuxtLink>
          </template>
        </p>
      </div>

      <!-- Pending approvals -->
      <div class="animate-card-enter px-6 py-6 border-b lg:border-b-0 lg:border-r border-[#FFF0D1]/10" style="--card-delay: 70ms;">
        <p class="text-[13px] font-medium text-[#E5C9AE]">Awaiting approval</p>
        <p class="mt-3 font-display text-3xl sm:text-[36px] leading-none font-semibold tabular-nums">
          <span v-if="loading" class="skeleton-dark inline-block h-[0.85em] w-14 rounded-md align-middle" />
          <template v-else>{{ formatCount(pendingTotal) }}</template>
        </p>
        <p class="mt-3 text-[13px] text-[#D9BFA8] min-h-[20px] flex flex-wrap items-center gap-x-3 gap-y-1">
          <template v-if="!loading">
            <template v-if="pendingTotal">
              <span class="tabular-nums">{{ ownerPending }} {{ ownerPending === 1 ? 'owner' : 'owners' }} · {{ branchPending }} {{ branchPending === 1 ? 'branch' : 'branches' }}</span>
              <NuxtLink
                to="/admin/approvals"
                class="ml-auto inline-flex items-center gap-1 rounded text-[#FFF0D1] underline decoration-[#FFF0D1]/30 underline-offset-4 hover:decoration-[#FFF0D1] active:scale-[0.97] transition-transform duration-160 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF0D1]/70"
              >
                Review
                <Icon name="heroicons:arrow-up-right-20-solid" class="h-3.5 w-3.5" />
              </NuxtLink>
            </template>
            <span v-else class="inline-flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-[#7FD49B]" aria-hidden="true" />
              Nothing to review
            </span>
          </template>
        </p>
      </div>

      <!-- Active subscribers -->
      <div class="animate-card-enter px-6 py-6 border-b sm:border-b-0 sm:border-r border-[#FFF0D1]/10" style="--card-delay: 140ms;">
        <p class="text-[13px] font-medium text-[#E5C9AE]">Active subscribers</p>
        <p class="mt-3 font-display text-3xl sm:text-[36px] leading-none font-semibold tabular-nums">
          <span v-if="loading" class="skeleton-dark inline-block h-[0.85em] w-14 rounded-md align-middle" />
          <template v-else>{{ formatCount(activeSubscriptions) }}</template>
        </p>
        <p class="mt-3 text-[13px] text-[#D9BFA8] min-h-[20px] flex items-center">
          <template v-if="!loading">
            <span>On monthly or yearly plans</span>
            <NuxtLink
              to="/admin/subscriptions"
              class="ml-auto inline-flex items-center gap-1 rounded text-[#FFF0D1] underline decoration-[#FFF0D1]/30 underline-offset-4 hover:decoration-[#FFF0D1] active:scale-[0.97] transition-transform duration-160 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF0D1]/70"
            >
              Plans
              <Icon name="heroicons:arrow-up-right-20-solid" class="h-3.5 w-3.5" />
            </NuxtLink>
          </template>
        </p>
      </div>

      <!-- Subscription revenue -->
      <div class="animate-card-enter px-6 py-6 bg-[#4A2A17]" style="--card-delay: 210ms;">
        <p class="text-[13px] font-medium text-[#E5C9AE]">Subscription revenue</p>
        <p class="mt-3 font-display text-3xl sm:text-[36px] leading-none font-semibold tabular-nums tracking-[-0.015em]">
          <span v-if="loading" class="skeleton-dark inline-block h-[0.85em] w-32 rounded-md align-middle" />
          <template v-else>{{ formatPeso(totalRevenue) }}</template>
        </p>
        <p class="mt-3 text-[13px] text-[#D9BFA8] min-h-[20px]">
          <template v-if="!loading">Gross billing, all time</template>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.totals::before {
  /* Faint crema ring in the corner, as on the owner and manager banners. */
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
