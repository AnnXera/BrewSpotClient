<script setup lang="ts">
// Status pill shown beside the Servings page titles.
// `live`: auto-refreshing data indicator. `alert`: the cafe-wide low stock threshold.
// `unsaved`: pending daily limit edits on a category page.
// All share one height and shape so they sit on the same line as each other and the title.
const props = defineProps<{
  variant: 'live' | 'alert' | 'unsaved'
  /** Low stock threshold percent, used by the `alert` variant. */
  percent?: number | null
  /** Pending edit count, used by the `unsaved` variant. */
  count?: number
}>()

const tooltip = computed(() => {
  if (props.variant === 'live') return 'Servings refresh automatically every 30 seconds'
  if (props.variant === 'alert') return `Items at or below ${props.percent}% of their portion limit are flagged as low stock`
  return 'Save your changes before leaving this page'
})

const tone = computed(() => ({
  live: 'bg-emerald-50 pr-3 text-emerald-800 ring-emerald-200',
  alert: 'bg-amber-50 pr-1 text-amber-900 ring-amber-200',
  unsaved: 'bg-[#F5E6D8] pr-3 text-[#5C3A2A] ring-[#E3CFB4]',
}[props.variant]))
</script>

<template>
  <span
    class="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full pl-2.5 text-[12px] font-semibold leading-none ring-1 ring-inset"
    :class="tone"
    :title="tooltip"
  >
    <template v-if="variant === 'live'">
      <span class="relative flex h-2 w-2" aria-hidden="true">
        <span class="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
        <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Live
    </template>

    <template v-else-if="variant === 'alert'">
      <Icon name="heroicons:bell-alert-solid" class="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
      Low stock alert
      <span class="rounded-full bg-amber-200/70 px-2 py-1 text-[11px] font-bold tabular-nums text-amber-900">
        &le;{{ percent }}%
      </span>
    </template>

    <template v-else>
      <Icon name="heroicons:pencil-square-solid" class="h-3.5 w-3.5 text-[#B4846C] motion-safe:animate-pulse" aria-hidden="true" />
      <span class="tabular-nums">{{ count }}</span> unsaved change{{ count === 1 ? '' : 's' }}
    </template>
  </span>
</template>
