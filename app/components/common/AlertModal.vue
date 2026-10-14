<!-- app/components/common/AlertModal.vue -->
<script setup lang="ts">
import DialogShell from '~/components/common/DialogShell.vue'

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
  <DialogShell
    :open="show"
    :title="title"
    :message="message"
    tone="warn"
    icon="heroicons:exclamation-triangle"
    @close="emit('close')"
  >
    <template #actions>
      <button
        type="button"
        data-autofocus
        class="whitespace-nowrap rounded-[10px] px-4 py-[11px] text-[13px] font-semibold bg-[#3A2923] text-white hover:bg-[#2C1E19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] focus-visible:ring-[#3A2923] transition-colors"
        @click="emit('close')"
      >
        {{ buttonText || 'OK' }}
      </button>
    </template>
  </DialogShell>
</template>
