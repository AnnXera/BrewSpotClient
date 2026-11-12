<script setup lang="ts">
import DropdownList from '~/components/common/DropdownList.vue'
import SearchInput from '~/components/common/SearchInput.vue'

const props = defineProps<{
  search: string
  status: string
  selectedCount: number
  totalCount: number
  canAddBranch: boolean
  bulkLoading: boolean
  lowStockThresholdPercent?: number | null
}>()

const emit = defineEmits<{
  (e: 'update:search', val: string): void
  (e: 'update:status', val: string): void
  (e: 'toggleSelectAll', checked: boolean): void
  (e: 'bulkAction', action: string): void
  (e: 'cancelSelection'): void
  (e: 'openAddBranch'): void
  (e: 'openLowStock'): void
}>()

const hasLowStockLimit = computed(() =>
  props.lowStockThresholdPercent !== null &&
  props.lowStockThresholdPercent !== undefined &&
  props.lowStockThresholdPercent > 0,
)
</script>

<template>
  <div class="px-5 py-4 border-b border-[#EEDFC4] flex flex-wrap gap-3 items-center min-h-[76px]">
    <template v-if="selectedCount > 0">
      <div class="flex items-center gap-3">
        <input
          type="checkbox"
          :checked="selectedCount === totalCount && totalCount > 0"
          class="w-5 h-5 rounded border-[#D9C4A8] text-[#7D5A50] focus:ring-[#7D5A50] cursor-pointer"
          @change="emit('toggleSelectAll', ($event.target as HTMLInputElement).checked)"
        >
        <span class="text-[#3D2B24] font-semibold text-sm tabular-nums">{{ selectedCount }} selected</span>
      </div>

      <div class="flex gap-2 ml-2">
        <button
          type="button"
          :disabled="bulkLoading"
          class="h-10 px-3.5 text-xs font-semibold rounded-xl border border-[#EDD8CC] bg-[#FFFDF9] text-[#3D2B24] hover:bg-[#FAF4EC] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          @click="emit('bulkAction', 'active')"
        >
          Mark Active
        </button>
        <button
          type="button"
          :disabled="bulkLoading"
          class="h-10 px-3.5 text-xs font-semibold rounded-xl border border-[#EDD8CC] bg-[#FFFDF9] text-[#3D2B24] hover:bg-[#FAF4EC] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          @click="emit('bulkAction', 'inactive')"
        >
          Mark Inactive
        </button>
      </div>

      <div class="ml-auto flex items-center">
        <Icon v-if="bulkLoading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin text-[#9E7060] mr-3" />
        <button
          type="button"
          :disabled="bulkLoading"
          class="h-10 px-3 text-xs font-semibold text-[#7D5A50] hover:text-[#3D2B24] rounded-lg transition-colors cursor-pointer"
          @click="emit('cancelSelection')"
        >
          Cancel
        </button>
      </div>
    </template>

    <template v-else>
      <!-- Left: Search + Status Filter -->
      <div class="flex flex-1 flex-wrap sm:flex-nowrap items-center gap-2.5 min-w-[240px]">
        <SearchInput
          :model-value="search"
          placeholder="Search branch or manager..."
          clearable
          class="w-full sm:max-w-[340px]"
          @update:model-value="emit('update:search', $event)"
        />

        <div class="w-full sm:w-[168px] shrink-0">
          <DropdownList
            :model-value="status"
            :options="[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' },
              { value: 'inactive', label: 'Inactive' }
            ]"
            size="sm"
            class="font-sans"
            aria-label="Filter by status"
            @update:model-value="emit('update:status', $event)"
          />
        </div>
      </div>

      <!-- Right: Change Stock Limit + Add Branch -->
      <div class="ml-auto flex items-center gap-2.5 shrink-0">
        <!-- Secondary Action Button: Change Stock Limit -->
        <button
          type="button"
          data-walkthrough="cafe-low-stock-btn"
          :title="hasLowStockLimit ? `Change stock limit (currently ${lowStockThresholdPercent}% across all branches)` : 'Change stock limit (%) for all branches'"
          class="h-11 inline-flex items-center gap-2 px-4 rounded-xl border border-[#D5BEAA] bg-[#F6EBDD] hover:bg-[#EFE0CE] hover:border-[#B4846C] text-[#3D2B24] font-display font-semibold text-[13px] shadow-[0_1px_2px_rgba(61,43,36,0.1)] active:scale-[0.98] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 cursor-pointer whitespace-nowrap"
          @click="emit('openLowStock')"
        >
          <Icon name="heroicons:adjustments-horizontal" class="w-4 h-4 text-[#7D5A50] shrink-0" />
          <span>Change Stock Limit</span>
          <span
            v-if="hasLowStockLimit"
            class="inline-flex items-center rounded-md bg-[#3D2B24] text-[#FFFDF9] px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums"
          >
            {{ lowStockThresholdPercent }}%
          </span>
        </button>

        <!-- Primary Add Branch Button -->
        <button
          type="button"
          data-walkthrough="cafe-add-branch-btn"
          :aria-describedby="canAddBranch ? undefined : 'add-branch-locked'"
          class="h-11 inline-flex items-center gap-2 px-5 rounded-xl text-[#FFFDF9] font-display font-semibold text-[13px] bg-[#7D5A50] hover:bg-[#65463D] active:scale-[0.98] transition-all duration-150 shadow-[0_1px_2px_rgba(61,43,36,0.14)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          @click="emit('openAddBranch')"
        >
          <Icon :name="canAddBranch ? 'heroicons:plus' : 'heroicons:lock-closed'" class="w-4 h-4 shrink-0" />
          <span>Add Branch</span>
          <span v-if="!canAddBranch" id="add-branch-locked" class="sr-only">Not included in your current plan</span>
        </button>
      </div>
    </template>
  </div>
</template>
