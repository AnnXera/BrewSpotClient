<!-- app/components/owner-management/FilterBar.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import DropdownList from '~/components/common/DropdownList.vue'
import SearchInput from '~/components/common/SearchInput.vue'
import EmilCalendar from '~/components/common/EmilCalendar.vue'

interface StatusOption {
  value: string
  label: string
}

const props = defineProps<{
  search: string
  status: string
  date: string
  statusOptions: StatusOption[]
  total: number
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:status': [value: string]
  'update:date': [value: string]
  'reset': []
}>()

const hasActiveFilters = computed(() => Boolean(props.search || props.status || props.date))

function resetAll() {
  emit('update:search', '')
  emit('update:status', '')
  emit('update:date', '')
  emit('reset')
}
</script>

<template>
  <div
    class="flex flex-col border-b border-[#F3E7D2] p-3.5 sm:p-5 gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4 bg-[#FCF8F3]/40"
  >
    <!-- Left: Search input -->
    <div class="flex-1 min-w-0">
      <SearchInput
        :model-value="search"
        placeholder="Search owner or cafe"
        clearable
        class="w-full"
        @update:model-value="emit('update:search', $event)"
      />
    </div>

    <!-- Right: Filter controls (Status, Date, and optional Reset) -->
    <div class="flex flex-wrap items-center gap-2.5 sm:gap-3">
      <!-- Status Dropdown -->
      <div class="w-full sm:w-40 min-w-0">
        <DropdownList
          :model-value="status"
          :options="statusOptions"
          size="sm"
          class="font-sans"
          aria-label="Filter by status"
          @update:model-value="emit('update:status', $event)"
        />
      </div>

      <!-- Date Dropdown -->
      <div class="w-full sm:w-auto min-w-0">
        <EmilCalendar
          :model-value="date"
          placeholder="Filter by date"
          align="right"
          button-class="h-11 w-full sm:w-44"
          @update:model-value="emit('update:date', $event)"
        />
      </div>

      <!-- 1-Click Reset button when any filter is active -->
      <button
        v-if="hasActiveFilters"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl bg-white border border-[#EDD8CC] text-xs font-semibold text-[#7D5A50] hover:bg-[#FDF3E7] hover:border-[#D9C4B8] hover:text-[#3D2B24] active:scale-95 transition-[transform,background-color,border-color] duration-150 ease-out shadow-xs focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40 shrink-0"
        title="Reset all filters"
        @click="resetAll"
      >
        <Icon name="heroicons:arrow-path" class="w-3.5 h-3.5" />
        <span>Reset</span>
      </button>

      <!-- Results counter badge -->
      <div class="hidden xl:flex items-center pl-2 text-xs font-medium text-[#9E7060] whitespace-nowrap">
        <span>Showing <strong class="text-[#3D2B24] font-bold">{{ total }}</strong> {{ total === 1 ? 'owner' : 'owners' }}</span>
      </div>
    </div>
  </div>
</template>
