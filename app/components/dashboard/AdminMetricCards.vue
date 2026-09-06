<script setup lang="ts">
defineProps<{
  totalOwners: number
  activeOwners: number
  pendingApprovals: number
  activeSubscriptions: number
  totalRevenue: number
  loading?: boolean
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <!-- Card 1: Total Cafe Owners -->
    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div class="flex items-center justify-between">
        <span class="font-sans text-xs font-semibold uppercase text-[#9E7060] tracking-wider">Total Cafe Owners</span>
        <div class="w-10 h-10 rounded-xl bg-[#FFF0D1] flex items-center justify-center text-[#7D5A50]">
          <Icon name="heroicons:users" class="w-5 h-5" />
        </div>
      </div>
      <div class="mt-4">
        <p class="font-display text-3xl font-bold text-[#3B1F0E]">
          <span v-if="loading" class="animate-pulse">...</span>
          <span v-else>{{ totalOwners }}</span>
        </p>
        <div class="flex items-center gap-2 mt-2 text-xs font-medium text-[#8B6656]">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
            {{ activeOwners }} Active
          </span>
          <span>registered cafes</span>
        </div>
      </div>
    </div>

    <!-- Card 2: Pending Approvals -->
    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div class="flex items-center justify-between">
        <span class="font-sans text-xs font-semibold uppercase text-[#9E7060] tracking-wider">Pending Approvals</span>
        <div class="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
          <Icon name="heroicons:clock" class="w-5 h-5" />
        </div>
      </div>
      <div class="mt-4">
        <p class="font-display text-3xl font-bold text-[#3B1F0E]">
          <span v-if="loading" class="animate-pulse">...</span>
          <span v-else>{{ pendingApprovals }}</span>
        </p>
        <div class="flex items-center gap-2 mt-2 text-xs font-medium text-[#8B6656]">
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full font-semibold"
            :class="pendingApprovals > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'"
          >
            {{ pendingApprovals > 0 ? 'Action Required' : 'All Clear' }}
          </span>
          <span>awaiting verification</span>
        </div>
      </div>
    </div>

    <!-- Card 3: Active Subscriptions -->
    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div class="flex items-center justify-between">
        <span class="font-sans text-xs font-semibold uppercase text-[#9E7060] tracking-wider">Active Subscribers</span>
        <div class="w-10 h-10 rounded-xl bg-[#FFF0D1] flex items-center justify-center text-[#7D5A50]">
          <Icon name="heroicons:credit-card" class="w-5 h-5" />
        </div>
      </div>
      <div class="mt-4">
        <p class="font-display text-3xl font-bold text-[#3B1F0E]">
          <span v-if="loading" class="animate-pulse">...</span>
          <span v-else>{{ activeSubscriptions }}</span>
        </p>
        <div class="flex items-center gap-2 mt-2 text-xs font-medium text-[#8B6656]">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-[#7D5A50]/10 text-[#7D5A50] font-semibold">
            Monthly / Yearly
          </span>
          <span>subscriber plans</span>
        </div>
      </div>
    </div>

    <!-- Card 4: Total Revenue -->
    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div class="flex items-center justify-between">
        <span class="font-sans text-xs font-semibold uppercase text-[#9E7060] tracking-wider">Total Revenue</span>
        <div class="w-10 h-10 rounded-xl bg-[#D4EDDA] flex items-center justify-center text-[#28A745]">
          <Icon name="heroicons:currency-dollar" class="w-5 h-5" />
        </div>
      </div>
      <div class="mt-4">
        <p class="font-display text-3xl font-bold text-[#28A745]">
          <span v-if="loading" class="animate-pulse">...</span>
          <span v-else>${{ totalRevenue.toFixed(2) }}</span>
        </p>
        <div class="flex items-center gap-2 mt-2 text-xs font-medium text-[#8B6656]">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
            Gross Billing
          </span>
          <span>lifetime transactions</span>
        </div>
      </div>
    </div>
  </div>
</template>
