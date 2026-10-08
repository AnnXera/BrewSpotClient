<!-- app/components/floor-plan/TableSqr1.vue -->
<!-- Generated from assets/floor-plan/table_sqr_1.svg; the Figma masks were dropped so fill and stroke can be recolored. -->
<script setup lang="ts">
import { TABLE_STYLE, type TableVisual } from '~/utils/tableColors'

const props = withDefaults(defineProps<{ label?: string; state?: TableVisual }>(), { state: 'available' })

const style = computed(() => TABLE_STYLE[props.state])
// Badge hugs the number like the Figma frame: 10px padding left/right, 5px top/bottom, 15px line height.
const FONT_SIZE = 12
const BADGE_H = 25
const badgeW = computed(() => {
  const n = (props.label ?? '').length
  return n <= 1 ? BADGE_H : 5 + (n - 1) * FONT_SIZE * 0.6 + 20
})
</script>

<template>
  <svg width="89" height="67" viewBox="0 0 89 67" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.7726 52.9074C19.7726 54.5454 18.4331 55.901 16.8245 55.5915C15.3724 55.3122 13.9489 54.8268 12.5842 54.1425C10.3052 52.9997 8.23446 51.3248 6.49019 49.2133C4.74593 47.1019 3.3623 44.5952 2.41831 41.8364C1.47433 39.0776 0.98846 36.1208 0.988461 33.1347C0.988461 30.1486 1.47433 27.1918 2.41831 24.433C3.3623 21.6742 4.74593 19.1675 6.49019 17.056C8.23446 14.9446 10.3052 13.2697 12.5842 12.1269C13.9489 11.4426 15.3724 10.9572 16.8245 10.6778C18.4331 10.3684 19.7726 11.7239 19.7726 13.362L19.7726 33.1347V52.9074Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect x="23.2245" y="0.501986" width="65.2654" height="65.2654" rx="10.5429" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect v-if="label" :x="55.8572 - badgeW / 2" :y="33.134686 - BADGE_H / 2" :width="badgeW" :height="BADGE_H" :rx="BADGE_H / 2" :fill="style.badge" />
    <text
      v-if="label"
      x="55.8572" y="33.134686"
      text-anchor="middle" dominant-baseline="central"
      font-weight="600" :font-size="FONT_SIZE" :fill="style.badgeText"
    >{{ label }}</text>
  </svg>
</template>
