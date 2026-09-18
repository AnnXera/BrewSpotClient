<!-- components/subscription/PlanCard.vue -->
<script setup lang="ts">
import type { SubscriptionPlanItem, FeatureItem } from '~/services/SubscriptionService'

const props = defineProps<{
  plan: SubscriptionPlanItem
  featuresList?: FeatureItem[]
}>()

const emit = defineEmits<{
  edit: [plan: SubscriptionPlanItem]
  delete: [plan: SubscriptionPlanItem]
}>()

function getFeatureName(key: string): string {
  const found = props.featuresList?.find((f) => f.key === key)
  if (found) return found.name
  const detail = props.plan.feature_details?.find((f) => f.key === key)
  if (detail) return detail.name
  return key.replace(/_/g, ' ')
}

function formatPrice(val: string | number): string {
  const num = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(num) ? '0.00' : num.toFixed(2)
}
</script>

<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative">
    <div>
      <!-- Card Header -->
      <div class="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 class="font-display text-[20px] leading-[26px] font-bold text-[#3B1F0E]">
            {{ plan.sub_name }}
          </h3>
          <p class="font-sans text-[13px] leading-[19px] text-[#9E7060] mt-1 line-clamp-2">
            {{ plan.description || 'No description provided.' }}
          </p>
        </div>
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full font-display font-semibold text-xs whitespace-nowrap"
          :class="plan.is_active !== false ? 'bg-[#D4EDDA] text-[#28A745]' : 'bg-[#FDE8E8] text-[#DC3545]'"
        >
          {{ plan.is_active !== false ? 'Active' : 'Inactive' }}
        </span>
      </div>

      <!-- Price Metric Box -->
      <div class="my-4 p-4 rounded-xl bg-[#FFFBF3] border border-[#F3E7D2] grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div>
          <span class="font-sans text-[11px] font-bold uppercase tracking-wider text-[#9E7060] block">Monthly</span>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="font-display text-[20px] font-bold text-[#7D5A50]">₱{{ formatPrice(plan.price) }}</span>
            <span class="font-sans text-[11px] text-[#9E7060]">/mo</span>
          </div>
        </div>

        <div>
          <span class="font-sans text-[11px] font-bold uppercase tracking-wider text-[#9E7060] block">Yearly</span>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="font-display text-[20px] font-bold text-[#7D5A50]">
              ₱{{ formatPrice(plan.yearly_price ?? 0) }}
            </span>
            <span class="font-sans text-[11px] text-[#9E7060]">/yr</span>
          </div>
        </div>
      </div>

      <!-- Included Features Section -->
      <div class="mb-4">
        <span class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase block mb-2">
          Included Features ({{ plan.features?.length || 0 }})
        </span>
        <div v-if="plan.features && plan.features.length > 0" class="flex flex-wrap gap-1.5">
          <span
            v-for="fKey in plan.features"
            :key="fKey"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium bg-[#FFFDF9] text-[#3B1F0E] border border-[#EDD8CC]"
          >
            <Icon name="heroicons:check-circle" class="w-3.5 h-3.5 text-[#28A745]" />
            <span>{{ getFeatureName(fKey) }}</span>
          </span>
        </div>
        <p v-else class="font-sans text-xs text-[#9E7060] italic">
          Basic access only (no extra features).
        </p>
      </div>
    </div>

    <!-- Card Footer with Icon Actions -->
    <div class="pt-4 border-t border-[#F3E7D2] flex items-center justify-end">
      <div class="inline-flex items-center gap-1">
        <button
          type="button"
          class="p-2 rounded-lg text-[#7D5A50] hover:bg-[#F3E7D2] transition-colors"
          title="Edit Plan"
          @click="emit('edit', plan)"
        >
          <Icon name="heroicons:pencil-square" class="w-4 h-4" />
        </button>
        <button
          type="button"
          class="p-2 rounded-lg text-[#D9534F] hover:bg-red-50 transition-colors"
          title="Deactivate Plan"
          @click="emit('delete', plan)"
        >
          <Icon name="heroicons:trash" class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
