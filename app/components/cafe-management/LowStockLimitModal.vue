<script setup lang="ts">
import DialogShell from '~/components/common/DialogShell.vue'

const props = defineProps<{
  show: boolean
  currentPercent: number | null
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', percent: number): void
}>()

const PRESETS = [10, 15, 20, 25, 30, 50]

const draftPercent = ref<number>(25)
const localError = ref('')

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      draftPercent.value = props.currentPercent && props.currentPercent > 0
        ? Math.min(99, Math.max(1, props.currentPercent))
        : 25
      localError.value = ''
    }
  },
  { immediate: true },
)

function clampPercent(val: number) {
  if (!Number.isFinite(val)) return 1
  return Math.min(99, Math.max(1, Math.round(val)))
}

function stepBy(delta: number) {
  draftPercent.value = clampPercent(draftPercent.value + delta)
  localError.value = ''
}

function onInput(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(raw)) {
    draftPercent.value = Math.min(99, Math.max(1, Math.round(raw)))
    localError.value = ''
  }
}

const sampleLimit = 50
const sampleTriggerServings = computed(() =>
  Math.max(1, Math.floor(sampleLimit * (clampPercent(draftPercent.value) / 100))),
)

function handleSubmit() {
  localError.value = ''
  const n = Number(draftPercent.value)
  if (!Number.isFinite(n) || n < 1 || n > 99) {
    localError.value = 'Please enter a low stock threshold between 1% and 99%.'
    return
  }
  emit('save', Math.round(n))
}
</script>

<template>
  <DialogShell
    :open="show"
    tone="warn"
    icon="heroicons:bell-alert"
    title="Low stock alert limit"
    message="Notify branch managers and the cafe owner when any item's remaining daily servings reach or drop below this percentage."
    :busy="saving"
    @close="emit('close')"
  >
    <div class="space-y-3.5">
      <!-- Threshold Stepper + Segmented Presets -->
      <div class="rounded-2xl bg-[#FAF4EC] border border-[#EDD8CC] p-4 space-y-3.5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[12px] font-semibold text-[#3D2B24]">
              Threshold percentage
            </p>
            <p class="text-[11.5px] text-[#7D5A50]">
              Shared across all branches (1% – 99%)
            </p>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              :disabled="saving || draftPercent <= 1"
              aria-label="Decrease percentage"
              class="size-9 rounded-xl bg-[#FFFDF9] border border-[#E3CFB4] text-[#3D2B24] hover:border-[#7D5A50] active:scale-[0.95] transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              @click="stepBy(-1)"
            >
              <Icon name="heroicons:minus" class="size-4" />
            </button>

            <div class="relative flex items-center">
              <input
                data-autofocus
                :value="draftPercent"
                type="number"
                min="1"
                max="99"
                step="1"
                inputmode="numeric"
                :disabled="saving"
                aria-label="Low stock threshold percentage"
                class="w-[74px] h-9 rounded-xl bg-[#FFFDF9] border border-[#7D5A50] pl-2.5 pr-6 text-center font-display font-bold text-[16px] text-[#3D2B24] tabular-nums outline-none focus:ring-2 focus:ring-[#7D5A50]/25 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                @input="onInput"
                @keydown.enter.prevent="handleSubmit"
              >
              <span class="pointer-events-none absolute right-2.5 font-display font-semibold text-xs text-[#7D5A50]">
                %
              </span>
            </div>

            <button
              type="button"
              :disabled="saving || draftPercent >= 99"
              aria-label="Increase percentage"
              class="size-9 rounded-xl bg-[#FFFDF9] border border-[#E3CFB4] text-[#3D2B24] hover:border-[#7D5A50] active:scale-[0.95] transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              @click="stepBy(1)"
            >
              <Icon name="heroicons:plus" class="size-4" />
            </button>
          </div>
        </div>

        <!-- Segmented Quick Presets -->
        <div class="grid grid-cols-6 gap-1.5 rounded-xl bg-[#F2E6D8] p-1">
          <button
            v-for="preset in PRESETS"
            :key="preset"
            type="button"
            :disabled="saving"
            class="h-8 rounded-lg text-xs font-semibold tabular-nums transition-all duration-150 cursor-pointer active:scale-[0.97]"
            :class="draftPercent === preset
              ? 'bg-[#FFFDF9] text-[#3D2B24] shadow-[0_1px_2px_rgba(61,43,36,0.12)] font-bold'
              : 'text-[#7D5A50] hover:text-[#3D2B24]'"
            @click="draftPercent = preset; localError = ''"
          >
            {{ preset }}%
          </button>
        </div>
      </div>

      <!-- Restrained Example & Scope Summary -->
      <div class="rounded-xl bg-[#FFFDF9] border border-[#EDD8CC] px-3.5 py-3 flex items-center justify-between gap-3 text-[12px] text-[#6B5A52]">
        <span class="leading-snug">
          Example: <strong class="font-semibold text-[#3D2B24] tabular-nums">{{ sampleLimit }} servings</strong> alerts at
          <strong class="font-semibold text-[#3D2B24] tabular-nums">≤ {{ sampleTriggerServings }} left ({{ draftPercent }}%)</strong>
        </span>
        <span class="shrink-0 inline-flex items-center gap-1 rounded-md bg-[#F6EBDD] px-2 py-0.5 text-[11px] font-semibold text-[#7D5A50]">
          Manager &amp; Owner
        </span>
      </div>

      <p v-if="localError || error" role="alert" class="text-xs font-semibold text-[#9E4F47] bg-[#F3DFDC]/60 border border-[#E5C5C0] rounded-xl px-3.5 py-2.5">
        {{ localError || error }}
      </p>
    </div>

    <template #actions>
      <button
        type="button"
        :disabled="saving"
        class="h-10 px-4 rounded-xl border border-[#E0D2C3] bg-[#FFFDF9] text-[13px] font-semibold text-[#4E3B33] hover:bg-[#F5ECE0] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        type="button"
        :disabled="saving"
        class="h-10 px-5 rounded-xl bg-[#3D2B24] hover:bg-[#2B1E19] text-[#FFFDF9] text-[13px] font-semibold shadow-sm active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 tabular-nums"
        @click="handleSubmit"
      >
        <Icon v-if="saving" name="heroicons:arrow-path" class="size-4 animate-spin" />
        <span>{{ saving ? 'Saving…' : `Save ${draftPercent}% limit` }}</span>
      </button>
    </template>
  </DialogShell>
</template>
