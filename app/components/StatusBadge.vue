<!-- components/StatusBadge.vue -->
<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-sans font-semibold text-xs shrink-0 border shadow-2xs"
    :class="classes"
  >
    <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="dotClass" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  status?: string | null
}

const props = defineProps<Props>()

const normalizedStatus = computed(() => (props.status ?? '').trim())

const label = computed(() =>
  normalizedStatus.value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '—'
)

const isApproved = computed(() =>
  ['active', 'approved', 'succeeded', 'success'].includes(normalizedStatus.value.toLowerCase())
)

const isPending = computed(() =>
  ['pending_approval', 'pending'].includes(normalizedStatus.value.toLowerCase())
)

const isResubmitted = computed(() =>
  ['resubmitted'].includes(normalizedStatus.value.toLowerCase())
)

const classes = computed(() => {
  if (isApproved.value) {
    return 'bg-[#FAF4ED] text-[#7D5A50] border-[#EEDFC4]'
  }
  if (isPending.value) {
    return 'bg-[#FAF4ED] text-[#7D5A50] border-[#EEDFC4]'
  }
  if (isResubmitted.value) {
    return 'bg-[#F7EFE6] text-[#8B6656] border-[#E8D9CB]'
  }
  return 'bg-[#F7EFE6] text-[#8B6656] border-[#E8D9CB]'
})

const dotClass = computed(() => {
  if (isApproved.value) {
    return 'bg-[#B4846C] animate-pulse'
  }
  if (isPending.value) {
    return 'bg-[#B4846C]'
  }
  return 'bg-[#8B6656]'
})
</script>
