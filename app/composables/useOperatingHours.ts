import { computed, onMounted } from 'vue'

export interface DaySchedule {
  day: string
  isOpen: boolean
  openTime: string
  closeTime: string
  is24Hours?: boolean
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 'Monday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
  { day: 'Tuesday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
  { day: 'Wednesday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
  { day: 'Thursday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
  { day: 'Friday', isOpen: true, openTime: '07:00', closeTime: '23:00' },
  { day: 'Saturday', isOpen: true, openTime: '08:00', closeTime: '23:00' },
  { day: 'Sunday', isOpen: true, openTime: '08:00', closeTime: '21:00' }
]

export function sanitizeSchedule(raw: any): DaySchedule[] {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  if (!Array.isArray(raw) || raw.length === 0) {
    return JSON.parse(JSON.stringify(DEFAULT_SCHEDULE))
  }
  return days.map(dayName => {
    const existing = raw.find((d: any) => d && d.day === dayName)
    const def = DEFAULT_SCHEDULE.find(d => d.day === dayName)!
    if (existing) {
      return {
        day: dayName,
        isOpen: typeof existing.isOpen === 'boolean' ? existing.isOpen : true,
        openTime: existing.openTime || def.openTime,
        closeTime: existing.closeTime || def.closeTime,
        is24Hours: !!existing.is24Hours
      }
    }
    return { ...def }
  })
}

export function useOperatingHours() {
  const operatingHoursState = useState<DaySchedule[]>('brewspot_operating_hours', () => {
    return JSON.parse(JSON.stringify(DEFAULT_SCHEDULE))
  })

  // Hydrate on client side safely
  if (process.client) {
    onMounted(() => {
      try {
        const saved = localStorage.getItem('brewspot_general_operating_hours')
        if (saved) {
          const parsed = JSON.parse(saved)
          operatingHoursState.value = sanitizeSchedule(parsed)
        }
      } catch (e) {
        console.warn('Failed to load operating hours from storage:', e)
      }
    })
  }

  function setOperatingHours(newSchedule: DaySchedule[]) {
    const sanitized = sanitizeSchedule(newSchedule)
    operatingHoursState.value = sanitized
    if (process.client) {
      try {
        localStorage.setItem('brewspot_general_operating_hours', JSON.stringify(sanitized))
      } catch (e) {
        console.warn('Failed to save operating hours to storage:', e)
      }
    }
  }

  function resetToDefault() {
    setOperatingHours(DEFAULT_SCHEDULE)
  }

  function formatTime12h(timeStr?: string) {
    if (!timeStr) return '00:00'
    const parts = timeStr.split(':')
    const hourStr = parts[0]
    const minStr = parts[1]
    if (!hourStr || !minStr) return timeStr
    const h = parseInt(hourStr, 10)
    const m = parseInt(minStr, 10)
    if (isNaN(h) || isNaN(m)) return timeStr
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h % 12 === 0 ? 12 : h % 12
    return `${displayHour}:${m < 10 ? '0' + m : m} ${period}`
  }

  // Returns formatted string e.g. "Mon - Sun: 7:00 AM - 10:00 PM"
  const formattedSummary = computed(() => {
    const list = sanitizeSchedule(operatingHoursState.value)
    const activeDays = list.filter(d => d.isOpen)
    if (activeDays.length === 0) return 'Closed All Week'
    
    // Check if all active days are 24 hours
    if (activeDays.every(d => d.is24Hours)) return 'Open 24/7'

    const firstOpen = activeDays[0]?.openTime || '07:00'
    const firstClose = activeDays[0]?.closeTime || '22:00'
    const allSame = activeDays.every(d => (d?.openTime || '07:00') === firstOpen && (d?.closeTime || '22:00') === firstClose && !d.is24Hours)

    if (allSame && activeDays.length === 7) {
      return `Mon - Sun: ${formatTime12h(firstOpen)} - ${formatTime12h(firstClose)}`
    }
    if (allSame && activeDays.length === 5 && !list.find(d => (d.day === 'Saturday' || d.day === 'Sunday') && d.isOpen)) {
      return `Mon - Fri: ${formatTime12h(firstOpen)} - ${formatTime12h(firstClose)}`
    }

    const first = activeDays[0]
    const last = activeDays[activeDays.length - 1]
    if (!first || !last) return 'Closed All Week'
    return `${first.day.slice(0, 3)} - ${last.day.slice(0, 3)}: ${formatTime12h(first.openTime)} - ${formatTime12h(first.closeTime)}`
  })

  // Check if store is currently OPEN right now
  const isOpenNow = computed(() => {
    const now = new Date()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const currentDayName = dayNames[now.getDay()] ?? 'Sunday'
    
    const list = sanitizeSchedule(operatingHoursState.value)
    const todaySched = list.find(d => d && d.day === currentDayName)
    if (!todaySched || !todaySched.isOpen) return false
    if (todaySched.is24Hours) return true

    if (!todaySched.openTime || !todaySched.closeTime) return false

    const [openH, openM] = todaySched.openTime.split(':').map(Number)
    const [closeH, closeM] = todaySched.closeTime.split(':').map(Number)

    if (openH === undefined || openM === undefined || closeH === undefined || closeM === undefined) return false
    if (isNaN(openH) || isNaN(openM) || isNaN(closeH) || isNaN(closeM)) return false

    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const openMinutes = openH * 60 + openM
    const closeMinutes = closeH * 60 + closeM

    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes <= closeMinutes
    } else {
      // Overnight hours e.g. 10 PM to 2 AM
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes
    }
  })

  const todayHoursText = computed(() => {
    const now = new Date()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const currentDayName = dayNames[now.getDay()] ?? 'Sunday'
    const list = sanitizeSchedule(operatingHoursState.value)
    const todaySched = list.find(d => d && d.day === currentDayName)

    if (!todaySched || !todaySched.isOpen) return 'Closed Today'
    if (todaySched.is24Hours) return 'Open 24 Hours Today'
    return `Today (${currentDayName.slice(0, 3)}): ${formatTime12h(todaySched.openTime)} - ${formatTime12h(todaySched.closeTime)}`
  })

  return {
    operatingHours: operatingHoursState,
    setOperatingHours,
    resetToDefault,
    formattedSummary,
    isOpenNow,
    todayHoursText,
    formatTime12h,
    sanitizeSchedule
  }
}
