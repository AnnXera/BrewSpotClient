import { computed, onMounted, ref } from 'vue'
import type { ApiOpeningHour, ApiOpeningHourInput } from '~/services/OwnerProfileService'

export interface DaySchedule {
  day: string
  isOpen: boolean
  openTime: string
  closeTime: string
  is24Hours?: boolean
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Business hours are Philippine time
const CAFE_TIME_ZONE = 'Asia/Manila'

// Mirrors CafeOpeningHour::DEFAULT_HOURS on the server. Closed days keep
// times only so the editor has something to show if they're reopened.
export const DEFAULT_SCHEDULE: DaySchedule[] = DAYS.map(day => ({
  day,
  isOpen: day !== 'Saturday' && day !== 'Sunday',
  openTime: '09:00',
  closeTime: '17:00',
  is24Hours: false,
}))

export function sanitizeSchedule(raw: any): DaySchedule[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return JSON.parse(JSON.stringify(DEFAULT_SCHEDULE))
  }
  return DAYS.map(dayName => {
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

function fromApi(rows: ApiOpeningHour[]): DaySchedule[] {
  return sanitizeSchedule(rows.map(r => ({
    day: r.day_of_week,
    isOpen: !r.is_closed,
    openTime: r.open_time ?? undefined,
    closeTime: r.close_time ?? undefined,
    is24Hours: r.is_24_hours,
  })))
}

function toApi(schedule: DaySchedule[]): ApiOpeningHourInput[] {
  return sanitizeSchedule(schedule).map(d => ({
    day_of_week: d.day,
    is_closed: !d.isOpen,
    is_24_hours: d.isOpen && !!d.is24Hours,
    open_time: d.isOpen && !d.is24Hours ? d.openTime : null,
    close_time: d.isOpen && !d.is24Hours ? d.closeTime : null,
  }))
}

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return (h ?? NaN) * 60 + (m ?? NaN)
}

// Day name and minutes past midnight right now, in the cafe's time zone.
function cafeNow(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAFE_TIME_ZONE, weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return { day: get('weekday'), minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

// Ticks once a minute so "Open Now" stays current on an open page.
const clock = ref(new Date())
let clockStarted = false

export function useOperatingHours() {
  const operatingHoursState = useState<DaySchedule[]>('brewspot_operating_hours', () =>
    JSON.parse(JSON.stringify(DEFAULT_SCHEDULE))
  )
  const isLoaded = useState('brewspot_operating_hours_loaded', () => false)
  const ownerService = useOwnerProfileService()
  const authStore = useAuthStore()

  async function loadOperatingHours(force = false) {
    if (isLoaded.value && !force) return
    const res = await ownerService.getOperatingHours()
    if (res.success && res.data) {
      operatingHoursState.value = fromApi(res.data)
      isLoaded.value = true
    }
  }

  /** Saves the week. Throws on failure (e.g. 422 with per-day errors). */
  async function saveOperatingHours(schedule: DaySchedule[]) {
    const res = await ownerService.updateOperatingHours(toApi(schedule))
    if (res.data) {
      operatingHoursState.value = fromApi(res.data)
      isLoaded.value = true
    }
    return res
  }

  if (import.meta.client) {
    onMounted(() => {
      // Hours used to live in the browser; that copy is stale now.
      try { localStorage.removeItem('brewspot_general_operating_hours') } catch { /* storage blocked */ }

      if (!clockStarted) {
        clockStarted = true
        setInterval(() => { clock.value = new Date() }, 60_000)
      }

      // Only owners can read the cafe's hours for now.
      if (authStore.role === 'Cafe Owner') {
        loadOperatingHours().catch(e => console.warn('Could not load operating hours:', e))
      }
    })
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

  // One day's hours as text: "8:00 AM - 5:00 PM", "24 hours" or "Closed".
  function dayHoursText(d: DaySchedule) {
    if (!d.isOpen) return 'Closed'
    if (d.is24Hours) return '24 hours'
    return `${formatTime12h(d.openTime)} - ${formatTime12h(d.closeTime)}`
  }

  // Consecutive open days with identical hours, grouped:
  // "Mon - Fri: 8:00 AM - 5:00 PM · Sat: 10:00 AM - 2:00 PM". Closed days are left out.
  const formattedSummary = computed(() => {
    if (!isLoaded.value) return 'Loading hours…'

    const list = sanitizeSchedule(operatingHoursState.value)
    const openDays = list.filter(d => d.isOpen)
    if (openDays.length === 0) return 'Closed all week'
    if (openDays.length === 7 && openDays.every(d => d.is24Hours)) return 'Open 24/7'

    const groups: { from: string; to: string; text: string }[] = []
    for (const d of list) {
      const last = groups[groups.length - 1]
      const text = dayHoursText(d)
      const prev = list[DAYS.indexOf(d.day) - 1]
      if (last && prev?.isOpen && last.text === text) last.to = d.day
      else if (d.isOpen) groups.push({ from: d.day, to: d.day, text })
    }

    return groups
      .map(g => `${g.from.slice(0, 3)}${g.to !== g.from ? ` - ${g.to.slice(0, 3)}` : ''}: ${g.text}`)
      .join(' · ')
  })

  // The week for display, with today flagged (cafe time).
  const weekView = computed(() => {
    const { day } = cafeNow(clock.value)
    return sanitizeSchedule(operatingHoursState.value).map(d => ({
      ...d,
      short: d.day.slice(0, 3),
      isToday: d.day === day,
      text: dayHoursText(d),
      overnight: d.isOpen && !d.is24Hours && d.closeTime < d.openTime,
    }))
  })

  // Open right now (cafe time)? Covers 24-hour days and hours that run past
  // midnight, including the early hours that belong to yesterday's opening.
  const isOpenNow = computed(() => {
    if (!isLoaded.value) return false

    const { day, minutes } = cafeNow(clock.value)
    const list = sanitizeSchedule(operatingHoursState.value)
    const todayIndex = DAYS.indexOf(day)
    const today = list[todayIndex]
    const yesterday = list[(todayIndex + 6) % 7]

    if (today?.isOpen) {
      if (today.is24Hours) return true
      const open = toMinutes(today.openTime)
      const close = toMinutes(today.closeTime)
      if (close > open ? minutes >= open && minutes < close : minutes >= open) return true
    }

    if (yesterday?.isOpen && !yesterday.is24Hours) {
      const open = toMinutes(yesterday.openTime)
      const close = toMinutes(yesterday.closeTime)
      if (close <= open && minutes < close) return true
    }

    return false
  })

  // What happens next: "Closes 10:00 PM", "Opens 9:00 AM tomorrow", "Opens 9:00 AM Mon".
  const nextChangeText = computed(() => {
    if (!isLoaded.value) return ''

    const { day, minutes } = cafeNow(clock.value)
    const list = sanitizeSchedule(operatingHoursState.value)
    const todayIndex = DAYS.indexOf(day)
    const today = list[todayIndex]
    const yesterday = list[(todayIndex + 6) % 7]

    if (isOpenNow.value) {
      // Still inside yesterday's past-midnight hours.
      if (yesterday?.isOpen && !yesterday.is24Hours && yesterday.closeTime < yesterday.openTime
        && minutes < toMinutes(yesterday.closeTime)) {
        return `Closes ${formatTime12h(yesterday.closeTime)}`
      }
      if (today?.is24Hours) {
        // Walk forward through back-to-back 24-hour days.
        for (let i = 1; i <= 7; i++) {
          const d = list[(todayIndex + i) % 7]!
          if (!d.isOpen) return `Closes midnight ${i === 1 ? 'tonight' : DAYS[(todayIndex + i - 1) % 7]!.slice(0, 3)}`
          if (!d.is24Hours) return 'Open 24 hours today'
        }
        return 'Open 24/7'
      }
      return today ? `Closes ${formatTime12h(today.closeTime)}` : ''
    }

    for (let i = 0; i < 7; i++) {
      const d = list[(todayIndex + i) % 7]!
      if (!d.isOpen) continue
      const opensAt = d.is24Hours ? '00:00' : d.openTime
      if (i === 0 && toMinutes(opensAt) <= minutes) continue
      const when = i === 0 ? '' : i === 1 ? ' tomorrow' : ` ${d.day.slice(0, 3)}`
      return `Opens ${formatTime12h(opensAt)}${when}`
    }
    return 'Closed all week'
  })

  const todayHoursText = computed(() => {
    const { day } = cafeNow(clock.value)
    const todaySched = sanitizeSchedule(operatingHoursState.value).find(d => d.day === day)

    if (!todaySched || !todaySched.isOpen) return 'Closed Today'
    if (todaySched.is24Hours) return 'Open 24 Hours Today'
    return `Today (${day.slice(0, 3)}): ${formatTime12h(todaySched.openTime)} - ${formatTime12h(todaySched.closeTime)}`
  })

  return {
    operatingHours: operatingHoursState,
    isLoaded,
    loadOperatingHours,
    saveOperatingHours,
    formattedSummary,
    weekView,
    isOpenNow,
    nextChangeText,
    todayHoursText,
    formatTime12h,
    sanitizeSchedule
  }
}
