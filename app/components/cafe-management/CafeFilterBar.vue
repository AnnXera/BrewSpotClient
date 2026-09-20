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
          class="w-5 h-5 rounded border-[#EEDFC4] text-[#805B4C] focus:ring-[#805B4C]" 
        />
        <span class="text-[#3D2B24] font-semibold text-sm">{{ selectedCount }} selected</span>
      </div>
      
      <div class="flex gap-2 ml-4">
        <button 
          @click="emit('bulkAction', 'active')" 
          :disabled="bulkLoading" 
          class="px-4 py-2 text-sm font-medium rounded-lg border border-[#EEDFC4] text-[#3D2B24] hover:bg-[#FDF3E7] disabled:opacity-50"
        >
          Mark Active
        </button>
        <button 
          @click="emit('bulkAction', 'inactive')" 
          :disabled="bulkLoading" 
          class="px-4 py-2 text-sm font-medium rounded-lg border border-[#EEDFC4] text-[#3D2B24] hover:bg-[#FDF3E7] disabled:opacity-50"
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
      <div class="relative flex-1 max-w-sm">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="heroicons:magnifying-glass" class="h-5 w-5 text-[#B4846C]" />
        </div>
        <input
          :value="search"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
          type="text"
          aria-label="Search owner or cafe"
          placeholder="Search owner or cafe"
          class="block w-full pl-10 pr-3 py-2 border border-[#EEDFC4] rounded-lg bg-[#FDF8F3] text-sm placeholder-[#B4846C]/60 text-[#3B1F0E] focus:outline-none focus:ring-1 focus:ring-[#B4846C] focus:border-[#B4846C]"
        />
      </div>
      
      <div class="relative w-48">
        <select
          :value="status"
          @change="emit('update:status', ($event.target as HTMLSelectElement).value)"
          aria-label="Filter by status"
          class="block w-full pl-3 pr-10 py-2 border border-[#EEDFC4] rounded-lg bg-[#FDF8F3] text-sm text-[#B4846C]/60 appearance-none focus:outline-none focus:ring-1 focus:ring-[#B4846C] focus:border-[#B4846C]"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
        <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <Icon name="heroicons:chevron-down" class="h-5 w-5 text-[#B4846C]" />
        </div>
      </div>

      <div class="ml-auto">
        <button
          type="button"
          :disabled="!canAddBranch"
          :title="!canAddBranch ? 'Upgrade your plan to add more branches' : ''"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-sans font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#805B4C]/40"
          :class="canAddBranch ? 'bg-[#805B4C] hover:bg-[#6B4A3A]' : 'bg-[#BCA08B] opacity-70 cursor-not-allowed'"
        >
          <Icon name="heroicons:plus" class="w-4 h-4" />
          <span>Add Branch</span>
        </button>
      </div>
    </template>
  </div>
</template>
