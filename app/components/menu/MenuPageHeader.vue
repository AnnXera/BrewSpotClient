<script setup lang="ts">
import MenuBreadcrumbs from '~/components/menu/MenuBreadcrumbs.vue'

defineProps<{
  title: string
  subtitle?: string
  breadcrumbs?: { label: string; to?: string }[]
  // Leading icon on the subtitle line
  icon?: string
}>()
</script>

<template>
  <!-- Same format as the Servings header: big tight title, icon-led subtitle line -->
  <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
    <div class="min-w-0">
      <!-- Breadcrumbs -->
      <MenuBreadcrumbs v-if="breadcrumbs && breadcrumbs.length" :items="breadcrumbs" class="mb-1.5" />

      <div class="flex flex-wrap items-baseline gap-3">
        <h1 class="font-display text-[30px] sm:text-[34px] md:text-[38px] font-bold leading-tight tracking-[-0.02em] text-[#3B1F0E]">
          {{ title }}
        </h1>
        <slot name="title-actions" />
      </div>

      <p v-if="subtitle" class="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#8B6656]">
        <Icon v-if="icon" :name="icon" class="h-3.5 w-3.5 shrink-0 text-[#B4846C]" />
        <span>{{ subtitle }}</span>
      </p>
    </div>

    <!-- Page-level actions on the right -->
    <div v-if="$slots.actions" class="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
      <slot name="actions" />
    </div>
  </header>
</template>
