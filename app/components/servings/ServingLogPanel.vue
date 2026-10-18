<!-- app/components/servings/ServingLogPanel.vue -->
<script setup lang="ts">
import type { ServingLogEntry } from '~/services/ServingService'

defineProps<{ entries: ServingLogEntry[]; loading: boolean }>()

function time(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
}
</script>

<template>
  <section class="bg-white border border-[#E3CFB4] rounded-2xl flex flex-col h-[520px] shadow-2xs overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E3CFB4]/70">
      <div class="flex items-center gap-2.5">
        <div class="size-8 rounded-lg bg-[#FDF3E7] border border-[#E3CFB4] flex items-center justify-center text-[#7D5A50] shrink-0">
          <Icon name="heroicons:clock" class="w-4 h-4" />
        </div>
        <div>
          <h2 class="font-display font-bold text-[18px] text-[#3B1F0E] leading-tight">Serving Log</h2>
          <p class="text-[12px] text-[#8B6656]">Real-time history of today's servings</p>
        </div>
      </div>
      <span class="rounded-full bg-[#FDF3E7] border border-[#E3CFB4] px-2.5 py-0.5 text-xs font-semibold text-[#7D5A50] tabular-nums">
        {{ entries.length }} recorded
      </span>
    </div>

    <!-- Scrollable entries list -->
    <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-thin">
      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div v-for="n in 5" :key="n" class="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF4ED]/50 animate-pulse">
          <div class="size-11 rounded-xl bg-[#EBE0D2]" />
          <div class="flex-1 space-y-1.5">
            <div class="h-4 w-36 bg-[#EBE0D2] rounded" />
            <div class="h-3 w-20 bg-[#EBE0D2]/70 rounded" />
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div v-else-if="!entries.length" class="flex flex-col items-center justify-center h-full text-center py-8">
        <div class="size-12 rounded-full bg-[#FDF3E7] border border-[#E3CFB4] flex items-center justify-center text-[#9E7060] mb-2">
          <Icon name="heroicons:clock" class="w-6 h-6" />
        </div>
        <p class="font-display font-medium text-[14px] text-[#3B1F0E]">Nothing served yet today</p>
        <p class="text-[12px] text-[#8B6656] mt-0.5">Completed orders will appear here in chronological order.</p>
      </div>

      <!-- Log Rows -->
      <div
        v-else
        v-for="e in entries"
        :key="e.uuid"
        class="log-row flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#FAF4ED]/60 border border-transparent hover:border-[#EBE0D2] transition-colors duration-150"
      >
        <img
          v-if="e.picture"
          :src="e.picture"
          :alt="e.menu_name ?? ''"
          class="size-11 rounded-xl object-cover shrink-0 border border-[#E3CFB4]/60"
        >
        <div v-else class="size-11 rounded-xl bg-[#FDF3E7] border border-[#E3CFB4]/60 flex items-center justify-center shrink-0">
          <Icon name="heroicons:cake" class="w-5 h-5 text-[#9E7060]" />
        </div>

        <div class="flex-1 min-w-0 flex flex-col gap-1">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="font-display font-semibold text-[14px] text-[#3B1F0E] truncate">
                {{ e.menu_name ?? 'Removed item' }}
              </span>
              <span class="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded bg-[#7D5A50]/10 text-[#7D5A50] shrink-0">
                {{ e.quantity }}x
              </span>
            </div>
            <span class="font-mono text-[12px] text-[#8B6656] tabular-nums shrink-0">
              {{ time(e.sold_at) }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px] font-medium text-[#7D5A50] bg-[#FAF4ED] border border-[#EBE0D2] rounded px-1.5 py-0.2">
              {{ e.order_number }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #E3CFB4;
  border-radius: 9999px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #B4846C;
}
</style>
