<script setup lang="ts">
import { ref, computed } from 'vue'
import type { BranchSummary } from '~/services/OwnerProfileService'
import { useOperatingHours } from '~/composables/useOperatingHours'
import { isOperationalBranchStatus } from '~/utils/branchStatus'

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
// Pending and rejected branches are admin-controlled: not selectable for bulk status changes
const selectable = computed(() => isOperationalBranchStatus(status.value))

// Same pill style as the admin Owner Management table: soft fill, matching border, coloured dot.
function statusMeta(s: string) {
  switch (s) {
    case 'active':
    case 'approved':
      return { badge: 'bg-[#E8F7EE] text-[#28A745] border-[#C3ECD3]', dot: 'bg-[#28A745] animate-pulse' }
    case 'suspended':
    case 'rejected':
      return { badge: 'bg-[#FDE8E8] text-[#DC3545] border-[#F8B4B4]', dot: 'bg-[#DC3545]' }
    case 'pending_approval':
    case 'pending':
      return { badge: 'bg-[#FDF0D5] text-[#8A5A0B] border-[#F3D9A4]', dot: 'bg-[#D9962B]' }
    default: // inactive and anything else
      return { badge: 'bg-[#F0E3CE] text-[#8B6656] border-[#E4D1B8]', dot: 'bg-[#8B6656]' }
  }
}
</script>

<template>
  <div
    @click="emit('view', branch.uuid)"
    class="group grid grid-cols-[auto_minmax(0,1fr)_auto] lg:grid-cols-[auto_minmax(0,2.2fr)_minmax(0,2fr)_minmax(0,1.3fr)_8.5rem_auto] items-center gap-x-4 gap-y-1.5 px-5 sm:px-6 py-4 cursor-pointer transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-[#FAF4ED]/70"
    :class="selected ? 'bg-[#FBF2E1]' : ''"
  >
    <!-- Select -->
    <div class="flex items-center self-center">
      <CommonBrandCheckbox
        :checked="selected"
        :disabled="!selectable"
        :title="selectable ? undefined : 'Only approved branches can be activated or deactivated'"
        :aria-label="`Select ${branch.branch_name || 'branch'}`"
        @change="emit('update:selected', $event)"
      />
    </div>

    <!-- Branch: photo, name, type -->
    <div class="flex items-center gap-3 min-w-0">
      <div class="w-[38px] h-[38px] shrink-0 rounded-lg overflow-hidden bg-[#7D5A50] flex items-center justify-center text-[#FFF8EA] ring-2 ring-white shadow-xs">
        <img
          v-if="branch.cafe_picture && !imageError"
          :src="branch.cafe_picture"
          alt=""
          class="w-full h-full object-cover"
          @error="imageError = true"
        />
        <span v-else class="font-display font-bold text-sm uppercase" aria-hidden="true">
          {{ (branch.branch_name || 'B').charAt(0) }}
        </span>
      </div>
      <div class="min-w-0">
        <h3 class="font-sans text-sm font-bold leading-snug text-[#3D2B24] group-hover:text-[#8B5A3C] transition-colors truncate">
          {{ branch.branch_name || 'Unnamed branch' }}
        </h3>
        <p v-if="branch.branch_type" class="font-sans text-[11px] font-medium leading-tight text-[#9E7060] capitalize truncate">
          {{ branch.branch_type }} branch
        </p>
      </div>
    </div>

    <!-- Address -->
    <p class="col-start-2 row-start-3 lg:col-start-auto lg:row-start-auto flex items-center gap-1.5 min-w-0 font-sans text-xs font-semibold" :class="branch.address ? 'text-[#3D2B24]' : 'text-[#B4846C]'">
      <Icon name="heroicons:map-pin" class="w-3.5 h-3.5 shrink-0 text-[#B4846C]" />
      <span class="truncate">{{ branch.address || 'No address on file' }}</span>
    </p>

    <!-- Manager -->
    <p class="hidden lg:flex items-center gap-1.5 min-w-0 font-sans text-xs" :class="branch.manager_name ? 'font-semibold text-[#3D2B24]' : 'italic text-[#9E7060]/80'">
      <Icon name="heroicons:user" class="w-3.5 h-3.5 shrink-0 text-[#B4846C]" />
      <span class="truncate">{{ branch.manager_name || 'Unassigned' }}</span>
    </p>


    <!-- State: branch status, plus live open state when the branch is active -->
    <div class="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 col-start-2 row-start-2 lg:flex-col lg:items-start lg:col-start-auto lg:row-start-auto">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold capitalize shrink-0" :class="statusMeta(status).badge">
        <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="statusMeta(status).dot" aria-hidden="true" />
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
