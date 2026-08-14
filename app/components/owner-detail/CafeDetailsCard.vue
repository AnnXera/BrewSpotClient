<!--components/owner-detail/CafeDetailsCard.vue-->
<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6">
    
    <h2 class="font-display text-[18px] font-bold text-[#3D2B24] mb-[20px]">
      {{ cafe?.cafe_name ?? 'Cafe' }} Details
    </h2>

    <div class="flex items-center gap-3 pb-[20px] mb-[20px] border-b border-[#F3E7D2]">
      
        <img
        v-if="branch?.cafe_picture"
        :src="branch.cafe_picture"
        class="w-[56px] h-[56px] rounded-lg object-cover shrink-0"
      />

      <div v-else class="w-[56px] h-[56px] rounded-lg bg-[#F0E3CE] shrink-0" />

      <p class="font-display text-[18px] font-bold text-[#3D2B24]">
        {{ cafe?.cafe_name }} - {{ branch?.branch_type === 'main' ? 'Main' : branch?.branch_name }}
      </p>

    </div>

    <div class="font-display font-medium text-[14px] space-y-4">

      <div>
        <p class="font-bold text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-1">Main Address</p>
        <p class="text-[#3B1F0E]">{{ branch?.address ?? '—' }}</p>
      </div>
      
      <div class="grid grid-cols-2 gap-4">

        <div>
          <p class="font-bold text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-1">Email Address</p>
          <p class="text-[#3B1F0E]">{{ branch?.cafe_email ?? '—' }}</p>
        </div>

        <div>
          <p class="font-bold text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-1">Phone Number</p>
          <p class="text-[#3B1F0E]">{{ branch?.cafe_phonenumber ?? '—' }}</p>
        </div>

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
</script>