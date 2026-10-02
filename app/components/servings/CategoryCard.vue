<!-- app/components/servings/CategoryCard.vue -->
<script setup lang="ts">
import type { ServingCategorySummary } from '~/services/ServingService'

const props = defineProps<{ category: ServingCategorySummary }>()

// Ring around the picture shows how much of today's servings is left.
const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const left = computed(() =>
  props.category.expected_servings > 0 ? props.category.remaining / props.category.expected_servings : 0,
)
const dash = computed(() => `${left.value * CIRCUMFERENCE} ${CIRCUMFERENCE}`)
const soldOut = computed(() => props.category.status === 'sold_out')
</script>

<template>
  <div class="bg-white border border-[#3D2B24] rounded-2xl px-[22px] py-[18px] flex items-center gap-4">
    <div class="relative shrink-0 size-[70px]">
      <img
        v-if="category.picture"
        :src="category.picture"
        :alt="category.name"
        class="absolute inset-[5px] size-[60px] rounded-full object-cover"
      >
      <div v-else class="absolute inset-[5px] rounded-full bg-[#FFF8EA] flex items-center justify-center">
        <Icon name="heroicons:cake" class="w-7 h-7 text-[#9E7060]" />
      </div>
      <svg viewBox="0 0 70 70" class="absolute inset-0 size-full -rotate-90">
        <circle cx="35" cy="35" :r="RADIUS" fill="none" stroke="#D9D9D9" stroke-width="3" />
        <circle
          cx="35" cy="35" :r="RADIUS" fill="none" stroke="#3D2B24" stroke-width="3"
          stroke-linecap="round" :stroke-dasharray="dash"
        />
      </svg>
    </div>

    <div class="flex-1 min-w-0 flex flex-col gap-1.5">
      <div class="flex items-center justify-between gap-2">
        <p class="font-display font-bold text-[18px] text-[#3D2B24] capitalize truncate">{{ category.name }}</p>
        <span
          class="font-display font-semibold text-[12px] rounded-full px-2.5 py-[5px] shrink-0"
          :class="soldOut ? 'bg-[#FFE0E0] text-[#B31E1E]' : 'bg-[#D4EDDA] text-[#28A745]'"
        >
          {{ soldOut ? 'Sold Out' : 'Available' }}
        </span>
      </div>
      <p class="flex items-end gap-1.5">
        <span class="font-display font-bold text-[32px] leading-none text-[#3D2B24]">{{ category.remaining }}</span>
        <span class="font-display font-medium text-[12px] text-[#9E7060]">/ {{ category.expected_servings }} servings</span>
      </p>
    </div>
  </div>
</template>
