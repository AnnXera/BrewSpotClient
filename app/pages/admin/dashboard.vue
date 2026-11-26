<!-- app/pages/admin/dashboard.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminMetricCards from '~/components/dashboard/AdminMetricCards.vue'
import AdminStatusBreakdown from '~/components/dashboard/AdminStatusBreakdown.vue'
import RecentApprovalsTable from '~/components/dashboard/RecentApprovalsTable.vue'
import RecentPaymentsTable from '~/components/dashboard/RecentPaymentsTable.vue'
import type { PaymentTransaction } from '~/components/common/PaymentHistoryTable.vue'
import type { ApprovalListItem, ApprovalStats, OwnerStats } from '~/services/OwnerManagementService'
import { exportToExcel } from '~/utils/excelExport'

definePageMeta({
  role: 'Admin',
})

const links = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'squares-2x2' },
  { label: 'Owner Management', to: '/admin/owners', icon: 'users' },
  { label: 'Approval Status', to: '/admin/approvals', icon: 'check-circle' },
  { label: 'Subscriptions', to: '/admin/subscriptions', icon: 'credit-card' },
  { label: 'Payment History', to: '/admin/payments', icon: 'clipboard' },
]

const ownerService = useOwnerManagementService()
const subService = useSubscriptionService()

const loading = ref(true)     // nothing loaded yet
const refreshing = ref(false) // reloading with data already on screen
const loaded = ref(false)
const error = ref('')
const updatedAt = ref('')

// State variables
const ownerStats = ref<OwnerStats>({
  total_owners: 0,
  active: 0,
  suspended: 0,
  inactive: 0,
  inactive_or_suspended: 0,
})

const ownerApprovalStats = ref<ApprovalStats>({
  pending_approval: 0,
  approved: 0,
  rejected: 0,
})

const branchApprovalStats = ref<ApprovalStats>({
  pending_approval: 0,
  approved: 0,
  rejected: 0,
})

const pendingApprovalsList = ref<ApprovalListItem[]>([])
const transactionsList = ref<PaymentTransaction[]>([])
const activeSubscribersCount = ref(0)

// Initialize scroll reveal observer that only activates when scrolling into view
useScrollReveal(loaded)

async function loadDashboardData() {
  if (loaded.value) refreshing.value = true
  error.value = ''

  try {
    // 1. Fetch Owner Stats
    const oStatsRes = await ownerService.stats()
    if (oStatsRes?.success && oStatsRes.stats) {
      ownerStats.value = oStatsRes.stats
    }

    // 2. Fetch Approval Stats (Owner & Branch separately)
    const [ownerStatsRes, branchStatsRes] = await Promise.all([
      ownerService.approvalStats('owner'),
      ownerService.approvalStats('branch')
    ])

    if (ownerStatsRes?.success && ownerStatsRes.stats) {
      ownerApprovalStats.value = ownerStatsRes.stats
    }
    if (branchStatsRes?.success && branchStatsRes.stats) {
      branchApprovalStats.value = branchStatsRes.stats
    }

    // 3. Fetch Pending Approvals Stream
    const appRes = await ownerService.approvals({ status: 'pending_approval', per_page: 5 })
    if (appRes?.success && appRes.approvals?.data) {
      pendingApprovalsList.value = appRes.approvals.data
    }

    // 4. Fetch Payment & Subscribers Data
    const list: PaymentTransaction[] = []
    const subRes = await subService.getSubscribers({ per_page: 20 })
    if (subRes?.success && subRes.subscribers?.data?.length) {
      activeSubscribersCount.value = ownerStats.value.active
      subRes.subscribers.data.forEach((sub) => {
        const rawAmt = sub.amount ? parseFloat(String(sub.amount).replace(/[^0-9.]/g, '')) : 0
        list.push({
          transaction_id: sub.transaction_id || (sub.subscription_uuid
            ? `TXN-${sub.subscription_uuid.replace(/-/g, '').slice(0, 7).toUpperCase()}`
            : 'TXN-0000000'),
          date: sub.date || new Date().toISOString(),
          description: sub.plan ? `Subscription - ${sub.plan}` : 'Subscription',
          amount: isNaN(rawAmt) ? '0.00' : rawAmt.toFixed(2),
          status: sub.status || 'active',
          owner_name: sub.name,
          owner_email: sub.email || undefined,
        })
      })
    }

    // Rely strictly on real database transactions
    const map = new Map<string, PaymentTransaction>()
    list.forEach((t) => map.set(t.transaction_id, t))
    transactionsList.value = Array.from(map.values())

    loaded.value = true
    updatedAt.value = new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
  } catch (err) {
    console.warn('Dashboard fetch error:', err)
    error.value = 'The platform figures could not be loaded. Check your connection and try again.'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const totalRevenue = computed(() => {
  return transactionsList.value.reduce((acc, t) => {
    const status = t.status?.toLowerCase() || ''
    if (status === 'failed' || status === 'cancelled') return acc

    const val = typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount).replace(/[^0-9.]/g, ''))
    return acc + (isNaN(val) ? 0 : val)
  }, 0)
})

function handleExportDashboardReport() {
  exportToExcel(transactionsList.value, 'Admin Overall Dashboard Report')
}

const todayDateFormatted = computed(() => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date())
})

onMounted(loadDashboardData)
useAutoRefresh(loadDashboardData)
</script>

<template>
  <div class="dashboard flex min-h-screen flex-col bg-[#FDF3E7] md:flex-row">
    <NavBar :links="links" />

    <main class="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10 xl:px-12">
      <div class="mx-auto max-w-[1360px] space-y-6">
        <!-- Header: Consistent Admin Console Design (Emil Kowalski Philosophy) -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <h1 class="font-display text-2xl font-black text-[#3D2B24] tracking-tight min-[360px]:text-3xl sm:text-[32px] sm:leading-tight">
                Admin Dashboard
              </h1>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF4ED] text-[#7D5A50] border border-[#EEDFC4] shadow-2xs">
                <span class="w-2 h-2 rounded-full bg-[#B4846C] animate-pulse" />
                <span>Platform Operational</span>
              </span>
            </div>
            <p class="font-sans text-xs sm:text-sm text-[#9E7060] mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Overview of cafe operations, subscriptions, and platform metrics.</span>
              <span class="hidden sm:inline text-[#D9C3A5]">&bull;</span>
              <span class="inline-flex items-center gap-1 font-medium text-[#7D5A50]">
                <Icon name="heroicons:users" class="w-3.5 h-3.5 text-[#B4846C]" />
                <span>{{ activeSubscribersCount }} active {{ activeSubscribersCount === 1 ? 'subscriber' : 'subscribers' }}</span>
              </span>
              <template v-if="updatedAt">
                <span class="hidden sm:inline text-[#D9C3A5]">&bull;</span>
                <span class="text-[11px] sm:text-xs text-[#9E7060]/80">Updated {{ updatedAt }}</span>
              </template>
            </p>
          </div>

          <!-- Actions toolbar -->
          <div class="flex items-center gap-2.5 sm:gap-3 self-start sm:self-auto shrink-0">
            <!-- Export Report -->
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#EDD8CC] text-[#7D5A50] font-sans font-semibold text-sm hover:bg-[#FDF3E7] hover:border-[#D9C4B8] hover:text-[#3D2B24] active:scale-95 transition-[transform,background-color,border-color] duration-160 ease-out shadow-xs disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
              :disabled="loading || !transactionsList.length"
              title="Export platform transactions to Excel"
              @click="handleExportDashboardReport"
            >
              <Icon name="heroicons:arrow-down-tray" class="w-4 h-4 text-[#7D5A50]" />
              <span class="hidden sm:inline">Export Report</span>
              <span class="sm:hidden">Export</span>
            </button>

            <!-- Refresh Button -->
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#EDD8CC] text-[#7D5A50] font-sans font-semibold text-sm hover:bg-[#FDF3E7] hover:border-[#D9C4B8] hover:text-[#3D2B24] active:scale-95 transition-[transform,background-color,border-color] duration-160 ease-out shadow-xs disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
              :disabled="loading || refreshing"
              title="Refresh platform figures"
              @click="loadDashboardData"
            >
              <Icon
                name="heroicons:arrow-path"
                class="w-4 h-4 text-[#7D5A50]"
                :class="{ 'animate-spin': loading || refreshing }"
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

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
            @click="loadDashboardData"
          >
            Try again
          </button>
        </div>

        <!-- Dashboard Content with Scroll Reveal (Only animates when scrolling into view, not on refresh) -->
        <template v-if="loaded || !error">
          <div
            class="space-y-6 transition-opacity duration-200"
            :class="{ 'opacity-65 pointer-events-none': refreshing }"
          >
            <!-- 1. Platform Totals Banner -->
            <div class="scroll-reveal">
              <AdminMetricCards
                :total-owners="ownerStats.total_owners"
                :active-owners="ownerStats.active"
                :suspended-owners="ownerStats.suspended"
                :owner-pending="ownerApprovalStats.pending_approval"
                :branch-pending="branchApprovalStats.pending_approval"
                :active-subscriptions="activeSubscribersCount"
                :total-revenue="totalRevenue"
                :loading="loading"
              />
            </div>

            <!-- 2. Waiting for Review & Recent Payments -->
            <div class="scroll-reveal grid grid-cols-1 gap-6 lg:grid-cols-2">
              <RecentApprovalsTable
                :approvals="pendingApprovalsList"
                :loading="loading"
              />
              <RecentPaymentsTable
                :transactions="transactionsList"
                :loading="loading"
              />
            </div>

            <!-- 3. Account & Application Status Breakdown -->
            <div class="scroll-reveal">
              <AdminStatusBreakdown
                :owner-approval-stats="ownerApprovalStats"
                :branch-approval-stats="branchApprovalStats"
                :owner-stats="ownerStats"
                :loading="loading"
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
