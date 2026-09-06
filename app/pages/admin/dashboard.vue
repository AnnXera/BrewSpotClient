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

const loading = ref(true)
const lastRefreshedAt = ref<string>('')

// State variables
const ownerStats = ref<OwnerStats>({
  total_owners: 0,
  active: 0,
  suspended: 0,
  inactive: 0,
  inactive_or_suspended: 0,
})

const approvalStats = ref<ApprovalStats>({
  pending_approval: 0,
  approved: 0,
  rejected: 0,
})

const pendingApprovalsList = ref<ApprovalListItem[]>([])
const transactionsList = ref<PaymentTransaction[]>([])

async function loadDashboardData() {
  loading.value = true
  lastRefreshedAt.value = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  try {
    // 1. Fetch Owner Stats
    const oStatsRes = await ownerService.stats()
    if (oStatsRes?.success && oStatsRes.stats) {
      ownerStats.value = oStatsRes.stats
    }

    // 2. Fetch Approval Stats
    const aStatsRes = await ownerService.approvalStats()
    if (aStatsRes?.success && aStatsRes.stats) {
      approvalStats.value = aStatsRes.stats
    }

    // 3. Fetch Pending Approvals Stream
    const appRes = await ownerService.approvals({ status: 'pending', per_page: 5 })
    if (appRes?.success && appRes.approvals?.data) {
      pendingApprovalsList.value = appRes.approvals.data
    }

    // 4. Fetch Payment & Subscribers Data
    const list: PaymentTransaction[] = []
    const subRes = await subService.getSubscribers({ per_page: 20 })
    if (subRes?.success && subRes.subscribers?.data?.length) {
      subRes.subscribers.data.forEach((sub) => {
        const rawAmt = sub.amount ? parseFloat(sub.amount) : 0
        list.push({
          transaction_id: sub.subscription_uuid
            ? `TXN-${sub.subscription_uuid.replace(/-/g, '').slice(0, 7).toUpperCase()}`
            : 'TXN-0000000',
          date: new Date().toISOString(),
          description: sub.plan ? `Monthly Subscription - ${sub.plan}` : 'Monthly Subscription',
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
  } catch (err) {
    console.warn('Dashboard fetch error:', err)
  } finally {
    loading.value = false
  }
}

// Compute total revenue
const totalRevenue = computed(() => {
  return transactionsList.value.reduce((acc, t) => {
    const val = typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount).replace(/[^0-9.]/g, ''))
    return acc + (isNaN(val) ? 0 : val)
  }, 0)
})

function handleExportDashboardReport() {
  exportToExcel(transactionsList.value, 'Admin Overall Dashboard Report')
}

onMounted(loadDashboardData)
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7]">
    <!-- Sidebar Navigation -->
    <NavBar :links="links" />

    <!-- Main Content Area -->
    <main class="flex-1 p-6 md:p-12 overflow-x-hidden">
      <!-- Top Title Header Banner -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#7D5A50]/10 text-[#7D5A50]">
              System Administrator
            </span>
            <span class="text-xs text-[#8B6656] font-medium flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <h1 class="font-display text-2xl md:text-3xl font-bold text-[#3D2B24] mt-1">
            Dashboard
          </h1>
          <p class="font-sans text-sm text-[#8B6656] mt-1">
            Real-time platform metrics.
          </p>
        </div>

        <!-- Header Quick Action Buttons -->
        <div class="flex flex-wrap items-center gap-3">
          <NuxtLink
            v-if="approvalStats.pending_approval > 0"
            to="/admin/approvals"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-display text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm"
          >
            <Icon name="heroicons:bell" class="w-4 h-4" />
            <span>{{ approvalStats.pending_approval }} Approvals Pending</span>
          </NuxtLink>

          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-display text-sm font-semibold bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FFF0D1] transition-all shadow-sm"
            title="Export dashboard payment history to Excel"
            @click="handleExportDashboardReport"
          >
            <Icon name="heroicons:arrow-down-tray" class="w-4 h-4 text-emerald-600" />
            <span>Export Report</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-display text-sm font-semibold bg-[#7D5A50] text-[#FFF0D1] hover:bg-[#684940] transition-colors shadow-sm"
            @click="loadDashboardData"
          >
            <Icon name="heroicons:arrow-path" class="w-4 h-4" :class="{ 'animate-spin': loading }" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- 1. Top 4 Metric KPI Cards -->
      <AdminMetricCards
        :total-owners="ownerStats.total_owners"
        :active-owners="ownerStats.active"
        :pending-approvals="approvalStats.pending_approval"
        :active-subscriptions="transactionsList.length"
        :total-revenue="totalRevenue"
        :loading="loading"
      />

      <!-- 2. Visual Status & Distribution Breakdown Charts -->
      <AdminStatusBreakdown
        :approval-stats="approvalStats"
        :owner-stats="ownerStats"
      />

      <!-- 3. Bottom 2-Column Tables (Recent Pending Approvals & Recent Transactions) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Approvals Stream Table -->
        <RecentApprovalsTable
          :approvals="pendingApprovalsList"
          :loading="loading"
        />

        <!-- Payments Stream Table -->
        <RecentPaymentsTable
          :transactions="transactionsList"
          :loading="loading"
        />
      </div>

      <!-- Footer System Status Bar -->
      <div class="mt-8 border-t border-[#EEDFC4] pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8B6656] gap-2">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span class="font-medium text-[#3B1F0E]">BrewSpot Backend API: Operational</span>
        </div>
        <div class="font-mono">
          Last Synced: {{ lastRefreshedAt || 'Just now' }}
        </div>
      </div>
    </main>
  </div>
</template>