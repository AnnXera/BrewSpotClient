<script setup lang="ts">
// Cafe-wide low stock threshold (%). Same boxed-section look as the add-on modal (AddonModal).
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

// Opened from a link (?edit=stock-limit) before the saved limit has loaded: pick it up when it arrives.
watch(
  () => props.currentPercent,
  (percent) => {
    if (props.show && percent && percent > 0) draftPercent.value = Math.min(99, Math.max(1, percent))
  },
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

function close() {
  if (!props.saving) emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.show) close()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const unchanged = computed(() => !!props.currentPercent && clampPercent(draftPercent.value) === props.currentPercent)
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200" aria-hidden="true" @click="close" />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="low-stock-title"
        class="relative bg-white rounded-3xl w-full max-w-[560px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        @submit.prevent="handleSubmit"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-4 px-6 md:px-8 pt-5 pb-4 border-b border-[#EEDFC4] bg-[#FDFBF7] shrink-0">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="heroicons:bell-alert" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h2 id="low-stock-title" class="text-xl font-display font-extrabold text-[#3B1F0E] truncate">Low Stock Alert Limit</h2>
              <p class="text-xs text-[#8A6E64] mt-0.5">Shared across all branches. Managers and you are alerted.</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            :disabled="saving"
            class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3B1F0E] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="close"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-4 space-y-4">
          <!-- ── Threshold ───────────────────────────────────────── -->
          <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5" aria-labelledby="low-stock-threshold-title">
            <div>
              <h3 id="low-stock-threshold-title" class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                <span>Threshold</span>
              </h3>
              <p class="text-[11px] text-[#8A6E64] mt-1">Alert when an item's remaining daily servings reach or drop below this percentage of its limit.</p>
            </div>

            <div>
              <label for="low-stock-percent" class="block text-xs font-bold text-[#3B1F0E] mb-1">Percentage <span class="text-red-500">*</span></label>
              <div class="flex items-center gap-2.5">
                <button
                  type="button"
                  :disabled="saving || draftPercent <= 1"
                  aria-label="Decrease percentage"
                  class="w-12 h-[46px] shrink-0 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] shadow-2xs hover:bg-[#FAF4ED] active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                  @click="stepBy(-1)"
                >
                  <Icon name="heroicons:minus" class="w-4 h-4" />
                </button>

                <div class="relative flex-1">
                  <input
                    id="low-stock-percent"
                    :value="draftPercent"
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    inputmode="numeric"
                    :disabled="saving"
                    class="w-full bg-white border border-[#D8C7B5] rounded-xl pl-3.5 pr-9 py-3 text-center text-base font-bold tabular-nums text-[#2D201B] shadow-2xs focus:outline-none focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    @input="onInput"
                  >
                  <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#B4846C]">%</span>
                </div>

                <button
                  type="button"
                  :disabled="saving || draftPercent >= 99"
                  aria-label="Increase percentage"
                  class="w-12 h-[46px] shrink-0 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] shadow-2xs hover:bg-[#FAF4ED] active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                  @click="stepBy(1)"
                >
                  <Icon name="heroicons:plus" class="w-4 h-4" />
                </button>
              </div>
              <p class="text-[11px] text-[#8A6E64] mt-1">Between 1% and 99%.</p>
            </div>

            <!-- Quick pick tiles, same selected look as the add-on item tiles -->
            <div>
              <span class="block text-[11px] font-bold text-[#8A6E64] uppercase tracking-wider mb-2">Quick pick</span>
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-2" role="group" aria-label="Quick pick a percentage">
                <button
                  v-for="preset in PRESETS"
                  :key="preset"
                  type="button"
                  :disabled="saving"
                  :aria-pressed="draftPercent === preset"
                  class="h-10 rounded-xl border bg-white text-sm font-bold tabular-nums transition-all cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                  :class="draftPercent === preset
                    ? 'border-[#3B1F0E] ring-1 ring-[#3B1F0E] text-[#2D201B] shadow-sm'
                    : 'border-[#D8C7B5] text-[#5C4037] hover:border-[#B4846C] hover:bg-[#FAF6F0] shadow-2xs'"
                  @click="draftPercent = preset; localError = ''"
                >
                  {{ preset }}%
                </button>
              </div>
            </div>
          </section>

          <!-- ── Example ─────────────────────────────────────────── -->
          <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs" aria-labelledby="low-stock-example-title">
            <h3 id="low-stock-example-title" class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              <span>Example</span>
            </h3>
            <div class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#D8C7B5] bg-white px-3.5 py-3 shadow-2xs">
              <span class="text-sm text-[#5C4037] leading-snug">
                An item with a <strong class="font-bold text-[#2D201B] tabular-nums">{{ sampleLimit }}-serving</strong> limit alerts at
                <strong class="font-bold text-[#2D201B] tabular-nums">{{ sampleTriggerServings }} or fewer left</strong>
              </span>
              <span class="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 tabular-nums">
                <Icon name="heroicons:bell-alert" class="w-3.5 h-3.5" />
                ≤{{ draftPercent }}%
              </span>
            </div>
          </section>

          <p v-if="localError || error" role="alert" class="text-red-600 text-xs font-semibold">{{ localError || error }}</p>
        </div>

        <!-- Footer: Cancel on the left, the main action on the right -->
        <div class="flex items-center justify-between gap-3 px-6 md:px-8 py-3.5 border-t border-[#EEDFC4] bg-[#FAF8F5] rounded-b-3xl shrink-0">
          <button
            type="button"
            :disabled="saving"
            class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="saving || unchanged"
            class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            <Icon v-if="saving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            <span>{{ saving ? 'Saving...' : `Save ${draftPercent}% Limit` }}</span>
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
