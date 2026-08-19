<!--app/components/approval/BranchApprovalTableRow.vue-->
<script setup lang="ts">
import type { ApprovalListItem } from '~/services/OwnerManagementService'

defineProps<{
  approval: ApprovalListItem
  index: number
}>()

const emit = defineEmits<{
  view: [approval: ApprovalListItem]
}>()

const config = useRuntimeConfig()
const origin = config.public.apiBase.replace(/\/api\/?$/, '')

function cafePictureUrl(branchUuid?: string | null) {
  if (!branchUuid) return null
  return `${origin}/api/branch-picture/${branchUuid}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}
</script>

<template>
  <tr class="border-b border-[#EDD8CC] last:border-b-0 hover:bg-[#FFFAF0] transition-colors font-sans">
    <td class="px-[20px] py-[14px]">
      <div class="flex items-center gap-3">
        <img
          v-if="approval.branch?.cafe_picture"
          :src="cafePictureUrl(approval.branch?.uuid) ?? ''"
          class="w-[43px] h-[43px] rounded-[10px] object-cover shrink-0"
        />
        <div v-else class="w-[43px] h-[43px] rounded-[10px] bg-[#F0E3CE] shrink-0" />

        <span class="text-base font-semibold text-[#3B1F0E]">
          {{ approval.cafe?.cafe_name ?? '—' }}
        </span>
      </div>
    </td>

    <td class="px-[20px] py-[14px] text-base text-[#3B1F0E]">
      {{ approval.user ? `${approval.user.firstname} ${approval.user.lastname}` : '—' }}
    </td>

    <td class="px-[20px] py-[14px] text-base text-[#3B1F0E]">
      {{ approval.branch?.address ?? '—' }}
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