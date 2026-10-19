<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AnalyticsFilterBar from '~/components/analytics/AnalyticsFilterBar.vue'
import SalesTab from '~/components/analytics/SalesTab.vue'
import MenuTab from '~/components/analytics/MenuTab.vue'
import BranchesTab from '~/components/analytics/BranchesTab.vue'
import OperationsTab from '~/components/analytics/OperationsTab.vue'
import { ANALYTICS_PRESETS, rangeFor, type AnalyticsFilterState, type AnalyticsPreset, type AnalyticsTab } from '~/utils/analyticsRange'
import { formatSpan } from '~/utils/dashboardFormat'
import type { ExcelReport } from '~/composables/useExcelExport'

definePageMeta({
  role: 'Cafe Owner',
})

const links = OWNER_NAV_LINKS

const route = useRoute()
const router = useRouter()
const ownerProfileService = useOwnerProfileService()

const tabs: { value: AnalyticsTab; label: string; icon: string }[] = [
  { value: 'sales', label: 'Sales', icon: 'heroicons:banknotes' },
  { value: 'menu', label: 'Menu', icon: 'heroicons:book-open' },
  { value: 'branches', label: 'Branches', icon: 'heroicons:building-storefront' },
  { value: 'operations', label: 'Operations', icon: 'heroicons:clipboard-document-list' },
]
const tabComponents = { sales: SalesTab, menu: MenuTab, branches: BranchesTab, operations: OperationsTab }

// ── State from the URL, so a view can be bookmarked or shared ──
const q = route.query
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const initialPreset = (ANALYTICS_PRESETS.find(p => p.value === q.range)?.value ?? '30d') as AnalyticsPreset
const initialRange = initialPreset === 'custom' && isDay(q.from) && isDay(q.to)
  ? { from: q.from, to: q.to }
  : rangeFor(initialPreset === 'custom' ? '30d' : initialPreset)

const tab = ref<AnalyticsTab>(tabs.find(t => t.value === q.tab)?.value ?? 'sales')
const state = ref<AnalyticsFilterState>({
  preset: initialPreset === 'custom' && !(isDay(q.from) && isDay(q.to)) ? '30d' : initialPreset,
  ...initialRange,
  branch: typeof q.branch === 'string' ? q.branch : null,
})

// What the tabs fetch with. Changing the preset to Custom alone doesn't refetch;
// applying the custom dates does.
const filters = computed(() => ({ from: state.value.from, to: state.value.to, branch: state.value.branch }))

watch([tab, state], () => {
  const s = state.value
  router.replace({
    query: {
      tab: tab.value === 'sales' ? undefined : tab.value,
      range: s.preset === '30d' ? undefined : s.preset,
      from: s.preset === 'custom' ? s.from : undefined,
      to: s.preset === 'custom' ? s.to : undefined,
      branch: s.branch ?? undefined,
    },
  })
}, { deep: true })

// ── Branch picker ──
const branches = ref<{ value: string | null; label: string }[]>([{ value: null, label: 'All branches' }])
const cafeName = ref<string | null>(null)

onMounted(async () => {
  try {
    const res = await ownerProfileService.getBranches(100, 1)
    if (res?.success) {
      cafeName.value = res.cafe_name
      branches.value = [
        { value: null, label: 'All branches' },
        ...res.branches.data.map(b => ({ value: b.uuid, label: b.branch_name })),
      ]
      // A branch in the URL that isn't the owner's falls back to all branches.
      if (state.value.branch && !branches.value.some(b => b.value === state.value.branch)) {
        state.value = { ...state.value, branch: null }
      }
    }
  } catch (err) {
    console.warn('Analytics branch list error:', err)
  }
})

const scopeLabel = computed(() => {
  if (tab.value === 'branches' || !state.value.branch) return 'All branches'
  return branches.value.find(b => b.value === state.value.branch)?.label ?? 'One branch'
})

// ── Excel export of the open tab, as loaded with the current filters ──
// Tabs opt in by exposing excelReport() and exportReady; the rest hide the button.
const activeTab = ref<{ excelReport?: () => Omit<ExcelReport, 'cafe'> | null; exportReady?: boolean } | null>(null)
const { exporting, download } = useExcelExport()
const { alertDialog, showAlert } = useDialogs()

// Names the open tab, so the button doesn't read as "export everything".
const tabLabel = computed(() => tabs.find(t => t.value === tab.value)!.label)
const exportLabel = computed(() => `Export ${tabLabel.value} report`)
const exportHint = computed(() => `Excel file of the ${tabLabel.value} tab for ${formatSpan(state.value.from, state.value.to)} · ${scopeLabel.value}`)

async function exportTab() {
  const report = activeTab.value?.excelReport?.()
  if (!report) return
  try {
    await download({ ...report, cafe: cafeName.value })
  } catch (err) {
    console.warn('Analytics export error:', err)
    showAlert('Export failed', 'The Excel file could not be created. Please try again.')
  }
}

// Arrow keys move between tabs (WAI-ARIA tabs pattern).
function onTabKey(e: KeyboardEvent, i: number) {
  const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
  if (!step) return
  e.preventDefault()
  const next = (i + step + tabs.length) % tabs.length
  tab.value = tabs[next]!.value
  document.getElementById(`analytics-tab-${tabs[next]!.value}`)?.focus()
}
</script>

<template>
  <div class="analytics flex min-h-screen flex-col bg-[#FDF3E7] md:flex-row">
    <NavBar :links="links" />

    <main class="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10 xl:px-12">
      <div class="mx-auto max-w-[1360px] space-y-6">
        <header class="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div>
            <h1 class="font-display text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[#3B1F0E] md:text-[34px]">Analytics</h1>
            <p class="mt-1 text-sm text-[#8B6656]">
              {{ formatSpan(state.from, state.to) }} · {{ scopeLabel }}
            </p>
          </div>
          <button
            v-if="activeTab?.excelReport"
            type="button"
            class="inline-flex items-center gap-2 rounded-[12px] border border-[#E9D7BF] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#3B1F0E] shadow-[0_1px_2px_rgba(59,31,14,0.06)] transition-colors hover:bg-[#FBF4EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!activeTab.exportReady || exporting"
            :title="exportHint"
            @click="exportTab"
          >
            <Icon :name="exporting ? 'heroicons:arrow-path' : 'heroicons:arrow-down-tray'" class="h-[18px] w-[18px]" :class="{ 'animate-spin': exporting }" />
            {{ exporting ? 'Preparing…' : exportLabel }}
          </button>
        </header>

        <AnalyticsFilterBar
          v-model="state"
          :branches="branches"
          :branch-disabled="tab === 'branches'"
        />

        <div
          role="tablist"
          aria-label="Analytics sections"
          class="tabstrip -mx-4 flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_#E9D7BF] px-4 sm:mx-0 sm:px-0"
        >
          <button
            v-for="(t, i) in tabs"
            :id="`analytics-tab-${t.value}`"
            :key="t.value"
            type="button"
            role="tab"
            :aria-selected="tab === t.value"
            :aria-controls="`analytics-panel-${t.value}`"
            :tabindex="tab === t.value ? 0 : -1"
            class="relative inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7D5A50]"
            :class="tab === t.value ? 'border-[#7D5A50] text-[#3B1F0E]' : 'border-transparent text-[#8B6656] hover:text-[#3B1F0E]'"
            @click="tab = t.value"
            @keydown="onTabKey($event, i)"
          >
            <Icon :name="tab === t.value ? `${t.icon}-solid` : t.icon" class="h-[18px] w-[18px]" />
            {{ t.label }}
          </button>
        </div>

        <div
          :id="`analytics-panel-${tab}`"
          role="tabpanel"
          :aria-labelledby="`analytics-tab-${tab}`"
        >
          <KeepAlive>
            <component :is="tabComponents[tab]" :key="tab" ref="activeTab" :filters="filters" />
          </KeepAlive>
        </div>
      </div>
    </main>

    <AlertModal
      :show="alertDialog.show"
      :title="alertDialog.title"
      :message="alertDialog.message"
      @close="alertDialog.show = false"
    />
  </div>
</template>

<style>
/* Not scoped: shared by every analytics tab component. */
.analytics ::selection {
  background: #EEDFC4;
  color: #3B1F0E;
}

/* Tabs scroll sideways on phones without showing a scrollbar. */
.analytics .tabstrip {
  scrollbar-width: none;
}

.analytics .tabstrip::-webkit-scrollbar {
  display: none;
}

.analytics .skeleton {
  background: linear-gradient(90deg, #F6ECDD, #FBF4EA, #F6ECDD);
  background-size: 200% 100%;
  animation: analytics-shimmer 1.4s ease-in-out infinite;
}

@keyframes analytics-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .analytics .skeleton { animation: none; }
}
</style>
