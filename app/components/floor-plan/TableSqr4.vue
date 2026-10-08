<!-- app/components/floor-plan/TableSqr4.vue -->
<!-- Generated from assets/floor-plan/table_sqr_4.svg; the Figma masks were dropped so fill and stroke can be recolored. -->
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
  <svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 77.9999C20 79.6568 18.6451 81.0279 17.0181 80.7149C15.5492 80.4324 14.1095 79.9413 12.729 79.2492C10.4238 78.0933 8.32928 76.3991 6.56497 74.2634C4.80066 72.1276 3.40113 69.5921 2.44629 66.8017C1.49145 64.0112 1 61.0203 1 57.9999C1 54.9795 1.49145 51.9887 2.44629 49.1982C3.40113 46.4077 4.80066 43.8722 6.56497 41.7365C8.32929 39.6007 10.4238 37.9066 12.729 36.7507C14.1095 36.0585 15.5492 35.5675 17.0181 35.285C18.6451 34.972 20 36.3431 20 37.9999L20 57.9999V77.9999Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <path d="M76 92C77.6569 92 79.028 93.3549 78.715 94.9819C78.4324 96.4508 77.9414 97.8905 77.2492 99.271C76.0934 101.576 74.3992 103.671 72.2635 105.435C70.1277 107.199 67.5922 108.599 64.8017 109.554C62.0112 110.509 59.0204 111 56 111C52.9796 111 49.9888 110.509 47.1983 109.554C44.4078 108.599 41.8723 107.199 39.7365 105.435C37.6008 103.671 35.9066 101.576 34.7508 99.271C34.0586 97.8905 33.5676 96.4508 33.285 94.9819C32.972 93.3549 34.3431 92 36 92L56 92H76Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <path d="M92 38C92 36.3431 93.3549 34.972 94.9819 35.285C96.4508 35.5676 97.8905 36.0586 99.271 36.7508C101.576 37.9066 103.671 39.6008 105.435 41.7365C107.199 43.8723 108.599 46.4078 109.554 49.1983C110.509 51.9888 111 54.9796 111 58C111 61.0204 110.509 64.0112 109.554 66.8017C108.599 69.5922 107.199 72.1277 105.435 74.2635C103.671 76.3992 101.576 78.0934 99.271 79.2492C97.8905 79.9414 96.4508 80.4324 94.9819 80.715C93.3549 81.028 92 79.6569 92 78L92 58V38Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <path d="M36 20C34.3431 20 32.972 18.6451 33.285 17.0181C33.5676 15.5492 34.0586 14.1095 34.7508 12.729C35.9066 10.4238 37.6008 8.32928 39.7365 6.56497C41.8723 4.80066 44.4078 3.40113 47.1983 2.44629C49.9888 1.49145 52.9796 1 56 1C59.0204 1 62.0112 1.49145 64.8017 2.44629C67.5922 3.40113 70.1277 4.80066 72.2635 6.56497C74.3992 8.32929 76.0934 10.4238 77.2492 12.729C77.9414 14.1095 78.4324 15.5492 78.715 17.0181C79.028 18.6451 77.6569 20 76 20L56 20L36 20Z" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect x="22.9922" y="22.9922" width="66.0156" height="66.0156" rx="10.6641" :fill="style.fill" :stroke="style.stroke" stroke-width="1.5" />
    <rect v-if="label" :x="56 - badgeW / 2" :y="56 - BADGE_H / 2" :width="badgeW" :height="BADGE_H" :rx="BADGE_H / 2" :fill="style.badge" />
    <text
      v-if="label"
      x="56" y="56"
      text-anchor="middle" dominant-baseline="central"
      font-weight="600" :font-size="FONT_SIZE" :fill="style.badgeText"
    >{{ label }}</text>
  </svg>
</template>
