<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { SubscriptionPlanItem } from '~/services/SubscriptionService'

const props = defineProps<{
  open: boolean
  plan: SubscriptionPlanItem | null
  billingCycle: 'monthly' | 'yearly'
  currentSubscription?: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success', subscriptionId: string): void
}>()

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const paypalClientId = config.public.paypalClientId

const paymentMethod = ref<'paypal' | 'card'>('paypal')
const processing = ref(false)
const errorMsg = ref('')

// PayPal Container Ref
const paypalContainer = ref<HTMLElement | null>(null)
let paypalButtonsInstance: any = null

// Credit Card Mockup State
const cardForm = ref({
  name: '',
  number: '',
  expiry: '',
  cvc: '',
  zip: ''
})

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

const paypalPlanId = computed(() => {
  if (!props.plan) return null
  return props.billingCycle === 'yearly' ? props.plan.paypal_yearly_plan_id : props.plan.paypal_plan_id
})

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    paymentMethod.value = 'paypal'
    errorMsg.value = ''
    processing.value = false
    setTimeout(initPayPal, 100) // wait for DOM
  } else {
    if (paypalButtonsInstance) {
      paypalButtonsInstance.close().catch(() => {})
      paypalButtonsInstance = null
    }
  }
})

watch(paymentMethod, (newVal) => {
  if (newVal === 'paypal') {
    setTimeout(initPayPal, 100)
  } else {
    if (paypalButtonsInstance) {
      paypalButtonsInstance.close().catch(() => {})
      paypalButtonsInstance = null
    }
  }
})

function initPayPal() {
  if (!props.open || paymentMethod.value !== 'paypal') return
  if (!paypalContainer.value) return
  if (paypalButtonsInstance) {
    paypalButtonsInstance.close().catch(() => {})
  }

  // Check if SDK is loaded
  if (!(window as any).paypal) {
    errorMsg.value = 'PayPal SDK failed to load.'
    return
  }

  const pId = paypalPlanId.value
  if (!pId) {
    errorMsg.value = 'This plan does not have a PayPal Plan ID synced.'
    return
  }

  paypalButtonsInstance = (window as any).paypal.Buttons({
    style: {
      shape: 'rect',
      color: 'gold',
      layout: 'vertical',
      label: 'subscribe'
    },
    createSubscription: function(data: any, actions: any) {
      const currentSub = props.currentSubscription
      // Check if it's an upgrade/downgrade of an existing PayPal plan
      if (currentSub?.paypal_subscription_id) {
        return actions.subscription.revise(currentSub.paypal_subscription_id, {
          'plan_id': pId
        })
      }
      
      return actions.subscription.create({
        'plan_id': pId
      });
    },
    onApprove: async function(data: any, actions: any) {
      processing.value = true
      errorMsg.value = ''
      try {
        // Use the ref we grabbed at the root level of setup
        const token = authCookie.value
        
        const res = await $fetch<{success: boolean, message?: string}>(`${apiBase}/owner/subscriptions/paypal`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: {
            paypal_subscription_id: data.subscriptionID,
            plan_uuid: props.plan?.uuid
          }
        })

        if (res.success) {
          emit('success', data.subscriptionID)
          emit('close')
        } else {
          errorMsg.value = res.message || 'Failed to verify subscription on the server.'
        }
      } catch (err: any) {
        console.error('PayPal Subscription error:', err)
        errorMsg.value = err.response?._data?.message || 'An error occurred during subscription verification.'
      } finally {
        processing.value = false
      }
    },
    onError: function(err: any) {
      console.error('PayPal Checkout error:', err)
      errorMsg.value = 'An error occurred with PayPal checkout. Please try again.'
    }
  })

  paypalButtonsInstance.render(paypalContainer.value)
}

function processMockCard() {
  processing.value = true
  errorMsg.value = ''
  
  // Simulate API delay
  setTimeout(() => {
    processing.value = false
    errorMsg.value = 'This is a visual mockup. To process real credit cards via custom fields, integration with Xendit or Stripe is required.'
  }, 1500)
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
                    By confirming this subscription, you authorize BrewSpot to charge your selected payment method on a recurring basis. You can cancel at any time.
                  </p>
                </div>
              </div>

              <!-- Right: Payment Method -->
              <div class="md:w-1/2 flex flex-col">
                <h3 class="font-sans text-xs font-bold uppercase tracking-wider text-[#8B6656] mb-4">Payment Method</h3>
                
                <!-- Payment Selectors -->
                <div class="grid grid-cols-2 gap-3 mb-6">
                  <button 
                    type="button"
                    class="relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200"
                    :class="paymentMethod === 'paypal' ? 'border-[#0070BA] bg-[#F5F9FF]' : 'border-[#EDD8CC] bg-white hover:border-[#0070BA]/40'"
                    @click="paymentMethod = 'paypal'"
                  >
                    <Icon name="logos:paypal" class="w-6 h-6" />
                    <span class="font-sans text-xs font-medium" :class="paymentMethod === 'paypal' ? 'text-[#0070BA]' : 'text-[#7D5A50]'">PayPal</span>
                  </button>
                  
                  <button 
                    type="button"
                    class="relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200"
                    :class="paymentMethod === 'card' ? 'border-[#3B1F0E] bg-[#FFF8EA]' : 'border-[#EDD8CC] bg-white hover:border-[#3B1F0E]/40'"
                    @click="paymentMethod = 'card'"
                  >
                    <Icon name="heroicons:credit-card" class="w-6 h-6" :class="paymentMethod === 'card' ? 'text-[#3B1F0E]' : 'text-[#7D5A50]'" />
                    <span class="font-sans text-xs font-medium" :class="paymentMethod === 'card' ? 'text-[#3B1F0E]' : 'text-[#7D5A50]'">Credit Card</span>
                  </button>
                </div>

                <div v-if="errorMsg" class="mb-4 p-3 rounded-lg bg-[#FEE2E2] text-[#B91C1C] text-sm font-sans flex gap-2 items-start border border-[#FCA5A5]">
                  <Icon name="heroicons:exclamation-circle" class="w-5 h-5 shrink-0" />
                  <span class="leading-tight">{{ errorMsg }}</span>
                </div>

                <!-- PayPal Flow -->
                <div v-show="paymentMethod === 'paypal'" class="flex-1 flex flex-col justify-center">
                  <div class="relative min-h-[150px] w-full">
                    <!-- Overlay blocker when processing -->
                    <div v-if="processing" class="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
                      <Icon name="heroicons:arrow-path" class="w-8 h-8 text-[#0070BA] animate-spin" />
                    </div>
                    <div ref="paypalContainer" class="w-full"></div>
                  </div>
                </div>

                <!-- Custom Credit Card Mockup Flow -->
                <div v-show="paymentMethod === 'card'" class="flex-1 flex flex-col">
                  <form @submit.prevent="processMockCard" class="space-y-4">
                    <div>
                      <label class="block font-sans text-[11px] font-bold uppercase text-[#8B6656] mb-1">Cardholder Name</label>
                      <input 
                        v-model="cardForm.name"
                        type="text" 
                        class="w-full rounded-lg border border-[#EDD8CC] bg-white px-3 py-2.5 font-sans text-sm text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#7D5A50] focus:border-transparent transition-all"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div>
                      <label class="block font-sans text-[11px] font-bold uppercase text-[#8B6656] mb-1">Card Number</label>
                      <div class="relative">
                        <Icon name="heroicons:credit-card" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E7060]" />
                        <input 
                          v-model="cardForm.number"
                          type="text" 
                          class="w-full rounded-lg border border-[#EDD8CC] bg-white pl-10 pr-3 py-2.5 font-sans text-sm tracking-widest text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#7D5A50] focus:border-transparent transition-all"
                          placeholder="0000 0000 0000 0000"
                          maxlength="19"
                          required
                        />
                      </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block font-sans text-[11px] font-bold uppercase text-[#8B6656] mb-1">Expiry</label>
                        <input 
                          v-model="cardForm.expiry"
                          type="text" 
                          class="w-full rounded-lg border border-[#EDD8CC] bg-white px-3 py-2.5 font-sans text-sm text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#7D5A50] focus:border-transparent transition-all"
                          placeholder="MM/YY"
                          maxlength="5"
                          required
                        />
                      </div>
                      <div>
                        <label class="block font-sans text-[11px] font-bold uppercase text-[#8B6656] mb-1">CVC</label>
                        <input 
                          v-model="cardForm.cvc"
                          type="text" 
                          class="w-full rounded-lg border border-[#EDD8CC] bg-white px-3 py-2.5 font-sans text-sm text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#7D5A50] focus:border-transparent transition-all"
                          placeholder="123"
                          maxlength="4"
                          required
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      class="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3B1F0E] text-[#FDF3E7] font-display font-semibold text-sm hover:bg-[#2A150A] transition-colors focus:ring-4 focus:ring-[#3B1F0E]/20"
                      :disabled="processing"
                    >
                      <Icon v-if="processing" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
                      <span v-else>Pay ₱{{ finalPrice }}</span>
                    </button>
                  </form>
                </div>

              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
