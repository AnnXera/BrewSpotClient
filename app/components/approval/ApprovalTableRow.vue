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
  <tr class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FAF4ED]/60 transition-colors duration-150 ease-out cursor-default group font-sans">
    <td class="px-6 py-4">
      <div class="flex items-center gap-3">
        <CommonAvatar
          :firstname="approval.user?.firstname"
          :lastname="approval.user?.lastname"
          :index="index"
          :size="38"
          class="ring-2 ring-white shadow-xs shrink-0"
        />
        <div class="flex flex-col min-w-0">
          <span class="text-sm font-bold text-[#3D2B24] group-hover:text-[#8B5A3C] transition-colors truncate">
            {{ approval.user ? `${approval.user.firstname} ${approval.user.lastname}` : '—' }}
          </span>
          <span class="text-[11px] text-[#9E7060] font-medium leading-tight">
            Applicant
          </span>
        </div>
      </div>
    </td>

    <td class="px-6 py-4">
      <div v-if="approval.cafe?.cafe_name" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF4ED] border border-[#F3E7D2] text-xs font-semibold text-[#5C3A28] max-w-[200px]">
        <Icon name="heroicons:building-storefront" class="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
        <span class="truncate">{{ approval.cafe.cafe_name }}</span>
      </div>
      <span v-else class="text-xs text-[#9E7060]/70 italic">—</span>
    </td>

    <td class="px-6 py-4">
      <div class="flex flex-col gap-0.5 text-xs">
        <div class="flex items-center gap-1.5 font-semibold text-[#3D2B24]">
          <Icon name="heroicons:phone" class="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
          <span>{{ approval.user?.phone_number ?? '—' }}</span>
        </div>
        <div class="flex items-center gap-1.5 text-[#7D5A50]">
          <Icon name="heroicons:envelope" class="w-3.5 h-3.5 text-[#B4846C]/70 shrink-0" />
          <span class="truncate max-w-[200px]">{{ approval.user?.email ?? '—' }}</span>
        </div>
      </div>
    </td>

    <td class="px-6 py-4">
      <StatusBadge :status="approval.display_status ?? approval.status" />
    </td>

    <td class="px-6 py-4">
      <div class="inline-flex items-center gap-1.5 text-xs font-medium text-[#5E4A42]">
        <Icon name="heroicons:calendar" class="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
        <span>{{ formatDate(approval.created_at) }}</span>
      </div>
    </td>

    <td class="px-6 py-4">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EDD8CC] text-[#7D5A50] font-sans font-semibold text-xs hover:bg-[#FAF4ED] hover:border-[#D9C4B8] hover:text-[#3D2B24] active:scale-95 transition-[transform,background-color,border-color] duration-140 ease-out shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
        @click="emit('view', approval)"
      >
        <span>View Details</span>
        <Icon name="heroicons:arrow-right" class="w-3.5 h-3.5 text-[#B4846C]" />
      </button>
    </td>
  </tr>
</template>