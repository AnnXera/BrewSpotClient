<script setup lang="ts">
import { computed } from 'vue'
import { useOperatingHours } from '~/composables/useOperatingHours'

// Cafe-wide hours at a glance: shows today's schedule and button to edit.
const emit = defineEmits<{
  (e: 'edit'): void
}>()

const {
  weekView,
  isOpenNow,
  isLoaded,
  nextChangeText,
  formattedSummary,
  formatTime12h
} = useOperatingHours()

// Today's schedule entry
const todaySchedule = computed(() => {
  return weekView.value?.find(d => d.isToday)
})
</script>

<template>
  <div
    role="region"
    aria-label="Today's operating hours"
    class="w-full sm:w-auto inline-flex items-center justify-between gap-4 sm:gap-6 bg-white rounded-2xl border border-[#EEDFC4] shadow-[0_2px_12px_rgba(59,31,14,0.03)] hover:shadow-[0_4px_16px_rgba(59,31,14,0.06)] hover:border-[#D4C3B2] p-3 sm:py-3 sm:px-4.5 transition-all duration-160 ease-out select-none"
  >
    <!-- Left: Clock Icon + Day Today & Operating Time -->
    <div class="flex items-center gap-3 min-w-0">
      <!-- Tactile Clock Icon -->
      <div class="w-10 h-10 rounded-xl bg-[#FAF4ED] text-[#7B5A50] border border-[#EEDFC4] flex items-center justify-center shrink-0 shadow-2xs">
        <Icon name="heroicons:clock" class="w-5 h-5" />
      </div>

      <!-- Text: Day Today + The Time -->
      <div class="flex flex-col min-w-0">
        <!-- Top line: Live Status + Day Today -->
        <div class="flex items-center gap-2 flex-wrap min-w-0">
          <span
            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border shadow-2xs shrink-0"
            :class="isOpenNow 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-[#FAF4ED] text-[#7B5A50] border-[#EEDFC4]'"
          >
            <span
              class="w-1.5 h-1.5 rounded-full shrink-0"
              :class="isOpenNow ? 'bg-emerald-500 animate-pulse' : 'bg-[#7B5A50]'"
              aria-hidden="true"
            ></span>
            <span>{{ isOpenNow ? 'Open now' : 'Closed now' }}</span>
          </span>

          <span class="text-xs font-extrabold uppercase tracking-wider text-[#482D25] truncate">
            Today ({{ todaySchedule?.day || 'Today' }})
          </span>

          <span v-if="nextChangeText" class="text-xs font-semibold text-[#8A6E64] tabular-nums whitespace-nowrap hidden sm:inline">
            · {{ nextChangeText }}
          </span>
        </div>

        <!-- Bottom line: The Time (AM and PM clearly shown) -->
        <div class="mt-0.5 flex items-center gap-1.5">
          <template v-if="!isLoaded">
            <span class="text-xs text-[#8A6E64] font-medium">Loading schedule…</span>
          </template>
          <template v-else-if="!todaySchedule?.isOpen">
            <span class="text-xs sm:text-sm font-bold text-[#A8988B]">Closed today</span>
          </template>
          <template v-else-if="todaySchedule?.is24Hours">
            <span class="text-xs sm:text-sm font-bold text-emerald-700">Open 24 Hours</span>
          </template>
          <template v-else>
            <div class="flex items-baseline gap-1 font-display text-xs sm:text-sm font-extrabold text-[#2D201B] tabular-nums tracking-tight">
              <span>{{ formatTime12h(todaySchedule?.openTime) }}</span>
              <span class="text-xs text-[#8A6E64] font-normal mx-0.5">–</span>
              <span>{{ formatTime12h(todaySchedule?.closeTime) }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Right: Edit Hours Button (Click to show edit modal) -->
    <button
      type="button"
      @click="emit('edit')"
      class="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs font-bold transition-all duration-160 active:scale-95 cursor-pointer shadow-2xs shrink-0 group/btn"
    >
      <span>Edit hours</span>
      <Icon name="heroicons:pencil-square" class="w-3.5 h-3.5 text-[#E7D6CB] group-hover/btn:rotate-6 transition-transform duration-160" />
    </button>
  </div>
</template>
