<!-- app/components/floor-plan/Library.vue -->
<!-- The "Objects" panel: click an item to drop it in the middle of the plan, or drag it to a spot. -->
<script setup lang="ts">
import { DOOR_ASSETS, TABLE_ASSETS, type LibraryCategory, type PlaceSpec } from '~/utils/floorPlanCatalog'

defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ (e: 'add', spec: PlaceSpec): void }>()

const category = ref<LibraryCategory>('tables')
const categories: { value: LibraryCategory; label: string }[] = [
  { value: 'tables', label: 'Tables' },
  { value: 'fixtures', label: 'Fixtures' },
]

interface Entry {
  id: string
  name: string
  note: string
  icon: string
  spec: PlaceSpec
}

const entries = computed<Entry[]>(() => {
  if (category.value === 'tables') {
    return TABLE_ASSETS.map((a) => ({
      id: a.key,
      name: a.name,
      note: `${a.seats} ${a.seats === 1 ? 'seat' : 'seats'}`,
      icon: a.shape === 'square' ? 'heroicons:stop' : 'heroicons:rectangle-stack',
      spec: { kind: 'table', key: a.key },
    }))
  }
  return [
    ...DOOR_ASSETS.map<Entry>((d) => ({
      id: d.key, name: d.name, note: d.note, icon: 'heroicons:arrow-right-end-on-rectangle',
      spec: { kind: 'door', key: d.key },
    })),
    { id: 'counter', name: 'Counter', note: 'Labeled bar', icon: 'heroicons:building-storefront', spec: { kind: 'counter' } },
  ]
})

function onDragStart(e: DragEvent, spec: PlaceSpec) {
  e.dataTransfer?.setData('application/x-floorplan', JSON.stringify(spec))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <section class="bg-[#FFFDF9] border border-[#EDD8CC] rounded-[14px] p-[15px] flex flex-col gap-3">
    <header>
      <h2 class="font-bold text-[14px] text-[#2D2521]">Objects</h2>
      <p class="text-[11px] leading-[1.4] text-[#736761]">Drag an item onto the plan to add it.</p>
    </header>

    <div class="flex gap-2" role="tablist" aria-label="Object categories">
      <button
        v-for="c in categories"
        :key="c.value"
        type="button"
        role="tab"
        :aria-selected="category === c.value"
        class="rounded-full px-[10px] py-[6px] text-[10px] transition-colors"
        :class="category === c.value ? 'bg-[#3A2923] text-white' : 'bg-[#F1E9DE] text-[#736761] hover:bg-[#EADFD0]'"
        @click="category = c.value"
      >
        {{ c.label }}
      </button>
    </div>

    <div class="grid grid-cols-2 gap-[10px]">
      <button
        v-for="e in entries"
        :key="e.id"
        type="button"
        :disabled="disabled"
        :draggable="!disabled"
        class="text-left bg-[#FFFDF9] border border-[#DED4CA] rounded-[10px] p-[11px] flex flex-col gap-2 cursor-grab active:cursor-grabbing hover:border-[#A96746] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="emit('add', e.spec)"
        @dragstart="onDragStart($event, e.spec)"
      >
        <span class="flex items-start justify-between">
          <span class="size-[34px] rounded-[10px] bg-[#F1E9DE] flex items-center justify-center">
            <Icon :name="e.icon" class="size-[17px] text-[#A96746]" />
          </span>
          <Icon name="heroicons:ellipsis-vertical" class="size-4 text-[#B9AEA6]" />
        </span>
        <span>
          <span class="block text-[12px] text-[#2D2521]">{{ e.name }}</span>
          <span class="block text-[10px] text-[#736761]">{{ e.note }}</span>
        </span>
      </button>
    </div>

    <button
      type="button"
      :disabled="disabled"
      :draggable="!disabled"
      class="flex items-center justify-between bg-[#F1E9DE] rounded-[10px] px-[9px] py-3 text-[11px] text-[#2D2521] cursor-grab hover:bg-[#EADFD0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      @click="emit('add', { kind: 'wall' })"
      @dragstart="onDragStart($event, { kind: 'wall' })"
    >
      <span class="flex items-center gap-2">
        <Icon name="heroicons:minus" class="size-4 text-[#A96746]" />
        Wall
      </span>
      <Icon name="heroicons:ellipsis-vertical" class="size-4 text-[#B9AEA6]" />
    </button>
  </section>
</template>
