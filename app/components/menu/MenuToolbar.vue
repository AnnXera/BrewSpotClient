<script setup lang="ts">
import DropdownList from '~/components/common/DropdownList.vue'
import SearchInput from '~/components/common/SearchInput.vue'

defineProps<{
  searchPlaceholder: string
  addButtonLabel?: string
  modelValue?: string
  sortValue?: string
  sortOptions?: { label: string, value: string }[]
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'update:modelValue', value: string): void
  (e: 'update:sortValue', value: string): void
}>()
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
    <div class="flex items-center gap-4 w-full sm:w-auto flex-1">
      <SearchInput
        :model-value="modelValue ?? ''"
        :placeholder="searchPlaceholder"
        class="max-w-[380px]"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <!-- Sort -->
      <div
        v-if="sortOptions && sortOptions.length > 0"
        class="flex items-center gap-1.5 h-11 px-3 shrink-0 bg-[#FFF8EA] border border-[#EDD8CC] rounded-xl font-sans text-sm font-medium text-[#7D5A50]"
      >
        <Icon name="heroicons:bars-3-bottom-left" class="w-4 h-4" />
        <DropdownList
          :model-value="sortValue ?? ''"
          :options="sortOptions"
          bare
          aria-label="Sort by"
          @update:model-value="emit('update:sortValue', $event)"
        />
      </div>
    </div>

    <!-- Add Button -->
    <button
      v-if="addButtonLabel"
      type="button"
      @click="emit('add')"
      class="w-full sm:w-auto h-11 bg-[#7D5A50] text-[#FDF8F3] rounded-xl px-5 flex items-center justify-center text-sm font-semibold hover:bg-[#6A4B42] transition-colors shrink-0"
    >
      {{ addButtonLabel }}
    </button>
  </div>
</template>
