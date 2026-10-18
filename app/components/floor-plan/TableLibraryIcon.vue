<script setup lang="ts">
defineProps<{
  shape: 'round' | 'long' | 'square' | 'booth' | 'communal'
}>()
</script>

<template>
  <svg viewBox="0 0 48 48" class="size-[30px] text-[#A96746]" fill="none" aria-hidden="true">
    <circle v-if="shape === 'round'" cx="24" cy="24" r="12" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2.5" />
    <rect v-else-if="shape === 'communal'" x="17" y="5" width="14" height="38" rx="2.5" stroke="currentColor" stroke-width="2" />
    <template v-else-if="shape === 'booth'">
      <rect x="13" y="17" width="22" height="14" rx="2" stroke="currentColor" stroke-width="2" />
      <rect x="14" y="10" width="8" height="4" rx="2" fill="currentColor" />
      <rect x="26" y="10" width="8" height="4" rx="2" fill="currentColor" />
      <rect x="14" y="34" width="8" height="4" rx="2" fill="currentColor" />
      <rect x="26" y="34" width="8" height="4" rx="2" fill="currentColor" />
    </template>
    <rect v-else x="13" y="17" width="22" height="14" rx="2" stroke="currentColor" stroke-width="2" />
    <path v-if="shape === 'long'" d="M10 14V34M38 14V34" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  </svg>
</template>
