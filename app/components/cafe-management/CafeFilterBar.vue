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
}>()

const emit = defineEmits<{
  (e: 'update:search', val: string): void
  (e: 'update:status', val: string): void
  (e: 'toggleSelectAll', checked: boolean): void
  (e: 'bulkAction', action: string): void
  (e: 'cancelSelection'): void
  (e: 'openAddBranch'): void
}>()
</script>

<template>
  <div class="p-5 border-b border-[#EEDFC4] flex flex-wrap gap-4 items-center min-h-[76px]">
    <template v-if="selectedCount > 0">
      <div class="flex items-center gap-3">
        <input 
          type="checkbox" 
          :checked="selectedCount === totalCount && totalCount > 0" 
          @change="emit('toggleSelectAll', ($event.target as HTMLInputElement).checked)" 
          class="w-5 h-5 rounded border-[#EEDFC4] text-[#7D5A50] focus:ring-[#7D5A50]" 
        />
        <span class="text-[#3D2B24] font-semibold text-sm">{{ selectedCount }} selected</span>
      </div>
      
      <div class="flex gap-2 ml-4">
        <button 
          @click="emit('bulkAction', 'active')" 
          :disabled="bulkLoading" 
          class="px-4 py-2 text-sm font-medium rounded-xl border border-[#EEDFC4] text-[#3D2B24] hover:bg-[#FDF3E7] disabled:opacity-50"
        >
          Mark Active
        </button>
        <button 
          @click="emit('bulkAction', 'inactive')" 
          :disabled="bulkLoading" 
          class="px-4 py-2 text-sm font-medium rounded-xl border border-[#EEDFC4] text-[#3D2B24] hover:bg-[#FDF3E7] disabled:opacity-50"
        >
          Mark Inactive
        </button>
      </div>
      
      <div class="ml-auto flex items-center">
        <Icon v-if="bulkLoading" name="heroicons:arrow-path" class="w-5 h-5 animate-spin text-[#9E7060] mr-4" />
        <button 
          @click="emit('cancelSelection')" 
          :disabled="bulkLoading" 
          class="text-sm text-[#9E7060] font-medium hover:text-[#3D2B24]"
        >
          Cancel
        </button>
      </div>
    </template>

    <template v-else>
      <!-- Search Input -->
      <SearchInput
        :model-value="search"
        placeholder="Search owner or cafe"
        class="flex-1 max-w-md"
        @update:model-value="emit('update:search', $event)"
      />
      
      <!-- Status Dropdown -->
      <div class="w-44">
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

      <!-- Add Branch Button -->
      <div class="ml-auto">
        <button
          type="button"
          :disabled="!canAddBranch"
          :title="canAddBranch ? undefined : 'Your current plan does not include multiple branches. Upgrade to add more.'"
          @click="emit('openAddBranch')"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-sm bg-[#7D5A50] hover:bg-[#65463D] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#7D5A50]"
        >
          <Icon name="heroicons:plus" class="w-4 h-4" />
          <span>Add Branch</span>
        </button>
      </div>
    </template>
  </div>
</template>
