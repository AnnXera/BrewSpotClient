<!-- app/components/common/Pagination.vue -->
<template>
  <nav class="flex items-center justify-center gap-1.5 h-[56px] w-full" aria-label="Pagination">
    <button
      type="button"
      class="pager-btn"
      :disabled="page <= 1"
      aria-label="Previous page"
      @click="prev"
    >
      <Icon name="heroicons:chevron-left" class="w-4 h-4" aria-hidden="true" />
    </button>

    <span class="font-display font-bold text-[14px] text-[#7D5A50] flex items-center tabular-nums px-1" aria-live="polite">
      Page {{ page }} of {{ Math.max(1, lastPage) }}
    </span>

    <button
      type="button"
      class="pager-btn"
      :disabled="page >= Math.max(1, lastPage)"
      aria-label="Next page"
      @click="next"
    >
      <Icon name="heroicons:chevron-right" class="w-4 h-4" aria-hidden="true" />
    </button>
  </nav>
</template>

<script setup lang="ts">
interface Props {
  page: number
  lastPage: number
  // Optional "Showing x–y of z" summary; omitted by pages that don't pass it.
  total?: number
  from?: number | null
  to?: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  change: [page: number]
}>()

function prev() {
  if (props.page > 1) emit('change', props.page - 1)
}

function next() {
  if (props.page < Math.max(1, props.lastPage)) emit('change', props.page + 1)
}
</script>

<style scoped>
/* 32px hit area, press feedback, hover only on real pointers. */
.pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  color: #9E7060;
  cursor: pointer;
  transition: transform 150ms cubic-bezier(0.23, 1, 0.32, 1), color 150ms ease, background-color 150ms ease;
}
.pager-btn:active:not(:disabled) {
  transform: scale(0.92);
}
.pager-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.pager-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(180, 132, 108, 0.4);
}
@media (hover: hover) and (pointer: fine) {
  .pager-btn:hover:not(:disabled) {
    color: #3D2B24;
    background-color: rgba(243, 231, 210, 0.6);
  }
}
</style>
