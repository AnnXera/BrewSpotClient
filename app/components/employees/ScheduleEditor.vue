<!-- app/components/employees/ScheduleEditor.vue -->
<!-- Weekly schedule rows (Sunday → Saturday). Each day is either a shift (start–end) or a day off. -->
<script setup lang="ts">
import type { StaffScheduleInput } from '~/services/StaffService'

const props = defineProps<{
  modelValue: StaffScheduleInput[]
  // Keyed by day_of_week, e.g. { 1: 'End time must be after start time.' }
  errors?: Record<number, string>
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: StaffScheduleInput[]]
}>()

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DEFAULT_START = '09:00'
const DEFAULT_END = '17:00'

function update(index: number, patch: Partial<StaffScheduleInput>) {
  const next = props.modelValue.map((day, i) => (i === index ? { ...day, ...patch } : day))
  emit('update:modelValue', next)
}

function setDayOff(index: number) {
  update(index, { is_day_off: true })
}

function setHours(index: number) {
  const day = props.modelValue[index]
  update(index, {
    is_day_off: false,
    // Keep previously entered times if the owner toggles back.
    start_time: day?.start_time || DEFAULT_START,
    end_time: day?.end_time || DEFAULT_END,
  })
}

function applyPreset(preset: 'weekdays' | 'daily' | 'off') {
  if (preset === 'weekdays') {
    const next = props.modelValue.map(day => ({
      ...day,
      is_day_off: day.day_of_week === 0 || day.day_of_week === 6,
      start_time: '09:00',
      end_time: '17:00',
    }))
    emit('update:modelValue', next)
  } else if (preset === 'daily') {
    const next = props.modelValue.map(day => ({
      ...day,
      is_day_off: false,
      start_time: '08:00',
      end_time: '17:00',
    }))
    emit('update:modelValue', next)
  } else if (preset === 'off') {
    const next = props.modelValue.map(day => ({
      ...day,
      is_day_off: true,
    }))
    emit('update:modelValue', next)
  }
}
</script>

<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden shadow-2xs">
    <!-- Quick Presets Toolbar -->
    <div class="px-4 py-2.5 bg-[#FAF7F2] border-b border-[#F0E4D3] flex items-center justify-between gap-2 flex-wrap">
      <div class="flex items-center gap-1.5 text-xs font-bold text-[#8A6E64]">
        <Icon name="heroicons:sparkles" class="w-3.5 h-3.5 text-[#B4846C]" />
        <span>Quick fill:</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          :disabled="disabled"
          @click="applyPreset('weekdays')"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-[#E0D0BE] text-[#5C4037] hover:bg-[#FAF4ED] hover:border-[#7D5A50] active:scale-95 transition-all cursor-pointer shadow-2xs disabled:opacity-40"
        >
          Mon–Fri 9am–5pm
        </button>
        <button
          type="button"
          :disabled="disabled"
          @click="applyPreset('daily')"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-[#E0D0BE] text-[#5C4037] hover:bg-[#FAF4ED] hover:border-[#7D5A50] active:scale-95 transition-all cursor-pointer shadow-2xs disabled:opacity-40"
        >
          Daily 8am–5pm
        </button>
        <button
          type="button"
          :disabled="disabled"
          @click="applyPreset('off')"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-[#E0D0BE] text-[#8A6E64] hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer shadow-2xs disabled:opacity-40"
        >
          Clear all
        </button>
      </div>
    </div>

    <!-- Day Rows -->
    <div class="divide-y divide-[#F0E4D3]">
      <div
        v-for="(day, index) in modelValue"
        :key="day.day_of_week"
        class="px-4 py-2.5 flex flex-col gap-2 sm:px-5 sm:flex-row sm:items-center sm:justify-between transition-colors duration-150"
        :class="day.is_day_off ? 'bg-[#FCFAF7]/80' : 'bg-white hover:bg-[#FCFBF8]'"
      >
        <div class="flex items-center gap-2">
          <span
            class="font-display font-bold text-sm min-w-[85px]"
            :class="day.is_day_off ? 'text-[#8A6E64]' : 'text-[#3B1F0E]'"
          >
            {{ DAY_NAMES[day.day_of_week] }}
          </span>
          <span v-if="errors?.[day.day_of_week]" class="text-xs font-bold text-red-600">
            {{ errors[day.day_of_week] }}
          </span>
        </div>

        <div class="flex items-center justify-between gap-4 sm:justify-end sm:gap-6">
          <div class="flex-1 min-w-0 sm:flex-none sm:w-[260px]">
            <!-- Day off badge -->
            <div
              v-if="day.is_day_off"
              class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF4ED] border border-[#EEDFC4] text-xs font-bold text-[#8A6E64] select-none"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-[#A8988B]"></span>
              <span>Day Off</span>
            </div>

            <!-- Shift hours picker -->
            <div v-else class="flex items-center gap-2 tabular-nums">
              <input
                :value="day.start_time"
                type="time"
                :aria-label="`${DAY_NAMES[day.day_of_week]} start time`"
                :disabled="disabled"
                class="w-full min-w-0 bg-[#FCFAF8] border rounded-xl px-2.5 py-1.5 font-bold text-xs sm:text-sm text-[#2D201B] shadow-2xs focus:outline-none focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 transition-all cursor-pointer disabled:opacity-50"
                :class="errors?.[day.day_of_week] ? 'border-red-400 bg-red-50/50' : 'border-[#D8C7B5] hover:border-[#B4846C]'"
                @input="update(index, { start_time: ($event.target as HTMLInputElement).value })"
              />
              <span class="text-xs font-bold text-[#A8988B] uppercase shrink-0">to</span>
              <input
                :value="day.end_time"
                type="time"
                :aria-label="`${DAY_NAMES[day.day_of_week]} end time`"
                :disabled="disabled"
                class="w-full min-w-0 bg-[#FCFAF8] border rounded-xl px-2.5 py-1.5 font-bold text-xs sm:text-sm text-[#2D201B] shadow-2xs focus:outline-none focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 transition-all cursor-pointer disabled:opacity-50"
                :class="errors?.[day.day_of_week] ? 'border-red-400 bg-red-50/50' : 'border-[#D8C7B5] hover:border-[#B4846C]'"
                @input="update(index, { end_time: ($event.target as HTMLInputElement).value })"
              />
            </div>
          </div>

          <!-- Action Button: Set Hours / Set Day Off -->
          <button
            type="button"
            :disabled="disabled"
            class="shrink-0 w-[100px] flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            :class="day.is_day_off
              ? 'bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA]'
              : 'bg-white border border-[#D8C7B5] text-[#7D5A50] hover:bg-[#FAF4ED] hover:border-[#B4846C]'"
            @click="day.is_day_off ? setHours(index) : setDayOff(index)"
          >
            {{ day.is_day_off ? 'Set Hours' : 'Set Day Off' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
