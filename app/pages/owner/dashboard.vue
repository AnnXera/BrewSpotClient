<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import OwnerTotals from '~/components/dashboard/OwnerTotals.vue'
import OwnerIncomeChart from '~/components/dashboard/OwnerIncomeChart.vue'
import OwnerBranchBreakdown from '~/components/dashboard/OwnerBranchBreakdown.vue'
import OwnerTrendingItems from '~/components/dashboard/OwnerTrendingItems.vue'
import OwnerTopCategories from '~/components/dashboard/OwnerTopCategories.vue'
import TransactionLog from '~/components/analytics/TransactionLog.vue'
import type { DashboardRange, OwnerDashboardStats } from '~/services/OwnerProfileService'
import { formatSpan } from '~/utils/dashboardFormat'

definePageMeta({
  role: 'Cafe Owner',
})

const links = OWNER_NAV_LINKS

const ownerProfileService = useOwnerProfileService()
const route = useRoute()
const router = useRouter()

const ranges: DashboardRange[] = ['daily', 'weekly', 'monthly']
const initialRange = ranges.find(r => r === route.query.range) ?? 'daily'

const range = ref<DashboardRange>(initialRange)
const stats = ref<OwnerDashboardStats | null>(null)
const loading = ref(true)     // nothing loaded yet
const refreshing = ref(false) // reloading with data already on screen
const error = ref('')

// A late response for a range the owner already left must not overwrite the newer one.
let requestId = 0

// Initialize scroll reveal observer that only activates when scrolling into view
useScrollReveal(stats)

async function load() {
  const id = ++requestId
  if (stats.value) refreshing.value = true
  error.value = ''

  try {
    const res = await ownerProfileService.getDashboardStats(range.value)
    if (id !== requestId) return
    if (res?.success) {
      stats.value = res
    } else {
      error.value = 'The dashboard figures could not be loaded.'
    }
  } catch (err) {
    if (id !== requestId) return
    console.warn('Dashboard fetch error:', err)
    error.value = 'The dashboard figures could not be loaded. Check your connection and try again.'
  } finally {
    if (id === requestId) {
      loading.value = false
      refreshing.value = false
    }
  }
}

watch(range, (value) => {
  router.replace({ query: { ...route.query, range: value === 'daily' ? undefined : value } })
  load()
})

onMounted(load)
useAutoRefresh(load)

// ── Transaction log: the chart's period, with its own branch picker ──
const logBranches = ref<{ value: string | null; label: string }[]>([{ value: null, label: 'All branches' }])

onMounted(async () => {
  try {
    const res = await ownerProfileService.getBranches(100, 1)
    if (res?.success) {
      logBranches.value = [
        { value: null, label: 'All branches' },
        ...res.branches.data.map(b => ({ value: b.uuid, label: b.branch_name })),
      ]
    }
  } catch (err) {
    console.warn('Dashboard branch list error:', err)
  }
})

const logFilters = computed(() => (stats.value ? { from: stats.value.period.from, to: stats.value.period.to } : null))

const span = computed(() => (stats.value ? formatSpan(stats.value.period.from, stats.value.period.to) : ''))
const updatedAt = computed(() =>
  stats.value ? new Date(stats.value.generated_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '',
)
const branchCount = computed(() => stats.value?.totals.branches ?? 0)

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
        <!-- Header: Clean Editorial & Sharp (Matching Manager Dashboard) -->
        <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-2">
          <div class="min-w-0">
            <!-- Title + Sharp Tag -->
            <div class="flex flex-wrap items-baseline gap-3">
              <h1 class="font-display text-[30px] sm:text-[34px] md:text-[38px] font-bold leading-tight tracking-[-0.02em] text-[#3B1F0E]">
                <span v-if="loading && !stats" class="skeleton inline-block h-9 w-56 rounded align-middle" />
                <template v-else>Owner Dashboard</template>
              </h1>

              <span
                class="inline-block rounded-md border border-[#E3CFB4] bg-white px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase text-[#7D5A50]"
              >
                {{ branchCount ? `${branchCount} Branches` : 'All Branches' }}
              </span>
            </div>

            <!-- Address & Metadata line -->
            <p class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#8B6656]">
              <span class="flex items-center gap-1.5">
                <Icon name="heroicons:building-storefront-20-solid" class="h-3.5 w-3.5 shrink-0 text-[#B4846C]" />
                <span>Every branch combined</span>
              </span>
              <span class="text-[#D9C3A5]">/</span>
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
            <!-- Sharp Rectangular Refresh Button -->
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg border border-[#D9C3A5] bg-white px-4 py-2 text-[13px] font-semibold text-[#3B1F0E] shadow-2xs transition-all duration-160 ease-out hover:border-[#3B1F0E] hover:bg-[#FFFDF9] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              :disabled="loading || refreshing"
              @click="load"
            >
              <Icon name="heroicons:arrow-path-20-solid" class="h-4 w-4 text-[#7D5A50]" :class="{ 'animate-spin': loading || refreshing }" />
              <span>Refresh</span>
            </button>
          </div>
        </header>

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
            @click="load"
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
            <!-- 1. Owner Totals Banner -->
            <div class="scroll-reveal">
              <OwnerTotals :totals="stats?.totals ?? null" :loading="loading" />
            </div>

            <!-- 2. Revenue Chart & Branch Breakdown -->
            <div class="scroll-reveal grid grid-cols-1 gap-6 lg:grid-cols-12">
              <OwnerIncomeChart
                v-model:range="range"
                class="lg:col-span-12 xl:col-span-8"
                :period="stats?.period ?? null"
                :series="stats?.series ?? []"
                :loading="loading"
                :refreshing="refreshing"
              />
              <OwnerBranchBreakdown
                class="lg:col-span-12 xl:col-span-4"
                :branches="stats?.branches ?? []"
                :span="span"
                :loading="loading"
              />
            </div>

            <!-- 3. Trending Items & Top Categories -->
            <div class="scroll-reveal grid grid-cols-1 gap-6 lg:grid-cols-12">
              <OwnerTrendingItems
                class="lg:col-span-7"
                :items="stats?.trending_items ?? []"
                :loading="loading"
              />
              <OwnerTopCategories
                class="lg:col-span-5"
                :categories="stats?.top_categories ?? []"
                :span="span"
                :loading="loading"
              />
            </div>

            <!-- 4. Transaction Log -->
            <div v-if="logFilters" class="scroll-reveal">
              <TransactionLog
                :filters="logFilters"
                :branches="logBranches"
                :note="`Every sale for ${span}, with who handled it. Refunds and voids stay listed with who approved them.`"
              />
            </div>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<style>
/* Not scoped: ::selection has to reach every child component. */
.dashboard ::selection {
  background: #EEDFC4;
  color: #3B1F0E;
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
  .scroll-reveal {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
</style>
