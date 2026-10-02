<script setup lang="ts">
import type { BranchSummary } from '~/services/OwnerProfileService'

defineProps<{
  branches: BranchSummary[]
  loading?: boolean
}>()

function getStatusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-800'
    case 'pending':
    case 'pending_approval':
      return 'bg-amber-100 text-amber-800'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
</script>

<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl shadow-sm overflow-hidden flex flex-col">
    <div class="p-5 border-b border-[#EEDFC4] flex items-center justify-between">
      <div>
        <h3 class="font-display font-semibold text-[#3B1F0E]">Recent Branches</h3>
        <p class="text-xs text-[#8B6656] mt-1">Overview of your registered branches</p>
      </div>
      <NuxtLink to="/owner/cafes" class="text-sm font-semibold text-[#7D5A50] hover:text-[#5A3F37] transition-colors">
        View All &rarr;
      </NuxtLink>
    </div>

    <div class="p-0 flex-1">
      <table class="w-full text-left text-sm">
        <thead class="bg-[#FDF3E7] text-[#8B6656] font-semibold">
          <tr>
            <th class="px-5 py-3 border-b border-[#EEDFC4]">Branch Name</th>
            <th class="px-5 py-3 border-b border-[#EEDFC4]">Type</th>
            <th class="px-5 py-3 border-b border-[#EEDFC4]">Status</th>
            <th class="px-5 py-3 border-b border-[#EEDFC4] text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#EEDFC4]">
          <tr v-if="loading">
            <td colspan="4" class="px-5 py-8 text-center text-[#8B6656]">
              <Icon name="heroicons:arrow-path" class="w-6 h-6 mx-auto animate-spin mb-2" />
              <p>Loading branches...</p>
            </td>
          </tr>
          <tr v-else-if="!branches.length">
            <td colspan="4" class="px-5 py-8 text-center text-[#8B6656]">
              <Icon name="heroicons:building-storefront" class="w-6 h-6 mx-auto mb-2 text-[#D4C3B3]" />
              <p>No branches found.</p>
            </td>
          </tr>
          <tr
            v-else
            v-for="branch in branches"
            :key="branch.uuid"
            class="hover:bg-[#FDF3E7]/50 transition-colors"
          >
            <td class="px-5 py-4 text-[#3B1F0E] font-medium flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                <img v-if="branch.cafe_picture" :src="branch.cafe_picture" alt="" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full bg-[#EEDFC4] flex items-center justify-center text-[#7D5A50] font-bold text-xs">
                  {{ branch.branch_name.charAt(0) }}
                </div>
              </div>
              {{ branch.branch_name }}
            </td>
            <td class="px-5 py-4 text-[#684940] capitalize">
              {{ branch.branch_type }}
            </td>
            <td class="px-5 py-4">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide"
                :class="getStatusBadgeClass(branch.status)"
              >
                {{ branch.status.replace('_', ' ') }}
              </span>
            </td>
            <td class="px-5 py-4 text-right">
              <NuxtLink :to="`/owner/branches/${branch.uuid}`" class="inline-flex items-center justify-center p-1.5 text-[#8B6656] hover:text-[#3B1F0E] hover:bg-[#EEDFC4] rounded-lg transition-colors">
                <Icon name="heroicons:eye" class="w-5 h-5" />
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
