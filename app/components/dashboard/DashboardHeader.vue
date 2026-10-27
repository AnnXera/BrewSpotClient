<!-- app/components/dashboard/DashboardHeader.vue -->
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    // Plain label beside the title (e.g. "Platform" on the admin dashboard). There is no
    // branch switcher: owners see every branch, and a manager runs exactly one.
    badge?: string
    isOpen?: boolean
    statusMainText?: string
    statusSubText?: string
    updatedAt?: string
    loading?: boolean
    refreshing?: boolean
  }>(),
  {
    title: 'Brew Haven',
    badge: '',
    isOpen: true,
    statusMainText: '',
    statusSubText: '',
    updatedAt: '',
    loading: false,
    refreshing: false,
  }
)

const emit = defineEmits<{
  'refresh': []
}>()

const authStore = useAuthStore()

// 1. Dynamic Greeting based on current hour
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h >= 4 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
})

const userName = computed(() => {
  return authStore.user?.firstname || ''
})

const formattedDate = computed(() => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date())
})

// 2. Optional custom status (e.g. for Admin Platform Operational, excluding any "10 PM" or "Open until")
const hasCustomStatus = computed(() => {
  if (!props.statusMainText) return false
  const lower = props.statusMainText.toLowerCase()
  return !lower.includes('10 pm') && !lower.includes('open until')
})

// 3. Emil Kowalski Ticker: alternates between Date and "Open now" / "Closed now" every 5 seconds
const tickerState = ref<'date' | 'status'>('date')
let tickerTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickerTimer = setInterval(() => {
    tickerState.value = tickerState.value === 'date' ? 'status' : 'date'
  }, 5000)
})

onUnmounted(() => {
  if (tickerTimer) {
    clearInterval(tickerTimer)
  }
})
</script>

<template>
  <header class="flex flex-col gap-0.5 sm:gap-1 pb-1">
    <!-- Row 1: Top Bar with Greeting/Ticker on the Left and Updated/Refresh on the Right -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <!-- Left: Greeting & Date / Status Animated Ticker -->
      <div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span class="text-sm md:text-[15px] font-bold text-[#3B1F0E] tracking-tight">
          {{ greeting }}<template v-if="userName">, {{ userName }}</template>
        </span>

        <!-- Emil Kowalski slide & fade text transition -->
        <div class="inline-flex items-center min-h-[20px] overflow-hidden">
          <Transition
            mode="out-in"
            enter-active-class="transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
            enter-from-class="opacity-0 translate-y-1.5"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1.5"
          >
            <span
              v-if="tickerState === 'date'"
              key="date"
              class="text-xs md:text-sm font-normal text-[#8B6656]"
            >
              {{ formattedDate }}
            </span>
            <span
              v-else
              key="status"
              class="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold"
              :class="isOpen ? 'text-emerald-700' : 'text-rose-700'"
            >
              <span
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :class="isOpen ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]'"
              />
              {{ isOpen ? 'Open now' : 'Closed now' }}
            </span>
          </Transition>
        </div>
      </div>

      <!-- Right: Adjusted Updated time + Refresh Button directly at the Top! -->
      <div class="flex items-center gap-2 text-xs sm:text-[13px] text-[#8B6656] shrink-0">
        <slot name="extra" />

        <span v-if="updatedAt" class="tabular-nums font-normal text-[#8B6656]">
          Updated {{ updatedAt }}
        </span>

        <!-- Refresh button with snappy Emil Kowalski active scale and hover tilt -->
        <button
          type="button"
          @click="emit('refresh')"
          :disabled="loading || refreshing"
          class="group p-1 rounded-md text-[#8B6656] hover:text-[#3B1F0E] hover:bg-[#3B1F0E]/5 transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.90] disabled:opacity-50 cursor-pointer"
          title="Refresh dashboard data"
          aria-label="Refresh dashboard data"
        >
          <Icon
            name="heroicons:arrow-path"
            class="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:rotate-45"
            :class="{ '!rotate-0 animate-spin': loading || refreshing }"
          />
        </button>
      </div>
    </div>

    <!-- Row 2: Title / Cafe Name + optional plain badge (tight leading) -->
    <div class="flex flex-wrap items-baseline gap-2.5 sm:gap-3.5 my-0.5">
      <h1 class="font-display text-[28px] sm:text-[34px] md:text-[40px] font-extrabold leading-none tracking-[-0.03em] text-[#3B1F0E]">
        <span v-if="loading && !title" class="skeleton inline-block h-9 w-52 rounded-md align-middle" />
        <template v-else>{{ title }}</template>
      </h1>

      <span
        v-if="badge"
        class="max-w-[200px] sm:max-w-[280px] truncate px-2 py-0.5 text-sm sm:text-base font-normal text-[#7D5A50] select-none self-center sm:self-auto"
      >{{ badge }}</span>
    </div>

    <!-- Optional subtext row only if statusSubText or hasCustomStatus exists (e.g. Admin platform) -->
    <div v-if="hasCustomStatus || statusSubText" class="flex items-center gap-2 text-xs sm:text-[13px] text-[#8B6656] pt-0.5">
      <span v-if="hasCustomStatus" class="font-semibold text-[#3B1F0E]">{{ statusMainText }}</span>
      <span v-if="hasCustomStatus && statusSubText">·</span>
      <span v-if="statusSubText">{{ statusSubText }}</span>
    </div>
  </header>
</template>
