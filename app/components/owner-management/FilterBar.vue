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
  <div class="flex flex-col border-b border-[#F3E7D2]
              min-[360px]:px-[12px] min-[360px]:py-[14px] min-[360px]:gap-[12px]
              md:flex-row md:items-center md:p-6 md:gap-[24px]">
    <!-- Search Input -->
    <div class="relative flex-1 w-full min-w-0">
      <Icon
        name="heroicons:magnifying-glass"
        class="text-[#3B1F0E]/40 absolute top-1/2 -translate-y-1/2
               min-[360px]:left-[10px] min-[360px]:w-[16px] min-[360px]:h-[16px]
               md:left-[12px] md:w-[24px] md:h-[24px]"
      />
      <input
        :value="search"
        type="text"
        placeholder="Search owner or cafe"
        class="w-full rounded-xl border border-[#EEDFC4] bg-[#FFFDF9] font-sans text-[#3B1F0E] placeholder:text-[#3B1F0E]/40 focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40
               min-[360px]:py-[10px] min-[360px]:text-[12px] min-[360px]:pl-[34px]
               md:py-[12px] md:text-[14px] md:pl-[48px]"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Dropdowns Grid (Side-by-side on mobile, inline on desktop) -->
    <div class="grid grid-cols-2 w-full
                min-[360px]:gap-[12px]
                md:flex md:w-auto md:items-center md:gap-[24px]">
      <!-- Status Dropdown -->
      <div class="relative w-full
                  md:w-auto">
        <select
          :value="status"
          class="w-full appearance-none rounded-xl border border-[#EEDFC4] bg-[#FFFDF9] pl-[12px] pr-[32px] font-sans text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40
                 min-[360px]:py-[10px] min-[360px]:text-[12px]
                 md:py-[12px] md:text-[14px] md:w-36"
          @change="emit('update:status', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <Icon
          name="heroicons:chevron-down"
          class="w-[16px] h-[16px] text-[#3B1F0E]/40 absolute right-[12px] top-1/2 -translate-y-1/2 pointer-events-none"
        />
      </div>

      <!-- Date Dropdown -->
      <div class="relative w-full
                  md:w-auto">
        <input
          ref="dateInputEl"
          :value="date"
          type="date"
          class="date-input-clean w-full rounded-xl border border-[#EEDFC4] bg-[#FFFDF9] pl-[12px] pr-[32px] font-sans text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40
                 min-[360px]:py-[10px] min-[360px]:text-[12px]
                 md:py-[12px] md:text-[14px] md:w-40"
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