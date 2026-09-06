<script setup lang="ts">
defineProps<{
  totalTransactions: number
  totalRevenue: number
  registeredSubscribers: number
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm flex items-center justify-between">
      <div>
        <p class="font-sans text-xs font-semibold uppercase text-[#9E7060] tracking-wider">Total Transactions</p>
        <p class="font-display text-3xl font-bold text-[#3B1F0E] mt-2">{{ totalTransactions }}</p>
      </div>
      <div class="w-12 h-12 rounded-xl bg-[#FFF0D1] flex items-center justify-center text-[#7D5A50]">
        <Icon name="heroicons:receipt-percent" class="w-6 h-6" />
      </div>
    </div>

    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm flex items-center justify-between">
      <div>
        <p class="font-sans text-xs font-semibold uppercase text-[#9E7060] tracking-wider">Total Revenue</p>
        <p class="font-display text-3xl font-bold text-[#28A745] mt-2">${{ totalRevenue.toFixed(2) }}</p>
      </div>
      <div class="w-12 h-12 rounded-xl bg-[#D4EDDA] flex items-center justify-center text-[#28A745]">
        <Icon name="heroicons:currency-dollar" class="w-6 h-6" />
      </div>
    </div>

    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm flex items-center justify-between">
      <div>
        <p class="font-sans text-xs font-semibold uppercase text-[#9E7060] tracking-wider">Registered Subscribers</p>
        <p class="font-display text-3xl font-bold text-[#3B1F0E] mt-2">{{ registeredSubscribers }}</p>
      </div>
      <div class="w-12 h-12 rounded-xl bg-[#FFF0D1] flex items-center justify-center text-[#7D5A50]">
        <Icon name="heroicons:user-group" class="w-6 h-6" />
      </div>
    </div>
  </div>
</template>
