<!--components/owner-detail/CafeDetailsCard.vue-->
<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl p-4 min-[360px]:p-5 sm:p-6 shadow-sm">
    <div class="flex items-center justify-between mb-3 min-[360px]:mb-4">
      <h2 class="font-display text-base min-[360px]:text-[18px] font-bold text-[#3D2B24]">
        {{ cafe?.cafe_name ?? 'Cafe' }} Details
      </h2>
      <button
        type="button"
        class="text-xs font-semibold text-[#9E7060] hover:text-[#3B1F0E] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
        @click="emit('goToBranches')"
      >
        <span>View Branches</span>
        <Icon name="heroicons:arrow-right" class="w-3.5 h-3.5" />
      </button>
    </div>

    <div class="flex items-center gap-3 pb-4 min-[360px]:pb-5 mb-4 min-[360px]:mb-5 border-b border-[#F3E7D2]">
      <img
        v-if="branch?.cafe_picture"
        :src="branch.cafe_picture"
        class="w-12 h-12 min-[360px]:w-14 min-[360px]:h-14 rounded-lg object-cover shrink-0"
      />
      <div v-else class="w-12 h-12 min-[360px]:w-14 min-[360px]:h-14 rounded-lg bg-[#F0E3CE] shrink-0" />

      <p class="font-display text-base min-[360px]:text-[18px] font-bold text-[#3D2B24]">
        {{ cafe?.cafe_name }} - {{ branch?.branch_type === 'main' ? 'Main' : branch?.branch_name }}
      </p>
    </div>

    <div class="font-display font-medium text-[13px] min-[360px]:text-[14px] space-y-3 min-[360px]:space-y-3.5">
      <div>
        <p class="font-bold text-[10px] min-[360px]:text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-0.5 min-[360px]:mb-1">Main Address</p>
        <p class="text-[#3B1F0E] break-words">{{ branch?.address ?? '—' }}</p>
      </div>

      <div>
        <p class="font-bold text-[10px] min-[360px]:text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-0.5 min-[360px]:mb-1">Email Address</p>
        <p class="text-[#3B1F0E] break-all">{{ branch?.cafe_email ?? '—' }}</p>
      </div>

      <div>
        <p class="font-bold text-[10px] min-[360px]:text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-0.5 min-[360px]:mb-1">Phone Number</p>
        <p class="text-[#3B1F0E]">{{ branch?.cafe_phonenumber ?? '—' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Cafe {
  cafe_name: string
}

interface Branch {
  branch_name: string
  branch_type: string
  address: string | null
  cafe_email: string | null
  cafe_phonenumber: string | null
  cafe_picture: string | null
}

defineProps<{
  cafe: Cafe | null
  branch: Branch | null
}>()

const emit = defineEmits<{
  goToBranches: []
}>()
</script>