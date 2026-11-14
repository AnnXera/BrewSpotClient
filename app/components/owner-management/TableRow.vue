<!-- app/components/owner-management/TableRow.vue -->
<script setup lang="ts">
import type { OwnerListItem } from '~/services/OwnerManagementService'

defineProps<{
  owner: OwnerListItem
  index: number
  statusChangeLoading: boolean
}>()

const emit = defineEmits<{
  view: [owner: OwnerListItem]
  'status-change': [owner: OwnerListItem, newStatus: 'active' | 'suspended']
}>()

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

// Shared by the three icon buttons: 36px hit area, press feedback, hover only on real pointers.
const iconBtn =
  'inline-flex items-center justify-center w-9 h-9 rounded-[10px] text-[#9E7060] cursor-pointer ' +
  'transition-[transform,color,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ' +
  'active:scale-[0.92] disabled:opacity-40 disabled:pointer-events-none ' +
  '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#F3E7D2]/60 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]/40'
</script>

<template>
  <tr class="border-b border-[#F3E7D2] last:border-b-0 transition-colors duration-150 ease-out cursor-default [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#FFFAF0]">
    <td class="px-6 py-4">
      <div class="flex items-center gap-3">
        <CommonAvatar :name="owner.name" :index="index" :size="36" />
        <span class="font-sans text-[15px] font-semibold text-[#3B1F0E]">{{ owner.name || '—' }}</span>
      </div>
    </td>

    <td class="px-6 py-4 font-sans text-[15px] text-[#3B1F0E]">{{ owner.cafe_name ?? '—' }}</td>

    <td class="px-6 py-4">
      <div class="font-sans text-[15px] text-[#3B1F0E] leading-snug">
        <p class="tabular-nums">{{ owner.phone_number ?? '—' }}</p>
        <p class="text-[13px] text-[#3B1F0E]/55">{{ owner.email }}</p>
      </div>
    </td>

    <td class="px-6 py-4">
      <StatusBadge :status="owner.status" />
    </td>

    <td class="px-6 py-4 font-sans text-[15px] text-[#3B1F0E]/80 tabular-nums whitespace-nowrap">{{ formatDate(owner.date_joined) }}</td>

    <td class="px-6 py-4">
      <div class="flex items-center justify-end gap-1">
        <button
          type="button"
          :class="[iconBtn, '[@media(hover:hover)_and_(pointer:fine)]:hover:text-[#7D5A50]']"
          title="View owner"
          aria-label="View owner"
          @click="emit('view', owner)"
        >
          <Icon name="heroicons:eye" class="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          v-if="owner.status === 'active'"
          type="button"
          :class="[iconBtn, '[@media(hover:hover)_and_(pointer:fine)]:hover:text-[#D9622B]']"
          :disabled="statusChangeLoading"
          title="Suspend owner"
          aria-label="Suspend owner"
          @click="emit('status-change', owner, 'suspended')"
        >
          <Icon name="heroicons:no-symbol" class="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          v-else-if="owner.status === 'suspended'"
          type="button"
          :class="[iconBtn, '[@media(hover:hover)_and_(pointer:fine)]:hover:text-[#2E9E5B]']"
          :disabled="statusChangeLoading"
          title="Reactivate owner"
          aria-label="Reactivate owner"
          @click="emit('status-change', owner, 'active')"
        >
          <Icon name="heroicons:check-circle" class="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </td>
  </tr>
</template>
