<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  breadcrumbs?: { label: string; to?: string }[]
}>()
</script>

<template>
  <div class="flex flex-col gap-1 mb-6">
    <!-- Breadcrumbs -->
    <nav v-if="breadcrumbs && breadcrumbs.length" class="flex items-center gap-2 mb-2">
      <template v-for="(crumb, index) in breadcrumbs" :key="index">
        <NuxtLink 
          v-if="crumb.to" 
          :to="crumb.to" 
          class="text-sm font-sans text-[#7D5A50] hover:text-[#3B1F0E] transition-colors"
        >
          {{ crumb.label }}
        </NuxtLink>
        <span v-else class="text-sm font-sans font-medium text-[#3B1F0E]">
          {{ crumb.label }}
        </span>
        <Icon 
          v-if="index < breadcrumbs.length - 1" 
          name="heroicons:chevron-right" 
          class="w-4 h-4 text-[#7D5A50]" 
        />
      </template>
    </nav>
    
    <h1 class="font-display text-[32px] font-bold text-[#3B1F0E] leading-tight">
      {{ title }}
    </h1>
    <p v-if="subtitle" class="font-sans text-base text-[#7D5A50]">
      {{ subtitle }}
    </p>
  </div>
</template>
