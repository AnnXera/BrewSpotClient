<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  ownerApprovalStats: {
    pending_approval: number
    approved: number
    rejected: number
  }
  branchApprovalStats: {
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

// Owner Registration Approvals
const totalOwnerApprovals = computed(() => {
  return (props.ownerApprovalStats.pending_approval || 0) + (props.ownerApprovalStats.approved || 0) + (props.ownerApprovalStats.rejected || 0) || 1
})
const ownerPendingPct = computed(() => Math.round(((props.ownerApprovalStats.pending_approval || 0) / totalOwnerApprovals.value) * 100))
const ownerApprovedPct = computed(() => Math.round(((props.ownerApprovalStats.approved || 0) / totalOwnerApprovals.value) * 100))
const ownerRejectedPct = computed(() => Math.round(((props.ownerApprovalStats.rejected || 0) / totalOwnerApprovals.value) * 100))

// Branch Registration Approvals
const totalBranchApprovals = computed(() => {
  return (props.branchApprovalStats.pending_approval || 0) + (props.branchApprovalStats.approved || 0) + (props.branchApprovalStats.rejected || 0) || 1
})
const branchPendingPct = computed(() => Math.round(((props.branchApprovalStats.pending_approval || 0) / totalBranchApprovals.value) * 100))
const branchApprovedPct = computed(() => Math.round(((props.branchApprovalStats.approved || 0) / totalBranchApprovals.value) * 100))
const branchRejectedPct = computed(() => Math.round(((props.branchApprovalStats.rejected || 0) / totalBranchApprovals.value) * 100))

// Cafe Owner Status
const totalOwnersCalc = computed(() => props.ownerStats.total_owners || 1)
const activeOwnerPct = computed(() => Math.round(((props.ownerStats.active || 0) / totalOwnersCalc.value) * 100))
const suspendedOwnerPct = computed(() => Math.round(((props.ownerStats.suspended || 0) / totalOwnersCalc.value) * 100))
const inactiveOwnerPct = computed(() => Math.round(((props.ownerStats.inactive || 0) / totalOwnersCalc.value) * 100))
</script>

<template>
  <div class="mb-8">
    <!-- Top Row: Owner Accounts Health Breakdown Card -->
    <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm mb-6">
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
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
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

    <!-- Bottom Row: Registration Approvals Breakdown Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Owner Registration Approvals Breakdown -->
      <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-display text-lg font-bold text-[#3B1F0E]">Owner Registration Approvals</h3>
            <p class="font-sans text-xs text-[#8B6656] mt-0.5">Status of cafe owner applications</p>
          </div>
          <NuxtLink
            to="/admin/approvals?type=owner"
            class="text-xs font-semibold text-[#7D5A50] hover:text-[#684940] flex items-center gap-1 transition-colors"
          >
            Manage
            <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>

        <!-- Multi-segment progress bar -->
        <div class="w-full bg-gray-100 rounded-full h-3 flex overflow-hidden mb-6 border border-gray-200/60">
          <div class="bg-emerald-500 transition-all duration-500" :style="{ width: `${ownerApprovedPct}%` }" title="Approved"></div>
          <div class="bg-amber-400 transition-all duration-500" :style="{ width: `${ownerPendingPct}%` }" title="Pending"></div>
          <div class="bg-rose-500 transition-all duration-500" :style="{ width: `${ownerRejectedPct}%` }" title="Rejected"></div>
        </div>

        <!-- Details List -->
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-[#FFF0D1]/50 border border-[#EEDFC4] p-3 rounded-xl">
            <div class="flex items-center gap-1.5 text-xs text-[#9E7060] font-semibold">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Approved
            </div>
            <p class="font-display text-xl font-bold text-[#3B1F0E] mt-1">{{ ownerApprovalStats.approved || 0 }}</p>
            <p class="text-[11px] text-[#8B6656] mt-0.5">{{ ownerApprovedPct }}% of total</p>
          </div>

          <div class="bg-[#FFF0D1]/50 border border-[#EEDFC4] p-3 rounded-xl">
            <div class="flex items-center gap-1.5 text-xs text-[#9E7060] font-semibold">
              <span class="w-2 h-2 rounded-full bg-amber-400"></span>
              Pending
            </div>
            <p class="font-display text-xl font-bold text-[#3B1F0E] mt-1">{{ ownerApprovalStats.pending_approval || 0 }}</p>
            <p class="text-[11px] text-[#8B6656] mt-0.5">{{ ownerPendingPct }}% of total</p>
          </div>

          <div class="bg-[#FFF0D1]/50 border border-[#EEDFC4] p-3 rounded-xl">
            <div class="flex items-center gap-1.5 text-xs text-[#9E7060] font-semibold">
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
              Rejected
            </div>
            <p class="font-display text-xl font-bold text-[#3B1F0E] mt-1">{{ ownerApprovalStats.rejected || 0 }}</p>
            <p class="text-[11px] text-[#8B6656] mt-0.5">{{ ownerRejectedPct }}% of total</p>
          </div>
        </div>
      </div>

      <!-- Branch Registration Approvals Breakdown -->
      <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-display text-lg font-bold text-[#3B1F0E]">Branch Registration Approvals</h3>
            <p class="font-sans text-xs text-[#8B6656] mt-0.5">Status of new branch applications</p>
          </div>
          <NuxtLink
            to="/admin/approvals?type=branch"
            class="text-xs font-semibold text-[#7D5A50] hover:text-[#684940] flex items-center gap-1 transition-colors"
          >
            Manage
            <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>

        <!-- Multi-segment progress bar -->
        <div class="w-full bg-gray-100 rounded-full h-3 flex overflow-hidden mb-6 border border-gray-200/60">
          <div class="bg-emerald-500 transition-all duration-500" :style="{ width: `${branchApprovedPct}%` }" title="Approved"></div>
          <div class="bg-amber-400 transition-all duration-500" :style="{ width: `${branchPendingPct}%` }" title="Pending"></div>
          <div class="bg-rose-500 transition-all duration-500" :style="{ width: `${branchRejectedPct}%` }" title="Rejected"></div>
        </div>

        <!-- Details List -->
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-[#FFF0D1]/50 border border-[#EEDFC4] p-3 rounded-xl">
            <div class="flex items-center gap-1.5 text-xs text-[#9E7060] font-semibold">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Approved
            </div>
            <p class="font-display text-xl font-bold text-[#3B1F0E] mt-1">{{ branchApprovalStats.approved || 0 }}</p>
            <p class="text-[11px] text-[#8B6656] mt-0.5">{{ branchApprovedPct }}% of total</p>
          </div>

          <div class="bg-[#FFF0D1]/50 border border-[#EEDFC4] p-3 rounded-xl">
            <div class="flex items-center gap-1.5 text-xs text-[#9E7060] font-semibold">
              <span class="w-2 h-2 rounded-full bg-amber-400"></span>
              Pending
            </div>
            <p class="font-display text-xl font-bold text-[#3B1F0E] mt-1">{{ branchApprovalStats.pending_approval || 0 }}</p>
            <p class="text-[11px] text-[#8B6656] mt-0.5">{{ branchPendingPct }}% of total</p>
          </div>

          <div class="bg-[#FFF0D1]/50 border border-[#EEDFC4] p-3 rounded-xl">
            <div class="flex items-center gap-1.5 text-xs text-[#9E7060] font-semibold">
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
              Rejected
            </div>
            <p class="font-display text-xl font-bold text-[#3B1F0E] mt-1">{{ branchApprovalStats.rejected || 0 }}</p>
            <p class="text-[11px] text-[#8B6656] mt-0.5">{{ branchRejectedPct }}% of total</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
