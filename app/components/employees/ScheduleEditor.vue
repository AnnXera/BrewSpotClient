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
</script>

<template>
  <div class="bg-white border border-[#EDD8CC] rounded-2xl overflow-hidden">
    <div
      v-for="(day, index) in modelValue"
      :key="day.day_of_week"
      class="px-4 py-3 flex flex-col gap-2.5 sm:px-[22px] sm:flex-row sm:items-center sm:justify-between"
      :class="day.is_day_off ? 'bg-[#E3E3E3]' : 'bg-white'"
    >
      <div class="flex flex-col">
        <p
          class="font-sans font-semibold text-base leading-[26px]"
          :class="day.is_day_off ? 'text-[#5A5A5A]' : 'text-[#3D2B24]'"
        >
          {{ DAY_NAMES[day.day_of_week] }}
        </p>
        <p v-if="errors?.[day.day_of_week]" class="font-sans text-xs text-red-600">{{ errors[day.day_of_week] }}</p>
      </div>

      <div class="flex items-center justify-between gap-6 sm:justify-end sm:gap-10">
        <!-- Both states share one fixed-width slot so "Day Off" lines up with the time inputs. -->
        <div class="flex-1 min-w-0 sm:flex-none sm:w-[250px]">
          <!-- Day off -->
          <div
            v-if="day.is_day_off"
            class="w-full flex items-center justify-center px-4 py-1.5 rounded-lg bg-[#DDDDDD] border border-[#5A5A5A] font-display font-semibold text-base leading-[26px] text-[#5A5A5A]"
          >
            Day Off
          </div>

          <!-- Shift hours -->
          <div v-else class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input
              :value="day.start_time"
              type="time"
              :aria-label="`${DAY_NAMES[day.day_of_week]} start time`"
              :disabled="disabled"
              class="w-full min-w-0 bg-white border-[0.5px] rounded-lg px-2.5 py-2 font-display font-medium text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
              :class="errors?.[day.day_of_week] ? 'border-red-500' : 'border-[#5A5A5A]'"
              @input="update(index, { start_time: ($event.target as HTMLInputElement).value })"
            />
            <span class="font-sans font-medium text-sm text-black">-</span>
            <input
              :value="day.end_time"
              type="time"
              :aria-label="`${DAY_NAMES[day.day_of_week]} end time`"
              :disabled="disabled"
              class="w-full min-w-0 bg-white border-[0.5px] rounded-lg px-2.5 py-2 font-display font-medium text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
              :class="errors?.[day.day_of_week] ? 'border-red-500' : 'border-[#5A5A5A]'"
              @input="update(index, { end_time: ($event.target as HTMLInputElement).value })"
            />
          </div>
        </div>

        <button
          type="button"
          :disabled="disabled"
          class="shrink-0 w-[102px] flex items-center justify-center px-4 py-1.5 rounded-lg bg-[#3D2B24] font-display font-semibold text-base leading-[26px] text-[#FFF0D1] whitespace-nowrap hover:bg-[#2C1609] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
          @click="day.is_day_off ? setHours(index) : setDayOff(index)"
        >
          {{ day.is_day_off ? 'Set Hours' : 'Day Off' }}
        </button>
      </div>
    </div>
  </div>
</template>
