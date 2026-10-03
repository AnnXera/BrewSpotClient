<!-- components/ConfirmDialog.vue -->
<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** Disables both actions while the confirmed work is in flight. */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false,
  loading: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const titleId = useId()
const messageId = useId()

const panel = ref<HTMLElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)
let returnFocusTo: HTMLElement | null = null

function dismiss() {
  if (!props.loading) emit('cancel')
}

// Keep Tab inside the dialog and let Esc back out, so a keyboard user can't wander onto the
// page behind it. Focus starts on the safe action, not the destructive one.
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    dismiss()
    return
  }
  if (e.key !== 'Tab' || !panel.value) return

  const focusable = Array.from(panel.value.querySelectorAll<HTMLElement>('button:not([disabled])'))
  if (!focusable.length) return

  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    returnFocusTo = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    cancelButton.value?.focus()
  } else {
    document.removeEventListener('keydown', onKeydown)
    returnFocusTo?.focus?.()
    returnFocusTo = null
  }
})

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#3B1F0E]/40 backdrop-blur-sm"
      @click.self="dismiss"
    >
      <div
        ref="panel"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
        class="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6"
      >
        <h2 :id="titleId" class="font-display text-lg font-semibold text-[#3B1F0E]">{{ title }}</h2>
        <p :id="messageId" class="font-sans text-sm text-[#3B1F0E]/70 mt-2">{{ message }}</p>

        <div v-if="$slots.default" class="mt-4">
          <slot />
        </div>

        <div class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 mt-6">
          <button
            ref="cancelButton"
            type="button"
            :disabled="loading"
            class="rounded-lg px-4 py-2.5 font-sans text-sm font-medium text-[#3B1F0E]/70 hover:bg-[#F3E7D2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1F0E]/40 disabled:opacity-60 disabled:cursor-not-allowed"
            @click="dismiss"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            :disabled="loading"
            class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-sans text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            :class="danger
              ? 'bg-[#D9534F] text-white hover:bg-[#C24541] focus-visible:ring-[#D9534F]/50'
              : 'bg-[#3B1F0E] text-[#FDF3E7] hover:bg-[#2C1609] focus-visible:ring-[#3B1F0E]/50'"
            @click="emit('confirm')"
          >
            <Icon v-if="loading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" aria-hidden="true" />
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
