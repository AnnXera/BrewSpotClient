<script setup lang="ts">
import type { DashboardCategory } from '~/services/OwnerProfileService'
import { formatCount, formatPeso } from '~/utils/dashboardFormat'

// Menu categories ranked by how many orders included them, across every branch.
const props = defineProps<{
  categories: DashboardCategory[]
  span: string
  loading: boolean
}>()

// Bars are scaled to the leader so the ranking reads at a glance; the label carries the true share.
const lead = () => Math.max(1, ...props.categories.map(c => c.orders))
</script>

<template>
  <section class="rounded-[22px] border border-[#EEDFC4] bg-white p-5 sm:p-7 shadow-[0_1px_2px_rgba(59,31,14,0.04)]" aria-labelledby="categories-heading">
    <header>
      <h2 id="categories-heading" class="font-display text-lg font-semibold text-[#3B1F0E]">Top categories</h2>
      <p class="mt-1 text-[13px] text-[#8B6656]">By orders across all branches · {{ span }}</p>
    </header>

    <ol v-if="loading" class="mt-6 space-y-5" aria-hidden="true">
      <li v-for="i in 4" :key="i" class="space-y-2">
        <span class="skeleton block h-3 w-1/3 rounded" />
        <span class="skeleton block h-2.5 rounded-full" :style="{ width: `${100 - i * 18}%` }" />
      </li>
    </ol>

    <ol v-else-if="categories.length" class="mt-6 space-y-5">
      <li v-for="(c, i) in categories" :key="c.uuid ?? 'uncategorized'">
        <div class="flex items-baseline justify-between gap-3">
          <p class="min-w-0 truncate text-[14px] font-semibold text-[#3D2B24]">
            <span class="mr-1.5 font-display tabular-nums text-[#C2A592]">{{ i + 1 }}</span>{{ c.name }}
          </p>
          <p class="shrink-0 text-[14px] font-semibold text-[#3D2B24] tabular-nums">
            {{ formatCount(c.orders) }} <span class="font-normal text-[#9E7060]">{{ c.orders === 1 ? 'order' : 'orders' }}</span>
          </p>
        </div>
        <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-[#F3E7D2]">
          <div
            class="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            :class="i === 0 ? 'bg-[#7D5A50]' : 'bg-[#B4846C]'"
            :style="{ width: `${(c.orders / lead()) * 100}%` }"
          />
        </div>
        <p class="mt-1.5 text-[12px] text-[#9E7060] tabular-nums">
          In {{ c.share }}% of orders · {{ formatPeso(c.sales) }} · {{ formatCount(c.quantity) }} units
        </p>
      </li>
    </ol>

    <div v-else class="mt-6 rounded-2xl bg-[#FDF8F3] px-5 py-8 text-center">
      <Icon name="heroicons:squares-2x2" class="mx-auto h-7 w-7 text-[#C2A592]" />
      <p class="mt-2 font-display font-semibold text-[#3B1F0E]">No category sales yet</p>
      <p class="mt-1 text-[13px] text-[#8B6656]">Categories rank here by what they earn.</p>
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
