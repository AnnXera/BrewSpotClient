<script setup lang="ts">
import DropdownList from '~/components/common/DropdownList.vue'
import SearchInput from '~/components/common/SearchInput.vue'
import { useFirstTimeWalkthrough } from '~/composables/useFirstTimeWalkthrough'

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

const { isMissionGuideActive, isCompanionMinimized } = useFirstTimeWalkthrough()
const isGuideActive = computed(() => Boolean(isMissionGuideActive.value && !isCompanionMinimized.value))

function handleAddClick() {
  if (isGuideActive.value) return
  emit('add')
}
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
    <div class="flex items-center gap-4 w-full sm:w-auto flex-1">
      <SearchInput
        :model-value="modelValue ?? ''"
        :placeholder="searchPlaceholder"
        class="max-w-[380px]"
        data-walkthrough="menu-search"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <!-- Sort -->
      <div
        v-if="sortOptions && sortOptions.length > 0"
        data-walkthrough="menu-sort"
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
      data-walkthrough="menu-add-btn"
      :disabled="isGuideActive"
      :class="isGuideActive ? 'opacity-85 cursor-not-allowed' : 'hover:bg-[#6A4B42]'"
      :title="isGuideActive ? 'Locked during walkthrough demo. Finish or exit the tour to click this button.' : addButtonLabel"
      @click="handleAddClick"
      class="w-full sm:w-auto h-11 bg-[#7D5A50] text-[#FDF8F3] rounded-xl px-5 flex items-center justify-center text-sm font-semibold transition-colors shrink-0"
    >
      {{ addButtonLabel }}
    </button>
  </div>
</template>
