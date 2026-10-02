<!-- app/components/servings/ServingLogPanel.vue -->
<script setup lang="ts">
import type { ServingLogEntry } from '~/services/ServingService'

defineProps<{ entries: ServingLogEntry[]; loading: boolean }>()

function time(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
}
</script>

<template>
  <section class="bg-white border border-[#EDD8CC] rounded-2xl px-[22px] py-[18px] flex flex-col gap-4 h-[551px]">
    <h2 class="font-display font-semibold text-[24px] text-[#3D2B24]">Serving Log</h2>

    <div class="flex-1 overflow-y-auto flex flex-col pr-2">
      <p v-if="loading" class="text-[14px] text-[#9E7060]">Loading...</p>
      <p v-else-if="!entries.length" class="text-[14px] text-[#9E7060]">Nothing served yet today.</p>
      <div
        v-for="e in entries"
        :key="e.uuid"
        class="flex items-center gap-[11px] py-3 border-b border-[#EDD8CC] last:border-b-0 first:pt-0"
      >
        <img v-if="e.picture" :src="e.picture" :alt="e.menu_name ?? ''" class="size-[50px] rounded-md object-cover shrink-0">
        <div v-else class="size-[50px] rounded-md bg-[#FFF8EA] flex items-center justify-center shrink-0">
          <Icon name="heroicons:cake" class="w-6 h-6 text-[#9E7060]" />
        </div>
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <div class="flex items-center justify-between gap-2 font-display font-medium text-[16px] text-[#3D2B24]">
            <span class="truncate">{{ e.menu_name ?? 'Removed item' }} &bull; {{ e.quantity }}x</span>
            <span class="shrink-0">{{ time(e.sold_at) }}</span>
          </div>
          <p class="font-display text-[12px] text-[#9E7060]">{{ e.order_number }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
