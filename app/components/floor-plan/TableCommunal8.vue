<script setup lang="ts">
import { TABLE_STYLE, type TableVisual } from '~/utils/tableColors'

const props = withDefaults(defineProps<{ label?: string; state?: TableVisual }>(), { state: 'available' })
const display = computed(() => props.state === 'selected' ? TABLE_STYLE.selected : TABLE_STYLE.available)
const FONT_SIZE = 12
const BADGE_H = 25
const badgeW = computed(() => {
  const n = (props.label ?? '').length
  return n <= 1 ? BADGE_H : 5 + (n - 1) * FONT_SIZE * 0.6 + 20
})
</script>

<template>
  <svg width="100%" height="100%" viewBox="0 0 56 144" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="54" height="142" rx="8" :fill="display.fill" :stroke="display.stroke" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    <rect v-if="label" :x="28 - badgeW / 2" y="59.5" :width="badgeW" :height="BADGE_H" :rx="BADGE_H / 2" :fill="display.badge" />
    <text
      v-if="label"
      x="28" y="72"
      text-anchor="middle" dominant-baseline="central"
      font-weight="600" :font-size="FONT_SIZE" :fill="display.badgeText"
    >{{ label }}</text>
  </svg>
</template>
