<!-- app/components/common/EmilCalendar.vue -->
<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

export interface DateRange {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
}

interface Props {
  modelValue?: string // YYYY-MM-DD (for single date mode)
  rangeValue?: DateRange | null // (for range mode)
  mode?: 'single' | 'range'
  min?: string // YYYY-MM-DD
  max?: string // YYYY-MM-DD
  align?: 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  rangeValue: null,
  mode: undefined,
  min: '',
  max: '',
  align: 'right',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:rangeValue': [value: DateRange]
  select: [value: string]
  selectRange: [value: DateRange]
  clear: []
}>()

const isOpen = ref(false)
const popoverRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)

// Picker view: 'days' (calendar), 'months', or 'years'
const pickerView = ref<'days' | 'months' | 'years'>('days')

// Decade window for year view
const decadeStart = ref(Math.floor(new Date().getFullYear() / 12) * 12)

const effectiveMode = computed<'single' | 'range'>(() => {
  if (props.mode) return props.mode
  if (props.rangeValue !== undefined && props.rangeValue !== null) return 'range'
  return 'single'
})

// Current view year & month (0-11)
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const slideDirection = ref<'next' | 'prev'>('next')

// Internal range selection state
const internalRangeStart = ref<string | null>(props.rangeValue?.from || null)
const internalRangeEnd = ref<string | null>(props.rangeValue?.to || null)
const hoveredDate = ref<string | null>(null)

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const pad = (n: number) => String(n).padStart(2, '0')

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

const todayKey = computed(() => {
  const d = new Date()
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
})

// Sync view year/month with selected date or range
function syncViewWithSelected() {
  pickerView.value = 'days'
  if (effectiveMode.value === 'range') {
    if (props.rangeValue?.from) {
      internalRangeStart.value = props.rangeValue.from
      internalRangeEnd.value = props.rangeValue.to || null
      const [y, m] = props.rangeValue.from.split('-').map(Number)
      if (y && m) {
        viewYear.value = y
        viewMonth.value = m - 1
        decadeStart.value = Math.floor(y / 12) * 12
        return
      }
    }
  } else if (props.modelValue && /^\d{4}-\d{2}-\d{2}$/.test(props.modelValue)) {
    const [y, m] = props.modelValue.split('-').map(Number)
    if (y && m) {
      viewYear.value = y
      viewMonth.value = m - 1
      decadeStart.value = Math.floor(y / 12) * 12
      return
    }
  }
  const now = new Date()
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
  decadeStart.value = Math.floor(now.getFullYear() / 12) * 12
}

watch(() => props.rangeValue, (val) => {
  if (val) {
    internalRangeStart.value = val.from
    internalRangeEnd.value = val.to
  } else {
    internalRangeStart.value = null
    internalRangeEnd.value = null
  }
}, { deep: true })

// Popover positioning and collision detection
const popoverStyle = ref<Record<string, string>>({})

function updatePosition() {
  if (!isOpen.value || !triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const w = Math.min(340, window.innerWidth - 24)
  const h = 425 // Height to account for header, preset bar and calendar

  // Determine if popover should open up or down based on available viewport space
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  const openUp = spaceBelow < h && spaceAbove > spaceBelow

  const top = openUp
    ? Math.max(12, rect.top - h - 8)
    : Math.min(window.innerHeight - h - 12, rect.bottom + 8)

  let left = props.align === 'left' ? rect.left : rect.right - w
  // Clamp inside viewport
  left = Math.max(12, Math.min(window.innerWidth - w - 12, left))

  const originX = props.align === 'left' ? 'left' : 'right'
  const originY = openUp ? 'bottom' : 'top'

  popoverStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${w}px`,
    transformOrigin: `${originY} ${originX}`,
  }
}

watch(isOpen, async (open) => {
  if (open) {
    syncViewWithSelected()
    updatePosition()
    await nextTick()
    updatePosition()
  }
})

// Navigation controls
function prevMonth() {
  slideDirection.value = 'prev'
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  slideDirection.value = 'next'
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

function prevDecade() {
  decadeStart.value -= 12
}

function nextDecade() {
  decadeStart.value += 12
}

function selectMonth(mIndex: number) {
  viewMonth.value = mIndex
  pickerView.value = 'days'
}

function selectYear(yr: number) {
  viewYear.value = yr
  pickerView.value = 'days'
}

const canGoPrev = computed(() => {
  if (!props.min) return true
  const prevMonthLastDate = new Date(viewYear.value, viewMonth.value, 0)
  const prevMonthKey = toDateKey(
    prevMonthLastDate.getFullYear(),
    prevMonthLastDate.getMonth(),
    prevMonthLastDate.getDate()
  )
  return prevMonthKey >= props.min
})

const canGoNext = computed(() => {
  if (!props.max) return true
  const nextMonthFirstDate = new Date(viewYear.value, viewMonth.value + 1, 1)
  const nextMonthKey = toDateKey(
    nextMonthFirstDate.getFullYear(),
    nextMonthFirstDate.getMonth(),
    nextMonthFirstDate.getDate()
  )
  return nextMonthKey <= props.max
})

// Calendar day item
interface CalendarDay {
  year: number
  month: number
  day: number
  dateKey: string
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isRangeStart: boolean
  isRangeEnd: boolean
  isInRange: boolean
  isDisabled: boolean
}

// Effective range boundaries considering hover state
const rangeBounds = computed(() => {
  const start = internalRangeStart.value
  const end = internalRangeEnd.value
  const hover = hoveredDate.value

  if (start && end) {
    return {
      from: start <= end ? start : end,
      to: start <= end ? end : start,
      isSelecting: false,
    }
  }

  if (start && hover) {
    return {
      from: start <= hover ? start : hover,
      to: start <= hover ? hover : start,
      isSelecting: true,
    }
  }

  if (start) {
    return {
      from: start,
      to: start,
      isSelecting: true,
    }
  }

  return { from: null, to: null, isSelecting: false }
})

const calendarDays = computed<CalendarDay[]>(() => {
  const year = viewYear.value
  const month = viewMonth.value

  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0 = Sunday
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const list: CalendarDay[] = []
  const { from, to } = rangeBounds.value

  function buildCell(y: number, m: number, d: number, isCurrent: boolean): CalendarDay {
    const key = toDateKey(y, m, d)
    const isSingleSelected = effectiveMode.value === 'single' && key === props.modelValue
    const isRangeStart = effectiveMode.value === 'range' && key === from
    const isRangeEnd = effectiveMode.value === 'range' && key === to
    const isInRange = effectiveMode.value === 'range' && !!from && !!to && key > from && key < to

    return {
      year: y,
      month: m,
      day: d,
      dateKey: key,
      isCurrentMonth: isCurrent,
      isToday: key === todayKey.value,
      isSelected: isSingleSelected || isRangeStart || isRangeEnd,
      isRangeStart,
      isRangeEnd,
      isInRange,
      isDisabled: (props.min ? key < props.min : false) || (props.max ? key > props.max : false),
    }
  }

  // Preceding month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    list.push(buildCell(y, m, d, false))
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    list.push(buildCell(year, month, d, true))
  }

  // Trailing month days
  const totalSlots = list.length <= 35 ? 35 : 42
  const remaining = totalSlots - list.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    list.push(buildCell(y, m, d, false))
  }

  return list
})

// Day selection logic
function selectDay(cell: CalendarDay) {
  if (cell.isDisabled) return

  if (effectiveMode.value === 'single') {
    emit('update:modelValue', cell.dateKey)
    emit('select', cell.dateKey)
    isOpen.value = false
    return
  }

  // Range mode selection
  if (!internalRangeStart.value || (internalRangeStart.value && internalRangeEnd.value)) {
    // Pick start date
    internalRangeStart.value = cell.dateKey
    internalRangeEnd.value = null
  } else {
    // Pick end date
    if (cell.dateKey >= internalRangeStart.value) {
      internalRangeEnd.value = cell.dateKey
    } else {
      // Swapped direction
      internalRangeEnd.value = internalRangeStart.value
      internalRangeStart.value = cell.dateKey
    }
    const range: DateRange = {
      from: internalRangeStart.value,
      to: internalRangeEnd.value,
    }
    emit('update:rangeValue', range)
    emit('selectRange', range)
  }
}

function onDayHover(cell: CalendarDay) {
  if (effectiveMode.value === 'range' && internalRangeStart.value && !internalRangeEnd.value) {
    hoveredDate.value = cell.dateKey
  }
}

function onGridMouseLeave() {
  hoveredDate.value = null
}

// Preset range selection (e.g. Q1, Q2, etc. for current viewYear)
function applyPreset(preset: 'q1' | 'q2' | 'q3' | 'q4' | 'last30' | 'year') {
  const yr = viewYear.value
  let from = ''
  let to = ''

  if (preset === 'q1') {
    from = `${yr}-01-01`
    to = `${yr}-03-31`
    viewMonth.value = 0
  } else if (preset === 'q2') {
    from = `${yr}-04-01`
    to = `${yr}-06-30`
    viewMonth.value = 3
  } else if (preset === 'q3') {
    from = `${yr}-07-01`
    to = `${yr}-09-30`
    viewMonth.value = 6
  } else if (preset === 'q4') {
    from = `${yr}-10-01`
    to = `${yr}-12-31`
    viewMonth.value = 9
  } else if (preset === 'last30') {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    from = toDateKey(start.getFullYear(), start.getMonth(), start.getDate())
    to = toDateKey(end.getFullYear(), end.getMonth(), end.getDate())
    viewYear.value = end.getFullYear()
    viewMonth.value = end.getMonth()
  } else if (preset === 'year') {
    from = `${yr}-01-01`
    to = `${yr}-12-31`
    viewMonth.value = 0
  }

  internalRangeStart.value = from
  internalRangeEnd.value = to
  pickerView.value = 'days'

  const range: DateRange = { from, to }
  emit('update:rangeValue', range)
  emit('selectRange', range)
}

function selectToday() {
  const key = todayKey.value
  if (props.min && key < props.min) return
  if (props.max && key > props.max) return

  if (effectiveMode.value === 'single') {
    emit('update:modelValue', key)
    emit('select', key)
    isOpen.value = false
  } else {
    internalRangeStart.value = key
    internalRangeEnd.value = key
    const range: DateRange = { from: key, to: key }
    emit('update:rangeValue', range)
    emit('selectRange', range)
  }
}

function applyRangeAndClose() {
  if (internalRangeStart.value && internalRangeEnd.value) {
    const range: DateRange = {
      from: internalRangeStart.value,
      to: internalRangeEnd.value,
    }
    emit('update:rangeValue', range)
    emit('selectRange', range)
  }
  isOpen.value = false
}

function clearSelection() {
  internalRangeStart.value = null
  internalRangeEnd.value = null
  emit('clear')
}

function toggle() {
  if (!isOpen.value) {
    updatePosition()
  }
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node
  if (popoverRef.value?.contains(target) || triggerRef.value?.contains(target)) {
    return
  }
  close()
}

onMounted(() => {
  syncViewWithSelected()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('click', handleClickOutside, true)
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', handleClickOutside, true)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})

const selectedFormatted = computed(() => {
  if (effectiveMode.value === 'range') {
    if (internalRangeStart.value && internalRangeEnd.value) {
      try {
        const d1 = new Date(`${internalRangeStart.value}T00:00:00`)
        const d2 = new Date(`${internalRangeEnd.value}T00:00:00`)
        const sameYear = d1.getFullYear() === d2.getFullYear()
        const f1 = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          ...(sameYear ? {} : { year: 'numeric' }),
        }).format(d1)
        const f2 = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(d2)
        return `${f1} – ${f2}`
      } catch {
        return `${internalRangeStart.value} – ${internalRangeEnd.value}`
      }
    }
    if (internalRangeStart.value) {
      return `From ${internalRangeStart.value}...`
    }
    return 'Select date range'
  }

  if (!props.modelValue) return 'Select date'
  try {
    const d = new Date(`${props.modelValue}T00:00:00`)
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  } catch {
    return props.modelValue
  }
})
</script>

<template>
  <div class="relative inline-block text-left">
    <!-- Trigger Slot or Default Trigger -->
    <div ref="triggerRef" class="inline-flex">
      <slot name="trigger" :open="isOpen" :toggle="toggle" :formatted="selectedFormatted">
        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-lg border border-[#DCC8B8] bg-white px-3 text-sm font-medium text-[#5B463C] shadow-2xs hover:border-[#7D5A50] hover:bg-[#F8EFE7] active:scale-[0.97] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          :class="{ 'border-[#7D5A50] bg-[#F8EFE7] ring-2 ring-[#7D5A50]/20': isOpen }"
          @click="toggle"
        >
          <Icon name="heroicons:calendar-days" class="size-4 text-[#7D5A50]" />
          <span>{{ selectedFormatted }}</span>
        </button>
      </slot>
    </div>

    <!-- Emil Kowalski Calendar Popover (Teleported to body to escape clipping & stacking contexts) -->
    <Teleport to="body">
      <Transition name="emil-calendar-popover">
        <div
          v-if="isOpen"
          ref="popoverRef"
          role="dialog"
          aria-modal="true"
          aria-label="Calendar date picker"
          class="emil-calendar-popover fixed z-[9999] rounded-2xl border border-[#EDD8CC] bg-[#FFFDF9] p-4 shadow-2xl shadow-[#3B1F0E]/20 focus:outline-none font-display text-[#3B1F0E]"
          :style="popoverStyle"
        >
          <!-- Calendar Header: Month, Year, and Navigation Arrows -->
          <div class="flex items-center justify-between pb-2.5 border-b border-[#EDD8CC]/80">
            <!-- Clickable Month & Year with Dropdown Indicators -->
            <div class="flex items-center gap-1 min-w-0">
              <button
                type="button"
                class="flex items-center gap-1 font-bold text-[15px] text-[#3B1F0E] hover:bg-[#F8EFE7] px-2 py-1 rounded-lg transition-all active:scale-[0.96] cursor-pointer"
                :class="{ 'bg-[#F8EFE7] text-[#7D5A50]': pickerView === 'months' }"
                title="Click to jump to another month"
                @click="pickerView = pickerView === 'months' ? 'days' : 'months'"
              >
                <span>{{ MONTH_NAMES[viewMonth] }}</span>
                <Icon name="heroicons:chevron-down" class="size-3.5 text-[#7D5A50] transition-transform duration-150" :class="{ 'rotate-180': pickerView === 'months' }" />
              </button>

              <button
                type="button"
                class="flex items-center gap-1 font-semibold text-[14px] text-[#8C6E63] hover:bg-[#F8EFE7] hover:text-[#3B1F0E] px-2 py-1 rounded-lg transition-all active:scale-[0.96] cursor-pointer tabular-nums"
                :class="{ 'bg-[#F8EFE7] text-[#7D5A50] font-bold': pickerView === 'years' }"
                title="Click to jump to another year (e.g. 2023)"
                @click="pickerView = pickerView === 'years' ? 'days' : 'years'"
              >
                <span>{{ viewYear }}</span>
                <Icon name="heroicons:chevron-down" class="size-3.5 text-[#7D5A50] transition-transform duration-150" :class="{ 'rotate-180': pickerView === 'years' }" />
              </button>
            </div>

            <!-- Next / Prev Controls -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                v-if="pickerView === 'days'"
                type="button"
                class="size-8 rounded-lg flex items-center justify-center text-[#7D5A50] hover:bg-[#F8EFE7] hover:text-[#3B1F0E] active:scale-[0.92] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                :disabled="!canGoPrev"
                aria-label="Previous month"
                @click="prevMonth"
              >
                <Icon name="heroicons:chevron-left" class="size-4.5" />
              </button>
              <button
                v-if="pickerView === 'days'"
                type="button"
                class="size-8 rounded-lg flex items-center justify-center text-[#7D5A50] hover:bg-[#F8EFE7] hover:text-[#3B1F0E] active:scale-[0.92] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                :disabled="!canGoNext"
                aria-label="Next month"
                @click="nextMonth"
              >
                <Icon name="heroicons:chevron-right" class="size-4.5" />
              </button>

              <button
                v-if="pickerView === 'years'"
                type="button"
                class="size-8 rounded-lg flex items-center justify-center text-[#7D5A50] hover:bg-[#F8EFE7] hover:text-[#3B1F0E] active:scale-[0.92] transition-all cursor-pointer"
                aria-label="Previous 12 years"
                @click="prevDecade"
              >
                <Icon name="heroicons:chevron-left" class="size-4.5" />
              </button>
              <button
                v-if="pickerView === 'years'"
                type="button"
                class="size-8 rounded-lg flex items-center justify-center text-[#7D5A50] hover:bg-[#F8EFE7] hover:text-[#3B1F0E] active:scale-[0.92] transition-all cursor-pointer"
                aria-label="Next 12 years"
                @click="nextDecade"
              >
                <Icon name="heroicons:chevron-right" class="size-4.5" />
              </button>
            </div>
          </div>

          <!-- Quick Presets for Range Mode -->
          <div
            v-if="effectiveMode === 'range' && pickerView === 'days'"
            class="flex items-center gap-1.5 py-2 overflow-x-auto no-scrollbar border-b border-[#EDD8CC]/60"
          >
            <button
              type="button"
              class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all active:scale-[0.96] shrink-0 cursor-pointer"
              :class="internalRangeStart === `${viewYear}-01-01` && internalRangeEnd === `${viewYear}-03-31`
                ? 'bg-[#3B1F0E] text-white shadow-2xs'
                : 'bg-[#FAF5EE] text-[#7D5A50] hover:bg-[#F3E5D0] hover:text-[#3B1F0E]'"
              title="First Quarter: Jan 1 to Mar 31 of current year"
              @click="applyPreset('q1')"
            >
              Q1 (Jan–Mar)
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all active:scale-[0.96] shrink-0 cursor-pointer"
              :class="internalRangeStart === `${viewYear}-04-01` && internalRangeEnd === `${viewYear}-06-30`
                ? 'bg-[#3B1F0E] text-white shadow-2xs'
                : 'bg-[#FAF5EE] text-[#7D5A50] hover:bg-[#F3E5D0] hover:text-[#3B1F0E]'"
              title="Second Quarter: Apr 1 to Jun 30"
              @click="applyPreset('q2')"
            >
              Q2 (Apr–Jun)
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all active:scale-[0.96] shrink-0 cursor-pointer"
              :class="internalRangeStart === `${viewYear}-07-01` && internalRangeEnd === `${viewYear}-09-30`
                ? 'bg-[#3B1F0E] text-white shadow-2xs'
                : 'bg-[#FAF5EE] text-[#7D5A50] hover:bg-[#F3E5D0] hover:text-[#3B1F0E]'"
              title="Third Quarter: Jul 1 to Sep 30"
              @click="applyPreset('q3')"
            >
              Q3 (Jul–Sep)
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all active:scale-[0.96] shrink-0 cursor-pointer"
              :class="internalRangeStart === `${viewYear}-10-01` && internalRangeEnd === `${viewYear}-12-31`
                ? 'bg-[#3B1F0E] text-white shadow-2xs'
                : 'bg-[#FAF5EE] text-[#7D5A50] hover:bg-[#F3E5D0] hover:text-[#3B1F0E]'"
              title="Fourth Quarter: Oct 1 to Dec 31"
              @click="applyPreset('q4')"
            >
              Q4 (Oct–Dec)
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all active:scale-[0.96] shrink-0 cursor-pointer"
              :class="internalRangeStart === `${viewYear}-01-01` && internalRangeEnd === `${viewYear}-12-31`
                ? 'bg-[#3B1F0E] text-white shadow-2xs'
                : 'bg-[#FAF5EE] text-[#7D5A50] hover:bg-[#F3E5D0] hover:text-[#3B1F0E]'"
              title="Full year"
              @click="applyPreset('year')"
            >
              Year {{ viewYear }}
            </button>
          </div>

          <!-- View 1: Month Grid Picker -->
          <div v-if="pickerView === 'months'" class="grid grid-cols-3 gap-2 py-4">
            <button
              v-for="(mName, idx) in MONTH_SHORT"
              :key="mName"
              type="button"
              class="py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.94] cursor-pointer"
              :class="viewMonth === idx
                ? 'bg-[#3B1F0E] text-[#FFF0D1] shadow-sm font-bold'
                : 'bg-[#FAF5EE] text-[#5B463C] hover:bg-[#F8EFE7] hover:text-[#3B1F0E]'"
              @click="selectMonth(idx)"
            >
              {{ mName }}
            </button>
          </div>

          <!-- View 2: Year Grid Picker -->
          <div v-else-if="pickerView === 'years'" class="py-2">
            <div class="text-[11px] font-bold uppercase tracking-wider text-[#9E7060] text-center mb-2">
              {{ decadeStart }} – {{ decadeStart + 11 }}
            </div>
            <div class="grid grid-cols-3 gap-2 py-2">
              <button
                v-for="yr in Array.from({ length: 12 }, (_, i) => decadeStart + i)"
                :key="yr"
                type="button"
                class="py-2.5 rounded-xl text-xs font-semibold tabular-nums transition-all active:scale-[0.94] cursor-pointer"
                :class="viewYear === yr
                  ? 'bg-[#3B1F0E] text-[#FFF0D1] shadow-sm font-bold'
                  : 'bg-[#FAF5EE] text-[#5B463C] hover:bg-[#F8EFE7] hover:text-[#3B1F0E]'"
                @click="selectYear(yr)"
              >
                {{ yr }}
              </button>
            </div>
          </div>

          <!-- View 3: Calendar Days -->
          <div v-else>
            <!-- Days of Week Header -->
            <div class="grid grid-cols-7 pt-2.5 pb-1 text-center">
              <span
                v-for="d in DAYS_OF_WEEK"
                :key="d"
                class="text-[11px] font-bold text-[#9E7060] uppercase tracking-wider select-none"
              >
                {{ d }}
              </span>
            </div>

            <!-- Days Grid with Month Slide Animation -->
            <Transition name="month-fade" mode="out-in">
              <div
                :key="`${viewYear}-${viewMonth}`"
                class="grid grid-cols-7 gap-y-1 pt-1"
                @mouseleave="onGridMouseLeave"
              >
                <div
                  v-for="cell in calendarDays"
                  :key="cell.dateKey"
                  class="relative flex items-center justify-center py-0.5"
                  @mouseenter="onDayHover(cell)"
                >
                  <!-- Range Background Continuous Track -->
                  <div
                    v-if="effectiveMode === 'range' && (cell.isRangeStart || cell.isRangeEnd || cell.isInRange)"
                    class="absolute inset-y-0.5 pointer-events-none bg-[#F3E5D0]"
                    :class="[
                      cell.isRangeStart && cell.isRangeEnd
                        ? 'rounded-full left-0.5 right-0.5'
                        : cell.isRangeStart
                          ? 'rounded-l-full left-0.5 right-0'
                          : cell.isRangeEnd
                            ? 'rounded-r-full left-0 right-0.5'
                            : 'left-0 right-0'
                    ]"
                  />

                  <!-- Date Cell Button -->
                  <button
                    type="button"
                    :disabled="cell.isDisabled"
                    :aria-label="cell.dateKey"
                    class="relative z-10 size-8.5 sm:size-9 rounded-full flex items-center justify-center text-[13px] font-semibold tabular-nums transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                    :class="[
                      cell.isDisabled
                        ? 'text-[#C7B5A8] opacity-25 cursor-not-allowed'
                        : cell.isSelected || cell.isRangeStart || cell.isRangeEnd
                          ? 'bg-[#3B1F0E] text-[#FFF0D1] shadow-xs font-bold scale-[1.04] cursor-pointer'
                          : cell.isInRange
                            ? 'text-[#3B1F0E] font-bold cursor-pointer hover:bg-[#EDD8CC]'
                            : cell.isToday
                              ? 'text-[#3B1F0E] font-bold ring-1.5 ring-[#7D5A50] bg-[#FFF8EA] hover:bg-[#F8EFE7] active:scale-[0.92] cursor-pointer'
                              : cell.isCurrentMonth
                                ? 'text-[#3D2B24] hover:bg-[#F8EFE7] hover:text-[#3B1F0E] active:scale-[0.92] cursor-pointer'
                                : 'text-[#C2A592] hover:bg-[#F8EFE7]/60 active:scale-[0.92] cursor-pointer'
                    ]"
                    @click="selectDay(cell)"
                  >
                    <span>{{ cell.day }}</span>
                    <!-- Subtle today indicator -->
                    <span
                      v-if="cell.isToday && !cell.isSelected && !cell.isRangeStart && !cell.isRangeEnd"
                      class="absolute bottom-1 size-1 rounded-full bg-[#7D5A50]"
                    />
                  </button>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Footer: Selection Details + Action Buttons -->
          <div class="mt-3 pt-2.5 border-t border-[#EDD8CC]/80 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="font-semibold text-[#7D5A50] hover:text-[#3B1F0E] hover:underline active:scale-[0.95] transition-all cursor-pointer focus-visible:outline-none"
                @click="selectToday"
              >
                Today
              </button>
              <button
                v-if="effectiveMode === 'range' && (internalRangeStart || internalRangeEnd)"
                type="button"
                class="font-semibold text-[#A88879] hover:text-[#803328] active:scale-[0.95] transition-all cursor-pointer focus-visible:outline-none"
                @click="clearSelection"
              >
                Clear
              </button>
            </div>

            <div class="text-[11px] font-medium text-[#9E7060] truncate max-w-[160px] text-center">
              {{ selectedFormatted }}
            </div>

            <div class="flex items-center gap-1">
              <button
                v-if="effectiveMode === 'range'"
                type="button"
                class="font-semibold text-white bg-[#3B1F0E] px-2.5 py-1 rounded-lg hover:bg-[#5A3828] active:scale-[0.95] transition-all cursor-pointer focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                :disabled="!internalRangeStart || !internalRangeEnd"
                @click="applyRangeAndClose"
              >
                Apply
              </button>
              <button
                v-else
                type="button"
                class="font-semibold text-[#5B463C] hover:text-[#3B1F0E] active:scale-[0.95] transition-all px-2 py-1 rounded-lg hover:bg-[#F8EFE7] cursor-pointer focus-visible:outline-none"
                @click="close"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Origin-aware popover animation adhering to Emil Kowalski's guidelines */
.emil-calendar-popover-enter-active {
  transition: opacity 160ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.emil-calendar-popover-leave-active {
  transition: opacity 120ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 120ms cubic-bezier(0.23, 1, 0.32, 1);
}

.emil-calendar-popover-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.emil-calendar-popover-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

/* Snappy month transition */
.month-fade-enter-active,
.month-fade-leave-active {
  transition: opacity 140ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
}

.month-fade-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.month-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@media (prefers-reduced-motion: reduce) {
  .emil-calendar-popover-enter-active,
  .emil-calendar-popover-leave-active,
  .month-fade-enter-active,
  .month-fade-leave-active {
    transition: opacity 100ms ease !important;
    transform: none !important;
  }
}
</style>
