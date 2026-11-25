<script setup lang="ts">
// Brand-styled checkbox. A real (visually hidden) input keeps keyboard, focus and
// screen-reader behaviour; the box beside it is the visible control.
const props = withDefaults(defineProps<{
  checked?: boolean
  indeterminate?: boolean
  disabled?: boolean
  ariaLabel?: string
  title?: string
}>(), {
  checked: false,
  indeterminate: false,
  disabled: false,
})

const emit = defineEmits<{ change: [checked: boolean] }>()

const on = computed(() => props.checked || props.indeterminate)
</script>

<template>
  <label
    class="relative inline-flex items-center justify-center shrink-0 p-1 -m-1 group/cb"
    :class="disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'"
    :title="title"
    @click.stop
  >
    <input
      type="checkbox"
      class="peer sr-only"
      :checked="checked"
      :indeterminate.prop="indeterminate"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-checked="indeterminate ? 'mixed' : checked"
      @change="emit('change', ($event.target as HTMLInputElement).checked)"
    />
    <span
      aria-hidden="true"
      class="w-[18px] h-[18px] rounded-[6px] border-[1.5px] flex items-center justify-center transition-colors duration-150 ease-out peer-focus-visible:ring-4 peer-focus-visible:ring-[#7D5A50]/25"
      :class="on
        ? 'bg-[#7D5A50] border-[#7D5A50] shadow-[0_1px_2px_rgba(61,43,36,0.25)]'
        : ['bg-[#FFFDF9] border-[#D9C4A8] shadow-[inset_0_1px_1px_rgba(61,43,36,0.06)]', disabled ? '' : 'group-hover/cb:border-[#B4846C] group-hover/cb:bg-[#FBF2E1]']"
    >
      <span v-if="indeterminate" class="w-2 h-[2px] rounded-full bg-[#FFF8EA]" />
      <Icon
        v-else
        name="heroicons:check-20-solid"
        class="w-3.5 h-3.5 text-[#FFF8EA] transition-[opacity,transform] duration-150 ease-out"
        :class="checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'"
      />
    </span>
  </label>
</template>
