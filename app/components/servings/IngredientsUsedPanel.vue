<!-- app/components/servings/IngredientsUsedPanel.vue -->
<script setup lang="ts">
import type { IngredientUsage, IngredientUsageSort } from '~/services/ServingService'
import { formatQuantity } from '~/utils/fraction'
import DropdownList from '~/components/common/DropdownList.vue'
import SearchInput from '~/components/common/SearchInput.vue'

const props = defineProps<{
  ingredients: IngredientUsage[]
  loading: boolean
  refreshTrigger?: number
}>()

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

const panelRef = ref<HTMLElement | null>(null)
const isVisible = ref(false)

let animTimeout: ReturnType<typeof setTimeout> | undefined

function triggerAnimation() {
  clearTimeout(animTimeout)
  isVisible.value = false
  animTimeout = setTimeout(() => {
    isVisible.value = true
  }, 60)
}

let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof window === 'undefined') {
    isVisible.value = true
    return
  }

  if ('IntersectionObserver' in window && panelRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            triggerAnimation()
          } else {
            isVisible.value = false
          }
        })
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -20px 0px',
      }
    )
    observer.observe(panelRef.value)
  } else {
    triggerAnimation()
  }
})

onUnmounted(() => {
  clearTimeout(animTimeout)
  observer?.disconnect()
  observer = null
})

// Re-animate whenever parent signals a refresh
watch(() => props.refreshTrigger, () => {
  triggerAnimation()
})

// Re-animate when ingredients data updates
watch(() => props.ingredients, () => {
  triggerAnimation()
}, { deep: true })
</script>

<template>
  <section
    ref="panelRef"
    class="bg-white border border-[#E3CFB4] rounded-2xl flex flex-col h-[520px] shadow-2xs overflow-hidden"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E3CFB4]/70">
      <div class="flex items-center gap-2.5">
        <div class="size-8 rounded-lg bg-[#FDF3E7] border border-[#E3CFB4] flex items-center justify-center text-[#7D5A50] shrink-0">
          <Icon name="heroicons:scale" class="w-4 h-4" />
        </div>
        <div>
          <h2 class="font-display font-bold text-[18px] text-[#3B1F0E] leading-tight">Ingredients Used in Sales</h2>
          <p class="text-[12px] text-[#8B6656]">From each sold item's recipe. Spoiled servings are not included.</p>
        </div>
      </div>
      <span class="rounded-full bg-[#FDF3E7] border border-[#E3CFB4] px-2.5 py-0.5 text-xs font-semibold text-[#7D5A50] tabular-nums">
        {{ ingredients.length }} active
      </span>
    </div>

    <!-- Filter & Sort Bar -->
    <div class="px-5 py-3 border-b border-[#E3CFB4]/70 bg-[#FFFDF9]/60 flex items-center gap-3">
      <SearchInput v-model="search" placeholder="Search ingredient..." class="flex-1" />
      <div class="flex items-center gap-1.5 h-11 px-3 bg-white border border-[#E3CFB4] rounded-xl font-sans text-sm font-medium text-[#7D5A50] shrink-0 shadow-2xs">
        <Icon name="heroicons:bars-3-bottom-left" class="w-4 h-4 text-[#B4846C]" />
        <DropdownList v-model="sort" :options="sortOptions" bare align="right" aria-label="Sort ingredients" />
      </div>
    </div>

    <!-- List of Ingredients -->
    <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-3.5 scrollbar-thin">
      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div v-for="n in 5" :key="n" class="flex flex-col gap-2 p-2 rounded-xl bg-[#FAF4ED]/50 animate-pulse">
          <div class="flex justify-between">
            <div class="h-4 w-32 bg-[#EBE0D2] rounded" />
            <div class="h-4 w-16 bg-[#EBE0D2] rounded" />
          </div>
          <div class="h-2 w-full bg-[#EBE0D2]/60 rounded-full" />
        </div>
      </template>

      <!-- Empty State -->
      <div v-else-if="!ingredients.length" class="flex flex-col items-center justify-center h-full text-center py-8">
        <div class="size-12 rounded-full bg-[#FDF3E7] border border-[#E3CFB4] flex items-center justify-center text-[#9E7060] mb-2">
          <Icon name="heroicons:scale" class="w-6 h-6" />
        </div>
        <p class="font-display font-medium text-[14px] text-[#3B1F0E]">No sales yet today, so no ingredients used.</p>
        <p class="text-[12px] text-[#8B6656] mt-0.5">Ingredients will appear here as orders are prepared.</p>
      </div>

      <!-- Ingredient Rows with slow smooth animated progress bars -->
      <div
        v-else
        v-for="i in ingredients"
        :key="`${i.name}-${i.unit}`"
        class="ingredient-row flex flex-col gap-1.5 p-2 rounded-xl hover:bg-[#FAF4ED]/60 transition-colors duration-150"
      >
        <div class="flex items-center justify-between font-display text-[14px]">
          <span class="font-semibold text-[#3B1F0E] truncate">{{ i.name }}</span>
          <span class="font-semibold text-[#7D5A50] tabular-nums shrink-0 ml-2">
            {{ formatQuantity(i.quantity, 0.01) || i.quantity }} {{ unitLabel(i.quantity, i.unit) }}
          </span>
        </div>
        <!-- Progress Bar Track & Fill with Slow Animation on Scroll / Refresh -->
        <div class="h-2 rounded-full bg-[#FAF4ED] border border-[#EBE0D2] overflow-hidden">
          <div
            class="progress-fill h-full rounded-full bg-[#7D5A50]"
            :style="{ width: isVisible ? `${Math.min(100, Math.max(2, i.percent))}%` : '0%' }"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Very slow 2500ms smooth expansion */
.progress-fill {
  transition: width 2500ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: width;
}

@media (prefers-reduced-motion: reduce) {
  .progress-fill {
    transition: none !important;
  }
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #E3CFB4;
  border-radius: 9999px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #B4846C;
}
</style>
