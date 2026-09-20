<script setup lang="ts">
import type { BranchSummary } from '~/services/OwnerProfileService'

const props = defineProps<{
  branch: BranchSummary
  selected: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selected', val: boolean): void
  (e: 'view', uuid: string): void
}>()

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
    case 'approved':
      return 'bg-[#D3F5DF] text-[#2E9E5B]'
    case 'suspended':
    case 'inactive':
    case 'rejected':
      return 'bg-red-100 text-red-800'
    case 'pending_approval':
      return 'bg-[#FDF0D5] text-[#D99A2B]'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
</script>

<template>
  <div
    tabindex="0"
    @keydown.enter="emit('view', branch.uuid)"
    class="flex flex-col sm:flex-row items-center border border-[#F3E7D2] rounded-xl px-6 py-6 hover:shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-[#805B4C]/40 group"
  >
    <div 
      class="flex items-center transition-all duration-300 ease-out overflow-hidden" 
      :class="selected ? 'w-6 opacity-100 mr-3' : 'w-0 opacity-0 group-hover:w-6 group-hover:opacity-100 group-hover:mr-3'"
    >
      <input 
        type="checkbox" 
        :checked="selected" 
        @change="emit('update:selected', ($event.target as HTMLInputElement).checked)"
        class="w-5 h-5 rounded border-[#EEDFC4] text-[#805B4C] focus:ring-[#805B4C] shrink-0" 
        @click.stop 
      />
    </div>

    <div class="w-16 h-16 shrink-0 bg-[#BE9D8B] rounded-xl overflow-hidden shadow-sm">
      <img v-if="branch.cafe_picture" :src="branch.cafe_picture" :alt="branch.branch_name" class="w-full h-full object-cover" @error="$event.target.style.display = 'none'" />
    </div>
    
    <div class="flex-1 min-w-0 ml-2">
      <div class="flex items-center gap-2.5 mb-1.5">
        <h3 class="font-display font-extrabold text-[17px] text-[#3D2B24] truncate">{{ branch.branch_name }}</h3>
        <span
          v-if="branch.branch_type"
          class="bg-[#F6ECE4] text-[#A67E6B] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase"
        >
          {{ branch.branch_type }}
        </span>
        <span
          class="text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize"
          :class="statusColor(branch.status)"
        >
          {{ branch.status.replace('_', ' ') }}
        </span>
      </div>
      
      <div class="flex items-center text-[#A67E6B] text-[13px] font-medium">
        <Icon name="heroicons:map-pin" class="w-4 h-4 mr-1 shrink-0" />
        <span class="truncate">{{ branch.address || 'No address provided' }}</span>
      </div>
    </div>

    <div class="shrink-0 mt-4 sm:mt-0 ml-auto">
      <button 
        @click="emit('view', branch.uuid)"
        :aria-label="'View details for ' + branch.branch_name"
        class="inline-flex items-center gap-1.5 px-4 py-2 border border-[#9E7060] text-[#9E7060] rounded-lg hover:bg-[#FDF3E7] transition-colors text-[13px] font-semibold"
      >
        View Details
        <Icon name="heroicons:arrow-right" class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
