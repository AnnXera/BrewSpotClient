<!-- app/components/common/Pagination.vue -->
<template>
  <div class="flex items-center justify-center gap-4 p-4 sm:p-5 border-t border-[#F0E6D8]">
    <button
      type="button"
      class="p-1.5 text-[#9E7060] disabled:opacity-30 disabled:cursor-not-allowed hover:text-[#3D2B24] transition-colors"
      :disabled="page <= 1"
      @click="prev"
    >
      <Icon name="heroicons:chevron-left-20-solid" class="w-5 h-5 sm:w-6 sm:h-6" />
    </button>

    <span class="font-display font-medium text-xs sm:text-sm text-[#7D5A50]">
      Page {{ page }} of {{ Math.max(1, lastPage) }}
    </span>

    <button
      type="button"
      class="p-1.5 text-[#9E7060] disabled:opacity-30 disabled:cursor-not-allowed hover:text-[#3D2B24] transition-colors"
      :disabled="page >= Math.max(1, lastPage)"
      @click="next"
    >
      <Icon name="heroicons:chevron-right-20-solid" class="w-5 h-5 sm:w-6 sm:h-6" />
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  page: number
  lastPage: number
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