<script setup lang="ts">
import { TABLE_STYLE, type TableVisual } from '~/utils/tableColors'

const props = withDefaults(defineProps<{ label?: string; state?: TableVisual }>(), { state: 'available' })
const style = computed(() => TABLE_STYLE[props.state])
const FONT_SIZE = 12
const BADGE_H = 25
const badgeW = computed(() => {
  const n = (props.label ?? '').length
  return n <= 1 ? BADGE_H : 5 + (n - 1) * FONT_SIZE * 0.6 + 20
})
</script>

<template>
  <svg width="100%" height="100%" viewBox="0 0 137 112" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="1" width="97" height="20" rx="10" :fill="style.stroke" />
    <rect x="0.5" y="28.5" width="136" height="65" rx="32.5" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    <rect v-if="label" :x="68.5 - badgeW / 2" :y="61 - BADGE_H / 2" :width="badgeW" :height="BADGE_H" :rx="BADGE_H / 2" :fill="style.badge" />
    <text
      v-if="label"
      x="68.5" y="61"
      text-anchor="middle" dominant-baseline="central"
      font-weight="600" :font-size="FONT_SIZE" :fill="style.badgeText"
    >{{ label }}</text>
  </svg>
</template>
