<!-- app/components/floor-plan/Table.vue -->
<!-- Renders the table SVG for a server asset_key, colored by status/selection and labeled with its number. -->
<script setup lang="ts">
import type { Component } from 'vue'
import { tableVisual } from '~/utils/tableColors'
import TableRec2 from './TableRec2.vue'
import TableRec4 from './TableRec4.vue'
import TableRecWide from './TableRecWide.vue'
import TableRound from './TableRound.vue'
import TableSqr1 from './TableSqr1.vue'
import TableSqr2 from './TableSqr2.vue'
import TableSqr3 from './TableSqr3.vue'
import TableSqr4 from './TableSqr4.vue'

const TABLES: Record<string, Component> = {
  table_rec_2: TableRec2,
  table_rec_4: TableRec4,
  table_sqr_1: TableSqr1,
  table_sqr_2: TableSqr2,
  table_sqr_3: TableSqr3,
  table_sqr_4: TableSqr4,
}

// Long tables beyond what has a drawn SVG: chairs per long edge.
const WIDE: Record<string, { perSide: number; ends?: boolean }> = {
  table_rec_6: { perSide: 3 },
  table_rec_8: { perSide: 4 },
  table_rec_6_ends: { perSide: 2, ends: true },
  table_rec_8_ends: { perSide: 3, ends: true },
}

const props = defineProps<{
  assetKey: string
  label?: string
  status?: string | null
  selected?: boolean
}>()

// Round tables: seats around the circle.
const ROUND: Record<string, number> = { table_round_2: 2, table_round_3: 3, table_round_4: 4 }

const component = computed(() =>
  props.assetKey in WIDE ? TableRecWide : props.assetKey in ROUND ? TableRound : TABLES[props.assetKey])
const extra = computed(() =>
  props.assetKey in WIDE ? WIDE[props.assetKey] : props.assetKey in ROUND ? { seats: ROUND[props.assetKey] } : {})
const state = computed(() => tableVisual(props.status, props.selected))
</script>

<template>
  <component :is="component" v-if="component" v-bind="extra" :label="label" :state="state" class="size-full transition-colors" />
</template>
