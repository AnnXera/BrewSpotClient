<script setup lang="ts">
import type { ApprovalListItem } from '~/services/OwnerManagementService'

defineProps<{
  approvals: ApprovalListItem[]
  loading?: boolean
}>()

function formatDate(val?: string | null): string {
  if (!val) return 'Recent'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  } catch {
    return val
  }
}
</script>

<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
    <!-- Card Header -->
    <div class="p-6 border-b border-[#F3E7D2] flex items-center justify-between bg-[#FFFDF9]">
      <div>
        <h3 class="font-display text-lg font-bold text-[#3B1F0E] flex items-center gap-2">
          <span>Pending Approvals Awaiting Review</span>
          <span v-if="approvals.length" class="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold">
            {{ approvals.length }} New
          </span>
        </h3>
        <p class="font-sans text-xs text-[#8B6656] mt-0.5">Recent business registration applications submitted by cafe owners</p>
      </div>

      <NuxtLink
        to="/admin/approvals"
        class="text-xs font-semibold text-[#7D5A50] hover:text-[#684940] flex items-center gap-1 transition-colors"
      >
        View All
        <Icon name="heroicons:chevron-right" class="w-4 h-4" />
      </NuxtLink>
    </div>

    <!-- Table content -->
    <div class="overflow-x-auto flex-1">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-[#FFF0D1]/60 border-b border-[#F3E7D2]">
            <th class="font-sans text-[11px] font-semibold text-[#9E7060] uppercase px-6 py-3">Applicant Name</th>
            <th class="font-sans text-[11px] font-semibold text-[#9E7060] uppercase px-6 py-3">Cafe / Business Name</th>
            <th class="font-sans text-[11px] font-semibold text-[#9E7060] uppercase px-6 py-3">Submitted Date</th>
            <th class="font-sans text-[11px] font-semibold text-[#9E7060] uppercase px-6 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="px-6 py-8 text-center text-xs text-[#8B6656]">
              <div class="flex items-center justify-center gap-2">
                <Icon name="heroicons:arrow-path" class="w-4 h-4 animate-spin text-[#7D5A50]" />
                <span>Loading approvals stream...</span>
              </div>
            </td>
          </tr>

          <tr v-else-if="!approvals.length">
            <td colspan="4" class="px-6 py-8 text-center text-xs text-[#8B6656]/70">
              No applications currently pending approval.
            </td>
          </tr>

          <tr
            v-for="item in approvals.slice(0, 5)"
            :key="item.uuid"
            class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FFFDF9] transition-colors"
          >
            <td class="px-6 py-4 font-sans text-xs font-bold text-[#3B1F0E]">
              <div>
                <p>{{ item.user ? `${item.user.firstname} ${item.user.lastname}` : 'Cafe Owner' }}</p>
                <p class="text-[11px] font-normal text-[#8B6656] truncate max-w-[160px]">{{ item.user?.email }}</p>
              </div>
            </td>

            <td class="px-6 py-4 font-sans text-xs font-semibold text-[#7D5A50]">
              {{ item.cafe?.cafe_name || item.branch?.branch_name || 'BrewSpot Cafe' }}
            </td>

            <td class="px-6 py-4 font-sans text-xs text-[#8B6656] whitespace-nowrap">
              {{ formatDate(item.created_at) }}
            </td>

            <td class="px-6 py-4 text-right whitespace-nowrap">
              <NuxtLink
                to="/admin/approvals"
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7D5A50] text-[#FFF0D1] hover:bg-[#684940] transition-colors"
              >
                <span>Review</span>
                <Icon name="heroicons:arrow-right" class="w-3.5 h-3.5" />
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
