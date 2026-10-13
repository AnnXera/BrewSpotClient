<!-- app/components/common/ConfirmModal.vue -->
<script setup lang="ts">
import DialogShell from '~/components/common/DialogShell.vue'

defineProps<{
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
  <DialogShell
    :open="show"
    :title="title"
    :message="message"
    :tone="isDestructive ? 'danger' : 'info'"
    :icon="isDestructive ? 'heroicons:exclamation-triangle' : 'heroicons:question-mark-circle'"
    @close="emit('close')"
  >
    <template #actions>
      <button
        type="button"
        data-autofocus
        class="whitespace-nowrap rounded-[10px] px-4 py-[11px] text-[13px] font-semibold bg-transparent text-[#5E4A42] border border-[#DED4CA] hover:bg-[#F1E9DE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] focus-visible:ring-[#7D5A50] transition-colors"
        @click="emit('close')"
      >
        {{ cancelText || 'Cancel' }}
      </button>
      <button
        type="button"
        class="whitespace-nowrap rounded-[10px] px-4 py-[11px] text-[13px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] transition-colors"
        :class="isDestructive
          ? 'bg-[#9E4F47] hover:bg-[#8A423B] focus-visible:ring-[#9E4F47]'
          : 'bg-[#3A2923] hover:bg-[#2C1E19] focus-visible:ring-[#3A2923]'"
        @click="emit('confirm')"
      >
        {{ confirmText || 'Confirm' }}
      </button>
    </template>
  </DialogShell>
</template>
