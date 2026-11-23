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

function toggle(index: number) {
  if (props.modelValue[index]?.is_day_off) setHours(index)
  else setDayOff(index)
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

// Minutes between two "HH:MM" times; null when the shift doesn't end after it starts.
function shiftMinutes(day: StaffScheduleInput): number | null {
  if (day.is_day_off || !day.start_time || !day.end_time) return null
  const [sh, sm] = day.start_time.split(':').map(Number)
  const [eh, em] = day.end_time.split(':').map(Number)
  const mins = (eh! * 60 + em!) - (sh! * 60 + sm!)
  return mins > 0 ? mins : null
}

function hoursLabel(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const workingDays = computed(() => props.modelValue.filter(d => !d.is_day_off).length)
const weeklyMinutes = computed(() => props.modelValue.reduce((a, d) => a + (shiftMinutes(d) ?? 0), 0))

const PRESETS = [
  { key: 'weekdays', label: 'Mon–Fri, 9–5' },
  { key: 'daily', label: 'Every day, 8–5' },
  { key: 'off', label: 'Clear all' },
] as const
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-[#EEDFC4] bg-white">
    <!-- Summary + quick fill -->
    <div class="flex flex-col gap-3 border-b border-[#F0E4D3] bg-[#FCFAF6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p class="text-[13px] text-[#8A6E64]">
        <span class="font-semibold text-[#3B1F0E]">{{ workingDays }}</span> working {{ workingDays === 1 ? 'day' : 'days' }}
        <template v-if="weeklyMinutes">
          <span class="mx-1.5 text-[#D8C7B5]">·</span>
          <span class="font-semibold text-[#3B1F0E]">{{ hoursLabel(weeklyMinutes) }}</span> a week
        </template>
      </p>
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="mr-0.5 text-[12px] text-[#A8988B]">Quick fill</span>
        <button
          v-for="p in PRESETS"
          :key="p.key"
          type="button"
          :disabled="disabled"
          class="whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 disabled:opacity-40"
          :class="p.key === 'off'
            ? 'border-transparent text-[#8A6E64] hover:bg-[#F3ECE3] hover:text-[#3B1F0E]'
            : 'border-[#E0D0BE] bg-white text-[#5C4037] hover:border-[#B4846C] hover:bg-[#FAF4ED]'"
          @click="applyPreset(p.key)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- Day rows -->
    <ul class="divide-y divide-[#F3EADF]">
      <li
        v-for="(day, index) in modelValue"
        :key="day.day_of_week"
        class="px-4 py-3 transition-colors sm:px-5"
        :class="day.is_day_off ? 'bg-[#FCFAF7]' : 'bg-white'"
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <!-- Toggle + day -->
          <label class="flex min-w-[150px] flex-1 cursor-pointer items-center gap-3" :class="{ 'cursor-not-allowed opacity-60': disabled }">
            <button
              type="button"
              role="switch"
              :aria-checked="!day.is_day_off"
              :aria-label="`${DAY_NAMES[day.day_of_week]}: ${day.is_day_off ? 'day off' : 'working'}`"
              :disabled="disabled"
              class="relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 focus-visible:ring-offset-2"
              :class="day.is_day_off ? 'bg-[#E3D7C9]' : 'bg-[#3B1F0E]'"
              @click="toggle(index)"
            >
              <span
                class="inline-block size-[18px] rounded-full bg-white shadow-sm transition-transform duration-200"
                :class="day.is_day_off ? 'translate-x-[3px]' : 'translate-x-[19px]'"
              />
            </button>
            <span class="min-w-0">
              <span class="block font-display text-[15px] font-semibold" :class="day.is_day_off ? 'text-[#A8988B]' : 'text-[#3B1F0E]'">
                {{ DAY_NAMES[day.day_of_week] }}
              </span>
              <span class="block text-[12px]" :class="day.is_day_off ? 'text-[#B8A99C]' : 'text-[#8A6E64]'">
                <template v-if="day.is_day_off">Day off</template>
                <template v-else-if="shiftMinutes(day)">{{ hoursLabel(shiftMinutes(day)!) }} shift</template>
                <template v-else>Set the hours</template>
              </span>
            </span>
          </label>

          <!-- Hours -->
          <div v-if="!day.is_day_off" class="flex items-center gap-2 tabular-nums">
            <input
              :value="day.start_time"
              type="time"
              :aria-label="`${DAY_NAMES[day.day_of_week]} start time`"
              :disabled="disabled"
              class="time-input h-10 w-[128px] rounded-xl border bg-white px-3 text-[14px] font-semibold text-[#2D201B] transition-colors focus:border-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#3B1F0E]/12 disabled:opacity-50"
              :class="errors?.[day.day_of_week] ? 'border-red-400 bg-red-50/50' : 'border-[#E0D0BE] hover:border-[#B4846C]'"
              @input="update(index, { start_time: ($event.target as HTMLInputElement).value })"
            />
            <Icon name="heroicons:arrow-long-right" class="h-4 w-4 shrink-0 text-[#C9B39A]" aria-hidden="true" />
            <input
              :value="day.end_time"
              type="time"
              :aria-label="`${DAY_NAMES[day.day_of_week]} end time`"
              :disabled="disabled"
              class="time-input h-10 w-[128px] rounded-xl border bg-white px-3 text-[14px] font-semibold text-[#2D201B] transition-colors focus:border-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#3B1F0E]/12 disabled:opacity-50"
              :class="errors?.[day.day_of_week] ? 'border-red-400 bg-red-50/50' : 'border-[#E0D0BE] hover:border-[#B4846C]'"
              @input="update(index, { end_time: ($event.target as HTMLInputElement).value })"
            />
          </div>
        </div>

        <p v-if="errors?.[day.day_of_week]" class="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-red-600">
          <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0" />
          {{ errors[day.day_of_week] }}
        </p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.time-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.55;
}
.time-input::-webkit-calendar-picker-indicator:hover {
  opacity: 0.9;
}
</style>
