<script setup lang="ts">
// Percent change against the previous period. null means there was nothing to compare with.
const props = withDefaults(defineProps<{
  value: number | null
  invert?: boolean // a rise is bad (spoilage, no-shows)
  size?: 'sm' | 'xs'
}>(), { size: 'sm' })

const good = () => (props.value ?? 0) >= 0 !== props.invert
</script>

<template>
  <span
    v-if="value === null"
    class="inline-flex items-center rounded-full bg-[#F3E7D2] font-semibold text-[#8B6656]"
    :class="size === 'xs' ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-[11px]'"
    title="Nothing to compare with in the previous period"
  >New</span>
  <span
    v-else
    class="inline-flex items-center gap-0.5 rounded-full font-semibold tabular-nums"
    :class="[
      size === 'xs' ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-[11px]',
      value === 0 ? 'bg-[#F3E7D2] text-[#8B6656]' : good() ? 'bg-[#E3F4E8] text-[#1F6B3A]' : 'bg-[#FBE4E1] text-[#A2352A]',
    ]"
  >
    <Icon
      v-if="value !== 0"
      :name="value > 0 ? 'heroicons:arrow-up-20-solid' : 'heroicons:arrow-down-20-solid'"
      :class="size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'"
    />
    <span class="sr-only">{{ value > 0 ? 'Up' : value < 0 ? 'Down' : 'No change,' }}</span>{{ Math.abs(value) }}%
  </span>
</template>
