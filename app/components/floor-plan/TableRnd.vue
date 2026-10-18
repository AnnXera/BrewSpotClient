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
  <svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="39" y="1" width="34" height="12" rx="6" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect x="99" y="39" width="12" height="34" rx="6" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect x="39" y="99" width="34" height="12" rx="6" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect x="1" y="39" width="12" height="34" rx="6" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <circle cx="56" cy="56" r="44" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <circle v-if="label" cx="56" cy="56" :r="badgeW / 2" :fill="style.badge" />
    <text
      v-if="label"
      x="56" y="56"
      text-anchor="middle" dominant-baseline="central"
      font-weight="600" :font-size="FONT_SIZE" :fill="style.badgeText"
    >{{ label }}</text>
  </svg>
</template>
