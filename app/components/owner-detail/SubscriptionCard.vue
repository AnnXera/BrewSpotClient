<!--components/owner-detail/SubscriptionCard.vue-->
<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl p-4 min-[360px]:p-5 sm:p-6 shadow-sm">
    <div class="flex items-center justify-between gap-2 mb-3 min-[360px]:mb-4">
      <h2 class="font-display text-base min-[360px]:text-[18px] font-bold text-[#3D2B24]">
        {{ subscription?.status === 'active' ? 'Active Subscription' : 'Subscription' }}
      </h2>
      <span
        v-if="subscription"
        class="font-display rounded-[8px] px-2 py-0.5 min-[360px]:px-2.5 min-[360px]:py-1 text-[10px] min-[360px]:text-[11px] font-bold bg-[#F0E3CE] text-[#8B6656] shrink-0"
      >
        {{ planTierBadge }}
      </span>
    </div>

    <template v-if="subscription">
      <p class="font-display text-2xl min-[360px]:text-[28px] sm:text-[32px] font-bold text-[#7D5A50] mb-0.5 min-[360px]:mb-1">
        {{ formatCurrency(subscription.price) }}
        <span class="font-display text-xs min-[360px]:text-[14px] font-medium text-[#9E7060]">/ month</span>
      </p>

      <p class="font-display text-xs min-[360px]:text-[13px] text-[#9E7060] mb-4 min-[360px]:mb-5 pb-4 min-[360px]:pb-5 border-b border-[#F3E7D2]">
        {{ subscription.plan_name }} (up to {{ subscription.max_branches }} branches)
      </p>

      <div class="grid grid-cols-2 gap-3 min-[360px]:gap-4 font-display font-medium text-[13px] min-[360px]:text-[14px]">
        <div>
          <p class="font-bold text-[10px] min-[360px]:text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-0.5 min-[360px]:mb-1">Payment Method</p>
          <p class="text-[#3B1F0E] truncate">{{ subscription.payment_method ?? '—' }}</p>
        </div>

        <div>
          <p class="font-bold text-[10px] min-[360px]:text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-0.5 min-[360px]:mb-1">Next Payment</p>
          <p class="text-[#3B1F0E]">{{ formatDate(subscription.end_date) }}</p>
        </div>

        <div class="col-span-2">
          <p class="font-bold text-[10px] min-[360px]:text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-0.5 min-[360px]:mb-1">Status</p>
          <p class="text-[#3B1F0E] capitalize">{{ subscription.status === 'active' ? 'Current & Active' : subscription.status }}</p>
        </div>
      </div>
    </template>

    <p v-else class="font-sans text-sm text-[#9E7060]">No subscription on record.</p>
  </div>
</template>

<script setup lang="ts">
interface Subscription {
  status: string
  plan_name: string | null
  price: number | string | null
  max_branches: number | null
  payment_method: string | null
  end_date: string | null
}

const props = defineProps<{
  subscription: Subscription | null
}>()

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function formatCurrency(value?: number | string | null) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(value))
}

const planTierBadge = computed(() => {
  const name = props.subscription?.plan_name ?? ''
  return name.toUpperCase().split(' ')[0] || 'PLAN'
})
</script>