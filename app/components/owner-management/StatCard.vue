<!-- app/components/owner-management/StatCard.vue -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    value: number | string | null | undefined
    label: string
    color?: string
  }>(),
  {
    color: '#3B1F0E',
  }
)
</script>

<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6">
    <p class="font-display text-3xl font-bold" :style="{ color }">{{ value ?? '—' }}</p>
    <p class="font-sans text-sm text-[#3B1F0E]/60 mt-1">{{ label }}</p>
  </div>
</template>