<!-- app/components/floor-plan/Dialog.vue -->
<!-- The floor plan editor's modal: a blueprint-dotted header, a tone icon, a message, an optional list of
     problems with a "Show" per row, and up to three actions. Focus is trapped while open and restored on close. -->
<script setup lang="ts">
import type { DialogSpec, DialogTone } from '~/composables/useFloorPlanDialog'

const props = defineProps<{ spec: DialogSpec | null }>()
const emit = defineEmits<{ (e: 'close', id: string): void }>()

const TONES: Record<DialogTone, { tile: string; icon: string }> = {
  warn: { tile: 'bg-[#F6E4D6]', icon: 'text-[#A96746]' },
  danger: { tile: 'bg-[#F3DFDC]', icon: 'text-[#9E4F47]' },
  info: { tile: 'bg-[#F1E9DE]', icon: 'text-[#7D5A50]' },
}

const BUTTON = {
  primary: 'bg-[#3A2923] text-white hover:bg-[#2C1E19] focus-visible:ring-[#3A2923]',
  danger: 'bg-[#9E4F47] text-white hover:bg-[#8A423B] focus-visible:ring-[#9E4F47]',
  quiet: 'bg-transparent text-[#5E4A42] border border-[#DED4CA] hover:bg-[#F1E9DE] focus-visible:ring-[#7D5A50]',
}

const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const messageId = useId()
let opener: HTMLElement | null = null

const focusables = () =>
  Array.from(panel.value?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])

watch(
  () => props.spec,
  async (next, prev) => {
    if (next && !prev) {
      opener = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
      await nextTick()
      const wanted = next.focus ? panel.value?.querySelector<HTMLElement>(`[data-action="${next.focus}"]`) : null
      ;(wanted ?? focusables().find((el) => el.dataset.action) ?? focusables()[0])?.focus()
    } else if (!next && prev) {
      document.body.style.overflow = ''
      opener?.focus?.()
      opener = null
    }
  },
)

function onKeydown(e: KeyboardEvent) {
  if (!props.spec) return
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close', 'dismiss')
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
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fp-dialog">
      <div
        v-if="spec"
        class="fp-dialog fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-4"
        @keydown="onKeydown"
      >
        <div class="fp-scrim absolute inset-0 bg-[#3A2923]/45" @click="emit('close', 'dismiss')" />

        <div
          ref="panel"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
          class="fp-panel relative w-full max-w-[520px] rounded-[20px] bg-[#FFFDF9] border border-[#EDD8CC] overflow-hidden shadow-[0_28px_56px_-16px_rgba(58,41,35,0.35),0_3px_8px_rgba(58,41,35,0.08)]"
        >
          <!-- Blueprint header: the same dotted grid as the canvas -->
          <div class="relative h-[76px] bg-[#F6EBDD] [background-image:radial-gradient(#E3D3BF_1px,transparent_1px)] [background-size:16px_16px]">
            <button
              type="button"
              class="absolute right-3 top-3 size-8 rounded-full flex items-center justify-center text-[#7D5A50] hover:bg-[#EDD8CC]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] transition-colors"
              aria-label="Close"
              @click="emit('close', 'dismiss')"
            >
              <Icon name="heroicons:x-mark" class="size-[18px]" />
            </button>
          </div>

          <div class="px-6 pb-6">
            <span
              class="-mt-7 relative flex size-[52px] items-center justify-center rounded-[16px] border-4 border-[#FFFDF9]"
              :class="TONES[spec.tone].tile"
            >
              <Icon :name="spec.icon" class="size-6" :class="TONES[spec.tone].icon" />
            </span>

            <h2 :id="titleId" class="mt-3 font-display font-bold text-[22px] leading-[1.2] text-[#3D2B24] text-balance">{{ spec.title }}</h2>
            <p :id="messageId" class="mt-2 text-[14px] leading-[1.55] text-[#6B5A52] max-w-[62ch]">{{ spec.message }}</p>

            <ul
              v-if="spec.items?.length"
              class="mt-4 max-h-[220px] overflow-auto rounded-[12px] border border-[#EDD8CC] divide-y divide-[#F1E6DA] bg-white"
            >
              <li v-for="item in spec.items" :key="item.id" class="flex items-center gap-3 px-3.5 py-2.5">
                <span class="min-w-0 flex-1">
                  <span class="block text-[13px] font-semibold text-[#2D2521] truncate">{{ item.label }}</span>
                  <span class="block text-[12px] leading-[1.4] text-[#6B5A52]">{{ item.detail }}</span>
                </span>
                <button
                  v-if="item.id !== 'layout'"
                  type="button"
                  class="shrink-0 rounded-[8px] px-3 py-1.5 text-[12px] font-semibold text-[#A96746] hover:bg-[#F6E4D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A96746] transition-colors"
                  @click="emit('close', `item:${item.id}`)"
                >
                  Show
                </button>
              </li>
            </ul>

            <div class="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                v-for="a in spec.actions"
                :key="a.id"
                type="button"
                :data-action="a.id"
                class="whitespace-nowrap rounded-[10px] px-4 py-[11px] text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] transition-colors"
                :class="BUTTON[a.variant]"
                @click="emit('close', a.id)"
              >
                {{ a.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fp-dialog-enter-active .fp-scrim,
.fp-dialog-leave-active .fp-scrim {
  transition: opacity 160ms ease-out;
}
.fp-dialog-enter-active .fp-panel {
  transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
.fp-dialog-leave-active .fp-panel {
  transition: opacity 140ms ease-in, transform 140ms ease-in;
}
.fp-dialog-enter-from .fp-scrim,
.fp-dialog-leave-to .fp-scrim {
  opacity: 0;
}
.fp-dialog-enter-from .fp-panel {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}
.fp-dialog-leave-to .fp-panel {
  opacity: 0;
  transform: translateY(6px) scale(0.99);
}
@media (prefers-reduced-motion: reduce) {
  .fp-dialog-enter-from .fp-panel,
  .fp-dialog-leave-to .fp-panel {
    transform: none;
  }
}
</style>
