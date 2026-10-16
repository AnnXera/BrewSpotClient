<!-- app/components/servings/IngredientsUsedPanel.vue -->
<script setup lang="ts">
import type { IngredientUsage, IngredientUsageSort } from '~/services/ServingService'
import { formatQuantity } from '~/utils/fraction'
import DropdownList from '~/components/common/DropdownList.vue'
import SearchInput from '~/components/common/SearchInput.vue'

defineProps<{ ingredients: IngredientUsage[]; loading: boolean }>()

const search = defineModel<string>('search', { required: true })
const sort = defineModel<IngredientUsageSort>('sort', { required: true })

const sortOptions: { label: string; value: IngredientUsageSort }[] = [
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Most used', value: 'quantity_desc' },
  { label: 'Least used', value: 'quantity_asc' },
]

// "shots" -> "shot" when exactly one.
function unitLabel(quantity: number, unit: string) {
  return quantity === 1 && unit.endsWith('s') ? unit.slice(0, -1) : unit
}
</script>

<template>
  <section class="bg-white border border-[#EDD8CC] rounded-2xl px-[22px] py-[18px] flex flex-col gap-4 h-[551px]">
    <h2 class="font-display font-semibold text-[24px] text-[#3D2B24]">Ingredients Used</h2>

    <div class="flex items-center justify-between gap-3 pb-4 border-b border-[#EDD8CC]">
      <SearchInput v-model="search" placeholder="Search Ingredient" class="flex-1" />
      <div class="flex items-center gap-1.5 h-11 px-3 bg-[#FFF8EA] border border-[#EDD8CC] rounded-xl font-sans text-sm font-medium text-[#7D5A50]">
        <Icon name="heroicons:bars-3-bottom-left" class="w-4 h-4" />
        <DropdownList v-model="sort" :options="sortOptions" bare align="right" aria-label="Sort ingredients" />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto flex flex-col gap-3 pr-2">
      <p v-if="loading" class="text-[14px] text-[#9E7060]">Loading...</p>
      <p v-else-if="!ingredients.length" class="text-[14px] text-[#9E7060]">No ingredients used yet today.</p>
      <div v-for="i in ingredients" :key="`${i.name}-${i.unit}`" class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between font-display font-medium text-[16px] text-[#3D2B24]">
          <span class="truncate">{{ i.name }}</span>
          <span class="shrink-0">{{ formatQuantity(i.quantity, 0.01) || i.quantity }} {{ unitLabel(i.quantity, i.unit) }}</span>
        </div>
        <div class="h-3 rounded-full bg-[#FFF8EA] px-[2px] flex items-center">
          <div class="h-2 rounded-full bg-[#3D2B24] min-w-2" :style="{ width: `${i.percent}%` }" />
        </div>
      </div>
    </div>
  </section>
</template>
