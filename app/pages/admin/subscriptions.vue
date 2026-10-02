<!--app/pages/admin/subscriptions.vue-->
<script setup lang="ts">
import type { SubscriptionPlanItem, FeatureItem } from '~/services/SubscriptionService'

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

const subService = useSubscriptionService()

// State
const activeTab = ref<'plans' | 'features'>('plans')
const loading = ref(true)
const plans = ref<SubscriptionPlanItem[]>([])
const features = ref<FeatureItem[]>([])
const activeFeatures = ref<FeatureItem[]>([])

// Modals State
const isPlanModalOpen = ref(false)
const selectedPlan = ref<SubscriptionPlanItem | null>(null)

const isFeatureModalOpen = ref(false)
const selectedFeature = ref<FeatureItem | null>(null)

// Confirmation Dialog State
const isConfirmOpen = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmAction = ref<() => Promise<void>>(() => Promise.resolve())

// Load Data
async function loadData() {
  loading.value = true
  try {
    const [plansRes, featuresRes, activeFeatRes] = await Promise.all([
      subService.getPlans({ per_page: 50 }),
      subService.getFeatures({ per_page: 50 }),
      subService.getActiveFeatures(),
    ])

    if (plansRes?.success && plansRes.plans?.data) {
      plans.value = plansRes.plans.data
    }
    if (featuresRes?.success && featuresRes.features?.data) {
      features.value = featuresRes.features.data
    }
    if (activeFeatRes?.success && activeFeatRes.features) {
      activeFeatures.value = activeFeatRes.features
    }
  } catch (err) {
    console.error('Failed to load subscription data:', err)
  } finally {
    loading.value = false
  }
}

// Plan Actions
function openCreatePlanModal() {
  selectedPlan.value = null
  isPlanModalOpen.value = true
}

function openEditPlanModal(plan: SubscriptionPlanItem) {
  selectedPlan.value = plan
  isPlanModalOpen.value = true
}

function promptDeletePlan(plan: SubscriptionPlanItem) {
  confirmTitle.value = 'Deactivate Plan'
  confirmMessage.value = `Are you sure you want to deactivate the plan "${plan.sub_name}"? New subscribers won't be able to select it.`
  confirmAction.value = async () => {
    try {
      await subService.deletePlan(plan.uuid)
      await loadData()
    } catch (err) {
      console.error('Delete plan error:', err)
    } finally {
      isConfirmOpen.value = false
    }
  }
  isConfirmOpen.value = true
}

// Feature Actions
function openCreateFeatureModal() {
  selectedFeature.value = null
  isFeatureModalOpen.value = true
}

function openEditFeatureModal(feature: FeatureItem) {
  selectedFeature.value = feature
  isFeatureModalOpen.value = true
}

function promptDeleteFeature(feature: FeatureItem) {
  confirmTitle.value = 'Delete Feature'
  confirmMessage.value = `Are you sure you want to delete "${feature.name}" (${feature.key}) from the features catalog?`
  confirmAction.value = async () => {
    try {
      await subService.deleteFeature(feature.uuid)
      await loadData()
    } catch (err) {
      console.error('Delete feature error:', err)
    } finally {
      isConfirmOpen.value = false
    }
  }
  isConfirmOpen.value = true
}

onMounted(loadData)
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7]">
    <!-- Navigation Sidebar -->
    <NavBar :links="links" />

    <main class="flex-1 min-[360px]:p-[16px] md:p-12">
      <!-- Header -->
      <header class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="font-display text-[26px] leading-[39px] font-bold text-[#3D2B24]">
            Subscriptions
          </h1>
          <p class="font-sans text-[14px] leading-[21px] text-[#9E7060] mt-[2px]">
            Manage platform subscription plans, multi-branch access, and feature entitlements.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-[16px] py-[8px] rounded-[8px] bg-white border border-[#EDD8CC] text-[#7D5A50] font-display font-medium text-[14px] hover:bg-[#FBF2E1] transition-colors shadow-sm"
            @click="loadData"
          >
            <Icon name="heroicons:arrow-path" class="w-4 h-4" :class="{ 'animate-spin': loading }" />
            <span>Refresh</span>
          </button>

          <button
            v-if="activeTab === 'plans'"
            type="button"
            class="inline-flex items-center gap-2 px-[20px] py-[8px] rounded-[8px] bg-[#7D5A50] text-[#FDF3E7] font-display font-semibold text-[14px] hover:bg-[#684940] transition-colors shadow-sm"
            @click="openCreatePlanModal"
          >
            <Icon name="heroicons:plus" class="w-4 h-4" />
            <span>Create Plan</span>
          </button>

          <button
            v-else
            type="button"
            class="inline-flex items-center gap-2 px-[20px] py-[8px] rounded-[8px] bg-[#7D5A50] text-[#FDF3E7] font-display font-semibold text-[14px] hover:bg-[#684940] transition-colors shadow-sm"
            @click="openCreateFeatureModal"
          >
            <Icon name="heroicons:plus" class="w-4 h-4" />
            <span>New Feature</span>
          </button>
        </div>
      </header>

      <!-- Sub-Tabs Navigation -->
      <div class="relative flex items-center mb-6 border-b border-[#EEDFC4]">
        <button
          type="button"
          class="px-5 py-[10px] font-display text-[16px] transition-colors relative z-10 flex items-center gap-2"
          :class="activeTab === 'plans' ? 'text-[#3B1F0E] font-bold' : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
          @click="activeTab = 'plans'"
        >
          Subscription Plans
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-bold"
            :class="activeTab === 'plans' ? 'bg-[#3B1F0E] text-[#FDF3E7]' : 'bg-[#F0E3CE] text-[#8B6656]'"
          >{{ plans.length }}</span>
          <span v-if="activeTab === 'plans'" class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full" />
        </button>

        <button
          type="button"
          class="px-5 py-[10px] font-display text-[16px] transition-colors relative z-10 flex items-center gap-2"
          :class="activeTab === 'features' ? 'text-[#3B1F0E] font-bold' : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
          @click="activeTab = 'features'"
        >
          Features Catalog
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-bold"
            :class="activeTab === 'features' ? 'bg-[#3B1F0E] text-[#FDF3E7]' : 'bg-[#F0E3CE] text-[#8B6656]'"
          >{{ features.length }}</span>
          <span v-if="activeTab === 'features'" class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full" />
        </button>
      </div>

      <!-- TAB 1: SUBSCRIPTION PLANS (Cards) -->
      <div v-if="activeTab === 'plans'">
        <!-- Loading State -->
        <div v-if="loading" class="bg-white border border-[#EEDFC4] rounded-2xl p-12 text-center shadow-sm">
          <p class="font-sans text-sm text-[#3B1F0E]/50">Loading subscription plans…</p>
        </div>

        <!-- Plans Cards Grid -->
        <div v-else-if="plans.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SubscriptionPlanCard
            v-for="plan in plans"
            :key="plan.uuid"
            :plan="plan"
            :features-list="features"
            @edit="openEditPlanModal"
            @delete="promptDeletePlan"
          />
        </div>

        <!-- Empty State -->
        <div v-else class="bg-white border border-[#EEDFC4] rounded-2xl p-12 text-center shadow-sm">
          <Icon name="heroicons:credit-card" class="w-12 h-12 text-[#9E7060] mx-auto mb-3" />
          <h3 class="font-display text-[18px] font-bold text-[#3D2B24]">No Subscription Plans Found</h3>
          <p class="font-sans text-[14px] text-[#9E7060] mt-1 mb-4">
            Create your first subscription plan to allow cafe owners to register branches and unlock features.
          </p>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-[20px] py-[8px] rounded-[8px] bg-[#7D5A50] text-[#FDF3E7] font-display font-semibold text-[14px] hover:bg-[#684940] transition-colors shadow-sm"
            @click="openCreatePlanModal"
          >
            <Icon name="heroicons:plus" class="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        </div>
      </div>

      <!-- TAB 2: SYSTEM FEATURES CATALOG -->
      <div v-else-if="activeTab === 'features'">
        <SubscriptionFeatureTable
          :features="features"
          :loading="loading"
          @edit="openEditFeatureModal"
          @delete="promptDeleteFeature"
        />
      </div>

      <!-- MODALS & DIALOGS -->
      <SubscriptionPlanModal
        :open="isPlanModalOpen"
        :plan="selectedPlan"
        :active-features="activeFeatures"
        @close="isPlanModalOpen = false"
        @saved="loadData"
      />

      <SubscriptionFeatureModal
        :open="isFeatureModalOpen"
        :feature="selectedFeature"
        @close="isFeatureModalOpen = false"
        @saved="loadData"
      />

      <ConfirmDialog
        :open="isConfirmOpen"
        :title="confirmTitle"
        :message="confirmMessage"
        confirm-label="Confirm"
        :danger="true"
        @confirm="confirmAction"
        @cancel="isConfirmOpen = false"
      />
    </main>
  </div>
</template>
