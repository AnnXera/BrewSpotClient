<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DropdownList from '~/components/common/DropdownList.vue'
import { toDay } from '~/utils/dashboardFormat'
import { ANALYTICS_PRESETS, rangeFor, type AnalyticsFilterState, type AnalyticsPreset } from '~/utils/analyticsRange'

// Date range presets (or a custom range) and the branch picker for the Analytics page.
const props = defineProps<{
  modelValue: AnalyticsFilterState
  branches: { value: string | null; label: string }[]
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

function applyCustom() {
  if (customError.value) return
  emit('update:modelValue', { ...props.modelValue, preset: 'custom', from: customFrom.value, to: customTo.value })
}

function setBranch(branch: string | null) {
  emit('update:modelValue', { ...props.modelValue, branch })
}
</script>

<template>
  <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div class="tabstrip -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="radiogroup" aria-label="Date range" class="inline-flex gap-0.5 rounded-[12px] bg-[#F3E7D2] p-[3px]">
        <button
          v-for="p in presets"
          :key="p.value"
          type="button"
          role="radio"
          :aria-checked="modelValue.preset === p.value"
          class="whitespace-nowrap rounded-[9px] px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          :class="modelValue.preset === p.value ? 'bg-white text-[#3B1F0E] shadow-[0_1px_3px_rgba(59,31,14,0.18)]' : 'text-[#8B6656] hover:text-[#3B1F0E]'"
          @click="pick(p.value)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <div class="w-full sm:w-64">
      <DropdownList
        :model-value="modelValue.branch"
        :options="branches"
        size="sm"
        icon="heroicons:building-storefront"
        aria-label="Branch"
        :disabled="branchDisabled"
        :title="branchDisabled ? 'The Branches tab always compares every branch' : undefined"
        align="right"
        @update:model-value="setBranch"
      />
    </div>
  </div>

  <form
    v-if="modelValue.preset === 'custom'"
    class="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-[#EEDFC4] bg-white px-4 py-3"
    novalidate
    @submit.prevent="applyCustom"
  >
    <label class="flex flex-col gap-1 text-[12px] font-medium text-[#8B6656]">
      From
      <input
        v-model="customFrom"
        type="date"
        :min="oneYearAgo"
        :max="today"
        class="h-10 rounded-xl border border-[#E3CFB4] bg-[#FFFDF9] px-3 text-sm text-[#3B1F0E] focus:border-[#7D5A50] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30"
      >
    </label>
    <label class="flex flex-col gap-1 text-[12px] font-medium text-[#8B6656]">
      To
      <input
        v-model="customTo"
        type="date"
        :max="today"
        class="h-10 rounded-xl border border-[#E3CFB4] bg-[#FFFDF9] px-3 text-sm text-[#3B1F0E] focus:border-[#7D5A50] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30"
      >
    </label>
    <button
      type="submit"
      :disabled="!!customError"
      class="h-10 rounded-xl bg-[#7D5A50] px-4 text-sm font-semibold text-[#FFF0D1] transition-colors hover:bg-[#684940] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Apply
    </button>
    <p v-if="customError" class="w-full text-[12px] text-[#A2352A] sm:w-auto" role="status">{{ customError }}</p>
  </form>
</template>
