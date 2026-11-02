<!-- app/components/floor-plan/Toast.vue -->
<!-- Emil Kowalski (Sonner-inspired) notification toast styled with the system's exact espresso & latte palette (#3A2923, #FFF8EA, #7D5A50, #4CAF7D) -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    show: boolean
    message?: string
    description?: string
  }>(),
  {
    message: 'Layout saved',
    description: 'Floor plan changes successfully synced',
  }
)

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-0 bottom-10 md:bottom-12 z-[9999] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <Transition name="emil-toast">
        <div
          v-if="show"
          class="pointer-events-auto flex items-center gap-3 rounded-full bg-[#3A2923]/95 text-[#FFF8EA] py-2.5 pl-3 pr-4 border border-[#7D5A50]/40 shadow-[0_20px_45px_-10px_rgba(42,28,23,0.65),0_4px_16px_rgba(0,0,0,0.3)] backdrop-blur-md select-none max-w-sm ring-1 ring-white/10"
        >
          <!-- Spring Pop Emerald Checkmark Badge -->
          <div class="relative flex items-center justify-center shrink-0">
            <span class="flex size-7 items-center justify-center rounded-full bg-[#4CAF7D] text-white shadow-xs ring-4 ring-[#4CAF7D]/25 emil-check-pop">
              <Icon name="heroicons:check" class="size-4 stroke-[2.5]" />
            </span>
          </div>

          <!-- Toast Copy (Title + Micro-Caption in system palette) -->
          <div class="flex flex-col min-w-0 pr-1">
            <span class="text-xs font-extrabold text-[#FFF8EA] tracking-tight leading-snug">
              {{ message }}
            </span>
            <span class="text-[11px] font-medium text-[#D8C7B8] truncate leading-tight mt-0.5">
              {{ description }}
            </span>
          </div>

          <!-- Subtle Dismiss Button -->
          <button
            type="button"
            @click="emit('close')"
            title="Dismiss notification"
            class="ml-auto -mr-1 p-1 rounded-full text-[#D8C7B8]/70 hover:text-[#FFF8EA] hover:bg-white/10 active:scale-90 transition-all shrink-0 cursor-pointer"
          >
            <Icon name="heroicons:x-mark" class="size-3.5" />
          </button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
/* Emil Kowalski Spring-Inspired Toast Transition */
.emil-toast-enter-active {
  transition:
    transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 240ms cubic-bezier(0.16, 1, 0.3, 1);
}

.emil-toast-leave-active {
  transition:
    transform 180ms cubic-bezier(0.4, 0, 1, 1),
    opacity 160ms cubic-bezier(0.4, 0, 1, 1);
}

.emil-toast-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.92);
}

.emil-toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

/* Micro spring pop animation for the icon on enter */
@keyframes emil-pop {
  0% {
    transform: scale(0.6) rotate(-8deg);
    opacity: 0;
  }
  65% {
    transform: scale(1.18) rotate(3deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.emil-check-pop {
  animation: emil-pop 360ms cubic-bezier(0.16, 1, 0.3, 1) 40ms backwards;
}

@media (prefers-reduced-motion: reduce) {
  .emil-toast-enter-active,
  .emil-toast-leave-active {
    transition: opacity 150ms ease;
  }
  .emil-toast-enter-from,
  .emil-toast-leave-to {
    transform: none;
  }
  .emil-check-pop {
    animation: none;
  }
}
</style>
