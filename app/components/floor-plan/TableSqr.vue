<script setup lang="ts">
import { TABLE_STYLE, type TableVisual } from '~/utils/tableColors'

const props = withDefaults(defineProps<{
  label?: string
  seats?: 1 | 2 | 3 | 4
  state?: TableVisual
}>(), {
  seats: 4,
  state: 'available',
})

const style = computed(() => TABLE_STYLE[props.state])
const badgeW = computed(() => {
  const n = (props.label ?? '').length
  return n <= 1 ? 25 : 5 + (n - 1) * 12 * 0.6 + 20
})
</script>

<template>
  <svg viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect v-if="seats === 1 || seats === 2" x="23" y="23" width="66" height="66" rx="10" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect v-else x="23" y="23" width="66" height="66" rx="10" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />

    <path d="M20 36A20 20 0 0 0 20 76Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <path d="M92 36A20 20 0 0 1 92 76Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <path d="M36 20A20 20 0 0 1 76 20Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <path d="M36 92A20 20 0 0 0 76 92Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />

    <rect v-if="label" :x="56 - badgeW / 2" y="43.5" :width="badgeW" height="25" rx="12.5" :fill="style.badge" />
    <text
      v-if="label"
      x="56" y="56"
      text-anchor="middle" dominant-baseline="central"
      font-weight="600" font-size="12" :fill="style.badgeText"
    >{{ label }}</text>
  </svg>
</template>
