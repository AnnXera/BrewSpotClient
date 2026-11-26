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

// Shared look for every text field: same border, fill and focus ring as the approval modals.
const inputClass = 'w-full rounded-xl border border-[#EADCC7] bg-white px-4 py-2.5 font-sans text-sm text-[#3B1F0E] placeholder:text-[#3B1F0E]/40 focus:outline-none focus:border-[#B4846C] focus:ring-2 focus:ring-[#7D5A50]/20 transition-colors'

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
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-5"
      @click.self="emit('close')"
    >
      <!-- Card: same frame as the Approval Status modals -->
      <div
        role="dialog"
        aria-modal="true"
        :aria-label="plan ? 'Edit Subscription Plan' : 'New Subscription Plan'"
        class="relative bg-white rounded-3xl w-full max-w-[720px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <!-- Header: title, plan name, status and ID; stays put while the body scrolls -->
        <div class="px-6 pt-6 shrink-0">
          <div class="flex items-center justify-between mb-[24px]">
            <p class="font-display text-[14px] leading-[16.5px] tracking-[0.77%] font-semibold text-[#9E7060] uppercase">
              {{ plan ? 'Edit Subscription Plan' : 'New Subscription Plan' }}
            </p>

            <button type="button" class="cursor-pointer" aria-label="Close" @click="emit('close')">
              <img src="@/assets/images/x-button.svg" class="w-[24px] h-[24px]" alt="" />
            </button>
          </div>

          <div class="flex items-center gap-3 pb-[24px] border-b border-[#B4846C]">
            <div class="w-[56px] h-[56px] rounded-[12px] bg-[#F0E3CE] text-[#7D5A50] flex items-center justify-center shrink-0">
              <Icon name="heroicons:credit-card" class="w-7 h-7" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-3">
                <p class="font-display text-[24px] font-bold text-[#3D2B24] truncate">{{ form.sub_name || 'Untitled Plan' }}</p>
                <StatusBadge :status="form.is_active ? 'active' : 'inactive'" />
              </div>

              <p class="font-display text-[12px] text-[#9E7060] truncate">
                {{ plan ? `ID: ${plan.uuid.slice(0, 8)}` : 'New plan, not saved yet' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Body -->
        <form
          id="subscriptionPlanModalForm"
          class="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4"
          @submit.prevent="save"
        >
          <p v-if="errorMessage" class="rounded-lg bg-[#FDE8E8] px-3 py-2 font-sans text-sm text-[#B42318]" role="alert">
            {{ errorMessage }}
          </p>

          <!-- Plan details -->
          <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs">
            <h3 class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5 mb-3">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              Plan Details
            </h3>

            <div class="space-y-3">
              <div>
                <label for="plan_name" class="block text-xs font-bold text-[#8A6E64] mb-1">Plan Name *</label>
                <input
                  id="plan_name"
                  v-model="form.sub_name"
                  type="text"
                  required
                  placeholder="e.g. Enterprise Plan"
                  :class="inputClass"
                />
              </div>

              <div>
                <label for="plan_description" class="block text-xs font-bold text-[#8A6E64] mb-1">Description</label>
                <textarea
                  id="plan_description"
                  v-model="form.description"
                  rows="2"
                  placeholder="Brief summary of who this plan is intended for..."
                  :class="[inputClass, 'resize-none']"
                />
              </div>

              <label class="flex items-start gap-3 pt-1 cursor-pointer select-none">
                <input
                  v-model="form.is_active"
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 rounded border-[#EDD8CC] accent-[#7D5A50] focus:ring-[#7D5A50]/30 cursor-pointer"
                />
                <span class="font-sans text-sm text-[#3B1F0E]">
                  Plan is active
                  <span class="block text-xs text-[#3B1F0E]/60 mt-0.5">
                    {{ form.is_active ? 'Cafe owners can select this plan.' : 'Hidden from cafe owners until you turn it back on.' }}
                  </span>
                </span>
              </label>
            </div>
          </section>

          <!-- Pricing -->
          <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs">
            <h3 class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5 mb-3">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              Pricing
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <div class="flex items-center h-6 mb-1">
                  <label for="plan_price" class="block text-xs font-bold text-[#8A6E64]">Monthly Price *</label>
                </div>
                <div class="relative">
                  <span class="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-semibold text-[#B4846C]">₱</span>
                  <input
                    id="plan_price"
                    v-model.number="form.price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    :class="[inputClass, 'pl-8 tabular-nums']"
                  />
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between gap-2 h-6 mb-1">
                  <label for="plan_yearly" class="block text-xs font-bold text-[#8A6E64]">Yearly Price *</label>
                  <span
                    v-if="yearlyDiscountPercent > 0"
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[#FAF4ED] text-[#7D5A50] border border-[#EEDFC4]"
                  >
                    Save {{ yearlyDiscountPercent }}%
                  </span>
                </div>
                <div class="relative">
                  <span class="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-semibold text-[#B4846C]">₱</span>
                  <input
                    id="plan_yearly"
                    v-model.number="form.yearly_price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    :class="[inputClass, 'pl-8 tabular-nums']"
                  />
                </div>
                <p v-if="form.yearly_price > 0" class="text-xs text-[#8A6E64] mt-1 tabular-nums">
                  Works out to ₱{{ effectiveMonthlyRate }}/mo, billed annually
                </p>
              </div>

              <div class="sm:col-span-2">
                <label for="plan_days" class="block text-xs font-bold text-[#8A6E64] mb-1">Trial Duration (Days)</label>
                <input
                  id="plan_days"
                  v-model.number="form.duration_days"
                  type="number"
                  min="1"
                  :class="[inputClass, 'tabular-nums sm:max-w-[calc(50%-0.5rem)]']"
                />
                <p class="text-xs text-[#8A6E64] mt-1">Leave blank for paid plans. Only applies to trial subscriptions.</p>
              </div>
            </div>
          </section>

          <!-- Feature entitlements -->
          <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs">
            <div class="flex items-center justify-between gap-3 mb-1">
              <h3 class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                Feature Entitlements
              </h3>
              <span class="text-xs font-bold text-[#8A6E64] tabular-nums">{{ form.features.length }} selected</span>
            </div>
            <p class="text-xs text-[#8A6E64] mb-3">Choose which modules and tools cafe owners on this plan can use.</p>

            <ul v-if="activeFeatures.length" class="space-y-2">
              <li v-for="feat in activeFeatures" :key="feat.key">
                <label
                  class="flex items-center gap-3 px-3 py-2.5 border rounded-xl cursor-pointer select-none transition-colors"
                  :class="form.features.includes(feat.key) ? 'border-[#B4846C] bg-[#FFFCF7]' : 'border-[#EADCC7] bg-white hover:bg-[#FAF4ED]'"
                >
                  <span class="w-9 h-9 rounded-lg bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0">
                    <Icon name="heroicons:squares-2x2" class="w-[18px] h-[18px]" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-semibold text-[#3D2B24] truncate">{{ feat.name }}</span>
                    <span class="block text-xs text-[#8A6E64] truncate">{{ feat.description || feat.key }}</span>
                  </span>
                  <input
                    type="checkbox"
                    :checked="form.features.includes(feat.key)"
                    class="h-4 w-4 rounded border-[#EDD8CC] accent-[#7D5A50] focus:ring-[#7D5A50]/30 cursor-pointer shrink-0"
                    @change="toggleFeature(feat.key)"
                  />
                </label>
              </li>
            </ul>

            <p v-else class="rounded-xl border border-dashed border-[#EADCC7] bg-white px-4 py-6 text-center text-xs text-[#8A6E64]">
              No active features found. Create features in the Features Catalog tab.
            </p>
          </section>
        </form>

        <!-- Actions (same as the Approval Status modals) -->
        <div class="flex items-center gap-3 border-t border-[#F3E7D2] p-6 bg-white shrink-0">
          <button
            type="button"
            class="flex-1 rounded-xl border border-[#7D5A50] bg-white text-[#7D5A50] font-display font-semibold text-[14px] py-3 hover:bg-[#FFF8EA] transition-colors disabled:opacity-50"
            :disabled="isSaving"
            @click="emit('close')"
          >Cancel</button>
          <button
            type="submit"
            form="subscriptionPlanModalForm"
            class="flex-1 rounded-xl border border-[#7D5A50] bg-[#7D5A50] text-[#FFF0D1] font-display font-semibold text-[14px] py-3 hover:bg-[#65463D] hover:border-[#65463D] transition-colors disabled:opacity-50"
            :disabled="isSaving"
          >{{ isSaving ? 'Saving…' : plan ? 'Update Plan' : 'Create Plan' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
