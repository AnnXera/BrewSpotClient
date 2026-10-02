<script setup lang="ts">
import { ref, onMounted } from 'vue'
import RenewalBanner from '~/components/subscription/RenewalBanner.vue'
import OwnerMetricCards from '~/components/dashboard/OwnerMetricCards.vue'
import OwnerAnalyticsChart from '~/components/dashboard/OwnerAnalyticsChart.vue'
import OwnerDetailedStats from '~/components/dashboard/OwnerDetailedStats.vue'
import OwnerActionCenter from '~/components/dashboard/OwnerActionCenter.vue'
import type { BranchSummary } from '~/services/OwnerProfileService'
import type { SubscriptionItem } from '~/services/SubscriptionService'

definePageMeta({
  role: 'Cafe Owner',
})

const links = [
  { label: 'Dashboard', to: '/owner/dashboard', icon: 'squares-2x2' },
  { label: 'Cafe Management', to: '/owner/cafes', icon: 'building-storefront' },
  { label: 'Menu Management', to: '/owner/menu-management', icon: 'book-open' },
  { label: 'Subscription', to: '/owner/subscription', icon: 'credit-card' },
]

const ownerProfileService = useOwnerProfileService()
const menuService = useMenuService()
const subService = useSubscriptionService()

const loading = ref(true)
const lastRefreshedAt = ref<string>('')

const totalBranches = ref(0)
const activeBranches = ref(0)
const recentBranches = ref<BranchSummary[]>([])
const totalMenuItems = ref(0)
const currentPlanName = ref('')
const totalEarnings = ref(0)
const detailedStats = ref<{ today_revenue: number, today_orders: number, avg_order_value: number, active_customers: number } | null>(null)
const chartData = ref<{ month: string, revenue: number }[]>([])

async function loadDashboardData() {
  loading.value = true
  lastRefreshedAt.value = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  try {
    // 1. Fetch Branches
    const branchesRes = await ownerProfileService.getBranches(5, 1)
    if (branchesRes?.success && branchesRes.branches) {
      totalBranches.value = branchesRes.branches.total || 0
      recentBranches.value = branchesRes.branches.data || []
      
      // Attempt to find active branches if total matches
      // (If paginated, this active count might only reflect the first page, 
      // but without a separate stats endpoint, we do our best. Alternatively we could just say total.)
      activeBranches.value = recentBranches.value.filter(b => b.status === 'approved' || b.status === 'active').length
    }

    // 2. Fetch Menu Items Count
    const menuRes = await menuService.getMenuItems({ per_page: 1 })
    if (menuRes?.success && menuRes.items && 'total' in menuRes.items) {
      totalMenuItems.value = menuRes.items.total || 0
    }

    // 3. Fetch Subscription
    const subRes = await subService.getCurrentPlan()
    if (subRes?.success && subRes.subscription) {
      currentPlanName.value = subRes.subscription.plan?.sub_name || 'Active Plan'
    }

    // 4. Fetch Dashboard Stats (Earnings and Analytics)
    const statsRes = await ownerProfileService.getDashboardStats()
    if (statsRes?.success) {
      totalEarnings.value = statsRes.total_earnings || 0
      if (statsRes.detailed_stats) detailedStats.value = statsRes.detailed_stats
      if (statsRes.chart_data) chartData.value = statsRes.chart_data
    }
  } catch (err) {
    console.warn('Dashboard fetch error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboardData)
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7]">
    <NavBar :links="links" />
    
    <main class="flex-1 p-6 md:p-12 overflow-x-hidden space-y-6">
      <RenewalBanner />
      
      <!-- Top Title Header Banner -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between mb-2 gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#7D5A50]/10 text-[#7D5A50]">
              Cafe Owner
            </span>
            <span class="text-xs text-[#8B6656] font-medium flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </span>
          </div>
          <h1 class="font-display text-2xl md:text-3xl font-bold text-[#3D2B24] mt-1">
            Owner Dashboard
          </h1>
          <p class="font-sans text-sm text-[#8B6656] mt-1">
            Welcome back! Here's an overview of your cafe operations.
          </p>
        </div>

        <div class="flex items-center gap-3">
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

      <!-- Metric Cards -->
      <OwnerMetricCards
        :total-branches="totalBranches"
        :active-branches="activeBranches"
        :total-menu-items="totalMenuItems"
        :subscription-plan="currentPlanName"
        :total-earnings="totalEarnings"
        :loading="loading"
      />

      <!-- Content Area -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main left column for Branches & Analytics -->
        <div class="lg:col-span-2 flex flex-col gap-6">
          <OwnerDetailedStats :stats="detailedStats" :loading="loading" />
          <OwnerAnalyticsChart :chart-data="chartData" :loading="loading" />
          <OwnerActionCenter />
        </div>
        
        <!-- Right side quick links or extra info -->
        <div class="space-y-6">
          <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm">
            <h3 class="font-display font-semibold text-[#3B1F0E] mb-4 flex items-center gap-2">
              <Icon name="heroicons:rocket-launch" class="w-5 h-5 text-amber-500" />
              Quick Links
            </h3>
            <div class="space-y-3">
              <NuxtLink to="/owner/cafes" class="group flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-[#EEDFC4] hover:bg-[#FFF0D1]/30 transition-all">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-[#7D5A50]/10 text-[#7D5A50] flex items-center justify-center">
                    <Icon name="heroicons:plus" class="w-4 h-4" />
                  </div>
                  <span class="text-sm font-medium text-[#3B1F0E]">Add New Branch</span>
                </div>
                <Icon name="heroicons:chevron-right" class="w-4 h-4 text-gray-400 group-hover:text-[#7D5A50]" />
              </NuxtLink>

              <NuxtLink to="/owner/menu-management" class="group flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-[#EEDFC4] hover:bg-[#FFF0D1]/30 transition-all">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-[#7D5A50]/10 text-[#7D5A50] flex items-center justify-center">
                    <Icon name="heroicons:book-open" class="w-4 h-4" />
                  </div>
                  <span class="text-sm font-medium text-[#3B1F0E]">Update Menu</span>
                </div>
                <Icon name="heroicons:chevron-right" class="w-4 h-4 text-gray-400 group-hover:text-[#7D5A50]" />
              </NuxtLink>
              
              <NuxtLink to="/owner/subscription" class="group flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-[#EEDFC4] hover:bg-[#FFF0D1]/30 transition-all">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-[#7D5A50]/10 text-[#7D5A50] flex items-center justify-center">
                    <Icon name="heroicons:arrow-up-circle" class="w-4 h-4" />
                  </div>
                  <span class="text-sm font-medium text-[#3B1F0E]">Upgrade Subscription</span>
                </div>
                <Icon name="heroicons:chevron-right" class="w-4 h-4 text-gray-400 group-hover:text-[#7D5A50]" />
              </NuxtLink>
            </div>
          </div>
          
          <div class="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
             <div class="absolute -right-4 -top-4 w-24 h-24 bg-amber-200 rounded-full blur-2xl opacity-50"></div>
             <h3 class="font-display font-semibold text-amber-900 mb-2 relative z-10">Need Help?</h3>
             <p class="text-xs text-amber-700 mb-4 relative z-10">Check our comprehensive documentation to make the most out of BrewSpot features.</p>
             <button class="bg-white text-amber-600 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all relative z-10 border border-amber-100 w-full">
               View Documentation
             </button>
          </div>
        </div>
      </div>
      
      <!-- Footer System Status Bar -->
      <div class="mt-8 border-t border-[#EEDFC4] pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8B6656] gap-2">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span class="font-medium text-[#3B1F0E]">System Operational</span>
        </div>
        <div class="font-mono">
          Last Synced: {{ lastRefreshedAt || 'Just now' }}
        </div>
      </div>
      
    </main>
  </div>
</template>