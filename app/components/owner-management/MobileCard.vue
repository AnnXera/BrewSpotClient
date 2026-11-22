<!-- app/components/owner-management/MobileCard.vue -->
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
      badgeClass: 'bg-[#E8F7EE] text-[#28A745] border border-[#C3ECD3]',
      dotClass: 'bg-[#28A745] animate-pulse',
    }
  }
  if (s === 'suspended') {
    return {
      label: 'Suspended',
      badgeClass: 'bg-[#FDE8E8] text-[#DC3545] border border-[#F8B4B4]',
      dotClass: 'bg-[#DC3545]',
    }
  }
  return {
    label: s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Inactive',
    badgeClass: 'bg-[#F0E3CE] text-[#8B6656] border border-[#E4D1B8]',
    dotClass: 'bg-[#8B6656]',
  }
})
</script>

<template>
  <div
    class="p-4 border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FAF4ED]/50 transition-colors duration-150 ease-out"
  >
    <!-- Row 1: Avatar, Name & Cafe, Status Badge -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <CommonAvatar
          :name="owner.name"
          :index="index"
          :size="40"
          class="shrink-0 ring-2 ring-white shadow-xs"
        />
        <div class="flex flex-col min-w-0">
          <span class="font-sans text-sm font-bold text-[#3D2B24] leading-snug truncate">
            {{ owner.name || '—' }}
          </span>
          <div v-if="owner.cafe_name" class="inline-flex items-center gap-1 mt-0.5 text-xs text-[#7D5A50] font-medium truncate">
            <Icon name="heroicons:building-storefront" class="w-3 h-3 text-[#B4846C] shrink-0" />
            <span class="truncate">{{ owner.cafe_name }}</span>
          </div>
          <span v-else class="text-[11px] text-[#9E7060]/70 italic">No cafe assigned</span>
        </div>
      </div>

      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
        :class="statusMeta.badgeClass"
      >
        <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="statusMeta.dotClass" />
        {{ statusMeta.label }}
      </span>
    </div>

    <!-- Divider -->
    <div class="h-px bg-[#F3E7D2] my-3" />

    <!-- Row 2: Contacts Grid (Phone & Email) -->
    <div class="grid grid-cols-2 gap-3 text-xs">
      <div class="min-w-0">
        <span class="font-sans text-[10px] font-bold uppercase tracking-wider text-[#9E7060] block mb-0.5">
          Phone
        </span>
        <div class="flex items-center gap-1 text-[#3D2B24] font-medium truncate">
          <Icon name="heroicons:phone" class="w-3 h-3 text-[#B4846C] shrink-0" />
          <span class="truncate">{{ owner.phone_number || '—' }}</span>
        </div>
      </div>

      <div class="min-w-0">
        <span class="font-sans text-[10px] font-bold uppercase tracking-wider text-[#9E7060] block mb-0.5">
          Email
        </span>
        <div class="flex items-center gap-1 text-[#7D5A50] truncate">
          <Icon name="heroicons:envelope" class="w-3 h-3 text-[#B4846C]/70 shrink-0" />
          <span class="truncate">{{ owner.email }}</span>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="h-px bg-[#F3E7D2] my-3" />

    <!-- Row 3: Joined Date & Actions -->
    <div class="flex items-center justify-between gap-3">
      <div class="inline-flex items-center gap-1 text-xs text-[#9E7060]">
        <Icon name="heroicons:calendar" class="w-3 h-3 text-[#B4846C] shrink-0" />
        <span>Joined {{ formatDate(owner.date_joined) }}</span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center justify-center p-2 rounded-xl bg-white border border-[#EDD8CC] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3D2B24] active:scale-90 transition-[transform,background-color] duration-140 ease-out shadow-xs focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
          title="View Owner Details"
          aria-label="View owner details"
          @click="emit('view', owner)"
        >
          <Icon name="heroicons:eye" class="w-4 h-4" />
        </button>

        <button
          v-if="owner.status === 'active'"
          type="button"
          class="inline-flex items-center justify-center p-2 rounded-xl bg-white border border-[#FCDAD1] text-[#D9622B] hover:bg-[#FDF0EB] hover:text-[#B84E1D] active:scale-90 transition-[transform,background-color] duration-140 ease-out shadow-xs disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#D9622B]/40"
          :disabled="statusChangeLoading"
          title="Suspend Owner"
          aria-label="Suspend owner"
          @click="emit('status-change', owner, 'suspended')"
        >
          <Icon v-if="statusChangeLoading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else name="heroicons:no-symbol" class="w-4 h-4" />
        </button>

        <button
          v-else-if="owner.status === 'suspended'"
          type="button"
          class="inline-flex items-center justify-center p-2 rounded-xl bg-white border border-[#CDEED9] text-[#2E9E5B] hover:bg-[#E8F7EE] hover:text-[#1E733F] active:scale-90 transition-[transform,background-color] duration-140 ease-out shadow-xs disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#2E9E5B]/40"
          :disabled="statusChangeLoading"
          title="Reactivate Owner"
          aria-label="Reactivate owner"
          @click="emit('status-change', owner, 'active')"
        >
          <Icon v-if="statusChangeLoading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else name="heroicons:check-circle" class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
