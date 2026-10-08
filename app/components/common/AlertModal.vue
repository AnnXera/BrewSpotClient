<!-- app/components/common/AlertModal.vue -->
<script setup lang="ts">
defineProps<{
  show: boolean
  title: string
  message: string
  buttonText?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[70] flex items-center justify-center p-4"
    role="alertdialog"
    aria-modal="true"
    @keydown.esc="emit('close')"
  >
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')"></div>
    <div class="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl p-6 text-center">
      <div class="w-12 h-12 rounded-full bg-[#FDE8E8] text-[#D9534F] flex items-center justify-center mx-auto mb-4">
        <Icon name="heroicons:exclamation-triangle" class="w-6 h-6" />
      </div>
      <h3 class="text-xl font-display font-bold text-[#3B1F0E] mb-2">{{ title }}</h3>
      <p class="text-[#7D5A50] mb-6 text-sm leading-relaxed">{{ message }}</p>
      <button
        type="button"
        autofocus
        class="w-full py-3 rounded-xl font-bold text-white bg-[#3B1F0E] hover:bg-[#2A160A] transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-[#3B1F0E]/40"
        @click="emit('close')"
      >
        {{ buttonText || 'OK' }}
      </button>
    </div>
  </div>
</template>
