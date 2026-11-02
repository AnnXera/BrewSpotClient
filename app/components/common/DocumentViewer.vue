<!-- app/components/common/DocumentViewer.vue -->
<!-- Popup for viewing documents and pictures over the current page, driven by useDocumentViewer().
     Mounted once in app.vue and stacked above the other modals, so it can open from inside one. -->
<script setup lang="ts">
const { state, retryDocument, closeDocument } = useDocumentViewer()

const panel = ref<HTMLElement | null>(null)
const titleId = useId()
let opener: HTMLElement | null = null
let previousOverflow = ''

const downloadName = computed(() => {
  const base = state.value.title.replace(/[^\w\- ]+/g, '').trim() || 'document'
  return state.value.kind === 'pdf' ? `${base}.pdf` : base
})

// Capture phase, so Escape closes only this popup and not the modal underneath.
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopImmediatePropagation()
    closeDocument()
    return
  }
  if (e.key !== 'Tab' || !panel.value) return
  const els = Array.from(panel.value.querySelectorAll<HTMLElement>('button:not([disabled]), [href], iframe'))
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

watch(
  () => state.value.open,
  async (isOpen) => {
    if (isOpen) {
      opener = document.activeElement as HTMLElement | null
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeydown, true)
      await nextTick()
      panel.value?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    } else {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeydown, true)
      opener?.focus?.()
      opener = null
    }
  },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <Teleport to="body">
    <Transition name="dv">
      <div v-if="state.open" class="dv fixed inset-0 z-[3100] flex items-center justify-center p-3 sm:p-6">
        <div class="dv-scrim absolute inset-0 bg-[#3A2923]/55" @click="closeDocument" />

        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="dv-panel relative flex h-full max-h-[920px] w-full max-w-[1000px] flex-col overflow-hidden rounded-[20px] border border-[#EDD8CC] bg-[#FFFDF9] shadow-[0_28px_56px_-16px_rgba(58,41,35,0.35),0_3px_8px_rgba(58,41,35,0.08)]"
        >
          <header class="flex shrink-0 items-center gap-3 border-b border-[#F1E6DA] px-4 py-3 sm:px-5">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F1E9DE]">
              <Icon :name="state.kind === 'image' ? 'heroicons:photo' : 'heroicons:document-text'" class="size-5 text-[#7D5A50]" />
            </span>
            <h2 :id="titleId" class="min-w-0 flex-1 truncate font-display text-[17px] font-bold text-[#3D2B24]">{{ state.title }}</h2>

            <a
              v-if="state.src"
              :href="state.src"
              :download="downloadName"
              class="hidden h-9 items-center gap-1.5 rounded-[10px] border border-[#EDD8CC] px-3 text-[13px] font-semibold text-[#7D5A50] transition-colors hover:bg-[#FFF8EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] sm:flex"
            >
              <Icon name="heroicons:arrow-down-tray" class="size-4" />
              Download
            </a>
            <button
              type="button"
              data-autofocus
              class="flex size-9 shrink-0 items-center justify-center rounded-full text-[#7D5A50] transition-colors hover:bg-[#EDD8CC]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
              aria-label="Close"
              @click="closeDocument"
            >
              <Icon name="heroicons:x-mark" class="size-5" />
            </button>
          </header>

          <div class="relative min-h-0 flex-1 bg-[#F4ECE1]">
            <div v-if="state.loading" class="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div class="size-9 animate-spin rounded-full border-2 border-[#EDD8CC] border-t-[#7D5A50]" />
              <p class="text-xs font-medium text-[#8C6E63]">Loading document...</p>
            </div>

            <div v-else-if="state.error" class="absolute inset-0 flex items-center justify-center p-6">
              <div class="max-w-sm text-center">
                <Icon name="heroicons:exclamation-triangle" class="mx-auto size-8 text-[#A96746]" />
                <p class="mt-3 text-sm font-semibold text-[#3D2B24]">{{ state.error }}</p>
                <button
                  type="button"
                  class="mt-4 h-10 rounded-[10px] bg-[#3D2B24] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#2C1E19]"
                  @click="retryDocument"
                >
                  Try again
                </button>
              </div>
            </div>

            <iframe v-else-if="state.kind === 'pdf'" :src="state.src" :title="state.title" class="size-full border-0 bg-white" />

            <div v-else-if="state.kind === 'image'" class="absolute inset-0 flex items-center justify-center overflow-auto p-4">
              <img :src="state.src" :alt="state.title" class="max-h-full max-w-full rounded-lg object-contain shadow-sm">
            </div>

            <div v-else class="absolute inset-0 flex items-center justify-center p-6">
              <div class="max-w-sm text-center">
                <Icon name="heroicons:document" class="mx-auto size-8 text-[#A96746]" />
                <p class="mt-3 text-sm font-semibold text-[#3D2B24]">This file type can't be previewed.</p>
                <a
                  :href="state.src"
                  :download="downloadName"
                  class="mt-4 inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-[#3D2B24] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#2C1E19]"
                >
                  <Icon name="heroicons:arrow-down-tray" class="size-4" />
                  Download instead
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dv-enter-active .dv-scrim,
.dv-leave-active .dv-scrim {
  transition: opacity 160ms ease-out;
}
.dv-enter-active .dv-panel {
  transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
.dv-leave-active .dv-panel {
  transition: opacity 140ms ease-in, transform 140ms ease-in;
}
.dv-enter-from .dv-scrim,
.dv-leave-to .dv-scrim {
  opacity: 0;
}
.dv-enter-from .dv-panel {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}
.dv-leave-to .dv-panel {
  opacity: 0;
  transform: translateY(6px) scale(0.99);
}
@media (prefers-reduced-motion: reduce) {
  .dv-enter-from .dv-panel,
  .dv-leave-to .dv-panel {
    transform: none;
  }
}
</style>
