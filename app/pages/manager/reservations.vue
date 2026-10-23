<script setup lang="ts">
import type { FloorPlan, FloorPlanElement, FloorPlanTable } from '~/services/FloorPlanService'
import type { ReservationRecord } from '~/services/ReservationService'
import type { OpeningHour, ReservationStatus } from '~/services/ReservationService'
import { FLOOR_TAB_LIMIT, doorAsset, tableAsset } from '~/utils/floorPlanCatalog'

definePageMeta({
  role: 'Manager',
})

const links = [
  { label: 'Dashboard', to: '/manager/dashboard', icon: 'squares-2x2' },
  { label: 'Cafe Management', to: '/manager/cafe', icon: 'building-storefront' },
  { label: 'Servings', to: '/manager/servings', icon: 'cake' },
  { label: 'Reservations', to: '/manager/reservations', icon: 'calendar-days' },
  { label: 'Floor Plan', to: '/manager/floor-plan', icon: 'map' },
]

// Statuses that hold a table (mirrors floor_plan.blocking_reservation_statuses).
// A booking holds its table for the whole day: guests may stay as long as they like.
const BLOCKING = ['pending', 'confirmed', 'seated']
const SLOT_MINUTES = 30
const FIRST_SLOT = 6 * 60
const LAST_SLOT_END = 22 * 60
const DATE_STRIP_DAYS = 14
const PLAN_MAX_SCALE = 1.5
const PLAN_MIN_SCALE = 0.6
const PLAN_MAX_VIEWPORT = 0.62

const service = useFloorPlanService('manager')
const reservationService = useReservationService('manager')
const branches = ref<{ uuid: string; branch_name: string }[]>([])
const branchUuid = ref('')
const activePlan = ref<FloorPlan | null>(null)
const plans = ref<FloorPlan[]>([])
const planLoading = ref(false)
const loading = ref(true)
const errorMessage = ref('')
const reservationError = ref('')
const reservationNotice = ref('')
const reservations = ref<ReservationRecord[]>([])
const dayReservations = ref<ReservationRecord[]>([])
const openingHours = ref<OpeningHour[]>([])
const dayLoading = ref(false)
const showWaitlist = ref(false)
const waitlistLoading = ref(false)
const submitting = ref(false)
const updatingReservation = ref<string | null>(null)
const waitlistActionError = ref('')
const selectedWaitlistReservation = ref<ReservationRecord | null>(null)
const waitlistSearch = ref('')
const waitlistStatusFilter = ref('all')
const selectedTable = ref<FloorPlanTable | null>(null)
const selectedChair = ref<FloorPlanElement | null>(null)
const inspectedTable = ref<FloorPlanTable | null>(null)
const datePicker = ref<HTMLInputElement | null>(null)
const slotStrip = ref<HTMLElement | null>(null)
const planFrame = ref<HTMLElement | null>(null)
const planFrameWidth = ref(0)
const now = ref(new Date())

const pad = (part: number) => String(part).padStart(2, '0')

function localDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function minutesToTime(minutes: number) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function nextSlotMinutes(from: Date) {
  const minutes = from.getHours() * 60 + from.getMinutes()
  return Math.min(Math.ceil(minutes / SLOT_MINUTES) * SLOT_MINUTES, 24 * 60 - SLOT_MINUTES)
}

const todayDate = computed(() => localDateKey(now.value))
const selectedDate = ref(todayDate.value)
const selectedTime = ref(minutesToTime(nextSlotMinutes(now.value)))

const reservation = reactive({
  customerName: '',
  partySize: 2,
  customerPhone: '',
  notes: '',
})

const planTables = computed<FloorPlanTable[]>(() => activePlan.value?.tables ?? [])
const planElements = computed<FloorPlanElement[]>(() => activePlan.value?.elements ?? [])
const filteredReservations = computed(() => {
  const search = waitlistSearch.value.trim().toLowerCase()
  return reservations.value.filter((item) => {
    const matchesStatus = waitlistStatusFilter.value === 'all'
      || item.status === waitlistStatusFilter.value
    const searchableText = [
      item.customer_name,
      item.customer_phone,
      item.table?.table_name ?? '',
    ].join(' ').toLowerCase()
    return matchesStatus && (!search || searchableText.includes(search))
  })
})

// ── Date and time window ────────────────────────────────────────────

// Minutes may reach 24:00, which lands on the next day's midnight.
function dateAt(date: string, minutes: number) {
  const day = new Date(`${date}T00:00:00`)
  day.setMinutes(minutes)
  return day
}

// The closing time of the open window that contains the given arrival minute.
function closingMinutes(dateKey: string, minutes: number) {
  const range = openWindows(dateKey).find(([open, close]) => minutes >= open && minutes < close)
  return range ? range[1] : minutes + SLOT_MINUTES
}

// The booking runs from arrival to closing, so the guests' stay is never cut short.
const windowStart = computed(() => dateAt(selectedDate.value, timeToMinutes(selectedTime.value)))
const windowEnd = computed(() =>
  dateAt(selectedDate.value, closingMinutes(selectedDate.value, timeToMinutes(selectedTime.value))))
const windowIsPast = computed(() => windowStart.value.getTime() < now.value.getTime() - 5 * 60_000)
const windowIncludesNow = computed(() =>
  windowStart.value.getTime() <= now.value.getTime() && now.value.getTime() < windowEnd.value.getTime())

const dateStrip = computed(() => {
  const start = new Date(`${todayDate.value}T00:00:00`)
  return Array.from({ length: DATE_STRIP_DAYS }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return {
      key: localDateKey(day),
      closed: !openWindows(localDateKey(day)).length,
      weekday: index === 0 ? 'Today' : new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day),
      day: day.getDate(),
      month: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(day),
    }
  })
})

const selectedDateOutsideStrip = computed(() => !dateStrip.value.some((day) => day.key === selectedDate.value))

const selectedDateLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    .format(new Date(`${selectedDate.value}T00:00:00`)))

function shiftDate(days: number) {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  date.setDate(date.getDate() + days)
  const key = localDateKey(date)
  if (key < todayDate.value) return
  selectedDate.value = key
}

function openDatePicker() {
  const input = datePicker.value
  if (!input) return
  try {
    input.showPicker()
  } catch {
    input.focus()
  }
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
}

function formatSlot(minutes: number) {
  return formatClock(dateAt(todayDate.value, minutes))
}

// ── Availability ────────────────────────────────────────────────────

function reservationDateValue(value: string) {
  const normalized = (value.includes('T') ? value : value.replace(' ', 'T'))
    .replace(/\.(\d{3})\d+(?=Z$)/, '.$1')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

// No-show only once the booked time has arrived; cancelling only before it.
function reservationStarted(item: ReservationRecord) {
  const start = reservationDateValue(item.reservation_date)
  return !!start && start.getTime() <= now.value.getTime()
}

const activeDayReservations = computed(() =>
  dayReservations.value
    .filter((item) => BLOCKING.includes(item.status))
    .map((item) => ({
      item,
      start: reservationDateValue(item.reservation_date),
      end: reservationDateValue(item.reservation_end),
    }))
    .filter((entry): entry is { item: ReservationRecord; start: Date; end: Date } => Boolean(entry.start && entry.end)))

// Counter seating is booked by seats, so it only fills up once every seat is taken.
function isShared(table: FloorPlanTable) {
  return /^table_bar_\d+$/.test(table.asset_key ?? '')
}

// Any active booking on the selected date holds its table for the whole day.
function tableHolds(table: FloorPlanTable) {
  return activeDayReservations.value.filter((entry) => entry.item.table?.uuid === table.uuid)
}

function tableIsTaken(table: FloorPlanTable, includesNow: boolean) {
  if (includesNow && table.status !== 'available') return true
  const holds = tableHolds(table)
  if (!holds.length) return false
  if (!isShared(table)) return true
  const seats = holds.reduce((sum, entry) => sum + entry.item.party_size, 0)
  return seats >= table.capacity
}

const takenTables = computed(() => new Set(
  planTables.value
    .filter((table) => tableIsTaken(table, windowIncludesNow.value))
    .map((table) => table.uuid),
))

const freeTableCount = computed(() => planTables.value.length - takenTables.value.size)

// ── Opening hours: slots only cover times the server will accept ─────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function hoursFor(day: Date) {
  return openingHours.value.find((row) => row.day_of_week === WEEKDAYS[day.getDay()])
}

// Open windows of one calendar day, in minutes from midnight. Windows past midnight are cut at 24:00,
// and the previous day's after-midnight hours open the early morning.
function openWindows(dateKey: string): [number, number][] {
  if (!openingHours.value.length) return [[FIRST_SLOT, LAST_SLOT_END]]
  const day = new Date(`${dateKey}T00:00:00`)
  const previous = new Date(day)
  previous.setDate(day.getDate() - 1)
  const windows: [number, number][] = []
  const before = hoursFor(previous)
  if (before && !before.is_closed && !before.is_24_hours && before.closes_after_midnight && before.close_time) {
    windows.push([0, timeToMinutes(before.close_time)])
  }
  const row = hoursFor(day)
  if (row && !row.is_closed) {
    if (row.is_24_hours) windows.push([0, 24 * 60])
    else if (row.open_time && row.close_time) {
      windows.push([timeToMinutes(row.open_time), row.closes_after_midnight ? 24 * 60 : timeToMinutes(row.close_time)])
    }
  }
  return windows
}

const dayIsClosed = computed(() => !openWindows(selectedDate.value).length)

const slots = computed(() => {
  const list = []
  for (const [open, close] of openWindows(selectedDate.value)) {
    const end = dateAt(selectedDate.value, close)
    for (let minutes = Math.ceil(open / SLOT_MINUTES) * SLOT_MINUTES; minutes + SLOT_MINUTES <= close; minutes += SLOT_MINUTES) {
      const start = dateAt(selectedDate.value, minutes)
      const includesNow = start.getTime() <= now.value.getTime() && now.value.getTime() < end.getTime()
      const free = planTables.value.filter((table) => !tableIsTaken(table, includesNow)).length
      list.push({
        time: minutesToTime(minutes),
        label: formatSlot(minutes),
        free,
        past: start.getTime() < now.value.getTime() - 5 * 60_000,
      })
    }
  }
  return list
})

const noSlotsLeft = computed(() => !slots.value.some((slot) => !slot.past))
const selectedSlotValid = computed(() => slots.value.some((slot) => slot.time === selectedTime.value && !slot.past))

function seatIsOccupied(chair: FloorPlanElement) {
  return activeDayReservations.value.some((entry) => entry.item.seat_element_uuid === chair.uuid)
}

function tableVisualStatus(table: FloorPlanTable) {
  return takenTables.value.has(table.uuid) ? 'unavailable' : 'available'
}

const inspectedHolds = computed(() =>
  inspectedTable.value ? tableHolds(inspectedTable.value) : [])

const inspectedReason = computed(() => {
  const table = inspectedTable.value
  if (!table || inspectedHolds.value.length) return ''
  if (table.status === 'occupied') return 'Guests are seated at this table right now.'
  if (table.status === 'cleaning') return 'This table is being cleaned right now.'
  return 'This table is not available right now.'
})

function tableLabel(table: FloorPlanTable) {
  return table.table_name.match(/(\d+)\s*$/)?.[1] ?? table.table_name.slice(0, 3)
}

function clearSelection() {
  selectedTable.value = null
  selectedChair.value = null
  inspectedTable.value = null
}

function selectTable(table: FloorPlanTable) {
  reservationNotice.value = ''
  reservationError.value = ''
  if (takenTables.value.has(table.uuid)) {
    selectedTable.value = null
    selectedChair.value = null
    inspectedTable.value = table
    return
  }
  inspectedTable.value = null
  selectedTable.value = table
  selectedChair.value = null
  reservation.partySize = Math.min(Math.max(1, reservation.partySize), table.capacity)
}

function selectChair(chair: FloorPlanElement) {
  if (seatIsOccupied(chair)) return
  const communalTables = planTables.value.filter((table) =>
    !takenTables.value.has(table.uuid) && table.asset_key === 'table_communal_8')
  if (!communalTables.length) {
    reservationError.value = 'No available communal table is connected to this chair.'
    return
  }

  const chairCenter = {
    x: chair.x_location + (chair.width ?? 32) / 2,
    y: chair.y_location + (chair.height ?? 32) / 2,
  }
  const table = communalTables.reduce((nearest, candidate) => {
    const asset = tableAsset(candidate.asset_key)
    const distance = Math.hypot(
      chairCenter.x - (candidate.x_location + (asset?.w ?? 56) / 2),
      chairCenter.y - (candidate.y_location + (asset?.h ?? 144) / 2),
    )
    if (!nearest || distance < nearest.distance) return { table: candidate, distance }
    return nearest
  }, null as { table: FloorPlanTable; distance: number } | null)?.table

  if (!table) return
  inspectedTable.value = null
  selectedTable.value = table
  selectedChair.value = chair
  reservation.partySize = 1
  reservationError.value = ''
}

// A selection made for one window must not survive into a window where it is taken.
watch([selectedDate, selectedTime, dayReservations], () => {
  if (selectedTable.value && takenTables.value.has(selectedTable.value.uuid)) {
    reservationError.value = `${selectedTable.value.table_name} is reserved on this date. Choose another table.`
    selectedTable.value = null
    selectedChair.value = null
  } else if (selectedChair.value && seatIsOccupied(selectedChair.value)) {
    reservationError.value = 'That seat is reserved on this date. Choose another seat.'
    selectedTable.value = null
    selectedChair.value = null
  }
  if (inspectedTable.value && !takenTables.value.has(inspectedTable.value.uuid)) inspectedTable.value = null
})

watch(selectedDate, () => {
  reservationNotice.value = ''
  if (selectedDate.value < todayDate.value) selectedDate.value = todayDate.value
  loadDayReservations()
})

// Keep the picked time on a bookable slot: the same time if it exists, else the next one after it.
function ensureValidTime() {
  const open = slots.value.filter((slot) => !slot.past)
  if (!open.length || selectedSlotValid.value) return
  const wanted = timeToMinutes(selectedTime.value)
  const next = open.find((slot) => timeToMinutes(slot.time) >= wanted) ?? open[open.length - 1]!
  selectedTime.value = next.time
}

watch(slots, ensureValidTime, { immediate: true })

function scrollActiveSlotIntoView() {
  nextTick(() => {
    const active = slotStrip.value?.querySelector<HTMLElement>('[aria-pressed="true"]')
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  })
}

watch(selectedTime, scrollActiveSlotIntoView)

// ── Plan geometry: the whole room as drawn in the Floor Plan editor, fitted to the frame ──

function tableSize(table: FloorPlanTable) {
  const asset = tableAsset(table.asset_key)
  return { w: asset?.w ?? 112, h: asset?.h ?? 90 }
}

const planSize = computed(() => ({
  w: activePlan.value?.canvas_width ?? 0,
  h: activePlan.value?.canvas_height ?? 0,
}))

// Fit the room to the frame's width and to most of the screen's height, so the whole layout is in view.
const planScale = computed(() => {
  const { w, h } = planSize.value
  if (!planFrameWidth.value || !w || !h) return 1
  const maxHeight = Math.max(360, viewportHeight.value * PLAN_MAX_VIEWPORT)
  // Below the minimum the room scrolls inside its frame instead, so tables stay big enough to tap.
  return Math.max(PLAN_MIN_SCALE, Math.min(PLAN_MAX_SCALE, planFrameWidth.value / w, maxHeight / h))
})

const viewportHeight = ref(800)
function updateViewportHeight() {
  viewportHeight.value = window.innerHeight
}

let frameObserver: ResizeObserver | null = null
watch(planFrame, (element) => {
  frameObserver?.disconnect()
  if (!element) return
  frameObserver = new ResizeObserver(([entry]) => {
    planFrameWidth.value = entry?.contentRect.width ?? 0
  })
  frameObserver.observe(element)
})

// ── Data ────────────────────────────────────────────────────────────

async function loadPlan() {
  if (!branchUuid.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await service.list(branchUuid.value)
    plans.value = response.floor_plans
    const savedPlan = response.floor_plans.find((item) => item.is_active)
      ?? response.floor_plans[0]
    activePlan.value = savedPlan
      ? (await service.show(branchUuid.value, savedPlan.uuid)).floor_plan
      : null
    clearSelection()
  } catch (error: any) {
    activePlan.value = null
    errorMessage.value = error?.data?.message ?? 'Could not load the saved floor plan.'
  } finally {
    loading.value = false
  }
}

async function switchPlan(planUuid: string) {
  if (planUuid === activePlan.value?.uuid || planLoading.value) return
  planLoading.value = true
  try {
    activePlan.value = (await service.show(branchUuid.value, planUuid)).floor_plan
    clearSelection()
  } catch (error: any) {
    reservationError.value = error?.data?.message ?? 'Could not open that floor plan.'
  } finally {
    planLoading.value = false
  }
}

function unwrap(response: { reservations: ReservationRecord[] | { data: ReservationRecord[] } }) {
  return Array.isArray(response.reservations)
    ? response.reservations
    : response.reservations.data ?? []
}

async function loadReservations() {
  if (!branchUuid.value) return
  reservations.value = unwrap(await reservationService.list(branchUuid.value))
}

let dayRequest = 0
async function loadDayReservations() {
  if (!branchUuid.value) return
  const request = ++dayRequest
  dayLoading.value = true
  try {
    const response = await reservationService.list(branchUuid.value, selectedDate.value)
    if (request === dayRequest) dayReservations.value = unwrap(response)
  } catch (error: any) {
    if (request === dayRequest) reservationError.value = error?.data?.message ?? 'Could not load reservations for this date.'
  } finally {
    if (request === dayRequest) dayLoading.value = false
  }
}

// Without hours the server accepts any time, so falling back to the default range is safe.
async function loadOpeningHours() {
  if (!branchUuid.value) return
  try {
    openingHours.value = (await reservationService.openingHours(branchUuid.value)).data ?? []
  } catch {
    openingHours.value = []
  }
}

async function changeBranch() {
  await Promise.all([loadPlan(), loadOpeningHours()])
  await Promise.all([loadReservations(), loadDayReservations()])
}

async function updateReservationStatus(item: ReservationRecord, status: ReservationStatus) {
  if (updatingReservation.value) return
  updatingReservation.value = item.uuid
  waitlistActionError.value = ''
  try {
    const response = await reservationService.updateStatus(branchUuid.value, item.uuid, status)
    // Swap in the server's copy so the row shows its new status and actions right away.
    reservations.value = reservations.value.map((reservation) => reservation.uuid === item.uuid ? response.reservation : reservation)
    await loadDayReservations()
  } catch (error: any) {
    // The row stays as it was; the message shows above the list instead of replacing it.
    waitlistActionError.value = error?.data?.message ?? 'Could not update the reservation status.'
  } finally {
    updatingReservation.value = null
  }
}

async function openWaitlist() {
  showWaitlist.value = true
  waitlistLoading.value = true
  reservationError.value = ''
  waitlistActionError.value = ''
  try {
    await loadReservations()
  } catch (error: any) {
    reservationError.value = error?.data?.message ?? 'Could not load the waitlist.'
  } finally {
    waitlistLoading.value = false
  }
}

function serverDateTime(date: Date) {
  return `${localDateKey(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

function formatReservationDate(value: string) {
  const date = reservationDateValue(value)
  if (!date) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatReservationTime(value: string) {
  const date = reservationDateValue(value)
  if (!date) return value
  return formatClock(date)
}

function tableNumber(item: ReservationRecord) {
  const name = item.table?.table_name?.trim()
  if (!name) return 'Unassigned'
  return name.match(/\d+\s*$/)?.[0]?.trim() ?? name
}

const agenda = computed(() =>
  [...activeDayReservations.value].sort((a, b) => a.start.getTime() - b.start.getTime()))

// Bookings that arrive in the selected time slot.
function agendaInSelectedSlot(entry: { start: Date }) {
  const offset = entry.start.getTime() - windowStart.value.getTime()
  return offset >= 0 && offset < SLOT_MINUTES * 60_000
}

function jumpTo(entry: { start: Date }) {
  const minutes = entry.start.getHours() * 60 + entry.start.getMinutes()
  const snapped = Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES
  selectedTime.value = minutesToTime(snapped)
  ensureValidTime()
}

const phoneDigits = computed(() => reservation.customerPhone.replace(/\D/g, ''))
const canConfirm = computed(() =>
  !windowIsPast.value
  && selectedSlotValid.value
  && Boolean(selectedTable.value)
  && Boolean(reservation.customerName.trim())
  && phoneDigits.value.length === 11
  && reservation.partySize >= 1
  && !submitting.value)

async function confirmReservation() {
  if (windowIsPast.value) {
    reservationError.value = 'That time has already passed. Pick a later time.'
    return
  }
  if (!canConfirm.value || !selectedTable.value) return
  submitting.value = true
  reservationError.value = ''
  reservationNotice.value = ''
  const tableName = selectedTable.value.table_name
  try {
    await reservationService.create(branchUuid.value, {
      table_uuid: selectedTable.value.uuid,
      seat_element_uuid: selectedChair.value?.uuid,
      customer_name: reservation.customerName.trim(),
      customer_phone: phoneDigits.value,
      party_size: reservation.partySize,
      reservation_date: serverDateTime(windowStart.value),
      reservation_end: serverDateTime(windowEnd.value),
      notes: reservation.notes.trim() || undefined,
    })
    // Clear the selection before reloading, or the watcher reports the new booking as a clash.
    reservationNotice.value = `${tableName} booked for ${reservation.customerName.trim()} at ${formatClock(windowStart.value)}.`
    reservation.customerName = ''
    reservation.customerPhone = ''
    reservation.notes = ''
    reservation.partySize = 2
    selectedTable.value = null
    selectedChair.value = null
    await Promise.all([loadReservations(), loadDayReservations()])
  } catch (error: any) {
    reservationError.value = error?.data?.message ?? 'Could not save the reservation.'
  } finally {
    submitting.value = false
  }
}

// Open on the first day that still has a bookable time, instead of a closed or finished today.
function openOnBookableDay() {
  if (!noSlotsLeft.value) return
  const day = dateStrip.value.find((item) => item.key > selectedDate.value && openWindows(item.key)
    .some(([open, close]) => close - Math.ceil(open / SLOT_MINUTES) * SLOT_MINUTES >= SLOT_MINUTES))
  if (day) selectedDate.value = day.key
}

let clock: ReturnType<typeof setInterval> | undefined

// New bookings from the POS floor plan or other managers appear without a manual reload.
useAutoRefresh(() => Promise.all([loadReservations(), loadDayReservations()]))

onMounted(async () => {
  clock = setInterval(() => { now.value = new Date() }, 60_000)
  updateViewportHeight()
  window.addEventListener('resize', updateViewportHeight)
  scrollActiveSlotIntoView()
  try {
    const response = await service.managedBranches()
    branches.value = response.branches
    branchUuid.value = branches.value[0]?.uuid ?? ''
    await Promise.all([loadPlan(), loadOpeningHours()])
    openOnBookableDay()
    await Promise.all([loadReservations(), loadDayReservations()])
    scrollActiveSlotIntoView()
  } catch (error: any) {
    errorMessage.value = error?.data?.message ?? 'Could not load branches.'
    loading.value = false
  }
})

onBeforeUnmount(() => {
  clearInterval(clock)
  frameObserver?.disconnect()
  window.removeEventListener('resize', updateViewportHeight)
})
</script>

<template>
  <div class="reservations flex min-h-screen flex-col bg-[#FFF8EA] md:flex-row">
    <NavBar :links="links" />
    <main class="min-w-0 flex-1 p-4 md:p-8">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl font-semibold tracking-tight text-[#3B2A24]">Reservations</h1>
          <p class="mt-1 text-sm text-[#76605A]">Pick a date and time to see which tables are free.</p>
        </div>
        <div class="flex items-center gap-2">
          <select
            v-if="branches.length > 1"
            v-model="branchUuid"
            aria-label="Branch"
            class="h-10 rounded-lg border border-[#DCC8B8] bg-white px-3 text-sm text-[#5B463C] outline-none focus-visible:border-[#7D5A50] focus-visible:ring-2 focus-visible:ring-[#7D5A50]/25"
            @change="changeBranch"
          >
            <option v-for="branch in branches" :key="branch.uuid" :value="branch.uuid">{{ branch.branch_name }}</option>
          </select>
          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-lg border border-[#C79679] px-4 text-sm text-[#5B463C] transition-colors hover:bg-[#F8EFE7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/30"
            :class="showWaitlist ? 'bg-[#F8EFE7]' : 'bg-white'"
            @click.stop="openWaitlist"
          >
            <Icon name="heroicons:queue-list" class="size-4" />
            Waitlist
            <span class="rounded-full bg-[#F2E0D2] px-2 text-xs tabular-nums text-[#7D5A50]">{{ reservations.length }}</span>
          </button>
        </div>
      </header>

      <!-- When: date strip, arrival time -->
      <section class="mt-6 rounded-2xl border border-[#E8D7C7] bg-[#FFFDF9] p-4 md:p-5" aria-label="Reservation date and time">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="font-display text-lg font-semibold text-[#3B2A24]">{{ selectedDateLabel }}</h2>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="grid size-9 place-items-center rounded-lg text-[#5B463C] transition-colors hover:bg-[#F8EFE7] disabled:cursor-not-allowed disabled:opacity-30"
              :disabled="selectedDate <= todayDate"
              aria-label="Previous day"
              @click="shiftDate(-1)"
            >
              <Icon name="heroicons:chevron-left" class="size-5" />
            </button>
            <button
              type="button"
              class="grid size-9 place-items-center rounded-lg text-[#5B463C] transition-colors hover:bg-[#F8EFE7]"
              aria-label="Next day"
              @click="shiftDate(1)"
            >
              <Icon name="heroicons:chevron-right" class="size-5" />
            </button>
            <div class="relative">
              <button
                type="button"
                class="inline-flex h-9 items-center gap-2 rounded-lg border border-[#DCC8B8] bg-white px-3 text-sm text-[#5B463C] transition-colors hover:border-[#7D5A50]"
                @click="openDatePicker"
              >
                <Icon name="heroicons:calendar-days" class="size-4" />
                Other date
              </button>
              <input
                ref="datePicker"
                v-model="selectedDate"
                type="date"
                :min="todayDate"
                tabindex="-1"
                aria-hidden="true"
                class="pointer-events-none absolute inset-0 opacity-0"
              >
            </div>
          </div>
        </div>

        <div class="scroll-strip -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="Date">
          <button
            v-for="day in dateStrip"
            :key="day.key"
            type="button"
            :aria-pressed="selectedDate === day.key"
            class="flex w-[60px] shrink-0 flex-col items-center rounded-xl border py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            :class="selectedDate === day.key
              ? 'border-[#3B2A24] bg-[#3B2A24] text-[#FFF0D1]'
              : 'border-[#E8D7C7] bg-white text-[#5B463C] hover:border-[#7D5A50]'"
            @click="selectedDate = day.key"
          >
            <span class="text-[11px] font-medium" :class="selectedDate === day.key ? 'text-[#F2E0D2]' : 'text-[#76605A]'">{{ day.weekday }}</span>
            <span class="font-display text-xl font-semibold leading-tight tabular-nums">{{ day.day }}</span>
            <span class="text-[11px]" :class="selectedDate === day.key ? 'text-[#F2E0D2]' : day.closed ? 'font-medium text-[#A4472E]' : 'text-[#76605A]'">{{ day.closed ? 'Closed' : day.month }}</span>
          </button>
          <div
            v-if="selectedDateOutsideStrip"
            class="flex shrink-0 items-center rounded-xl border border-[#3B2A24] bg-[#3B2A24] px-4 text-sm font-medium text-[#FFF0D1]"
          >
            {{ selectedDateLabel }}
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-baseline justify-between gap-3 border-t border-[#F0E3D6] pt-4">
          <h3 class="text-sm font-medium text-[#3B2A24]">Arrival time</h3>
          <p class="text-xs text-[#76605A]">A booked table is held for the whole day.</p>
        </div>

        <p v-if="dayIsClosed || noSlotsLeft" class="mt-3 rounded-xl border border-dashed border-[#DCC8B8] px-4 py-3 text-sm text-[#5B463C]">
          {{ dayIsClosed ? `The cafe is closed on ${selectedDateLabel}.` : 'No bookable times are left today.' }}
          Pick another date.
        </p>
        <div v-else ref="slotStrip" class="scroll-strip -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="Arrival time">
          <button
            v-for="slot in slots"
            :key="slot.time"
            type="button"
            :disabled="slot.past"
            :aria-pressed="selectedTime === slot.time"
            :aria-label="`${slot.label}, ${slot.free} of ${planTables.length} tables free`"
            class="flex w-[84px] shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 disabled:cursor-not-allowed disabled:border-dashed disabled:bg-transparent disabled:text-[#B8A79D]"
            :class="selectedTime === slot.time
              ? 'border-[#3B2A24] bg-[#3B2A24] text-[#FFF0D1]'
              : 'border-[#E8D7C7] bg-white text-[#3B2A24] hover:border-[#7D5A50]'"
            @click="selectedTime = slot.time"
          >
            <span class="text-sm font-medium tabular-nums">{{ slot.label }}</span>
            <span
              v-if="!slot.past && planTables.length"
              class="text-[11px] tabular-nums"
              :class="selectedTime === slot.time
                ? 'text-[#F2E0D2]'
                : slot.free === 0 ? 'font-medium text-[#A4472E]' : 'text-[#76605A]'"
            >
              {{ slot.free === 0 ? 'Full' : `${slot.free} free` }}
            </span>
            <span v-else-if="slot.past" class="text-[11px]">Passed</span>
          </button>
        </div>
      </section>

      <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div class="min-w-0 space-y-5">
          <!-- Floor plan -->
          <section class="rounded-2xl border border-[#E8D7C7] bg-white p-4 md:p-5" aria-label="Floor plan">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <FloorPlanSwitcher v-if="plans.length > FLOOR_TAB_LIMIT" :plans="plans" :current-uuid="activePlan?.uuid" @select="switchPlan" />
              <div v-else-if="plans.length > 1" class="flex w-full gap-1 overflow-x-auto rounded-lg bg-[#F8EFE7] p-1 sm:w-auto" role="group" aria-label="Floor plan area">
                <button
                  v-for="plan in plans"
                  :key="plan.uuid"
                  type="button"
                  :aria-pressed="plan.uuid === activePlan?.uuid"
                  class="shrink-0 rounded-md px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                  :class="plan.uuid === activePlan?.uuid ? 'bg-[#3B2A24] text-[#FFF0D1]' : 'text-[#5B463C] hover:bg-white'"
                  @click="switchPlan(plan.uuid)"
                >
                  {{ plan.floorplan_name }}
                </button>
              </div>
              <p class="text-sm text-[#5B463C]" aria-live="polite">
                <span v-if="plans.length === 1 && activePlan" class="mr-1 font-medium text-[#3B2A24]">{{ activePlan.floorplan_name }} ·</span>
                <template v-if="!selectedSlotValid">
                  <span class="text-[#76605A]">No bookable time on this date.</span>
                </template>
                <template v-else-if="planTables.length">
                  <strong class="font-display text-base font-semibold tabular-nums text-[#3B2A24]">{{ freeTableCount }} of {{ planTables.length }}</strong>
                  tables free
                  <span class="text-[#76605A]">for the day</span>
                  <span v-if="dayLoading" class="ml-1 text-[#76605A]">· updating</span>
                </template>
              </p>
              <ul class="flex items-center gap-4 text-xs text-[#5B463C]">
                <li class="flex items-center gap-1.5"><span class="size-3.5 rounded border-[1.5px] border-[#7D5A50] bg-white" />Available</li>
                <li class="flex items-center gap-1.5"><span class="size-3.5 rounded border-[1.5px] border-[#BDBDBD] bg-[#D9D9D9]" />Reserved</li>
                <li class="flex items-center gap-1.5"><span class="size-3.5 rounded border-[1.5px] border-[#7D5A50] bg-[#7D5A50]" />Selected</li>
              </ul>
            </div>

            <div v-if="loading" class="mt-4 flex min-h-[360px] items-center justify-center rounded-xl bg-[#FFFDF9] text-sm text-[#76605A]">Loading floor plan…</div>
            <div v-else-if="errorMessage" class="mt-4 flex min-h-[360px] items-center justify-center rounded-xl bg-[#FFFDF9] text-sm text-[#A4472E]">{{ errorMessage }}</div>
            <div v-else-if="!activePlan" class="mt-4 flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-xl bg-[#FFFDF9] text-sm text-[#76605A]">
              No floor plan has been saved for this branch yet.
              <NuxtLink to="/manager/floor-plan" class="rounded-lg bg-[#3B2A24] px-4 py-2 text-xs text-white">Set up the floor plan</NuxtLink>
            </div>
            <div v-else ref="planFrame" class="plan scroll-strip mt-4 overflow-auto rounded-xl bg-[#FBF6EF] p-3 md:p-4">
              <!-- The room at its saved canvas size, drawn like the Floor Plan editor's preview -->
              <div
                class="relative mx-auto transition-opacity"
                :class="planLoading ? 'opacity-40' : ''"
                :style="{ width: `${planSize.w * planScale}px`, height: `${planSize.h * planScale}px` }"
              >
                <div
                  class="absolute left-0 top-0 origin-top-left rounded-[10px] border border-[#EADBCB] bg-white shadow-[0_1px_3px_rgba(59,42,36,0.08)]"
                  :style="{ width: `${planSize.w}px`, height: `${planSize.h}px`, transform: `scale(${planScale})` }"
                >
                  <template v-for="element in planElements" :key="element.uuid">
                    <img
                      v-if="element.category === 'door' && doorAsset(element.asset_key)?.src"
                      :src="doorAsset(element.asset_key)?.src"
                      alt="Door"
                      class="pointer-events-none absolute"
                      :style="{ left: `${element.x_location}px`, top: `${element.y_location}px`, width: `${element.width ?? doorAsset(element.asset_key)?.w ?? 64}px`, height: `${element.height ?? doorAsset(element.asset_key)?.h ?? 64}px`, transform: `rotate(${element.rotation}deg)`, transformOrigin: 'center', zIndex: element.z_index }"
                    >
                    <div
                      v-else-if="element.category === 'chair'"
                      class="absolute rounded-lg"
                      :class="[
                        seatIsOccupied(element)
                          ? 'cursor-not-allowed bg-[#D9D9D9]'
                          : 'cursor-pointer bg-[#A47564] hover:ring-2 hover:ring-[#A96746]',
                        selectedChair?.uuid === element.uuid ? 'ring-2 ring-[#A96746] ring-offset-1' : '',
                      ]"
                      :style="{ left: `${element.x_location}px`, top: `${element.y_location}px`, width: `${element.width ?? 32}px`, height: `${element.height ?? 32}px`, transform: `rotate(${element.rotation}deg)`, transformOrigin: 'center', zIndex: element.z_index }"
                      :title="seatIsOccupied(element) ? 'Seat is reserved' : 'Select seat'"
                      @click.stop="selectChair(element)"
                    />
                    <div
                      v-else
                      class="pointer-events-none absolute"
                      :style="{ left: `${element.x_location}px`, top: `${element.y_location}px`, width: `${element.width ?? 100}px`, height: `${element.height ?? 10}px`, transform: `rotate(${element.rotation}deg)`, transformOrigin: 'center', zIndex: element.z_index }"
                    >
                      <div
                        v-if="element.category === 'counter'"
                        class="flex size-full items-center justify-center overflow-hidden whitespace-nowrap rounded-[16px] bg-[#3D2B24] px-3 font-display text-[16px] font-semibold text-[#EDD8CC]"
                      >
                        {{ element.label ?? 'Counter' }}
                      </div>
                      <!-- Walls run half a thickness past each end, so joined walls fill the corner (as in the editor) -->
                      <div
                        v-else
                        class="absolute inset-y-0 bg-[#D9D9D9]"
                        :style="{ left: `${-(element.height ?? 10) / 2}px`, right: `${-(element.height ?? 10) / 2}px` }"
                      />
                    </div>
                  </template>
                  <button
                    v-for="table in planTables"
                    :key="table.uuid"
                    type="button"
                    class="table-hit absolute rounded-lg focus-visible:outline-none"
                    :class="[
                      takenTables.has(table.uuid) ? 'cursor-help' : 'cursor-pointer hover:scale-105',
                      inspectedTable?.uuid === table.uuid ? 'is-inspected' : '',
                    ]"
                    :style="{ left: `${table.x_location}px`, top: `${table.y_location}px`, width: `${tableSize(table).w}px`, height: `${tableSize(table).h}px`, transform: `rotate(${table.rotation}deg)`, zIndex: 50 }"
                    :aria-label="takenTables.has(table.uuid)
                      ? `${table.table_name}, reserved on this date`
                      : `${table.table_name}, ${table.capacity} seats, available`"
                    :aria-pressed="selectedTable?.uuid === table.uuid"
                    @click="selectTable(table)"
                  >
                    <FloorPlanTable
                      :asset-key="table.asset_key ?? 'table_sqr_4'"
                      :label="tableLabel(table)"
                      :status="tableVisualStatus(table)"
                      :selected="selectedTable?.uuid === table.uuid"
                      class="size-full"
                    />
                  </button>
                </div>
              </div>
              <p v-if="windowIsPast" class="pb-3 text-center text-xs text-[#76605A]">This time has passed. Pick a later slot to book.</p>
            </div>
          </section>

          <!-- Day agenda -->
          <section class="rounded-2xl border border-[#E8D7C7] bg-[#FFFDF9] p-4 md:p-5" aria-label="Bookings for the day">
            <div class="flex items-baseline justify-between gap-3">
              <h2 class="font-display text-lg font-semibold text-[#3B2A24]">Bookings this day</h2>
              <span class="text-xs tabular-nums text-[#76605A]">{{ agenda.length }} active</span>
            </div>
            <p v-if="!agenda.length && !dayLoading" class="mt-3 text-sm text-[#76605A]">{{ dayIsClosed ? `No bookings. The cafe is closed on ${selectedDateLabel}.` : `No bookings yet for ${selectedDateLabel}. Every table is open.` }}</p>
            <ol v-else class="mt-3 divide-y divide-[#F0E3D6]">
              <li v-for="entry in agenda" :key="entry.item.uuid">
                <button
                  type="button"
                  class="grid w-full grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors hover:bg-[#F8EFE7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/30"
                  :class="agendaInSelectedSlot(entry) ? 'bg-[#F8EFE7]' : ''"
                  :title="`Show the floor at ${formatClock(entry.start)}`"
                  @click="jumpTo(entry)"
                >
                  <span class="tabular-nums text-[#3B2A24]">
                    {{ formatClock(entry.start) }}
                    <span class="block text-[11px] text-[#76605A]">arrival</span>
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate font-medium text-[#3B2A24]">{{ entry.item.customer_name }}</span>
                    <span class="block truncate text-xs text-[#76605A]">Table {{ tableNumber(entry.item) }} · {{ entry.item.party_size }} guest{{ entry.item.party_size === 1 ? '' : 's' }}</span>
                  </span>
                  <span class="rounded-full px-2 py-0.5 text-[11px] capitalize" :class="entry.item.status === 'seated' ? 'bg-[#E3EEE5] text-[#2F6B45]' : 'bg-[#F2E0D2] text-[#7D5A50]'">
                    {{ entry.item.status }}
                  </span>
                </button>
              </li>
            </ol>
          </section>
        </div>

        <!-- Booking panel -->
        <aside class="self-start rounded-2xl border border-[#E8D7C7] bg-white p-5 xl:sticky xl:top-6">
          <h2 class="font-display text-lg font-semibold text-[#3B2A24]">New booking</h2>
          <dl class="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#E8D7C7] bg-[#E8D7C7] text-sm">
            <div class="bg-[#FFFDF9] px-3 py-2">
              <dt class="text-[11px] text-[#76605A]">Date</dt>
              <dd class="font-medium text-[#3B2A24]">{{ new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(windowStart) }}</dd>
            </div>
            <div class="bg-[#FFFDF9] px-3 py-2">
              <dt class="text-[11px] text-[#76605A]">Arrival</dt>
              <dd class="font-medium tabular-nums text-[#3B2A24]">{{ selectedSlotValid ? formatClock(windowStart) : 'Pick a time' }}</dd>
            </div>
          </dl>

          <div v-if="inspectedTable" class="mt-4 rounded-xl border border-[#BDBDBD] bg-[#F4F4F4] p-3 text-sm text-[#3B2A24]">
            <div class="flex items-center justify-between gap-2">
              <p class="font-medium">{{ inspectedTable.table_name }} is {{ inspectedHolds.length ? 'reserved for the day' : 'unavailable' }}</p>
              <button type="button" class="text-xs text-[#5B463C] underline underline-offset-2" @click="inspectedTable = null">Dismiss</button>
            </div>
            <ul v-if="inspectedHolds.length" class="mt-2 space-y-1.5">
              <li v-for="entry in inspectedHolds" :key="entry.item.uuid" class="text-xs text-[#5B463C]">
                <span class="tabular-nums">Arrives {{ formatClock(entry.start) }}</span>
                · {{ entry.item.customer_name }} · {{ entry.item.party_size }} guest{{ entry.item.party_size === 1 ? '' : 's' }}
              </li>
            </ul>
            <p v-else class="mt-1 text-xs text-[#5B463C]">{{ inspectedReason }}</p>
            <p class="mt-2 text-xs text-[#76605A]">Choose a white table, or try another date.</p>
          </div>

          <div v-else-if="selectedTable" class="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#7D5A50] px-3 py-3 text-[#FFF0D1]">
            <div>
              <p class="text-sm font-medium">{{ selectedTable.table_name }}</p>
              <p class="text-xs text-[#F2E0D2]">{{ selectedChair ? '1 seat at the communal table' : `Seats up to ${selectedTable.capacity}` }}</p>
            </div>
            <button type="button" class="rounded-md border border-[#FFF0D1]/40 px-2.5 py-1 text-xs transition-colors hover:bg-[#FFF0D1]/10" @click="clearSelection">Change</button>
          </div>
          <p v-else class="mt-4 rounded-xl border border-dashed border-[#DCC8B8] px-3 py-3 text-sm text-[#76605A]">
            Tap a white table on the floor plan to book it.
          </p>

          <form class="mt-4 space-y-3" @submit.prevent="confirmReservation">
            <label class="block text-xs text-[#5B463C]">Guest name
              <input v-model="reservation.customerName" type="text" autocomplete="off" placeholder="Who is the booking for?" class="field">
            </label>
            <div class="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
              <label class="block text-xs text-[#5B463C]">Phone number
                <input v-model="reservation.customerPhone" type="tel" inputmode="numeric" maxlength="11" pattern="[0-9]{11}" placeholder="09XXXXXXXXX" class="field tabular-nums">
              </label>
              <label class="block text-xs text-[#5B463C]">Guests
                <input
                  v-model.number="reservation.partySize"
                  type="number"
                  min="1"
                  :max="selectedChair ? 1 : (selectedTable ? selectedTable.capacity : 50)"
                  :readonly="!!selectedChair"
                  class="field tabular-nums read-only:bg-[#F8EFE7]"
                >
              </label>
            </div>
            <p v-if="reservation.customerPhone && phoneDigits.length !== 11" class="text-xs text-[#76605A]">Phone numbers have 11 digits.</p>
            <label class="block text-xs text-[#5B463C]">Notes
              <textarea v-model="reservation.notes" rows="2" placeholder="Allergies, occasion, high chair…" class="field resize-none" />
            </label>
            <p v-if="reservationError" class="text-xs text-[#A4472E]" role="alert">{{ reservationError }}</p>
            <p v-if="reservationNotice" class="text-xs text-[#2F6B45]" role="status">{{ reservationNotice }}</p>
            <button
              type="submit"
              :disabled="!canConfirm"
              class="w-full rounded-lg bg-[#3B2A24] px-4 py-3 text-sm font-medium text-[#FFF0D1] transition-colors hover:bg-[#2C1F1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {{ submitting ? 'Booking…' : selectedTable ? `Book ${selectedTable.table_name} at ${formatClock(windowStart)}` : 'Book table' }}
            </button>
          </form>
        </aside>
      </div>

      <div v-if="showWaitlist" class="fixed inset-0 z-50 flex items-center justify-center bg-[#3B2A24]/40 p-4" @click.self="showWaitlist = false">
        <section class="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[#DCC8B8] bg-white p-5 shadow-2xl">
          <div class="flex items-center justify-between gap-3 border-b border-[#E8D7C7] pb-4">
            <div>
              <h2 class="text-lg text-[#3B2A24]">Waitlist</h2>
              <p class="mt-1 text-xs text-[#8B756A]">{{ reservations.length }} saved reservation{{ reservations.length === 1 ? '' : 's' }}</p>
            </div>
            <button type="button" aria-label="Close waitlist" class="rounded-lg border border-[#DCC8B8] px-3 py-1 text-sm text-[#5B463C] hover:bg-[#F8EFE7]" @click="showWaitlist = false">×</button>
          </div>
          <div v-if="!selectedWaitlistReservation" class="max-h-[55vh] overflow-y-auto pt-4">
            <div v-if="waitlistLoading" class="text-sm text-[#9D877B]">Loading saved reservations…</div>
            <div v-else-if="reservationError" class="text-sm text-[#A96746]">{{ reservationError }}</div>
            <div v-else-if="!reservations.length" class="text-sm text-[#9D877B]">No reservations saved yet.</div>
            <template v-else>
              <p v-if="waitlistActionError" role="alert" class="mb-3 rounded-lg bg-[#F8E5DC] px-3 py-2 text-xs text-[#8B4F42]">{{ waitlistActionError }}</p>
              <div class="mb-3 flex flex-col gap-2 sm:flex-row">
                <label class="relative flex-1">
                  <span class="sr-only">Search reservations</span>
                  <input
                    v-model="waitlistSearch"
                    type="search"
                    placeholder="Search name, table, or phone"
                    class="w-full rounded-lg border border-[#DCC8B8] bg-white px-3 py-2 text-xs text-[#5B463C] outline-none focus:border-[#A96746]"
                  >
                </label>
                <label>
                  <span class="sr-only">Filter reservations by status</span>
                  <select v-model="waitlistStatusFilter" class="w-full rounded-lg border border-[#DCC8B8] bg-white px-3 py-2 text-xs capitalize text-[#5B463C] outline-none focus:border-[#A96746] sm:w-36">
                    <option value="all">All statuses</option>
                    <option value="seated">Seated</option>
                    <option value="no_show">No-show</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>
              <div v-if="!filteredReservations.length" class="py-4 text-sm text-[#9D877B]">No reservations match your search or filter.</div>
              <div v-else class="grid gap-2">
                <div v-for="item in filteredReservations" :key="item.uuid" class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#F8EFE7] px-4 py-3 text-xs text-[#5B463C]">
                  <button type="button" class="min-w-0 flex-1 cursor-pointer text-left hover:text-[#A96746]" :aria-label="`View reservation for ${item.customer_name}`" @click="selectedWaitlistReservation = item">
                    <strong>{{ item.customer_name }}</strong>
                    <span> · Table {{ tableNumber(item) }} · {{ formatReservationDate(item.reservation_date) }} · {{ formatReservationTime(item.reservation_date) }}</span>
                  </button>
                  <div class="flex flex-wrap items-center gap-2 text-[#8B756A]">
                    <span class="capitalize">{{ item.status.replace('_', ' ') }}</span>
                    <!-- Bookings are saved confirmed, so the waitlist only seats, marks no-show, or cancels. -->
                    <template v-if="item.status === 'confirmed'">
                      <button
                        type="button"
                        class="relative z-10 cursor-pointer rounded-md bg-[#3B2A24] px-3 py-1.5 text-[10px] text-white disabled:cursor-wait disabled:opacity-50"
                        :disabled="updatingReservation === item.uuid"
                        @pointerdown.stop
                        @click.prevent.stop="updateReservationStatus(item, 'seated')"
                      >
                        Arrived
                      </button>
                      <button
                        v-if="reservationStarted(item)"
                        type="button"
                        class="relative z-10 cursor-pointer rounded-md border border-[#C79679] px-3 py-1.5 text-[10px] text-[#8B4F42] disabled:cursor-wait disabled:opacity-50"
                        :disabled="updatingReservation === item.uuid"
                        @pointerdown.stop
                        @click.prevent.stop="updateReservationStatus(item, 'no_show')"
                      >
                        No-show
                      </button>
                    </template>
                    <template v-if="(item.status === 'pending' || item.status === 'confirmed') && !reservationStarted(item)">
                      <button
                        type="button"
                        class="relative z-10 cursor-pointer rounded-md border border-[#C79679] px-3 py-1.5 text-[10px] text-[#8B4F42] disabled:cursor-wait disabled:opacity-50"
                        :disabled="updatingReservation === item.uuid"
                        @pointerdown.stop
                        @click.prevent.stop="updateReservationStatus(item, 'cancelled')"
                      >
                        Cancel
                      </button>
                    </template>
                  </div>
                </div>
              </div>
            </template>
          </div>
          <div v-else class="pt-4">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-base font-semibold text-[#3B2A24]">{{ selectedWaitlistReservation.customer_name }}</h3>
              <button type="button" class="text-xs text-[#A96746] underline" @click="selectedWaitlistReservation = null">Back to waitlist</button>
            </div>
            <dl class="mt-4 grid gap-3 text-xs text-[#5B463C] sm:grid-cols-2">
              <div>
                <dt class="text-[10px] uppercase text-[#8B756A]">Reservation date</dt>
                <dd class="mt-1">{{ formatReservationDate(selectedWaitlistReservation.reservation_date) }}</dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase text-[#8B756A]">Arrival time</dt>
                <dd class="mt-1">{{ formatReservationTime(selectedWaitlistReservation.reservation_date) }}</dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase text-[#8B756A]">Table number</dt>
                <dd class="mt-1">Table {{ tableNumber(selectedWaitlistReservation) }}</dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase text-[#8B756A]">Phone number</dt>
                <dd class="mt-1">{{ selectedWaitlistReservation.customer_phone }}</dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase text-[#8B756A]">Party size</dt>
                <dd class="mt-1">{{ selectedWaitlistReservation.party_size }} guest{{ selectedWaitlistReservation.party_size === 1 ? '' : 's' }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-[10px] uppercase text-[#8B756A]">Note</dt>
                <dd class="mt-1 whitespace-pre-wrap">{{ selectedWaitlistReservation.notes?.trim() || 'No note added.' }}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.reservations ::selection {
  background: #f2e0d2;
  color: #3b2a24;
}

.field {
  margin-top: 0.25rem;
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid #dcc8b8;
  background: #fff;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: #3b2a24;
  caret-color: #7d5a50;
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;
}

.field::placeholder {
  color: #9a857a;
}

.field:focus-visible {
  border-color: #7d5a50;
  box-shadow: 0 0 0 3px rgb(125 90 80 / 0.18);
}

.scroll-strip {
  scrollbar-width: thin;
  scrollbar-color: #dcc8b8 transparent;
  scroll-snap-type: x proximity;
}

.scroll-strip > * {
  scroll-snap-align: start;
}

/* The room pans freely on small screens; snapping would fight the drag. */
.plan.scroll-strip {
  scroll-snap-type: none;
}

/* Tables recolor as the time window moves, so the change reads as the floor updating. */
.plan :deep(svg path),
.plan :deep(svg rect),
.plan :deep(svg circle) {
  transition: fill 280ms cubic-bezier(0.16, 1, 0.3, 1), stroke 280ms cubic-bezier(0.16, 1, 0.3, 1);
}

.table-hit {
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.table-hit:focus-visible,
.table-hit.is-inspected {
  outline: 2px dashed #8a8a8a;
  outline-offset: 4px;
}

.table-hit:focus-visible:not(.is-inspected) {
  outline: 2px solid #7d5a50;
}

@media (prefers-reduced-motion: reduce) {
  .plan :deep(svg path),
  .plan :deep(svg rect),
  .plan :deep(svg circle),
  .table-hit {
    transition: none;
  }
}
</style>
