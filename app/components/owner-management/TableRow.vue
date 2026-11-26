<!-- app/components/owner-management/TableRow.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { OwnerListItem } from '~/services/OwnerManagementService'

const props = defineProps<{
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

const statusMeta = computed(() => {
  const s = props.owner.status?.toLowerCase() || ''
  if (s === 'active') {
    return {
      label: 'Active',
      badgeClass: 'bg-[#FAF4ED] text-[#7D5A50] border border-[#EEDFC4]',
      dotClass: 'bg-[#B4846C] animate-pulse',
    }
  }
  if (s === 'suspended') {
    return {
      label: 'Suspended',
      badgeClass: 'bg-[#F7EFE6] text-[#8B6656] border border-[#E8D9CB]',
      dotClass: 'bg-[#8B6656]',
    }
  }
  return {
    label: s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Inactive',
    badgeClass: 'bg-[#F7EFE6] text-[#8B6656] border border-[#E8D9CB]',
    dotClass: 'bg-[#8B6656]',
  }
})
</script>

<template>
  <tr
    class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FAF4ED]/70 transition-colors duration-150 ease-out cursor-default group"
  >
    <!-- Owner Name & Avatar -->
    <td class="px-6 py-4">
      <div class="flex items-center gap-3">
        <CommonAvatar
          :name="owner.name"
          :index="index"
          :size="38"
          class="ring-2 ring-white shadow-xs shrink-0"
        />
        <div class="flex flex-col min-w-0">
          <span
            class="font-sans text-sm font-bold text-[#3D2B24] leading-snug group-hover:text-[#8B5A3C] transition-colors truncate"
          >
            {{ owner.name || '—' }}
          </span>
          <span class="font-sans text-[11px] text-[#9E7060] font-medium leading-tight">
            Cafe Owner
          </span>
        </div>
      </div>
    </td>

    <!-- Cafe Name -->
    <td class="px-6 py-4">
      <div v-if="owner.cafe_name" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF4ED] border border-[#F3E7D2] text-xs font-semibold text-[#5C3A28] max-w-[200px]">
        <Icon name="heroicons:building-storefront" class="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
        <span class="truncate">{{ owner.cafe_name }}</span>
      </div>
      <span v-else class="font-sans text-xs text-[#9E7060]/70 italic">—</span>
    </td>

    <!-- Contact Info (Phone & Email) -->
    <td class="px-6 py-4">
      <div class="flex flex-col gap-0.5">
        <div class="flex items-center gap-1.5 font-sans text-xs font-semibold text-[#3D2B24]">
          <Icon name="heroicons:phone" class="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
          <span>{{ owner.phone_number || '—' }}</span>
        </div>
        <div class="flex items-center gap-1.5 font-sans text-xs text-[#7D5A50]">
          <Icon name="heroicons:envelope" class="w-3.5 h-3.5 text-[#B4846C]/70 shrink-0" />
          <span class="truncate max-w-[200px]">{{ owner.email }}</span>
        </div>
      </div>
    </td>

    <!-- Status Badge -->
    <td class="px-6 py-4">
      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
        :class="statusMeta.badgeClass"
      >
        <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="statusMeta.dotClass" />
        {{ statusMeta.label }}
      </span>
    </td>

    <!-- Joined Date -->
    <td class="px-6 py-4">
      <div class="inline-flex items-center gap-1.5 font-sans text-xs font-medium text-[#5E4A42]">
        <Icon name="heroicons:calendar" class="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
        <span>{{ formatDate(owner.date_joined) }}</span>
      </div>
    </td>

    <!-- Actions -->
    <td class="px-6 py-4">
      <div class="flex items-center gap-2">
        <!-- View Owner -->
        <button
          type="button"
          class="inline-flex items-center justify-center p-2 rounded-xl bg-white border border-[#EDD8CC] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3D2B24] hover:border-[#D9C4B8] active:scale-90 transition-[transform,background-color,border-color] duration-140 ease-out shadow-xs focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
          title="View Owner Details"
          aria-label="View owner details"
          @click="emit('view', owner)"
        >
          <Icon name="heroicons:eye" class="w-4 h-4" />
        </button>

        <!-- Suspend Owner -->
        <button
          v-if="owner.status === 'active'"
          type="button"
          class="inline-flex items-center justify-center p-2 rounded-xl bg-white border border-[#EDD8CC] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3D2B24] hover:border-[#D9C4B8] active:scale-90 transition-[transform,background-color,border-color] duration-140 ease-out shadow-xs disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40 cursor-pointer"
          :disabled="statusChangeLoading"
          title="Suspend Owner"
          aria-label="Suspend owner"
          @click="emit('status-change', owner, 'suspended')"
        >
          <Icon v-if="statusChangeLoading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin text-[#7D5A50]" />
          <Icon v-else name="heroicons:no-symbol" class="w-4 h-4" />
        </button>

        <!-- Reactivate Owner -->
        <button
          v-else-if="owner.status === 'suspended'"
          type="button"
          class="inline-flex items-center justify-center p-2 rounded-xl bg-white border border-[#EDD8CC] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3D2B24] hover:border-[#D9C4B8] active:scale-90 transition-[transform,background-color,border-color] duration-140 ease-out shadow-xs disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40 cursor-pointer"
          :disabled="statusChangeLoading"
          title="Reactivate Owner"
          aria-label="Reactivate owner"
          @click="emit('status-change', owner, 'active')"
        >
          <Icon v-if="statusChangeLoading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin text-[#7D5A50]" />
          <Icon v-else name="heroicons:check-circle" class="w-4 h-4" />
        </button>
      </div>
    </td>
  </tr>
</template>
