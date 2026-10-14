<!-- app/components/floor-plan/Toast.vue -->
<!-- A passive confirmation ("Layout saved"): it never takes focus or blocks the plan, so it is not a modal. -->
<script setup lang="ts">
defineProps<{ show: boolean; message: string }>()
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-0 bottom-6 z-[2900] flex justify-center px-4" role="status" aria-live="polite">
      <Transition name="fp-toast">
        <div
          v-if="show"
          class="flex items-center gap-2.5 rounded-full bg-[#3A2923] py-2.5 pl-3 pr-5 text-[13px] font-semibold text-[#FFF8EA] shadow-[0_14px_28px_-10px_rgba(58,41,35,0.5),0_2px_6px_rgba(58,41,35,0.15)]"
        >
          <span class="flex size-6 items-center justify-center rounded-full bg-[#4CAF7D]">
            <Icon name="heroicons:check" class="size-4 text-white" />
          </span>
          {{ message }}
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.fp-toast-enter-active {
  transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1), transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
.fp-toast-leave-active {
  transition: opacity 160ms ease-in, transform 160ms ease-in;
}
.fp-toast-enter-from,
.fp-toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
@media (prefers-reduced-motion: reduce) {
  .fp-toast-enter-from,
  .fp-toast-leave-to {
    transform: none;
  }
}
</style>
