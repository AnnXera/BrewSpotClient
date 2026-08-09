<!-- components/owner-detail/BranchCard.vue -->
<!-- app/components/owner-detail/BranchCard.vue -->
<script setup lang="ts">
interface Branch {
  uuid: string
  branch_name: string
  status: string
  address: string | null
  cafe_phonenumber: string | null
  cafe_email: string | null
}

defineProps<{
  branch: Branch
}>()
</script>

<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6">
    <div class="flex items-center justify-between mb-3">
      <p class="font-display text-base font-semibold text-[#3B1F0E]">{{ branch.branch_name }}</p>
      <StatusBadge :status="branch.status" />
    </div>
    <p class="font-sans text-sm text-[#3B1F0E]/70 mb-3">{{ branch.address }}</p>
    <div class="font-sans text-sm text-[#3B1F0E]">
      <p>{{ branch.cafe_phonenumber }}</p>
      <p class="text-[#3B1F0E]/60">{{ branch.cafe_email }}</p>
    </div>
  </div>
</template>