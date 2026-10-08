<!-- app/components/floor-plan/Inspector.vue -->
<!-- The "Selected object" card: edits one table or element; the page owns the data and the undo stack. -->
<script setup lang="ts">
import type { TableStatus } from '~/services/FloorPlanService'
import { doorAsset, tableAsset } from '~/utils/floorPlanCatalog'

export interface EditorTable {
  uid: string
  uuid: string | null
  table_name: string
  capacity: number
  asset_key: string
  x: number
  y: number
  rotation: number
  status: TableStatus
}

export interface EditorElement {
  uid: string
  uuid: string | null
  category: string
  asset_key: string | null
  label: string | null
  x: number
  y: number
  width: number | null
  height: number | null
  rotation: number
  z_index: number
}

const props = defineProps<{
  table?: EditorTable | null
  element?: EditorElement | null
  maxSeats: number
  statuses: TableStatus[]
  statusBusy?: boolean
  errors?: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'patch', patch: Record<string, any>): void
  (e: 'status', status: TableStatus): void
  (e: 'rotate'): void
  (e: 'duplicate'): void
  (e: 'remove'): void
}>()

const isTable = computed(() => !!props.table)
const title = computed(() => {
  if (props.table) return props.table.table_name || 'Unnamed table'
  const el = props.element
  if (!el) return ''
  if (el.category === 'door') return doorAsset(el.asset_key)?.name ?? 'Door'
  return el.label || (el.category === 'wall' ? 'Wall' : 'Counter')
})
const shapeLabel = computed(() => {
  const a = tableAsset(props.table?.asset_key)
  return a ? `${a.shape === 'square' ? 'Square' : 'Long'} (${a.seats} chairs)` : '-'
})
const drawn = computed(() => props.element?.category === 'wall' || props.element?.category === 'counter')
const seatOptions = computed(() => Array.from({ length: props.maxSeats }, (_, i) => i + 1))
// A status only exists on the server once the layout has been saved.
const canSetStatus = computed(() => !!props.table?.uuid)

const field = 'w-full bg-[#FFFDF9] border border-[#DED4CA] rounded-[6px] px-[9px] py-[9px] text-[12px] text-[#2D2521] outline-none focus:border-[#A96746]'
const btn = 'flex-1 flex items-center justify-center gap-2 bg-[#FFFDF9] border border-[#DED4CA] rounded-[10px] py-[9px] text-[12px] text-[#2D2521] hover:bg-[#F1E9DE] transition-colors'

function num(e: Event) {
  const n = Number((e.target as HTMLInputElement).value)
  return Number.isFinite(n) ? n : null
}
</script>

<template>
  <section class="bg-white border border-[#EDD8CC] rounded-[14px] p-[15px] flex flex-col gap-3" aria-label="Selected object">
    <template v-if="table || element">
      <header>
        <p class="text-[9px] font-bold uppercase tracking-wide text-[#A96746]">Selected object</p>
        <h2 class="font-bold text-[15px] text-[#2D2521] truncate">{{ title }}</h2>
      </header>

      <!-- Table -->
      <template v-if="table">
        <div class="grid grid-cols-2 gap-[10px]">
          <label class="flex flex-col gap-1 text-[10px] text-[#736761]">
            Shape
            <span :class="field" class="flex items-center gap-2 truncate bg-[#F8F3EC]">{{ shapeLabel }}</span>
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-[#736761]">
            Seats
            <select :class="field" :value="table.capacity" @change="emit('patch', { capacity: Number(($event.target as HTMLSelectElement).value) })">
              <option v-for="n in seatOptions" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
        </div>

        <label class="flex flex-col gap-1 text-[10px] text-[#736761]">
          Table Name
          <input
            :class="[field, errors?.table_name ? '!border-[#B31E1E]' : '']"
            type="text"
            maxlength="60"
            :value="table.table_name"
            @input="emit('patch', { table_name: ($event.target as HTMLInputElement).value })"
          >
          <span v-if="errors?.table_name" class="text-[#B31E1E]">{{ errors.table_name }}</span>
        </label>

        <label class="flex flex-col gap-1 text-[10px] text-[#736761]">
          Status
          <select
            :class="field"
            :value="table.status"
            :disabled="!canSetStatus || statusBusy"
            @change="emit('status', ($event.target as HTMLSelectElement).value as TableStatus)"
          >
            <option v-for="s in statuses" :key="s" :value="s" class="capitalize">{{ s }}</option>
          </select>
          <span v-if="!canSetStatus" class="text-[#736761]">Save the layout to set a status.</span>
        </label>
      </template>

      <!-- Element -->
      <template v-else-if="element">
        <label v-if="drawn" class="flex flex-col gap-1 text-[10px] text-[#736761]">
          Label
          <input
            :class="field"
            type="text"
            maxlength="120"
            placeholder="No label"
            :value="element.label ?? ''"
            @input="emit('patch', { label: ($event.target as HTMLInputElement).value || null })"
          >
        </label>
        <div v-if="drawn" class="grid grid-cols-2 gap-[10px]">
          <label class="flex flex-col gap-1 text-[10px] text-[#736761]">
            Width
            <input
              :class="[field, errors?.width ? '!border-[#B31E1E]' : '']"
              type="number" min="1" max="10000"
              :value="element.width ?? ''"
              @change="emit('patch', { width: num($event) })"
            >
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-[#736761]">
            Height
            <input
              :class="[field, errors?.height ? '!border-[#B31E1E]' : '']"
              type="number" min="1" max="10000"
              :value="element.height ?? ''"
              @change="emit('patch', { height: num($event) })"
            >
          </label>
        </div>
        <p v-else class="text-[11px] text-[#736761]">Drag it to a wall to place it, rotate to face the right way.</p>
      </template>

      <div class="flex gap-2">
        <button type="button" :class="btn" @click="emit('rotate')">
          <Icon name="heroicons:arrow-path" class="size-[15px]" />
          Rotate
        </button>
        <button type="button" :class="btn" @click="emit('duplicate')">
          <Icon name="heroicons:document-duplicate" class="size-[15px]" />
          Duplicate
        </button>
      </div>

      <button
        type="button"
        class="flex items-center justify-center gap-2 bg-[#F3DFDC] rounded-[6px] py-[10px] text-[11px] text-[#A85F57] hover:bg-[#EBCFCB] transition-colors"
        @click="emit('remove')"
      >
        <Icon name="heroicons:trash" class="size-[13px]" />
        Remove from floor plan
      </button>
    </template>

    <p v-else class="text-[12px] text-[#736761] py-4 text-center">
      Select a table or fixture on the plan to edit it.
    </p>
  </section>
</template>
