<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useOperatingHours, sanitizeSchedule, DEFAULT_SCHEDULE, type DaySchedule } from '~/composables/useOperatingHours'

const props = defineProps<{
  show: boolean
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', schedule: DaySchedule[]): void
}>()

const { operatingHours } = useOperatingHours()

const weekSchedule = ref<DaySchedule[]>([])
const localError = ref('')
const errorDay = ref<string | null>(null)
const isGlobalCopyOpen = ref(false)
const isPresetOpen = ref(false)
const selectedSourceDay = ref('Monday')
const feedbackToast = ref('')
let toastTimer: any = null

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

// Detect today's day of week in Philippine time (Asia/Manila)
const todayDayName = computed(() => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      weekday: 'long'
    }).formatToParts(new Date())
    return parts.find(p => p.type === 'weekday')?.value ?? ''
  } catch {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' })
  }
})

function notifyToast(msg: string) {
  feedbackToast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    feedbackToast.value = ''
  }, 2500)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (isPresetOpen.value) isPresetOpen.value = false
  else if (isGlobalCopyOpen.value) isGlobalCopyOpen.value = false
  else emit('close')
}

watch(() => props.show, (open) => {
  if (open) {
    weekSchedule.value = sanitizeSchedule(operatingHours.value)
    localError.value = ''
    errorDay.value = null
    isGlobalCopyOpen.value = false
    isPresetOpen.value = false
    selectedSourceDay.value = todayDayName.value || 'Monday'
    feedbackToast.value = ''
  }
  if (import.meta.client) {
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('keydown', onKeydown)
  if (toastTimer) clearTimeout(toastTimer)
})

function closesAfterMidnight(item: DaySchedule) {
  return item.isOpen && !item.is24Hours && !!item.openTime && !!item.closeTime && item.closeTime < item.openTime
}

function getShiftDuration(item: DaySchedule): string {
  if (!item.isOpen) return 'Closed'
  if (item.is24Hours) return '24 hours'
  if (!item.openTime || !item.closeTime) return ''
  const [oh, om] = item.openTime.split(':').map(Number)
  const [ch, cm] = item.closeTime.split(':').map(Number)
  if (isNaN(oh) || isNaN(om) || isNaN(ch) || isNaN(cm)) return ''
  let diffMin = (ch * 60 + cm) - (oh * 60 + om)
  if (diffMin <= 0) diffMin += 24 * 60
  const hours = Math.floor(diffMin / 60)
  const mins = diffMin % 60
  if (mins === 0) return `${hours}h shift`
  return `${hours}h ${mins}m`
}

function toggleDayOpen(item: DaySchedule) {
  item.isOpen = !item.isOpen
  if (item.isOpen && (!item.openTime || !item.closeTime)) {
    item.openTime = '09:00'
    item.closeTime = '17:00'
  }
}

function toggle24Hours(item: DaySchedule) {
  if (!item.isOpen) {
    item.isOpen = true
  }
  item.is24Hours = !item.is24Hours
}

function copySelectedTo(target: 'weekdays' | 'all' | 'weekends') {
  const source = weekSchedule.value.find(d => d.day === selectedSourceDay.value)
  if (!source) return

  weekSchedule.value.forEach(d => {
    if (d.day === source.day) return
    if (target === 'weekdays' && !WEEKDAYS.includes(d.day)) return
    if (target === 'weekends' && WEEKDAYS.includes(d.day)) return
    d.isOpen = source.isOpen
    d.is24Hours = source.is24Hours
    d.openTime = source.openTime
    d.closeTime = source.closeTime
  })
  isGlobalCopyOpen.value = false
  const targetLabel = target === 'weekdays' ? 'all weekdays' : target === 'weekends' ? 'weekends' : 'all 7 days'
  notifyToast(`Copied ${source.day}'s hours to ${targetLabel}`)
}

function onGlobalCopyBlur(e: FocusEvent) {
  const wrapper = e.currentTarget as HTMLElement
  if (!wrapper.contains(e.relatedTarget as Node | null)) {
    isGlobalCopyOpen.value = false
  }
}

function applyPreset(type: 'standard' | 'morning' | 'overnight' | 'cafe' | '24seven') {
  if (type === 'standard') {
    weekSchedule.value.forEach(d => {
      const isWeekday = WEEKDAYS.includes(d.day)
      d.isOpen = isWeekday
      d.is24Hours = false
      d.openTime = '09:00'
      d.closeTime = '17:00'
    })
    notifyToast('Applied Standard Schedule: Mon–Fri 9:00 AM – 5:00 PM')
  } else if (type === 'morning') {
    weekSchedule.value.forEach(d => {
      d.isOpen = true
      d.is24Hours = false
      d.openTime = '06:00'
      d.closeTime = '15:00'
    })
    notifyToast('Applied Morning Shift (MOS): 6:00 AM – 3:00 PM')
  } else if (type === 'overnight') {
    weekSchedule.value.forEach(d => {
      d.isOpen = true
      d.is24Hours = false
      d.openTime = '15:00'
      d.closeTime = '09:00'
    })
    notifyToast('Applied Overnight Shift: 3:00 PM – 9:00 AM (+1 day)')
  } else if (type === 'cafe') {
    weekSchedule.value.forEach(d => {
      d.isOpen = true
      d.is24Hours = false
      d.openTime = '07:00'
      d.closeTime = '20:00'
    })
    notifyToast('Applied Daily Schedule: 7:00 AM – 8:00 PM')
  } else if (type === '24seven') {
    weekSchedule.value.forEach(d => {
      d.isOpen = true
      d.is24Hours = true
      d.openTime = '00:00'
      d.closeTime = '23:59'
    })
    notifyToast('Applied 24/7 Schedule: All 7 days open 24 hours')
  }
}

const PRESETS = [
  { key: 'standard', icon: 'heroicons:briefcase', label: 'Weekdays only', detail: 'Mon–Fri, 9:00 AM – 5:00 PM' },
  { key: 'cafe', icon: 'heroicons:sun', label: 'Daily café hours', detail: 'Every day, 7:00 AM – 8:00 PM' },
  { key: 'morning', icon: 'heroicons:sparkles', label: 'Mornings', detail: 'Every day, 6:00 AM – 3:00 PM' },
  { key: 'overnight', icon: 'heroicons:moon', label: 'Overnight', detail: 'Every day, 3:00 PM – 9:00 AM next day' },
  { key: '24seven', icon: 'heroicons:bolt', label: 'Open 24/7', detail: 'All 7 days, around the clock' },
] as const

function pickPreset(key: (typeof PRESETS)[number]['key']) {
  applyPreset(key)
  isPresetOpen.value = false
}

function onPresetBlur(e: FocusEvent) {
  const wrapper = e.currentTarget as HTMLElement
  if (!wrapper.contains(e.relatedTarget as Node | null)) isPresetOpen.value = false
}

const openDays = computed(() => weekSchedule.value.filter(d => d.isOpen).length)

// Under the day name: "8h", "13h 30m", "Open 24 hours", "Closed".
function dayNote(item: DaySchedule) {
  if (!item.isOpen) return 'Closed'
  if (item.is24Hours) return 'Open 24 hours'
  return getShiftDuration(item).replace(' shift', '')
}

function handleResetDefaults() {
  weekSchedule.value = sanitizeSchedule(DEFAULT_SCHEDULE)
  errorDay.value = null
  localError.value = ''
  notifyToast('Reset to default schedule')
}

function handleSave() {
  localError.value = ''
  errorDay.value = null

  const sameTimes = weekSchedule.value.find(d => d.isOpen && !d.is24Hours && d.openTime === d.closeTime)
  if (sameTimes) {
    localError.value = `${sameTimes.day}: Opening and closing time cannot be the same. Switch on 24h or choose different times.`
    errorDay.value = sameTimes.day
    return
  }

  emit('save', JSON.parse(JSON.stringify(weekSchedule.value)))
}
</script>

<template>
  <!-- On body, so it covers the sidebar and centres on the whole window -->
  <Teleport to="body">
  <div v-if="show" class="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-6">
    <div
      class="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200"
      @click="emit('close')"
      aria-hidden="true"
    ></div>

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hours-dialog-title"
      class="relative bg-white rounded-3xl w-full max-w-[880px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 px-6 md:px-8 pt-6 pb-5 border-b border-[#EEDFC4] bg-[#FDFBF7] rounded-t-3xl">
        <div class="flex items-center gap-4 min-w-0">
          <div class="w-11 h-11 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="heroicons:clock" class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h2 id="hours-dialog-title" class="text-xl md:text-2xl font-display font-extrabold text-[#3B1F0E]">
              Opening Hours
            </h2>
            <p class="mt-0.5 text-[13px] text-[#8A6E64]">
              One schedule for all branches, in Philippine time (GMT+8)
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="emit('close')"
          aria-label="Close"
          class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3B1F0E] active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>

      <!-- Toolbar: fill the whole week from a preset, or copy one day to others -->
      <div class="flex flex-col gap-3 px-6 md:px-8 py-3 border-b border-[#F0E4D3] bg-[#FCFAF6] sm:flex-row sm:items-center sm:justify-between select-none">
        <p class="text-[13px] text-[#8A6E64]">Fill the whole week at once, then fine-tune any day below.</p>

        <div class="flex items-center gap-2">
        <!-- Presets -->
        <div class="relative shrink-0" @focusout="onPresetBlur">
          <button
            type="button"
            :aria-expanded="isPresetOpen"
            aria-haspopup="menu"
            class="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            :class="isPresetOpen
              ? 'bg-[#3B1F0E] text-[#FFF8EA] border-[#3B1F0E]'
              : 'bg-white border-[#D8C7B5] text-[#5C4037] hover:bg-[#FAF4ED] hover:border-[#B4846C]'"
            @click="isPresetOpen = !isPresetOpen; isGlobalCopyOpen = false"
          >
            <Icon name="heroicons:sparkles" class="w-4 h-4" :class="isPresetOpen ? 'text-[#FFF8EA]' : 'text-[#B4846C]'" />
            <span class="whitespace-nowrap">Use a preset</span>
            <Icon
              name="heroicons:chevron-down"
              class="w-3.5 h-3.5 transition-transform duration-150 shrink-0"
              :class="isPresetOpen ? 'rotate-180 text-[#FFF8EA]' : 'text-[#A8988B]'"
            />
          </button>

          <div
            v-if="isPresetOpen"
            role="menu"
            class="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-72 bg-white border border-[#E8DAC8] rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
          >
            <button
              v-for="p in PRESETS"
              :key="p.key"
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#FAF4ED] focus-visible:bg-[#FAF4ED] focus-visible:outline-none"
              @click="pickPreset(p.key)"
            >
              <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F7EEE0] text-[#7D5A50]">
                <Icon :name="p.icon" class="w-4 h-4" />
              </span>
              <span class="min-w-0">
                <span class="block text-[13px] font-semibold text-[#3B1F0E]">{{ p.label }}</span>
                <span class="block text-[12px] text-[#8A6E64]">{{ p.detail }}</span>
              </span>
            </button>
          </div>
        </div>

        <!-- Copy one day's hours to others -->
        <div class="relative shrink-0" @focusout="onGlobalCopyBlur">
          <button
            type="button"
            @click="isGlobalCopyOpen = !isGlobalCopyOpen; isPresetOpen = false"
            :aria-expanded="isGlobalCopyOpen"
            class="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            :class="isGlobalCopyOpen
              ? 'bg-[#3B1F0E] text-[#FFF8EA] border-[#3B1F0E]'
              : 'bg-white border-[#D8C7B5] text-[#5C4037] hover:bg-[#FAF4ED] hover:border-[#B4846C]'"
          >
            <Icon name="heroicons:document-duplicate" class="w-4 h-4" :class="isGlobalCopyOpen ? 'text-[#FFF8EA]' : 'text-[#8A6E64]'" />
            <span class="whitespace-nowrap">Copy a day's hours</span>
            <Icon
              name="heroicons:chevron-down"
              class="w-3.5 h-3.5 transition-transform duration-150 shrink-0"
              :class="isGlobalCopyOpen ? 'rotate-180 text-[#FFF8EA]' : 'text-[#A8988B]'"
            />
          </button>

          <div
            v-if="isGlobalCopyOpen"
            role="menu"
            class="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-[#E8DAC8] rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
          >
            <div>
              <p class="mb-2 text-[12px] font-semibold text-[#5C4037]">Copy from</p>
              <div class="grid grid-cols-7 gap-1">
                <button
                  v-for="d in weekSchedule"
                  :key="d.day"
                  type="button"
                  :aria-pressed="selectedSourceDay === d.day"
                  @click="selectedSourceDay = d.day"
                  class="py-1.5 rounded-lg text-[11px] font-semibold border transition-colors text-center"
                  :class="selectedSourceDay === d.day
                    ? 'bg-[#3B1F0E] text-[#FFF8EA] border-[#3B1F0E]'
                    : 'bg-[#FCFAF7] text-[#5C4037] border-[#E0D0BE] hover:bg-[#FAF4ED]'"
                >
                  {{ d.day.slice(0, 3) }}
                </button>
              </div>
            </div>

            <div class="border-t border-[#F0E4D3] pt-3">
              <p class="mb-1 text-[12px] font-semibold text-[#5C4037]">Apply {{ selectedSourceDay }}'s hours to</p>
              <button
                v-for="t in ([['weekdays', 'Weekdays', 'Mon–Fri'], ['weekends', 'Weekends', 'Sat–Sun'], ['all', 'Every day', 'All 7']] as const)"
                :key="t[0]"
                type="button"
                role="menuitem"
                class="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-[#3B1F0E] transition-colors hover:bg-[#FAF4ED]"
                @click="copySelectedTo(t[0])"
              >
                <span>{{ t[1] }}</span>
                <span class="text-[12px] text-[#A8988B]">{{ t[2] }}</span>
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      <!-- Feedback after a preset or copy -->
      <div
        v-if="feedbackToast"
        role="status"
        class="px-6 md:px-8 py-2 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-[12px] font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
      >
        <Icon name="heroicons:check-circle" class="w-4 h-4 text-emerald-600 shrink-0" />
        <span>{{ feedbackToast }}</span>
      </div>

      <!-- Days: only this part scrolls when the window is short -->
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 md:px-8 py-2">
        <ul class="divide-y divide-[#F3EADF]">
          <li
            v-for="item in weekSchedule"
            :key="item.day"
            class="-mx-3 flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-xl px-3 py-3 transition-colors"
            :class="errorDay === item.day ? 'bg-red-50 ring-1 ring-red-200' : ''"
          >
            <!-- Switch + day -->
            <label class="flex min-w-[190px] flex-1 cursor-pointer items-center gap-3 sm:flex-none sm:w-[210px]">
              <button
                type="button"
                role="switch"
                :aria-checked="item.isOpen"
                :aria-label="`${item.day}: ${item.isOpen ? 'open' : 'closed'}`"
                @click="toggleDayOpen(item)"
                class="relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 focus-visible:ring-offset-2"
                :class="item.isOpen ? 'bg-[#3B1F0E]' : 'bg-[#E3D7C9]'"
              >
                <span
                  class="inline-block size-[18px] rounded-full bg-white shadow-sm transition-transform duration-200"
                  :class="item.isOpen ? 'translate-x-[19px]' : 'translate-x-[3px]'"
                />
              </button>
              <span class="min-w-0">
                <span class="flex items-center gap-2">
                  <span class="font-display text-[15px] font-semibold" :class="item.isOpen ? 'text-[#3B1F0E]' : 'text-[#A8988B]'">{{ item.day }}</span>
                  <span
                    v-if="item.day === todayDayName"
                    class="rounded-full bg-[#F3E7D2] px-2 py-0.5 text-[10px] font-semibold text-[#7D5A50]"
                  >Today</span>
                </span>
                <span class="block text-[12px]" :class="item.isOpen ? (item.is24Hours ? 'text-amber-700' : 'text-[#8A6E64]') : 'text-[#B8A99C]'">
                  {{ dayNote(item) }}
                </span>
              </span>
            </label>

            <!-- Hours -->
            <div v-if="item.isOpen" class="flex flex-1 flex-wrap items-center gap-x-3 gap-y-2">
              <template v-if="item.is24Hours">
                <span class="inline-flex h-10 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 text-[13px] font-semibold text-amber-900">
                  <Icon name="heroicons:bolt" class="w-4 h-4 text-amber-600" />
                  Open around the clock
                </span>
              </template>
              <template v-else>
                <div class="flex items-center gap-2 tabular-nums">
                  <input
                    type="time"
                    v-model="item.openTime"
                    :aria-label="`${item.day} opening time`"
                    class="time-input h-10 w-[8.75rem] rounded-xl border border-[#E0D0BE] bg-white px-3 text-[14px] font-semibold text-[#2D201B] transition-colors hover:border-[#B4846C] focus:border-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#3B1F0E]/12"
                  />
                  <Icon name="heroicons:arrow-long-right" class="h-4 w-4 shrink-0 text-[#C9B39A]" aria-hidden="true" />
                  <input
                    type="time"
                    v-model="item.closeTime"
                    :aria-label="`${item.day} closing time`"
                    class="time-input h-10 w-[8.75rem] rounded-xl border border-[#E0D0BE] bg-white px-3 text-[14px] font-semibold text-[#2D201B] transition-colors hover:border-[#B4846C] focus:border-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#3B1F0E]/12"
                  />
                </div>
                <span
                  v-if="closesAfterMidnight(item)"
                  class="inline-flex items-center gap-1 rounded-full bg-[#F3E7D2] px-2.5 py-0.5 text-[11px] font-semibold text-[#7D5A50]"
                  title="Closes the next morning"
                >
                  <Icon name="heroicons:moon" class="w-3.5 h-3.5" />
                  Next day
                </span>
              </template>
            </div>
            <div v-else class="flex-1" />

            <!-- 24h -->
            <button
              v-if="item.isOpen"
              type="button"
              role="switch"
              :aria-checked="item.is24Hours"
              :aria-label="`${item.day}: open 24 hours`"
              @click="toggle24Hours(item)"
              class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
              :class="item.is24Hours
                ? 'border-amber-300 bg-amber-100 text-amber-900'
                : 'border-transparent text-[#8A6E64] hover:border-[#E0D0BE] hover:bg-[#FAF4ED] hover:text-[#3B1F0E]'"
              :title="item.is24Hours ? 'Use set hours instead' : 'Open 24 hours'"
            >
              <Icon name="heroicons:bolt" class="w-4 h-4" :class="item.is24Hours ? 'text-amber-600' : 'text-[#B8A99C]'" />
              24 hours
            </button>
          </li>
        </ul>
      </div>

      <!-- Error -->
      <div v-if="localError || error" role="alert" class="px-6 md:px-8 py-2.5 bg-red-50 border-t border-red-100 flex items-center gap-2">
        <Icon name="heroicons:exclamation-circle" class="w-4 h-4 text-red-600 shrink-0" />
        <p class="text-[12px] font-semibold text-red-700 whitespace-pre-line">
          {{ localError || error }}
        </p>
      </div>

      <!-- Footer -->
      <div class="flex flex-col-reverse gap-2.5 px-6 md:px-8 py-4 border-t border-[#EEDFC4] bg-[#FAF8F5] rounded-b-3xl sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-4">
          <button
            type="button"
            @click="handleResetDefaults"
            class="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-[#8A6E64] transition-colors hover:bg-[#F3ECE3] hover:text-[#3B1F0E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            <Icon name="heroicons:arrow-uturn-left" class="w-4 h-4" />
            Reset to default
          </button>
          <span class="hidden text-[13px] text-[#A8988B] sm:inline">
            Open {{ openDays }} {{ openDays === 1 ? 'day' : 'days' }} a week
          </span>
        </div>

        <div class="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
          <button
            type="button"
            @click="emit('close')"
            class="h-11 rounded-xl border border-[#D8C7B5] bg-white px-5 text-sm font-semibold text-[#5C4037] whitespace-nowrap transition-colors hover:bg-[#FAF4ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleSave"
            :disabled="saving"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3B1F0E] px-6 text-sm font-semibold text-[#FFF8EA] whitespace-nowrap transition-colors hover:bg-[#2A150A] active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3B1F0E]"
          >
            <Icon v-if="saving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            {{ saving ? 'Saving…' : 'Save hours' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
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
