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
  <section class="bg-white border border-[#EDD8CC] rounded-2xl px-[22px] py-[18px] flex flex-col gap-4 max-h-[551px]">
    <div class="flex items-baseline justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h2 class="font-display font-semibold text-[24px] text-[#3D2B24]">Spoilage</h2>
        <p class="font-display text-[12px] text-[#9E7060]">Logged by staff on the registers. Void an entry that was logged by mistake.</p>
      </div>
      <span class="font-display text-[14px] text-[#7D5A50] whitespace-nowrap tabular-nums">
        {{ total }} serving{{ total === 1 ? '' : 's' }} today
      </span>
    </div>

    <div class="flex-1 overflow-y-auto flex flex-col pr-2">
      <p v-if="loading" class="text-[14px] text-[#9E7060]">Loading...</p>
      <p v-else-if="!entries.length" class="text-[14px] text-[#9E7060]">Nothing logged as spoiled today.</p>
      <div
        v-for="e in entries"
        :key="e.uuid"
        class="flex items-center gap-3 py-3 border-b border-[#EDD8CC] last:border-b-0 first:pt-0"
      >
        <div class="flex-1 min-w-0 flex flex-col gap-0.5" :class="{ 'opacity-60': e.voided_at }">
          <div class="flex items-center justify-between gap-2 font-display font-medium text-[16px] text-[#3D2B24]">
            <span class="truncate" :class="{ 'line-through': e.voided_at }">
              {{ spoilageItemLabel(e) }} &bull; {{ e.quantity }}x
            </span>
            <span class="shrink-0">{{ time(e.created_at) }}</span>
          </div>
          <p class="font-display text-[12px] text-[#9E7060]">
            <template v-if="e.reason">{{ spoilageReasonLabels[e.reason] }} &bull; </template>{{ e.logged_by ?? 'Unknown' }}<template v-if="e.device_name"> on {{ e.device_name }}</template>
          </p>
          <p v-if="e.voided_at" class="font-display text-[12px] font-semibold text-[#7D5A50]">
            Voided by {{ e.voided_by ?? 'a manager' }} at {{ time(e.voided_at) }}
          </p>
        </div>
        <button
          v-if="!e.voided_at"
          type="button"
          :disabled="voidingUuid === e.uuid"
          class="shrink-0 min-h-11 rounded-[10px] px-3 text-[13px] font-semibold text-[#9E4F47] border border-[#DED4CA] hover:bg-[#F1E9DE] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E4F47] transition-colors"
          :aria-label="`Void ${e.quantity} spoiled ${spoilageItemLabel(e)}`"
          @click="emit('void', e)"
        >
          {{ voidingUuid === e.uuid ? 'Voiding...' : 'Void' }}
        </button>
      </div>
    </div>
  </section>
</template>
