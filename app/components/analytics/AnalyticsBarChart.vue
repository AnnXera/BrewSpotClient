<script setup lang="ts">
import { computed, ref } from 'vue'
import { niceMax } from '~/utils/dashboardFormat'

// Single-series column chart with a hover/focus tooltip and a screen-reader table.
export interface BarPoint {
  key: string
  label: string   // under the bar
  title: string   // tooltip heading and table row
  value: number
  detail?: string // second tooltip line
}

const props = withDefaults(defineProps<{
  points: BarPoint[]
  formatAxis: (n: number) => string
  formatValue: (n: number) => string
  caption: string
  height?: number
}>(), { height: 260 })

const max = computed(() => niceMax(Math.max(0, ...props.points.map(p => p.value))))
const ticks = computed(() => [1, 0.75, 0.5, 0.25, 0].map(f => max.value * f))

// Keep about a dozen labels at most so they never collide.
const labelEvery = computed(() => Math.max(1, Math.ceil(props.points.length / 12)))
const labelEveryNarrow = computed(() => Math.max(1, Math.ceil(props.points.length / 6)))

const active = ref<number | null>(null)

function clip(value: number) {
  const hidden = value > 0 ? `min(calc(100% - 3px), ${100 - (value / max.value) * 100}%)` : '100%'
  return `inset(${hidden} 0 0 0 round 4px 4px 0 0)`
}

function tooltipAlign(i: number) {
  const n = props.points.length
  if (i < n * 0.2) return 'left-0'
  if (i > n * 0.8) return 'right-0'
  return 'left-1/2 -translate-x-1/2'
}

function onKey(e: KeyboardEvent, i: number) {
  const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
  if (next === null || next < 0 || next >= props.points.length) return
  e.preventDefault()
  ;((e.currentTarget as HTMLElement).parentElement?.children[next] as HTMLElement | undefined)?.focus()
}
</script>

<template>
  <div class="relative" :style="{ height: `${height}px` }">
    <!-- Gridlines + y labels -->
    <div class="pointer-events-none absolute inset-x-0 top-0 bottom-7" aria-hidden="true">
      <div
        v-for="(t, i) in ticks"
        :key="i"
        class="absolute inset-x-0 flex items-center"
        :style="{ top: `${(i / (ticks.length - 1)) * 100}%` }"
      >
        <span class="w-12 -translate-y-1/2 pr-2 text-right text-[11px] text-[#9E7060] tabular-nums">{{ formatAxis(t) }}</span>
        <span class="h-px flex-1 -translate-y-1/2" :class="t === 0 ? 'bg-[#D9C3A5]' : 'bg-[#F0E4D0]'" />
      </div>
    </div>

    <div class="absolute inset-0 left-12 flex" role="list" :aria-label="caption" @mouseleave="active = null">
      <div
        v-for="(p, i) in points"
        :key="p.key"
        role="listitem"
        tabindex="0"
        :aria-label="`${p.title}: ${formatValue(p.value)}${p.detail ? `, ${p.detail}` : ''}`"
        class="group relative flex min-w-0 flex-1 flex-col items-center outline-none"
        @mouseenter="active = i"
        @focus="active = i"
        @blur="active = null"
        @keydown="onKey($event, i)"
      >
        <div class="relative flex w-full flex-1 items-end justify-center" :class="points.length > 20 ? 'px-px' : 'px-[3px] sm:px-1.5'">
          <div
            class="bar h-full w-full max-w-[34px]"
            :class="{ 'bar--active': active === i }"
            :style="{ clipPath: clip(p.value) }"
          />
          <span class="pointer-events-none absolute inset-x-0 inset-y-0 rounded-md ring-2 ring-[#7D5A50] opacity-0 group-focus-visible:opacity-100" aria-hidden="true" />
          <div
            v-if="active === i"
            class="tooltip pointer-events-none absolute z-20 w-max min-w-[140px] rounded-xl bg-[#2D201B] px-3.5 py-2.5 text-left shadow-[0_10px_24px_-10px_rgba(45,32,27,0.6)]"
            :class="tooltipAlign(i)"
            :style="{ bottom: `calc(${(p.value / max) * 100}% + 8px)` }"
            aria-hidden="true"
          >
            <p class="text-[11px] text-[#D9BFA8]">{{ p.title }}</p>
            <p class="mt-1 font-display text-base font-semibold text-[#FFF0D1] tabular-nums">{{ formatValue(p.value) }}</p>
            <p v-if="p.detail" class="text-[11px] text-[#D9BFA8] tabular-nums">{{ p.detail }}</p>
          </div>
        </div>
        <span
          class="h-7 overflow-visible whitespace-nowrap pt-2 text-[11px] tabular-nums"
          :class="[
            active === i ? 'font-semibold text-[#3B1F0E]' : 'text-[#9E7060]',
            i % labelEvery !== 0 ? 'sm:invisible' : '',
            i % labelEveryNarrow !== 0 ? 'max-sm:invisible' : '',
          ]"
          aria-hidden="true"
        >{{ p.label }}</span>
      </div>
    </div>

    <table class="sr-only">
      <caption>{{ caption }}</caption>
      <tbody>
        <tr v-for="p in points" :key="p.key">
          <th scope="row">{{ p.title }}</th>
          <td>{{ formatValue(p.value) }}</td>
          <td v-if="p.detail">{{ p.detail }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.bar {
  background: #B4846C;
  transition: clip-path 520ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease;
}

.group:hover .bar,
.bar--active {
  background: #7D5A50;
}

.tooltip {
  animation: tip-in 160ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes tip-in {
  from { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .bar, .tooltip { transition: none; animation: none; }
}
</style>
