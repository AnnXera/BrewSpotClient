<!-- app/pages/manager/dashboard.vue -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { DashboardRange } from '~/services/OwnerProfileService'
import type { ManagedBranchInfo, ManagerDashboardStats } from '~/services/ManagerDashboardService'
import { formatSpan } from '~/utils/dashboardFormat'
import ManagerTotals from '~/components/manager/ManagerTotals.vue'
import ManagerIncomeChart from '~/components/manager/ManagerIncomeChart.vue'
import ManagerReservationsCard from '~/components/manager/ManagerReservationsCard.vue'
import ManagerEmployeesCard from '~/components/manager/ManagerEmployeesCard.vue'
import ManagerTransactionsCard from '~/components/manager/ManagerTransactionsCard.vue'
import ManagerTrendingItems from '~/components/manager/ManagerTrendingItems.vue'
import ManagerTopCategories from '~/components/manager/ManagerTopCategories.vue'
import ManagerTransactionModal from '~/components/manager/ManagerTransactionModal.vue'
import DropdownList from '~/components/common/DropdownList.vue'

definePageMeta({
  role: 'Manager',
})

const links = [
  { label: 'Dashboard', to: '/manager/dashboard', icon: 'squares-2x2' },
  { label: 'Cafe Management', to: '/manager/cafe', icon: 'building-storefront' },
  { label: 'Servings', to: '/manager/servings', icon: 'cake' },
  { label: 'Reservations', to: '/manager/reservations', icon: 'calendar-days' },
  { label: 'Floor Plan', to: '/manager/floor-plan', icon: 'map' },
]

const service = useManagerDashboardService()
const route = useRoute()
const router = useRouter()

const ranges: DashboardRange[] = ['daily', 'weekly', 'monthly']
const initialRange = ranges.find(r => r === route.query.range) ?? 'daily'

const range = ref<DashboardRange>(initialRange)
const branches = ref<ManagedBranchInfo[]>([])
const branchUuid = ref<string>('')
const stats = ref<ManagerDashboardStats | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')

// Initialize scroll reveal observer that only activates when scrolling into view
useScrollReveal(stats)

// Transaction receipt modal
const selectedTxUuid = ref<string | null>(null)
const showTxModal = ref(false)

function openTransactionModal(uuid: string) {
  selectedTxUuid.value = uuid
  showTxModal.value = true
}

function closeTransactionModal() {
  showTxModal.value = false
  selectedTxUuid.value = null
}

let requestId = 0

async function loadStats() {
  if (!branchUuid.value) return

  const id = ++requestId
  if (stats.value) refreshing.value = true
  error.value = ''

  try {
    const res = await service.getDashboardStats(branchUuid.value, range.value)

    if (id !== requestId) return
    if (res?.success) {
      stats.value = res
    } else {
      error.value = 'The branch figures could not be loaded.'
    }
  } catch (err: any) {
    if (id !== requestId) return
    console.warn('Manager dashboard fetch error:', err)
    error.value = err?.data?.message || 'The dashboard figures could not be loaded. Please check your connection.'
  } finally {
    if (id === requestId) {
      loading.value = false
      refreshing.value = false
    }
  }
}

async function init() {
  loading.value = true
  error.value = ''
  try {
    const res = await service.managedBranches()
    branches.value = res.branches || []
    if (!branches.value.length) {
      error.value = 'You are not currently assigned to any cafe branch. Please contact an owner.'
      loading.value = false
      return
    }

    const queryBranch = typeof route.query.branch === 'string' ? route.query.branch : ''
    const match = branches.value.find(b => b.uuid === queryBranch)
    const firstBranch = branches.value[0]
    if (match) {
      branchUuid.value = match.uuid
    } else if (firstBranch) {
      branchUuid.value = firstBranch.uuid
    }

    await loadStats()
  } catch (err: any) {
    console.warn('Failed to load manager branches:', err)
    error.value = 'Failed to load assigned branches.'
    loading.value = false
  }
}

watch(range, (val) => {
  router.replace({ query: { ...route.query, range: val === 'daily' ? undefined : val } })
  loadStats()
})

watch(branchUuid, (val) => {
  if (val) {
    router.replace({ query: { ...route.query, branch: val } })
    loadStats()
  }
})

onMounted(init)

const span = computed(() => (stats.value ? formatSpan(stats.value.period.from, stats.value.period.to) : ''))
const updatedAt = computed(() =>
  stats.value ? new Date(stats.value.generated_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : ''
)

const branchOptions = computed(() =>
  branches.value.map(b => ({
    label: b.branch_name,
    value: b.uuid,
  }))
)

const currentBranchName = computed(() => {
  return stats.value?.branch?.name || branches.value.find(b => b.uuid === branchUuid.value)?.branch_name || 'Assigned Branch'
})

const currentBranchAddress = computed(() => {
  return stats.value?.branch?.address || branches.value.find(b => b.uuid === branchUuid.value)?.address || ''
})

const branchDisplay = computed(() => {
  const raw = currentBranchName.value || 'Assigned Branch'
  const type = stats.value?.branch?.branch_type
  const defaultBadge = type ? (type === 'main' ? 'Main Branch' : type.charAt(0).toUpperCase() + type.slice(1)) : ''

  const delimiter = raw.includes(' — ') ? ' — ' : raw.includes(' - ') ? ' - ' : null
  if (delimiter) {
    const parts = raw.split(delimiter)
    const name = parts[0]?.trim() || raw
    const badge = parts.slice(1).join(delimiter).trim()
    return { name, badge: badge || defaultBadge }
  }

  return { name: raw, badge: defaultBadge }
})

const todayDateFormatted = computed(() => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date())
})
</script>

<template>
  <div class="dashboard flex min-h-screen flex-col bg-[#FDF3E7] md:flex-row">
    <NavBar :links="links" />

    <main class="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10 xl:px-12">
      <div class="mx-auto max-w-[1360px] space-y-6">
        
        <!-- Header: Clean Editorial & Sharp -->
        <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-2">
          <div class="min-w-0">
            <!-- Title + Sharp Tag -->
            <div class="flex flex-wrap items-baseline gap-3">
              <h1 class="font-display text-[30px] sm:text-[34px] md:text-[38px] font-bold leading-tight tracking-[-0.02em] text-[#3B1F0E]">
                <span v-if="loading && !stats" class="skeleton inline-block h-9 w-56 rounded align-middle" />
                <template v-else>{{ branchDisplay.name }}</template>
              </h1>

              <span
                v-if="branchDisplay.badge"
                class="inline-block rounded-md border border-[#E3CFB4] bg-white px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase text-[#7D5A50]"
              >
                {{ branchDisplay.badge }}
              </span>
            </div>

            <!-- Address & Metadata line -->
            <p class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#8B6656]">
              <span v-if="currentBranchAddress" class="flex items-center gap-1.5">
                <Icon name="heroicons:map-pin-20-solid" class="h-3.5 w-3.5 shrink-0 text-[#B4846C]" />
                <span>{{ currentBranchAddress }}</span>
              </span>
              <span v-if="currentBranchAddress" class="text-[#D9C3A5]">/</span>
              <span class="flex items-center gap-1.5 text-[#8B6656]">
                <Icon name="heroicons:calendar-days-20-solid" class="h-3.5 w-3.5 shrink-0 text-[#B4846C]" />
                <span>{{ todayDateFormatted }}</span>
              </span>
              <span v-if="updatedAt" class="text-[#D9C3A5]">/</span>
              <span v-if="updatedAt" class="text-[13px] text-[#9E7060] tabular-nums" aria-live="polite">
                Updated {{ updatedAt }}
              </span>
            </p>
          </div>

          <!-- Controls: Clean Sharp Actions -->
          <div class="flex flex-wrap items-center gap-3 shrink-0">
            <!-- Multi-branch selector -->
            <div v-if="branches.length > 1" class="w-52 sm:w-60">
              <DropdownList
                v-model="branchUuid"
                :options="branchOptions"
                size="sm"
                icon="heroicons:building-storefront"
                aria-label="Select branch"
              />
            </div>

            <!-- Sharp Rectangular Refresh Button -->
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg border border-[#D9C3A5] bg-white px-4 py-2 text-[13px] font-semibold text-[#3B1F0E] shadow-2xs transition-all duration-160 ease-out hover:border-[#3B1F0E] hover:bg-[#FFFDF9] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              :disabled="loading || refreshing"
              @click="loadStats"
            >
              <Icon name="heroicons:arrow-path-20-solid" class="h-4 w-4 text-[#7D5A50]" :class="{ 'animate-spin': loading || refreshing }" />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <!-- Error Alert -->
        <div
          v-if="error"
          role="alert"
          class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F1C9C2] bg-[#FDF0EE] px-5 py-4"
        >
          <p class="flex items-center gap-2 text-sm font-medium text-[#8E2F25]">
            <Icon name="heroicons:exclamation-triangle-20-solid" class="h-5 w-5 shrink-0" />
            {{ error }}
          </p>
          <button
            type="button"
            class="rounded-lg bg-[#8E2F25] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-[#74261E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8E2F25] focus-visible:ring-offset-2"
            @click="init"
          >
            Try again
          </button>
        </div>

        <!-- Dashboard Content with Scroll Reveal (Only animates when scrolling into view, not on refresh) -->
        <template v-if="stats || !error">
          <div
            class="space-y-6 transition-opacity duration-200"
            :class="{ 'opacity-65 pointer-events-none': refreshing }"
          >
            <!-- 1. Top Totals Banner (Income, Orders, Reservations, Staff Coverage) -->
            <div class="scroll-reveal">
              <ManagerTotals
                :totals="stats?.totals ?? null"
                :branch-name="currentBranchName"
                :loading="loading"
              />
            </div>

            <!-- 2. Revenue Chart + Best Sellers & Top Categories -->
            <div class="scroll-reveal grid grid-cols-1 gap-6 lg:grid-cols-12">
              <!-- Income Series Chart -->
              <ManagerIncomeChart
                v-model:range="range"
                class="lg:col-span-12 xl:col-span-7"
                :period="stats?.period ?? null"
                :series="stats?.series ?? []"
                :loading="loading"
                :refreshing="refreshing"
              />

              <!-- Top Selling Items & Categories -->
              <div class="lg:col-span-12 xl:col-span-5 space-y-6 flex flex-col justify-between">
                <ManagerTrendingItems
                  :items="stats?.trending_items ?? []"
                  :loading="loading"
                />
                <ManagerTopCategories
                  :categories="stats?.top_categories ?? []"
                  :span="span"
                  :loading="loading"
                />
              </div>
            </div>

            <!-- 3. Key Manager Details: Reservations + Employees Side-by-Side -->
            <div class="scroll-reveal grid grid-cols-1 gap-6 lg:grid-cols-2">
              <!-- Table Reservations Card -->
              <ManagerReservationsCard
                :reservations="stats?.reservations ?? null"
                :loading="loading"
              />

              <!-- Branch Team & Coverage Card -->
              <ManagerEmployeesCard
                :employees="stats?.employees ?? null"
                :loading="loading"
              />
            </div>

            <!-- 4. Branch Transaction History (Live Search, Filter Tabs, Pagination) -->
            <div class="scroll-reveal">
              <ManagerTransactionsCard
                v-if="branchUuid"
                :branch-uuid="branchUuid"
                @view-receipt="openTransactionModal"
              />
            </div>
          </div>
        </template>

      </div>
    </main>

    <!-- Receipt Modal Detail -->
    <ManagerTransactionModal
      :show="showTxModal"
      :transaction-uuid="selectedTxUuid"
      :branch-uuid="branchUuid"
      @close="closeTransactionModal"
    />
  </div>
</template>

<style>
.dashboard ::selection {
  background: #EEDFC4;
  color: #3B1F0E;
}

.skeleton {
  background: linear-gradient(90deg, #F6ECDD, #FBF4EA, #F6ECDD);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

/* Scroll reveal: Elements start slightly offset and fade/translate in when scrolled into view */
.scroll-reveal {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 800ms cubic-bezier(0.16, 1, 0.3, 1), transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}

.scroll-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .skeleton, .scroll-reveal {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
</style>
