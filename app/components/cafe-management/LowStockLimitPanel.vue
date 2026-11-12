<script setup lang="ts">
const props = defineProps<{
  thresholdPercent: number | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const hasLimit = computed(() => props.thresholdPercent !== null && props.thresholdPercent > 0)

const exampleServings = computed(() => {
  if (!hasLimit.value || !props.thresholdPercent) return null
  return Math.max(1, Math.floor(50 * (props.thresholdPercent / 100)))
})
</script>

<template>
  <button
    type="button"
    :aria-label="hasLimit ? `Edit low stock alert limit (${thresholdPercent}%). Shared across all branches.` : 'Set low stock alert limit for all branches'"
    class="group w-full md:w-auto text-left rounded-2xl bg-white border border-[#EEDFC4] shadow-sm px-4 py-3.5 sm:px-5 transition-all duration-150 [@media(hover:hover)]:hover:border-[#B4846C] active:scale-[0.99] outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 cursor-pointer flex flex-col justify-between"
    @click="emit('edit')"
  >
    <!-- Top row: Status indicator + percentage + Edit affordance -->
    <div class="flex items-center justify-between gap-5">
      <div class="flex items-center gap-2 min-w-0">
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :class="hasLimit ? 'bg-amber-500' : 'bg-[#B4846C]'"
          aria-hidden="true"
        />
        <span class="text-sm font-extrabold text-[#3D2B24] whitespace-nowrap">
          Low stock limit
        </span>
        <span
          v-if="loading"
          class="text-xs font-semibold text-[#9E7060]"
        >
          · Loading…
        </span>
        <span
          v-else-if="hasLimit"
          class="inline-flex items-center rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5 font-display text-xs font-extrabold text-amber-800 tabular-nums"
        >
          {{ thresholdPercent }}%
        </span>
        <span
          v-else
          class="inline-flex items-center rounded-md bg-[#FAF4ED] border border-[#EEDFC4] px-2 py-0.5 text-xs font-bold text-[#9E7060]"
        >
          Not set
        </span>
      </div>

      <span class="inline-flex items-center gap-1 text-xs font-bold text-[#7D5A50] shrink-0">
        <span class="hidden sm:inline">{{ hasLimit ? 'Edit limit' : 'Set limit' }}</span>
        <Icon name="heroicons:pencil-square" class="w-4 h-4 text-[#B4846C] group-hover:text-[#7D5A50] transition-colors" />
      </span>
    </div>

    <!-- Bottom row: Visual threshold bar + branch & notification scope -->
    <div class="mt-3 space-y-2">
      <div class="h-2 w-full rounded-full bg-[#F5EDE1] overflow-hidden p-[1px]">
        <div
          class="h-full rounded-full transition-all duration-300 ease-out"
          :class="hasLimit ? 'bg-gradient-to-r from-amber-500 to-[#A96746]' : 'bg-[#D9C4A8]'"
          :style="{ width: hasLimit ? `${Math.min(100, Math.max(6, thresholdPercent || 0))}%` : '0%' }"
        />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] font-semibold text-[#7D5A50]">
        <span class="inline-flex items-center gap-1">
          <Icon name="heroicons:building-storefront" class="w-3.5 h-3.5 text-[#A96746] shrink-0" />
          <span>Applies to all branches</span>
        </span>
        <span class="inline-flex items-center gap-1 text-[#9E7060]">
          <Icon name="heroicons:bell-alert" class="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span v-if="hasLimit">Alerts Manager &amp; Owner (e.g. ≤{{ exampleServings }}/50)</span>
          <span v-else>Set % to alert Manager &amp; Owner</span>
        </span>
      </div>
    </div>
  </button>
</template>

