<!-- app/components/owner-detail/BranchCard.vue -->
<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#D4C3A3]">
    <!-- Left: Thumbnail & Info -->
    <div class="flex items-center gap-3.5 sm:gap-4 min-w-0">
      <!-- Thumbnail -->
      <img
        v-if="branch.cafe_picture"
        :src="branch.cafe_picture"
        :alt="displayName"
        class="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 border border-[#EDD8CC]"
      />
      <div
        v-else
        class="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#F4ECE1] border border-[#EDD8CC] flex items-center justify-center shrink-0"
      >
        <Icon name="heroicons:building-storefront" class="w-7 h-7 text-[#9E7060]" />
      </div>

      <!-- Info -->
      <div class="min-w-0 flex-1">
        <!-- Name + Badges -->
        <div class="flex flex-wrap items-center gap-2 mb-1.5">
          <p class="font-display text-base sm:text-[18px] font-bold text-[#3D2B24] truncate">
            {{ displayName }}
          </p>

          <!-- Branch Type Badge (MAIN / SIDE) -->
          <span
            v-if="branch.branch_type"
            class="px-2 py-0.5 rounded-md bg-[#F5EBE1] text-[#9E7060] font-display font-bold text-[11px] uppercase tracking-wider shrink-0"
          >
            {{ branch.branch_type }}
          </span>

          <!-- Status Badge -->
          <StatusBadge :status="branch.status" />
        </div>

        <!-- Address with Location Pin -->
        <div class="flex items-center gap-1.5 text-[#9E7060] text-xs sm:text-sm font-medium">
          <Icon name="heroicons:map-pin" class="w-4 h-4 text-[#9E7060] shrink-0" />
          <span class="truncate">{{ branch.address || '—' }}</span>
        </div>
      </div>
    </div>

    <!-- Right: View Details Button -->
    <div class="shrink-0 flex sm:justify-end">
      <button
        type="button"
        class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-[#8B6656] text-[#6D4C41] font-display font-semibold text-xs sm:text-sm hover:bg-[#FDF3E7] hover:text-[#3D2B24] transition-colors cursor-pointer"
        @click="emit('viewDetails', branch)"
      >
        <span>View Details</span>
        <Icon name="heroicons:arrow-right" class="w-4 h-4 text-current" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface Branch {
  uuid: string
  branch_name: string
  cafe_name?: string
  status: string
  address: string | null
  cafe_phonenumber: string | null
  cafe_email: string | null
  cafe_picture?: string | null
  branch_type?: string | null
  documents?: any[]
}

const props = defineProps<{
  branch: Branch
}>()

const emit = defineEmits<{
  viewDetails: [branch: Branch]
}>()

const displayName = computed(() => {
  const bName = props.branch.branch_name || ''
  const cName = props.branch.cafe_name || ''
  
  if (cName && bName) {
    if (bName.toLowerCase().startsWith(cName.toLowerCase())) {
      return bName
    }
    return `${cName} - ${props.branch.branch_type === 'main' ? 'Main' : bName}`
  }
  return bName || cName || 'Branch'
})
</script>
