<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import OwnerTotals from '~/components/dashboard/OwnerTotals.vue'
import OwnerIncomeChart from '~/components/dashboard/OwnerIncomeChart.vue'
import OwnerBranchBreakdown from '~/components/dashboard/OwnerBranchBreakdown.vue'
import OwnerTrendingItems from '~/components/dashboard/OwnerTrendingItems.vue'
import OwnerTopCategories from '~/components/dashboard/OwnerTopCategories.vue'
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

async function load() {
  const id = ++requestId
  if (stats.value) refreshing.value = true
  error.value = ''

  try {
    const res = await ownerProfileService.getDashboardStats(range.value)
    if (id !== requestId) return
    if (res?.success) stats.value = res
    else error.value = 'The dashboard figures could not be loaded.'
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

const span = computed(() => (stats.value ? formatSpan(stats.value.period.from, stats.value.period.to) : ''))
const updatedAt = computed(() =>
  stats.value ? new Date(stats.value.generated_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '',
)
const branchCount = computed(() => stats.value?.totals.branches ?? 0)
</script>

<template>
  <div class="dashboard flex min-h-screen flex-col bg-[#FDF3E7] md:flex-row">
    <NavBar :links="links" />

    <main class="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10 xl:px-12">
      <div class="mx-auto max-w-[1360px] space-y-6">
        <!-- Header -->
        <header class="flex flex-wrap items-end justify-between gap-4 pb-1">
          <div>
            <h1 class="font-display text-[28px] md:text-[34px] font-semibold leading-tight tracking-[-0.015em] text-[#3B1F0E]">
              Dashboard
            </h1>
            <p class="mt-1 text-sm text-[#8B6656]">
              <template v-if="stats">
                Every branch combined{{ branchCount ? `, ${branchCount} in all` : '' }}.
              </template>
              <template v-else>Every branch combined.</template>
            </p>
          </div>

          <div class="flex items-center gap-3">
            <p v-if="updatedAt" class="text-[13px] text-[#9E7060]" aria-live="polite">Updated {{ updatedAt }}</p>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-xl border border-[#E3CFB4] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#7D5A50] transition-colors hover:border-[#7D5A50] hover:bg-[#FFF8EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDF3E7] disabled:cursor-wait disabled:opacity-60"
              :disabled="loading || refreshing"
              @click="load"
            >
              <Icon name="heroicons:arrow-path-20-solid" class="h-4 w-4" :class="{ 'animate-spin': loading || refreshing }" />
              Refresh
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

        <template v-if="stats || !error">
          <OwnerTotals :totals="stats?.totals ?? null" :loading="loading" />

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
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
</style>
