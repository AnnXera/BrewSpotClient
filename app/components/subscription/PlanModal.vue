<!-- components/subscription/PlanModal.vue -->
<script setup lang="ts">
import type { SubscriptionPlanItem, FeatureItem } from '~/services/SubscriptionService'

const props = defineProps<{
  open: boolean
  plan: SubscriptionPlanItem | null
  activeFeatures: FeatureItem[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const subService = useSubscriptionService()

const isSaving = ref(false)
const errorMessage = ref('')
const form = ref({
  sub_name: '',
  price: 0,
  yearly_price: 0,
  duration_days: 30,
  description: '',
  is_active: true,
  features: [] as string[],
})

const yearlyDiscountPercent = computed(() => {
  const m = Number(form.value.price) || 0
  const y = Number(form.value.yearly_price) || 0
  if (m <= 0 || y <= 0) return 0
  const annualMonthlyEquivalent = m * 12
  if (y >= annualMonthlyEquivalent) return 0
  return Math.round(((annualMonthlyEquivalent - y) / annualMonthlyEquivalent) * 100)
})

const effectiveMonthlyRate = computed(() => {
  const y = Number(form.value.yearly_price) || 0
  if (y <= 0) return '0.00'
  return (y / 12).toFixed(2)
})

watch(
  () => props.plan,
  (newPlan) => {
    errorMessage.value = ''
    if (newPlan) {
      form.value = {
        sub_name: newPlan.sub_name,
        price: typeof newPlan.price === 'string' ? parseFloat(newPlan.price) : newPlan.price,
        yearly_price: typeof newPlan.yearly_price === 'string' ? parseFloat(newPlan.yearly_price) : (newPlan.yearly_price ?? 0),
        duration_days: newPlan.duration_days,
        description: newPlan.description || '',
        is_active: newPlan.is_active ?? true,
        paypal_plan_id: newPlan.paypal_plan_id || null,
        paypal_yearly_plan_id: newPlan.paypal_yearly_plan_id || null,
        features: Array.isArray(newPlan.features) ? [...newPlan.features] : [],
      }
    } else {
      form.value = {
        sub_name: '',
        price: 0,
        yearly_price: 0,
        duration_days: 30,
        description: '',
        is_active: true,
        paypal_plan_id: null as string | null,
        paypal_yearly_plan_id: null as string | null,
        features: [],
      }
    }
  },
  { immediate: true }
)

function toggleFeature(key: string) {
  const index = form.value.features.indexOf(key)
  if (index > -1) {
    form.value.features.splice(index, 1)
  } else {
    form.value.features.push(key)
  }
}

async function save() {
  if (!form.value.sub_name.trim()) {
    errorMessage.value = 'Please enter a plan name.'
    return
  }
  if (form.value.price < 0) {
    errorMessage.value = 'Monthly price must be 0 or greater.'
    return
  }
  if (form.value.yearly_price < 0) {
    errorMessage.value = 'Yearly price must be 0 or greater.'
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    if (props.plan) {
      const res = await subService.updatePlan(props.plan.uuid, {
        sub_name: form.value.sub_name,
        price: form.value.price,
        yearly_price: form.value.yearly_price,
        duration_days: form.value.duration_days,
        description: form.value.description,
        is_active: form.value.is_active,
        features: form.value.features,
      })
      if (!res.success) {
        errorMessage.value = res.message || 'Failed to update plan.'
        return
      }
    } else {
      const res = await subService.createPlan({
        sub_name: form.value.sub_name,
        price: form.value.price,
        yearly_price: form.value.yearly_price,
        duration_days: form.value.duration_days,
        description: form.value.description,
        is_active: form.value.is_active,
        features: form.value.features,
      })
      if (!res.success) {
        errorMessage.value = res.message || 'Failed to create plan.'
        return
      }
    }

    emit('saved')
    emit('close')
  } catch (err: any) {
    errorMessage.value = err?.data?.message || err?.message || 'Error saving plan.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#3B1F0E]/40 backdrop-blur-sm p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Scrollable Content -->
        <div class="flex-1 min-h-0 overflow-y-auto p-6">
          <!-- Top Category & Close Header -->
          <div class="flex items-center justify-between mb-[24px]">
            <p class="font-display text-[14px] leading-[16.5px] tracking-[0.77%] font-semibold text-[#9E7060] uppercase">
              {{ plan ? 'Edit Subscription Plan' : 'New Subscription Plan' }}
            </p>

            <button type="button" class="cursor-pointer text-[#9E7060] hover:text-[#3B1F0E] transition-colors" @click="emit('close')">
              <Icon name="heroicons:x-mark" class="w-6 h-6" />
            </button>
          </div>

          <!-- Top Banner & Plan Information -->
          <div class="flex items-center gap-3 pb-[24px] mb-[24px] border-b border-[#B4846C]">
            <div class="w-14 h-14 rounded-2xl bg-[#FFF8EA] border border-[#EDD8CC] flex items-center justify-center text-[#7D5A50] shrink-0">
              <Icon name="heroicons:credit-card" class="w-7 h-7" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <p class="font-display text-[24px] font-bold text-[#3D2B24] truncate">
                  {{ form.sub_name || 'Untitled Plan' }}
                </p>

                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full font-display font-semibold text-xs whitespace-nowrap shrink-0"
                  :class="form.is_active ? 'bg-[#D4EDDA] text-[#28A745]' : 'bg-[#FDE8E8] text-[#DC3545]'"
                >
                  {{ form.is_active ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <p class="font-display text-[12px] text-[#9E7060]">
                {{ plan ? `ID: ${plan.uuid.slice(0, 8)}` : 'Draft Tier Configuration' }}
              </p>
            </div>
          </div>

          <!-- Error Alert -->
          <div v-if="errorMessage" class="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-sans text-xs">
            {{ errorMessage }}
          </div>

          <form id="subscriptionPlanModalForm" @submit.prevent="save" class="space-y-5">
            <!-- Section 1: Plan Details -->
            <div>
              <h3 class="font-display text-[18px] font-bold text-[#3D2B24] mb-[16px]">
                Plan Details
              </h3>

              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block font-sans text-xs font-semibold uppercase tracking-wide text-[#3B1F0E]/70 mb-1">
                      Plan Name *
                    </label>
                    <input
                      v-model="form.sub_name"
                      type="text"
                      required
                      placeholder="e.g. Enterprise Plan"
                      class="w-full rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] px-4 py-2.5 font-sans text-sm text-[#3B1F0E] placeholder:text-[#B4846C] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30"
                    />
                  </div>
                </div>

                <!-- Pricing Row (Monthly & Yearly) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block font-sans text-xs font-semibold uppercase tracking-wide text-[#3B1F0E]/70 mb-1">
                      Monthly Price (₱) *
                    </label>
                    <input
                      v-model.number="form.price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      class="w-full rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] px-4 py-2.5 font-sans text-sm text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30"
                    />
                  </div>

                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <label class="block font-sans text-xs font-semibold uppercase tracking-wide text-[#3B1F0E]/70">
                        Yearly Price (₱) *
                      </label>
                      <span
                        v-if="yearlyDiscountPercent > 0"
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#D4EDDA] text-[#28A745]"
                      >
                        Save {{ yearlyDiscountPercent }}%
                      </span>
                    </div>
                    <input
                      v-model.number="form.yearly_price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      class="w-full rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] px-4 py-2.5 font-sans text-sm text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30"
                    />
                    <p v-if="form.yearly_price > 0" class="font-sans text-[11px] text-[#9E7060] mt-1">
                      Effective ₱{{ effectiveMonthlyRate }}/mo billed annually
                    </p>
                  </div>
                </div>

                <div>
                  <label class="block font-sans text-xs font-semibold uppercase tracking-wide text-[#3B1F0E]/70 mb-1">
                    Trial Duration (Days)
                  </label>
                  <input
                    v-model.number="form.duration_days"
                    type="number"
                    min="1"
                    class="w-full rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] px-4 py-2.5 font-sans text-sm text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30"
                  />
                  <p class="font-sans text-[11px] text-[#9E7060] mt-1">
                    Leave blank for paid plans. Only applies to trial subscriptions.
                  </p>
                </div>

                <div>
                  <label class="block font-sans text-xs font-semibold uppercase tracking-wide text-[#3B1F0E]/70 mb-1">
                    Description
                  </label>
                  <textarea
                    v-model="form.description"
                    rows="2"
                    placeholder="Brief summary of who this plan is intended for..."
                    class="w-full rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] px-4 py-2.5 font-sans text-sm text-[#3B1F0E] placeholder:text-[#B4846C] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30 resize-none"
                  />
                </div>

                <div class="flex items-center gap-2 pt-1">
                  <input
                    id="modal_plan_is_active"
                    v-model="form.is_active"
                    type="checkbox"
                    class="w-4 h-4 rounded text-[#7D5A50] focus:ring-[#7D5A50] border-gray-300"
                  />
                  <label for="modal_plan_is_active" class="font-sans text-xs font-medium text-[#3B1F0E] cursor-pointer">
                    Plan is active and selectable by cafe owners
                  </label>
                </div>
              </div>
            </div>

            <!-- Section 1.5: PayPal Integration (Read-only) -->
            <div v-if="plan && (form.paypal_plan_id || form.paypal_yearly_plan_id)" class="pt-4 border-t border-[#F3E7D2]">
              <h3 class="font-display text-[18px] font-bold text-[#3D2B24] mb-[16px] flex items-center gap-2">
                <Icon name="logos:paypal" class="w-5 h-5" />
                PayPal Integration
              </h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FFF8EA] p-4 rounded-xl border border-[#EDD8CC]">
                <div>
                  <label class="block font-sans text-xs font-semibold uppercase tracking-wide text-[#3B1F0E]/70 mb-1">
                    Monthly Plan ID
                  </label>
                  <input
                    v-model="form.paypal_plan_id"
                    type="text"
                    readonly
                    class="w-full rounded-lg border border-[#EDD8CC]/50 bg-white/50 px-3 py-2 font-sans text-sm text-[#3B1F0E]/80 focus:outline-none cursor-default"
                  />
                </div>
                <div>
                  <label class="block font-sans text-xs font-semibold uppercase tracking-wide text-[#3B1F0E]/70 mb-1">
                    Yearly Plan ID
                  </label>
                  <input
                    v-model="form.paypal_yearly_plan_id"
                    type="text"
                    readonly
                    class="w-full rounded-lg border border-[#EDD8CC]/50 bg-white/50 px-3 py-2 font-sans text-sm text-[#3B1F0E]/80 focus:outline-none cursor-default"
                  />
                </div>
                <div class="sm:col-span-2">
                  <p class="font-sans text-[11px] text-[#9E7060] leading-relaxed">
                    These IDs are automatically generated and synced with PayPal when you run the <code>php artisan paypal:sync-plans</code> command in the backend. They are read-only here to prevent accidental checkout errors.
                  </p>
                </div>
              </div>
            </div>

            <!-- Section 2: Included Features -->
            <div class="pt-4 border-t border-[#F3E7D2]">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-display text-[18px] font-bold text-[#3D2B24]">
                  Feature Entitlements
                </h3>
                <span class="font-display text-xs text-[#9E7060] font-semibold">
                  {{ form.features.length }} selected
                </span>
              </div>

              <p class="font-sans text-xs text-[#9E7060] mb-3">
                Select which modules and tools cafe owners on this plan can access.
              </p>

              <div class="rounded-xl overflow-hidden border border-[#EDD8CC]">
                <div
                  v-for="(feat, idx) in activeFeatures"
                  :key="feat.key"
                  class="flex items-start gap-3 bg-[#FFF8EA] px-[20px] py-[12px] cursor-pointer transition-colors hover:bg-[#FFF2DE]"
                  :class="{ 'border-t border-[#EDD8CC]': idx > 0 }"
                  @click="toggleFeature(feat.key)"
                >
                  <input
                    type="checkbox"
                    :checked="form.features.includes(feat.key)"
                    class="mt-1 w-4 h-4 rounded text-[#7D5A50] focus:ring-[#7D5A50] border-gray-300 pointer-events-none"
                  />
                  <div class="flex-1">
                    <p class="font-display font-semibold text-[14px] text-[#3B1F0E]">{{ feat.name }}</p>
                    <p class="font-sans text-xs text-[#9E7060] mt-0.5">{{ feat.description || feat.key }}</p>
                  </div>
                </div>

                <div v-if="activeFeatures.length === 0" class="p-6 text-center text-xs text-[#9E7060]">
                  No active features found. Create features in the Features Catalog tab.
                </div>
              </div>
            </div>
          </form>
        </div>

        <!-- Modal Actions (Matching ApprovalDetailsModal Footer) -->
        <div class="flex items-center justify-end gap-3 border-t border-[#F3E7D2] p-6 bg-white shrink-0">
          <button
            type="button"
            class="rounded-lg px-4 py-2 font-sans text-sm font-medium text-[#3B1F0E]/70 hover:bg-[#F3E7D2] transition-colors"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="subscriptionPlanModalForm"
            :disabled="isSaving"
            class="rounded-lg px-5 py-2 font-sans text-sm font-semibold bg-[#7D5A50] text-[#FDF3E7] hover:bg-[#684940] transition-colors disabled:opacity-50 shadow-sm"
          >
            <span v-if="isSaving">Saving...</span>
            <span v-else>{{ plan ? 'Update Plan' : 'Save Plan' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
