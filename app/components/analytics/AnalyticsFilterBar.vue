<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DropdownList from '~/components/common/DropdownList.vue'
import EmilCalendar from '~/components/common/EmilCalendar.vue'
import { formatSpan, toDay } from '~/utils/dashboardFormat'
import { ANALYTICS_PRESETS, rangeFor, type AnalyticsFilterState, type AnalyticsPreset } from '~/utils/analyticsRange'

// Date range presets (or a custom range) and the branch picker for the Analytics page.
const props = defineProps<{
  modelValue: AnalyticsFilterState
  branches: { value: string | null; label: string }[] // empty: no branch picker (a manager's one branch)
  branchDisabled?: boolean // the Branches tab always shows every branch
}>()

const emit = defineEmits<{ 'update:modelValue': [AnalyticsFilterState] }>()

const presets = ANALYTICS_PRESETS

const today = toDay(new Date())
const oneYearAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 365); return toDay(d) })()

// Custom dates are edited here and only applied once both are valid.
const customFrom = ref(props.modelValue.from)
const customTo = ref(props.modelValue.to)
watch(() => [props.modelValue.from, props.modelValue.to], ([f, t]) => {
  customFrom.value = f!
  customTo.value = t!
})

const customError = computed(() => {
  if (!customFrom.value || !customTo.value) return 'Pick both dates.'
  if (customFrom.value > customTo.value) return 'The start date is after the end date.'
  if (customTo.value > today) return 'The end date is in the future.'
  const span = (Date.parse(customTo.value) - Date.parse(customFrom.value)) / 86400000
  if (span > 365) return 'Pick a range of one year or less.'
  return ''
})

function pick(preset: AnalyticsPreset) {
  if (preset === 'custom') {
    emit('update:modelValue', { ...props.modelValue, preset })
    return
  }
  emit('update:modelValue', { ...props.modelValue, preset, ...rangeFor(preset) })
}

// Apply only lights up once the dates differ from what is already showing.
const customChanged = computed(() => customFrom.value !== props.modelValue.from || customTo.value !== props.modelValue.to)

// Date fields match the white inputs used in the app's modals.
const dateButton = 'h-11 min-w-[160px] rounded-xl border border-[#D8C7B5] bg-white px-3 text-sm font-semibold text-[#3B1F0E] hover:border-[#B4846C]'

function applyCustom() {
  if (customError.value) return
  emit('update:modelValue', { ...props.modelValue, preset: 'custom', from: customFrom.value, to: customTo.value })
}

function setBranch(branch: string | null) {
  emit('update:modelValue', { ...props.modelValue, branch })
}
</script>

<template>
  <!-- One white card: date presets and the range they cover on the left, the branch on the
       right. Custom opens its two dates inside the same card. -->
  <div class="rounded-2xl border border-[#EEDFC4] bg-white p-2 shadow-sm">
    <div class="flex flex-col gap-2 lg:flex-row lg:items-center">
      <!-- No decorative calendar tile here: it looked like a date picker you could click -->
      <div class="flex min-w-0 items-center gap-2">
        <div class="filter-presets min-w-0 overflow-x-auto">
          <div role="radiogroup" aria-label="Date range" class="inline-flex gap-1 rounded-xl bg-[#FAF4ED] p-1">
            <button
              v-for="p in presets"
              :key="p.value"
              type="button"
              role="radio"
              :aria-checked="modelValue.preset === p.value"
              class="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
              :class="modelValue.preset === p.value
                ? 'bg-[#3B1F0E] text-[#FFF8EA] shadow-sm'
                : 'text-[#7D5A50] hover:bg-white hover:text-[#3B1F0E]'"
              @click="pick(p.value)"
            >
              <Icon v-if="p.value === 'custom'" name="heroicons:adjustments-horizontal" class="size-4" />
              {{ p.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center lg:ml-auto">
        <!-- What the current choice covers, so "This month" or "7 days" reads as real dates -->
        <span class="inline-flex items-center gap-1.5 px-1 text-[12px] font-semibold text-[#8B6656] tabular-nums sm:px-2">
          <Icon name="heroicons:clock" class="size-3.5 text-[#B4846C]" />
          {{ formatSpan(modelValue.from, modelValue.to) }}
        </span>
        <div v-if="branches.length" class="w-full sm:w-60">
          <DropdownList
            :model-value="branchDisabled ? null : modelValue.branch"
            :options="branches"
            size="sm"
            card
            icon="heroicons:building-storefront"
            aria-label="Branch"
            :disabled="branchDisabled"
            :title="branchDisabled ? 'The Branches tab always compares every branch' : undefined"
            align="right"
            @update:model-value="setBranch"
          />
        </div>
      </div>
    </div>

    <form
      v-if="modelValue.preset === 'custom'"
      class="mt-2 flex flex-col gap-3 rounded-xl border border-[#F0E4D3] bg-[#FDFBF7] p-3 sm:flex-row sm:flex-wrap sm:items-end"
      novalidate
      @submit.prevent="applyCustom"
    >
      <div class="flex flex-col gap-1.5">
        <span class="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#7D5A50]">
          <span class="size-1.5 rounded-full bg-[#B4846C]" aria-hidden="true" />
          From
        </span>
        <EmilCalendar
          v-model="customFrom"
          :min="oneYearAgo"
          :max="today"
          align="left"
          placeholder="Start date"
          :button-class="dateButton"
        />
      </div>
      <Icon name="heroicons:arrow-right" class="hidden size-4 shrink-0 self-end mb-3.5 text-[#B4846C] sm:block" aria-hidden="true" />
      <div class="flex flex-col gap-1.5">
        <span class="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#7D5A50]">
          <span class="size-1.5 rounded-full bg-[#B4846C]" aria-hidden="true" />
          To
        </span>
        <EmilCalendar
          v-model="customTo"
          :min="customFrom || oneYearAgo"
          :max="today"
          align="left"
          placeholder="End date"
          :button-class="dateButton"
        />
      </div>
      <button
        type="submit"
        :disabled="!!customError || !customChanged"
        class="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#3B1F0E] px-5 text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#2A1609] outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="heroicons:check" class="size-4" />
        Apply
      </button>
      <p v-if="customError" class="flex items-center gap-1.5 text-[12px] font-semibold text-[#A2352A] sm:mb-3" role="status">
        <Icon name="heroicons:exclamation-circle" class="size-4 shrink-0" />
        {{ customError }}
      </p>
    </form>
  </div>
</template>

<style scoped>
.filter-presets {
  scrollbar-width: none;
}
.filter-presets::-webkit-scrollbar {
  display: none;
}
</style>