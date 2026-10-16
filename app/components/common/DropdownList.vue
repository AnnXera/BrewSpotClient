<!-- app/components/common/SelectMenu.vue -->
<!-- A select whose open list looks like the recipe's ingredient suggestions (IngredientPicker). -->
<script setup lang="ts" generic="T extends string | number | null">
import { ref, computed, onMounted, onUnmounted, useId } from 'vue'

export interface SelectMenuOption<V> {
  value: V
  label: string
  hint?: string // small text on the right, like the ingredient's unit
}

const props = defineProps<{
  modelValue: T
  options: SelectMenuOption<T>[]
  placeholder?: string
  invalid?: boolean
  icon?: string // leading icon inside the button
  dense?: boolean // 44px tall, to line up with compact inputs
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

const root = ref<HTMLElement | null>(null)
const button = ref<HTMLButtonElement | null>(null)
const open = ref(false)
const highlighted = ref(-1)
const listId = useId()

const selected = computed(() => props.options.find(o => o.value === props.modelValue) ?? null)

function openList() {
  open.value = true
  highlighted.value = Math.max(0, props.options.findIndex(o => o.value === props.modelValue))
}

function close() {
  open.value = false
  highlighted.value = -1
}

function choose(option: SelectMenuOption<T>) {
  emit('update:modelValue', option.value)
  close()
  button.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  const count = props.options.length
  if (!count) return

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
  if (open.value && !root.value?.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointer))
onUnmounted(() => document.removeEventListener('pointerdown', onDocumentPointer))
</script>

<template>
  <div ref="root" class="relative w-full">
    <button
      ref="button"
      type="button"
      role="combobox"
      :aria-expanded="open"
      :aria-controls="listId"
      aria-haspopup="listbox"
      :class="[
        'w-full bg-[#fef8f0] border text-left rounded-xl pr-10 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow',
        icon ? 'pl-10' : 'pl-4',
        dense ? 'h-11 text-sm' : 'py-3',
        invalid ? 'border-red-500 focus:ring-red-500' : 'border-[#EEDFC4] focus:ring-[#B4846C]',
        selected ? 'text-[#3B1F0E]' : 'text-[#B4846C]/70'
      ]"
      @click="open ? close() : openList()"
      @keydown="onKeydown"
    >
      <span v-if="icon" class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7D5A50]">
        <Icon :name="icon" class="w-4 h-4" />
      </span>
      <span class="block truncate">{{ selected?.label ?? placeholder ?? 'Select' }}</span>
      <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#B4846C]">
        <Icon name="heroicons:chevron-down" class="w-5 h-5 transition-transform" :class="open ? 'rotate-180' : ''" />
      </span>
    </button>

    <ul
      v-if="open"
      :id="listId"
      role="listbox"
      class="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-[#EEDFC4] rounded-xl shadow-lg py-1"
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
  </div>
</template>
