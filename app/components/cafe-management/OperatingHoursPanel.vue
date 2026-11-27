<script setup lang="ts">
import { computed } from 'vue'
import { useOperatingHours } from '~/composables/useOperatingHours'

// Cafe-wide hours at a glance: today's hours and live status, the week as a strip, and an edit button.
// Styled like the page's stat cards (uppercase label, big value). The edit modal is separate.
const emit = defineEmits<{
  (e: 'edit'): void
}>()

const {
  weekView,
  isOpenNow,
  isLoaded,
  nextChangeText,
  formatTime12h
} = useOperatingHours()

const todaySchedule = computed(() => weekView.value?.find(d => d.isToday))

const todayHours = computed(() => {
  const t = todaySchedule.value
  if (!t || !t.isOpen) return 'Closed today'
  if (t.is24Hours) return 'Open 24 hours'
  return `${formatTime12h(t.openTime)} – ${formatTime12h(t.closeTime)}`
})

function dayTitle(d: { day: string; isOpen: boolean; is24Hours?: boolean; openTime: string; closeTime: string }) {
  if (!d.isOpen) return `${d.day}: closed`
  if (d.is24Hours) return `${d.day}: open 24 hours`
  return `${d.day}: ${formatTime12h(d.openTime)} – ${formatTime12h(d.closeTime)}`
}
</script>

<template>
  <div
    role="region"
    aria-label="Opening hours"
    class="w-full sm:w-auto flex items-center gap-3.5 bg-white rounded-2xl border border-[#EDD8CC] shadow-sm px-3.5 py-2 sm:pl-4"
  >
    <!-- Today: label + live status, then hours + next change. Two lines so it matches the title block's height. -->
    <div class="min-w-0 flex-1 sm:flex-none">
      <p class="flex items-center gap-2 whitespace-nowrap">
        <span class="text-[11px] font-bold uppercase tracking-wider text-[#9E7060]">
          Today<template v-if="todaySchedule"> · {{ todaySchedule.day }}</template>
        </span>
        <span v-if="isLoaded" class="inline-flex items-center gap-1 text-[11px] font-semibold" :class="isOpenNow ? 'text-emerald-700' : 'text-[#7D5A50]'">
          <span class="relative flex size-1.5 shrink-0" aria-hidden="true">
            <span v-if="isOpenNow" class="absolute inline-flex size-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
            <span class="relative inline-flex size-1.5 rounded-full" :class="isOpenNow ? 'bg-emerald-500' : 'bg-[#B4846C]'" />
          </span>
          {{ isOpenNow ? 'Open now' : 'Closed now' }}
        </span>
      </p>

      <p v-if="!isLoaded" class="mt-1 h-5 w-32 rounded-md bg-[#F4ECE1] motion-safe:animate-pulse" aria-label="Loading opening hours" />
      <p v-else class="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap">
        <span
          class="font-display text-[15px] font-bold leading-tight tabular-nums"
          :class="todaySchedule?.isOpen ? 'text-[#3D2B24]' : 'text-[#A8988B]'"
        >{{ todayHours }}</span>
        <span v-if="nextChangeText" class="text-[11px] font-medium text-[#9E7060] tabular-nums">· {{ nextChangeText }}</span>
      </p>
    </div>

    <!-- The week at a glance -->
    <div class="hidden md:block self-stretch w-px bg-[#EDD8CC]" aria-hidden="true" />
    <ul v-if="isLoaded" class="hidden md:flex items-center gap-1" aria-label="This week">
      <li
        v-for="d in weekView"
        :key="d.day"
        :title="dayTitle(d)"
        :aria-label="dayTitle(d)"
        class="flex flex-col items-center gap-0.5"
      >
        <span
          class="flex size-6 items-center justify-center rounded-md text-[10px] font-bold"
          :class="d.isToday
            ? 'bg-[#3B1F0E] text-[#FFF8EA] shadow-sm'
            : d.isOpen
              ? 'bg-[#FAF4ED] text-[#7D5A50] border border-[#EEDFC4]'
              : 'border border-dashed border-[#DED4CA] text-[#C2A592]'"
        >
          {{ d.day.charAt(0) }}
        </span>
        <span
          class="size-1 rounded-full"
          :class="!d.isOpen ? 'bg-transparent' : d.is24Hours ? 'bg-emerald-500' : 'bg-[#B4846C]'"
          aria-hidden="true"
        />
      </li>
    </ul>

    <!-- Edit (opens the hours modal) -->
    <button
      type="button"
      class="shrink-0 inline-flex items-center gap-1.5 border border-[#EDD8CC] bg-white rounded-[10px] px-3 py-1.5 text-[13px] font-semibold text-[#7D5A50] hover:bg-[#FFF8EA] hover:border-[#D8C7B5] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
      @click="emit('edit')"
    >
      <Icon name="heroicons:clock" class="size-4" />
      Edit hours
    </button>
  </div>
</template>
