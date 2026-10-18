<script setup lang="ts">
import type { FloorPlan, FloorPlanElement, FloorPlanTable } from '~/services/FloorPlanService'
import type { ReservationRecord } from '~/services/ReservationService'
import type { ReservationStatus } from '~/services/ReservationService'
import { doorAsset, tableAsset } from '~/utils/floorPlanCatalog'

definePageMeta({
  role: 'Manager',
})

const links = [
  { label: 'Dashboard', to: '/manager/dashboard', icon: 'squares-2x2' },
  { label: 'Servings', to: '/manager/servings', icon: 'cake' },
  { label: 'Floor Plan', to: '/manager/floor-plan', icon: 'map' },
  { label: 'Reservations', to: '/manager/reservations', icon: 'calendar-days' },
]

const service = useFloorPlanService('manager')
const reservationService = useReservationService('manager')
const branches = ref<{ uuid: string; branch_name: string }[]>([])
const branchUuid = ref('')
const activePlan = ref<FloorPlan | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const reservationError = ref('')
const reservationNotice = ref('')
const reservations = ref<ReservationRecord[]>([])
const showWaitlist = ref(false)
const waitlistLoading = ref(false)
const submitting = ref(false)
const updatingReservation = ref<string | null>(null)
const selectedWaitlistReservation = ref<ReservationRecord | null>(null)
const waitlistSearch = ref('')
const waitlistStatusFilter = ref('all')
const selectedTable = ref<FloorPlanTable | null>(null)
const selectedChair = ref<FloorPlanElement | null>(null)
const reservation = reactive({
  customerName: '',
  date: '',
  time: '',
  partySize: 1,
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

function tableCapacity(table: FloorPlanTable) {
  return table.capacity
}

function localDateKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const todayDate = computed(() => localDateKey(new Date().toISOString()))
const reservationDateIsPast = computed(() =>
  Boolean(reservation.date) && reservation.date < todayDate.value)
const reservationDateError = computed(() =>
  reservationDateIsPast.value
    ? 'This date is not applicable. Choose today or a future date.'
    : '')

function seatIsOccupied(chair: FloorPlanElement) {
  if (!reservation.date) return false
  return reservations.value.some((item) =>
    item.seat_element_uuid === chair.uuid
    && ['pending', 'confirmed', 'seated'].includes(item.status)
    && localDateKey(item.reservation_date) === reservation.date)
}

watch(() => reservation.date, () => {
  if (selectedChair.value && seatIsOccupied(selectedChair.value)) {
    selectedChair.value = null
    selectedTable.value = null
    reservationError.value = 'That seat is already reserved for the selected date. Choose another seat.'
  }
})

function selectTable(table: FloorPlanTable) {
  if (table.status === 'occupied' || table.status === 'reserved') {
    selectedTable.value = null
    selectedChair.value = null
    reservationError.value = table.status === 'reserved'
      ? 'That table is reserved. Choose another table.'
      : 'That table is currently occupied. Choose another table.'
    return
  }
  selectedTable.value = table
  selectedChair.value = null
  reservationError.value = ''
  reservation.partySize = Math.min(Math.max(1, reservation.partySize), tableCapacity(table))
}

function selectChair(chair: FloorPlanElement) {
  if (seatIsOccupied(chair)) return
  const communalTables = planTables.value.filter((table) =>
    table.status !== 'occupied' && table.asset_key === 'table_communal_8')
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
  selectedTable.value = table
  selectedChair.value = chair
  reservation.partySize = 1
  reservationError.value = ''
}

async function loadPlan() {
  if (!branchUuid.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await service.list(branchUuid.value)
    const savedPlan = response.floor_plans.find((item) => item.is_active)
      ?? response.floor_plans[0]
    activePlan.value = savedPlan
      ? (await service.show(branchUuid.value, savedPlan.uuid)).floor_plan
      : null
    selectedTable.value = null
    selectedChair.value = null
  } catch (error: any) {
    activePlan.value = null
    errorMessage.value = error?.data?.message ?? 'Could not load the saved floor plan.'
  } finally {
    loading.value = false
  }

}

async function loadReservations() {
  if (!branchUuid.value) return
  const response = await reservationService.list(branchUuid.value)
  reservations.value = Array.isArray(response.reservations)
    ? response.reservations
    : response.reservations.data ?? []
}

async function updateReservationStatus(item: ReservationRecord, status: ReservationStatus) {
  if (updatingReservation.value) return
  updatingReservation.value = item.uuid
  reservationError.value = ''
  reservations.value = reservations.value.filter((reservation) => reservation.uuid !== item.uuid)
  try {
    await reservationService.updateStatus(branchUuid.value, item.uuid, status)
  } catch (error: any) {
    reservationError.value = error?.data?.message ?? 'Could not update the reservation status.'
  } finally {
    updatingReservation.value = null
  }
}

async function openWaitlist() {
  showWaitlist.value = true
  waitlistLoading.value = true
  reservationError.value = ''
  try {
    await loadReservations()
  } catch (error: any) {
    reservationError.value = error?.data?.message ?? 'Could not load the waitlist.'
  } finally {
    waitlistLoading.value = false
  }
}

function reservationDateTime(date: string, time: string) {
  return `${date} ${time || '18:00'}:00`
}

function reservationEnd(date: string, time: string) {
  const start = new Date(`${date}T${time || '18:00'}:00`)
  start.setMinutes(start.getMinutes() + 90)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date} ${pad(start.getHours())}:${pad(start.getMinutes())}:00`
}

function reservationDateValue(value: string) {
  const normalized = (value.includes('T') ? value : value.replace(' ', 'T'))
    .replace(/\.(\d{3})\d+(?=Z$)/, '.$1')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
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
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function tableNumber(item: ReservationRecord) {
  const name = item.table?.table_name?.trim()
  if (!name) return 'Unassigned'
  return name.match(/\d+\s*$/)?.[0]?.trim() ?? name
}

async function confirmReservation() {
  const phone = reservation.customerPhone.replace(/\D/g, '')
  if (reservationDateIsPast.value) {
    reservationError.value = reservationDateError.value
    return
  }
  if (!selectedTable.value || !reservation.customerName.trim() || phone.length !== 11 || !reservation.date) return
  submitting.value = true
  reservationError.value = ''
  reservationNotice.value = ''
  try {
    await reservationService.create(branchUuid.value, {
      table_uuid: selectedTable.value.uuid,
      seat_element_uuid: selectedChair.value?.uuid,
      customer_name: reservation.customerName.trim(),
      customer_phone: phone,
      party_size: reservation.partySize,
      reservation_date: reservationDateTime(reservation.date, reservation.time),
      reservation_end: reservationEnd(reservation.date, reservation.time),
      status: 'pending',
      notes: reservation.notes.trim() || undefined,
    })
    await loadReservations()
    reservationNotice.value = 'Reservation saved to the waitlist.'
  } catch (error: any) {
    reservationError.value = error?.data?.message ?? 'Could not save the reservation.'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const response = await service.managedBranches()
    branches.value = response.branches
    branchUuid.value = branches.value[0]?.uuid ?? ''
    await loadPlan()
    await loadReservations()
  } catch (error: any) {
    errorMessage.value = error?.data?.message ?? 'Could not load branches.'
    loading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#FFF8EA] md:flex-row">
    <NavBar :links="links" />
    <main class="flex-1 p-5 md:p-8">
      <section class="min-h-[calc(100vh-4rem)] rounded-[14px] border border-[#E8D7C7] bg-[#FFFDF9] p-6 md:p-8">
        <header class="flex flex-wrap items-end justify-between gap-4 border-b border-[#E8D7C7] pb-5">
          <div>
            <h1 class="font-display text-3xl font-semibold text-[#3B2A24]">Reservation</h1>
            <p class="mt-1 text-xs text-[#8B756A]">Choose an Available Table</p>
          </div>
          <div class="flex items-center gap-3">
            <select v-if="branches.length > 1" v-model="branchUuid" class="rounded-lg border border-[#DCC8B8] bg-white px-3 py-2 text-xs text-[#5B463C]" @change="loadPlan(); loadReservations()">
              <option v-for="branch in branches" :key="branch.uuid" :value="branch.uuid">{{ branch.branch_name }}</option>
            </select>
            <button type="button" class="relative z-10 rounded-lg border border-[#C79679] px-6 py-2 text-xs text-[#5B463C] transition-colors hover:bg-[#F8EFE7]" :class="showWaitlist ? 'bg-[#F8EFE7]' : 'bg-white'" @click.stop="openWaitlist">
              Waitlist ({{ reservations.length }})
            </button>
            <button type="button" class="rounded-lg bg-[#3B2A24] px-6 py-2 text-xs text-white">New Booking</button>
          </div>
        </header>
        <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
          <section class="min-h-[520px] rounded-xl border border-[#DCC8B8] bg-white p-4">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <button type="button" class="rounded-lg bg-[#3B2A24] px-5 py-2 text-xs text-white">Indoor</button>
              </div>
              <div class="text-xs text-[#8B756A]">Available &nbsp; · &nbsp; Reserved</div>
            </div>
            <div v-if="loading" class="flex min-h-[430px] items-center justify-center text-sm text-[#9D877B]">Loading saved layout…</div>
            <div v-else-if="errorMessage" class="flex min-h-[430px] items-center justify-center text-sm text-[#A96746]">{{ errorMessage }}</div>
            <div v-else-if="!activePlan" class="flex min-h-[430px] items-center justify-center text-sm text-[#B39D91]">No saved floor plan is available.</div>
            <div v-else class="overflow-auto rounded-lg bg-[#FFFDF9]">
              <div
                class="relative mx-auto rounded-lg bg-[#FFFDF9]"
                :style="{ width: `${activePlan.canvas_width}px`, height: `${activePlan.canvas_height}px` }"
              >
              <template v-for="element in planElements" :key="element.uuid">
                <img
                  v-if="element.category === 'door' && doorAsset(element.asset_key)?.src"
                  :src="doorAsset(element.asset_key)?.src"
                  alt="Door"
                  class="pointer-events-none absolute"
                  :style="{ left: `${element.x_location}px`, top: `${element.y_location}px`, width: `${element.width ?? doorAsset(element.asset_key)?.w ?? 64}px`, height: `${element.height ?? doorAsset(element.asset_key)?.h ?? 64}px`, transform: `rotate(${element.rotation}deg)`, transformOrigin: 'center' }"
                >
                <div
                  v-else
                  class="absolute flex items-center justify-center bg-[#3B2A24] text-xs font-semibold text-white"
                  :class="[
                    element.category === 'wall' ? 'rounded-none' : 'rounded-lg',
                    element.category === 'chair'
                      ? seatIsOccupied(element)
                        ? 'cursor-not-allowed bg-[#D9D9D9]'
                        : 'cursor-pointer bg-[#A47564] hover:ring-2 hover:ring-[#A96746]'
                      : '',
                    selectedChair?.uuid === element.uuid ? 'ring-2 ring-[#A96746] ring-offset-1' : '',
                  ]"
                  :style="{ left: `${element.x_location}px`, top: `${element.y_location}px`, width: `${element.width ?? 100}px`, height: `${element.height ?? 10}px`, transform: `rotate(${element.rotation}deg)`, transformOrigin: 'center' }"
                  :title="element.category === 'chair' ? (seatIsOccupied(element) ? 'Seat is reserved' : 'Select seat') : undefined"
                  @click.stop="element.category === 'chair' && selectChair(element)"
                >
                  <span v-if="element.category === 'counter'">{{ element.label ?? 'Counter' }}</span>
                </div>
              </template>
              <div
                v-for="table in planTables"
                :key="table.uuid"
                class="absolute rounded-lg transition-transform"
                :class="[
                  table.status === 'reserved'
                    ? 'cursor-not-allowed'
                    : 'cursor-pointer hover:scale-105',
                  selectedTable?.uuid === table.uuid
                    ? 'outline outline-2 outline-offset-2 outline-[#A96746]'
                    : '',
                ]"
                :style="{ left: `${table.x_location}px`, top: `${table.y_location}px`, width: `${tableAsset(table.asset_key)?.w ?? 112}px`, height: `${tableAsset(table.asset_key)?.h ?? 90}px`, transform: `rotate(${table.rotation}deg)` }"
                :title="table.status === 'reserved' ? `${table.table_name} (Reserved)` : `Select ${table.table_name}`"
                @click="selectTable(table)"
              >
                <FloorPlanTable
                  :asset-key="table.asset_key ?? 'table_sqr_4'"
                  :label="table.table_name.match(/(\d+)\s*$/)?.[1] ?? table.table_name.slice(0, 3)"
                  :status="table.status"
                  :selected="selectedTable?.uuid === table.uuid"
                  class="size-full"
                />
              </div>
              </div>
            </div>
          </section>
          <aside class="rounded-xl bg-[#FFFDF9] p-5">
            <p class="text-[10px] font-semibold uppercase text-[#A96746]">New reservation</p>
            <h2 class="mt-1 text-lg text-[#3B2A24]">Guest Details</h2>
            <form class="mt-5 space-y-3" @submit.prevent>
              <div v-if="selectedTable" class="rounded-lg bg-[#F2E0D2] px-3 py-3 text-xs text-[#5B463C]">
                <p class="text-[10px] uppercase text-[#8B756A]">{{ selectedChair ? 'Selected chair' : 'Selected table' }}</p>
                <p class="mt-1 font-medium">
                  {{ selectedChair ? `${selectedTable.table_name} · 1 seat` : `${selectedTable.table_name} · ${tableCapacity(selectedTable)} seats` }}
                </p>
                <button type="button" class="mt-1 text-[10px] text-[#A96746] underline" @click="selectedTable = null; selectedChair = null">Change</button>
              </div>
              <p v-else class="rounded-lg border border-dashed border-[#DCC8B8] px-3 py-3 text-xs text-[#9D877B]">Select an available table from the layout.</p>
              <label class="block text-[10px] text-[#8B756A]">Customer name
                <input v-model="reservation.customerName" type="text" placeholder="Enter guest name" class="mt-1 w-full rounded-lg border border-[#DCC8B8] bg-white px-3 py-2 text-xs text-[#5B463C] outline-none focus:border-[#A96746]" />
              </label>
              <label class="block text-[10px] text-[#8B756A]">Phone number
                <input v-model="reservation.customerPhone" type="tel" inputmode="numeric" maxlength="11" pattern="[0-9]{11}" placeholder="09XXXXXXXXX" class="mt-1 w-full rounded-lg border border-[#DCC8B8] bg-white px-3 py-2 text-xs text-[#5B463C] outline-none focus:border-[#A96746]" />
              </label>
              <div class="grid grid-cols-2 gap-2">
                <label class="block text-[10px] text-[#8B756A]">Date
                  <input v-model="reservation.date" :min="todayDate" type="date" class="mt-1 w-full rounded-lg border border-[#DCC8B8] bg-white px-3 py-2 text-xs text-[#5B463C] outline-none focus:border-[#A96746]" />
                </label>
                <label class="block text-[10px] text-[#8B756A]">Time
                  <input v-model="reservation.time" type="time" class="mt-1 w-full rounded-lg border border-[#DCC8B8] bg-white px-3 py-2 text-xs text-[#5B463C] outline-none focus:border-[#A96746]" />
                </label>
              </div>
              <label class="block text-[10px] text-[#8B756A]">Party size
                <input
                  v-model.number="reservation.partySize"
                  type="number"
                  min="1"
                  :max="selectedChair ? 1 : (selectedTable ? tableCapacity(selectedTable) : 50)"
                  :readonly="!!selectedChair"
                  class="mt-1 w-full rounded-lg border border-[#DCC8B8] bg-white px-3 py-2 text-xs text-[#5B463C] outline-none focus:border-[#A96746] read-only:bg-[#F8EFE7]"
                />
              </label>
              <label class="block text-[10px] text-[#8B756A]">Notes
                <textarea v-model="reservation.notes" rows="3" placeholder="Add notes" class="mt-1 w-full resize-none rounded-lg border border-[#DCC8B8] bg-white px-3 py-2 text-xs text-[#5B463C] outline-none focus:border-[#A96746]" />
              </label>
              <p v-if="reservationDateError" class="text-xs text-[#B31E1E]">{{ reservationDateError }}</p>
              <p v-else-if="reservationError" class="text-xs text-[#B31E1E]">{{ reservationError }}</p>
              <p v-if="reservationNotice" class="text-xs text-[#43805A]">{{ reservationNotice }}</p>
              <button type="button" :disabled="reservationDateIsPast || !selectedTable || !reservation.customerName.trim() || reservation.customerPhone.replace(/\D/g, '').length !== 11 || !reservation.date || submitting" class="w-full rounded-lg bg-[#3B2A24] px-4 py-3 text-xs text-white disabled:cursor-not-allowed disabled:opacity-40" @click="confirmReservation">
                Confirm reservation
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
                    <template v-if="item.status === 'pending' || item.status === 'confirmed'">
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
                        type="button"
                        class="relative z-10 cursor-pointer rounded-md border border-[#C79679] px-3 py-1.5 text-[10px] text-[#8B4F42] disabled:cursor-wait disabled:opacity-50"
                        :disabled="updatingReservation === item.uuid"
                        @pointerdown.stop
                        @click.prevent.stop="updateReservationStatus(item, 'no_show')"
                      >
                        No-show
                      </button>
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
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-[#A96746]">Reservation details</p>
                  <h3 class="mt-1 text-base font-semibold text-[#3B2A24]">{{ selectedWaitlistReservation.customer_name }}</h3>
                </div>
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
      </section>
    </main>
  </div>
</template>
