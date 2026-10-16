<script setup lang="ts">
import type { DashboardTrendingItem } from '~/services/OwnerProfileService'
import { formatCount, formatPeso } from '~/utils/dashboardFormat'

// Best sellers across every branch in the chart's window, with momentum
// against the window before it.
defineProps<{
  items: DashboardTrendingItem[]
  span: string
  loading: boolean
}>()
</script>

<template>
  <section class="rounded-[22px] border border-[#EEDFC4] bg-white p-5 sm:p-7 shadow-[0_1px_2px_rgba(59,31,14,0.04)]" aria-labelledby="trending-heading">
    <header class="flex items-baseline justify-between gap-4">
      <div>
        <h2 id="trending-heading" class="font-display text-lg font-semibold text-[#3B1F0E]">Trending menu items</h2>
        <p class="mt-1 text-[13px] text-[#8B6656]">Most units sold across all branches · {{ span }}</p>
      </div>
      <NuxtLink
        to="/owner/menu-management/items"
        class="shrink-0 rounded text-[13px] font-semibold text-[#7D5A50] underline decoration-[#7D5A50]/30 underline-offset-4 hover:decoration-[#7D5A50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
      >
        Menu
      </NuxtLink>
    </header>

    <ol v-if="loading" class="mt-5 space-y-4" aria-hidden="true">
      <li v-for="i in 5" :key="i" class="flex items-center gap-4">
        <span class="skeleton h-12 w-12 rounded-xl" />
        <span class="flex-1 space-y-2"><span class="skeleton block h-3 w-1/2 rounded" /><span class="skeleton block h-2 w-1/3 rounded" /></span>
      </li>
    </ol>

    <ol v-else-if="items.length" class="mt-4 divide-y divide-[#F3E7D2]">
      <li
        v-for="item in items"
        :key="item.uuid"
        class="grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-3 sm:gap-x-4 py-3.5"
      >
        <span
          class="w-5 text-center font-display text-[15px] font-semibold tabular-nums"
          :class="item.rank === 1 ? 'text-[#7D5A50]' : 'text-[#C2A592]'"
        >{{ item.rank }}</span>

        <span class="relative h-12 w-12 overflow-hidden rounded-xl bg-[#F3E7D2]">
          <img
            v-if="item.picture"
            :src="item.picture"
            :alt="''"
            class="h-full w-full object-cover"
            loading="lazy"
          >
          <Icon v-else name="ph:coffee" class="absolute inset-0 m-auto h-5 w-5 text-[#B4846C]" />
        </span>

        <div class="min-w-0">
          <p class="truncate text-[14px] font-semibold text-[#3D2B24]">{{ item.name }}</p>
          <p class="truncate text-[12px] text-[#9E7060]">{{ item.category }}</p>
          <div class="mt-2 flex items-center gap-2">
            <span class="h-1.5 max-w-[180px] flex-1 overflow-hidden rounded-full bg-[#F3E7D2]">
              <span class="block h-full rounded-full bg-[#7D5A50]" :style="{ width: `${item.share}%` }" />
            </span>
            <span class="text-[11px] text-[#9E7060] tabular-nums">{{ item.share }}% of units</span>
          </div>
        </div>

        <div class="text-right">
          <p class="text-[14px] font-semibold text-[#3D2B24] tabular-nums">
            {{ formatCount(item.quantity) }} <span class="font-normal text-[#9E7060]">sold</span>
          </p>
          <p class="mt-0.5 text-[12px] text-[#8B6656] tabular-nums">{{ formatPeso(item.sales) }}</p>
          <p class="mt-1.5 flex justify-end">
            <span
              v-if="item.change === null"
              class="inline-flex items-center gap-1 rounded-full bg-[#FFF0D1] px-2 py-0.5 text-[11px] font-semibold text-[#8A5A1F]"
            >
              <Icon name="heroicons:sparkles-20-solid" class="h-3 w-3" />
              New
            </span>
            <span
              v-else
              class="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
              :class="item.change >= 0 ? 'bg-[#E3F4E8] text-[#1F6B3A]' : 'bg-[#FBE4E1] text-[#A2352A]'"
              :title="`${formatCount(item.previous_quantity)} sold in the previous period`"
            >
              <Icon :name="item.change >= 0 ? 'heroicons:arrow-up-20-solid' : 'heroicons:arrow-down-20-solid'" class="h-3 w-3" />
              <span class="sr-only">{{ item.change >= 0 ? 'Up' : 'Down' }}</span>{{ Math.abs(item.change) }}%
            </span>
          </p>
        </div>
      </li>
    </ol>

    <div v-else class="mt-6 rounded-2xl bg-[#FDF8F3] px-5 py-8 text-center">
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
