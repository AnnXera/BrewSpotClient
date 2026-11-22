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
  if (isGlobalCopyOpen.value) isGlobalCopyOpen.value = false
  else emit('close')
}

watch(() => props.show, (open) => {
  if (open) {
    weekSchedule.value = sanitizeSchedule(operatingHours.value)
    localError.value = ''
    errorDay.value = null
    isGlobalCopyOpen.value = false
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
  <div v-if="show" class="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
    <!-- Backdrop with subtle blur -->
    <div
      class="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200"
      @click="emit('close')"
      aria-hidden="true"
    ></div>

    <!-- Dialog Card: Extended Width (960px), 1 Row Per Day, Compact Vertical Footprint, Zero Overlap Height, Everything Fully Visible -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hours-dialog-title"
      class="relative bg-white rounded-3xl w-full max-w-[960px] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] my-auto animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header: Compact & Refined -->
      <div class="flex items-center justify-between gap-4 px-6 pt-3.5 pb-2.5 border-b border-[#EEDFC4] bg-[#FDFBF7] rounded-t-3xl">
        <div class="flex items-center gap-3">
          <div class="w-8.5 h-8.5 rounded-xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="heroicons:clock" class="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 id="hours-dialog-title" class="text-lg font-display font-extrabold text-[#3B1F0E]">
              Opening Hours
            </h2>
            <p class="text-xs text-[#8A6E64]">
              One schedule shared across all branches · Philippine Time (GMT+8)
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="emit('close')"
          aria-label="Close modal"
          class="w-8 h-8 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3B1F0E] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>

      <!-- Presets & Single Top Copy Toolbar (Extended 960px width shows ALL presets & copy button with zero truncation) -->
      <div class="px-6 py-2 border-b border-[#F0E4D3] bg-[#FCFAF6] flex items-center justify-between gap-3 select-none">
        <!-- Presets Row (Shows all buttons cleanly with no clipping) -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <div class="flex items-center gap-1 text-xs font-bold text-[#8A6E64] mr-0.5 shrink-0">
            <Icon name="heroicons:sparkles" class="w-3.5 h-3.5 text-[#B4846C]" />
            <span>Presets:</span>
          </div>
          <button
            type="button"
            @click="applyPreset('standard')"
            class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E0D0BE] text-[#5C4037] hover:bg-[#FAF4ED] hover:border-[#7D5A50] active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
            title="Mon–Fri 9:00 AM – 5:00 PM, Weekends closed"
          >
            Mon–Fri 9AM–5PM
          </button>
          <button
            type="button"
            @click="applyPreset('morning')"
            class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E0D0BE] text-[#5C4037] hover:bg-[#FAF4ED] hover:border-[#7D5A50] active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
            title="Morning Shift (MOS): 6:00 AM – 3:00 PM daily"
          >
            Morning 6AM–3PM
          </button>
          <button
            type="button"
            @click="applyPreset('overnight')"
            class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E0D0BE] text-[#5C4037] hover:bg-[#FAF4ED] hover:border-[#7D5A50] active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
            title="Overnight Shift: 3:00 PM – 9:00 AM daily (+1 day)"
          >
            Overnight 3PM–9AM
          </button>
          <button
            type="button"
            @click="applyPreset('cafe')"
            class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E0D0BE] text-[#5C4037] hover:bg-[#FAF4ED] hover:border-[#7D5A50] active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
            title="Daily Cafe: 7:00 AM – 8:00 PM"
          >
            Daily 7AM–8PM
          </button>
          <button
            type="button"
            @click="applyPreset('24seven')"
            class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E0D0BE] text-[#5C4037] hover:bg-[#FAF4ED] hover:border-[#7D5A50] active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
            title="All 7 days open 24 hours continuously"
          >
            Open 24/7
          </button>
        </div>

        <!-- Single Top Copy Button (Always right-aligned, popover opens safely inwards) -->
        <div class="relative shrink-0 ml-auto" @focusout="onGlobalCopyBlur">
          <button
            type="button"
            @click="isGlobalCopyOpen = !isGlobalCopyOpen"
            :aria-expanded="isGlobalCopyOpen"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 shrink-0"
            :class="isGlobalCopyOpen
              ? 'bg-[#3B1F0E] text-[#FFF8EA] border-[#3B1F0E]'
              : 'bg-white border-[#D8C7B5] text-[#5C4037] hover:bg-[#FAF4ED] hover:border-[#B4846C]'"
          >
            <Icon name="heroicons:document-duplicate" class="w-3.5 h-3.5" :class="isGlobalCopyOpen ? 'text-[#FFF8EA]' : 'text-[#8A6E64]'" />
            <span class="whitespace-nowrap">Copy day's hours</span>
            <Icon
              name="heroicons:chevron-down"
              class="w-3 h-3 transition-transform duration-150 shrink-0"
              :class="isGlobalCopyOpen ? 'rotate-180 text-[#FFF8EA]' : 'text-[#A8988B]'"
            />
          </button>

          <!-- Top Copy Popover: w-72 anchored right-0, opens inwards to center without clipping -->
          <div
            v-if="isGlobalCopyOpen"
            role="menu"
            class="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-[#E8DAC8] rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
          >
            <div>
              <div class="text-[10px] font-extrabold text-[#8A6E64] uppercase tracking-wider mb-1.5">
                1. Select source day to copy:
              </div>
              <div class="grid grid-cols-7 gap-1">
                <button
                  v-for="d in weekSchedule"
                  :key="d.day"
                  type="button"
                  @click="selectedSourceDay = d.day"
                  class="py-1 rounded-md text-[11px] font-bold border transition-all text-center cursor-pointer"
                  :class="selectedSourceDay === d.day
                    ? 'bg-[#3B1F0E] text-[#FFF8EA] border-[#3B1F0E] shadow-2xs'
                    : 'bg-[#FCFAF7] text-[#5C4037] border-[#E0D0BE] hover:bg-[#FAF4ED]'"
                >
                  {{ d.day.slice(0, 3) }}
                </button>
              </div>
            </div>

            <div class="border-t border-[#F0E4D3] pt-2 flex flex-col gap-1">
              <div class="text-[10px] font-extrabold text-[#8A6E64] uppercase tracking-wider mb-0.5">
                2. Apply {{ selectedSourceDay }}'s hours to:
              </div>
              <button
                type="button"
                role="menuitem"
                @click="copySelectedTo('weekdays')"
                class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#3B1F0E] hover:bg-[#FAF4ED] active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer"
              >
                <span>Weekdays (Mon–Fri)</span>
                <span class="text-[10px] font-bold text-[#8A6E64]">5 days</span>
              </button>
              <button
                type="button"
                role="menuitem"
                @click="copySelectedTo('all')"
                class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#3B1F0E] hover:bg-[#FAF4ED] active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer"
              >
                <span>All 7 Days (Daily)</span>
                <span class="text-[10px] font-bold text-[#8A6E64]">7 days</span>
              </button>
              <button
                type="button"
                role="menuitem"
                @click="copySelectedTo('weekends')"
                class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#3B1F0E] hover:bg-[#FAF4ED] active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer"
              >
                <span>Weekends (Sat–Sun)</span>
                <span class="text-[10px] font-bold text-[#8A6E64]">2 days</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Toast Feedback Message -->
      <div
        v-if="feedbackToast"
        class="px-6 py-1.5 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
      >
        <Icon name="heroicons:check-circle" class="w-4 h-4 text-emerald-600 shrink-0" />
        <span>{{ feedbackToast }}</span>
      </div>

      <!-- Schedule Rows: 1 Row Per Day, Compact 42px row height, Balanced spacing, No vertical overlap -->
      <div class="px-6 py-2.5 space-y-1.5">
        <div
          v-for="item in weekSchedule"
          :key="item.day"
          class="flex items-center justify-between gap-3 px-4 py-1.5 rounded-xl border transition-all duration-150"
          :class="[
            errorDay === item.day
              ? 'bg-red-50/70 border-red-200 ring-1 ring-red-300'
              : item.isOpen
                ? 'bg-white border-[#E8DAC8] hover:border-[#D4C3B2] hover:bg-[#FAF8F5]'
                : 'bg-[#F7F4EE]/70 border-dashed border-[#E3D6C5] opacity-75 hover:opacity-90'
          ]"
        >
          <!-- 1. Left: Switch + Day Name + Today badge (Fixed 195px width, no overlap on Saturday) -->
          <div class="flex items-center gap-2.5 w-[195px] shrink-0">
            <!-- Authentic iOS Switch -->
            <button
              type="button"
              role="switch"
              :aria-checked="item.isOpen"
              :aria-label="`${item.day} open status`"
              @click="toggleDayOpen(item)"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 shadow-2xs"
              :class="item.isOpen ? 'bg-[#3B1F0E]' : 'bg-[#D8C7B5]'"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-out"
                :class="item.isOpen ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>

            <div class="flex items-center gap-1.5">
              <span
                class="text-sm font-bold min-w-[70px]"
                :class="item.isOpen ? 'text-[#3B1F0E]' : 'text-[#8A6E64]'"
              >
                {{ item.day }}
              </span>
              <span
                v-if="item.day === todayDayName"
                class="bg-[#3B1F0E] text-[#FFF8EA] text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider shadow-2xs shrink-0"
              >
                Today
              </span>
            </div>
          </div>

          <!-- 2. Middle: Time Controls or Status Message -->
          <div class="flex-1 flex items-center gap-3 min-w-0">
            <!-- Closed State -->
            <template v-if="!item.isOpen">
              <div class="flex items-center gap-2.5">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FAF4ED] border border-[#EEDFC4] text-xs font-semibold text-[#8A6E64]">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#A8988B]"></span>
                  <span>Closed all day</span>
                </span>
                <button
                  type="button"
                  @click="toggleDayOpen(item)"
                  class="text-xs font-bold text-[#7D5A50] hover:text-[#3B1F0E] hover:underline cursor-pointer"
                >
                  Set open
                </button>
              </div>
            </template>

            <!-- 24 Hours State -->
            <template v-else-if="item.is24Hours">
              <div class="flex items-center gap-2.5">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shadow-2xs">
                  <Icon name="heroicons:bolt" class="w-3.5 h-3.5 text-amber-600" />
                  <span>Open 24 hours (continuous)</span>
                </span>
                <button
                  type="button"
                  @click="item.is24Hours = false"
                  class="text-xs font-semibold text-[#7D5A50] hover:text-[#3B1F0E] underline cursor-pointer"
                >
                  Set custom hours
                </button>
              </div>
            </template>

            <!-- Open with Specific Hours (w-[8.8rem] ensures AM/PM and clock icon are always fully visible) -->
            <template v-else>
              <div class="flex items-center gap-2 tabular-nums">
                <input
                  type="time"
                  v-model="item.openTime"
                  :aria-label="`${item.day} opening time`"
                  class="h-8.5 w-[9.2rem] min-w-[9.2rem] rounded-xl bg-[#FCFAF7] border border-[#D8C7B5] px-2.5 text-xs sm:text-sm font-bold text-[#2D201B] tracking-tight tabular-nums shadow-2xs focus:bg-white focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all cursor-pointer"
                />

                <span class="text-[11px] font-extrabold text-[#A8988B] uppercase tracking-wider shrink-0 px-0.5">to</span>

                <input
                  type="time"
                  v-model="item.closeTime"
                  :aria-label="`${item.day} closing time`"
                  class="h-8.5 w-[9.2rem] min-w-[9.2rem] rounded-xl bg-[#FCFAF7] border border-[#D8C7B5] px-2.5 text-xs sm:text-sm font-bold text-[#2D201B] tracking-tight tabular-nums shadow-2xs focus:bg-white focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all cursor-pointer"
                />

                <!-- Overnight Indicator -->
                <span
                  v-if="closesAfterMidnight(item)"
                  class="inline-flex items-center gap-1 text-[11px] font-bold text-[#7D5A50] bg-[#FAF4ED] border border-[#EEDFC4] px-2 py-0.5 rounded-lg shrink-0 shadow-2xs"
                  title="Closing time extends into the next calendar morning"
                >
                  <span>🌙 +1 day</span>
                </span>
              </div>
            </template>
          </div>

          <!-- 3. Right: Shift Duration Badge + 24h Toggle Pill -->
          <div class="flex items-center gap-2.5 shrink-0">
            <!-- Duration Badge (fills space meaningfully, removes dead gap) -->
            <span
              class="text-[11px] font-bold px-2.5 py-1 rounded-lg border tabular-nums transition-colors min-w-[70px] text-center"
              :class="item.isOpen
                ? item.is24Hours
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-[#FAF6F0] text-[#7D5A50] border-[#E8DAC8]'
                : 'bg-[#F2ECE3] text-[#A8988B] border-[#E0D0BE]'"
            >
              {{ getShiftDuration(item) }}
            </span>

            <!-- 24h Toggle Pill -->
            <button
              type="button"
              :disabled="!item.isOpen"
              @click="toggle24Hours(item)"
              class="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold border transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              :class="item.is24Hours
                ? 'bg-amber-100 border-amber-300 text-amber-900 font-extrabold shadow-2xs'
                : 'bg-white border-[#E0D0BE] text-[#7D5A50] hover:bg-[#FAF4ED] hover:border-[#D4C3B2]'"
              :title="item.is24Hours ? 'Switch back to custom hours' : 'Set to open 24 hours'"
            >
              <Icon name="heroicons:bolt" class="w-3.5 h-3.5" :class="item.is24Hours ? 'text-amber-700' : 'text-[#A8988B]'" />
              <span>24h</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Error Message Banner -->
      <div v-if="localError || error" role="alert" class="px-6 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2">
        <Icon name="heroicons:exclamation-circle" class="w-4 h-4 text-red-600 shrink-0" />
        <p class="text-xs font-bold text-red-700 whitespace-pre-line">
          {{ localError || error }}
        </p>
      </div>

      <!-- Footer: Compact Actions -->
      <div class="flex items-center justify-between px-6 py-2.5 border-t border-[#EEDFC4] bg-[#FAF8F5] rounded-b-3xl">
        <button
          type="button"
          @click="handleResetDefaults"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A6E64] hover:text-[#3B1F0E] active:scale-95 transition-all outline-none cursor-pointer"
        >
          <Icon name="heroicons:arrow-uturn-left" class="w-3.5 h-3.5" />
          <span>Reset defaults</span>
        </button>

        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="emit('close')"
            class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleSave"
            :disabled="saving"
            class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            <Icon v-if="saving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            <span>Save hours</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure AM/PM indicator in HTML5 time inputs is prominent and never truncated */
input[type="time"]::-webkit-datetime-edit-ampm-field {
  font-weight: 800;
  color: #3B1F0E;
}
</style>
