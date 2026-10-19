<!-- app/components/manager/ManagerPeakHours.vue -->
<script setup lang="ts">
import type { ManagerDashboardStats } from '~/services/ManagerDashboardService'
import { formatSpan } from '~/utils/dashboardFormat'
import AnalyticsHeatmap from '~/components/analytics/AnalyticsHeatmap.vue'

defineProps<{
  peak: ManagerDashboardStats['peak_hours'] | null
  loading: boolean
}>()
</script>

<template>
  <section class="rounded-[22px] border border-[#EEDFC4] bg-white p-5 shadow-[0_1px_2px_rgba(59,31,14,0.04)] sm:p-6" aria-labelledby="peak-hours-heading">
    <header>
      <h2 id="peak-hours-heading" class="font-display text-[18px] font-bold text-[#3B1F0E]">Peak Hours</h2>
      <p class="mt-0.5 text-[13px] text-[#8B6656]">
        When orders come in, by weekday and hour. Use it to plan shifts and prep.
        <template v-if="peak"> &middot; Last 4 weeks, {{ formatSpan(peak.from, peak.to) }}</template>
      </p>
    </header>

    <div class="mt-6">
      <div v-if="loading || !peak" class="space-y-[3px]" aria-hidden="true">
        <span v-for="i in 7" :key="i" class="skeleton block h-[26px] rounded-[4px]" />
      </div>
      <AnalyticsHeatmap v-else :grid="peak.grid" />
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
  .skeleton {
    animation: none !important;
  }
}
</style>
