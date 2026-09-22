<script setup lang="ts">
import { ref } from 'vue'
import type { BranchSummary } from '~/services/OwnerProfileService'
import { useOperatingHours } from '~/composables/useOperatingHours'

const props = defineProps<{
  branch: BranchSummary
  selected: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selected', val: boolean): void
  (e: 'view', uuid: string): void
}>()

const { formattedSummary, isOpenNow } = useOperatingHours()
const imageError = ref(false)

function statusColor(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'approved':
      return 'bg-[#D3F5DF] text-[#2E9E5B] border-emerald-200'
    case 'suspended':
    case 'inactive':
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'pending_approval':
    case 'pending':
      return 'bg-[#FDF0D5] text-[#D99A2B] border-amber-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}
</script>

<template>
  <div
    tabindex="0"
    @keydown.enter="emit('view', branch.uuid)"
    class="flex flex-col lg:flex-row lg:items-center justify-between border border-[#F3E7D2] rounded-[20px] p-5 sm:p-6 bg-white hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30 group gap-4"
  >
    <div class="flex items-start sm:items-center gap-4 w-full lg:w-auto">
      <!-- Checkbox selection -->
      <div 
        class="flex items-center transition-all duration-300 ease-out overflow-hidden self-center" 
        :class="selected ? 'w-6 opacity-100 mr-1' : 'w-0 opacity-0 group-hover:w-6 group-hover:opacity-100 group-hover:mr-1'"
      >
        <input 
          type="checkbox" 
          :checked="selected" 
          @change="emit('update:selected', ($event.target as HTMLInputElement).checked)"
          class="w-5 h-5 rounded border-[#EEDFC4] text-[#7D5A50] focus:ring-[#7D5A50] shrink-0 cursor-pointer" 
          @click.stop 
        />
      </div>

      <!-- Thumbnail image / fallback initial icon box -->
      <div class="w-16 h-16 shrink-0 bg-gradient-to-br from-[#7D5A50] to-[#B4846C] rounded-2xl overflow-hidden shadow-sm flex items-center justify-center text-white font-extrabold text-xl relative group-hover:scale-105 transition-transform duration-300">
        <img 
          v-if="branch.cafe_picture && !imageError" 
          :src="branch.cafe_picture" 
          :alt="branch.branch_name || 'Branch Image'" 
          class="w-full h-full object-cover" 
          @error="imageError = true" 
        />
        <span v-else class="uppercase font-display tracking-widest text-2xl drop-shadow-xs">
          {{ (branch?.branch_name || 'B').charAt(0) }}
        </span>

        <span 
          class="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs"
          :class="isOpenNow ? 'bg-emerald-500' : 'bg-rose-500'"
          :title="isOpenNow ? 'Currently Open' : 'Currently Closed'"
        ></span>
      </div>
      
      <!-- Branch Info Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <h3 class="font-display font-extrabold text-lg text-[#3D2B24] truncate group-hover:text-[#7D5A50] transition-colors">
            {{ branch?.branch_name || 'Branch Location' }}
          </h3>
          
          <span
            v-if="branch?.branch_type"
            class="bg-[#FBF2E8] text-[#A67E6B] text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-[#EEDFC4]/60"
          >
            {{ branch.branch_type }}
          </span>

          <span
            class="text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize border"
            :class="statusColor(branch?.status || 'active')"
          >
            {{ (branch?.status || 'active').replace('_', ' ') }}
          </span>

          <!-- Live Store Open Status Tag -->
          <span 
            class="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border"
            :class="isOpenNow ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="isOpenNow ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"></span>
            <span>{{ isOpenNow ? 'Open Now' : 'Closed' }}</span>
          </span>
        </div>
        
        <!-- Address & Details -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-xs text-[#9E7060] font-medium mt-1">
          <div class="flex items-center truncate">
            <Icon name="heroicons:map-pin" class="w-4 h-4 mr-1 shrink-0 text-[#B4846C]" />
            <span class="truncate">{{ branch?.address || '214 Caffeine Blvd, Roast District, Brew City' }}</span>
          </div>

          <div v-if="branch?.seating_capacity" class="flex items-center text-[#7D5A50] font-bold shrink-0">
            <Icon name="heroicons:users" class="w-3.5 h-3.5 mr-1 text-[#B4846C]" />
            <span>{{ branch.seating_capacity }} Capacity</span>
          </div>

          <div v-if="branch?.manager_name" class="flex items-center text-[#7D5A50] shrink-0">
            <Icon name="heroicons:user-circle" class="w-3.5 h-3.5 mr-1 text-[#B4846C]" />
            <span>Mgr: {{ branch.manager_name }}</span>
          </div>
        </div>

        <!-- Operating Hours Display Pill -->
        <div class="mt-2 inline-flex items-center gap-1.5 bg-[#FDF8F3] px-3 py-1 rounded-lg border border-[#EEDFC4] text-[11px] font-semibold text-[#7D5A50]">
          <Icon name="heroicons:clock" class="w-3.5 h-3.5 text-[#B4846C]" />
          <span>{{ formattedSummary }}</span>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-2 shrink-0 mt-2 lg:mt-0 ml-auto lg:ml-4 w-full sm:w-auto justify-end border-t lg:border-t-0 border-[#F3E7D2] pt-3 lg:pt-0">
      <NuxtLink 
        to="/owner/menu-management"
        @click.stop
        class="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#EEDFC4] text-[#7D5A50] bg-white rounded-xl hover:bg-[#FDF3E7] transition-all text-xs font-bold"
      >
        <Icon name="heroicons:book-open" class="w-4 h-4 text-[#B4846C]" />
        <span>Menu</span>
      </NuxtLink>

      <button 
        @click="emit('view', branch.uuid)"
        :aria-label="'View details for ' + (branch?.branch_name || 'branch')"
        class="inline-flex items-center gap-1.5 px-4 py-2 border border-[#7D5A50] text-[#7D5A50] bg-white rounded-xl hover:bg-[#7D5A50] hover:text-white transition-all text-xs font-bold shadow-xs group/btn"
      >
        <span>View Details</span>
        <Icon name="heroicons:arrow-right" class="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
      </button>
    </div>
  </div>
</template>
