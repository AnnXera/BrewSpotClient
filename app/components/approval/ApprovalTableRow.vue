<!--app/components/approval/ApprovalTableRow.vue-->
<script setup lang="ts">
import type { ApprovalListItem } from '~/services/OwnerManagementService'

defineProps<{
  approval: ApprovalListItem
  index: number
}>()

const emit = defineEmits<{
  view: [approval: ApprovalListItem]
}>()

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}
</script>

<template>
  <tr class="border-b border-[#EDD8CC] last:border-b-0 hover:bg-[#FFFAF0] transition-colors font-sans">
    <td class="px-[20px] py-[14px]">
      <div class="flex items-center gap-3">
        <CommonAvatar :firstname="approval.user?.firstname" :lastname="approval.user?.lastname" :index="index" :size="43" />
        <span class="text-base font-semibold text-[#3B1F0E]">
          {{ approval.user ? `${approval.user.firstname} ${approval.user.lastname}` : '—' }}
        </span>
      </div>
    </td>

    <td class="px-[20px] py-[14px] text-base text-[#3B1F0E]">{{ approval.cafe?.cafe_name ?? '—' }}</td>

    <td class="px-[20px] py-[14px]">
      <div class="text-base text-[#3B1F0E] leading-tight">
        <p>{{ approval.user?.phone_number ?? '—' }}</p>
        <p class="text-[#3B1F0E]/60">{{ approval.user?.email ?? '—' }}</p>
      </div>
    </td>

    <td class="px-[20px] py-[14px]">
      <StatusBadge :status="approval.status" />
    </td>

    <td class="px-[20px] py-[14px] text-base text-[#3B1F0E]">{{ formatDate(approval.created_at) }}</td>

    <td class="px-[20px] py-[14px]">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-[#7D5A50] px-3 py-2 font-display text-[13px] font-semibold text-[#7D5A50] hover:bg-[#7D5A50] hover:text-[#FFF0D1] hover:border-[#7D5A50] transition-colors"
        @click="emit('view', approval)"
      >
        View Details
        <Icon name="heroicons:arrow-right" class="w-4 h-4" />
      </button>
    </td>
  </tr>
</template>