<script setup lang="ts">
import type { DashboardBranch } from '~/services/OwnerProfileService'
import { formatCount, formatPeso } from '~/utils/dashboardFormat'

// Each branch's slice of the chart's income, highest first.
defineProps<{
  branches: DashboardBranch[]
  span: string
  loading: boolean
}>()

const statusLabel: Record<string, string> = {
  pending_approval: 'Awaiting approval',
  inactive: 'Inactive',
  suspended: 'Suspended',
  rejected: 'Rejected',
}
</script>

<template>
  <section class="flex flex-col rounded-[22px] border border-[#EEDFC4] bg-white p-5 sm:p-7 shadow-[0_1px_2px_rgba(59,31,14,0.04)]" aria-labelledby="branches-heading">
    <header>
      <h2 id="branches-heading" class="font-display text-lg font-semibold text-[#3B1F0E]">By branch</h2>
      <p class="mt-1 text-[13px] text-[#8B6656]">Share of income · {{ span }}</p>
    </header>

    <ul v-if="loading" class="mt-5 space-y-5" aria-hidden="true">
      <li v-for="i in 3" :key="i" class="space-y-2">
        <span class="skeleton block h-3 w-1/2 rounded" />
        <span class="skeleton block h-1.5 rounded-full" />
      </li>
    </ul>

    <ul v-else-if="branches.length" class="-mx-2 mt-4 flex-1 space-y-1 overflow-y-auto lg:grid lg:grid-cols-2 lg:gap-x-6 lg:space-y-0 xl:block xl:max-h-[420px] xl:space-y-1">
      <li v-for="b in branches" :key="b.uuid">
        <NuxtLink
          :to="`/owner/branches/${b.uuid}`"
          class="block rounded-xl px-2 py-3 transition-colors hover:bg-[#FDF8F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
        >
          <div class="flex items-baseline justify-between gap-3">
            <p class="min-w-0 truncate text-[14px] font-semibold text-[#3D2B24]">
              {{ b.name }}
              <span v-if="b.branch_type === 'main'" class="ml-1 align-middle rounded-full bg-[#F3E7D2] px-1.5 py-px text-[10px] font-semibold text-[#7D5A50]">Main</span>
            </p>
            <p class="shrink-0 text-[14px] font-semibold text-[#3D2B24] tabular-nums">{{ formatPeso(b.revenue) }}</p>
          </div>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F3E7D2]">
            <div class="h-full rounded-full bg-[#7D5A50] transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" :style="{ width: `${b.share}%` }" />
          </div>
          <p class="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-[#9E7060] tabular-nums">
            <span>{{ formatCount(b.orders) }} {{ b.orders === 1 ? 'order' : 'orders' }}</span>
            <span v-if="statusLabel[b.status]" class="inline-flex items-center gap-1 text-[#8A5A1F]">
              <span class="h-1.5 w-1.5 rounded-full bg-[#E09A3E]" aria-hidden="true" />
              {{ statusLabel[b.status] }}
            </span>
            <span v-else>{{ b.share }}%</span>
          </p>
        </NuxtLink>
      </li>
    </ul>

    <div v-else class="mt-6 flex-1 rounded-2xl bg-[#FDF8F3] px-5 py-8 text-center">
      <Icon name="heroicons:building-storefront" class="mx-auto h-7 w-7 text-[#C2A592]" />
      <p class="mt-2 font-display font-semibold text-[#3B1F0E]">No branches yet</p>
      <NuxtLink to="/owner/cafes" class="mt-2 inline-block rounded text-[13px] font-semibold text-[#7D5A50] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]">Add a branch</NuxtLink>
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

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
</style>
