<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useOperatingHours, sanitizeSchedule, DEFAULT_SCHEDULE, type DaySchedule } from '~/composables/useOperatingHours'

const props = defineProps<{
  show: boolean
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', schedule: DaySchedule[]): void
}>()

const { operatingHours } = useOperatingHours()

const weekSchedule = ref<DaySchedule[]>([])
const localError = ref('')
const errorDay = ref<string | null>(null)
const copyMenuDay = ref<string | null>(null)

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (copyMenuDay.value) copyMenuDay.value = null
  else emit('close')
}

watch(() => props.show, (open) => {
  if (open) {
    weekSchedule.value = sanitizeSchedule(operatingHours.value)
    localError.value = ''
    errorDay.value = null
    copyMenuDay.value = null
  }
  if (import.meta.client) {
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('keydown', onKeydown)
})

function closesAfterMidnight(item: DaySchedule) {
  return item.isOpen && !item.is24Hours && !!item.openTime && !!item.closeTime && item.closeTime < item.openTime
}

function copyFrom(source: DaySchedule, target: 'weekdays' | 'all') {
  weekSchedule.value.forEach(d => {
    if (d.day === source.day) return
    if (target === 'weekdays' && !WEEKDAYS.includes(d.day)) return
    d.isOpen = source.isOpen
    d.is24Hours = source.is24Hours
    d.openTime = source.openTime
    d.closeTime = source.closeTime
  })
  copyMenuDay.value = null
}

function onCopyMenuBlur(e: FocusEvent) {
  const wrapper = e.currentTarget as HTMLElement
  if (!wrapper.contains(e.relatedTarget as Node | null)) copyMenuDay.value = null
}

function handleResetDefaults() {
  weekSchedule.value = sanitizeSchedule(DEFAULT_SCHEDULE)
  errorDay.value = null
  localError.value = ''
}

function handleSave() {
  localError.value = ''
  errorDay.value = null

  const sameTimes = weekSchedule.value.find(d => d.isOpen && !d.is24Hours && d.openTime === d.closeTime)
  if (sameTimes) {
    localError.value = `${sameTimes.day}: opening and closing time can't be the same. Turn on 24h instead.`
    errorDay.value = sameTimes.day
    return
  }

  emit('save', JSON.parse(JSON.stringify(weekSchedule.value)))
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-y-auto">
    <!-- Overlay -->
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" @click="emit('close')"></div>

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hours-dialog-title"
      class="relative bg-white rounded-3xl w-full max-w-[720px] my-auto flex flex-col shadow-2xl"
    >
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 px-6 md:px-8 py-5 border-b border-[#EEDFC4]">
        <div>
          <h2 id="hours-dialog-title" class="text-xl md:text-2xl font-display font-bold text-[#3B1F0E]">Opening hours</h2>
          <p class="text-sm text-[#9E7060] mt-0.5">One schedule, shared by every branch. Times are Philippine time.</p>
        </div>
        <button
          type="button"
          @click="emit('close')"
          aria-label="Close"
          class="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-[#F5F5F5] text-[#7D5A50] hover:bg-[#EEDFC4] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Week -->
      <ul class="px-3 md:px-5 py-3 divide-y divide-[#F3E7D2]">
        <li
          v-for="item in weekSchedule"
          :key="item.day"
          class="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[6.5rem_auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2.5 px-3 py-3 rounded-xl"
          :class="errorDay === item.day ? 'bg-red-50 ring-1 ring-red-200' : ''"
        >
          <!-- Day + open switch -->
          <div class="flex items-center gap-3 md:contents">
          <span class="font-bold text-[15px]" :class="item.isOpen ? 'text-[#3B1F0E]' : 'text-[#9E7060]'">{{ item.day }}</span>

          <button
            type="button"
            role="switch"
            :aria-checked="item.isOpen"
            :aria-label="`${item.day} open`"
            @click="item.isOpen = !item.isOpen"
            class="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 focus-visible:ring-offset-2"
          >
            <span
              aria-hidden="true"
              class="relative inline-flex h-5 w-9 items-center rounded-full border transition-colors"
              :class="item.isOpen ? 'border-[#7D5A50] bg-[#7D5A50]' : 'border-[#B4846C] bg-white'"
            >
              <span
                class="rounded-full transition-[transform,width,height,background-color]"
                :class="item.isOpen ? 'h-4 w-4 translate-x-[17px] bg-white shadow-sm' : 'h-3.5 w-3.5 translate-x-[2px] bg-[#B4846C]'"
              ></span>
            </span>
          </button>
          </div>

          <!-- Times -->
          <div class="col-span-2 order-last md:col-span-1 md:order-none flex flex-wrap items-center gap-2 min-w-0 tabular-nums">
            <template v-if="!item.isOpen">
              <span class="text-sm font-semibold text-[#9E7060]">Closed</span>
            </template>
            <template v-else-if="item.is24Hours">
              <span class="text-sm font-semibold text-[#3B1F0E]">Open 24 hours</span>
            </template>
            <template v-else>
              <input
                type="time"
                v-model="item.openTime"
                :aria-label="`${item.day} opening time`"
                class="w-[8.25rem] bg-[#FEF8F0] border border-[#EEDFC4] text-[#3B1F0E] rounded-lg px-2.5 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#7D5A50]/40"
              />
              <span class="text-[#B4846C] font-bold" aria-hidden="true">to</span>
              <input
                type="time"
                v-model="item.closeTime"
                :aria-label="`${item.day} closing time`"
                class="w-[8.25rem] bg-[#FEF8F0] border border-[#EEDFC4] text-[#3B1F0E] rounded-lg px-2.5 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#7D5A50]/40"
              />
              <span
                v-if="closesAfterMidnight(item)"
                class="text-[11px] font-bold text-[#7D5A50] bg-[#FBF2E1] px-1.5 py-0.5 rounded-md whitespace-nowrap"
                title="Closes the next day"
              >+1 day</span>
            </template>
          </div>

          <!-- 24h + copy -->
          <div class="flex items-center justify-end gap-3 md:contents">
            <label
              class="inline-flex items-center gap-2 text-sm font-semibold text-[#5C4037] cursor-pointer"
              :class="{ 'opacity-40 pointer-events-none': !item.isOpen }"
            >
              <input
                type="checkbox"
                v-model="item.is24Hours"
                :disabled="!item.isOpen"
                class="w-4 h-4 rounded border-[#D9C4A8] text-[#7D5A50] focus:ring-[#7D5A50]"
              />
              24h
            </label>

            <div class="relative" @focusout="onCopyMenuBlur">
              <button
                type="button"
                @click="copyMenuDay = copyMenuDay === item.day ? null : item.day"
                :aria-expanded="copyMenuDay === item.day"
                aria-haspopup="menu"
                :aria-label="`Copy ${item.day}'s hours to other days`"
                class="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-[#7D5A50] hover:bg-[#FBF2E1] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
              >
                <Icon name="heroicons:document-duplicate" class="w-4 h-4 text-[#B4846C]" />
                Copy
              </button>
              <div
                v-if="copyMenuDay === item.day"
                role="menu"
                class="absolute right-0 top-full mt-1 z-10 w-44 bg-white border border-[#EEDFC4] rounded-xl shadow-lg py-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  @click="copyFrom(item, 'weekdays')"
                  class="w-full text-left px-3 py-2 text-sm font-semibold text-[#3B1F0E] hover:bg-[#FBF2E1] focus:bg-[#FBF2E1] outline-none"
                >
                  Copy to weekdays
                </button>
                <button
                  type="button"
                  role="menuitem"
                  @click="copyFrom(item, 'all')"
                  class="w-full text-left px-3 py-2 text-sm font-semibold text-[#3B1F0E] hover:bg-[#FBF2E1] focus:bg-[#FBF2E1] outline-none"
                >
                  Copy to all days
                </button>
              </div>
            </div>
          </div>
        </li>
      </ul>

      <p v-if="localError || error" role="alert" class="px-6 md:px-8 pb-4 text-sm font-bold text-red-700 whitespace-pre-line">
        {{ localError || error }}
      </p>

      <!-- Footer -->
      <div class="flex items-center justify-between px-6 md:px-8 py-5 border-t border-[#EEDFC4] bg-[#FAFAF8] rounded-b-3xl">
        <button
          type="button"
          @click="handleResetDefaults"
          class="text-sm font-bold text-[#9E7060] hover:text-[#7D5A50] underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 rounded"
        >
          Reset to defaults
        </button>
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="emit('close')"
            class="px-6 py-2.5 rounded-xl border border-[#EEDFC4] text-[#7D5A50] font-bold hover:bg-[#FDF3E7] transition outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleSave"
            :disabled="saving"
            class="px-6 py-2.5 rounded-xl bg-[#7D5A50] text-white font-bold hover:bg-[#5C413A] transition shadow-md flex items-center gap-2 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 focus-visible:ring-offset-2"
          >
            <Icon v-if="saving" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
            <span>Save hours</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
