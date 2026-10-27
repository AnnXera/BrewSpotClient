<!-- app/components/dashboard/DashboardHeader.vue -->
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

export interface BranchOption {
  uuid: string
  branch_name: string
  branch_type?: string
  address?: string | null
}

const props = withDefaults(
  defineProps<{
    title?: string
    branches?: BranchOption[]
    currentBranchUuid?: string
    branchBadge?: string
    isOpen?: boolean
    statusMainText?: string
    statusSubText?: string
    updatedAt?: string
    loading?: boolean
    refreshing?: boolean
  }>(),
  {
    title: 'Brew Haven',
    branches: () => [],
    currentBranchUuid: '',
    branchBadge: '',
    isOpen: true,
    statusMainText: '',
    statusSubText: '',
    updatedAt: '',
    loading: false,
    refreshing: false,
  }
)

const emit = defineEmits<{
  'update:currentBranchUuid': [uuid: string]
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

// 2. Branch Dropdown state
const isDropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const activeBranch = computed(() => {
  if (props.currentBranchUuid && props.branches?.length) {
    return props.branches.find(b => b.uuid === props.currentBranchUuid) || null
  }
  return null
})

const currentBranchLabel = computed(() => {
  if (props.branchBadge) return props.branchBadge
  if (activeBranch.value) return activeBranch.value.branch_name
  if (props.branches?.length) return props.branches[0]?.branch_name || 'Main Branch'
  return 'Main Branch'
})

function selectBranch(uuid: string) {
  emit('update:currentBranchUuid', uuid)
  isDropdownOpen.value = false
}

function handleDropdownClick() {
  if (props.branches && props.branches.length > 1) {
    isDropdownOpen.value = !isDropdownOpen.value
  }
}

function onDocumentClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isDropdownOpen.value = false
  }
}

// 3. Optional custom status (e.g. for Admin Platform Operational, excluding any "10 PM" or "Open until")
const hasCustomStatus = computed(() => {
  if (!props.statusMainText) return false
  const lower = props.statusMainText.toLowerCase()
  return !lower.includes('10 pm') && !lower.includes('open until')
})

// 4. Emil Kowalski Ticker: alternates between Date and "Open now" / "Closed now" every 5 seconds
const tickerState = ref<'date' | 'status'>('date')
let tickerTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  tickerTimer = setInterval(() => {
    tickerState.value = tickerState.value === 'date' ? 'status' : 'date'
  }, 5000)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
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

    <!-- Row 2: Title / Cafe Name + Branch Selector (side by side, tight leading) -->
    <div class="flex flex-wrap items-baseline gap-2.5 sm:gap-3.5 my-0.5">
      <h1 class="font-display text-[28px] sm:text-[34px] md:text-[40px] font-extrabold leading-none tracking-[-0.03em] text-[#3B1F0E]">
        <span v-if="loading && !title" class="skeleton inline-block h-9 w-52 rounded-md align-middle" />
        <template v-else>{{ title }}</template>
      </h1>

      <!-- Branch Dropdown right next to the title with Emil Kowalski press & spring interaction -->
      <div v-if="branches.length > 1" ref="dropdownRef" class="relative inline-block self-center sm:self-auto">
        <button
          type="button"
          @click="handleDropdownClick"
          class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-sm sm:text-base font-normal text-[#7D5A50] hover:text-[#3B1F0E] hover:bg-[#3B1F0E]/5 transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer select-none active:scale-[0.96]"
          aria-haspopup="listbox"
          :aria-expanded="isDropdownOpen"
        >
          <span class="max-w-[200px] sm:max-w-[280px] truncate">{{ currentBranchLabel }}</span>
          <Icon
            name="heroicons:chevron-down"
            class="w-4 h-4 text-[#8B6656] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
            :class="{ 'rotate-180': isDropdownOpen }"
          />
        </button>

        <Transition
          enter-active-class="transition duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] origin-top-left"
          enter-from-class="transform scale-[0.95] opacity-0 -translate-y-1"
          enter-to-class="transform scale-100 opacity-100 translate-y-0"
          leave-active-class="transition duration-120 ease-in origin-top-left"
          leave-from-class="transform scale-100 opacity-100 translate-y-0"
          leave-to-class="transform scale-[0.95] opacity-0 -translate-y-1"
        >
          <div
            v-if="isDropdownOpen"
            class="absolute left-0 mt-1.5 w-56 sm:w-64 rounded-2xl bg-white border border-[#E8E2D8] shadow-xl py-1.5 z-50 overflow-hidden"
            role="listbox"
          >
            <div class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#A98B7C] border-b border-[#F0EBE3]">
              Select Branch
            </div>
            <div class="max-h-60 overflow-y-auto py-1">
              <button
                v-for="b in branches"
                :key="b.uuid"
                type="button"
                @click="selectBranch(b.uuid)"
                class="w-full text-left px-3.5 py-2 text-xs sm:text-sm font-medium flex items-center justify-between hover:bg-[#FDF8F3] transition-colors duration-150 cursor-pointer active:bg-[#FAF4ED]"
                :class="b.uuid === currentBranchUuid ? 'text-[#3B1F0E] font-bold bg-[#FAF4ED]' : 'text-[#7D5A50]'"
                role="option"
                :aria-selected="b.uuid === currentBranchUuid"
              >
                <div class="min-w-0 pr-2">
                  <p class="truncate">{{ b.branch_name }}</p>
                  <p v-if="b.branch_type" class="text-[10px] text-[#A98B7C] uppercase font-mono">{{ b.branch_type }}</p>
                </div>
                <Icon
                  v-if="b.uuid === currentBranchUuid"
                  name="heroicons:check"
                  class="w-4 h-4 text-[#7B5A50] shrink-0 transition-transform duration-150 scale-100"
                />
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Static badge with chevron appearance if single/fixed branch -->
      <div
        v-else-if="currentBranchLabel"
        class="inline-flex items-center gap-1.5 px-2 py-0.5 text-sm sm:text-base font-normal text-[#7D5A50] select-none self-center sm:self-auto"
      >
        <span class="max-w-[200px] sm:max-w-[280px] truncate">{{ currentBranchLabel }}</span>
        <Icon name="heroicons:chevron-down" class="w-4 h-4 text-[#8B6656]/70" />
      </div>
    </div>

    <!-- Optional subtext row only if statusSubText or hasCustomStatus exists (e.g. Admin platform) -->
    <div v-if="hasCustomStatus || statusSubText" class="flex items-center gap-2 text-xs sm:text-[13px] text-[#8B6656] pt-0.5">
      <span v-if="hasCustomStatus" class="font-semibold text-[#3B1F0E]">{{ statusMainText }}</span>
      <span v-if="hasCustomStatus && statusSubText">·</span>
      <span v-if="statusSubText">{{ statusSubText }}</span>
    </div>
  </header>
</template>
