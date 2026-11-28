<!-- app/components/pos/FloorPlanModal.vue -->
<!-- Host stand for the register: today's arrivals queue on the left, the live floor on the right.
     The queue leads because seating guests is the job during service; the floor answers "where". -->
<script setup lang="ts">
import type { PlanLock } from '~/utils/planLock'
import { tableAsset, doorAsset } from '~/utils/floorPlanCatalog'
import FloorPlanTable from '~/components/floor-plan/Table.vue'
import ReservationActions from '~/components/pos/ReservationActions.vue'

interface TableData {
  uuid: string
  table_name: string
  capacity: number
  asset_key: string
  x_location: number
  y_location: number
  rotation: number
  status: string
  shared?: boolean
  seats_taken?: number
  range_label?: string | null
  upcoming_reservation?: Booking | null
}

interface Booking {
  uuid: string
  customer_name: string
  customer_phone?: string
  party_size: number
  reservation_date: string
  reservation_end: string
  status: string
  notes?: string | null
  range_label?: string | null
  table?: { uuid: string; table_name: string; capacity: number } | null
}

interface ElementData {
  uuid: string
  category: 'door' | 'counter' | 'wall'
  asset_key?: string
  label?: string
  x_location: number
  y_location: number
  width?: number
  height?: number
  rotation: number
  z_index: number
}

interface FloorPlanData {
  uuid: string
  floorplan_name: string
  canvas_width: number
  canvas_height: number
  is_active: boolean
  tables: TableData[]
  elements: ElementData[]
}

defineProps<{
  show: boolean
  branchName?: string
}>()

const emit = defineEmits<{
  close: []
  selectTable: [table: TableData & { guest_name?: string | null }]
}>()

const devicePosService = useDevicePosService()

// ── Clock ───────────────────────────────────────────────────────────────────
const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval> | undefined
let pollTimer: ReturnType<typeof setInterval> | undefined

const clock = computed(() => splitTime(now.value))

function splitTime(date: Date) {
  const [time, meridiem] = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).split(' ')
  return { time, meridiem }
}

function minutesBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 60000)
}

function duration(minutes: number) {
  const m = Math.abs(minutes)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h} h ${rest} min` : `${h} h`
}

// ── Fullscreen ──────────────────────────────────────────────────────────────
const isFullscreen = ref(false)

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {})
  } else {
    document.exitFullscreen?.().catch(() => {})
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

// ── State ───────────────────────────────────────────────────────────────────
const loading = ref(true)
const syncing = ref(false)
const errorMessage = ref('')
// The cafe's plan lacks reservations, or its subscription has expired.
const planLock = ref<PlanLock | null>(null)
const busyBooking = ref<string | null>(null)
const updatingTable = ref(false)

const floorPlans = ref<FloorPlanData[]>([])
const selectedPlanUuid = ref('')
const currentPlan = computed(() =>
  floorPlans.value.find((p) => p.uuid === selectedPlanUuid.value) || floorPlans.value[0] || null)

const bookings = ref<Booking[]>([])
const bookingsLoaded = ref(false)

const selectedTableUuid = ref<string | null>(null)
const selectedBookingUuid = ref<string | null>(null)
const sheetOpen = ref(false)

// Phones show one pane at a time.
const mobilePane = ref<'queue' | 'floor'>('queue')

const toast = ref<{ text: string; tone: 'ok' | 'error' } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(text: string, tone: 'ok' | 'error' = 'ok') {
  toast.value = { text, tone }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3200)
}

// ── Data ────────────────────────────────────────────────────────────────────
async function loadFloorPlan(silent = false) {
  if (!silent) {
    loading.value = true
    errorMessage.value = ''
    planLock.value = null
  }
  try {
    const res = await devicePosService.getFloorPlan()
    if (res.success) {
      floorPlans.value = res.floor_plans || (res.floor_plan ? [res.floor_plan] : [])
      if (!floorPlans.value.some((p) => p.uuid === selectedPlanUuid.value)) {
        selectedPlanUuid.value = floorPlans.value[0]?.uuid ?? ''
      }
    }
  } catch (e: any) {
    planLock.value = planLockFromError(e)
    if (!planLock.value && !silent) errorMessage.value = e?.data?.message || 'The floor plan could not be loaded. Check the connection and try again.'
  } finally {
    if (!silent) loading.value = false
  }
}

async function loadBookings() {
  try {
    const res = await devicePosService.getReservations()
    if (res.success) bookings.value = res.reservations?.data || []
  } catch {
    // The queue keeps its last copy; the next poll tries again.
  } finally {
    bookingsLoaded.value = true
  }
}

async function refreshAll(announce = false) {
  syncing.value = true
  await Promise.all([loadFloorPlan(true), loadBookings()])
  syncing.value = false
  if (announce) showToast('Floor and bookings are up to date')
}

// ── Queue ───────────────────────────────────────────────────────────────────
const OPEN = ['pending', 'confirmed']
const CLOSED = ['completed', 'cancelled', 'no_show']

type Lane = 'late' | 'soon' | 'seated' | 'later' | 'closed'

function laneOf(b: Booking): Lane {
  if (CLOSED.includes(b.status)) return 'closed'
  if (b.status === 'seated') return 'seated'
  const until = minutesBetween(now.value, new Date(b.reservation_date))
  if (until <= 0) return 'late'
  return until <= 60 ? 'soon' : 'later'
}

const LANES: { id: Lane; title: string; empty?: string }[] = [
  { id: 'late', title: 'Late' },
  { id: 'soon', title: 'Arriving within the hour' },
  { id: 'seated', title: 'Seated' },
  { id: 'later', title: 'Later today' },
  { id: 'closed', title: 'Finished and closed' },
]

const queueView = ref<'service' | 'all'>('service')
const search = ref('')

const searched = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return bookings.value
  return bookings.value.filter((b) =>
    b.customer_name?.toLowerCase().includes(q)
    || b.table?.table_name?.toLowerCase().includes(q)
    || b.customer_phone?.includes(q))
})

const lanes = computed(() => {
  const groups = LANES
    .filter((lane) => queueView.value === 'all' || lane.id !== 'closed')
    .map((lane) => ({ ...lane, items: searched.value.filter((b) => laneOf(b) === lane.id) }))
  return groups.filter((g) => g.items.length)
})

const counts = computed(() => {
  const c = { late: 0, soon: 0, seated: 0, later: 0, closed: 0 }
  for (const b of bookings.value) c[laneOf(b)]++
  return c
})

function relativeLine(b: Booking) {
  const start = new Date(b.reservation_date)
  const end = new Date(b.reservation_end)
  const lane = laneOf(b)
  if (lane === 'late') {
    const late = minutesBetween(start, now.value)
    if (b.status === 'pending') return late < 1 ? 'Due now, still unconfirmed' : `${duration(late)} late, still unconfirmed`
    return late < 1 ? 'Due now' : `${duration(late)} late`
  }
  if (lane === 'soon' || lane === 'later') {
    const label = `In ${duration(minutesBetween(now.value, start))}`
    return b.status === 'pending' ? `${label}, unconfirmed` : label
  }
  if (lane === 'seated') {
    const left = minutesBetween(now.value, end)
    return left >= 0 ? `Table free in ${duration(left)}` : `${duration(left)} past booked time`
  }
  return { completed: 'Finished', cancelled: 'Cancelled', no_show: 'No-show' }[b.status] ?? b.status
}

function endTime(b: Booking) {
  return splitTime(new Date(b.reservation_end)).time + ' ' + splitTime(new Date(b.reservation_end)).meridiem
}

// ── Tables ──────────────────────────────────────────────────────────────────
function tableBookings(table: TableData) {
  return bookings.value
    .filter((b) => b.table?.uuid === table.uuid)
    .sort((a, b) => a.reservation_date.localeCompare(b.reservation_date))
}

// The booking that matters for a table right now: who is sitting there, otherwise who is due next.
function activeBooking(table: TableData): Booking | null {
  const list = tableBookings(table)
  return list.find((b) => b.status === 'seated')
    ?? list.find((b) => OPEN.includes(b.status) && new Date(b.reservation_end) > now.value)
    ?? (table.upcoming_reservation && !CLOSED.includes(table.upcoming_reservation.status) ? table.upcoming_reservation : null)
}

function tableState(table: TableData): string {
  const b = activeBooking(table)
  // If reservation is seated or table was explicitly marked occupied
  if (b?.status === 'seated' || table.status === 'occupied') return 'occupied'

  // If table is held by an active or upcoming reservation during service
  if (b && OPEN.includes(b.status)) {
    const start = new Date(b.reservation_date)
    const end = new Date(b.reservation_end)
    const isOngoing = now.value >= start && now.value <= end
    const isArrivingSoon = start > now.value && minutesBetween(now.value, start) <= 20
    const isLate = laneOf(b) === 'late'
    if (isOngoing || isArrivingSoon || isLate) {
      return 'reserved'
    }
  }

  if (table.status === 'reserved') return 'reserved'
  if (table.status === 'cleaning' || table.status === 'unavailable') return table.status
  return 'available'
}

function tableMark(table: TableData) {
  const b = activeBooking(table)
  if (!b) return null
  if (b.status === 'seated') return { kind: 'seated', text: `${b.party_size}` }
  const lane = laneOf(b)
  if (lane === 'late') return { kind: 'late', text: 'Late' }
  const start = splitTime(new Date(b.reservation_date))
  return { kind: lane === 'soon' ? 'soon' : 'later', text: start.time }
}

const tableCounts = computed(() => {
  const c = { free: 0, held: 0, seated: 0, cleaning: 0 }
  for (const t of currentPlan.value?.tables ?? []) {
    const s = displayState(t)
    if (s === 'occupied') c.seated++
    else if (s === 'reserved') c.held++
    else if (s === 'cleaning' || s === 'unavailable') c.cleaning++
    else c.free++
  }
  return c
})

const selectedTable = computed(() =>
  currentPlan.value?.tables.find((t) => t.uuid === selectedTableUuid.value) ?? null)

const selectedTableBookings = computed(() =>
  selectedTable.value ? tableBookings(selectedTable.value).filter((b) => !CLOSED.includes(b.status)) : [])

// ── Selection ───────────────────────────────────────────────────────────────
function selectBooking(b: Booking) {
  const same = selectedBookingUuid.value === b.uuid
  selectedBookingUuid.value = same ? null : b.uuid
  if (same || !b.table?.uuid) return

  // Show the booking's table, switching floors when it sits on another one.
  const plan = floorPlans.value.find((p) => p.tables.some((t) => t.uuid === b.table!.uuid))
  if (plan) selectedPlanUuid.value = plan.uuid
  selectedTableUuid.value = b.table.uuid
  sheetOpen.value = false
  nextTick(() => revealTable(b.table!.uuid))
}

function selectTable(table: TableData) {
  selectedTableUuid.value = table.uuid
  sheetOpen.value = true
  const b = activeBooking(table)
  selectedBookingUuid.value = b?.uuid ?? null
  if (b) nextTick(() => document.querySelector(`[data-booking="${b.uuid}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
}

function closeSheet() {
  sheetOpen.value = false
}

function revealTable(uuid: string) {
  const node = viewport.value?.querySelector<HTMLElement>(`[data-table="${uuid}"]`)
  node?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
}

// ── Actions ─────────────────────────────────────────────────────────────────
const STATUS_DONE: Record<string, string> = {
  confirmed: 'confirmed',
  seated: 'seated',
  completed: 'finished',
  cancelled: 'cancelled',
  no_show: 'marked no-show',
}

async function act(b: Booking, status: string) {
  if (busyBooking.value) return
  busyBooking.value = b.uuid
  try {
    const res = await devicePosService.updateReservationStatus(b.uuid, status)
    if (res.success) {
      const index = bookings.value.findIndex((x) => x.uuid === b.uuid)
      if (index !== -1 && res.reservation) bookings.value[index] = res.reservation
      // Finishing frees the table (the server sets it available). If another booking is still
      // coming on this table today, hold it for that booking instead.
      const table = status === 'completed' && b.table?.uuid
        ? (currentPlan.value?.tables || []).find((t) => t.uuid === b.table!.uuid)
        : undefined
      if (table && !table.shared && upcomingBooking(table, b.uuid)) {
        try {
          await devicePosService.updateTableStatus(table.uuid, 'reserved')
        } catch (err) {
          console.warn('Could not hold the table for the next booking:', err)
        }
      }
      showToast(`${b.customer_name} ${STATUS_DONE[status] ?? status}`)
      await refreshAll()
    }
  } catch (e: any) {
    showToast(e?.data?.message || 'That change did not go through. Try again.', 'error')
  } finally {
    busyBooking.value = null
  }
}

const OVERRIDES = [
  { status: 'available', label: 'Free' },
  { status: 'reserved', label: 'Held' },
  { status: 'occupied', label: 'Seated' },
]

// A booking still to come on this table today (not seated, not finished), skipping one booking if given.
function upcomingBooking(table: TableData, excludeUuid?: string): Booking | null {
  const isToday = (iso: string) => new Date(iso).toDateString() === now.value.toDateString()
  const later = tableBookings(table).find((b) =>
    b.uuid !== excludeUuid && OPEN.includes(b.status) && new Date(b.reservation_end) > now.value && isToday(b.reservation_date))
  if (later) return later
  const u = table.upcoming_reservation
  return u && u.uuid !== excludeUuid && OPEN.includes(u.status) && new Date(u.reservation_end) > now.value && isToday(u.reservation_date) ? u : null
}

// What the floor draws: a table with a booking still coming today keeps the Held colour all day,
// even while a walk-in sits there or after they leave. tableState() still drives the actions.
function displayState(table: TableData): string {
  return isBookedTable(table) ? 'reserved' : tableState(table)
}

// A table tied to a booking: held for it now, or given to a walk-in while a booking is still coming later.
// Its status is driven by the booking, so the status pill and manual picker are hidden.
function isBookedTable(table: TableData): boolean {
  if (tableState(table) === 'reserved') return true
  const seated = activeBooking(table)
  return !!upcomingBooking(table, seated?.status === 'seated' ? seated.uuid : undefined)
}

// Frees a table. If a booking is still coming later today, the table goes back to Held instead,
// unless releaseHold is set (the explicit "Mark available" on a reserved table).
async function markTableAvailable(table: TableData, opts: { releaseHold?: boolean } = {}) {
  if (updatingTable.value) return
  updatingTable.value = true
  try {
    // If there is an active seated reservation on this table, mark it as completed first
    const b = activeBooking(table)
    const finished = b && b.status === 'seated' ? b : null
    if (finished) {
      try {
        await devicePosService.updateReservationStatus(finished.uuid, 'completed')
      } catch (err) {
        console.warn('Could not complete reservation:', err)
      }
    }
    const next = opts.releaseHold ? null : upcomingBooking(table, finished?.uuid)
    const target = next ? 'reserved' : 'available'
    const res = await devicePosService.updateTableStatus(table.uuid, target)
    if (res.success) {
      table.status = res.table?.status ?? target
    }
    await refreshAll(false)
    showToast(next
      ? `${table.table_name} is back to Held for ${next.customer_name} at ${splitTime(new Date(next.reservation_date)).time} ${splitTime(new Date(next.reservation_date)).meridiem}`
      : `${table.table_name} is now Available (Free)`)
  } catch (e: any) {
    showToast(e?.data?.message || 'Could not update table status', 'error')
  } finally {
    updatingTable.value = false
  }
}

async function setTableStatus(table: TableData, status: string) {
  if (status === 'available') {
    return markTableAvailable(table)
  }
  // A reserved table's status is locked; it changes only through Seat or Mark Available.
  if (updatingTable.value || table.status === status || isBookedTable(table)) return
  updatingTable.value = true
  const previous = table.status
  table.status = status
  try {
    const res = await devicePosService.updateTableStatus(table.uuid, status)
    if (res.success && res.table) table.status = res.table.status
    await refreshAll(false)
    showToast(`${table.table_name} set to ${status}`)
  } catch (e: any) {
    table.status = previous
    showToast(e?.data?.message || 'The table status did not change. Try again.', 'error')
  } finally {
    updatingTable.value = false
  }
}

function tableStateLabel(table: TableData): string {
  const s = tableState(table)
  if (s === 'available') return 'Free'
  if (s === 'reserved') return 'Held for a booking'
  if (s === 'occupied') return 'Seated'
  if (s === 'cleaning') return 'Cleaning'
  return 'Unavailable'
}

// The actions offered for the selected table, each with a plain-language hint of what it does.
interface TableAction { key: string; label: string; hint: string; icon: string; primary: boolean; run: () => void }
const tableActions = computed<TableAction[]>(() => {
  const t = selectedTable.value
  if (!t) return []
  const state = tableState(t)
  if (state === 'available') {
    // Free now, but a booking is coming later today: the guest may arrive early.
    const booked = upcomingBooking(t)
    const walkIn = { key: 'walk-in', label: 'Assign to walk-in order', hint: 'Seat a guest without a booking and start their order.', icon: 'heroicons:user-plus', primary: !booked, run: () => assignToOrder(t, null) }
    if (!booked) return [walkIn]
    return [
      { key: 'seat', label: `Seat ${booked.customer_name} & assign to order`, hint: `${booked.customer_name}'s party (${splitTime(new Date(booked.reservation_date)).time} ${splitTime(new Date(booked.reservation_date)).meridiem}) has arrived. Seat them here and start their order.`, icon: 'heroicons:arrow-right-end-on-rectangle', primary: true, run: () => assignToOrder(t, booked) },
      walkIn,
    ]
  }
  if (state === 'reserved') {
    const held = activeBooking(t)
    return [
      { key: 'seat', label: held ? `Seat ${held.customer_name} & assign to order` : 'Seat & assign to order', hint: 'The booked guest has arrived. Seat them and start their order.', icon: 'heroicons:arrow-right-end-on-rectangle', primary: true, run: () => assignToOrder(t, held ?? undefined) },
      { key: 'walk-in', label: 'Assign to walk-in order', hint: held ? `Seat a guest without a booking. When they leave, the table goes back to held for ${held.customer_name}.` : 'Seat a guest without a booking and start their order.', icon: 'heroicons:user-plus', primary: false, run: () => assignToOrder(t, null) },
      { key: 'release', label: 'Mark available', hint: 'Release the hold so walk-ins can use this table.', icon: 'heroicons:lock-open', primary: false, run: () => markTableAvailable(t, { releaseHold: true }) },
    ]
  }
  if (state === 'occupied') {
    const active = activeBooking(t)
    const seated = active?.status === 'seated' ? active : null
    const next = upcomingBooking(t, seated?.uuid)
    // the booked guest who has arrived while the table still reads Occupied: seat them and start the order.
    const arriving = !seated && active && OPEN.includes(active.status) ? active : null
    const actions: TableAction[] = []
    if (arriving) {
      actions.push({ key: 'seat', label: `Seat ${arriving.customer_name} & assign to order`, hint: `${arriving.customer_name}'s party has arrived. Seat them here and start their order.`, icon: 'heroicons:arrow-right-end-on-rectangle', primary: true, run: () => assignToOrder(t, arriving) })
    }
    if (!seated) {
      // No seated booking: the people here are walk-ins.
      actions.push({ key: 'walk-in', label: 'Assign to walk-in order', hint: 'Walk-in guests are at this table. Start or continue their order.', icon: 'heroicons:user-plus', primary: !arriving, run: () => assignToOrder(t, null) })
    }
    actions.push(next
      ? { key: 'left', label: 'Customer left: back to held', hint: `Guests have gone. The table stays held for ${next.customer_name} at ${splitTime(new Date(next.reservation_date)).time} ${splitTime(new Date(next.reservation_date)).meridiem}.`, icon: 'heroicons:check-circle', primary: !actions.length, run: () => markTableAvailable(t) }
      : { key: 'left', label: 'Customer left: mark available', hint: 'Guests have paid and gone. Free the table for the next party.', icon: 'heroicons:check-circle', primary: !actions.length, run: () => markTableAvailable(t) })
    return actions
  }
  return []
})

// Seats the table and hands it to the register's current order. With a booking, that booking is
// the one seated; null is a walk-in (no booking touched); left out, the table's active booking is.
async function assignToOrder(table: TableData, booking?: Booking | null) {
  if (updatingTable.value) return
  updatingTable.value = true
  try {
    // Seat the booked guest first: the server refuses to seat a reservation on a table that is
    // already occupied, and it marks the table occupied itself once the reservation is seated.
    // A pending booking has to be confirmed before it can be seated.
    const b = activeBooking(table)
    const booked = b && OPEN.includes(b.status) ? b : null
    if (booked) {
      if (booked.status === 'pending') {
        await devicePosService.updateReservationStatus(booked.uuid, 'confirmed')
      }
      await devicePosService.updateReservationStatus(booked.uuid, 'seated')
    }

    // Walk-ins (and shared tables, which the server never marks as a whole) set the table directly.
    if (!booked || table.shared) {
      const res = await devicePosService.updateTableStatus(table.uuid, 'occupied')
      table.status = res.success && res.table ? res.table.status : 'occupied'
    } else {
      table.status = 'occupied'
    }

    await refreshAll(false)
    showToast(booked
      ? `${booked.customer_name} seated at ${table.table_name}`
      : `Assigned ${table.table_name} to order (Occupied)`)
    emit('selectTable', { ...table, status: 'occupied' })
    emit('close')
  } catch (e: any) {
    showToast(e?.data?.message || 'Could not update table to occupied', 'error')
  } finally {
    updatingTable.value = false
  }
}

// ── Canvas: fit the floor to its pane, then let staff zoom from there ──────
const viewport = ref<HTMLElement | null>(null)
const fitScale = ref(1)
const zoom = ref(1)
const scale = computed(() => fitScale.value * zoom.value)
let resizeObserver: ResizeObserver | undefined

function fit() {
  const el = viewport.value
  const plan = currentPlan.value
  if (!el || !plan) return
  const pad = 48
  const w = plan.canvas_width || 760
  const h = plan.canvas_height || 640
  // Low floor of 0.45 so the plan still fits beside the docked table panel without sideways scrolling
  fitScale.value = Math.max(0.45, Math.min((el.clientWidth - pad) / w, (el.clientHeight - pad) / h, 1.6))
}

function zoomBy(step: number) {
  zoom.value = Math.min(2.5, Math.max(0.6, Math.round((zoom.value + step) * 100) / 100))
}

watch([currentPlan, viewport], () => nextTick(fit))
watch(() => currentPlan.value?.uuid, () => { zoom.value = 1 })

function itemSize(kind: 'table' | 'element', item: any) {
  if (kind === 'table') {
    const a = tableAsset(item.asset_key)
    return { w: a?.w ?? 112, h: a?.h ?? 90 }
  }
  if (item.category === 'door') {
    const d = doorAsset(item.asset_key)
    return { w: d?.w ?? 64, h: d?.h ?? 64 }
  }
  return { w: item.width ?? 100, h: item.height ?? 10 }
}

function itemStyle(kind: 'table' | 'element', item: any, z: number) {
  const { w, h } = itemSize(kind, item)
  return {
    left: `${item.x_location ?? 0}px`,
    top: `${item.y_location ?? 0}px`,
    width: `${w}px`,
    height: `${h}px`,
    transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
    zIndex: z,
  }
}

function tableLabel(name: string) {
  const m = name.match(/(\d+)\s*$/)
  return m ? m[1] : name.slice(0, 3)
}

const doorSrc = (key?: string | null) => doorAsset(key)?.src

// ── Keyboard & lifecycle ────────────────────────────────────────────────────
function handleKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (sheetOpen.value) closeSheet()
  else emit('close')
}

onMounted(() => {
  loadFloorPlan()
  loadBookings()
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  clockTimer = setInterval(() => { now.value = new Date() }, 15000)
  // Bookings made at the manager desk show up here without a manual refresh.
  pollTimer = setInterval(() => { loadFloorPlan(true); loadBookings() }, 20000)
  resizeObserver = new ResizeObserver(fit)
  watch(viewport, (el, old) => {
    if (old) resizeObserver?.unobserve(old)
    if (el) resizeObserver?.observe(el)
  }, { immediate: true })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  clearInterval(clockTimer)
  clearInterval(pollTimer)
  clearTimeout(toastTimer)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    v-if="show"
    class="rsv fixed inset-0 z-50 flex items-stretch justify-center bg-[#1A120E]/60 p-0 md:p-4 print:hidden"
    role="dialog"
    aria-modal="true"
    aria-labelledby="rsv-title"
  >
    <div
      class="rsv-shell relative flex w-full flex-col overflow-hidden bg-[#FFFDF9] md:rounded-[20px]"
      :class="isFullscreen ? 'md:!rounded-none' : 'max-w-[1440px]'"
    >
      <!-- ── Header ──────────────────────────────────────────────────────── -->
      <header class="flex shrink-0 items-center gap-4 border-b border-[#E8DEC8] px-4 py-3 md:px-6">
        <div class="min-w-0 flex-1">
          <h2 id="rsv-title" class="font-display text-[22px] font-bold leading-tight text-[#2D1E17]">Tables</h2>
          <p class="truncate text-[13px] text-[#7D5A50]">
            {{ branchName || 'Today' }}<template v-if="bookingsLoaded">
              · {{ counts.late + counts.soon + counts.later }} still to come · {{ counts.seated }} seated</template>
          </p>
        </div>

        <div class="hidden items-baseline gap-1 sm:flex" aria-label="Current time">
          <span class="font-display text-[28px] font-semibold leading-none tabular-nums text-[#2D1E17]">{{ clock.time }}</span>
          <span class="text-[13px] font-semibold text-[#7D5A50]">{{ clock.meridiem }}</span>
        </div>

        <div class="flex items-center gap-1">
          <button type="button" class="rsv-icon grid place-items-center" :aria-label="syncing ? 'Refreshing' : 'Refresh floor and bookings'" :disabled="syncing" @click="refreshAll(true)">
            <Icon name="heroicons:arrow-path" class="size-5" :class="{ 'animate-spin': syncing }" />
          </button>
          <button type="button" class="rsv-icon hidden place-items-center md:grid" :aria-label="isFullscreen ? 'Exit full screen' : 'Full screen'" @click="toggleFullscreen">
            <Icon :name="isFullscreen ? 'heroicons:arrows-pointing-in' : 'heroicons:arrows-pointing-out'" class="size-5" />
          </button>
          <button type="button" class="rsv-icon grid place-items-center" aria-label="Close tables" @click="emit('close')">
            <Icon name="heroicons:x-mark" class="size-6" />
          </button>
        </div>
      </header>

      <!-- Phone pane switch -->
      <div class="grid shrink-0 grid-cols-2 gap-1 border-b border-[#E8DEC8] bg-[#F6ECE0] p-1 md:hidden" role="tablist">
        <button
          v-for="pane in [{ id: 'queue', label: 'Arrivals' }, { id: 'floor', label: 'Floor' }] as const"
          :key="pane.id"
          type="button"
          role="tab"
          :aria-selected="mobilePane === pane.id"
          class="h-11 rounded-lg text-[14px] font-semibold transition-colors"
          :class="mobilePane === pane.id ? 'bg-white text-[#2D1E17] shadow-[0_1px_2px_rgba(45,30,23,0.12)]' : 'text-[#7D5A50]'"
          @click="mobilePane = pane.id"
        >
          {{ pane.label }}
        </button>
      </div>

      <div class="flex min-h-0 flex-1">
        <!-- ── Arrivals queue ──────────────────────────────────────────── -->
        <section
          class="min-h-0 w-full flex-col border-[#E8DEC8] md:flex md:w-[320px] md:shrink-0 md:border-r lg:w-[344px]"
          :class="mobilePane === 'queue' ? 'flex' : 'hidden'"
          aria-label="Today's arrivals"
        >
          <div class="flex shrink-0 flex-col gap-2 px-4 pb-3 pt-4">
            <div class="grid grid-cols-2 gap-1 rounded-xl bg-[#F6ECE0] p-1" role="tablist" aria-label="Which bookings to show">
              <button
                v-for="view in [{ id: 'service', label: 'In service' }, { id: 'all', label: 'All today' }] as const"
                :key="view.id"
                type="button"
                role="tab"
                :aria-selected="queueView === view.id"
                class="h-9 rounded-lg px-3 text-[13px] font-semibold transition-colors"
                :class="queueView === view.id ? 'bg-white text-[#2D1E17] shadow-[0_1px_2px_rgba(45,30,23,0.12)]' : 'text-[#7D5A50] hover:text-[#2D1E17]'"
                @click="queueView = view.id"
              >
                {{ view.label }}
              </button>
            </div>
            <label class="relative block">
              <span class="sr-only">Search bookings</span>
              <Icon name="heroicons:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A98B7C]" />
              <input
                v-model="search"
                type="search"
                placeholder="Search name, table or phone"
                class="rsv-input h-11 w-full rounded-xl border border-[#E8DEC8] bg-white pl-9 pr-3 text-[14px] text-[#2D1E17] placeholder:text-[#9C8173]"
              >
            </label>
          </div>

          <div class="rsv-scroll min-h-0 flex-1 overflow-y-auto pb-6">
            <p v-if="!bookingsLoaded" class="px-4 py-10 text-[14px] text-[#7D5A50]">Loading today's bookings…</p>

            <div v-else-if="!lanes.length" class="px-4 py-14">
              <p class="font-display text-[18px] font-semibold text-[#2D1E17]">
                {{ search ? 'No booking matches that search' : queueView === 'service' ? 'Nobody else is booked today' : 'No bookings today' }}
              </p>
              <p class="mt-1 max-w-[32ch] text-[14px] leading-relaxed text-[#7D5A50]">
                {{ search ? 'Try a first name, a table number, or the last digits of a phone number.' : 'Walk-ins can still be seated from the floor: tap a table and choose Assign to order.' }}
              </p>
            </div>

            <template v-else>
              <section v-for="lane in lanes" :key="lane.id" :aria-labelledby="`lane-${lane.id}`">
                <!-- The now line sits between what has started and what is still coming. -->
                <div v-if="lane.id === 'soon' || (lane.id === 'later' && !counts.soon)" class="rsv-now mx-4 mt-5 flex items-center gap-2" aria-hidden="true">
                  <span class="text-[12px] font-semibold tabular-nums text-[#7D5A50]">Now {{ clock.time }}</span>
                  <span class="h-px flex-1 bg-[#7D5A50]" />
                </div>

                <h3 :id="`lane-${lane.id}`" class="flex items-baseline gap-2 px-4 pb-1 pt-5 text-[14px] font-semibold text-[#2D1E17]">
                  {{ lane.title }}
                  <span class="text-[13px] font-medium tabular-nums text-[#9C8173]">{{ lane.items.length }}</span>
                </h3>

                <ul>
                  <li v-for="b in lane.items" :key="b.uuid">
                    <div
                      class="rsv-row mx-2 flex cursor-pointer gap-3 rounded-2xl px-3 py-3"
                      :class="[
                        selectedBookingUuid === b.uuid ? 'bg-[#F6ECE0]' : 'hover:bg-[#FBF5EE]',
                        lane.id === 'closed' ? 'opacity-60' : '',
                      ]"
                      role="button"
                      tabindex="0"
                      :aria-pressed="selectedBookingUuid === b.uuid"
                      :data-booking="b.uuid"
                      @click="selectBooking(b)"
                      @keydown.enter.self="selectBooking(b)"
                      @keydown.space.self.prevent="selectBooking(b)"
                    >
                      <div class="w-[64px] shrink-0 pt-0.5">
                        <div class="font-display text-[22px] font-semibold leading-none tabular-nums" :class="lane.id === 'late' ? 'text-[#2D1E17]' : 'text-[#3D2B24]'">
                          {{ splitTime(new Date(b.reservation_date)).time }}
                        </div>
                        <div class="mt-1 text-[12px] font-semibold text-[#9C8173]">{{ splitTime(new Date(b.reservation_date)).meridiem }}</div>
                      </div>

                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <span class="truncate text-[16px] font-semibold text-[#2D1E17]">{{ b.customer_name }}</span>
                        </div>
                        <p class="mt-0.5 text-[13px] text-[#7D5A50]">
                          <span class="tabular-nums">{{ b.party_size }} {{ b.party_size === 1 ? 'guest' : 'guests' }}</span>
                          · {{ b.table?.table_name || 'No table' }}
                          <template v-if="b.status === 'pending'"> · Unconfirmed</template>
                        </p>
                        <p class="mt-0.5 text-[13px] font-medium" :class="lane.id === 'late' ? 'text-[#2D1E17]' : 'text-[#9C8173]'">
                          {{ relativeLine(b) }}
                        </p>

                        <div v-if="selectedBookingUuid === b.uuid" class="mt-2 space-y-1 text-[13px] text-[#5B463C]">
                          <p class="tabular-nums">Until {{ endTime(b) }}<template v-if="b.customer_phone"> · {{ b.customer_phone }}</template></p>
                          <p v-if="b.notes" class="leading-relaxed text-[#7D5A50]">“{{ b.notes }}”</p>
                        </div>

                        <ReservationActions
                          class="mt-2.5 justify-end"
                          :status="b.status"
                          :start="b.reservation_date"
                          :now="now"
                          :busy="busyBooking === b.uuid || updatingTable"
                          :show-hint="selectedBookingUuid === b.uuid"
                          @act="(status) => act(b, status)"
                        />
                      </div>
                    </div>
                  </li>
                </ul>
              </section>
            </template>
          </div>
        </section>

        <!-- ── Floor ───────────────────────────────────────────────────── -->
        <section
          class="relative min-h-0 min-w-0 flex-1 bg-[#F7F1EA] md:flex"
          :class="mobilePane === 'floor' ? 'flex' : 'hidden'"
          aria-label="Floor plan"
        >
          <div class="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div class="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-4 md:px-6">
            <div v-if="floorPlans.length > 1" class="flex gap-1 rounded-xl bg-[#ECDFD1] p-1" role="tablist" aria-label="Floors">
              <button
                v-for="p in floorPlans"
                :key="p.uuid"
                type="button"
                role="tab"
                :aria-selected="p.uuid === currentPlan?.uuid"
                class="h-9 rounded-lg px-3 text-[13px] font-semibold transition-colors"
                :class="p.uuid === currentPlan?.uuid ? 'bg-white text-[#2D1E17] shadow-[0_1px_2px_rgba(45,30,23,0.12)]' : 'text-[#7D5A50] hover:text-[#2D1E17]'"
                @click="selectedPlanUuid = p.uuid; selectedTableUuid = null; sheetOpen = false"
              >
                {{ p.floorplan_name }}
              </button>
            </div>
            <p v-else-if="currentPlan" class="text-[14px] font-semibold text-[#2D1E17]">{{ currentPlan.floorplan_name }}</p>

            <ul v-if="currentPlan" class="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#5B463C]" aria-label="Table states">
              <li class="flex items-center gap-1.5"><span class="size-3.5 rounded border-[1.5px] border-[#7D5A50] bg-white" />Free <b class="tabular-nums font-semibold">{{ tableCounts.free }}</b></li>
              <li class="flex items-center gap-1.5"><span class="size-3.5 rounded border-[1.5px] border-[#B4846C] bg-[#F4E7DA]" />Held <b class="tabular-nums font-semibold">{{ tableCounts.held }}</b></li>
              <li class="flex items-center gap-1.5"><span class="size-3.5 rounded border-[1.5px] border-[#BDBDBD] bg-[#D9D9D9]" />Seated <b class="tabular-nums font-semibold">{{ tableCounts.seated }}</b></li>
              <li v-if="tableCounts.cleaning" class="flex items-center gap-1.5"><span class="size-3.5 rounded border-[1.5px] border-[#CFCAC6] bg-[#EFEDEB]" />Cleaning <b class="tabular-nums font-semibold">{{ tableCounts.cleaning }}</b></li>
            </ul>
          </div>

          <div ref="viewport" class="rsv-scroll relative min-h-0 flex-1 overflow-auto" @click.self="selectedTableUuid = null; sheetOpen = false">
            <div v-if="loading && !currentPlan" class="grid h-full place-items-center text-[14px] text-[#7D5A50]">Loading the floor…</div>

            <div v-else-if="planLock" class="grid h-full place-items-center p-6">
              <SubscriptionLockedState :lock="planLock" audience="staff" class="max-w-md" />
            </div>

            <div v-else-if="errorMessage" class="grid h-full place-items-center p-6">
              <div class="max-w-sm text-center">
                <p class="text-[14px] font-semibold text-[#2D1E17]">{{ errorMessage }}</p>
                <button type="button" class="rsv-press mt-4 h-11 rounded-xl bg-[#7D5A50] px-5 text-[14px] font-semibold text-[#FFF0D1] hover:bg-[#65463D]" @click="loadFloorPlan()">Try again</button>
              </div>
            </div>

            <div v-else-if="!currentPlan || (!currentPlan.tables?.length && !currentPlan.elements?.length)" class="grid h-full place-items-center p-6">
              <div class="max-w-sm text-center">
                <p class="font-display text-[18px] font-semibold text-[#2D1E17]">No floor is published yet</p>
                <p class="mt-1 text-[14px] leading-relaxed text-[#7D5A50]">A manager can publish one under Floor plan. Bookings still work from the list.</p>
              </div>
            </div>

            <!-- Sized to the scaled floor so scrolling matches what is drawn. -->
            <div
              v-else
              class="relative mx-auto my-6"
              :style="{ width: `${(currentPlan.canvas_width || 760) * scale}px`, height: `${(currentPlan.canvas_height || 640) * scale}px` }"
            >
              <div
                class="absolute left-0 top-0 origin-top-left rounded-2xl bg-[#FFFDF9] shadow-[0_1px_2px_rgba(45,30,23,0.06),0_8px_24px_-12px_rgba(45,30,23,0.18)] transition-transform duration-200 ease-out"
                :style="{ width: `${currentPlan.canvas_width || 760}px`, height: `${currentPlan.canvas_height || 640}px`, transform: `scale(${scale})` }"
                @click.self="selectedTableUuid = null; sheetOpen = false"
              >
                <div
                  v-for="(el, i) in currentPlan.elements || []"
                  :key="el.uuid || i"
                  class="pointer-events-none absolute"
                  :style="itemStyle('element', el, el.z_index || i + 1)"
                >
                  <img v-if="el.category === 'door'" :src="doorSrc(el.asset_key)" alt="" class="size-full" draggable="false">
                  <div v-else-if="el.category === 'counter'" class="flex size-full items-center justify-center overflow-hidden whitespace-nowrap rounded-[14px] bg-[#2D1E17] px-3 font-display text-[14px] font-semibold text-[#FFF0D1]">
                    {{ el.label || 'Counter' }}
                  </div>
                  <div v-else class="absolute inset-y-0 rounded-sm bg-[#C4B7AC]" :style="{ left: `${-(el.height ?? 10) / 2}px`, right: `${-(el.height ?? 10) / 2}px` }" />
                </div>

                <button
                  v-for="t in currentPlan.tables || []"
                  :key="t.uuid"
                  type="button"
                  :data-table="t.uuid"
                  class="rsv-table absolute rounded-xl"
                  :style="itemStyle('table', t, 100)"
                  :aria-label="`${t.table_name}, ${t.capacity} seats${tableMark(t) ? ', ' + tableMark(t)!.text : ''}`"
                  :aria-pressed="selectedTableUuid === t.uuid"
                  @click.stop="selectTable(t)"
                  @dblclick.stop="assignToOrder(t)"
                >
                  <span v-if="selectedTableUuid === t.uuid" :key="`ring-${t.uuid}`" class="rsv-ring pointer-events-none absolute -inset-2 rounded-2xl border-2 border-[#7D5A50]" />
                  <FloorPlanTable
                    :asset-key="t.asset_key || 'table_sqr_4'"
                    :label="tableLabel(t.table_name)"
                    :status="displayState(t)"
                    :selected="selectedTableUuid === t.uuid"
                    class="pointer-events-none size-full overflow-visible"
                  />
                  <span
                    v-if="tableMark(t)"
                    class="pointer-events-none absolute left-1/2 top-full mt-1 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                    :class="{
                      'bg-[#2D1E17] text-[#FFF0D1]': tableMark(t)!.kind === 'late',
                      'bg-[#B4846C] text-white': tableMark(t)!.kind === 'soon',
                      'bg-white text-[#7D5A50] ring-1 ring-[#E8DEC8]': tableMark(t)!.kind === 'later',
                      'bg-[#8A8A8A] text-white': tableMark(t)!.kind === 'seated',
                    }"
                  >
                    <Icon v-if="tableMark(t)!.kind === 'seated'" name="heroicons:user-solid" class="size-3" />
                    {{ tableMark(t)!.text }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- Zoom -->
          <div v-if="currentPlan" class="absolute bottom-4 left-4 items-center gap-1 rounded-xl bg-white p-1 shadow-[0_1px_2px_rgba(45,30,23,0.1),0_6px_16px_-8px_rgba(45,30,23,0.25)]" :class="sheetOpen ? 'hidden md:flex' : 'flex'">
            <button type="button" class="rsv-icon grid !size-10 place-items-center" aria-label="Zoom out" @click="zoomBy(-0.2)"><Icon name="heroicons:minus" class="size-5" /></button>
            <button type="button" class="h-10 min-w-[56px] rounded-lg px-2 text-[13px] font-semibold tabular-nums text-[#7D5A50] hover:bg-[#F6ECE0]" aria-label="Fit floor to screen" @click="zoom = 1">
              {{ zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%` }}
            </button>
            <button type="button" class="rsv-icon grid !size-10 place-items-center" aria-label="Zoom in" @click="zoomBy(0.2)"><Icon name="heroicons:plus" class="size-5" /></button>
          </div>

          </div>

          <!-- Table details: a bottom sheet on phones, a panel docked beside the floor on tablets and up -->
          <Transition name="rsv-sheet">
            <aside
              v-if="sheetOpen && selectedTable"
              class="rsv-scroll absolute inset-x-0 bottom-0 z-20 max-h-[78%] overflow-y-auto rounded-t-[20px] bg-white shadow-[0_-1px_0_#E8DEC8,0_-12px_32px_-16px_rgba(45,30,23,0.3)] md:static md:max-h-none md:w-[300px] md:shrink-0 md:rounded-none md:border-l md:border-[#E8DEC8] md:shadow-none lg:w-[320px]"
              :aria-label="`${selectedTable.table_name} details`"
            >
              <!-- Header -->
              <div class="sticky top-0 z-10 border-b border-[#F0E6DA] bg-white px-4 pb-3.5 pt-4">
                <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E8DEC8] md:hidden" aria-hidden="true" />
                <div class="flex items-start gap-3">
                  <div class="min-w-0 flex-1">
                    <h3 class="font-display text-[22px] font-bold leading-tight text-[#2D1E17]">{{ selectedTable.table_name }}</h3>
                    <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <!-- Status pill is hidden for booked tables (held, or a walk-in before a booking); the booking card below says who holds it -->
                      <span
                        v-if="!isBookedTable(selectedTable)"
                        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold"
                        :class="{
                          'border-emerald-200 bg-emerald-50 text-emerald-800': tableState(selectedTable) === 'available',
                          'border-[#B4846C] bg-[#F4E7DA] text-[#5B3F33]': tableState(selectedTable) === 'reserved',
                          'border-[#CFCAC6] bg-[#EFEDEB] text-[#3F3532]': tableState(selectedTable) !== 'available' && tableState(selectedTable) !== 'reserved',
                        }"
                      >
                        <span
                          class="size-1.5 rounded-full"
                          :class="{
                            'bg-emerald-500': tableState(selectedTable) === 'available',
                            'bg-[#B4846C]': tableState(selectedTable) === 'reserved',
                            'bg-[#8A8A8A]': tableState(selectedTable) !== 'available' && tableState(selectedTable) !== 'reserved',
                          }"
                          aria-hidden="true"
                        />
                        {{ tableStateLabel(selectedTable) }}
                      </span>
                      <span class="text-[13px] text-[#7D5A50]">
                        {{ selectedTable.capacity }} seats<template v-if="selectedTable.shared"> · counter, booked by seat</template>
                      </span>
                    </div>
                  </div>
                  <button type="button" class="rsv-icon grid shrink-0 place-items-center" aria-label="Close table details" @click="closeSheet">
                    <Icon name="heroicons:x-mark" class="size-5" />
                  </button>
                </div>
              </div>

              <div class="space-y-5 px-4 pb-5 pt-4">
                <!-- Actions: each one says what it does -->
                <section v-if="tableActions.length" aria-labelledby="table-actions-heading">
                  <h4 id="table-actions-heading" class="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9C8173]">What do you want to do?</h4>
                  <div class="mt-2.5 grid gap-2">
                    <button
                      v-for="a in tableActions"
                      :key="a.key"
                      type="button"
                      :disabled="updatingTable"
                      class="rsv-press flex min-h-[64px] w-full cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      :class="a.primary
                        ? 'bg-[#7D5A50] text-[#FFF0D1] hover:bg-[#65463D] shadow-[0_6px_16px_-8px_rgba(125,90,80,0.7)]'
                        : 'border border-[#E8DEC8] bg-white text-[#2D1E17] hover:border-[#B4846C] hover:bg-[#FDF8F3]'"
                      @click="a.run()"
                    >
                      <span
                        class="grid size-10 shrink-0 place-items-center rounded-xl"
                        :class="a.primary ? 'bg-[#FFF0D1]/15' : 'bg-[#F6ECE0] text-[#7D5A50]'"
                      >
                        <Icon v-if="updatingTable && a.primary" name="heroicons:arrow-path" class="size-5 animate-spin" />
                        <Icon v-else :name="a.icon" class="size-5" />
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block text-[15px] font-bold leading-tight">{{ a.label }}</span>
                        <span class="mt-0.5 block text-[12.5px] leading-snug" :class="a.primary ? 'text-[#FFF0D1]/85' : 'text-[#7D5A50]'">{{ a.hint }}</span>
                      </span>
                      <Icon name="heroicons:chevron-right-20-solid" class="size-5 shrink-0" :class="a.primary ? 'text-[#FFF0D1]/70' : 'text-[#C2A592]'" aria-hidden="true" />
                    </button>
                  </div>
                </section>

                <!-- Bookings on this table -->
                <section aria-labelledby="table-bookings-heading">
                  <h4 id="table-bookings-heading" class="flex items-baseline gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9C8173]">
                    Today at this table
                    <span v-if="selectedTableBookings.length" class="tabular-nums normal-case tracking-normal">{{ selectedTableBookings.length }}</span>
                  </h4>
                  <div v-if="!selectedTableBookings.length" class="mt-2.5 flex items-center gap-3 rounded-2xl bg-[#FBF5EE] px-4 py-3.5">
                    <Icon name="heroicons:calendar-days" class="size-5 shrink-0 text-[#B4846C]" aria-hidden="true" />
                    <p class="text-[13px] leading-snug text-[#7D5A50]">No bookings left today. Free for walk-ins.</p>
                  </div>
                  <ul v-else class="mt-2.5 space-y-2">
                    <li
                      v-for="b in selectedTableBookings"
                      :key="b.uuid"
                      class="rounded-2xl border border-[#F0E6DA] bg-[#FFFDF9] px-4 py-3"
                    >
                      <div class="flex items-start gap-3">
                        <span class="w-[58px] shrink-0 font-display text-[18px] font-semibold leading-tight tabular-nums text-[#2D1E17]">
                          {{ splitTime(new Date(b.reservation_date)).time }}<span class="ml-0.5 text-[11px] text-[#9C8173]">{{ splitTime(new Date(b.reservation_date)).meridiem }}</span>
                        </span>
                        <span class="min-w-0 flex-1">
                          <span class="block truncate text-[15px] font-semibold text-[#2D1E17]">{{ b.customer_name }}</span>
                          <span class="block text-[13px] text-[#7D5A50]">{{ b.party_size }} {{ b.party_size === 1 ? 'guest' : 'guests' }} · {{ relativeLine(b) }}</span>
                        </span>
                      </div>
                    </li>
                  </ul>
                </section>

                <!-- Manual status: not offered while a booking holds the table -->
                <section v-if="!isBookedTable(selectedTable)" aria-labelledby="table-status-heading">
                  <h4 id="table-status-heading" class="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9C8173]">Update table status</h4>
                  <div class="mt-2.5 grid grid-cols-3 gap-1 rounded-xl bg-[#F6ECE0] p-1" role="radiogroup" aria-label="Table status">
                    <button
                      v-for="o in OVERRIDES"
                      :key="o.status"
                      type="button"
                      role="radio"
                      :aria-checked="tableState(selectedTable) === o.status"
                      :disabled="updatingTable"
                      class="h-11 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50"
                      :class="tableState(selectedTable) === o.status ? 'bg-[#7D5A50] text-[#FFF0D1] shadow-xs' : 'text-[#7D5A50] hover:bg-white/70'"
                      @click="setTableStatus(selectedTable, o.status)"
                    >
                      {{ o.label }}
                    </button>
                  </div>
                </section>
              </div>
            </aside>
          </Transition>
        </section>
      </div>

      <!-- Toast -->
      <Transition name="rsv-toast">
        <div
          v-if="toast"
          class="pointer-events-none absolute bottom-5 left-1/2 z-40 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-[14px] font-semibold shadow-[0_10px_30px_-10px_rgba(26,18,14,0.5)]"
          :class="toast.tone === 'error' ? 'bg-[#FFF0D1] text-[#2D1E17] ring-1 ring-[#B4846C]' : 'bg-[#2D1E17] text-[#FFF0D1]'"
          role="status"
          aria-live="polite"
        >
          <Icon :name="toast.tone === 'error' ? 'heroicons:exclamation-circle' : 'heroicons:check-circle'" class="size-5 shrink-0" />
          {{ toast.text }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.rsv ::selection {
  background: #E8D3BF;
  color: #2D1E17;
}

.rsv-shell {
  box-shadow: 0 24px 64px -24px rgba(26, 18, 14, 0.55);
  animation: rsv-enter 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes rsv-enter {
  from { opacity: 0; transform: translateY(8px) scale(0.985); }
}

.rsv-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: #7D5A50;
  transition: background-color 140ms ease, color 140ms ease, transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
}
.rsv-icon:hover { background: #F6ECE0; color: #2D1E17; }
.rsv-icon:active { transform: scale(0.94); }
.rsv-icon:disabled { opacity: 0.5; }

.rsv-press {
  transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1), background-color 140ms ease;
}
.rsv-press:active { transform: scale(0.96); }

.rsv button:focus-visible,
.rsv [role='button']:focus-visible,
.rsv-input:focus-visible {
  outline: 2px solid #7D5A50;
  outline-offset: 2px;
}
.rsv-input {
  caret-color: #7D5A50;
  outline: none;
}
.rsv-input:focus { border-color: #7D5A50; }

.rsv-row { transition: background-color 160ms ease; }

.rsv-table { transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1); }
.rsv-table:active { transform: scale(0.97); }

/* The signature moment: picking a booking draws a ring round its table. */
.rsv-ring {
  animation: rsv-ring 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes rsv-ring {
  from { opacity: 0; transform: scale(1.25); }
}

.rsv-sheet-enter-active { transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease; }
.rsv-sheet-leave-active { transition: transform 180ms ease-in, opacity 160ms ease-in; }
.rsv-sheet-enter-from,
.rsv-sheet-leave-to { transform: translateY(24px); opacity: 0; }
@media (min-width: 768px) {
  .rsv-sheet-enter-from,
  .rsv-sheet-leave-to { transform: translateX(16px); }
}

.rsv-toast-enter-active { transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease; }
.rsv-toast-leave-active { transition: opacity 160ms ease; }
.rsv-toast-enter-from { transform: translate(-50%, 8px); opacity: 0; }
.rsv-toast-leave-to { opacity: 0; }

.rsv-scroll { scrollbar-width: thin; scrollbar-color: #D9C3A5 transparent; }
.rsv-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.rsv-scroll::-webkit-scrollbar-thumb { background: #D9C3A5; border-radius: 8px; }

@media (prefers-reduced-motion: reduce) {
  .rsv-shell, .rsv-ring { animation: none; }
  .rsv-sheet-enter-active, .rsv-sheet-leave-active, .rsv-toast-enter-active { transition: opacity 120ms linear; }
  .rsv-sheet-enter-from, .rsv-sheet-leave-to, .rsv-toast-enter-from { transform: none; }
}
</style>
