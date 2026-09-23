<script setup lang="ts">
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
      <div class="relative flex-1 max-w-md">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Icon name="heroicons:magnifying-glass" class="h-5 w-5 text-[#B4846C]" />
        </div>
        <input
          :value="search"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
          type="text"
          aria-label="Search owner or cafe"
          placeholder="Search owner or cafe"
          class="block w-full pl-10 pr-4 py-2.5 border border-[#EEDFC4] rounded-xl bg-[#FDF8F3] text-sm placeholder-[#B4846C]/60 text-[#3B1F0E] focus:outline-none focus:ring-1 focus:ring-[#7D5A50] focus:border-[#7D5A50]"
        />
      </div>
      
      <!-- Status Dropdown -->
      <div class="relative w-44">
        <select
          :value="status"
          @change="emit('update:status', ($event.target as HTMLSelectElement).value)"
          aria-label="Filter by status"
          class="block w-full pl-3.5 pr-10 py-2.5 border border-[#EEDFC4] rounded-xl bg-[#FDF8F3] text-sm text-[#B4846C] appearance-none focus:outline-none focus:ring-1 focus:ring-[#7D5A50] focus:border-[#7D5A50]"
        >
          <option value="">Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Icon name="heroicons:chevron-down" class="h-5 w-5 text-[#B4846C]" />
        </div>
      </div>

      <!-- Add Branch Button -->
      <div class="ml-auto">
        <button
          type="button"
          @click="emit('openAddBranch')"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-sm bg-[#7D5A50] hover:bg-[#65463D] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/40"
        >
          <Icon name="heroicons:plus" class="w-4 h-4" />
          <span>Add Branch</span>
        </button>
      </div>
    </template>
  </div>
</template>
