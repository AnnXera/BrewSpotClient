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
const cafeName = ref('')
const branchList = ref<{ uuid: string; branch_name: string; branch_type?: string }[]>([])
const selectedBranchUuid = ref('')

const { isOpenNow } = useOperatingHours()

onMounted(async () => {
  try {
    const res = await ownerProfileService.getBranches(100, 1)
    if (res?.success) {
      cafeName.value = res.cafe_name || 'Brew Haven'
      branchList.value = [
        { uuid: '', branch_name: 'All Branches', branch_type: 'Overview' },
        ...res.branches.data.map(b => ({ uuid: b.uuid, branch_name: b.branch_name, branch_type: b.branch_type })),
      ]
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
  stats.value ? new Date(stats.value.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
)
const branchCount = computed(() => stats.value?.totals.branches ?? 0)
</script>

<template>
  <div class="dashboard flex min-h-screen flex-col bg-[#FDF3E7] md:flex-row">
    <NavBar :links="links" />

    <main class="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10 xl:px-12">
      <div class="mx-auto max-w-[1360px] space-y-6">
        <!-- Header: Clean layout (Greeting/Animated Date & Status, Title/Branch dropdown, Refresh) -->
        <DashboardHeader
          :title="cafeName || 'Brew Haven'"
          :branches="branchList"
          v-model:current-branch-uuid="selectedBranchUuid"
          :branch-badge="branchList.find(b => b.uuid === selectedBranchUuid)?.branch_name || (branchCount ? `${branchCount} Branches` : 'All Branches')"
          :is-open="isOpenNow"
          :updated-at="updatedAt"
          :loading="loading"
          :refreshing="refreshing"
          @refresh="load"
        />

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
