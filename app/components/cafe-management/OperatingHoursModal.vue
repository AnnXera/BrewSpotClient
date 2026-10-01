<script setup lang="ts">
import { ref, watch } from 'vue'
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

const { operatingHours, formatTime12h } = useOperatingHours()

const weekSchedule = ref<DaySchedule[]>([])
const localError = ref('')

const customOpenTime = ref('08:00')
const customCloseTime = ref('22:00')

watch(() => props.show, (newVal) => {
  if (newVal) {
    weekSchedule.value = sanitizeSchedule(operatingHours.value)
    localError.value = ''
  }
}, { immediate: true })

function applyCustomTime() {
  weekSchedule.value.forEach(item => {
    item.isOpen = true
    item.openTime = customOpenTime.value
    item.closeTime = customCloseTime.value
    item.is24Hours = false
  })
}

function toggleAllDays(isOpen: boolean) {
  weekSchedule.value.forEach(item => {
    item.isOpen = isOpen
  })
}

function handleResetDefaults() {
  weekSchedule.value = sanitizeSchedule(DEFAULT_SCHEDULE)
}

function closesAfterMidnight(item: DaySchedule) {
  return item.isOpen && !item.is24Hours && !!item.openTime && !!item.closeTime && item.closeTime < item.openTime
}

const activeDay = ref<string | null>(null)

function handleSave() {
  localError.value = ''

  const sameTimes = weekSchedule.value.find(d => d.isOpen && !d.is24Hours && d.openTime === d.closeTime)
  if (sameTimes) {
    localError.value = `${sameTimes.day}: opening and closing time can't be the same. Use 24 Hours instead.`
    activeDay.value = sameTimes.day
    return
  }

  emit('save', JSON.parse(JSON.stringify(weekSchedule.value)))
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-y-auto">
    <!-- Overlay -->
    <div 
      class="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      @click="emit('close')"
    ></div>

    <!-- Modal Content -->
    <div class="relative bg-white rounded-3xl w-full max-w-[806px] my-auto flex flex-col shadow-2xl">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-6 md:px-8 py-5 border-b border-[#EEDFC4] shrink-0">
        <h2 class="text-xl md:text-2xl font-display font-bold text-[#3B1F0E]">
          Operating Hours
        </h2>
        <button 
          @click="emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F5F5] text-[#7D5A50] hover:bg-[#EEDFC4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/40"
          title="Close Modal"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 md:p-8 flex flex-col gap-6 md:gap-8">
        
        <!-- Quick Fill -->
        <div class="flex flex-col md:flex-row gap-6">
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-bold text-[#B4846C] uppercase tracking-wider">Quick Custom Setter</label>
              <div class="flex items-center gap-2 text-xs text-[#7D5A50]">
                <button @click="toggleAllDays(true)" class="hover:underline font-bold">Select All</button>
                <span class="text-[#EEDFC4]">|</span>
                <button @click="toggleAllDays(false)" class="hover:underline font-bold">Deselect All</button>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3 bg-[#fef8f0] p-4 rounded-xl border border-[#EEDFC4]">
              <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#EEDFC4]">
                <span class="text-xs font-bold text-[#B4846C]">Open:</span>
                <input type="time" v-model="customOpenTime" class="text-sm font-bold text-[#3B1F0E] focus:outline-none" />
              </div>
              <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#EEDFC4]">
                <span class="text-xs font-bold text-[#B4846C]">Close:</span>
                <input type="time" v-model="customCloseTime" class="text-sm font-bold text-[#3B1F0E] focus:outline-none" />
              </div>
              <button @click="applyCustomTime" class="px-4 py-2 rounded-lg bg-[#7D5A50] text-white text-sm font-bold hover:bg-[#5C413A] transition">
                Apply to All
              </button>
            </div>
          </div>
        </div>

        <hr class="border-[#EEDFC4]" />

        <!-- Weekly Schedule Accordion -->
        <div>
          <label class="block text-xs font-bold text-[#B4846C] uppercase tracking-wider mb-4">Weekly Schedule</label>
          <div class="flex flex-col gap-3">
            <div 
              v-for="item in weekSchedule" 
              :key="item.day"
              class="border border-[#EEDFC4] rounded-xl overflow-hidden bg-[#fef8f0]"
            >
              <!-- Accordion Header -->
              <div 
                @click="activeDay = activeDay === item.day ? null : item.day"
                class="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-[#FBF2E1] transition-colors"
              >
                <div class="flex items-center gap-4">
                  <input 
                    type="checkbox" 
                    v-model="item.isOpen" 
                    @click.stop 
                    class="w-4 h-4 rounded border-[#EEDFC4] text-[#7D5A50] focus:ring-[#7D5A50]"
                  />
                  <span class="font-bold text-[#3B1F0E] text-[15px]">{{ item.day }}</span>
                </div>
                <div class="flex items-center gap-4">
                  <span v-if="!item.isOpen" class="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg">Closed</span>
                  <span v-else-if="item.is24Hours" class="text-xs font-bold text-[#B4846C] bg-white px-3 py-1 rounded-lg border border-[#EEDFC4]">24 Hours</span>
                  <span v-else class="text-xs font-bold text-[#B4846C] bg-white px-3 py-1 rounded-lg border border-[#EEDFC4]">
                    {{ formatTime12h(item.openTime) }} - {{ formatTime12h(item.closeTime) }}<template v-if="closesAfterMidnight(item)"> (next day)</template>
                  </span>
                  <Icon 
                    name="heroicons:chevron-down" 
                    class="w-6 h-6 text-[#B4846C] transition-transform" 
                    :class="{'rotate-180': activeDay === item.day}" 
                  />
                </div>
              </div>

              <!-- Accordion Content -->
              <div 
                v-show="activeDay === item.day"
                class="p-5 border-t border-[#EEDFC4] bg-white flex flex-col sm:flex-row sm:items-center gap-6"
              >
                <div class="flex-1 flex items-center gap-4" :class="{'opacity-40 pointer-events-none': !item.isOpen || item.is24Hours}">
                  <div class="flex flex-col gap-1">
                    <span class="text-xs font-bold text-[#B4846C] uppercase">Opening Time</span>
                    <input type="time" v-model="item.openTime" class="bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl px-4 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/40" />
                  </div>
                  <span class="text-[#B4846C] font-bold mt-5">-</span>
                  <div class="flex flex-col gap-1">
                    <span class="text-xs font-bold text-[#B4846C] uppercase">Closing Time</span>
                    <input type="time" v-model="item.closeTime" class="bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl px-4 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/40" />
                  </div>
                </div>
                <label class="flex items-center gap-3 cursor-pointer mt-5 sm:mt-0" :class="{'opacity-40 pointer-events-none': !item.isOpen}">
                  <input type="checkbox" v-model="item.is24Hours" class="w-5 h-5 rounded border-[#EEDFC4] text-[#7D5A50] focus:ring-[#7D5A50]" />
                  <span class="text-base font-bold text-[#3B1F0E]">24 Hours</span>
                </label>
              </div>
            </div>
          </div>
        </div>

      </div>

      <p v-if="localError || error" class="px-6 md:px-8 pb-4 text-sm font-bold text-red-600 whitespace-pre-line">
        {{ localError || error }}
      </p>

      <!-- Footer -->
      <div class="flex items-center justify-between px-6 md:px-8 py-5 border-t border-[#EEDFC4] shrink-0 bg-[#FAFAF8] rounded-b-3xl">
        <button 
          @click="handleResetDefaults" 
          class="text-sm font-bold text-[#B4846C] hover:text-[#7D5A50] underline focus:outline-none"
        >
          Reset Defaults
        </button>
        <div class="flex items-center gap-3">
          <button 
            @click="emit('close')" 
            class="px-6 py-2.5 rounded-xl border border-[#EEDFC4] text-[#7D5A50] font-bold hover:bg-[#FDF3E7] transition focus:outline-none"
          >
            Cancel
          </button>
          <button 
            @click="handleSave" 
            :disabled="saving"
            class="px-6 py-2.5 rounded-xl bg-[#7D5A50] text-white font-bold hover:bg-[#5C413A] transition shadow-md flex items-center gap-2 disabled:opacity-50 focus:outline-none"
          >
            <Icon v-if="saving" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
            <span>Save Schedule</span>
          </button>
        </div>
      </div>
      
    </div>
  </div>
</template>
