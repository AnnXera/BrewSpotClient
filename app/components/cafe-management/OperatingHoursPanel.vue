<script setup lang="ts">
import { useOperatingHours } from '~/composables/useOperatingHours'

// Cafe-wide hours at a glance. The whole panel opens the editor.
const emit = defineEmits<{
  (e: 'edit'): void
}>()

const { weekView, isOpenNow, isLoaded, nextChangeText, formattedSummary } = useOperatingHours()

// Compact time for the day strip: "8a", "10:30p".
function shortTime(t: string) {
  const [h = 0, m = 0] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'p' : 'a'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`
}
</script>

<template>
  <button
    type="button"
    @click="emit('edit')"
    :aria-label="`Edit opening hours. ${formattedSummary}`"
    class="group w-full md:w-auto text-left rounded-2xl bg-white border border-[#EEDFC4] shadow-sm px-4 py-3.5 sm:px-5 transition-colors [@media(hover:hover)]:hover:border-[#B4846C] outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
  >
    <!-- Live state + edit affordance -->
    <div class="flex items-center justify-between gap-6">
      <div v-if="isLoaded" class="flex items-center gap-2 min-w-0">
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :class="isOpenNow ? 'bg-emerald-500' : 'bg-[#B4846C]'"
          aria-hidden="true"
        ></span>
        <span class="text-sm font-extrabold whitespace-nowrap" :class="isOpenNow ? 'text-emerald-700' : 'text-[#7D5A50]'">
          {{ isOpenNow ? 'Open now' : 'Closed now' }}
        </span>
        <span class="text-sm font-medium text-[#9E7060] truncate">· {{ nextChangeText }}</span>
      </div>
      <span v-else class="text-sm font-medium text-[#9E7060]">Loading hours…</span>

      <span class="inline-flex items-center gap-1 text-xs font-bold text-[#7D5A50] shrink-0">
        <span class="hidden sm:inline">Edit hours</span>
        <Icon name="heroicons:pencil-square" class="w-4 h-4 text-[#B4846C] group-hover:text-[#7D5A50] transition-colors" />
      </span>
    </div>

    <!-- The week: today highlighted, closed days muted -->
    <ol class="mt-3 grid grid-cols-7 gap-1" aria-hidden="true">
      <li
        v-for="d in weekView"
        :key="d.day"
        :title="`${d.day}: ${d.text}${d.overnight ? ' (closes next day)' : ''}`"
        class="flex flex-col items-center rounded-lg px-0.5 sm:px-1 py-1.5 sm:min-w-[44px] tabular-nums"
        :class="d.isToday
          ? 'bg-[#7D5A50] text-white'
          : d.isOpen ? 'bg-[#FDF8F3] text-[#3D2B24]' : 'text-[#B4846C]'"
      >
        <span class="text-[11px] font-extrabold">{{ d.short }}</span>
        <span
          class="mt-0.5 text-[10px] font-semibold leading-tight whitespace-nowrap text-center"
          :class="d.isToday ? 'text-white/85' : d.isOpen ? 'text-[#7D5A50]' : 'text-[#B4846C]'"
        >
          <template v-if="!d.isOpen">Closed</template>
          <template v-else-if="d.is24Hours">24h</template>
          <template v-else>
            <span class="block sm:inline">{{ shortTime(d.openTime) }}</span><span class="hidden sm:inline">-</span><span class="block sm:inline">{{ shortTime(d.closeTime) }}</span>
          </template>
        </span>
      </li>
    </ol>
  </button>
</template>
