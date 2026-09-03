<!-- app/components/owner-management/MobileCard.vue -->
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
  <div class="p-3.5 border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FFFAF0] transition-colors
              min-[360px]:p-4
              sm:p-5">
    <!-- Row 1: Avatar, Name & Cafe, Status Badge -->
    <div class="flex items-center justify-between gap-2.5
                min-[360px]:gap-3">
      <div class="flex items-center gap-2.5
                  min-[360px]:gap-3">
        <CommonAvatar
          :name="owner.name"
          :index="index"
          :size="36"
          class="shrink-0"
        />
        <div class="flex flex-col min-w-0">
          <span class="font-sans text-sm font-bold text-[#3D2B24] leading-tight truncate
                       min-[360px]:text-base">
            {{ owner.name || '—' }}
          </span>
          <span class="font-sans text-[11px] text-[#9E7060] mt-0.5 truncate
                       min-[360px]:text-xs">
            {{ owner.cafe_name ?? '—' }}
          </span>
        </div>
      </div>

      <StatusBadge :status="owner.status" />
    </div>

    <!-- Divider -->
    <div class="h-px bg-[#F3E7D2] my-3
                min-[360px]:my-3.5" />

    <!-- Row 2: Contacts Grid (Phone & Email) -->
    <div class="grid grid-cols-2 gap-[34px]">
      <div class="min-w-0">
        <p class="font-sans text-[10px] font-bold uppercase tracking-wider text-[#9E7060]
                  min-[360px]:text-[11px]">
          PHONE CONTACT
        </p>
        <p class="font-sans text-[11px] font-medium text-[#3B1F0E] mt-0.5 truncate
                  min-[360px]:text-xs">
          {{ owner.phone_number ?? '—' }}
        </p>
      </div>

      <div class="min-w-0">
        <p class="font-sans text-[10px] font-bold uppercase tracking-wider text-[#9E7060]
                  min-[360px]:text-[11px]">
          EMAIL CONTACT
        </p>
        <p class="font-sans text-[11px] font-medium text-[#3B1F0E] mt-0.5 truncate
                  min-[360px]:text-xs">
          {{ owner.email }}
        </p>
      </div>
    </div>

    <!-- Divider -->
    <div class="h-px bg-[#F3E7D2] my-3
                min-[360px]:my-3.5" />

    <!-- Row 3: Joined Date & Actions -->
    <div class="flex items-center justify-between">
      <span class="font-sans text-[11px] text-[#9E7060]
                   min-[360px]:text-xs">
        Joined: {{ formatDate(owner.date_joined) }}
      </span>

      <div class="flex items-center gap-3
                  min-[360px]:gap-4">
        <button
          type="button"
          class="p-1 hover:opacity-70 transition-opacity"
          title="View"
          @click="emit('view', owner)"
        >
          <Icon name="heroicons:eye" class="w-5 h-5 text-[#9E7060]" />
        </button>

        <button
          v-if="owner.status === 'active'"
          type="button"
          class="p-1 hover:opacity-70 transition-opacity disabled:opacity-40"
          :disabled="statusChangeLoading"
          title="Suspend"
          @click="emit('status-change', owner, 'suspended')"
        >
          <Icon name="heroicons:no-symbol" class="w-5 h-5 text-[#9E7060]" />
        </button>

        <button
          v-else-if="owner.status === 'suspended'"
          type="button"
          class="p-1 hover:opacity-70 transition-opacity disabled:opacity-40"
          :disabled="statusChangeLoading"
          title="Reactivate"
          @click="emit('status-change', owner, 'active')"
        >
          <Icon name="heroicons:check-circle" class="w-5 h-5 text-[#9E7060]" />
        </button>
      </div>
    </div>
  </div>
</template>
