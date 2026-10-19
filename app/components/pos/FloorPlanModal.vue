<!-- app/components/pos/FloorPlanModal.vue -->
<script setup lang="ts">
import { tableAsset, doorAsset } from '~/utils/floorPlanCatalog'
import { getTableStatusMeta } from '~/utils/tableColors'
import FloorPlanTable from '~/components/floor-plan/Table.vue'

interface TableData {
  uuid: string
  table_name: string
  capacity: number
  asset_key: string
  x_location: number
  y_location: number
  rotation: number
  status: string
  raw_status?: string
  shared?: boolean
  seats_taken?: number
  range_label?: string | null
  range_status_text?: string | null
  is_currently_booked?: boolean
  upcoming_reservation?: {
    uuid: string
    customer_name: string
    party_size: number
    reservation_date: string
    reservation_end: string
    status: string
    customer_phone?: string
    notes?: string
    is_current?: boolean
    range_label?: string
    range_status_text?: string
    minutes_until?: number | null
  } | null
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
  boundary_points?: any[]
  is_active: boolean
  tables: TableData[]
  elements: ElementData[]
}

const props = defineProps<{
  show: boolean
  branchName?: string
}>()

const emit = defineEmits<{
  close: []
  selectTable: [table: TableData]
}>()

const devicePosService = useDevicePosService()

// ── Real-Time Clock & Auto-Sync ───────────────────────────────────────────
const currentTime = ref(new Date())
let clockTimer: any = null
let autoPollTimer: any = null

function updateClock() {
  currentTime.value = new Date()
}

const formattedCurrentTime = computed(() => {
  return currentTime.value.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
})

// ── Fullscreen & Viewport ─────────────────────────────────────────────────
const isFullscreen = ref(false)
const modalContainer = ref<HTMLElement | null>(null)

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  } else {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

// ── State ──────────────────────────────────────────────────────────────────
const loading = ref(true)
const updatingStatus = ref(false)
const updatingReservation = ref(false)
const errorMessage = ref('')
const planLocked = ref(false)
const toastMessage = ref('')
let toastTimer: any = null

function showToast(msg: string) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2800)
}

const floorPlans = ref<FloorPlanData[]>([])
const selectedPlanUuid = ref<string>('')
const currentPlan = computed(() =>
  floorPlans.value.find((p) => p.uuid === selectedPlanUuid.value) || floorPlans.value[0] || null
)

const selectedTableUuid = ref<string | null>(null)
const selectedTable = computed(() => {
  if (!currentPlan.value || !selectedTableUuid.value) return null
  return (currentPlan.value.tables || []).find((t) => t.uuid === selectedTableUuid.value) || null
})

// Sidebar Tab: 'details' or 'bookings'
const activeSideTab = ref<'details' | 'bookings'>('details')

// Reservations list for today
const reservationsLoading = ref(false)
const reservationsList = ref<any[]>([])
const reservationSearch = ref('')
const reservationStatusFilter = ref<'all' | 'active' | 'confirmed' | 'seated' | 'pending'>('all')

// Zoom and Pan
const zoomLevel = ref(1)
function zoomIn() {
  zoomLevel.value = Math.min(1.8, Math.round((zoomLevel.value + 0.15) * 100) / 100)
}
function zoomOut() {
  zoomLevel.value = Math.max(0.6, Math.round((zoomLevel.value - 0.15) * 100) / 100)
}
function resetZoom() {
  zoomLevel.value = 1
}

// ── Data Fetching ──────────────────────────────────────────────────────────
async function loadFloorPlan(silent = false) {
  if (!silent) {
    loading.value = true
    errorMessage.value = ''
    planLocked.value = false
  }

  try {
    const res = await devicePosService.getFloorPlan()
    if (res.success) {
      floorPlans.value = res.floor_plans || (res.floor_plan ? [res.floor_plan] : [])
      const firstPlan = floorPlans.value[0]
      if (firstPlan && !selectedPlanUuid.value) {
        selectedPlanUuid.value = firstPlan.uuid
      }
    }
  } catch (e: any) {
    if (e?.response?.status === 403 || e?.status === 403) {
      planLocked.value = true
    } else if (!silent) {
      errorMessage.value = e?.data?.message || 'Failed to load floor plan for this branch.'
    }
  } finally {
    if (!silent) loading.value = false
  }
}

async function loadReservations(silent = false) {
  if (!silent) reservationsLoading.value = true
  try {
    const res = await devicePosService.getReservations()
    if (res.success) {
      reservationsList.value = res.reservations?.data || []
    }
  } catch (e: any) {
    // silent fail
  } finally {
    if (!silent) reservationsLoading.value = false
  }
}

async function refreshAll() {
  await Promise.all([loadFloorPlan(), loadReservations()])
  showToast('Floor plan & range statuses synced')
}

// ── Table Booking & Range Hours Computation ────────────────────────────────
function getTableBookingInfo(table: TableData) {
  const up = table.upcoming_reservation

  // Also check reservationsList for today matching this table if not embedded
  const fromList = reservationsList.value.find(
    (r) =>
      (r.table?.uuid === table.uuid || r.table?.table_name === table.table_name) &&
      ['confirmed', 'seated', 'pending'].includes((r.status || '').toLowerCase())
  )

  const res = up || fromList
  if (!res) return null

  const start = res.reservation_date ? new Date(res.reservation_date) : null
  const end = res.reservation_end ? new Date(res.reservation_end) : null
  const now = currentTime.value

  const isCurrent = start && end ? now >= start && now <= end : false
  const minutesUntil = start ? Math.round((start.getTime() - now.getTime()) / 60000) : null

  const rangeLabel =
    res.range_label ||
    (start && end ? formatBookingTime(res.reservation_date, res.reservation_end) : '')

  let statusLabel = 'Booked'
  if (isCurrent) {
    statusLabel = (res.status || '').toLowerCase() === 'seated' ? 'Seated' : 'Active Now'
  } else if (minutesUntil !== null && minutesUntil > 0 && minutesUntil <= 60) {
    statusLabel = `In ${minutesUntil}m`
  }

  return {
    raw: res,
    uuid: res.uuid,
    isCurrent,
    minutesUntil,
    rangeLabel,
    statusLabel,
    customerName: res.customer_name || 'Guest',
    customerPhone: res.customer_phone || '',
    partySize: res.party_size || table.capacity,
    status: (res.status || 'confirmed').toLowerCase(),
    notes: res.notes || '',
  }
}

// Effective live status for rendering table colors and badges
function getEffectiveTableStatus(table: TableData): string {
  const info = getTableBookingInfo(table)
  if (info && info.isCurrent) {
    if (info.status === 'seated') return 'occupied'
    if (['confirmed', 'pending'].includes(info.status)) return 'reserved'
  }
  return table.status || 'available'
}

// ── Actions ────────────────────────────────────────────────────────────────
async function changeTableStatus(table: TableData, newStatus: string) {
  if (updatingStatus.value || table.status === newStatus) return
  updatingStatus.value = true

  const oldStatus = table.status
  table.status = newStatus

  try {
    const res = await devicePosService.updateTableStatus(table.uuid, newStatus)
    if (res.success && res.table) {
      table.status = res.table.status
      showToast(`${table.table_name} status updated to ${newStatus}`)
    }
  } catch (e: any) {
    table.status = oldStatus
    showToast(e?.data?.message || 'Failed to update table status')
  } finally {
    updatingStatus.value = false
  }
}

async function updateBookingStatus(resUuid: string, newStatus: string, table: TableData) {
  if (updatingReservation.value) return
  updatingReservation.value = true

  try {
    const res = await devicePosService.updateReservationStatus(resUuid, newStatus)
    if (res.success) {
      showToast(`Reservation marked ${newStatus}`)
      if (newStatus === 'seated') {
        table.status = 'occupied'
      } else if (newStatus === 'completed') {
        table.status = 'available'
      }
      await refreshAll()
    }
  } catch (e: any) {
    showToast(e?.data?.message || 'Could not update reservation status')
  } finally {
    updatingReservation.value = false
  }
}

function assignTableToOrder(table: TableData) {
  emit('selectTable', table)
  emit('close')
  showToast(`${table.table_name} assigned to order`)
}

// ── Sizing & Canvas Layout Helpers ─────────────────────────────────────────
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
  const x = item.x_location ?? item.x ?? 0
  const y = item.y_location ?? item.y ?? 0
  return {
    left: `${x}px`,
    top: `${y}px`,
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

function handleTableClick(table: TableData) {
  selectedTableUuid.value = table.uuid
  activeSideTab.value = 'details'
}

// ── Computed Summary Counts ────────────────────────────────────────────────
const tableCounts = computed(() => {
  if (!currentPlan.value) return { total: 0, available: 0, reserved: 0, occupied: 0, cleaning: 0 }
  const counts = { total: 0, available: 0, reserved: 0, occupied: 0, cleaning: 0 }
  for (const t of currentPlan.value.tables || []) {
    counts.total++
    const s = getEffectiveTableStatus(t)
    if (s === 'reserved') counts.reserved++
    else if (s === 'occupied') counts.occupied++
    else if (s === 'cleaning' || s === 'unavailable' || s === 'not_available') counts.cleaning++
    else counts.available++
  }
  return counts
})

const filteredReservations = computed(() => {
  let list = reservationsList.value
  const now = currentTime.value

  if (reservationStatusFilter.value === 'active') {
    list = list.filter((r) => {
      const s = r.reservation_date ? new Date(r.reservation_date) : null
      const e = r.reservation_end ? new Date(r.reservation_end) : null
      return s && e && now >= s && now <= e
    })
  } else if (reservationStatusFilter.value !== 'all') {
    list = list.filter(
      (r) => (r.status || '').toLowerCase() === reservationStatusFilter.value.toLowerCase()
    )
  }

  if (reservationSearch.value.trim()) {
    const q = reservationSearch.value.toLowerCase()
    list = list.filter(
      (r) =>
        r.customer_name?.toLowerCase().includes(q) ||
        r.table?.table_name?.toLowerCase().includes(q) ||
        r.customer_phone?.includes(q)
    )
  }
  return list
})

function formatTime(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatBookingTime(startIso?: string, endIso?: string) {
  if (!startIso) return ''
  const start = formatTime(startIso)
  const end = endIso ? formatTime(endIso) : ''
  return `${start}${end ? ` – ${end}` : ''}`
}

function selectReservationTable(resItem: any) {
  if (resItem.table?.uuid) {
    selectedTableUuid.value = resItem.table.uuid
    activeSideTab.value = 'details'
  }
}

// ── Keyboard & Lifecycle ───────────────────────────────────────────────────
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (isFullscreen.value && !document.fullscreenElement) {
      isFullscreen.value = false
    } else {
      emit('close')
    }
  }
}

onMounted(() => {
  loadFloorPlan()
  loadReservations()
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', onFullscreenChange)

  // Clock tick every 10 seconds to keep range hours reactive
  clockTimer = setInterval(updateClock, 10000)

  // Background auto-sync every 20 seconds so manager bookings reflect automatically
  autoPollTimer = setInterval(() => {
    loadFloorPlan(true)
    loadReservations(true)
  }, 20000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (clockTimer) clearInterval(clockTimer)
  if (autoPollTimer) clearInterval(autoPollTimer)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 md:p-6 bg-[#1A120E]/65 backdrop-blur-xs print:hidden emil-backdrop select-none"
    role="dialog"
    aria-modal="true"
    aria-labelledby="floorplan-modal-title"
  >
    <!-- Modal Container: Starts from scale(0.96) following Emil Kowalski's core rules -->
    <div
      ref="modalContainer"
      class="emil-modal relative bg-[#FFFDF9] flex flex-col overflow-hidden border border-[#E8DEC8] shadow-2xl transition-all duration-200 ease-out"
      :class="
        isFullscreen
          ? 'fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none border-none z-50'
          : 'w-full max-w-6xl h-[92vh] rounded-2xl'
      "
    >
      <!-- ── MODAL HEADER ────────────────────────────────────────────────── -->
      <header
        class="px-5 py-3.5 bg-white border-b border-[#E8DEC8] flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs z-30"
      >
        <!-- Title & Branch Info -->
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-[#F6ECE0] border border-[#E8DEC8] flex items-center justify-center text-[#7D5A50] shrink-0 shadow-2xs"
          >
            <Icon name="heroicons:map" class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2
                id="floorplan-modal-title"
                class="font-display text-lg font-bold text-[#2D1E17] tracking-tight"
              >
                Floor Plan & Table Reservations
              </h2>
              <span
                class="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Register
              </span>
            </div>
            <p class="text-xs text-[#8B6656] mt-0.5 flex items-center gap-2">
              <span>{{ branchName || 'BrewSpot' }}</span>
              <span v-if="currentPlan" class="text-[#D9C3A5]">&bull;</span>
              <span v-if="currentPlan" class="font-medium text-[#3D2B24]">{{ currentPlan.floorplan_name }}</span>
              <span class="text-[#D9C3A5]">&bull;</span>
              <span class="font-mono text-[11px] text-[#7D5A50] tabular-nums flex items-center gap-1">
                <Icon name="heroicons:clock" class="w-3.5 h-3.5 text-[#B4846C]" />
                {{ formattedCurrentTime }}
              </span>
            </p>
          </div>
        </div>

        <!-- Floor Switcher (Segmented Control) -->
        <div
          v-if="floorPlans.length > 1"
          class="flex items-center gap-1 bg-[#F5EAD9] p-1 rounded-xl border border-[#E8DEC8]"
        >
          <button
            v-for="p in floorPlans"
            :key="p.uuid"
            type="button"
            @click="selectedPlanUuid = p.uuid"
            class="emil-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            :class="
              p.uuid === currentPlan?.uuid
                ? 'bg-[#2D1E17] text-[#FFF8EA] shadow-xs'
                : 'text-[#7D5A50] hover:text-[#2D1E17] hover:bg-white/60'
            "
          >
            <span>{{ p.floorplan_name }}</span>
            <span class="text-[10px] opacity-75 tabular-nums">({{ p.tables?.length || 0 }})</span>
          </button>
        </div>

        <!-- Color Legend Badges -->
        <div class="hidden lg:flex items-center gap-2 text-xs">
          <div
            class="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/90 px-2.5 py-1 text-emerald-800 font-medium"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span class="tabular-nums">Available ({{ tableCounts.available }})</span>
          </div>
          <div
            class="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/90 px-2.5 py-1 text-amber-800 font-medium"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span class="tabular-nums">Reserved ({{ tableCounts.reserved }})</span>
          </div>
          <div
            class="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/90 px-2.5 py-1 text-blue-800 font-medium"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span class="tabular-nums">Occupied ({{ tableCounts.occupied }})</span>
          </div>
          <div
            class="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-100 px-2.5 py-1 text-stone-700 font-medium"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-stone-400" />
            <span class="tabular-nums">N/A ({{ tableCounts.cleaning }})</span>
          </div>
        </div>

        <!-- Header Actions: Refresh, Maximize, Close -->
        <div class="flex items-center gap-1.5">
          <button
            @click="refreshAll"
            :disabled="loading"
            class="emil-icon-btn p-2 rounded-xl text-[#7D5A50] hover:bg-[#F6ECE0] hover:text-[#2D1E17] transition-all"
            title="Refresh floor plan & table range statuses"
            aria-label="Refresh tables"
          >
            <Icon name="heroicons:arrow-path" class="w-5 h-5" :class="{ 'animate-spin': loading }" />
          </button>

          <!-- Fullscreen Toggle -->
          <button
            @click="toggleFullscreen"
            class="emil-icon-btn p-2 rounded-xl text-[#7D5A50] hover:bg-[#F6ECE0] hover:text-[#2D1E17] transition-all"
            :title="isFullscreen ? 'Exit full screen' : 'Maximize full screen'"
            :aria-label="isFullscreen ? 'Restore' : 'Maximize'"
          >
            <Icon
              :name="isFullscreen ? 'heroicons:arrows-pointing-in' : 'heroicons:arrows-pointing-out'"
              class="w-5 h-5"
            />
          </button>

          <!-- Close Modal -->
          <button
            @click="emit('close')"
            class="emil-icon-btn p-2 rounded-xl text-[#7D5A50] hover:bg-rose-50 hover:text-rose-700 transition-all ml-1"
            title="Close modal (Esc)"
            aria-label="Close"
          >
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>
      </header>

      <!-- Toast Feedback Popup (Sonner-like) -->
      <transition
        enter-active-class="transition duration-180 ease-out"
        enter-from-class="opacity-0 -translate-y-3 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 -translate-y-3 scale-95"
      >
        <div
          v-if="toastMessage"
          class="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#2D1E17] text-[#FFF8EA] px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border border-[#4A372E] flex items-center gap-2 pointer-events-none"
        >
          <Icon name="heroicons:check-circle" class="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{{ toastMessage }}</span>
        </div>
      </transition>

      <!-- ── MODAL BODY ──────────────────────────────────────────────────── -->
      <div class="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        <!-- ── CANVAS COLUMN (Left / Main) ───────────────────────────────── -->
        <main
          class="flex-1 flex flex-col overflow-hidden bg-[#FAF6F0] relative border-b md:border-b-0 md:border-r border-[#E8DEC8]"
        >
          <!-- Mobile Status Legend Bar -->
          <div
            class="flex lg:hidden flex-wrap items-center gap-2 p-2.5 bg-white/90 border-b border-[#E8DEC8] text-[11px]"
          >
            <span class="inline-flex items-center gap-1 font-medium text-emerald-700"
              ><span class="w-2 h-2 rounded-full bg-emerald-500" /> Available ({{ tableCounts.available }})</span
            >
            <span class="inline-flex items-center gap-1 font-medium text-amber-700"
              ><span class="w-2 h-2 rounded-full bg-amber-500" /> Reserved ({{ tableCounts.reserved }})</span
            >
            <span class="inline-flex items-center gap-1 font-medium text-blue-700"
              ><span class="w-2 h-2 rounded-full bg-blue-500" /> Occupied ({{ tableCounts.occupied }})</span
            >
            <span class="inline-flex items-center gap-1 font-medium text-stone-700"
              ><span class="w-2 h-2 rounded-full bg-stone-400" /> N/A ({{ tableCounts.cleaning }})</span
            >
          </div>

          <!-- Canvas Floating Controls Bar (Zoom dock) -->
          <div
            class="absolute bottom-4 left-4 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-[#E8DEC8] rounded-xl p-1 shadow-md"
          >
            <button
              @click="zoomOut"
              class="emil-btn w-8 h-8 rounded-lg flex items-center justify-center text-[#7D5A50] hover:bg-[#F6ECE0] transition-all"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <Icon name="heroicons:minus" class="w-4 h-4" />
            </button>
            <span class="text-[11px] font-mono font-semibold text-[#7D5A50] px-1 min-w-10 text-center tabular-nums">
              {{ Math.round(zoomLevel * 100) }}%
            </span>
            <button
              @click="zoomIn"
              class="emil-btn w-8 h-8 rounded-lg flex items-center justify-center text-[#7D5A50] hover:bg-[#F6ECE0] transition-all"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <Icon name="heroicons:plus" class="w-4 h-4" />
            </button>
            <button
              @click="resetZoom"
              class="emil-btn px-2.5 h-8 rounded-lg text-[11px] font-semibold text-[#7D5A50] hover:bg-[#F6ECE0] transition-all ml-0.5"
              title="Reset zoom"
            >
              Reset
            </button>
          </div>

          <!-- Canvas Scroll Viewport -->
          <div class="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center">
            <!-- Loading State -->
            <div
              v-if="loading && !currentPlan"
              class="flex flex-col items-center justify-center py-16 text-[#7D5A50]"
            >
              <Icon name="heroicons:arrow-path" class="w-10 h-10 animate-spin text-[#B4846C] mb-3" />
              <p class="font-display font-semibold text-base text-[#2D1E17]">Loading floor plan...</p>
            </div>

            <!-- Plan Locked (Subscription Feature missing) -->
            <div
              v-else-if="planLocked"
              class="max-w-md text-center p-8 bg-white border border-[#E8DEC8] rounded-2xl shadow-sm"
            >
              <div
                class="w-12 h-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-3"
              >
                <Icon name="heroicons:lock-closed" class="w-6 h-6" />
              </div>
              <h3 class="font-display text-lg font-bold text-[#2D1E17]">Reservations Feature Required</h3>
              <p class="text-sm text-[#8B6656] mt-1.5">
                Table reservations and floor plan view require the <strong>Reservations</strong> feature on the cafe's
                subscription plan.
              </p>
            </div>

            <!-- Error State -->
            <div
              v-else-if="errorMessage"
              class="max-w-md text-center p-8 bg-white border border-rose-200 rounded-2xl shadow-sm"
            >
              <Icon name="heroicons:exclamation-triangle" class="w-10 h-10 text-rose-500 mx-auto mb-2" />
              <p class="text-sm font-semibold text-rose-800">{{ errorMessage }}</p>
              <button
                @click="loadFloorPlan"
                class="emil-btn mt-4 px-4 py-2 bg-[#7D5A50] text-white rounded-xl text-xs font-bold hover:bg-[#65463D] transition-all"
              >
                Try Again
              </button>
            </div>

            <!-- Empty Floor Plan State -->
            <div
              v-else-if="!currentPlan || (!currentPlan.tables?.length && !currentPlan.elements?.length)"
              class="max-w-md text-center p-8 bg-white border border-[#E8DEC8] rounded-2xl shadow-sm"
            >
              <div
                class="w-14 h-14 rounded-full bg-[#F6ECE0] text-[#9E7060] border border-[#E8DEC8] flex items-center justify-center mx-auto mb-3"
              >
                <Icon name="heroicons:map" class="w-7 h-7" />
              </div>
              <h3 class="font-display text-base font-bold text-[#2D1E17]">No Active Floor Plan</h3>
              <p class="text-xs text-[#8B6656] mt-1.5">
                There is currently no published floor plan for this branch. The manager can activate one in Floor Plan
                Settings.
              </p>
            </div>

            <!-- Rendered Floor Plan Canvas with Radial Dot Grid -->
            <div
              v-else
              class="relative rounded-2xl border border-[#E8DEC8] bg-[#FFFDF9] [background-image:radial-gradient(#DECBB8_1.2px,transparent_1.2px)] [background-size:20px_20px] shadow-sm select-none transition-transform duration-160 ease-out origin-center"
              :style="{
                width: `${currentPlan.canvas_width || 760}px`,
                height: `${currentPlan.canvas_height || 640}px`,
                transform: `scale(${zoomLevel})`,
              }"
              @click.self="selectedTableUuid = null"
            >
              <!-- Fixtures (Doors, Counters, Walls) -->
              <div
                v-for="(el, i) in currentPlan.elements || []"
                :key="el.uuid || i"
                class="absolute pointer-events-none select-none"
                :style="itemStyle('element', el, el.z_index || i + 1)"
              >
                <!-- Door -->
                <img
                  v-if="el.category === 'door'"
                  :src="doorSrc(el.asset_key)"
                  alt="Door"
                  class="size-full pointer-events-none"
                  draggable="false"
                />
                <!-- Counter -->
                <div
                  v-else-if="el.category === 'counter'"
                  class="size-full rounded-[14px] bg-[#2D1E17] text-[#FFF0D1] font-display font-semibold text-[14px] flex items-center justify-center px-3 overflow-hidden whitespace-nowrap shadow-xs"
                >
                  {{ el.label || 'Counter' }}
                </div>
                <!-- Wall -->
                <div
                  v-else
                  class="absolute inset-y-0 bg-[#C4B7AC] rounded-sm"
                  :style="{ left: `${-(el.height ?? 10) / 2}px`, right: `${-(el.height ?? 10) / 2}px` }"
                />
              </div>

              <!-- Interactive Tables on Canvas -->
              <div
                v-for="t in currentPlan.tables || []"
                :key="t.uuid"
                class="table-node absolute cursor-pointer group transition-transform duration-160 ease-out select-none"
                :style="itemStyle('table', t, 100)"
                :title="`${t.table_name} (${t.capacity} seats • Status: ${getEffectiveTableStatus(t)})`"
                @click.stop="handleTableClick(t)"
                @dblclick.stop="assignTableToOrder(t)"
              >
                <!-- Focus Halo Ring -->
                <div
                  v-if="selectedTableUuid === t.uuid"
                  class="absolute -inset-1.5 rounded-2xl ring-3 ring-[#2D1E17] ring-offset-2 ring-offset-[#FFFDF9] pointer-events-none transition-all duration-160"
                />

                <!-- Table SVG with Live Status Colors -->
                <FloorPlanTable
                  :asset-key="t.asset_key || 'table_sqr_4'"
                  :label="tableLabel(t.table_name)"
                  :status="getEffectiveTableStatus(t)"
                  :selected="selectedTableUuid === t.uuid"
                  class="size-full overflow-visible pointer-events-none group-hover:scale-[1.03] transition-transform duration-160"
                />

                <!-- Mini Status Pulse Dot at Top-Right of Table -->
                <span
                  class="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-xs"
                  :class="getTableStatusMeta(getEffectiveTableStatus(t)).dotClass"
                />

                <!-- Floating Range Hours Badge (Automatic from Manager Booking!) -->
                <div
                  v-if="getTableBookingInfo(t)"
                  class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight shadow-xs flex items-center gap-1 border pointer-events-none transition-all duration-160"
                  :class="
                    getTableBookingInfo(t)?.isCurrent
                      ? 'bg-amber-500 text-white border-amber-600 shadow-amber-200'
                      : 'bg-white/95 text-[#7D5A50] border-[#E8DEC8]'
                  "
                >
                  <span
                    v-if="getTableBookingInfo(t)?.isCurrent"
                    class="w-1.5 h-1.5 rounded-full bg-white animate-ping"
                  />
                  <Icon
                    v-else
                    name="heroicons:clock"
                    class="w-3 h-3 text-[#B4846C]"
                  />
                  <span class="tabular-nums">{{ getTableBookingInfo(t)?.rangeLabel }}</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        <!-- ── SIDEBAR COLUMN (Right Panel) ──────────────────────────────── -->
        <aside class="w-full md:w-80 lg:w-96 bg-white flex flex-col shrink-0 overflow-hidden border-l border-[#E8DEC8]">
          <!-- Sidebar Navigation Tabs (Emil Kowalski Segmented Control) -->
          <div class="p-2 border-b border-[#E8DEC8] bg-[#F7F2EB]">
            <div class="grid grid-cols-2 p-1 bg-[#ECE3D6] rounded-xl gap-1">
              <button
                type="button"
                @click="activeSideTab = 'details'"
                class="emil-tab py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                :class="
                  activeSideTab === 'details'
                    ? 'bg-white text-[#2D1E17] shadow-xs'
                    : 'text-[#7D5A50] hover:text-[#2D1E17]'
                "
              >
                <Icon name="heroicons:cursor-arrow-rays" class="w-4 h-4" />
                <span>Table Details</span>
              </button>

              <button
                type="button"
                @click="activeSideTab = 'bookings'"
                class="emil-tab py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                :class="
                  activeSideTab === 'bookings'
                    ? 'bg-white text-[#2D1E17] shadow-xs'
                    : 'text-[#7D5A50] hover:text-[#2D1E17]'
                "
              >
                <Icon name="heroicons:calendar-days" class="w-4 h-4" />
                <span>Today's Bookings</span>
                <span
                  v-if="reservationsList.length"
                  class="ml-0.5 rounded-full bg-[#2D1E17] text-[#FFF0D1] px-1.5 py-0.2 text-[10px] font-mono tabular-nums"
                >
                  {{ reservationsList.length }}
                </span>
              </button>
            </div>
          </div>

          <!-- TAB 1: TABLE DETAILS -->
          <div v-if="activeSideTab === 'details'" class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- Table Selected State -->
            <div v-if="selectedTable" class="space-y-4">
              <!-- Selected Table Header Card -->
              <div class="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h3 class="font-display text-xl font-bold text-[#2D1E17] tracking-tight">
                      {{ selectedTable.table_name }}
                    </h3>
                    <p class="text-xs text-[#8B6656] mt-0.5 flex items-center gap-1.5">
                      <Icon name="heroicons:users" class="w-3.5 h-3.5 text-[#B4846C]" />
                      <span>Capacity: <strong class="text-[#2D1E17]">{{ selectedTable.capacity }} guests</strong></span>
                      <span
                        v-if="selectedTable.shared"
                        class="ml-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-semibold"
                        >Bar/Counter</span
                      >
                    </p>
                  </div>

                  <!-- Live Status Pill -->
                  <div
                    class="px-2.5 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5"
                    :class="getTableStatusMeta(getEffectiveTableStatus(selectedTable)).badgeClass"
                  >
                    <span
                      class="w-2 h-2 rounded-full"
                      :class="getTableStatusMeta(getEffectiveTableStatus(selectedTable)).dotClass"
                    />
                    <span>{{ getTableStatusMeta(getEffectiveTableStatus(selectedTable)).label }}</span>
                  </div>
                </div>

                <!-- Quick Action: Assign to Current Order -->
                <button
                  type="button"
                  @click="assignTableToOrder(selectedTable)"
                  class="emil-btn w-full py-2.5 px-3 rounded-xl bg-[#2D1E17] hover:bg-[#3E2C23] text-[#FFF8EA] font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Icon name="heroicons:shopping-bag" class="w-4 h-4 text-[#FFF0D1]" />
                  <span>Assign to Current Order</span>
                </button>
              </div>

              <!-- ── RANGE HOURS STATUS CARD (Core Feature!) ──────────────── -->
              <div class="space-y-2">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-[#7D5A50]">
                  Booking & Range Hours Status
                </label>

                <!-- Has Active or Upcoming Booking -->
                <div
                  v-if="getTableBookingInfo(selectedTable)"
                  class="p-4 rounded-2xl border transition-all duration-160 space-y-2.5"
                  :class="
                    getTableBookingInfo(selectedTable)?.isCurrent
                      ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                      : 'bg-[#FFFDF9] border-[#E8DEC8]'
                  "
                >
                  <!-- Time Window Header -->
                  <div class="flex items-center justify-between">
                    <span
                      class="inline-flex items-center gap-1.5 font-mono text-sm font-bold tracking-tight tabular-nums"
                      :class="getTableBookingInfo(selectedTable)?.isCurrent ? 'text-amber-950' : 'text-[#2D1E17]'"
                    >
                      <Icon name="heroicons:clock" class="w-4 h-4 text-[#B4846C]" />
                      {{ getTableBookingInfo(selectedTable)?.rangeLabel }}
                    </span>

                    <!-- Status Chip -->
                    <span
                      class="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider flex items-center gap-1"
                      :class="
                        getTableBookingInfo(selectedTable)?.isCurrent
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'bg-[#F5EAD9] text-[#7D5A50]'
                      "
                    >
                      <span
                        v-if="getTableBookingInfo(selectedTable)?.isCurrent"
                        class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"
                      />
                      {{ getTableBookingInfo(selectedTable)?.statusLabel }}
                    </span>
                  </div>

                  <!-- Guest & Party Info -->
                  <div class="pt-1.5 border-t border-[#E8DEC8]/60 space-y-1 text-xs">
                    <div class="flex items-center justify-between text-[#2D1E17]">
                      <span class="font-bold flex items-center gap-1.5">
                        <Icon name="heroicons:user" class="w-3.5 h-3.5 text-[#7D5A50]" />
                        {{ getTableBookingInfo(selectedTable)?.customerName }}
                      </span>
                      <span class="text-[#8B6656] flex items-center gap-1 font-medium">
                        <Icon name="heroicons:user-group" class="w-3.5 h-3.5" />
                        {{ getTableBookingInfo(selectedTable)?.partySize }} guests
                      </span>
                    </div>

                    <div
                      v-if="getTableBookingInfo(selectedTable)?.customerPhone"
                      class="text-[11px] text-[#7D5A50] flex items-center gap-1.5"
                    >
                      <Icon name="heroicons:phone" class="w-3.5 h-3.5" />
                      <span>{{ getTableBookingInfo(selectedTable)?.customerPhone }}</span>
                    </div>

                    <p
                      v-if="getTableBookingInfo(selectedTable)?.notes"
                      class="text-[11px] text-[#7D5A50] italic bg-white/70 p-2 rounded-lg border border-[#E8DEC8]/60 mt-1"
                    >
                      "{{ getTableBookingInfo(selectedTable)?.notes }}"
                    </p>
                  </div>

                  <!-- Booking Action Buttons (Seat Guest or Complete) -->
                  <div class="pt-2 flex items-center gap-2">
                    <button
                      v-if="getTableBookingInfo(selectedTable)?.status !== 'seated'"
                      type="button"
                      :disabled="updatingReservation"
                      @click="
                        updateBookingStatus(
                          getTableBookingInfo(selectedTable)?.uuid!,
                          'seated',
                          selectedTable
                        )
                      "
                      class="emil-btn flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <Icon name="heroicons:user-check" class="w-4 h-4" />
                      <span>Seat Guests</span>
                    </button>

                    <button
                      v-else
                      type="button"
                      :disabled="updatingReservation"
                      @click="
                        updateBookingStatus(
                          getTableBookingInfo(selectedTable)?.uuid!,
                          'completed',
                          selectedTable
                        )
                      "
                      class="emil-btn flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <Icon name="heroicons:check" class="w-4 h-4" />
                      <span>Mark Finished</span>
                    </button>
                  </div>
                </div>

                <!-- No Active Booking for this Table Today -->
                <div v-else class="p-3.5 rounded-2xl bg-white border border-[#E8DEC8] text-center space-y-1">
                  <Icon name="heroicons:calendar" class="w-5 h-5 mx-auto text-[#C7B5A0]" />
                  <p class="text-xs font-semibold text-[#3D2B24]">No Bookings Scheduled</p>
                  <p class="text-[11px] text-[#8B6656]">Table is free to assign or seat walk-in guests today.</p>
                </div>
              </div>

              <!-- ── TACTILE TABLE STATUS SWITCHER ────────────────────────── -->
              <div class="space-y-2">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-[#7D5A50]">
                  Override Table Status
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <!-- Available -->
                  <button
                    type="button"
                    :disabled="updatingStatus"
                    @click="changeTableStatus(selectedTable, 'available')"
                    class="emil-btn p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all"
                    :class="
                      selectedTable.status === 'available'
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                        : 'border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100'
                    "
                  >
                    <Icon name="heroicons:check-circle" class="w-4 h-4 shrink-0" />
                    <span>Available</span>
                  </button>

                  <!-- Occupied -->
                  <button
                    type="button"
                    :disabled="updatingStatus"
                    @click="changeTableStatus(selectedTable, 'occupied')"
                    class="emil-btn p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all"
                    :class="
                      selectedTable.status === 'occupied'
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                        : 'border-blue-200 bg-blue-50/80 text-blue-800 hover:bg-blue-100'
                    "
                  >
                    <Icon name="heroicons:user-group" class="w-4 h-4 shrink-0" />
                    <span>Occupied</span>
                  </button>

                  <!-- Reserved -->
                  <button
                    type="button"
                    :disabled="updatingStatus"
                    @click="changeTableStatus(selectedTable, 'reserved')"
                    class="emil-btn p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all"
                    :class="
                      selectedTable.status === 'reserved'
                        ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                        : 'border-amber-200 bg-amber-50/80 text-amber-800 hover:bg-amber-100'
                    "
                  >
                    <Icon name="heroicons:calendar-days" class="w-4 h-4 shrink-0" />
                    <span>Reserved</span>
                  </button>

                  <!-- Cleaning / Not Available -->
                  <button
                    type="button"
                    :disabled="updatingStatus"
                    @click="changeTableStatus(selectedTable, 'cleaning')"
                    class="emil-btn p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all"
                    :class="
                      selectedTable.status === 'cleaning'
                        ? 'border-stone-600 bg-stone-600 text-white shadow-xs'
                        : 'border-stone-300 bg-stone-100 text-stone-800 hover:bg-stone-200'
                    "
                  >
                    <Icon name="heroicons:sparkles" class="w-4 h-4 shrink-0" />
                    <span>Reset / Clean</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Nothing Selected State -->
            <div
              v-else
              class="flex flex-col items-center justify-center py-12 text-center text-[#7D5A50] space-y-3"
            >
              <div
                class="w-12 h-12 rounded-2xl bg-[#F6ECE0] border border-[#E8DEC8] flex items-center justify-center text-[#9E7060] shadow-2xs"
              >
                <Icon name="heroicons:cursor-arrow-rays" class="w-6 h-6" />
              </div>
              <h4 class="font-display font-semibold text-sm text-[#2D1E17]">Select a Table</h4>
              <p class="text-xs text-[#8B6656] max-w-xs leading-relaxed">
                Click any table on the canvas to inspect its booking range, assign to the current POS order, or update
                live status.
              </p>
            </div>
          </div>

          <!-- TAB 2: TODAY'S BOOKINGS -->
          <div v-else class="flex-1 flex flex-col overflow-hidden">
            <!-- Filter & Search Bar -->
            <div class="p-3 border-b border-[#E8DEC8] bg-[#FFFDF9] space-y-2">
              <div class="relative">
                <Icon
                  name="heroicons:magnifying-glass"
                  class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  v-model="reservationSearch"
                  type="text"
                  placeholder="Search customer, phone, or table..."
                  class="w-full h-9 pl-9 pr-8 rounded-xl border border-[#E8DEC8] bg-white text-xs outline-none focus:border-[#7D5A50] focus:ring-1 focus:ring-[#7D5A50] transition-all"
                />
                <button
                  v-if="reservationSearch"
                  @click="reservationSearch = ''"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Icon name="heroicons:x-mark" class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Status Chips -->
              <div class="flex items-center gap-1.5 overflow-x-auto text-[11px] hide-scrollbar pb-0.5">
                <button
                  v-for="st in [
                    { id: 'all', label: 'All' },
                    { id: 'active', label: 'Active Now' },
                    { id: 'confirmed', label: 'Confirmed' },
                    { id: 'seated', label: 'Seated' },
                    { id: 'pending', label: 'Pending' },
                  ]"
                  :key="st.id"
                  type="button"
                  @click="reservationStatusFilter = st.id as any"
                  class="emil-btn px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all"
                  :class="
                    reservationStatusFilter === st.id
                      ? 'bg-[#2D1E17] text-[#FFF8EA] shadow-2xs'
                      : 'bg-[#F6ECE0] text-[#7D5A50] hover:bg-[#EFE2D2]'
                  "
                >
                  {{ st.label }}
                </button>
              </div>
            </div>

            <!-- Reservation List -->
            <div class="flex-1 overflow-y-auto p-3 space-y-2">
              <div v-if="reservationsLoading" class="py-12 text-center text-xs text-[#8B6656]">
                <Icon name="heroicons:arrow-path" class="w-6 h-6 animate-spin mx-auto text-[#B4846C] mb-2" />
                Loading reservations...
              </div>

              <div v-else-if="!filteredReservations.length" class="py-12 text-center text-[#8B6656] space-y-1">
                <Icon name="heroicons:calendar-days" class="w-8 h-8 mx-auto text-[#D9C3A5] mb-2" />
                <p class="font-semibold text-xs text-[#2D1E17]">No reservations found</p>
                <p class="text-[11px]">There are no bookings matching this filter today.</p>
              </div>

              <div
                v-for="res in filteredReservations"
                :key="res.uuid"
                @click="selectReservationTable(res)"
                class="emil-card p-3 rounded-xl border border-[#E8DEC8] bg-white hover:border-[#2D1E17] cursor-pointer transition-all shadow-2xs space-y-2 group"
                :class="{
                  'ring-2 ring-[#2D1E17]': selectedTableUuid === res.table?.uuid,
                }"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs text-[#2D1E17] group-hover:text-[#7D5A50]">
                    {{ res.customer_name }}
                  </span>
                  <span
                    class="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider"
                    :class="
                      res.status === 'seated'
                        ? 'bg-blue-100 text-blue-800'
                        : res.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                    "
                  >
                    {{ res.status }}
                  </span>
                </div>

                <!-- Range Hours & Table Chip -->
                <div class="flex items-center justify-between text-[11px] text-[#8B6656]">
                  <span class="flex items-center gap-1 font-mono tabular-nums font-semibold text-[#2D1E17]">
                    <Icon name="heroicons:clock" class="w-3.5 h-3.5 text-[#B4846C]" />
                    {{ res.range_label || formatBookingTime(res.reservation_date, res.reservation_end) }}
                  </span>
                  <span
                    class="font-semibold text-[#2D1E17] bg-[#F6ECE0] px-2 py-0.5 rounded-lg border border-[#E8DEC8]"
                  >
                    {{ res.table?.table_name || 'No Table' }} &bull; {{ res.party_size }}p
                  </span>
                </div>

                <p v-if="res.notes" class="text-[10px] text-gray-500 italic truncate">
                  "{{ res.notes }}"
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Emil Kowalski Micro-Interactions & Physics */
.emil-backdrop {
  transition: opacity 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.emil-modal {
  transform-origin: center;
  animation: emilEnter 220ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes emilEnter {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.emil-btn {
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.emil-btn:active {
  transform: scale(0.97);
}

.emil-icon-btn {
  transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 140ms ease;
}

.emil-icon-btn:active {
  transform: scale(0.92);
}

.emil-tab {
  transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 140ms ease,
    color 140ms ease;
}

.emil-tab:active {
  transform: scale(0.98);
}

.emil-card {
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.emil-card:hover {
  transform: translateY(-1px);
}

.emil-card:active {
  transform: scale(0.99);
}

.table-node:active {
  transform: scale(0.96) !important;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
