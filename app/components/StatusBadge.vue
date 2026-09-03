<!-- components/StatusBadge.vue -->
<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2 min-[360px]:px-2.5 py-0.5 min-[360px]:py-1 font-display font-semibold text-xs min-[360px]:text-[13px] sm:text-[14px] shrink-0"
    :class="classes"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
interface Props {
  status: string
}

const props = defineProps<Props>()

const label = computed(() =>
  props.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
)

const classes = computed(() => {
  switch (props.status) {
    case 'active':
    case 'approved':
    case 'succeeded':
    case 'success':
      return 'bg-[#D4EDDA] text-[#28A745]'
    case 'suspended':
    case 'rejected':
    case 'cancelled':
    case 'failed':
      return 'bg-[#FDE8E8] text-[#DC3545]'
    case 'pending_approval':
    case 'pending':
      return 'bg-[#F0E8E5] text-[#B4846C]'
    default: // inactive, expired, and anything else
      return 'bg-[#F0E3CE] text-[#8B6656]'
  }
})
</script>
