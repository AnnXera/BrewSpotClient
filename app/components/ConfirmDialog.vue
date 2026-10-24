<!-- components/ConfirmDialog.vue -->
<script setup lang="ts">
import DialogShell from '~/components/common/DialogShell.vue'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** Disables both actions while the confirmed work is in flight. */
  loading?: boolean
  /** Holds back only the confirm action, e.g. until terms are accepted. */
  confirmDisabled?: boolean
}

withDefaults(defineProps<Props>(), {
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false,
  loading: false,
  confirmDisabled: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <!-- Focus starts on the safe action, not the destructive one. -->
  <DialogShell
    :open="open"
    :title="title"
    :message="message"
    :tone="danger ? 'danger' : 'info'"
    :icon="danger ? 'heroicons:exclamation-triangle' : 'heroicons:question-mark-circle'"
    :busy="loading"
    @close="emit('cancel')"
  >
    <slot />

    <template #actions>
      <button
        type="button"
        data-autofocus
        :disabled="loading"
        class="whitespace-nowrap rounded-[10px] px-4 py-[11px] text-[13px] font-semibold bg-transparent text-[#5E4A42] border border-[#DED4CA] hover:bg-[#F1E9DE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] focus-visible:ring-[#7D5A50] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        @click="emit('cancel')"
      >
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        :disabled="loading || confirmDisabled"
        class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] px-4 py-[11px] text-[13px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        :class="danger
          ? 'bg-[#9E4F47] hover:bg-[#8A423B] focus-visible:ring-[#9E4F47]'
          : 'bg-[#3A2923] hover:bg-[#2C1E19] focus-visible:ring-[#3A2923]'"
        @click="emit('confirm')"
      >
        <Icon v-if="loading" name="heroicons:arrow-path" class="size-4 animate-spin motion-reduce:animate-pulse" aria-hidden="true" />
        {{ confirmLabel }}
      </button>
    </template>
  </DialogShell>
</template>
