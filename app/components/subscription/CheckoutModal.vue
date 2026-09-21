<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SubscriptionPlanItem } from '~/services/SubscriptionService'

const props = defineProps<{
  open: boolean
  plan: SubscriptionPlanItem | null
  billingCycle: 'monthly' | 'yearly'
  currentSubscription?: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const processing = ref(false)
const errorMsg = ref('')

// Get the cookie at the root of setup!
const authCookie = useCookie('auth_token')

const finalPrice = computed(() => {
  if (!props.plan) return '0.00'
  const price = props.billingCycle === 'yearly'
    ? (props.plan.yearly_price ?? props.plan.price)
    : props.plan.price
  const num = typeof price === 'string' ? parseFloat(price) : price
  return isNaN(num) ? '0.00' : num.toFixed(2)
})

const termLabel = computed(() => props.billingCycle === 'yearly' ? 'year' : 'month')

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    errorMsg.value = ''
    processing.value = false
  }
})

async function processPayMongo() {
  processing.value = true
  errorMsg.value = ''

  try {
    const token = authCookie.value
    const res = await $fetch<{success: boolean, message?: string, checkout_url?: string}>(`${apiBase}/owner/subscriptions/checkout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: {
        plan_uuid: props.plan?.uuid,
        billing_cycle: props.billingCycle
      }
    })

    if (res.success && res.checkout_url) {
      window.location.href = res.checkout_url
    } else {
      errorMsg.value = res.message || 'Failed to initialize checkout.'
      processing.value = false
    }
  } catch (err: any) {
    console.error('PayMongo Checkout error:', err)
    errorMsg.value = err.response?._data?.message || 'An error occurred during checkout.'
    processing.value = false
  }
}

function close() {
  if (processing.value) return
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3B1F0E]/60 backdrop-blur-sm"
        @mousedown.self="close"
      >
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="opacity-0 translate-y-4 scale-95"
          leave-to-class="opacity-0 translate-y-4 scale-95"
        >
          <div
            v-if="open"
            class="bg-[#FDF3E7] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <!-- Header -->
            <div class="px-6 py-5 border-b border-[#EDD8CC] flex items-center justify-between bg-white shrink-0">
              <h2 class="font-display text-xl font-bold text-[#3D2B24]">Checkout</h2>
              <button
                type="button"
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3E7D2] transition-colors"
                @click="close"
                :disabled="processing"
              >
                <Icon name="heroicons:x-mark" class="w-5 h-5 text-[#8B6656]" />
              </button>
            </div>

            <div class="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-8">
              <!-- Left: Order Summary -->
              <div class="md:w-1/2 flex flex-col">
                <h3 class="font-sans text-xs font-bold uppercase tracking-wider text-[#8B6656] mb-4">Order Summary</h3>
                <div class="bg-white rounded-xl border border-[#EDD8CC] p-5 shadow-sm">
                  <div class="flex justify-between items-start mb-4">
                    <div>
                      <h4 class="font-display font-bold text-[#3B1F0E] text-lg">{{ plan?.sub_name }}</h4>
                      <p class="font-sans text-sm text-[#7D5A50] capitalize">{{ billingCycle }} Billing</p>
                    </div>
                  </div>

                  <div class="pt-4 border-t border-dashed border-[#EDD8CC]">
                    <div class="flex justify-between items-center">
                      <span class="font-sans text-sm text-[#7D5A50]">Total Due Today</span>
                      <span class="font-display font-bold text-2xl text-[#3B1F0E]">₱{{ finalPrice }}</span>
                    </div>
                  </div>
                </div>

                <div class="mt-6">
                  <p class="font-sans text-xs text-[#9E7060] leading-relaxed">
                    This is a one-time payment covering one {{ termLabel }} of your
                    {{ plan?.sub_name }}. You will not be charged automatically — we will
                    email you before it expires so you can renew, and any days left on your
                    current term carry over.
                  </p>
                </div>
              </div>

              <!-- Right: Payment Method -->
              <div class="md:w-1/2 flex flex-col">
                <h3 class="font-sans text-xs font-bold uppercase tracking-wider text-[#8B6656] mb-4">Payment Method</h3>

                <div class="flex items-center gap-3 p-4 rounded-xl border-2 border-[#3B1F0E] bg-[#FFF8EA] mb-6">
                  <Icon name="heroicons:credit-card" class="w-6 h-6 text-[#3B1F0E] shrink-0" />
                  <div class="text-left">
                    <p class="font-sans text-sm font-semibold text-[#3B1F0E]">Cards / E-Wallets</p>
                    <p class="font-sans text-xs text-[#7D5A50]">GCash, Maya, GrabPay, Credit/Debit Cards</p>
                  </div>
                </div>

                <div v-if="errorMsg" class="mb-4 p-3 rounded-lg bg-[#FEE2E2] text-[#B91C1C] text-sm font-sans flex gap-2 items-start border border-[#FCA5A5]">
                  <Icon name="heroicons:exclamation-circle" class="w-5 h-5 shrink-0" />
                  <span class="leading-tight">{{ errorMsg }}</span>
                </div>

                <!-- PayMongo Flow -->
                <div class="flex-1 flex flex-col justify-center items-center">
                  <div class="text-center mb-6">
                    <p class="font-sans text-sm text-[#7D5A50] mb-2">You will be redirected to PayMongo to securely complete your payment.</p>
                    <p class="font-sans text-xs text-[#9E7060]">Your card details are entered on PayMongo's page, never on BrewSpot.</p>
                  </div>
                  <button
                    @click="processPayMongo"
                    class="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold text-sm hover:bg-[#2A150A] transition-colors focus:ring-4 focus:ring-[#3B1F0E]/20 disabled:opacity-60"
                    :disabled="processing"
                  >
                    <Icon v-if="processing" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
                    <span v-else>Proceed to Pay ₱{{ finalPrice }}</span>
                  </button>
                </div>

              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
