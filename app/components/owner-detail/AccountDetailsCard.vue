<!--components/owner-detail/AccountDetailsCard.vue-->
<template>
  <div class="bg-white border border-[#EDD8CC] rounded-2xl p-4 min-[360px]:p-5 sm:p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4 min-[360px]:mb-5">
      <h2 class="font-display text-base min-[360px]:text-[18px] font-bold text-[#3D2B24]">Account Details</h2>
      <StatusBadge :status="owner.status" />
    </div>

    <div class="flex items-center gap-3 min-[360px]:gap-4 pb-4 min-[360px]:pb-5 mb-4 min-[360px]:mb-5 border-b border-[#F3E7D2]">
      <CommonAvatar :firstname="owner.firstname" :lastname="owner.lastname" :size="48" />
      <div class="min-w-0">
        <p class="font-display text-base min-[360px]:text-[18px] sm:text-[20px] font-semibold text-[#3B1F0E] truncate">
          {{ owner.firstname }} {{ owner.lastname }}
        </p>
        <p class="font-display text-xs min-[360px]:text-[14px] text-[#9E7060] truncate">
          <template v-if="owner.username">@{{ owner.username }}</template>
          <template v-else-if="owner.uuid">ID: {{ owner.uuid.slice(0, 12) }}</template>
          <template v-else>ID: Unset</template>
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 min-[360px]:gap-4 text-[13px] min-[360px]:text-[14px] tracking-[0.1px] font-display">
      <div class="min-[360px]:col-span-2">
        <p class="font-bold text-[10px] min-[360px]:text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-0.5 min-[360px]:mb-1">Email Address</p>
        <p class="font-medium text-[#3B1F0E] break-all">{{ owner.email }}</p>
      </div>
      <div class="min-[360px]:col-span-2">
        <p class="font-bold text-[10px] min-[360px]:text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-0.5 min-[360px]:mb-1">Phone Contact</p>
        <p class="font-medium text-[#3B1F0E]">{{ owner.phone_number ?? '—' }}</p>
      </div>
      <div v-if="owner.address" class="min-[360px]:col-span-2">
        <p class="font-bold text-[10px] min-[360px]:text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-0.5 min-[360px]:mb-1">Address</p>
        <p class="font-medium text-[#3B1F0E] break-words">{{ owner.address }}</p>
      </div>
      <div>
        <p class="font-bold text-[10px] min-[360px]:text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-0.5 min-[360px]:mb-1">Member Since</p>
        <p class="font-medium text-[#3B1F0E]">{{ formatDate(owner.created_at) }}</p>
      </div>
      <div class="cursor-pointer group" @click="emit('goToBranches')">
        <p class="font-bold text-[10px] min-[360px]:text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-0.5 min-[360px]:mb-1 group-hover:text-[#3B1F0E]">Total Cafe Branches</p>
        <p class="font-medium text-[#3B1F0E] group-hover:underline inline-flex items-center gap-1">
          {{ branchCount }} Branches
          <Icon name="heroicons:arrow-right" class="w-3 h-3 text-[#9E7060] group-hover:text-[#3B1F0E]" />
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Owner {
  uuid: string
  firstname: string
  lastname: string
  username: string | null
  email: string
  phone_number: string | null
  address: string | null
  status: string
  created_at: string | null
}

defineProps<{
  owner: Owner
  branchCount: number
}>()

const emit = defineEmits<{
  goToBranches: []
}>()

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}
</script>