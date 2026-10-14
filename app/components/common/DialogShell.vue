<!-- app/components/common/DialogShell.vue -->
<!-- The shared look of the owner dialogs, matching the floor plan editor's dialog: a blueprint-dotted header,
     a tone icon, a title and message, an optional body slot and an actions slot. Focus is trapped while open
     and restored on close. Mark the element that should receive focus first with data-autofocus. -->
<script setup lang="ts">
type Tone = 'warn' | 'danger' | 'info'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    tone?: Tone
    icon?: string
    /** Blocks Escape, the scrim and the close button while confirmed work is in flight. */
    busy?: boolean
  }>(),
  { message: '', tone: 'info', icon: 'heroicons:question-mark-circle', busy: false },
)

const emit = defineEmits<{ (e: 'close'): void }>()

const TONES: Record<Tone, { tile: string; icon: string }> = {
  warn: { tile: 'bg-[#F6E4D6]', icon: 'text-[#A96746]' },
  danger: { tile: 'bg-[#F3DFDC]', icon: 'text-[#9E4F47]' },
  info: { tile: 'bg-[#F1E9DE]', icon: 'text-[#7D5A50]' },
}

const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const messageId = useId()
let opener: HTMLElement | null = null
let previousOverflow = ''

const focusables = () =>
  Array.from(
    panel.value?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [],
  )

function dismiss() {
  if (!props.busy) emit('close')
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      opener = document.activeElement as HTMLElement | null
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      await nextTick()
      const wanted = panel.value?.querySelector<HTMLElement>('[data-autofocus]')
      ;(wanted ?? focusables()[0])?.focus()
    } else {
      document.body.style.overflow = previousOverflow
      opener?.focus?.()
      opener = null
    }
  },
)

function onKeydown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    dismiss()
    return
  }
  if (e.key !== 'Tab') return
  const els = focusables()
  if (!els.length) return
  const first = els[0]!
  const last = els[els.length - 1]!
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

onBeforeUnmount(() => {
  if (props.open) document.body.style.overflow = previousOverflow
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ds-dialog">
      <div
        v-if="open"
        class="ds-dialog fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-4"
        @keydown="onKeydown"
      >
        <div class="ds-scrim absolute inset-0 bg-[#3A2923]/45" @click="dismiss" />

        <div
          ref="panel"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="message ? messageId : undefined"
          class="ds-panel relative w-full max-w-[460px] rounded-[20px] bg-[#FFFDF9] border border-[#EDD8CC] overflow-hidden shadow-[0_28px_56px_-16px_rgba(58,41,35,0.35),0_3px_8px_rgba(58,41,35,0.08)]"
        >
          <div class="relative h-[76px] bg-[#F6EBDD] [background-image:radial-gradient(#E3D3BF_1px,transparent_1px)] [background-size:16px_16px]">
            <button
              type="button"
              :disabled="busy"
              class="absolute right-3 top-3 size-8 rounded-full flex items-center justify-center text-[#7D5A50] hover:bg-[#EDD8CC]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close"
              @click="dismiss"
            >
              <Icon name="heroicons:x-mark" class="size-[18px]" />
            </button>
          </div>

          <div class="px-6 pb-6">
            <span
              class="-mt-7 relative flex size-[52px] items-center justify-center rounded-[16px] border-4 border-[#FFFDF9]"
              :class="TONES[tone].tile"
            >
              <Icon :name="icon" class="size-6" :class="TONES[tone].icon" />
            </span>

            <h2 :id="titleId" class="mt-3 font-display font-bold text-[22px] leading-[1.2] text-[#3D2B24] text-balance">{{ title }}</h2>
            <p v-if="message" :id="messageId" class="mt-2 text-[14px] leading-[1.55] text-[#6B5A52] max-w-[62ch]">{{ message }}</p>

            <div v-if="$slots.default" class="mt-4">
              <slot />
            </div>

            <div class="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <slot name="actions" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ds-dialog-enter-active .ds-scrim,
.ds-dialog-leave-active .ds-scrim {
  transition: opacity 160ms ease-out;
}
.ds-dialog-enter-active .ds-panel {
  transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
.ds-dialog-leave-active .ds-panel {
  transition: opacity 140ms ease-in, transform 140ms ease-in;
}
.ds-dialog-enter-from .ds-scrim,
.ds-dialog-leave-to .ds-scrim {
  opacity: 0;
}
.ds-dialog-enter-from .ds-panel {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}
.ds-dialog-leave-to .ds-panel {
  opacity: 0;
  transform: translateY(6px) scale(0.99);
}
@media (prefers-reduced-motion: reduce) {
  .ds-dialog-enter-from .ds-panel,
  .ds-dialog-leave-to .ds-panel {
    transform: none;
  }
}
</style>
