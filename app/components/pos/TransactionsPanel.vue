<script setup lang="ts">
// Today's sales for this register's branch: totals, an hour-by-hour rhythm, and the sales ledger.
interface PosTransaction {
  uuid: string
  receipt_number: string | null
  created_at: string
  staff_name: string
  total_amount: number
  status: string
  items_count: number
}

interface TransactionsData {
  today_total: number
  today_count: number
  month_total: number
  transactions: PosTransaction[]
}

const props = defineProps<{
  data: TransactionsData | null
  loading: boolean
  error: string
  branchName?: string
}>()

const emit = defineEmits<{
  close: []
  retry: []
  export: []
  print: []
}>()

const closeButton = ref<HTMLButtonElement | null>(null)
onMounted(() => closeButton.value?.focus())

const searchQuery = ref('')
const selectedHour = ref<number | null>(null)

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
function formatCurrency(amount: number) {
  return money.format(amount || 0)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function hourLabel(h: number, short = false) {
  const suffix = h < 12 ? (short ? 'a' : ' AM') : (short ? 'p' : ' PM')
  return `${h % 12 === 0 ? 12 : h % 12}${suffix}`
}

const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

const sales = computed(() =>
  [...(props.data?.transactions ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
)

const averageSale = computed(() => {
  const count = props.data?.today_count ?? 0
  return count ? (props.data?.today_total ?? 0) / count : 0
})

// One bar per hour, from the first sale (or now) through the current hour.
const hours = computed(() => {
  if (!sales.value.length) return []
  const byHour = new Map<number, { count: number; total: number }>()
  for (const t of sales.value) {
    const h = new Date(t.created_at).getHours()
    const slot = byHour.get(h) ?? { count: 0, total: 0 }
    slot.count++
    slot.total += t.total_amount
    byHour.set(h, slot)
  }
  const seen = [...byHour.keys(), new Date().getHours()]
  const first = Math.min(...seen)
  const last = Math.max(...seen)
  const peak = Math.max(...[...byHour.values()].map(s => s.total), 1)
  return Array.from({ length: last - first + 1 }, (_, i) => {
    const hour = first + i
    const slot = byHour.get(hour) ?? { count: 0, total: 0 }
    return { hour, ...slot, ratio: slot.total / peak }
  })
})

const busiestHour = computed(() =>
  hours.value.reduce<typeof hours.value[number] | null>((best, h) => (!best || h.total > best.total ? h : best), null)
)

function toggleHour(hour: number) {
  selectedHour.value = selectedHour.value === hour ? null : hour
}

const filteredSales = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return sales.value.filter((t) => {
    if (selectedHour.value !== null && new Date(t.created_at).getHours() !== selectedHour.value) return false
    if (!q) return true
    return t.uuid.toLowerCase().includes(q) || t.staff_name.toLowerCase().includes(q)
  })
})

const isFiltered = computed(() => selectedHour.value !== null || searchQuery.value.trim() !== '')
const filteredTotal = computed(() => filteredSales.value.reduce((sum, t) => sum + t.total_amount, 0))

// Ledger grouped by hour, newest hour first.
const groups = computed(() => {
  const out: { hour: number; total: number; sales: PosTransaction[] }[] = []
  for (const t of filteredSales.value) {
    const hour = new Date(t.created_at).getHours()
    let group = out[out.length - 1]
    if (!group || group.hour !== hour) {
      group = { hour, total: 0, sales: [] }
      out.push(group)
    }
    group.sales.push(t)
    group.total += t.total_amount
  }
  return out
})

function clearFilters() {
  searchQuery.value = ''
  selectedHour.value = null
}

const isSettled = (status: string) => ['completed', 'paid'].includes(status?.toLowerCase())

// Tapping a sale opens its details over the list; the list stays mounted so its scroll and filters survive.
const openSale = ref<PosTransaction | null>(null)
let returnFocusTo: HTMLElement | null = null

function viewSale(txn: PosTransaction, e: Event) {
  returnFocusTo = e.currentTarget as HTMLElement
  openSale.value = txn
}

function closeSale() {
  openSale.value = null
  nextTick(() => returnFocusTo?.focus())
}

// Escape steps back from a sale before it closes the panel (the page listens on window too).
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && openSale.value) {
    e.stopImmediatePropagation()
    closeSale()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown, true))
onUnmounted(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <div class="fixed inset-0 z-50 flex justify-end print:hidden" role="dialog" aria-modal="true" aria-labelledby="txn-title">
    <div class="txn-scrim absolute inset-0 bg-[#2d201b]/35" @click="emit('close')" />

    <section class="txn-sheet relative h-full w-full sm:w-[min(560px,92vw)] bg-white flex flex-col shadow-[-12px_0_32px_-8px_rgba(45,32,27,0.25)]">
      <!-- Header -->
      <header class="px-5 pt-4 pb-3 flex items-start justify-between gap-4 border-b border-[#EADFD3] bg-[#FFF8EA] shrink-0">
        <div class="min-w-0">
          <h2 id="txn-title" class="font-display text-2xl font-semibold text-[#2d201b] leading-tight">Today's sales</h2>
          <p class="text-sm text-[#6B5048] mt-0.5 truncate">{{ todayLabel }}<template v-if="branchName"> &middot; {{ branchName }}</template></p>
        </div>
        <button
          ref="closeButton"
          @click="emit('close')"
          aria-label="Close today's sales"
          class="w-11 h-11 -mr-2 shrink-0 flex items-center justify-center rounded-md text-[#6B5048] hover:bg-[#7B5A50]/10 hover:text-[#2d201b] transition-colors"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="flex-1 overflow-hidden px-5 py-5" aria-busy="true" aria-label="Loading today's sales">
        <div class="h-10 w-48 rounded bg-[#F3EBE2] animate-pulse" />
        <div class="h-4 w-36 rounded bg-[#F3EBE2] animate-pulse mt-3" />
        <div class="h-16 rounded bg-[#F7F1EA] animate-pulse mt-6" />
        <div v-for="i in 5" :key="i" class="flex items-center justify-between py-4 border-b border-[#F3EBE2]">
          <div class="space-y-2">
            <div class="h-4 w-40 rounded bg-[#F3EBE2] animate-pulse" />
            <div class="h-3 w-24 rounded bg-[#F7F1EA] animate-pulse" />
          </div>
          <div class="h-5 w-20 rounded bg-[#F3EBE2] animate-pulse" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" role="alert" class="flex-1 flex flex-col items-center justify-center text-center px-8">
        <Icon name="heroicons:wifi" class="w-8 h-8 text-[#9E7060] mb-3" />
        <p class="text-base font-semibold text-[#2d201b]">{{ error }}</p>
        <p class="text-sm text-[#6B5048] mt-1">Sales already charged are safe. This only affects the list.</p>
        <button @click="emit('retry')" class="mt-4 min-h-11 px-5 bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md transition-colors">Try again</button>
      </div>

      <div v-else-if="data" class="relative flex-1 flex flex-col min-h-0">
        <div :inert="!!openSale || undefined" class="flex-1 overflow-y-auto overscroll-contain min-h-0 txn-scroll">
          <!-- Summary ledger -->
          <div class="px-5 pt-5 pb-4 grid sm:grid-cols-[1fr_auto] gap-x-6 gap-y-3 items-end">
            <div class="min-w-0">
              <p class="text-sm font-medium text-[#6B5048]">Gross sales today</p>
              <p class="font-display text-[2.5rem] leading-none font-semibold text-[#7B5A50] tabular-nums tracking-tight mt-1">{{ formatCurrency(data.today_total) }}</p>
              <p class="text-sm text-[#6B5048] mt-2 tabular-nums">
                {{ data.today_count }} {{ data.today_count === 1 ? 'sale' : 'sales' }}
                <template v-if="data.today_count"> &middot; {{ formatCurrency(averageSale) }} average</template>
              </p>
            </div>
            <div class="flex items-baseline justify-between pt-3 border-t border-[#EADFD3] sm:block sm:pt-0 sm:border-t-0 sm:text-right sm:pl-6 sm:border-l">
              <p class="text-sm font-medium text-[#6B5048]">This month</p>
              <p class="text-lg font-semibold text-[#2d201b] tabular-nums sm:mt-1">{{ formatCurrency(data.month_total) }}</p>
            </div>
          </div>

          <!-- Hour by hour -->
          <div v-if="hours.length" class="px-5 pb-4">
            <div class="flex items-baseline justify-between mb-2">
              <p class="text-sm font-medium text-[#6B5048]">By hour</p>
              <p v-if="busiestHour && busiestHour.count" class="text-xs text-[#6B5048]">Busiest {{ hourLabel(busiestHour.hour) }}, {{ formatCurrency(busiestHour.total) }}</p>
            </div>
            <div class="flex items-end gap-1 h-20" role="group" aria-label="Filter sales by hour">
              <button
                v-for="h in hours"
                :key="h.hour"
                @click="h.count && toggleHour(h.hour)"
                :disabled="!h.count"
                :aria-pressed="selectedHour === h.hour"
                :aria-label="`${hourLabel(h.hour)}: ${h.count} ${h.count === 1 ? 'sale' : 'sales'}, ${formatCurrency(h.total)}`"
                :title="`${hourLabel(h.hour)} · ${h.count} ${h.count === 1 ? 'sale' : 'sales'} · ${formatCurrency(h.total)}`"
                class="txn-bar group flex-1 min-w-0 max-w-12 h-full flex flex-col justify-end items-center gap-1 rounded-sm disabled:cursor-default"
              >
                <span
                  class="w-full max-w-9 rounded-t-[3px] transition-colors"
                  :class="selectedHour === h.hour
                    ? 'bg-[#7B5A50]'
                    : selectedHour !== null
                      ? 'bg-[#7B5A50]/15'
                      : h.count ? 'bg-[#7B5A50]/40 group-hover:bg-[#7B5A50]/70' : 'bg-[#EADFD3]'"
                  :style="{ height: h.count ? `max(6px, calc((100% - 18px) * ${h.ratio}))` : '2px' }"
                />
                <span class="text-[11px] leading-none tabular-nums" :class="selectedHour === h.hour ? 'text-[#2d201b] font-semibold' : 'text-[#8A6E64]'">{{ hourLabel(h.hour, true) }}</span>
              </button>
            </div>
          </div>

          <!-- Search (sticky with the ledger) -->
          <div v-if="sales.length" class="sticky top-0 z-10 bg-white/95 backdrop-blur-[2px] px-5 py-3 border-y border-[#EADFD3] flex items-center gap-3">
            <div class="relative flex-1">
              <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A6E64]" />
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Transaction ID or staff"
                aria-label="Search sales by transaction ID or staff"
                class="w-full h-11 bg-[#FBF7F2] border border-[#E2D5C8] rounded-md pl-9 pr-3 text-base text-[#2d201b] placeholder:text-[#8A6E64] focus:outline-none focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] transition-colors"
              />
            </div>
            <button v-if="isFiltered" @click="clearFilters" class="min-h-11 px-2 text-sm font-semibold text-[#7B5A50] hover:text-[#65463D] underline underline-offset-4 shrink-0">
              Clear
            </button>
          </div>

          <!-- Empty: no sales yet -->
          <div v-if="!sales.length" class="px-8 py-14 text-center">
            <Icon name="heroicons:receipt-percent" class="w-8 h-8 text-[#B89A8E] mx-auto mb-3" />
            <p class="text-base font-semibold text-[#2d201b]">No sales yet today</p>
            <p class="text-sm text-[#6B5048] mt-1">Each sale shows up here the moment you charge it.</p>
          </div>

          <!-- Empty: nothing matches -->
          <div v-else-if="!filteredSales.length" class="px-8 py-12 text-center">
            <p class="text-base font-semibold text-[#2d201b]">No sales match{{ searchQuery.trim() ? ` "${searchQuery.trim()}"` : '' }}<template v-if="selectedHour !== null"> at {{ hourLabel(selectedHour) }}</template>.</p>
            <button @click="clearFilters" class="mt-3 min-h-11 px-4 text-sm font-semibold text-[#7B5A50] hover:text-[#65463D] underline underline-offset-4">Show all sales</button>
          </div>

          <!-- Ledger -->
          <div v-else class="pb-4">
            <section v-for="group in groups" :key="group.hour" :aria-label="`Sales at ${hourLabel(group.hour)}`">
              <div class="px-5 pt-4 pb-1.5 flex items-baseline justify-between text-xs font-semibold text-[#8A6E64] uppercase tracking-wide">
                <span>{{ hourLabel(group.hour) }}</span>
                <span class="tabular-nums normal-case tracking-normal">{{ group.sales.length }} &middot; {{ formatCurrency(group.total) }}</span>
              </div>
              <ul>
                <li v-for="txn in group.sales" :key="txn.uuid" class="mx-2">
                  <button
                    @click="viewSale(txn, $event)"
                    :aria-label="`View sale ${txn.uuid}, ${formatTime(txn.created_at)}, ${formatCurrency(txn.total_amount)}`"
                    class="txn-row w-full text-left px-3 py-3 rounded-md grid grid-cols-[4.5rem_1fr_auto_1rem] items-center gap-x-3 hover:bg-[#FBF7F2] active:bg-[#F3EBE2] transition-colors"
                  >
                  <span class="text-sm font-medium text-[#6B5048] tabular-nums">{{ formatTime(txn.created_at) }}</span>
                  <div class="min-w-0">
                    <p class="flex items-center gap-2 min-w-0">
                      <span class="text-[13px] font-semibold text-[#2d201b] tabular-nums truncate" :title="txn.uuid">{{ txn.uuid }}</span>
                      <span v-if="!isSettled(txn.status)" class="shrink-0 text-[11px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-800 border border-red-200">{{ txn.status }}</span>
                    </p>
                    <p class="text-sm text-[#6B5048] truncate">{{ txn.staff_name }} &middot; {{ txn.items_count }} {{ txn.items_count === 1 ? 'item' : 'items' }}</p>
                  </div>
                  <span class="text-base font-semibold text-[#2d201b] tabular-nums text-right" :class="{ 'line-through text-[#8A6E64]': !isSettled(txn.status) }">{{ formatCurrency(txn.total_amount) }}</span>
                    <Icon name="heroicons:chevron-right" class="w-4 h-4 text-[#B89A8E]" />
                  </button>
                </li>
              </ul>
            </section>
          </div>
        </div>

        <!-- Footer -->
        <footer :inert="!!openSale || undefined" class="px-5 pt-3 pb-4 border-t border-[#EADFD3] bg-white shrink-0">
          <p v-if="isFiltered && filteredSales.length" class="flex justify-between text-sm text-[#6B5048] mb-3 tabular-nums" aria-live="polite">
            <span>Showing {{ filteredSales.length }} of {{ sales.length }}</span>
            <span class="font-semibold text-[#2d201b]">{{ formatCurrency(filteredTotal) }}</span>
          </p>
          <div class="flex gap-3">
            <button
              @click="emit('export')"
              :disabled="!sales.length"
              class="flex-1 h-12 rounded-md border border-[#D6C5B8] bg-white text-[#2d201b] font-semibold text-base hover:bg-[#FBF7F2] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="heroicons:arrow-down-tray" class="w-5 h-5" /> Export CSV
            </button>
            <button
              @click="emit('print')"
              class="flex-1 h-12 rounded-md bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold text-base transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Icon name="heroicons:printer" class="w-5 h-5" /> Print Z-reading
            </button>
          </div>
        </footer>

        <PosTransactionDetail
          v-if="openSale"
          :key="openSale.uuid"
          :transaction-uuid="openSale.uuid"
          :preview="openSale"
          @back="closeSale"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
button:focus-visible,
input:focus-visible {
  outline: 2px solid #7B5A50;
  outline-offset: 2px;
}
.txn-sheet {
  animation: txn-sheet-in 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
.txn-scrim {
  animation: txn-scrim-in 200ms ease-out;
}
@keyframes txn-sheet-in {
  from { transform: translateX(24px); opacity: 0.4; }
  to { transform: none; opacity: 1; }
}
@keyframes txn-scrim-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.txn-scroll {
  scrollbar-width: thin;
  scrollbar-color: #D6C5B8 transparent;
}
.txn-scroll::-webkit-scrollbar { width: 8px; }
.txn-scroll::-webkit-scrollbar-thumb { background: #D6C5B8; border-radius: 4px; }
@media (prefers-reduced-motion: reduce) {
  .txn-sheet, .txn-scrim { animation: none; }
}
</style>
