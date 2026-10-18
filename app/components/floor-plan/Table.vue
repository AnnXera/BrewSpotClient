<!-- app/components/floor-plan/Table.vue -->
<!-- Renders the table SVG for a server asset_key, colored by status/selection and labeled with its number. -->
<script setup lang="ts">
import type { Component } from 'vue'
import { tableVisual } from '~/utils/tableColors'
import TableRec2 from './TableRec2.vue'
import TableRec4 from './TableRec4.vue'
import TableRnd from './TableRnd.vue'
import TableCommunal8 from './TableCommunal8.vue'
import TableBooth4 from './TableBooth4.vue'
import TableSqr from './TableSqr.vue'

const TABLES: Record<string, Component> = {
  table_round_4: TableRnd,
  table_communal_8: TableCommunal8,
  table_booth_4: TableBooth4,
  table_rec_2: TableRec2,
  table_rec_4: TableRec4,
  table_sqr_1: TableSqr,
  table_sqr_2: TableSqr,
  table_sqr_3: TableSqr,
  table_sqr_4: TableSqr,
}

const TABLE_SEATS: Record<string, 1 | 2 | 3 | 4> = {
  table_sqr_1: 1,
  table_sqr_2: 2,
  table_sqr_3: 3,
  table_sqr_4: 4,
}

const props = defineProps<{
  assetKey: string
  label?: string
  status?: string | null
  selected?: boolean
}>()

const component = computed(() => TABLES[props.assetKey])
const state = computed(() => tableVisual(props.status, props.selected))
const seats = computed(() => TABLE_SEATS[props.assetKey])
</script>

<template>
  <component :is="component" v-if="component" :label="label" :seats="seats" :state="state" class="size-full transition-colors" />
</template>
