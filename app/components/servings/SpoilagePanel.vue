<!-- app/components/servings/SpoilagePanel.vue -->
<script setup lang="ts">
import { spoilageItemLabel, spoilageReasonLabels, type SpoilageLog } from '~/services/PosService'

defineProps<{ entries: SpoilageLog[]; total: number; loading: boolean; voidingUuid: string | null }>()

const emit = defineEmits<{ void: [entry: SpoilageLog] }>()

function time(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
}
</script>

<template>
  <section class="bg-white border border-[#E3CFB4] rounded-2xl flex flex-col max-h-[551px] shadow-2xs overflow-hidden">
    <!-- Header: matches the Serving Log and Ingredients panels -->
    <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-[#E3CFB4]/70">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="size-8 rounded-lg bg-[#FDF3E7] border border-[#E3CFB4] flex items-center justify-center text-[#7D5A50] shrink-0">
          <Icon name="heroicons:archive-box-x-mark" class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <h2 class="font-display font-bold text-[17px] sm:text-[18px] text-[#3B1F0E] leading-tight truncate">Spoilage</h2>
          <p class="text-[12px] text-[#8B6656]">Logged by staff on the registers. Void an entry that was logged by mistake.</p>
        </div>
      </div>
      <span class="rounded-full bg-[#FDF3E7] border border-[#E3CFB4] px-2.5 py-0.5 text-xs font-semibold text-[#7D5A50] tabular-nums shrink-0 whitespace-nowrap">
        {{ total }} serving{{ total === 1 ? '' : 's' }} today
      </span>
    </div>

    <div class="flex-1 overflow-y-auto flex flex-col px-5 py-2">
      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div v-for="n in 3" :key="n" class="flex items-center gap-3 py-3 animate-pulse">
          <div class="flex-1 space-y-1.5">
            <div class="h-4 w-40 bg-[#EBE0D2] rounded" />
            <div class="h-3 w-56 bg-[#EBE0D2]/70 rounded" />
          </div>
          <div class="h-9 w-16 bg-[#EBE0D2] rounded-xl" />
        </div>
      </template>

      <!-- Empty State -->
      <div v-else-if="!entries.length" class="flex flex-col items-center justify-center text-center py-8">
        <div class="size-12 rounded-full bg-[#FDF3E7] border border-[#E3CFB4] flex items-center justify-center text-[#9E7060] mb-2">
          <Icon name="heroicons:archive-box-x-mark" class="w-6 h-6" />
        </div>
        <p class="font-display font-medium text-[14px] text-[#3B1F0E]">Nothing logged as spoiled today</p>
        <p class="text-[12px] text-[#8B6656] mt-0.5">Spoiled servings logged on the registers will appear here.</p>
      </div>

      <template v-else>
      <div
        v-for="e in entries"
        :key="e.uuid"
        class="flex items-center gap-3 py-3 border-b border-[#F0E4D3] last:border-b-0"
      >
        <div class="flex-1 min-w-0 flex flex-col gap-0.5" :class="{ 'opacity-60': e.voided_at }">
          <div class="flex items-center justify-between gap-2 font-display font-medium text-[16px] text-[#3D2B24]">
            <span class="truncate" :class="{ 'line-through': e.voided_at }">
              {{ spoilageItemLabel(e) }} &bull; {{ e.quantity }}x
            </span>
            <span class="shrink-0">{{ time(e.created_at) }}</span>
          </div>
          <p class="font-display text-[12px] text-[#9E7060]">
            <template v-if="e.reason">{{ spoilageReasonLabels[e.reason] }} &bull; </template>{{ e.logged_by ?? 'Unknown' }}<template v-if="e.device_name"> on {{ e.device_name }}</template><template v-if="e.approved_by">, approved by {{ e.approved_by }}</template>
          </p>
          <p v-if="e.voided_at" class="font-display text-[12px] font-semibold text-[#7D5A50]">
            Voided by {{ e.voided_by ?? 'a manager' }} at {{ time(e.voided_at) }}
          </p>
        </div>
        <button
          v-if="!e.voided_at"
          type="button"
          :disabled="voidingUuid === e.uuid"
          class="shrink-0 h-9 rounded-xl px-3.5 text-[13px] font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-all cursor-pointer"
          :aria-label="`Void ${e.quantity} spoiled ${spoilageItemLabel(e)}`"
          @click="emit('void', e)"
        >
          {{ voidingUuid === e.uuid ? 'Voiding...' : 'Void' }}
        </button>
      </div>
      </template>
    </div>
  </section>
</template>
