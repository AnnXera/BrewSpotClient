<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  searchPlaceholder: string
  addButtonLabel: string
  modelValue?: string
  sortValue?: string
  sortOptions?: { label: string, value: string }[]
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'update:modelValue', value: string): void
  (e: 'update:sortValue', value: string): void
}>()

const isSortOpen = ref(false)

const selectSort = (value: string) => {
  emit('update:sortValue', value)
  isSortOpen.value = false
}
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
    <div class="flex items-center gap-4 w-full sm:w-auto flex-1">
      <!-- Search Input -->
      <div class="relative w-full max-w-[380px]">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Icon name="heroicons:magnifying-glass" class="w-5 h-5 text-[#B4846C]" />
        </div>
        <input 
          :value="modelValue"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          type="text" 
          :placeholder="searchPlaceholder"
          class="w-full bg-[#FDF8F3] border border-[#EEDFC4] text-[#3B1F0E] placeholder-[#B4846C] text-sm rounded-xl focus:ring-[#7D5A50] focus:border-[#7D5A50] block pl-11 p-2.5 outline-none transition-shadow h-[42px]"
        >
      </div>
      
      <!-- Sort Dropdown -->
      <div v-if="sortOptions && sortOptions.length > 0" class="relative">
        <button 
          @click="isSortOpen = !isSortOpen"
          class="h-[42px] px-4 bg-[#FDF8F3] border border-[#EEDFC4] text-[#7D5A50] rounded-xl flex items-center gap-2 hover:bg-[#F5EAD4] transition-colors shrink-0 outline-none"
        >
          <Icon name="heroicons:arrows-up-down" class="w-5 h-5" />
          <span class="text-sm font-semibold">Sort by</span>
        </button>

        <!-- Invisible Overlay -->
        <div 
          v-if="isSortOpen" 
          @click="isSortOpen = false"
          class="fixed inset-0 z-40"
        ></div>

        <!-- Dropdown Menu -->
        <div 
          v-if="isSortOpen"
          class="absolute top-full left-0 mt-2 w-[220px] bg-white border border-[#EEDFC4] rounded-2xl shadow-xl z-50 py-2 flex flex-col overflow-hidden"
        >
          <button
            v-for="opt in sortOptions" 
            :key="opt.value"
            @click="selectSort(opt.value)"
            class="w-full text-left px-5 py-3 text-sm transition-colors"
            :class="opt.value === sortValue ? 'bg-[#F5EAD4] text-[#3B1F0E] font-bold' : 'text-[#7D5A50] hover:bg-[#FDF8F3] font-medium'"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add Button -->
    <button 
      @click="$emit('add')"
      class="w-full sm:w-auto h-[42px] bg-[#7D5A50] text-[#FDF8F3] rounded-xl px-5 py-2 flex items-center justify-center text-sm font-semibold hover:bg-[#6A4B42] transition-colors shrink-0"
    >
      {{ addButtonLabel }}
    </button>
  </div>
</template>
