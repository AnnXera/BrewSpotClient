<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import AnalyticsPanel from './AnalyticsPanel.vue'
import ManagerTransactionModal from '~/components/manager/ManagerTransactionModal.vue'
import type { AnalyticsFilters, TransactionLog, TransactionLogRow, TransactionLogStatus } from '~/services/OwnerAnalyticsService'
import { formatCount, formatMethod, formatPesoCents } from '~/utils/dashboardFormat'

// Every sale in the Sales tab's period, refunds and voids included, newest first.
// Pages, status and search are local to this panel; the period and branch come
// from the page filters.
const props = defineProps<{ filters: AnalyticsFilters }>()

const PER_PAGE = 20

const service = useOwnerAnalyticsService()

const status = ref<TransactionLogStatus | null>(null)
const search = ref('')
const query = ref('') // search, debounced
const page = ref(1)

const data = ref<TransactionLog | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const failed = ref(false)

const statusTabs: { value: TransactionLogStatus | null; label: string; key: 'all' | TransactionLogStatus }[] = [
  { value: null, label: 'All', key: 'all' },
  { value: 'settled', label: 'Completed', key: 'settled' },
  { value: 'refunded', label: 'Refunded', key: 'refunded' },
  { value: 'void', label: 'Voided', key: 'void' },
]

let requestId = 0
async function load() {
  const id = ++requestId
  if (data.value) refreshing.value = true
  failed.value = false
  try {
    const res = await service.getTransactions({ ...props.filters }, {
      status: status.value,
      search: query.value,
      page: page.value,
      per_page: PER_PAGE,
    })
    if (id !== requestId) return
    if (res?.success) data.value = res
    else failed.value = true
  } catch {
    if (id !== requestId) return
    failed.value = true
  } finally {
    if (id === requestId) {
      loading.value = false
      refreshing.value = false
    }
  }
}

// A new period, branch, status or search starts again from the first page.
watch([() => JSON.stringify(props.filters), status, query], () => {
  if (page.value !== 1) page.value = 1 // the page watcher loads
  else load()
}, { immediate: true })
watch(page, load)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (v) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { query.value = v.trim() }, 300)
})
onUnmounted(() => clearTimeout(searchTimer))

const rows = computed(() => data.value?.transactions ?? [])
const allBranches = computed(() => !data.value?.filters.branch)
const range = computed(() => {
  const p = data.value?.pagination
  if (!p || !p.total) return ''
  const first = (p.page - 1) * p.per_page + 1
  return `${formatCount(first)}–${formatCount(first + rows.value.length - 1)} of ${formatCount(p.total)}`
})

const settled = (s: string) => s === 'completed' || s === 'paid'

function statusLabel(s: string) {
  if (settled(s)) return 'Completed'
  if (s === 'void' || s === 'voided') return 'Voided'
  return s.replace(/^\w/, c => c.toUpperCase())
}

function statusClass(s: string) {
  if (settled(s)) return 'bg-[#E7F1E4] text-[#2F5D2A]'
  if (s === 'refunded') return 'bg-[#FBEBD3] text-[#8A5A12]'
  return 'bg-[#F8E1DD] text-[#A2352A]'
}

const dateTime = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const formatWhen = (iso: string) => dateTime.format(new Date(iso))

function changeNote(t: TransactionLogRow) {
  if (!t.changed_at) return ''
  const who = t.refund ? ` by ${t.refund.by}` : ''
  return `${statusLabel(t.status)} ${formatWhen(t.changed_at)}${who}`
}

// ── Receipt modal ──
const openUuid = ref<string | null>(null)
const loadReceipt = (uuid: string) => service.getTransaction(uuid)
</script>

<template>
  <AnalyticsPanel
    title="Transaction log"
    note="Every sale rung up in this period, with who handled it. Refunds and voids stay listed with who approved them."
  >
    <template #actions>
      <label class="relative block w-full sm:w-[260px]">
        <span class="sr-only">Search transactions</span>
        <Icon name="heroicons:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9E7060]" />
        <input
          v-model="search"
          type="search"
          placeholder="Receipt #, cashier, or note"
          class="h-9 w-full rounded-[10px] border border-[#E9D7BF] bg-white pl-9 pr-3 text-[13px] text-[#3B1F0E] placeholder:text-[#B09080] focus:border-[#7D5A50] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30"
        >
      </label>
    </template>

    <div role="radiogroup" aria-label="Transaction status" class="-mt-1 mb-4 flex flex-wrap gap-1.5">
      <button
        v-for="s in statusTabs"
        :key="s.key"
        type="button"
        role="radio"
        :aria-checked="status === s.value"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
        :class="status === s.value ? 'border-[#7D5A50] bg-[#7D5A50] text-white' : 'border-[#E9D7BF] bg-white text-[#8B6656] hover:text-[#3B1F0E]'"
        @click="status = s.value"
      >
        {{ s.label }}
        <span v-if="data" class="tabular-nums" :class="status === s.value ? 'text-white/80' : 'text-[#B09080]'">{{ formatCount(data.counts[s.key]) }}</span>
      </button>
    </div>

    <div v-if="loading" class="space-y-2">
      <span v-for="i in 6" :key="i" class="skeleton block h-10 rounded-lg" />
    </div>

    <div v-else-if="failed && !data" class="rounded-xl border border-[#F3E7D2] px-4 py-6 text-center text-[13px] text-[#8B6656]">
      The transaction log could not be loaded.
      <button type="button" class="ml-1 font-semibold text-[#7D5A50] underline underline-offset-2" @click="load">Try again</button>
    </div>

    <p v-else-if="!rows.length" class="rounded-xl border border-dashed border-[#E9D7BF] px-4 py-8 text-center text-[13px] text-[#8B6656]">
      {{ query || status ? 'No transactions match these filters.' : 'No transactions in this period.' }}
    </p>

    <div v-else :class="{ 'opacity-60 transition-opacity': refreshing }">
      <!-- Phones and tablets: one card per sale -->
      <ul class="divide-y divide-[#F3E7D2] xl:hidden">
        <li v-for="t in rows" :key="t.uuid">
          <button type="button" class="flex w-full items-start justify-between gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]" @click="openUuid = t.uuid">
            <span class="min-w-0">
              <span class="block text-[14px] font-semibold text-[#3D2B24]">#{{ t.receipt_number }}</span>
              <span class="block text-[12px] text-[#8B6656]">
                {{ formatWhen(t.created_at) }} · {{ t.cashier ?? 'No cashier' }}<template v-if="allBranches && t.branch"> · {{ t.branch }}</template>
              </span>
              <span v-if="t.changed_at" class="mt-0.5 block text-[12px] text-[#A2352A]">{{ changeNote(t) }}</span>
            </span>
            <span class="shrink-0 text-right">
              <span class="block text-[14px] font-semibold tabular-nums" :class="settled(t.status) ? 'text-[#3D2B24]' : 'text-[#9E7060] line-through'">{{ formatPesoCents(t.total_amount) }}</span>
              <span class="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(t.status)">{{ statusLabel(t.status) }}</span>
            </span>
          </button>
        </li>
      </ul>

      <!-- Wide screens: table -->
      <div class="hidden overflow-x-auto xl:block">
        <table class="w-full text-left text-[13px]">
          <thead>
            <tr class="border-b border-[#F3E7D2] text-[12px] font-medium text-[#8B6656]">
              <th scope="col" class="py-2 pr-3 font-medium">Time</th>
              <th scope="col" class="py-2 pr-3 font-medium">Receipt</th>
              <th v-if="allBranches" scope="col" class="py-2 pr-3 font-medium">Branch</th>
              <th scope="col" class="py-2 pr-3 font-medium">Cashier</th>
              <th scope="col" class="py-2 pr-3 text-right font-medium">Items</th>
              <th scope="col" class="py-2 pr-3 font-medium">Payment</th>
              <th scope="col" class="py-2 pr-3 text-right font-medium">Total</th>
              <th scope="col" class="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F3E7D2]">
            <tr
              v-for="t in rows"
              :key="t.uuid"
              class="cursor-pointer align-top text-[#3D2B24] transition-colors hover:bg-[#FBF4EA]"
              @click="openUuid = t.uuid"
            >
              <td class="whitespace-nowrap py-2.5 pr-3 tabular-nums text-[#8B6656]">{{ formatWhen(t.created_at) }}</td>
              <td class="py-2.5 pr-3">
                <button type="button" class="font-semibold tabular-nums text-[#3B1F0E] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]" @click.stop="openUuid = t.uuid">#{{ t.receipt_number }}</button>
              </td>
              <td v-if="allBranches" class="py-2.5 pr-3">{{ t.branch ?? '-' }}</td>
              <td class="whitespace-nowrap py-2.5 pr-3">{{ t.cashier ?? 'No cashier' }}</td>
              <td class="py-2.5 pr-3 text-right tabular-nums">{{ formatCount(t.items) }}</td>
              <td class="py-2.5 pr-3">{{ t.payment_method ? formatMethod(t.payment_method) : '-' }}</td>
              <td class="whitespace-nowrap py-2.5 pr-3 text-right tabular-nums">
                <span class="font-semibold" :class="{ 'text-[#9E7060] line-through': !settled(t.status) }">{{ formatPesoCents(t.total_amount) }}</span>
                <span v-if="t.discount_amount > 0" class="block text-[11px] text-[#9E7060]">−{{ formatPesoCents(t.discount_amount) }} discount</span>
              </td>
              <td class="py-2.5">
                <span class="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(t.status)">{{ statusLabel(t.status) }}</span>
                <span v-if="t.changed_at" class="mt-1 block max-w-[220px] text-[11px] leading-snug text-[#8B6656]">
                  {{ formatWhen(t.changed_at) }}<template v-if="t.refund"> · by {{ t.refund.by }}</template>
                  <template v-if="t.refund?.reason"><br>“{{ t.refund.reason }}”</template>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav v-if="data && data.pagination.last_page > 1" aria-label="Transaction log pages" class="mt-4 flex items-center justify-between gap-3 border-t border-[#F3E7D2] pt-4 text-[12px] text-[#8B6656]">
        <span class="tabular-nums">{{ range }}</span>
        <span class="flex gap-1.5">
          <button
            type="button"
            class="rounded-[8px] border border-[#E9D7BF] bg-white px-3 py-1 font-semibold text-[#3B1F0E] transition-colors hover:bg-[#FBF4EA] disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page <= 1 || refreshing"
            @click="page--"
          >Previous</button>
          <button
            type="button"
            class="rounded-[8px] border border-[#E9D7BF] bg-white px-3 py-1 font-semibold text-[#3B1F0E] transition-colors hover:bg-[#FBF4EA] disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page >= data.pagination.last_page || refreshing"
            @click="page++"
          >Next</button>
        </span>
      </nav>
      <p v-else-if="range" class="mt-3 text-[12px] tabular-nums text-[#8B6656]">{{ range }}</p>
    </div>

    <ManagerTransactionModal
      :show="!!openUuid"
      :transaction-uuid="openUuid"
      :loader="loadReceipt"
      @close="openUuid = null"
    />
  </AnalyticsPanel>
</template>
