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
  <div class="bg-white border border-[#EEDFC4] rounded-2xl p-3.5
              min-[360px]:p-4
              sm:p-5
              md:p-6">
    <p class="font-display text-xl font-bold
              min-[360px]:text-2xl
              sm:text-3xl
              md:text-3xl" :style="{ color }">
      {{ value ?? '—' }}
    </p>
    <p class="font-sans text-[11px] text-[#3B1F0E]/60 mt-1
              min-[360px]:text-xs
              sm:text-sm
              md:text-sm">
      {{ label }}
    </p>
  </div>
</template>