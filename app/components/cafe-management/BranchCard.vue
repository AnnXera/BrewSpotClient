<script setup lang="ts">
import { ref, computed } from 'vue'
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

// Hours are cafe-wide, so a row only shows the live open state, and only for active branches.
const { isOpenNow, isLoaded } = useOperatingHours()
const imageError = ref(false)

const status = computed(() => (props.branch.status || 'active').toLowerCase())
const isActive = computed(() => status.value === 'active' || status.value === 'approved')
const statusLabel = computed(() => status.value.replaceAll('_', ' '))

function statusColor(s: string) {
  switch (s) {
    case 'active':
    case 'approved':
      return 'bg-[#D3F5DF] text-[#1F7A45] border-emerald-200'
    case 'suspended':
    case 'inactive':
    case 'rejected':
      return 'bg-red-50 text-red-800 border-red-200'
    case 'pending_approval':
    case 'pending':
      return 'bg-[#FDF0D5] text-[#8A5A0B] border-amber-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}
</script>

<template>
  <div
    @click="emit('view', branch.uuid)"
    class="group grid grid-cols-[auto_minmax(0,1fr)_auto] lg:grid-cols-[auto_minmax(0,2.2fr)_minmax(0,2fr)_minmax(0,1.3fr)_8.5rem_auto] items-center gap-x-4 gap-y-1.5 px-5 sm:px-6 py-4 cursor-pointer transition-colors [@media(hover:hover)]:hover:bg-[#FDF8F3]"
    :class="selected ? 'bg-[#FBF2E1]' : ''"
  >
    <!-- Select -->
    <label class="flex items-center self-center p-1 -m-1 cursor-pointer" @click.stop>
      <input
        type="checkbox"
        :checked="selected"
        @change="emit('update:selected', ($event.target as HTMLInputElement).checked)"
        :aria-label="`Select ${branch.branch_name || 'branch'}`"
        class="w-5 h-5 rounded border-[#D9C4A8] text-[#7D5A50] focus:ring-[#7D5A50] cursor-pointer"
      />
    </label>

    <!-- Branch: photo, name, type -->
    <div class="flex items-center gap-3 min-w-0">
      <div class="w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-[#7D5A50] flex items-center justify-center text-[#FFF8EA]">
        <img
          v-if="branch.cafe_picture && !imageError"
          :src="branch.cafe_picture"
          alt=""
          class="w-full h-full object-cover"
          @error="imageError = true"
        />
        <span v-else class="font-display font-extrabold text-lg uppercase" aria-hidden="true">
          {{ (branch.branch_name || 'B').charAt(0) }}
        </span>
      </div>
      <div class="min-w-0">
        <h3 class="font-display font-extrabold text-[15px] leading-snug text-[#3D2B24] truncate">
          {{ branch.branch_name || 'Unnamed branch' }}
        </h3>
        <p v-if="branch.branch_type" class="text-xs font-semibold text-[#9E7060] capitalize truncate">
          {{ branch.branch_type }}
        </p>
      </div>
    </div>

    <!-- Address -->
    <p class="col-start-2 row-start-3 lg:col-start-auto lg:row-start-auto text-[13px] min-w-0 truncate" :class="branch.address ? 'text-[#5C4037]' : 'text-[#B4846C]'">
      <Icon name="heroicons:map-pin" class="w-3.5 h-3.5 mr-1 -mt-0.5 text-[#B4846C] lg:hidden" />{{ branch.address || 'No address on file' }}
    </p>

    <!-- Manager -->
    <p class="hidden lg:block text-[13px] truncate" :class="branch.manager_name ? 'text-[#5C4037]' : 'text-[#B4846C]'">
      {{ branch.manager_name || 'Unassigned' }}
    </p>


    <!-- State: branch status, plus live open state when the branch is active -->
    <div class="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 col-start-2 row-start-2 lg:flex-col lg:items-start lg:col-start-auto lg:row-start-auto">
      <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize border" :class="statusColor(status)">
        {{ statusLabel }}
      </span>
      <span v-if="isActive && isLoaded" class="inline-flex items-center gap-1.5 text-[11px] font-semibold" :class="isOpenNow ? 'text-emerald-700' : 'text-[#9E7060]'">
        <span class="w-1.5 h-1.5 rounded-full" :class="isOpenNow ? 'bg-emerald-500' : 'bg-[#B4846C]'" aria-hidden="true"></span>
        {{ isOpenNow ? 'Open now' : 'Closed now' }}
      </span>
    </div>

    <!-- Open -->
    <button
      type="button"
      @click.stop="emit('view', branch.uuid)"
      :aria-label="`View details for ${branch.branch_name || 'branch'}`"
      class="col-start-3 row-start-1 lg:col-start-auto lg:row-start-auto inline-flex items-center justify-center w-9 h-9 -mr-2 lg:mr-0 rounded-xl text-[#B4846C] transition-colors group-hover:text-[#7D5A50] [@media(hover:hover)]:hover:bg-[#F3E7D2] outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
    >
      <Icon name="heroicons:chevron-right" class="w-5 h-5" />
    </button>
  </div>
</template>
