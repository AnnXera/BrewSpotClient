<!-- Every application and branch submission an owner made, newest first, as a timeline. -->
<script lang="ts">
export interface ApplicationHistoryEntry {
  uuid: string
  kind: 'application' | 'resubmission' | 'branch' | 'branch_resubmission' | 'name_change' | 'address_change'
  status: 'pending_approval' | 'approved' | 'rejected' | 'withdrawn'
  branch_name: string | null
  reason: string | null
  can_resubmit: boolean
  submitted_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
}
</script>

<script setup lang="ts">
defineProps<{ entries: ApplicationHistoryEntry[] }>()

const KIND: Record<ApplicationHistoryEntry['kind'], { label: string; icon: string }> = {
  application: { label: 'Owner application', icon: 'heroicons:user-plus' },
  resubmission: { label: 'Resubmitted application', icon: 'heroicons:arrow-path-rounded-square' },
  branch: { label: 'Branch submission', icon: 'heroicons:building-storefront' },
  branch_resubmission: { label: 'Branch resubmission', icon: 'heroicons:arrow-path-rounded-square' },
  name_change: { label: 'Cafe name change', icon: 'heroicons:pencil-square' }, // branch_name holds "old → new"
  address_change: { label: 'Branch address change', icon: 'heroicons:map-pin' }, // branch_name holds "branch → new address"
}

const DOT: Record<ApplicationHistoryEntry['status'], string> = {
  approved: 'bg-[#D4EDDA] text-[#28A745] border-[#A9D8B4]',
  rejected: 'bg-[#FDE8E8] text-[#DC3545] border-[#F2B8BD]',
  pending_approval: 'bg-[#F0E8E5] text-[#B4846C] border-[#E2CFC6]',
  withdrawn: 'bg-[#F0E3CE] text-[#8B6656] border-[#E3D2B8]',
}

const fmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const when = (iso: string | null) => (iso ? fmt.format(new Date(iso)) : null)
</script>

<template>
  <section class="bg-white border border-[#EEDFC4] rounded-2xl md:rounded-3xl shadow-sm p-4 sm:p-6">
    <div class="flex items-baseline justify-between gap-3 mb-4">
      <h2 class="font-display font-bold text-[#3D2B24] text-lg md:text-xl">Application History</h2>
      <span class="font-sans text-xs text-[#9E7060]">Newest first</span>
    </div>

    <p v-if="!entries.length" class="py-8 text-center font-sans text-sm text-[#9E7060]">
      No applications on record for this owner.
    </p>

    <ol v-else class="relative">
      <li v-for="(e, i) in entries" :key="e.uuid" class="relative flex gap-3 sm:gap-4 pb-5 last:pb-0">
        <!-- Rail between entries -->
        <span v-if="i < entries.length - 1" class="absolute left-[17px] top-9 bottom-0 w-px bg-[#EEDFC4]" aria-hidden="true" />

        <span class="relative z-10 w-9 h-9 rounded-full border flex items-center justify-center shrink-0" :class="DOT[e.status] ?? 'bg-[#F0E3CE] text-[#8B6656] border-[#E3D2B8]'">
          <Icon :name="KIND[e.kind]?.icon ?? 'heroicons:document-text'" class="w-4 h-4" />
        </span>

        <div class="min-w-0 flex-1 rounded-xl border border-[#F3E7D2] bg-[#FFFCF7] px-3.5 py-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="min-w-0">
              <p class="font-display font-semibold text-[#3D2B24] text-sm sm:text-[15px]">{{ KIND[e.kind]?.label ?? e.kind }}</p>
              <p v-if="e.branch_name" class="font-sans text-xs text-[#8B6656] truncate">{{ e.branch_name }}</p>
            </div>
            <StatusBadge :status="e.status" />
          </div>

          <dl class="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 font-sans text-xs">
            <div class="flex gap-1.5">
              <dt class="text-[#9E7060]">Submitted</dt>
              <dd class="text-[#3D2B24] font-medium">{{ when(e.submitted_at) ?? '—' }}</dd>
            </div>
            <div class="flex gap-1.5">
              <dt class="text-[#9E7060]">Reviewed</dt>
              <dd class="text-[#3D2B24] font-medium">
                <template v-if="e.reviewed_at">{{ when(e.reviewed_at) }}<template v-if="e.reviewed_by"> by {{ e.reviewed_by }}</template></template>
                <template v-else-if="e.status === 'withdrawn'">Withdrawn by the owner before review</template>
                <template v-else>Waiting for review</template>
              </dd>
            </div>
          </dl>

          <div v-if="e.status === 'rejected'" class="mt-2.5 rounded-lg bg-[#FDF1F1] border border-[#F6D3D6] px-3 py-2 font-sans text-xs text-[#8A2A33]">
            <p><span class="font-semibold">Reason:</span> {{ e.reason || 'No reason given' }}</p>
            <p class="mt-0.5 text-[#A2535B]">{{ e.can_resubmit ? 'Owner was allowed to resubmit.' : 'Resubmission was not allowed.' }}</p>
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>
