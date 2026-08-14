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
</script>

<template>
  <tr class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FFFAF0] transition-colors">
    <td class="px-6 py-4">
      <div class="flex items-center gap-3">
        <CommonAvatar :name="owner.name" :index="index" :size="36" />
        <span class="font-sans text-base font-medium text-[#3B1F0E]">{{ owner.name || '—' }}</span>
      </div>
    </td>

    <td class="px-6 py-4 font-sans text-base text-[#3B1F0E]">{{ owner.cafe_name ?? '—' }}</td>

    <td class="px-6 py-4">
      <div class="font-sans text-base text-[#3B1F0E] leading-tight">
        <p>{{ owner.phone_number ?? '—' }}</p>
        <p class="text-[#3B1F0E]/60">{{ owner.email }}</p>
      </div>
    </td>

    <td class="px-6 py-4">
      <StatusBadge :status="owner.status" />
    </td>

    <td class="px-6 py-4 font-sans text-base text-[#3B1F0E]">{{ formatDate(owner.date_joined) }}</td>

    <td class="px-6 py-4">
      <div class="flex items-center gap-6">
        <button
          type="button"
          class="hover:opacity-70 transition-opacity"
          title="View"
          @click="emit('view', owner)"
        >
          <Icon name="heroicons:eye" class="w-6 h-6 text-[#9E7060]" />
        </button>

        <button
          v-if="owner.status === 'active'"
          type="button"
          class="hover:opacity-70 transition-opacity disabled:opacity-40"
          :disabled="statusChangeLoading"
          title="Suspend"
          @click="emit('status-change', owner, 'suspended')"
        >
          <Icon name="heroicons:no-symbol" class="w-6 h-6 text-[#9E7060]" />
        </button>

        <button
          v-else-if="owner.status === 'suspended'"
          type="button"
          class="hover:opacity-70 transition-opacity disabled:opacity-40"
          :disabled="statusChangeLoading"
          title="Reactivate"
          @click="emit('status-change', owner, 'active')"
        >
          <Icon name="heroicons:check-circle" class="w-6 h-6 text-[#9E7060]" />
        </button>
      </div>
    </td>
  </tr>
</template>