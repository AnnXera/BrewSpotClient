<script setup lang="ts">
// Shown in place of a tab when its figures could not be loaded, or the plan lacks analytics.
import type { PlanLock } from '~/utils/planLock'

const props = defineProps<{ kind: 'failed' | 'locked'; lock?: PlanLock | null }>()

// Older responses without a reason still read as "not on your plan".
const planLock = computed<PlanLock>(() => props.lock ?? {
  reason: 'feature_not_in_plan',
  feature: 'advanced_analytics',
  featureName: 'Advanced Analytics & Reports',
})
defineEmits<{ retry: [] }>()
</script>

<template>
  <SubscriptionLockedState
    v-if="kind === 'locked'"
    :lock="planLock"
    description="See sales trends, peak hours and branch comparisons."
  />

  <div
    v-else
    role="alert"
    class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F1C9C2] bg-[#FDF0EE] px-5 py-4"
  >
    <p class="flex items-center gap-2 text-sm font-medium text-[#8E2F25]">
      <Icon name="heroicons:exclamation-triangle-20-solid" class="h-5 w-5 shrink-0" />
      These figures could not be loaded. Check your connection and try again.
    </p>
    <button
      type="button"
      class="rounded-lg bg-[#8E2F25] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-[#74261E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8E2F25] focus-visible:ring-offset-2"
      @click="$emit('retry')"
    >
      Try again
    </button>
  </div>
</template>
