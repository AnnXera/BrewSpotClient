<!-- app/components/owner-management/StatCard.vue -->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number | string | null | undefined
    label: string
    color?: string
    icon?: string
    description?: string
  }>(),
  {
    color: '',
    icon: '',
    description: '',
  }
)

// Smart defaults based on the metric category
const meta = computed(() => {
  const lbl = props.label.toLowerCase()

  if (lbl.includes('active')) {
    return {
      icon: props.icon || 'heroicons:check-circle',
      description: props.description || 'Active on platform',
    }
  }

  if (lbl.includes('suspended') || lbl.includes('inactive')) {
    return {
      icon: props.icon || 'heroicons:no-symbol',
      description: props.description || 'Suspended or inactive',
    }
  }

  // Default / Total
  return {
    icon: props.icon || 'heroicons:users',
    description: props.description || 'Registered operators',
  }
})
</script>

<template>
  <div
    class="bg-white border border-[#EEDFC4] rounded-2xl p-4 sm:p-5 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out hover:shadow-md hover:border-[#D9C4B8] hover:-translate-y-0.5 cursor-default flex flex-col justify-between"
  >
    <!-- Top row: Micro-label and tactile icon badge -->
    <div class="flex items-center justify-between gap-2">
      <span class="font-sans text-[11px] font-bold uppercase tracking-wider text-[#9E7060]">
        {{ label }}
      </span>
      <div
        class="w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 bg-[#FAF4ED] text-[#7D5A50] border-[#EEDFC4] shadow-2xs"
      >
        <Icon :name="meta.icon" class="w-4 h-4 text-[#7D5A50]" />
      </div>
    </div>

    <!-- Middle: Prominent counter value -->
    <div class="my-2">
      <p
        class="font-display text-3xl sm:text-4xl font-black tracking-tight leading-none text-[#3D2B24] tabular-nums"
      >
        {{ typeof value === 'number' ? value.toLocaleString() : (value ?? '—') }}
      </p>
    </div>

    <!-- Bottom row: Contextual sub-label -->
    <div class="flex items-center gap-1.5 pt-2 border-t border-[#F7EFE6]">
      <span class="w-1.5 h-1.5 rounded-full shrink-0 bg-[#B4846C]" />
      <span class="font-sans text-xs text-[#7D5A50]/80 truncate">
        {{ meta.description }}
      </span>
    </div>
  </div>
</template>
