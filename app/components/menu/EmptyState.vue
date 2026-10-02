<script setup lang="ts">
defineProps<{
  title: string
  message: string
  actionLabel: string
  icon?: string
}>()

defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-[#EEDFC4] shadow-sm">
    <div class="w-24 h-24 mb-6 rounded-full bg-[#FBF2E1] flex items-center justify-center text-[#B4846C]">
      <Icon :name="icon || 'heroicons:squares-2x2'" class="w-12 h-12" />
    </div>
    
    <h3 class="font-display text-2xl font-bold text-[#3B1F0E] mb-2">
      {{ title }}
    </h3>
    
    <p class="font-sans text-base text-[#7D5A50] max-w-md mx-auto mb-8">
      {{ message }}
    </p>
    
    <button 
      @click="$emit('action')"
      class="h-12 bg-[#3B1F0E] text-white rounded-xl px-8 flex items-center justify-center gap-2 text-base font-semibold hover:bg-[#7D5A50] transition-colors shadow-sm"
    >
      <Icon name="heroicons:plus" class="w-5 h-5" />
      {{ actionLabel }}
    </button>
  </div>
</template>
