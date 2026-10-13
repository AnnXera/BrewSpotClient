<!-- app/components/floor-plan/TableRound.vue -->
<!-- Round table with 2 to 4 chairs spaced evenly around it. Chairs are the TableRec4 chair, turned about the centre. -->
<script setup lang="ts">
import { TABLE_STYLE, type TableVisual } from '~/utils/tableColors'

const props = withDefaults(defineProps<{ label?: string; state?: TableVisual; seats: number }>(), { state: 'available' })

const style = computed(() => TABLE_STYLE[props.state])

// 112 x 112 box, table 66 across like TableSqr4, chairs 3px off the edge.
const SIZE = 112
const C = SIZE / 2
const R = 33
// Angle of each chair, clockwise from the top.
const angles = computed(() => Array.from({ length: props.seats }, (_, i) => (360 / props.seats) * i))

const FONT_SIZE = 12
const BADGE_H = 25
const badgeW = computed(() => {
  const n = (props.label ?? '').length
  return n <= 1 ? BADGE_H : 5 + (n - 1) * FONT_SIZE * 0.6 + 20
})
</script>

<template>
  <svg :width="SIZE" :height="SIZE" :viewBox="`0 0 ${SIZE} ${SIZE}`" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      v-for="a in angles"
      :key="a"
      :transform="`rotate(${a} ${C} ${C}) translate(${C - 38} 0)`"
      d="M18 20C16.3431 20 14.972 18.6451 15.285 17.0181C15.5676 15.5492 16.0586 14.1095 16.7508 12.729C17.9066 10.4238 19.6008 8.32928 21.7365 6.56497C23.8723 4.80066 26.4078 3.40113 29.1983 2.44629C31.9888 1.49145 34.9796 1 38 1C41.0204 1 44.0112 1.49145 46.8017 2.44629C49.5922 3.40113 52.1277 4.80066 54.2635 6.56497C56.3992 8.32928 58.0934 10.4238 59.2492 12.729C59.9414 14.1095 60.4324 15.5492 60.715 17.0181C61.028 18.6451 59.6569 20 58 20L38 20H18Z"
      :fill="style.fill"
      :stroke="style.stroke"
      stroke-width="1.5"
    />
    <circle :cx="C" :cy="C" :r="R" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect v-if="label" :x="C - badgeW / 2" :y="C - BADGE_H / 2" :width="badgeW" :height="BADGE_H" :rx="BADGE_H / 2" :fill="style.badge" />
    <text
      v-if="label"
      :x="C" :y="C"
      text-anchor="middle" dominant-baseline="central"
      font-weight="600" :font-size="FONT_SIZE" :fill="style.badgeText"
    >{{ label }}</text>
  </svg>
</template>
