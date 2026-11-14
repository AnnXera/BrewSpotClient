<!-- app/components/common/BranchPicker.vue -->
<!-- Which branch an owner is working on, on the screens shared with managers (servings, reservations, floor plan). -->
<script setup lang="ts">
import DropdownList from '~/components/common/DropdownList.vue'

defineProps<{
  options: { value: string; label: string; hint?: string }[]
  disabled?: boolean
  title?: string
}>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="w-full sm:w-64" data-testid="branch-picker">
    <DropdownList
      v-model="model"
      :options="options"
      :disabled="disabled"
      :title="title"
      icon="heroicons:building-storefront"
      size="sm"
      aria-label="Branch"
      placeholder="Choose a branch"
    />
  </div>
</template>
