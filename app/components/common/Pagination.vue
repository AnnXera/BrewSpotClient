<!-- app/components/common/Pagination.vue -->
<template>
  <div v-if="lastPage > 1" class="flex items-center justify-center gap-4 p-5">
    <button
      class="p-2 text-[#9E7060] disabled:opacity-30 hover:text-[#3B1F0E] transition-colors"
      :disabled="page === 1"
      @click="prev"
    >
      <Icon name="heroicons:chevron-left-20-solid" class="w-6 h-6" />
    </button>

    <span class="font-sans text-sm font-medium text-[#3B1F0E]">Page {{ page }} of {{ lastPage }}</span>

    <button
      class="p-2 text-[#9E7060] disabled:opacity-30 hover:text-[#3B1F0E] transition-colors"
      :disabled="page === lastPage"
      @click="next"
    >
      <Icon name="heroicons:chevron-right-20-solid" class="w-6 h-6" />
    </button>
  </div>
</template>

<!-- Generic "Page X of Y" pagination, styled after the original
     owner-detail/PaymentHistoryTable.vue pattern. Use this on any
     page/table instead of re-implementing prev/next controls. -->
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
  if (props.page < props.lastPage) emit('change', props.page + 1)
}
</script>