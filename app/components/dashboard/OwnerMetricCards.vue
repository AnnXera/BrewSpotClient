<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  totalBranches: number
  activeBranches: number
  totalMenuItems: number
  subscriptionPlan: string
  totalEarnings: number
  loading?: boolean
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <!-- Card 1: Total Branches -->
    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div class="flex items-center justify-between">
        <span class="font-sans text-xs font-semibold uppercase text-[#9E7060] tracking-wider">Total Branches</span>
        <div class="w-10 h-10 rounded-xl bg-[#FFF0D1] flex items-center justify-center text-[#7D5A50]">
          <Icon name="heroicons:building-storefront" class="w-5 h-5" />
        </div>
      </div>
      <div class="mt-4">
        <p class="font-display text-3xl font-bold text-[#3B1F0E]">
          <span v-if="loading" class="animate-pulse">...</span>
          <span v-else>{{ totalBranches }}</span>
        </p>
        <div class="flex items-center gap-2 mt-2 text-xs font-medium text-[#8B6656]">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
            {{ activeBranches }} Active
          </span>
          <span>registered branches</span>
        </div>
      </div>
    </div>

    <!-- Card 2: Menu Items -->
    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div class="flex items-center justify-between">
        <span class="font-sans text-xs font-semibold uppercase text-[#9E7060] tracking-wider">Menu Items</span>
        <div class="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
          <Icon name="heroicons:book-open" class="w-5 h-5" />
        </div>
      </div>
      <div class="mt-4">
        <p class="font-display text-3xl font-bold text-[#3B1F0E]">
          <span v-if="loading" class="animate-pulse">...</span>
          <span v-else>{{ totalMenuItems }}</span>
        </p>
        <div class="flex items-center gap-2 mt-2 text-xs font-medium text-[#8B6656]">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFF0D1] text-[#7D5A50] font-semibold">
            Menu
          </span>
          <span>items in catalog</span>
        </div>
      </div>
    </div>

    <!-- Card 3: Subscription Plan -->
    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div class="flex items-center justify-between">
        <span class="font-sans text-xs font-semibold uppercase text-[#9E7060] tracking-wider">Current Plan</span>
        <div class="w-10 h-10 rounded-xl bg-[#D4EDDA] flex items-center justify-center text-[#28A745]">
          <Icon name="heroicons:credit-card" class="w-5 h-5" />
        </div>
      </div>
      <div class="mt-4">
        <p class="font-display text-xl font-bold text-[#28A745] truncate">
          <span v-if="loading" class="animate-pulse">...</span>
          <span v-else>{{ subscriptionPlan || 'No Active Plan' }}</span>
        </p>
        <div class="flex items-center gap-2 mt-2 text-xs font-medium text-[#8B6656]">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold" v-if="subscriptionPlan">
            Active
          </span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold" v-else>
            Inactive
          </span>
          <span>subscription status</span>
        </div>
      </div>
    </div>

    <!-- Card 4: Total Earnings -->
    <div class="bg-gradient-to-br from-emerald-600 to-emerald-800 border border-emerald-700 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-white flex flex-col justify-between">
      <div class="flex items-center justify-between">
        <span class="font-sans text-xs font-semibold uppercase text-emerald-100 tracking-wider">Total Earnings</span>
        <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
          <Icon name="heroicons:currency-dollar" class="w-5 h-5" />
        </div>
      </div>
      <div class="mt-4">
        <p class="font-display text-3xl font-bold text-white truncate">
          <span v-if="loading" class="animate-pulse">...</span>
          <span v-else>₱{{ totalEarnings.toLocaleString() }}</span>
        </p>
        <div class="flex items-center gap-2 mt-2 text-xs font-medium text-emerald-100">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold">
            All time
          </span>
          <span>revenue generated</span>
        </div>
      </div>
    </div>
  </div>
</template>
