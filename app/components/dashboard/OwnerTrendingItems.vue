<script setup lang="ts">
import type { DashboardTrendingItem } from '~/services/OwnerProfileService'
import { formatCount, formatPesoCents } from '~/utils/dashboardFormat'

// Best sellers across every branch in the chart's window, ranked by orders.
defineProps<{
  items: DashboardTrendingItem[]
  loading: boolean
}>()
</script>

<template>
  <section class="flex flex-col gap-4 rounded-[22px] border border-[#EDD8CC] bg-white p-6 shadow-[0_1px_2px_rgba(59,31,14,0.04)]" aria-labelledby="top-selling-heading">
    <header class="flex items-start justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h2 id="top-selling-heading" class="font-display text-[18px] font-bold text-[#3D2B24]">Top-Selling Menu Items</h2>
        <p class="font-display text-[13px] text-[#9E7060]">Top performers sorted by volume and gross contribution</p>
      </div>
      <NuxtLink
        to="/owner/menu-management/items"
        class="inline-flex shrink-0 items-center gap-1 rounded font-display text-[13px] font-semibold text-[#7D5A50] underline decoration-[#7D5A50]/30 underline-offset-4 hover:decoration-[#7D5A50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
      >
        View menu
        <Icon name="heroicons:arrow-up-right-20-solid" class="h-3.5 w-3.5" />
      </NuxtLink>
    </header>

    <ol v-if="loading" class="flex flex-col" aria-hidden="true">
      <li v-for="i in 4" :key="i" class="flex items-center gap-4 border-b border-[#EDD8CC] py-4">
        <span class="skeleton h-4 w-6 rounded" />
        <span class="flex-1 space-y-2"><span class="skeleton block h-3.5 w-1/2 rounded" /><span class="skeleton block h-3 w-1/3 rounded" /></span>
        <span class="skeleton hidden h-3 w-[180px] rounded sm:block" />
      </li>
    </ol>

    <ol v-else-if="items.length" class="flex flex-col">
      <li
        v-for="item in items"
        :key="item.uuid"
        class="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b border-[#EDD8CC] py-4 font-display sm:grid-cols-[32px_minmax(0,1fr)_180px_120px]"
      >
        <span class="text-[14px] font-bold text-[#9E7060] tabular-nums">#{{ item.rank }}</span>

        <div class="flex min-w-0 flex-col gap-1">
          <p class="truncate text-[15px] font-bold text-[#3D2B24]">{{ item.name }}</p>
          <p class="truncate text-[13px] text-[#9E7060]">{{ item.category }}</p>
        </div>

        <!-- Orders + share: its own row under the name on phones -->
        <div class="col-span-2 col-start-2 row-start-2 flex flex-col gap-1.5 sm:col-span-1 sm:col-start-3 sm:row-start-1">
          <div class="flex items-start justify-between gap-3 whitespace-nowrap">
            <span class="text-[14px] font-semibold text-[#3D2B24] tabular-nums">{{ formatCount(item.orders) }} {{ item.orders === 1 ? 'order' : 'orders' }}</span>
            <span class="text-[13px] text-[#9E7060] tabular-nums">{{ Math.round(item.share) }}%</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-[3px] bg-[#FFF8EA]">
            <div class="h-full bg-[#7D5A50]" :style="{ width: `${Math.min(100, item.share)}%` }" />
          </div>
        </div>

        <span class="col-start-3 row-start-1 text-right text-[15px] font-bold text-[#3D2B24] tabular-nums sm:col-start-4">
          {{ formatPesoCents(item.sales) }}
        </span>
      </li>
    </ol>

    <div v-else class="rounded-2xl bg-[#FDF8F3] px-5 py-8 text-center">
      <Icon name="ph:coffee" class="mx-auto h-7 w-7 text-[#C2A592]" />
      <p class="mt-2 font-display font-semibold text-[#3B1F0E]">Nothing sold yet in this period</p>
      <p class="mt-1 text-[13px] text-[#8B6656]">Your best sellers will rank here once orders come in.</p>
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
