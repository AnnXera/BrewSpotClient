<!-- app/components/owner-management/FilterBar.vue -->
<script setup lang="ts">
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
  <div class="flex flex-col md:flex-row md:items-center gap-3 p-6 border-b border-[#F3E7D2]">
    <div class="relative flex-1 min-w-[220px]">
      <Icon
        name="heroicons:magnifying-glass"
        class="w-4 h-4 text-[#3B1F0E]/40 absolute left-3 top-1/2 -translate-y-1/2"
      />
      <input
        :value="search"
        type="text"
        placeholder="Search owner or cafe"
        class="w-full rounded-lg border border-[#EEDFC4] bg-[#FFFDF9] pl-9 pr-3 py-3 font-sans text-sm text-[#3B1F0E] placeholder:text-[#3B1F0E]/40 focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="relative">
      <select
        :value="status"
        class="appearance-none rounded-lg border border-[#EEDFC4] bg-[#FFFDF9] p-3 pr-9 font-sans text-sm text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
        @change="emit('update:status', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <Icon
        name="heroicons:chevron-down"
        class="w-4 h-4 text-[#3B1F0E]/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
      />
    </div>

    <div class="relative">
      <input
        ref="dateInputEl"
        :value="date"
        type="date"
        class="date-input-clean rounded-lg border border-[#EEDFC4] bg-[#FFFDF9] p-3 pr-9 font-sans text-sm text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
        @input="emit('update:date', ($event.target as HTMLInputElement).value)"
      />
      <button type="button" tabindex="-1" class="absolute right-3 top-1/2 -translate-y-1/2" @click="openDatePicker">
        <Icon name="heroicons:calendar-days" class="w-4 h-4 text-[#3B1F0E]/40" />
      </button>
    </div>

    <span class="font-sans text-sm text-[#3B1F0E]/60 md:ml-auto whitespace-nowrap">
      {{ total }} record{{ total === 1 ? '' : 's' }}
    </span>
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