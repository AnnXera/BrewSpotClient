<!-- app/components/floor-plan/Table.vue -->
<!-- Renders the table SVG for a server asset_key, colored by status/selection and labeled with its number. -->
<script setup lang="ts">
import type { Component } from 'vue'
import { tableVisual } from '~/utils/tableColors'
import TableRec2 from './TableRec2.vue'
import TableRec4 from './TableRec4.vue'
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

const props = defineProps<{
  assetKey: string
  label?: string
  status?: string | null
  selected?: boolean
}>()

const component = computed(() => TABLES[props.assetKey])
const state = computed(() => tableVisual(props.status, props.selected))
</script>

<template>
  <component :is="component" v-if="component" :label="label" :state="state" class="size-full transition-colors" />
</template>
