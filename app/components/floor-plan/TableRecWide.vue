<!-- app/components/floor-plan/TableRecWide.vue -->
<!-- Long table with `perSide` chairs on each long edge (3 = 6 seats, 4 = 8 seats). Same chair and table shapes as TableRec4, repeated. -->
<script setup lang="ts">
import { TABLE_STYLE, type TableVisual } from '~/utils/tableColors'

const props = withDefaults(defineProps<{ label?: string; state?: TableVisual; perSide: number; ends?: boolean }>(), { state: 'available' })

const style = computed(() => TABLE_STYLE[props.state])

// TableRec4 geometry: chairs are 62 apart, the table is the chairs plus 12, the svg adds 1px of stroke room.
const PITCH = 62
const HEIGHT = 112
// With `ends`, a chair sits at each short end: 20px deep plus the 3px gap the side chairs have.
const END = 23
const left = computed(() => (props.ends ? END : 0))
const tableW = computed(() => props.perSide * PITCH + 12)
const width = computed(() => tableW.value + 1 + left.value * 2)
const tableRight = computed(() => left.value + 0.5 + tableW.value)
const cx = computed(() => width.value / 2)
// Offset of each chair from the first chair of TableRec4 (centred on x = 38).
const offsets = computed(() => Array.from({ length: props.perSide }, (_, i) => cx.value + (i - (props.perSide - 1) / 2) * PITCH - 38))

const FONT_SIZE = 12
const BADGE_H = 25
const badgeW = computed(() => {
  const n = (props.label ?? '').length
  return n <= 1 ? BADGE_H : 5 + (n - 1) * FONT_SIZE * 0.6 + 20
})
</script>

<template>
  <svg :width="width" :height="HEIGHT" :viewBox="`0 0 ${width} ${HEIGHT}`" fill="none" xmlns="http://www.w3.org/2000/svg">
    <template v-for="dx in offsets" :key="dx">
      <path :transform="`translate(${dx} 0)`" d="M58 92C59.6569 92 61.028 93.3549 60.715 94.9819C60.4324 96.4508 59.9414 97.8905 59.2492 99.271C58.0934 101.576 56.3992 103.671 54.2635 105.435C52.1277 107.199 49.5922 108.599 46.8017 109.554C44.0112 110.509 41.0204 111 38 111C34.9796 111 31.9888 110.509 29.1983 109.554C26.4078 108.599 23.8723 107.199 21.7365 105.435C19.6008 103.671 17.9066 101.576 16.7508 99.271C16.0586 97.8905 15.5676 96.4508 15.285 94.9819C14.972 93.3549 16.3431 92 18 92L38 92H58Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
      <path :transform="`translate(${dx} 0)`" d="M18 20C16.3431 20 14.972 18.6451 15.285 17.0181C15.5676 15.5492 16.0586 14.1095 16.7508 12.729C17.9066 10.4238 19.6008 8.32928 21.7365 6.56497C23.8723 4.80066 26.4078 3.40113 29.1983 2.44629C31.9888 1.49145 34.9796 1 38 1C41.0204 1 44.0112 1.49145 46.8017 2.44629C49.5922 3.40113 52.1277 4.80066 54.2635 6.56497C56.3992 8.32928 58.0934 10.4238 59.2492 12.729C59.9414 14.1095 60.4324 15.5492 60.715 17.0181C61.028 18.6451 59.6569 20 58 20L38 20H18Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    </template>
    <template v-if="ends">
      <!-- The same chair turned to face the table from the left and right edge. -->
      <path transform="translate(0 94) rotate(-90)" d="M18 20C16.3431 20 14.972 18.6451 15.285 17.0181C15.5676 15.5492 16.0586 14.1095 16.7508 12.729C17.9066 10.4238 19.6008 8.32928 21.7365 6.56497C23.8723 4.80066 26.4078 3.40113 29.1983 2.44629C31.9888 1.49145 34.9796 1 38 1C41.0204 1 44.0112 1.49145 46.8017 2.44629C49.5922 3.40113 52.1277 4.80066 54.2635 6.56497C56.3992 8.32928 58.0934 10.4238 59.2492 12.729C59.9414 14.1095 60.4324 15.5492 60.715 17.0181C61.028 18.6451 59.6569 20 58 20L38 20H18Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
      <path :transform="`translate(${tableRight + 23.5} 18) rotate(90)`" d="M18 20C16.3431 20 14.972 18.6451 15.285 17.0181C15.5676 15.5492 16.0586 14.1095 16.7508 12.729C17.9066 10.4238 19.6008 8.32928 21.7365 6.56497C23.8723 4.80066 26.4078 3.40113 29.1983 2.44629C31.9888 1.49145 34.9796 1 38 1C41.0204 1 44.0112 1.49145 46.8017 2.44629C49.5922 3.40113 52.1277 4.80066 54.2635 6.56497C56.3992 8.32928 58.0934 10.4238 59.2492 12.729C59.9414 14.1095 60.4324 15.5492 60.715 17.0181C61.028 18.6451 59.6569 20 58 20L38 20H18Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    </template>
    <rect :x="left + 0.5" y="23.5" :width="tableW" height="65" rx="10.5" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect v-if="label" :x="cx - badgeW / 2" :y="56 - BADGE_H / 2" :width="badgeW" :height="BADGE_H" :rx="BADGE_H / 2" :fill="style.badge" />
    <text
      v-if="label"
      :x="cx" y="56"
      text-anchor="middle" dominant-baseline="central"
      font-weight="600" :font-size="FONT_SIZE" :fill="style.badgeText"
    >{{ label }}</text>
  </svg>
</template>
