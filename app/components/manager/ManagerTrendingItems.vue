<!-- app/components/manager/ManagerTrendingItems.vue -->
<script setup lang="ts">
import type { DashboardTrendingItem } from '~/services/OwnerProfileService'
import { formatCount, formatPesoCents } from '~/utils/dashboardFormat'

const props = defineProps<{
  items: DashboardTrendingItem[]
  loading: boolean
}>()

// Bars are relative to the top seller, so the ranking reads at a glance.
const lead = () => Math.max(1, ...props.items.map(i => i.orders))
</script>

<template>
  <section class="flex flex-col gap-4 rounded-[22px] border border-[#EEDFC4] bg-white p-5 shadow-[0_1px_2px_rgba(59,31,14,0.04)] sm:p-6" aria-labelledby="top-selling-heading">
    <header class="flex items-start justify-between gap-4">
      <div class="flex flex-col gap-0.5">
        <h2 id="top-selling-heading" class="font-display text-[18px] font-bold text-[#3B1F0E]">Top-Selling Menu Items</h2>
        <p class="text-[13px] text-[#8B6656]">Top branch performers sorted by order volume and contribution</p>
      </div>
      <NuxtLink
        to="/manager/servings"
        class="inline-flex shrink-0 items-center gap-1 rounded font-display text-[13px] font-semibold text-[#7D5A50] underline decoration-[#7D5A50]/30 underline-offset-4 hover:decoration-[#7D5A50] active:scale-[0.97] transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
      >
        View Servings
        <Icon name="heroicons:arrow-up-right-20-solid" class="h-3.5 w-3.5" />
      </NuxtLink>
    </header>

    <ol v-if="loading" class="flex flex-col gap-5" aria-hidden="true">
      <li v-for="i in 4" :key="i" class="space-y-2">
        <span class="flex justify-between gap-4"><span class="skeleton block h-3.5 w-1/2 rounded" /><span class="skeleton block h-3.5 w-16 rounded" /></span>
        <span class="skeleton block h-2 rounded-full" :style="{ width: `${100 - i * 18}%` }" />
        <span class="skeleton block h-3 w-2/5 rounded" />
      </li>
    </ol>

    <!-- Stacked rows: the name gets the full card width instead of sharing it with the bar and price -->
    <ol v-else-if="items.length" class="flex flex-col gap-5">
      <li
        v-for="(item, i) in items"
        :key="item.uuid"
        class="animate-row-enter"
        :style="{ '--row-delay': `${i * 60}ms` }"
      >
        <div class="flex items-start justify-between gap-4">
          <p class="flex min-w-0 items-baseline gap-2 font-display text-[15px] font-semibold leading-snug text-[#3B1F0E]">
            <span class="shrink-0 tabular-nums" :class="item.rank === 1 ? 'text-[#3B1F0E]' : 'text-[#9E7060]'">{{ item.rank }}</span>
            <span class="line-clamp-2 break-words" :title="item.name">{{ item.name }}</span>
          </p>
          <p class="shrink-0 font-display text-[15px] font-bold text-[#3B1F0E] tabular-nums">{{ formatPesoCents(item.sales) }}</p>
        </div>

        <div class="mt-2 h-2 overflow-hidden rounded-full bg-[#F3E7D2]">
          <div
            class="bar-grow-x h-full rounded-full"
            :class="i === 0 ? 'bg-[#5A3828]' : 'bg-[#B4846C]'"
            :style="{ width: `${(item.orders / lead()) * 100}%`, '--bar-delay': `${i * 65}ms` }"
          />
        </div>

        <p class="mt-1.5 text-[12px] text-[#8B6656] tabular-nums">
          {{ item.category }} &middot;
          <span class="font-semibold text-[#5C4037]">{{ formatCount(item.orders) }} {{ item.orders === 1 ? 'order' : 'orders' }}</span>
          &middot; in {{ Math.round(item.share) }}% of orders
        </p>
      </li>
    </ol>

    <div v-else class="animate-row-enter rounded-2xl bg-[#FDF8F3] px-5 py-8 text-center">
      <Icon name="ph:coffee" class="mx-auto h-7 w-7 text-[#C2A592]" />
      <p class="mt-2 font-display font-semibold text-[#3B1F0E]">No item sales recorded</p>
      <p class="mt-1 text-[13px] text-[#8B6656]">Best-selling items in this period will appear here.</p>
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

@keyframes barGrowX {
  0% {
    transform: scaleX(0);
    opacity: 0.15;
  }
  100% {
    transform: scaleX(1);
    opacity: 1;
  }
}

.bar-grow-x {
  transform-origin: left;
  animation: barGrowX 850ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--bar-delay, 0ms);
  will-change: transform;
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
  .skeleton, .bar-grow-x, .animate-row-enter {
    animation: none !important;
    transform: none !important;
  }
}
</style>
