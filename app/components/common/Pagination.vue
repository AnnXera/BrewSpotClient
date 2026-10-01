<!-- app/components/common/Pagination.vue -->
<template>
  <div class="flex items-center justify-center gap-[6px] h-[56px] w-full">
    <button
      type="button"
      class="p-1 text-[#9E7060] disabled:opacity-30 disabled:cursor-not-allowed hover:text-[#3D2B24] transition-colors flex items-center justify-center"
      :disabled="page <= 1"
      @click="prev"
    >
      <Icon name="heroicons:chevron-left" class="w-[16px] h-[16px]" />
    </button>

    <span class="font-display font-bold text-[14px] text-[#7D5A50] flex items-center">
      Page {{ page }} of {{ Math.max(1, lastPage) }}
    </span>

    <button
      type="button"
      class="p-1 text-[#9E7060] disabled:opacity-30 disabled:cursor-not-allowed hover:text-[#3D2B24] transition-colors flex items-center justify-center"
      :disabled="page >= Math.max(1, lastPage)"
      @click="next"
    >
      <Icon name="heroicons:chevron-right" class="w-[16px] h-[16px]" />
    </button>
  </div>
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