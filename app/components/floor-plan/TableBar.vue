<!-- app/components/floor-plan/TableBar.vue -->
<!-- Counter seating: a bar with `seats` stools along its top edge. Booked by seat, so several parties can share it. -->
<script setup lang="ts">
import { TABLE_STYLE, type TableVisual } from '~/utils/tableColors'

const props = withDefaults(defineProps<{ label?: string; state?: TableVisual; seats: number }>(), { state: 'available' })

const style = computed(() => TABLE_STYLE[props.state])

// One 40px slot per stool; the bar is the stools plus 12, and the svg adds 1px of stroke room.
const SLOT = 40
const STOOL_R = 13
const BAR_Y = 31
const BAR_H = 30
const HEIGHT = BAR_Y + BAR_H + 1
const barW = computed(() => props.seats * SLOT + 12)
const width = computed(() => barW.value + 1)
const stools = computed(() => Array.from({ length: props.seats }, (_, i) => 0.5 + 6 + SLOT / 2 + i * SLOT))

const FONT_SIZE = 12
const BADGE_H = 22
const badgeW = computed(() => {
  const n = (props.label ?? '').length
  return n <= 1 ? BADGE_H : 5 + (n - 1) * FONT_SIZE * 0.6 + 20
})
</script>

<template>
  <svg :width="width" :height="HEIGHT" :viewBox="`0 0 ${width} ${HEIGHT}`" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle v-for="cx in stools" :key="cx" :cx="cx" :cy="1.5 + STOOL_R" :r="STOOL_R" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect x="0.5" :y="BAR_Y" :width="barW" :height="BAR_H" rx="10.5" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect v-if="label" :x="width / 2 - badgeW / 2" :y="BAR_Y + BAR_H / 2 - BADGE_H / 2" :width="badgeW" :height="BADGE_H" :rx="BADGE_H / 2" :fill="style.badge" />
    <text
      v-if="label"
      :x="width / 2" :y="BAR_Y + BAR_H / 2"
      text-anchor="middle" dominant-baseline="central"
      font-weight="600" :font-size="FONT_SIZE" :fill="style.badgeText"
    >{{ label }}</text>
  </svg>
</template>
