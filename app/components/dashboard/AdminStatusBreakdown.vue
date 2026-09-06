<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  approvalStats: {
    pending_approval: number
    approved: number
    rejected: number
  }
  ownerStats: {
    total_owners: number
    active: number
    suspended: number
    inactive: number
  }
}>()

const totalApprovals = computed(() => {
  return (props.approvalStats.pending_approval || 0) + (props.approvalStats.approved || 0) + (props.approvalStats.rejected || 0) || 1
})

const pendingPct = computed(() => Math.round(((props.approvalStats.pending_approval || 0) / totalApprovals.value) * 100))
const approvedPct = computed(() => Math.round(((props.approvalStats.approved || 0) / totalApprovals.value) * 100))
const rejectedPct = computed(() => Math.round(((props.approvalStats.rejected || 0) / totalApprovals.value) * 100))

const totalOwnersCalc = computed(() => props.ownerStats.total_owners || 1)
const activeOwnerPct = computed(() => Math.round(((props.ownerStats.active || 0) / totalOwnersCalc.value) * 100))
const suspendedOwnerPct = computed(() => Math.round(((props.ownerStats.suspended || 0) / totalOwnersCalc.value) * 100))
const inactiveOwnerPct = computed(() => Math.round(((props.ownerStats.inactive || 0) / totalOwnersCalc.value) * 100))
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
    <!-- Registration Approvals Breakdown Card -->
    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-display text-lg font-bold text-[#3B1F0E]">Registration Approvals Breakdown</h3>
          <p class="font-sans text-xs text-[#8B6656] mt-0.5">Overall status of owner application verifications</p>
        </div>
        <NuxtLink
          to="/admin/approvals"
          class="text-xs font-semibold text-[#7D5A50] hover:text-[#684940] flex items-center gap-1 transition-colors"
        >
          Manage Approvals
          <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5" />
        </NuxtLink>
      </div>

      <!-- Multi-segment progress bar -->
      <div class="w-full bg-gray-100 rounded-full h-3 flex overflow-hidden mb-6 border border-gray-200/60">
        <div class="bg-emerald-500 transition-all duration-500" :style="{ width: `${approvedPct}%` }" title="Approved"></div>
        <div class="bg-amber-400 transition-all duration-500" :style="{ width: `${pendingPct}%` }" title="Pending"></div>
        <div class="bg-rose-500 transition-all duration-500" :style="{ width: `${rejectedPct}%` }" title="Rejected"></div>
      </div>

      <!-- Details List -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-[#FFF0D1]/50 border border-[#EEDFC4] p-3 rounded-xl">
          <div class="flex items-center gap-1.5 text-xs text-[#9E7060] font-semibold">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            Approved
          </div>
          <p class="font-display text-xl font-bold text-[#3B1F0E] mt-1">{{ approvalStats.approved || 0 }}</p>
          <p class="text-[11px] text-[#8B6656] mt-0.5">{{ approvedPct }}% of total</p>
        </div>

        <div class="bg-[#FFF0D1]/50 border border-[#EEDFC4] p-3 rounded-xl">
          <div class="flex items-center gap-1.5 text-xs text-[#9E7060] font-semibold">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            Pending
          </div>
          <p class="font-display text-xl font-bold text-[#3B1F0E] mt-1">{{ approvalStats.pending_approval || 0 }}</p>
          <p class="text-[11px] text-[#8B6656] mt-0.5">{{ pendingPct }}% of total</p>
        </div>

        <div class="bg-[#FFF0D1]/50 border border-[#EEDFC4] p-3 rounded-xl">
          <div class="flex items-center gap-1.5 text-xs text-[#9E7060] font-semibold">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            Rejected
          </div>
          <p class="font-display text-xl font-bold text-[#3B1F0E] mt-1">{{ approvalStats.rejected || 0 }}</p>
          <p class="text-[11px] text-[#8B6656] mt-0.5">{{ rejectedPct }}% of total</p>
        </div>
      </div>
    </div>

    <!-- Owner Accounts Health Breakdown Card -->
    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-display text-lg font-bold text-[#3B1F0E]">Cafe Owner Account Status</h3>
          <p class="font-sans text-xs text-[#8B6656] mt-0.5">Distribution of registered cafe owner accounts</p>
        </div>
        <NuxtLink
          to="/admin/owners"
          class="text-xs font-semibold text-[#7D5A50] hover:text-[#684940] flex items-center gap-1 transition-colors"
        >
          Manage Owners
          <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5" />
        </NuxtLink>
      </div>

      <!-- Multi-segment progress bar -->
      <div class="w-full bg-gray-100 rounded-full h-3 flex overflow-hidden mb-6 border border-gray-200/60">
        <div class="bg-emerald-600 transition-all duration-500" :style="{ width: `${activeOwnerPct}%` }" title="Active"></div>
        <div class="bg-amber-500 transition-all duration-500" :style="{ width: `${suspendedOwnerPct}%` }" title="Suspended"></div>
        <div class="bg-gray-400 transition-all duration-500" :style="{ width: `${inactiveOwnerPct}%` }" title="Inactive"></div>
      </div>

      <!-- Details List -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-[#FFF0D1]/50 border border-[#EEDFC4] p-3 rounded-xl">
          <div class="flex items-center gap-1.5 text-xs text-[#9E7060] font-semibold">
            <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
            Active
          </div>
          <p class="font-display text-xl font-bold text-[#3B1F0E] mt-1">{{ ownerStats.active || 0 }}</p>
          <p class="text-[11px] text-[#8B6656] mt-0.5">{{ activeOwnerPct }}% of total</p>
        </div>

        <div class="bg-[#FFF0D1]/50 border border-[#EEDFC4] p-3 rounded-xl">
          <div class="flex items-center gap-1.5 text-xs text-[#9E7060] font-semibold">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            Suspended
          </div>
          <p class="font-display text-xl font-bold text-[#3B1F0E] mt-1">{{ ownerStats.suspended || 0 }}</p>
          <p class="text-[11px] text-[#8B6656] mt-0.5">{{ suspendedOwnerPct }}% of total</p>
        </div>

        <div class="bg-[#FFF0D1]/50 border border-[#EEDFC4] p-3 rounded-xl">
          <div class="flex items-center gap-1.5 text-xs text-[#9E7060] font-semibold">
            <span class="w-2 h-2 rounded-full bg-gray-400"></span>
            Inactive
          </div>
          <p class="font-display text-xl font-bold text-[#3B1F0E] mt-1">{{ ownerStats.inactive || 0 }}</p>
          <p class="text-[11px] text-[#8B6656] mt-0.5">{{ inactiveOwnerPct }}% of total</p>
        </div>
      </div>
    </div>
  </div>
</template>
