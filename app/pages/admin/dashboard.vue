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
        <!-- Header: Clean Editorial & Sharp (Matching Owner and Manager Dashboards) -->
        <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-2">
          <div class="min-w-0">
            <!-- Title + Sharp Tag -->
            <div class="flex flex-wrap items-baseline gap-3">
              <h1 class="font-display text-[30px] sm:text-[34px] md:text-[38px] font-bold leading-tight tracking-[-0.02em] text-[#3B1F0E]">
                Admin Dashboard
              </h1>

              <span
                class="inline-block rounded-md border border-[#E3CFB4] bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#7D5A50]"
              >
                Platform
              </span>
            </div>

            <!-- Scope & Metadata line -->
            <p class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#8B6656]">
              <span class="flex items-center gap-1.5">
                <Icon name="heroicons:globe-alt-20-solid" class="h-3.5 w-3.5 shrink-0 text-[#B4846C]" />
                <span>Every cafe on Brewspot</span>
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
            <button
              type="button"
              class="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D9C3A5] bg-white px-4 text-[13px] font-semibold text-[#3B1F0E] shadow-[0_1px_2px_rgba(59,31,14,0.06)] transition-all duration-150 ease-out hover:border-[#3B1F0E] hover:bg-[#FFFDF9] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDF3E7] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading || !transactionsList.length"
              title="Export recent subscription payments to Excel"
              @click="handleExportDashboardReport"
            >
              <Icon name="heroicons:arrow-down-tray-20-solid" class="h-4 w-4 text-[#7D5A50]" aria-hidden="true" />
              <span>Export report</span>
            </button>

            <button
              type="button"
              class="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D9C3A5] bg-white px-4 text-[13px] font-semibold text-[#3B1F0E] shadow-[0_1px_2px_rgba(59,31,14,0.06)] transition-all duration-150 ease-out hover:border-[#3B1F0E] hover:bg-[#FFFDF9] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDF3E7] disabled:cursor-wait disabled:opacity-60"
              :disabled="loading || refreshing"
              @click="loadDashboardData"
            >
              <Icon name="heroicons:arrow-path-20-solid" class="h-4 w-4 text-[#7D5A50]" :class="{ 'animate-spin': loading || refreshing }" aria-hidden="true" />
              <span>{{ refreshing ? 'Refreshing…' : 'Refresh' }}</span>
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
