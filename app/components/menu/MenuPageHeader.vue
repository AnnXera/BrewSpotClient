<script setup lang="ts">
import { useOperatingHours } from '~/composables/useOperatingHours'
import MenuBreadcrumbs from '~/components/menu/MenuBreadcrumbs.vue'

defineProps<{
  title: string
  subtitle?: string
  breadcrumbs?: { label: string; to?: string }[]
}>()

const { formattedSummary, isOpenNow } = useOperatingHours()
</script>

<template>
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    <div class="flex flex-col gap-1">
      <!-- Breadcrumbs -->
      <MenuBreadcrumbs v-if="breadcrumbs && breadcrumbs.length" :items="breadcrumbs" class="mb-1" />
      
      <h1 class="font-display text-[32px] font-bold text-[#3B1F0E] leading-tight">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="font-sans text-base text-[#7D5A50]">
        {{ subtitle }}
      </p>
    </div>

    <!-- Chosen Store Operating Hours Badge in Menu Management -->
    <div class="flex items-center gap-3 bg-white p-3.5 px-4.5 rounded-2xl border border-[#EEDFC4] shadow-xs shrink-0 hover:shadow-sm transition-all">
      <div class="w-10 h-10 rounded-xl bg-[#7D5A50]/10 text-[#7D5A50] flex items-center justify-center shrink-0">
        <Icon name="heroicons:clock" class="w-5.5 h-5.5" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-extrabold uppercase text-[#9E7060] tracking-wider">Cafe Operating Hours</span>
          <span 
            class="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.2 rounded-full border"
            :class="isOpenNow ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="isOpenNow ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"></span>
            {{ isOpenNow ? 'Open Now' : 'Closed' }}
          </span>
        </div>
        <p class="text-xs font-extrabold text-[#3B1F0E] mt-0.5">
          {{ formattedSummary }}
        </p>
      </div>
    </div>
  </div>
</template>
