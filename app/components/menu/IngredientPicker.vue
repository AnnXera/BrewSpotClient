<!-- app/components/menu/IngredientPicker.vue -->
<!-- Recipe ingredient field: type to search the cafe's ingredients, or keep typing to add a new one. -->
<script setup lang="ts">
import type { Ingredient } from '~/services/MenuService'

const props = defineProps<{
  name: string
  ingredients: Ingredient[]
  // Normalized names already used in other rows of this recipe (hidden from suggestions).
  usedNames: string[]
  invalid?: boolean
}>()

const emit = defineEmits<{
  'update:name': [value: string]
  // The matching existing ingredient, or null when the name is new.
  pick: [ingredient: Ingredient | null]
  // Enter pressed with no suggestion highlighted (the modal uses it to add a row).
  enter: []
}>()

const MAX_SUGGESTIONS = 8

const inputEl = ref<HTMLInputElement | null>(null)
const open = ref(false)
const highlighted = ref(-1)

// Same rule as the server's Ingredient::normalize().
function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

const query = computed(() => normalize(props.name))

const exactMatch = computed(() =>
  props.ingredients.find(i => normalize(i.name) === query.value) ?? null
)

const suggestions = computed(() => {
  const used = new Set(props.usedNames)
  return props.ingredients
    .filter(i => !used.has(normalize(i.name)))
    .filter(i => !query.value || normalize(i.name).includes(query.value))
    .slice(0, MAX_SUGGESTIONS)
})

const showAddNew = computed(() =>
  query.value.length > 0 && !exactMatch.value && !props.usedNames.includes(query.value)
)

const hasOptions = computed(() => suggestions.value.length > 0 || showAddNew.value)

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:name', value)
  open.value = true
  highlighted.value = -1

  const match = props.ingredients.find(i => normalize(i.name) === normalize(value)) ?? null
  emit('pick', match)
}

function choose(ingredient: Ingredient) {
  emit('update:name', ingredient.name)
  emit('pick', ingredient)
  close()
}

function close() {
  open.value = false
  highlighted.value = -1
}

function onKeydown(event: KeyboardEvent) {
  const count = suggestions.value.length

  if (event.key === 'ArrowDown' && count) {
    event.preventDefault()
    open.value = true
    highlighted.value = (highlighted.value + 1) % count
  } else if (event.key === 'ArrowUp' && count) {
    event.preventDefault()
    open.value = true
    highlighted.value = highlighted.value <= 0 ? count - 1 : highlighted.value - 1
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const pick = suggestions.value[highlighted.value]
    if (open.value && pick) {
      choose(pick)
    } else {
      close()
      emit('enter')
    }
  } else if (event.key === 'Escape' && open.value) {
    event.stopPropagation()
    close()
  }
}

defineExpose({ focus: () => inputEl.value?.focus() })
</script>

<template>
  <div class="relative w-full">
    <input
      ref="inputEl"
      :value="name"
      type="text"
      placeholder="Search or add an ingredient"
      autocomplete="off"
      role="combobox"
      :aria-expanded="open && hasOptions"
      :class="[
        'w-full bg-[#fef8f0] border text-[#3B1F0E] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent',
        invalid ? 'border-red-500 focus:ring-red-500' : 'border-[#EEDFC4] focus:ring-[#B4846C]'
      ]"
      @focus="open = true"
      @blur="close"
      @input="onInput"
      @keydown="onKeydown"
    />

    <!-- mousedown.prevent keeps focus in the input so blur doesn't close the list before the click lands -->
    <ul
      v-if="open && hasOptions"
      role="listbox"
      class="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-[#EEDFC4] rounded-xl shadow-lg py-1"
    >
      <li
        v-for="(ingredient, i) in suggestions"
        :key="ingredient.uuid"
        role="option"
        :aria-selected="i === highlighted"
        class="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer text-sm"
        :class="i === highlighted ? 'bg-[#FBF2E1]' : 'hover:bg-[#fef8f0]'"
        @mousedown.prevent="choose(ingredient)"
        @mouseenter="highlighted = i"
      >
        <span class="text-[#3B1F0E] truncate">{{ ingredient.name }}</span>
        <span class="text-xs text-[#B4846C] shrink-0">{{ ingredient.unit }}</span>
      </li>

      <li
        v-if="showAddNew"
        class="flex items-center gap-2 px-4 py-2.5 text-sm text-[#7D5A50] border-t border-[#EEDFC4] first:border-t-0"
        @mousedown.prevent="close"
      >
        <Icon name="heroicons:plus-circle" class="w-4 h-4 shrink-0" />
        <span class="truncate">Add "{{ name.trim() }}" as a new ingredient</span>
      </li>
    </ul>
  </div>
</template>
