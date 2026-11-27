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
  <!-- The whole row opens the application -->
  <tr
    class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FAF4ED]/60 transition-colors duration-150 ease-out cursor-pointer group font-sans outline-none focus-visible:bg-[#FAF4ED] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B4846C]/40"
    tabindex="0"
    :aria-label="`Open application from ${approval.user ? `${approval.user.firstname} ${approval.user.lastname}` : 'applicant'}`"
    @click="emit('view', approval)"
    @keydown.enter.prevent="emit('view', approval)"
    @keydown.space.prevent="emit('view', approval)"
  >
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
      <div class="flex items-center gap-1.5 text-xs font-medium text-[#3D2B24]">
        <Icon name="heroicons:envelope" class="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
        <span class="truncate max-w-[220px]" :title="approval.user?.email ?? undefined">{{ approval.user?.email ?? '—' }}</span>
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

    <td class="w-12 px-4 py-4 text-right">
      <Icon name="heroicons:chevron-right" class="w-5 h-5 text-[#C2A592] transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-[#7D5A50]" aria-hidden="true" />
    </td>
  </tr>
</template>