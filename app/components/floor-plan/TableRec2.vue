<!-- app/components/floor-plan/TableRec2.vue -->
<!-- Generated from assets/floor-plan/table_rec_2.svg; the Figma masks were dropped so fill and stroke can be recolored. -->
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
  <svg width="137" height="89" viewBox="0 0 137 89" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M58 69C59.6569 69 61.028 70.3549 60.715 71.9819C60.4324 73.4508 59.9414 74.8905 59.2492 76.271C58.0934 78.5762 56.3992 80.6707 54.2635 82.435C52.1277 84.1993 49.5922 85.5989 46.8017 86.5537C44.0112 87.5086 41.0204 88 38 88C34.9796 88 31.9888 87.5086 29.1983 86.5537C26.4078 85.5989 23.8723 84.1993 21.7365 82.435C19.6008 80.6707 17.9066 78.5762 16.7508 76.271C16.0586 74.8905 15.5676 73.4508 15.285 71.9819C14.972 70.3549 16.3431 69 18 69L38 69H58Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <path d="M120 69C121.657 69 123.028 70.3549 122.715 71.9819C122.432 73.4508 121.941 74.8905 121.249 76.271C120.093 78.5762 118.399 80.6707 116.263 82.435C114.128 84.1993 111.592 85.5989 108.802 86.5537C106.011 87.5086 103.02 88 100 88C96.9796 88 93.9888 87.5086 91.1983 86.5537C88.4078 85.5989 85.8723 84.1993 83.7365 82.435C81.6008 80.6707 79.9066 78.5762 78.7508 76.271C78.0586 74.8905 77.5676 73.4508 77.285 71.9819C76.972 70.3549 78.3431 69 80 69L100 69H120Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect x="0.5" y="0.5" width="136" height="65" rx="10.5" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect v-if="label" :x="68.5 - badgeW / 2" :y="33 - BADGE_H / 2" :width="badgeW" :height="BADGE_H" :rx="BADGE_H / 2" :fill="style.badge" />
    <text
      v-if="label"
      x="68.5" y="33"
      text-anchor="middle" dominant-baseline="central"
      font-weight="600" :font-size="FONT_SIZE" :fill="style.badgeText"
    >{{ label }}</text>
  </svg>
</template>
