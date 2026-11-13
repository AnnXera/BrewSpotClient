<!-- app/components/pos/PosCashierInfoCard.vue -->
<script setup lang="ts">
interface CashierDetails {
  uuid?: string
  name?: string
  firstname?: string
  lastname?: string
  role?: string
  employeeNumber?: string
  activeSince?: string | null
}

const props = withDefaults(
  defineProps<{
    cashier: CashierDetails | null
    deviceName?: string
    branchName?: string
    cafeName?: string
    todayOrdersCount?: number
    todayTotalAmount?: number
  }>(),
  {
    deviceName: 'Register 1',
    branchName: '',
    cafeName: 'BrewSpot',
    todayOrdersCount: 0,
    todayTotalAmount: 0,
  }
)

const emit = defineEmits<{
  (e: 'openTransactions'): void
}>()

// Interactive expansion state: collapses employee details, toggles on name click
const isExpanded = ref(false)

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

// Format currency for sales tally
const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })
function formatCurrency(val: number) {
  return money.format(val || 0)
}

function formatShiftTime(isoDate?: string | null) {
  if (!isoDate) return 'Active Now'
  try {
    return new Date(isoDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return 'Active Now'
  }
}
</script>

<template>
  <div class="w-full flex flex-col rounded-2xl bg-[#FAF8F5] border border-[#EFECE6] p-2.5 shadow-xs select-none gap-2 transition-all duration-300">
    <!-- Interactive Header: Click name or header to toggle the employee credentials -->
    <button
      type="button"
      @click="toggleExpanded"
      class="w-full flex items-center justify-between gap-2.5 p-1 rounded-xl text-left transition-all hover:bg-[#F2ECE4]/70 active:scale-[0.98] cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#7B5A50]/20"
      :aria-expanded="isExpanded"
      :title="isExpanded ? 'Click to hide details' : 'Click to view cashier details'"
    >
      <!-- Cashier Initial Avatar with subtle badge ring -->
      <div class="relative shrink-0">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7B5A50] to-[#5C453C] text-white flex items-center justify-center font-extrabold text-sm shadow-xs ring-2 ring-[#7B5A50]/15 group-hover:scale-105 transition-transform duration-200">
          {{ cashier?.firstname?.charAt(0)?.toUpperCase() || 'C' }}
        </div>
        <!-- Pulsing Online Badge -->
        <span class="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-[#FAF8F5]"></span>
        </span>
      </div>

      <!-- Cashier Name, Role & Status -->
      <div class="min-w-0 flex-1">
        <h3 class="text-xs font-extrabold text-[#2D201B] truncate leading-tight group-hover:text-[#7B5A50] transition-colors">
          {{ cashier?.name || cashier?.firstname || 'Cashier' }}
        </h3>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#EFECE6] text-[#6E554D] uppercase tracking-wider">
            {{ cashier?.role || 'Cashier' }}
          </span>
          <span class="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
            • On Duty
          </span>
        </div>
      </div>

      <!-- Expand/Collapse Chevron Indicator -->
      <div class="w-6 h-6 rounded-lg bg-white border border-[#E8E2D8] text-[#7B5A50] flex items-center justify-center shadow-2xs group-hover:border-[#7B5A50]/50 group-hover:bg-[#FFFDF9] transition-all shrink-0">
        <Icon
          name="heroicons:chevron-down"
          class="w-3.5 h-3.5 transition-transform duration-300 ease-out"
          :class="{ 'rotate-180 text-[#7B5A50]': isExpanded, 'text-gray-400': !isExpanded }"
        />
      </div>
    </button>

    <!-- Expandable Details Section (ONLY the credentials hide/show on click) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out overflow-hidden"
      enter-from-class="opacity-0 -translate-y-2 max-h-0"
      enter-to-class="opacity-100 translate-y-0 max-h-[300px]"
      leave-active-class="transition-all duration-200 ease-in overflow-hidden"
      leave-from-class="opacity-100 translate-y-0 max-h-[300px]"
      leave-to-class="opacity-0 -translate-y-2 max-h-0"
    >
      <div v-if="isExpanded" class="flex flex-col gap-2 pt-0.5">
        <!-- Perforated Divider -->
        <div class="border-b border-dashed border-[#E8E2D8]"></div>

        <!-- Employee Details Spec Card -->
        <div class="flex flex-col gap-1.5 bg-white rounded-xl p-2.5 border border-[#EFECE6] shadow-2xs text-[11px]">
          <!-- Employee ID -->
          <div class="flex items-center justify-between gap-2">
            <span class="text-[#8A6E64] flex items-center gap-1.5">
              <Icon name="heroicons:identification" class="w-3.5 h-3.5 text-[#7B5A50]" />
              <span>Employee No.</span>
            </span>
            <span class="font-mono font-bold text-[#2D201B] tracking-wide bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#EFECE6] text-[10px]">
              {{ cashier?.employeeNumber || 'EMP-0042' }}
            </span>
          </div>

          <!-- Position -->
          <div class="flex items-center justify-between gap-2">
            <span class="text-[#8A6E64] flex items-center gap-1.5">
              <Icon name="heroicons:briefcase" class="w-3.5 h-3.5 text-[#7B5A50]" />
              <span>Position</span>
            </span>
            <span class="font-bold text-[#2D201B] capitalize truncate max-w-[120px] text-right">
              {{ cashier?.role || 'Cashier' }}
            </span>
          </div>

          <!-- Terminal / Register -->
          <div class="flex items-center justify-between gap-2">
            <span class="text-[#8A6E64] flex items-center gap-1.5">
              <Icon name="heroicons:computer-desktop" class="w-3.5 h-3.5 text-[#7B5A50]" />
              <span>Terminal</span>
            </span>
            <span class="font-semibold text-[#2D201B] truncate max-w-[120px] text-right" :title="deviceName">
              {{ deviceName }}
            </span>
          </div>

          <!-- Branch -->
          <div v-if="branchName" class="flex items-center justify-between gap-2">
            <span class="text-[#8A6E64] flex items-center gap-1.5">
              <Icon name="heroicons:building-storefront" class="w-3.5 h-3.5 text-[#7B5A50]" />
              <span>Branch</span>
            </span>
            <span class="font-semibold text-[#2D201B] truncate max-w-[120px] text-right" :title="branchName">
              {{ branchName }}
            </span>
          </div>

          <!-- Shift Started / Session -->
          <div class="flex items-center justify-between gap-2">
            <span class="text-[#8A6E64] flex items-center gap-1.5">
              <Icon name="heroicons:clock" class="w-3.5 h-3.5 text-[#7B5A50]" />
              <span>Session</span>
            </span>
            <span class="font-semibold text-[#2D201B] text-right">
              {{ formatShiftTime(cashier?.activeSince) }}
            </span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Perforated Divider (Always visible above shift sales) -->
    <div class="border-b border-dashed border-[#E8E2D8] mt-0.5"></div>

    <!-- ALWAYS VISIBLE: Shift Sales & Orders Performance (NOT included in the collapsible hide section) -->
    <button
      @click="emit('openTransactions')"
      title="View today's register transactions & sales ledger"
      class="w-full grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white border border-[#EFECE6] hover:border-[#7B5A50]/40 hover:bg-[#FFFDF9] transition-all text-left group active:scale-[0.99] cursor-pointer shadow-2xs"
    >
      <div class="px-2 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#F2ECE4] flex flex-col justify-center">
        <div class="flex items-center gap-1 text-[9px] font-medium text-[#8A6E64]">
          <Icon name="heroicons:receipt-percent" class="w-3 h-3 text-[#7B5A50]" />
          <span>Orders</span>
        </div>
        <span class="text-xs font-extrabold text-[#2D201B] mt-0.5 group-hover:text-[#7B5A50] transition-colors">
          {{ todayOrdersCount }}
        </span>
      </div>

      <div class="px-2 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#F2ECE4] flex flex-col justify-center">
        <div class="flex items-center gap-1 text-[9px] font-medium text-[#8A6E64]">
          <Icon name="heroicons:banknotes" class="w-3 h-3 text-emerald-600" />
          <span>Total Sales</span>
        </div>
        <span class="text-xs font-extrabold text-[#2D201B] mt-0.5 truncate group-hover:text-[#7B5A50] transition-colors">
          {{ formatCurrency(todayTotalAmount) }}
        </span>
      </div>
    </button>
  </div>
</template>
