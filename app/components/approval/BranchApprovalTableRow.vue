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
  <!-- The whole row opens the application -->
  <tr
    class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FAF4ED]/60 transition-colors duration-150 ease-out cursor-pointer group font-sans outline-none focus-visible:bg-[#FAF4ED] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B4846C]/40"
    tabindex="0"
    :aria-label="`Open branch application for ${approval.cafe?.cafe_name ?? 'this cafe'}`"
    @click="emit('view', approval)"
    @keydown.enter.prevent="emit('view', approval)"
    @keydown.space.prevent="emit('view', approval)"
  >
    <td class="px-6 py-4">
      <div class="flex items-center gap-3">
        <img
          v-if="approval.branch?.cafe_picture"
          :src="cafePictureUrl(approval.branch?.uuid) ?? ''"
          class="w-[38px] h-[38px] rounded-xl object-cover shrink-0 ring-2 ring-white shadow-xs"
        />
        <div v-else class="w-[38px] h-[38px] rounded-xl bg-[#FAF4ED] border border-[#EEDFC4] flex items-center justify-center shrink-0">
          <Icon name="heroicons:building-storefront" class="w-4 h-4 text-[#B4846C]" />
        </div>

        <span class="text-sm font-bold text-[#3D2B24] group-hover:text-[#8B5A3C] transition-colors truncate">
          {{ approval.cafe?.cafe_name ?? '—' }}
        </span>
      </div>
    </td>

    <td class="px-6 py-4 text-sm font-semibold text-[#3D2B24]">
      {{ approval.user ? `${approval.user.firstname} ${approval.user.lastname}` : '—' }}
    </td>

    <td class="px-6 py-4 text-xs text-[#7D5A50] max-w-[220px]">
      <span class="truncate block">{{ approval.branch?.address ?? '—' }}</span>
    </td>

    <td class="px-6 py-4">
      <StatusBadge :status="approval.status" />
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