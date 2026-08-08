<!-- components/StatusBadge.vue -->
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
      return 'bg-[#E3F3E7] text-[#1F8A4C]'
    case 'suspended':
    case 'rejected':
    case 'cancelled':
    case 'failed':
      return 'bg-[#FCE4E4] text-[#D9534F]'
    case 'pending_approval':
    case 'pending':
      return 'bg-[#FBF0D9] text-[#B4842A]'
    default: // inactive, expired, and anything else
      return 'bg-[#F0E3CE] text-[#8B6656]'
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
    :class="classes"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-current" />
    {{ label }}
  </span>
</template>