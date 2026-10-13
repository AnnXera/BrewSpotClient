<!-- app/components/floor-plan/Switcher.vue -->
<!-- Floor picker for cafes with many floors: the current floor on the button, every floor in a listbox.
     Arrow keys, Home/End, Enter and Escape work; a search box appears once the list gets long. -->
<script setup lang="ts">
import type { FloorPlan } from '~/services/FloorPlanService'

const props = defineProps<{ plans: FloorPlan[]; currentUuid?: string | null }>()
const emit = defineEmits<{ (e: 'select', uuid: string): void }>()

const SEARCH_FROM = 7

const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const trigger = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const search = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const pos = reactive({ top: 0, left: 0, minWidth: 0 })
const uid = useId()

const current = computed(() => props.plans.find((p) => p.uuid === props.currentUuid))
const showSearch = computed(() => props.plans.length >= SEARCH_FROM)
const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? props.plans.filter((p) => p.floorplan_name.toLowerCase().includes(q)) : props.plans
})
const optionId = (i: number) => `${uid}-opt-${i}`

async function show() {
  const r = trigger.value?.getBoundingClientRect()
  if (!r) return
  pos.top = r.bottom + 6
  pos.left = r.left
  pos.minWidth = Math.max(r.width, 240)
  query.value = ''
  activeIndex.value = Math.max(0, props.plans.findIndex((p) => p.uuid === props.currentUuid))
  open.value = true
  await nextTick()
  ;(showSearch.value ? search.value : listEl.value)?.focus()
  scrollActiveIntoView()
}

function hide(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function choose(p: FloorPlan) {
  hide()
  if (p.uuid !== props.currentUuid) emit('select', p.uuid)
}

function scrollActiveIntoView() {
  nextTick(() => document.getElementById(optionId(activeIndex.value))?.scrollIntoView({ block: 'nearest' }))
}

function move(delta: number) {
  const n = visible.value.length
  if (!n) return
  activeIndex.value = (activeIndex.value + delta + n) % n
  scrollActiveIntoView()
}

function onKeydown(e: KeyboardEvent) {
  // Keep Delete, Ctrl+Z and the like from reaching the editor behind the list.
  e.stopPropagation()
  if (e.key === 'Escape') {
    e.preventDefault()
    hide()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    move(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    move(-1)
  } else if (e.key === 'Home' && !showSearch.value) {
    e.preventDefault()
    activeIndex.value = 0
    scrollActiveIntoView()
  } else if (e.key === 'End' && !showSearch.value) {
    e.preventDefault()
    activeIndex.value = Math.max(0, visible.value.length - 1)
    scrollActiveIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const p = visible.value[activeIndex.value]
    if (p) choose(p)
  } else if (e.key === 'Tab') {
    hide(false)
  }
}

function onTriggerKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    show()
  } else {
    e.stopPropagation()
  }
}

function onOutside(e: PointerEvent) {
  const t = e.target as Node
  if (!panel.value?.contains(t) && !trigger.value?.contains(t)) hide(false)
}

watch(open, (isOpen) => {
  const fn = isOpen ? 'addEventListener' : 'removeEventListener'
  window[fn]('pointerdown', onOutside as EventListener)
  window[fn]('resize', closeOnMove)
  window[fn]('scroll', closeOnMove, true)
})
// The list is placed once, so it closes when the page moves under it. Scrolling the list itself must not count.
function closeOnMove(e?: Event) {
  if (e?.type === 'scroll' && panel.value?.contains(e.target as Node)) return
  hide(false)
}
watch(query, () => (activeIndex.value = 0))
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onOutside as EventListener)
  window.removeEventListener('resize', closeOnMove)
  window.removeEventListener('scroll', closeOnMove, true)
})
</script>

<template>
  <div class="relative">
    <button
      ref="trigger"
      type="button"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="`${uid}-list`"
      class="flex h-[35px] items-center gap-2 rounded-[8px] border border-[#3D2B24] bg-[#3D2B24] pl-4 pr-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#2C1E19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A96746] focus-visible:ring-offset-2"
      @click="open ? hide() : show()"
      @keydown="onTriggerKeydown"
    >
      <span class="max-w-[200px] truncate">{{ current?.floorplan_name ?? 'Choose a floor' }}</span>
      <span v-if="current?.is_active" class="size-[6px] shrink-0 rounded-full bg-[#4CAF7D]" title="Shown on the register">
        <span class="sr-only">(shown on the register)</span>
      </span>
      <span class="rounded-full bg-white/15 px-1.5 py-px text-[10px] font-medium tabular-nums">{{ plans.length }}</span>
      <Icon name="heroicons:chevron-up-down" class="size-4 shrink-0 opacity-80" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panel"
        class="fixed z-[2000] overflow-hidden rounded-[14px] border border-[#EDD8CC] bg-[#FFFDF9] shadow-[0_20px_40px_-14px_rgba(58,41,35,0.35),0_2px_6px_rgba(58,41,35,0.08)]"
        :style="{ top: `${pos.top}px`, left: `${pos.left}px`, minWidth: `${pos.minWidth}px`, maxWidth: 'min(360px, calc(100vw - 24px))' }"
        @keydown="onKeydown"
      >
        <div v-if="showSearch" class="border-b border-[#F1E6DA] p-2">
          <input
            ref="search"
            v-model="query"
            type="text"
            placeholder="Find a floor"
            aria-label="Find a floor"
            role="combobox"
            aria-expanded="true"
            :aria-controls="`${uid}-list`"
            :aria-activedescendant="visible.length ? optionId(activeIndex) : undefined"
            class="w-full rounded-[8px] border border-[#DED4CA] bg-white px-3 py-2 text-[12px] text-[#2D2521] outline-none placeholder:text-[#A39891] focus:border-[#A96746]"
          >
        </div>

        <ul
          :id="`${uid}-list`"
          ref="listEl"
          role="listbox"
          aria-label="Floors"
          :tabindex="showSearch ? -1 : 0"
          :aria-activedescendant="visible.length ? optionId(activeIndex) : undefined"
          class="max-h-[288px] overflow-auto p-1.5 outline-none"
        >
          <li
            v-for="(p, i) in visible"
            :id="optionId(i)"
            :key="p.uuid"
            role="option"
            :aria-selected="p.uuid === currentUuid"
            class="flex cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 transition-colors"
            :class="i === activeIndex ? 'bg-[#F1E9DE]' : ''"
            @pointermove="activeIndex = i"
            @click="choose(p)"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[13px] text-[#2D2521]" :class="p.uuid === currentUuid ? 'font-semibold' : ''">{{ p.floorplan_name }}</span>
              <span class="block text-[11px] text-[#736761]">
                {{ p.tables_count ?? 0 }} {{ p.tables_count === 1 ? 'table' : 'tables' }}
                <span class="mx-1 text-[#C9BDB3]" aria-hidden="true">/</span>
                {{ p.is_active ? 'On the register' : 'Not on the register' }}
              </span>
            </span>
            <span v-if="p.is_active" class="size-[7px] shrink-0 rounded-full bg-[#4CAF7D]" aria-hidden="true" />
            <Icon v-if="p.uuid === currentUuid" name="heroicons:check" class="size-4 shrink-0 text-[#A96746]" />
          </li>
          <li v-if="!visible.length" class="px-3 py-4 text-center text-[12px] text-[#736761]" role="presentation">
            No floor matches "{{ query }}".
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>
