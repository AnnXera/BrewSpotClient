<!-- app/components/owner-management/FilterBar.vue -->
<script setup lang="ts">
import DropdownList from '~/components/common/DropdownList.vue'
import SearchInput from '~/components/common/SearchInput.vue'

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

const dateInputEl = ref<HTMLInputElement | null>(null)

function openDatePicker() {
  // showPicker() is supported in current Chrome/Edge/Safari; falls back to
  // a plain focus() (which still lets the user open the native picker) elsewhere.
  const el = dateInputEl.value as any
  if (el?.showPicker) {
    el.showPicker()
  } else {
    el?.focus()
  }
}
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
      <div class="relative w-full
                  md:w-auto">
        <input
          ref="dateInputEl"
          :value="date"
          type="date"
          class="date-input-clean w-full h-11 rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] pl-4 pr-[32px] font-sans text-sm text-[#3D2B24] transition-colors hover:border-[#D9C4B8] focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40 cursor-pointer md:w-40"
          @input="emit('update:date', ($event.target as HTMLInputElement).value)"
        />
        <button type="button" tabindex="-1" class="absolute right-[12px] top-1/2 -translate-y-1/2" @click="openDatePicker">
          <Icon name="heroicons:chevron-down" class="w-[16px] h-[16px] text-[#3B1F0E]/40" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hide the browser's built-in calendar icon (Chrome/Edge/Safari) so only
   our custom heroicons:calendar-days icon shows. Firefox doesn't expose
   this pseudo-element, so its native icon will still appear there. */
.date-input-clean::-webkit-calendar-picker-indicator {
  opacity: 0;
  position: absolute;
  right: 0;
  width: 2rem;
  height: 100%;
  cursor: pointer;
}
</style>