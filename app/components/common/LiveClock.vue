<!-- app/components/common/LiveClock.vue -->
<!-- Live clock pill: "10:32 AM · Thu, Nov 26" with a green live dot.
     `floating` pins it to the bottom-right corner of the screen, above the page. -->
<script setup lang="ts">
defineProps<{ floating?: boolean }>()

const { now } = useNowClock()

const timeLabel = computed(() =>
  now.value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
)

const dateLabel = computed(() =>
  now.value.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
)
</script>

<template>
  <div
    class="inline-flex h-11 shrink-0 items-center gap-2.5 rounded-xl border border-[#E3CFB4] bg-white px-4 text-[13px]"
    :class="floating
      ? 'floating-clock fixed bottom-4 right-4 z-40 bg-white/95 shadow-[0_10px_30px_-8px_rgba(59,31,14,0.35)] backdrop-blur-sm sm:bottom-6 sm:right-6'
      : 'shadow-[0_1px_2px_rgba(59,31,14,0.04)]'"
  >
    <span class="relative flex size-2" aria-hidden="true">
      <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
      <span class="relative inline-flex size-2 rounded-full bg-emerald-500" />
    </span>
    <time class="font-semibold tabular-nums text-[#3B1F0E]">{{ timeLabel }}</time>
    <span class="text-[#D9C3A5]" aria-hidden="true">·</span>
    <span class="font-medium text-[#8B6656]">{{ dateLabel }}</span>
  </div>
</template>

<style scoped>
.floating-clock {
  animation: clock-in 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes clock-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .floating-clock { animation: none; }
}
</style>
