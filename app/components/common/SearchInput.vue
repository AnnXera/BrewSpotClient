<!-- app/components/common/SearchInput.vue -->
<!-- The app's search bar (Employees tab style): 44px, magnifier on the left, optional clear button.
     Pair it with <DropdownList size="sm" class="font-sans"> filters so the toolbar lines up. -->
<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  placeholder?: string
  ariaLabel?: string
  clearable?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const input = ref<HTMLInputElement | null>(null)

function clear() {
  emit('update:modelValue', '')
  input.value?.focus()
}
</script>

<template>
  <div class="relative w-full min-w-0">
    <Icon
      name="heroicons:magnifying-glass"
      class="w-4 h-4 text-[#7D5A50]/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
    />
    <input
      ref="input"
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      :aria-label="ariaLabel ?? placeholder"
      :class="[
        'w-full h-11 rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] pl-10 font-sans text-sm text-[#3D2B24] placeholder:text-[#7D5A50]/40 hover:border-[#D9C4B8] focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40 transition-colors',
        clearable && modelValue ? 'pr-10' : 'pr-3',
      ]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      v-if="clearable && props.modelValue"
      type="button"
      aria-label="Clear search"
      class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-[#7D5A50]/60 hover:text-[#3D2B24] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]/40"
      @click="clear"
    >
      <Icon name="heroicons:x-mark" class="w-4 h-4" />
    </button>
  </div>
</template>
