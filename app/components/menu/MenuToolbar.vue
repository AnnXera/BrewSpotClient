<script setup lang="ts">
defineProps<{
  searchPlaceholder: string
  addButtonLabel: string
}>()

defineEmits<{
  (e: 'add'): void
}>()
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
          type="text" 
          :placeholder="searchPlaceholder"
          class="w-full bg-[#FDF8F3] border border-[#EEDFC4] text-[#3B1F0E] placeholder-[#B4846C] text-sm rounded-xl focus:ring-[#7D5A50] focus:border-[#7D5A50] block pl-11 p-2.5 outline-none transition-shadow h-[42px]"
        >
      </div>
      
      <!-- Sort Dropdown placeholder -->
      <button class="h-[42px] px-4 py-2 bg-[#FDF8F3] border border-[#EEDFC4] text-[#7D5A50] rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#F5EAD4] transition-colors shrink-0">
        <Icon name="heroicons:bars-3-bottom-left" class="w-5 h-5" />
        Sort by
      </button>
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
