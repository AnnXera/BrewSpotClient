<!-- app/components/common/ConfirmModal.vue -->
<script setup lang="ts">
const props = defineProps<{
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')"></div>
    <div class="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl p-6 text-center">
      <h3 class="text-xl font-display font-bold text-[#3B1F0E] mb-2">{{ title }}</h3>
      <p class="text-[#7D5A50] mb-6 text-sm leading-relaxed">{{ message }}</p>
      <div class="flex gap-3">
        <button
          type="button"
          class="flex-1 py-3 rounded-xl font-bold text-[#7D5A50] bg-[#F5F5F5] hover:bg-[#EEDFC4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/40"
          @click="emit('close')"
        >
          {{ cancelText || 'Cancel' }}
        </button>
        <button
          type="button"
          :class="[
            'flex-1 py-3 rounded-xl font-bold text-white transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
            isDestructive 
              ? 'bg-[#D9534F] hover:bg-red-700 focus-visible:ring-red-500/40' 
              : 'bg-[#3B1F0E] hover:bg-[#2A160A] focus-visible:ring-[#3B1F0E]/40'
          ]"
          @click="emit('confirm')"
        >
          {{ confirmText || 'Confirm' }}
        </button>
      </div>
    </div>
  </div>
</template>
