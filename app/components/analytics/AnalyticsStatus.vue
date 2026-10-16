<script setup lang="ts">
// Shown in place of a tab when its figures could not be loaded, or the plan lacks analytics.
defineProps<{ kind: 'failed' | 'locked' }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    v-if="kind === 'locked'"
    class="rounded-[22px] border border-[#EEDFC4] bg-white px-6 py-10 text-center"
  >
    <Icon name="heroicons:lock-closed" class="mx-auto h-8 w-8 text-[#B4846C]" />
    <h2 class="mt-3 font-display text-lg font-semibold text-[#3B1F0E]">Analytics isn't on your plan</h2>
    <p class="mx-auto mt-1 max-w-sm text-sm text-[#8B6656]">Switch to a plan with Advanced Analytics &amp; Reports to see sales trends, peak hours and branch comparisons.</p>
    <NuxtLink
      to="/owner/subscription"
      class="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7D5A50] px-4 py-2.5 text-sm font-semibold text-[#FFF0D1] transition-colors hover:bg-[#684940] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] focus-visible:ring-offset-2"
    >
      View plans
    </NuxtLink>
  </div>

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
