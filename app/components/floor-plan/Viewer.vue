<!-- app/components/floor-plan/Viewer.vue -->
<!-- Read-only floor plans of one branch for the owner. Managers build them under Floor Plan;
     this shows every floor as saved, with each table's current status. -->
<script setup lang="ts">
import type { PlanLock } from '~/utils/planLock'
import type { FloorPlan, FloorPlanElement, FloorPlanTable as TableRow } from '~/services/FloorPlanService'
import { tableAsset, doorAsset } from '~/utils/floorPlanCatalog'
import FloorPlanTable from '~/components/floor-plan/Table.vue'
import FloorPlanSwitcher from '~/components/floor-plan/Switcher.vue'

const props = defineProps<{ branchUuid: string }>()

const service = useFloorPlanService('owner')

const DEFAULT_CANVAS = { width: 760, height: 640 }
const GRID = 20

const plans = ref<FloorPlan[]>([])
const plan = ref<FloorPlan | null>(null)
const loading = ref(true)
const switching = ref(false)
// API 403: the plan lacks reservations, or the subscription has expired.
const planLock = ref<PlanLock | null>(null)
const errorMessage = ref('')

const manyFloors = computed(() => plans.value.length >= 4)
const canvasW = computed(() => plan.value?.canvas_width ?? DEFAULT_CANVAS.width)
const canvasH = computed(() => plan.value?.canvas_height ?? DEFAULT_CANVAS.height)

function failure(e: any, fallback: string) {
  planLock.value = planLockFromError(e)
  errorMessage.value = planLock.value ? '' : e?.data?.message ?? fallback
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  planLock.value = null
  try {
    const res = await service.list(props.branchUuid)
    plans.value = res.floor_plans
    const target = res.floor_plans.find((p) => p.uuid === plan.value?.uuid)
      ?? res.floor_plans.find((p) => p.is_active)
      ?? res.floor_plans[0]
    plan.value = target ? (await service.show(props.branchUuid, target.uuid)).floor_plan : null
  } catch (e) {
    failure(e, 'The floor plans could not be loaded. Check your connection and try again.')
  } finally {
    loading.value = false
  }
}

async function selectPlan(uuid: string) {
  if (uuid === plan.value?.uuid || switching.value) return
  switching.value = true
  try {
    plan.value = (await service.show(props.branchUuid, uuid)).floor_plan
    zoom.value = 1
  } catch (e) {
    failure(e, 'That floor could not be opened. Try again.')
  } finally {
    switching.value = false
  }
}

watch(() => props.branchUuid, load)
onMounted(load)

// ── Canvas: fit the floor to the card's width, then zoom from there ──────
const viewport = ref<HTMLElement | null>(null)
const fitScale = ref(1)
const zoom = ref(1)
const scale = computed(() => fitScale.value * zoom.value)
let resizeObserver: ResizeObserver | undefined

function fit() {
  const el = viewport.value
  if (!el) return
  fitScale.value = Math.min(1, Math.max(0.3, (el.clientWidth - 36) / canvasW.value))
}

function zoomBy(factor: number) {
  zoom.value = Math.min(3, Math.max(0.5, Math.round(zoom.value * factor * 100) / 100))
}

watch([plan, viewport], () => nextTick(fit))

onMounted(() => {
  resizeObserver = new ResizeObserver(fit)
  watch(viewport, (el, old) => {
    if (old) resizeObserver?.unobserve(old)
    if (el) resizeObserver?.observe(el)
  }, { immediate: true })
})
onBeforeUnmount(() => resizeObserver?.disconnect())

function itemSize(kind: 'table' | 'element', item: TableRow | FloorPlanElement) {
  if (kind === 'table') {
    const a = tableAsset(item.asset_key)
    return { w: a?.w ?? 112, h: a?.h ?? 90 }
  }
  const e = item as FloorPlanElement
  if (e.category === 'door') {
    const d = doorAsset(e.asset_key)
    return { w: d?.w ?? 64, h: d?.h ?? 64 }
  }
  return { w: e.width ?? 100, h: e.height ?? 10 }
}

function itemStyle(kind: 'table' | 'element', item: TableRow | FloorPlanElement, z: number) {
  const { w, h } = itemSize(kind, item)
  return {
    left: `${item.x_location}px`,
    top: `${item.y_location}px`,
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

const doorSrc = (key: string | null) => doorAsset(key)?.src

const tableCounts = computed(() => {
  const c = { available: 0, reserved: 0, occupied: 0, cleaning: 0 }
  for (const t of plan.value?.tables ?? []) c[t.status] = (c[t.status] ?? 0) + 1
  return c
})

const seats = computed(() => (plan.value?.tables ?? []).reduce((sum, t) => sum + t.capacity, 0))
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-3">
    <div class="size-9 rounded-full border-2 border-[#EDD8CC] border-t-[#7D5A50] animate-spin" />
    <p class="text-xs font-medium text-[#8C6E63] animate-pulse">Loading floor plans...</p>
  </div>

  <!-- Reservations not on the plan, or the subscription has expired -->
  <SubscriptionLockedState
    v-else-if="planLock"
    :lock="planLock"
    description="Floor plans come with the Reservations feature."
  />

  <!-- Error -->
  <div v-else-if="errorMessage" class="bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 flex items-center gap-3">
    <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0" />
    <span class="text-sm font-medium">{{ errorMessage }}</span>
    <button class="ml-auto text-sm font-bold underline hover:text-red-900" @click="load">Retry</button>
  </div>

  <!-- No floors yet -->
  <div v-else-if="!plan" class="bg-white border border-[#EDD8CC] rounded-2xl p-8 shadow-sm text-center">
    <Icon name="heroicons:map" class="size-8 text-[#A96746] mx-auto" />
    <p class="mt-3 text-base font-semibold text-[#3D2B24]">No floor plans yet</p>
    <p class="mt-1 text-sm text-[#8C6E63] max-w-[44ch] mx-auto">
      This branch's manager can create floor plans under Floor Plan. They show up here once saved.
    </p>
  </div>

  <section v-else class="bg-white border border-[#EDD8CC] rounded-2xl shadow-sm overflow-hidden">
    <!-- Floors and summary -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-[18px] py-3 border-b border-[#F4E6DE]">
      <div class="flex flex-wrap items-center gap-[6px]" :role="manyFloors ? undefined : 'tablist'" :aria-label="manyFloors ? undefined : 'Floor plans'">
        <FloorPlanSwitcher v-if="manyFloors" :plans="plans" :current-uuid="plan.uuid" @select="selectPlan" />
        <button
          v-for="p in (manyFloors ? [] : plans)"
          :key="p.uuid"
          type="button"
          role="tab"
          :aria-selected="p.uuid === plan.uuid"
          class="flex h-[35px] items-center gap-2 rounded-[8px] border px-4 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A96746] focus-visible:ring-offset-2"
          :class="p.uuid === plan.uuid ? 'border-[#3D2B24] bg-[#3D2B24] text-white' : 'border-[#DED4CA] bg-white text-[#3D2B24] hover:bg-[#FFF8EA]'"
          @click="selectPlan(p.uuid)"
        >
          {{ p.floorplan_name }}
          <span v-if="p.is_active" class="size-[6px] rounded-full bg-[#4CAF7D]" title="Shown on the register">
            <span class="sr-only">(shown on the register)</span>
          </span>
        </button>
      </div>

      <p class="text-[12px] text-[#8C6E63]">
        <span class="font-semibold text-[#3D2B24]">{{ plan.is_active ? 'On the register' : 'Not on the register' }}</span>
        <span class="mx-1.5 text-[#C9BDB3]" aria-hidden="true">/</span>
        {{ plan.tables?.length ?? 0 }} {{ plan.tables?.length === 1 ? 'table' : 'tables' }}, {{ seats }} seats
      </p>
    </div>

    <!-- Canvas -->
    <div class="relative">
      <div
        ref="viewport"
        class="overflow-auto p-[18px] bg-white transition-opacity"
        :class="switching ? 'opacity-60' : ''"
        :style="{ height: `min(${canvasH * fitScale + 36}px, 70vh)` }"
      >
        <div class="mx-auto" :style="{ width: `${canvasW * scale}px`, height: `${canvasH * scale}px` }">
          <div
            class="relative isolate origin-top-left rounded-[10px] border border-[#F4E6DE] bg-[#FFFDF9] [background-image:radial-gradient(#EADFD0_1px,transparent_1px)] select-none"
            :style="{ width: `${canvasW}px`, height: `${canvasH}px`, transform: scale === 1 ? undefined : `scale(${scale})`, backgroundSize: `${GRID}px ${GRID}px` }"
          >
            <div
              v-for="(el, i) in plan.elements ?? []"
              :key="el.uuid"
              class="absolute pointer-events-none"
              :style="itemStyle('element', el, el.z_index || i + 1)"
            >
              <img v-if="el.category === 'door'" :src="doorSrc(el.asset_key)" alt="Door" class="size-full" draggable="false">
              <div
                v-else-if="el.category === 'counter'"
                class="size-full rounded-[16px] bg-[#3D2B24] text-[#EDD8CC] font-display font-semibold text-[16px] flex items-center justify-center px-3 overflow-hidden whitespace-nowrap"
              >
                {{ el.label }}
              </div>
              <div
                v-else
                class="absolute inset-y-0 bg-[#D9D9D9]"
                :style="{ left: `${-(el.height ?? 10) / 2}px`, right: `${-(el.height ?? 10) / 2}px` }"
              />
            </div>

            <div
              v-for="t in plan.tables ?? []"
              :key="t.uuid"
              class="absolute"
              :style="itemStyle('table', t, 1000)"
              :title="`${t.table_name} (${t.capacity} seats, ${t.status})`"
            >
              <FloorPlanTable
                :asset-key="t.asset_key ?? 'table_sqr_4'"
                :label="tableLabel(t.table_name)"
                :status="t.status"
                class="pointer-events-none"
              />
            </div>

            <p
              v-if="!plan.tables?.length && !plan.elements?.length"
              class="absolute inset-0 flex items-center justify-center text-[13px] text-[#9E7060]"
            >
              This floor has nothing placed on it yet.
            </p>
          </div>
        </div>
      </div>

      <!-- Zoom -->
      <div class="absolute bottom-6 right-6 z-10 h-[35px] rounded-[8px] border border-[#DED4CA] bg-[#FFFDF9]/95 shadow-[0_2px_8px_rgba(58,41,35,0.12)] flex items-center text-[12px] text-[#2D2521]" role="group" aria-label="Zoom">
        <button type="button" class="grid h-full w-[32px] place-items-center hover:bg-[#F1E9DE] rounded-l-[8px] disabled:opacity-40" aria-label="Zoom out" :disabled="zoom <= 0.5" @click="zoomBy(1 / 1.2)">
          <Icon name="heroicons:minus" class="size-4" />
        </button>
        <button type="button" class="h-full min-w-[48px] px-2 font-semibold tabular-nums hover:bg-[#F1E9DE]" aria-label="Fit floor to width" @click="zoom = 1">
          {{ zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%` }}
        </button>
        <button type="button" class="grid h-full w-[32px] place-items-center hover:bg-[#F1E9DE] rounded-r-[8px] disabled:opacity-40" aria-label="Zoom in" :disabled="zoom >= 3" @click="zoomBy(1.2)">
          <Icon name="heroicons:plus" class="size-4" />
        </button>
      </div>
    </div>

    <!-- Table states -->
    <ul class="flex flex-wrap items-center gap-x-5 gap-y-1 px-[18px] py-3 border-t border-[#F4E6DE] text-[12px] text-[#5B463C]" aria-label="Table states">
      <li class="flex items-center gap-1.5"><span class="size-3 rounded border-[1.5px] border-[#7D5A50] bg-white" />Available <b class="tabular-nums font-semibold">{{ tableCounts.available }}</b></li>
      <li class="flex items-center gap-1.5"><span class="size-3 rounded border-[1.5px] border-[#B4846C] bg-[#F4E7DA]" />Reserved <b class="tabular-nums font-semibold">{{ tableCounts.reserved }}</b></li>
      <li class="flex items-center gap-1.5"><span class="size-3 rounded border-[1.5px] border-[#BDBDBD] bg-[#D9D9D9]" />Occupied <b class="tabular-nums font-semibold">{{ tableCounts.occupied }}</b></li>
      <li v-if="tableCounts.cleaning" class="flex items-center gap-1.5"><span class="size-3 rounded border-[1.5px] border-[#CFCAC6] bg-[#EFEDEB]" />Cleaning <b class="tabular-nums font-semibold">{{ tableCounts.cleaning }}</b></li>
      <li class="ml-auto text-[#8C6E63]">View only. The branch manager edits floor plans.</li>
    </ul>
  </section>
</template>
