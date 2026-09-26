<script setup lang="ts">
defineProps<{
  items: { label: string; to?: string }[]
}>()
</script>

<template>
  <nav class="flex flex-wrap items-center gap-2 font-display text-sm">
    <template v-for="(crumb, index) in items" :key="index">
      <NuxtLink
        v-if="crumb.to"
        :to="crumb.to"
        class="font-medium text-[#9E7060] hover:text-[#3D2B24] transition-colors"
      >
        {{ crumb.label }}
      </NuxtLink>
      <span v-else class="font-semibold text-[#3D2B24]">{{ crumb.label }}</span>
      <span v-if="index < items.length - 1" class="font-medium text-[#9E7060]">/</span>
    </template>
  </nav>
</template>
