<!-- app/components/menu/IngredientCard.vue -->
<script setup lang="ts">
import type { Ingredient } from '~/services/MenuService'

defineProps<{
  ingredient: Ingredient
  selected?: boolean
}>()

defineEmits<{
  (e: 'edit'): void
  (e: 'update:selected', value: boolean): void
}>()
</script>

<template>
  <div
    class="bg-white rounded-2xl border flex flex-col group hover:shadow-md transition-all cursor-pointer p-4"
    :class="[
      !ingredient.is_active ? 'opacity-60' : '',
      selected ? 'border-[#B4846C] bg-[#FDF8F3] ring-2 ring-[#B4846C]/20' : 'border-[#EEDFC4]'
    ]"
    @click="$emit('edit')"
  >
    <div class="flex items-center gap-3 mt-1">
      <div class="relative w-11 h-11 shrink-0">
        <!-- The Default Icon -->
        <div 
          class="absolute inset-0 rounded-xl bg-[#FBF2E1] text-[#B4846C] flex items-center justify-center transition-opacity duration-200"
          :class="selected ? 'opacity-0' : 'opacity-100 group-hover:opacity-0 focus-within:opacity-0'"
        >
          <Icon name="heroicons:beaker" class="w-6 h-6" />
        </div>

        <!-- Selection Checkbox (Hover-Revealed overlay) -->
        <div 
          class="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
          :class="selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'"
          @click.stop
        >
          <label class="relative flex items-center justify-center cursor-pointer w-full h-full group/checkbox" title="Select ingredient">
            <input 
              type="checkbox" 
              class="peer sr-only"
              :checked="selected"
              @change="(e) => $emit('update:selected', (e.target as HTMLInputElement).checked)"
            />
            <div 
              class="w-6 h-6 rounded-full border-2 transition-all duration-200 flex items-center justify-center shadow-sm"
              :class="[
                selected 
                  ? 'bg-[#7D5A50] border-[#7D5A50] scale-105' 
                  : 'bg-white border-[#EEDFC4] group-hover/checkbox:border-[#B4846C] peer-focus-visible:ring-4 peer-focus-visible:ring-[#7D5A50]/30'
              ]"
            >
              <Icon name="heroicons:check" class="w-4 h-4 text-white transition-all duration-200" :class="selected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'" />
            </div>
          </label>
        </div>
      </div>

      <h3 class="flex-1 min-w-0 font-display font-bold text-[16px] text-[#3B1F0E] leading-snug line-clamp-2 break-words">
        {{ ingredient.name }}
      </h3>
      <!-- Unit sits across from the name, on the same line -->
      <span class="shrink-0 text-[11px] font-bold text-[#7D5A50] bg-[#FDF8F3] border border-[#EEDFC4] rounded-full px-2 py-0.5">
        {{ ingredient.unit }}
      </span>
    </div>

    <div class="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#EEDFC4]">
      <p class="font-sans text-xs text-[#757575]/80">
        <template v-if="ingredient.used_in">
          Used in {{ ingredient.used_in }} {{ ingredient.used_in === 1 ? 'item' : 'items' }}
        </template>
        <template v-else>Not used in any item</template>
      </p>
      <span
        v-if="!ingredient.is_active"
        class="text-[10px] font-extrabold uppercase tracking-wider text-[#9E7060] bg-[#EDEDED] rounded-full px-2 py-0.5"
      >
        Retired
      </span>
    </div>
  </div>
</template>
