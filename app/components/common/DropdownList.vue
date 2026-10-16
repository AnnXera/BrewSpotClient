<!-- app/components/common/DropdownList.vue -->
<!-- The app's one dropdown: a select whose open list looks like the recipe's ingredient suggestions (IngredientPicker). -->
<script setup lang="ts" generic="T extends string | number | boolean | null">
import { ref, computed, onMounted, onUnmounted, useId } from 'vue'

export interface DropdownListOption<V> {
  value: V
  label: string
  hint?: string // small text on the right, like the ingredient's unit
}

const props = withDefaults(defineProps<{
  modelValue: T
  options: DropdownListOption<T>[]
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  icon?: string // leading icon inside the button
  size?: 'md' | 'sm' | 'xs' // md: 48px form field, sm: 44px toolbar/compact field, xs: 36px side panel
  bare?: boolean // no box of its own, for a dropdown sitting inside a styled wrapper (a sort pill, a phone prefix)
  white?: boolean // plain white box with a gray border, to match plain form inputs (e.g. registration)
  align?: 'left' | 'right' // which edge the open list lines up with
  title?: string
  ariaLabel?: string
}>(), {
  size: 'md',
  align: 'left'
})

const emit = defineEmits<{
  'update:modelValue': [value: T]
  change: [value: T]
}>()

const LIST_MAX_HEIGHT = 256 // max-h-64

const root = ref<HTMLElement | null>(null)
const button = ref<HTMLButtonElement | null>(null)
const open = ref(false)
const openUp = ref(false)
const highlighted = ref(-1)
const listId = useId()

const selected = computed(() => props.options.find(o => o.value === props.modelValue) ?? null)

const sizeClass = computed(() => ({
  md: 'py-3',
  sm: 'h-11 text-sm',
  xs: 'h-9 text-xs'
}[props.size]))

// The open list is teleported to <body> with fixed positioning, so a card or modal
// with overflow hidden/auto can't clip it; it is placed against the button here.
const list = ref<HTMLElement | null>(null)
const listStyle = ref<Record<string, string>>({})

function place() {
  const rect = root.value?.getBoundingClientRect()
  if (!rect) return
  const vh = window.innerHeight
  // Open upward when there is no room below, e.g. a field near the bottom of a modal.
  openUp.value = vh - rect.bottom < LIST_MAX_HEIGHT && rect.top > vh - rect.bottom
  // A bare dropdown sits inside a padded wrapper; clear that padding so the list hangs below the wrapper.
  const gap = props.bare ? 14 : 4
  const style: Record<string, string> = openUp.value
    ? { bottom: `${vh - rect.top + gap}px` }
    : { top: `${rect.bottom + gap}px` }
  if (props.bare) {
    style.minWidth = `${rect.width}px`
    if (props.align === 'right') style.right = `${document.documentElement.clientWidth - rect.right}px`
    else style.left = `${rect.left}px`
  } else {
    style.left = `${rect.left}px`
    style.width = `${rect.width}px`
  }
  listStyle.value = style
}

function onViewportChange() {
  if (open.value) place()
}

function openList() {
  if (props.disabled) return
  place()
  open.value = true
  highlighted.value = Math.max(0, props.options.findIndex(o => o.value === props.modelValue))
}

function close() {
  open.value = false
  highlighted.value = -1
}

function choose(option: DropdownListOption<T>) {
  const changed = option.value !== props.modelValue
  emit('update:modelValue', option.value)
  if (changed) emit('change', option.value)
  close()
  button.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  const count = props.options.length
  if (!count || props.disabled) return

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) return openList()
    const step = event.key === 'ArrowDown' ? 1 : -1
    highlighted.value = (highlighted.value + step + count) % count
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const pick = props.options[highlighted.value]
    if (open.value && pick) choose(pick)
    else openList()
  } else if (event.key === 'Escape' && open.value) {
    event.stopPropagation()
    close()
  } else if (event.key === 'Tab') {
    close()
  }
}

function onDocumentPointer(event: PointerEvent) {
  const target = event.target as Node
  if (open.value && !root.value?.contains(target) && !list.value?.contains(target)) close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointer)
  // Capture scrolls of any ancestor (a modal body, a table card), not just the window.
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointer)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
})

defineExpose({ focus: () => button.value?.focus() })
</script>

<template>
  <div ref="root" :class="['relative', bare ? 'inline-block' : 'w-full']">
    <button
      ref="button"
      type="button"
      role="combobox"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      :disabled="disabled"
      :title="title"
      :class="[
        // block: an inline button would sit on the text baseline and leave a gap below it,
        // pushing the label above the chevron in the bare (sort pill) style.
        'block w-full text-left focus:outline-none transition-shadow disabled:opacity-60 disabled:cursor-not-allowed',
        bare
          ? 'bg-transparent text-inherit pr-6 rounded-md focus-visible:ring-2 focus-visible:ring-[#B4846C]'
          : [
              white
                ? 'bg-white border rounded-md pr-10 focus:ring-2'
                : 'bg-[#fef8f0] border rounded-xl pr-10 focus:ring-2 focus:border-transparent',
              icon ? 'pl-10' : (size === 'xs' || white ? 'pl-3' : 'pl-4'),
              sizeClass,
              invalid
                ? 'border-red-500 focus:ring-red-500'
                : white
                  ? 'border-gray-300 focus:border-[#7B5A50] focus:ring-[#7B5A50]/20'
                  : 'border-[#EEDFC4] focus:ring-[#B4846C]',
              white
                ? (selected ? 'text-[#2d201b]' : 'text-gray-400')
                : (selected ? 'text-[#3B1F0E]' : 'text-[#B4846C]/70')
            ]
      ]"
      @click="open ? close() : openList()"
      @keydown="onKeydown"
    >
      <span v-if="icon && !bare" class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7D5A50]">
        <Icon :name="icon" class="w-4 h-4" />
      </span>
      <span class="block truncate">{{ selected?.label ?? placeholder ?? 'Select' }}</span>
      <span :class="['pointer-events-none absolute inset-y-0 right-0 flex items-center text-[#B4846C]', bare ? 'pr-0' : 'pr-3']">
        <Icon
          name="heroicons:chevron-down"
          :class="[bare || size === 'xs' ? 'w-4 h-4' : 'w-5 h-5', 'transition-transform', open ? 'rotate-180' : '']"
        />
      </span>
    </button>

    <Teleport to="body">
      <ul
        v-if="open"
        ref="list"
        :id="listId"
        role="listbox"
        :style="listStyle"
        :class="[
          'fixed z-[100] max-h-64 overflow-y-auto bg-white border border-[#EEDFC4] rounded-xl shadow-lg py-1 font-sans font-normal',
          bare ? 'w-max max-w-xs' : ''
        ]"
      >
        <li
          v-for="(option, i) in options"
          :key="String(option.value)"
          role="option"
          :aria-selected="option.value === modelValue"
          class="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer text-sm"
          :class="i === highlighted ? 'bg-[#FBF2E1]' : 'hover:bg-[#fef8f0]'"
          @mousedown.prevent="choose(option)"
          @mouseenter="highlighted = i"
        >
          <span class="truncate" :class="option.value === modelValue ? 'font-bold text-[#3B1F0E]' : 'text-[#3B1F0E]'">{{ option.label }}</span>
          <Icon v-if="option.value === modelValue" name="heroicons:check" class="w-4 h-4 shrink-0 text-[#B4846C]" />
          <span v-else-if="option.hint" class="text-xs text-[#B4846C] shrink-0">{{ option.hint }}</span>
        </li>
      </ul>
    </Teleport>
  </div>
</template>
