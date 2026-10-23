<!-- app/components/servings/CategoryCard.vue -->
<script setup lang="ts">
import type { ServingCategorySummary } from '~/services/ServingService'

const props = defineProps<{
  category: ServingCategorySummary
  refreshTrigger?: number
}>()
defineEmits<{ select: [] }>()

const cardRef = ref<HTMLElement | null>(null)

// Circle geometry
const RADIUS = 32
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const targetFraction = computed(() => {
  if (!props.category.expected_servings || props.category.expected_servings <= 0) return 0
  return Math.min(1, Math.max(0, props.category.remaining / props.category.expected_servings))
})

const displayedFraction = ref(0)
const dash = computed(() => `${displayedFraction.value * CIRCUMFERENCE} ${CIRCUMFERENCE}`)
const soldOut = computed(() => props.category.status === 'sold_out' || props.category.remaining === 0)

let animTimeout: ReturnType<typeof setTimeout> | undefined

function triggerAnimation() {
  clearTimeout(animTimeout)
  displayedFraction.value = 0
  animTimeout = setTimeout(() => {
    displayedFraction.value = targetFraction.value
  }, 60)
}

let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof window === 'undefined') return

  if ('IntersectionObserver' in window && cardRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            triggerAnimation()
          } else {
            displayedFraction.value = 0
          }
        })
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -20px 0px',
      }
    )
    observer.observe(cardRef.value)
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

// Re-animate if data values update
watch(() => [props.category.remaining, props.category.expected_servings], () => {
  triggerAnimation()
})
</script>

<template>
  <div
    ref="cardRef"
    role="button"
    tabindex="0"
    class="category-card group relative bg-white border border-[#E3CFB4] hover:border-[#B4846C] rounded-2xl p-4 sm:p-5 flex items-center gap-4 cursor-pointer shadow-2xs hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
    @click="$emit('select')"
    @keydown.enter.prevent="$emit('select')"
    @keydown.space.prevent="$emit('select')"
  >
    <!-- Circle Graph Ring & Thumbnail -->
    <div class="relative shrink-0 size-[68px]">
      <img
        v-if="category.picture"
        :src="category.picture"
        :alt="category.name"
        class="absolute inset-[6px] size-[56px] rounded-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
      >
      <div
        v-else
        class="absolute inset-[6px] size-[56px] rounded-full bg-[#FDF3E7] border border-[#E3CFB4]/60 flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-[1.03]"
      >
        <Icon name="heroicons:cake" class="w-6 h-6 text-[#9E7060]" />
      </div>

      <!-- SVG Circular Progress Ring -->
      <svg viewBox="0 0 68 68" class="absolute inset-0 size-full -rotate-90 pointer-events-none">
        <circle cx="34" cy="34" :r="RADIUS" fill="none" stroke="#F0E6D8" stroke-width="3.5" />
        <circle
          cx="34"
          cy="34"
          :r="RADIUS"
          fill="none"
          :stroke="soldOut ? '#DC2626' : '#7D5A50'"
          stroke-width="3.5"
          stroke-linecap="round"
          :stroke-dasharray="dash"
          class="progress-circle"
        />
      </svg>
    </div>

    <!-- Category Info & Numbers -->
    <div class="flex-1 min-w-0 flex flex-col gap-1.5">
      <!-- Title & Status Badge -->
      <div class="flex items-center justify-between gap-2">
        <p class="font-display font-bold text-[17px] text-[#3B1F0E] capitalize truncate group-hover:text-[#7D5A50] transition-colors duration-160">
          {{ category.name }}
        </p>
        <span
          class="font-display font-semibold text-[11px] rounded-full px-2.5 py-0.5 shrink-0 transition-colors duration-160"
          :class="soldOut ? 'bg-rose-50 text-rose-700 border border-rose-200/80' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'"
        >
          {{ soldOut ? 'Sold Out' : 'Available' }}
        </span>
      </div>

      <!-- Numbers & Arrow -->
      <div class="flex items-baseline justify-between">
        <p class="flex items-baseline gap-1.5">
          <span class="font-display font-bold text-[28px] leading-none tabular-nums text-[#3B1F0E]">
            {{ category.remaining }}
          </span>
          <span class="font-display font-medium text-[12px] text-[#8B6656]">
            / {{ category.expected_servings }} servings
          </span>
        </p>
        <Icon
          name="heroicons:chevron-right"
          class="w-4 h-4 text-[#B4846C]/60 group-hover:text-[#7D5A50] group-hover:translate-x-0.5 transition-all duration-160 ease-out shrink-0"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-card {
  transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1),
              box-shadow 180ms cubic-bezier(0.23, 1, 0.32, 1),
              border-color 180ms ease-out;
}

@media (hover: hover) and (pointer: fine) {
  .category-card:hover {
    transform: translateY(-2px);
  }
}

.category-card:active {
  transform: scale(0.98);
}

/* Circle bar animated very slowly on refresh or scroll */
.progress-circle {
  transition: stroke-dasharray 2500ms cubic-bezier(0.16, 1, 0.3, 1),
              stroke 600ms ease-out;
  will-change: stroke-dasharray;
}

@media (prefers-reduced-motion: reduce) {
  .category-card,
  .progress-circle {
    transition: none !important;
    transform: none !important;
  }
}
</style>
