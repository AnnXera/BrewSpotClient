<!-- app/components/employees/StatCard.vue -->
<script setup lang="ts">
defineProps<{
  label: string
  value: number | null | undefined
  // Small caption under the value, e.g. "incl. 1 suspended"
  hint?: string | null
}>()
</script>

<template>
  <div class="bg-white border border-[#EDD8CC] rounded-2xl px-4 py-3.5 flex flex-col gap-1.5 min-w-0
              sm:px-[22px] sm:py-[18px]">
    <p class="font-display font-bold text-xs text-[#9E7060] uppercase tracking-[0.1px] truncate
              sm:text-sm">
      {{ label }}
    </p>
    <div class="flex items-baseline justify-between gap-2">
      <p class="font-display font-bold text-2xl text-[#3D2B24]
                sm:text-[28px]">
        {{ value ?? '—' }}
      </p>
      <p v-if="hint" class="font-sans text-xs text-[#9E7060] truncate">{{ hint }}</p>
    </div>
  </div>
</template>
