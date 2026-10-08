<!-- app/components/floor-plan/TableSqr2.vue -->
<!-- Generated from assets/floor-plan/table_sqr_2.svg; the Figma masks were dropped so fill and stroke can be recolored. -->
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
  <svg width="112" height="67" viewBox="0 0 112 67" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M92.1618 13.3939C92.1618 11.7519 93.5045 10.3932 95.1169 10.7033C96.5725 10.9834 97.9993 11.4699 99.3673 12.1559C101.652 13.3013 103.727 14.9802 105.476 17.0967C107.224 19.2132 108.611 21.7259 109.557 24.4913C110.504 27.2566 110.991 30.2205 110.991 33.2137C110.991 36.2069 110.504 39.1708 109.557 41.9361C108.611 44.7015 107.224 47.2141 105.476 49.3306C103.727 51.4471 101.652 53.126 99.3673 54.2715C97.9993 54.9574 96.5725 55.444 95.1169 55.724C93.5045 56.0342 92.1618 54.6754 92.1618 53.0335L92.1618 33.2137V13.3939Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <path d="M19.8196 53.0335C19.8196 54.6754 18.4769 56.0342 16.8646 55.724C15.409 55.444 13.9821 54.9574 12.6141 54.2715C10.3297 53.126 8.25403 51.4471 6.50562 49.3306C4.7572 47.2141 3.37028 44.7015 2.42404 41.9361C1.4778 39.1708 0.99078 36.2069 0.99078 33.2137C0.99078 30.2205 1.4778 27.2566 2.42404 24.4913C3.37028 21.7259 4.7572 19.2133 6.50562 17.0968C8.25404 14.9802 10.3297 13.3013 12.6141 12.1559C13.9821 11.47 15.409 10.9834 16.8646 10.7034C18.4769 10.3932 19.8196 11.7519 19.8196 13.3939L19.8196 33.2137V53.0335Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect x="23.28" y="0.503232" width="65.4209" height="65.4209" rx="10.568" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect v-if="label" :x="55.99045 - badgeW / 2" :y="33.213682 - BADGE_H / 2" :width="badgeW" :height="BADGE_H" :rx="BADGE_H / 2" :fill="style.badge" />
    <text
      v-if="label"
      x="55.99045" y="33.213682"
      text-anchor="middle" dominant-baseline="central"
      font-weight="600" :font-size="FONT_SIZE" :fill="style.badgeText"
    >{{ label }}</text>
  </svg>
</template>
