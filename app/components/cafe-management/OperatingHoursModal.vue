<script setup lang="ts">
import { ref, watch } from 'vue'
import { useOperatingHours, sanitizeSchedule, type DaySchedule } from '~/composables/useOperatingHours'

const props = defineProps<{
  show: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { hours: DaySchedule[]; applyToAll: boolean }): void
}>()

const { operatingHours, setOperatingHours, resetToDefault, formatTime12h } = useOperatingHours()

const applyToAll = ref(true)
const weekSchedule = ref<DaySchedule[]>([])

// Custom inputs for batch applying custom opening hours
const customOpenTime = ref('08:00')
const customCloseTime = ref('22:00')

watch(() => props.show, (newVal) => {
  if (newVal) {
    const raw = operatingHours.value
    weekSchedule.value = sanitizeSchedule(raw)
  }
}, { immediate: true })

// Apply custom owner-entered time to all open days
function applyCustomTime() {
  weekSchedule.value.forEach(item => {
    item.isOpen = true
    item.openTime = customOpenTime.value
    item.closeTime = customCloseTime.value
    item.is24Hours = false
  })
}

// Bulk toggle all open/closed
function toggleAllDays(isOpen: boolean) {
  weekSchedule.value.forEach(item => {
    item.isOpen = isOpen
  })
}

function handleResetDefaults() {
  resetToDefault()
  weekSchedule.value = sanitizeSchedule(operatingHours.value)
}

function handleSave() {
  setOperatingHours(weekSchedule.value)
  emit('save', {
    hours: JSON.parse(JSON.stringify(weekSchedule.value)),
    applyToAll: applyToAll.value
  })
}
</script>

<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <!-- Modal Container Box with Viewport Constraints -->
      <div class="bg-white border border-[#EEDFC4] rounded-[24px] max-w-2xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] my-auto">
        
        <!-- Modal Header (Pinned Top) -->
        <div class="flex items-center justify-between border-b border-[#F3E7D2] pb-3 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#7D5A50] text-white flex items-center justify-center shadow-md">
              <Icon name="heroicons:clock" class="w-5 h-5" />
            </div>
            <div>
              <h2 class="font-display font-extrabold text-lg sm:text-xl text-[#3D2B24]">Set General Operating Hours</h2>
              <p class="text-xs text-[#9E7060]">Input custom opening and closing times for your cafe branches.</p>
            </div>
          </div>
          <button @click="emit('close')" class="p-1.5 rounded-lg text-[#9E7060] hover:bg-[#FDF3E7] transition-colors">
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Scrollable Modal Body -->
        <div class="overflow-y-auto py-4 space-y-4 pr-1 flex-1">
          
          <!-- Custom Time Input Bar -->
          <div class="bg-[#FDF8F3] p-3.5 sm:p-4 rounded-2xl border border-[#EEDFC4] space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-extrabold text-[#3D2B24] uppercase tracking-wider">Quick Custom Time Setter</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="toggleAllDays(true)"
                  class="text-[11px] font-bold text-[#7D5A50] hover:underline"
                >
                  Select All
                </button>
                <span class="text-xs text-[#EEDFC4]">|</span>
                <button
                  type="button"
                  @click="toggleAllDays(false)"
                  class="text-[11px] font-bold text-[#9E7060] hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <div class="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#EEDFC4] shadow-2xs">
                <span class="text-xs font-bold text-[#9E7060]">Open:</span>
                <input
                  type="time"
                  v-model="customOpenTime"
                  class="text-xs font-bold text-[#3D2B24] focus:outline-none"
                />
              </div>

              <div class="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#EEDFC4] shadow-2xs">
                <span class="text-xs font-bold text-[#9E7060]">Close:</span>
                <input
                  type="time"
                  v-model="customCloseTime"
                  class="text-xs font-bold text-[#3D2B24] focus:outline-none"
                />
              </div>

              <button
                type="button"
                @click="applyCustomTime"
                class="px-3.5 py-1.5 rounded-xl bg-[#7D5A50] text-white text-xs font-bold hover:bg-[#65463D] transition shadow-xs flex items-center gap-1 shrink-0"
              >
                <Icon name="heroicons:check" class="w-3.5 h-3.5" />
                <span>Apply Time to All Days</span>
              </button>
            </div>
          </div>

          <!-- Apply to All Active Branches Checkbox -->
          <div class="flex items-center gap-2 px-1">
            <input
              id="applyToAllToggle"
              type="checkbox"
              v-model="applyToAll"
              class="w-4 h-4 rounded border-[#EEDFC4] text-[#7D5A50] focus:ring-[#7D5A50]"
            />
            <label for="applyToAllToggle" class="text-xs font-bold text-[#3D2B24]">
              Apply this schedule to all active cafe branches
            </label>
          </div>

          <!-- Weekly Schedule Custom Inputs -->
          <div class="space-y-2">
            <div
              v-for="item in weekSchedule"
              :key="item.day"
              class="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-[#F3E7D2] bg-white hover:border-[#7D5A50]/40 transition-colors gap-2 sm:gap-3"
            >
              <div class="flex items-center gap-3 w-32 shrink-0">
                <input
                  type="checkbox"
                  v-model="item.isOpen"
                  class="w-4 h-4 rounded border-[#EEDFC4] text-[#7D5A50] focus:ring-[#7D5A50]"
                />
                <span class="text-xs sm:text-sm font-bold text-[#3D2B24]">{{ item.day }}</span>
              </div>

              <div v-if="item.isOpen" class="flex flex-wrap items-center gap-2 text-xs">
                <div class="flex items-center gap-1.5">
                  <input
                    type="time"
                    v-model="item.openTime"
                    :disabled="item.is24Hours"
                    class="px-2.5 py-1 rounded-lg border border-[#EEDFC4] bg-[#FDF8F3] text-[#3D2B24] text-xs font-bold focus:outline-none focus:border-[#7D5A50] disabled:opacity-40"
                  />
                  <span class="text-[#9E7060] font-bold text-[11px]">to</span>
                  <input
                    type="time"
                    v-model="item.closeTime"
                    :disabled="item.is24Hours"
                    class="px-2.5 py-1 rounded-lg border border-[#EEDFC4] bg-[#FDF8F3] text-[#3D2B24] text-xs font-bold focus:outline-none focus:border-[#7D5A50] disabled:opacity-40"
                  />
                </div>

                <!-- 24 Hours Toggle -->
                <label class="flex items-center gap-1 text-[11px] text-[#7D5A50] font-bold cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    v-model="item.is24Hours"
                    class="w-3.5 h-3.5 rounded border-[#EEDFC4] text-[#7D5A50]"
                  />
                  <span>24 Hours</span>
                </label>

                <!-- Display 12-hour formatted time text -->
                <span v-if="!item.is24Hours" class="text-[10px] font-semibold text-[#9E7060] bg-[#FDF8F3] px-2 py-0.5 rounded border border-[#EEDFC4] shrink-0">
                  {{ formatTime12h(item.openTime) }} - {{ formatTime12h(item.closeTime) }}
                </span>
              </div>

              <div v-else class="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 shrink-0">
                Closed
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer Actions (Pinned Bottom) -->
        <div class="flex items-center justify-between pt-3 border-t border-[#F3E7D2] shrink-0">
          <button
            type="button"
            @click="handleResetDefaults"
            class="text-xs font-bold text-[#9E7060] hover:text-[#7D5A50] underline"
          >
            Reset Defaults
          </button>

          <div class="flex items-center gap-2.5">
            <button
              type="button"
              @click="emit('close')"
              class="px-4 py-2 rounded-xl border border-[#EEDFC4] text-[#7D5A50] font-semibold text-xs hover:bg-[#FDF3E7] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="handleSave"
              :disabled="saving"
              class="px-5 py-2 rounded-xl bg-[#7D5A50] text-white font-bold text-xs hover:bg-[#65463D] transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Icon v-if="saving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
              <span>Save Operating Hours</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
