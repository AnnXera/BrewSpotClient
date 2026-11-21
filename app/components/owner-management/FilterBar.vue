<!-- app/components/owner-management/FilterBar.vue -->
<script setup lang="ts">
import DropdownList from '~/components/common/DropdownList.vue'
import SearchInput from '~/components/common/SearchInput.vue'
import EmilCalendar from '~/components/common/EmilCalendar.vue'

interface StatusOption {
  value: string
  label: string
}

defineProps<{
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
}>()
</script>

<template>
  <div class="flex flex-col border-b border-[#F3E7D2]
              min-[360px]:px-[12px] min-[360px]:py-[14px] min-[360px]:gap-[12px]
              md:flex-row md:items-center md:p-6 md:gap-[24px]">
    <!-- Search Input -->
    <SearchInput
      :model-value="search"
      placeholder="Search owner or cafe"
      class="flex-1"
      @update:model-value="emit('update:search', $event)"
    />

    <!-- Dropdowns Grid (Side-by-side on mobile, inline on desktop) -->
    <div class="grid grid-cols-2 w-full
                min-[360px]:gap-[12px]
                md:flex md:w-auto md:items-center md:gap-[24px]">
      <!-- Status Dropdown -->
      <div class="w-full
                  md:w-40">
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
      <div class="w-full md:w-auto">
        <EmilCalendar
          :model-value="date"
          placeholder="Filter by date"
          align="right"
          button-class="h-11 w-full md:w-44"
          @update:model-value="emit('update:date', $event)"
        />
      </div>
    </div>
  </div>
</template>