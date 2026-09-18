<!-- pages/subscription/success.vue -->
<script setup lang="ts">
definePageMeta({ auth: false })

const route = useRoute()
const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-[#FDF3E7] flex items-center justify-center p-6">
    <div class="bg-white border border-[#EEDFC4] rounded-2xl shadow-sm p-10 max-w-md w-full text-center">

      <!-- Icon -->
      <div class="w-16 h-16 rounded-full bg-[#D4EDDA] flex items-center justify-center mx-auto mb-5">
        <Icon name="heroicons:check-circle" class="w-9 h-9 text-[#28A745]" />
      </div>

      <h1 class="font-display text-2xl font-bold text-[#3B1F0E] mb-2">
        Payment Received!
      </h1>
      <p class="font-sans text-sm text-[#8B6656] mb-2 leading-relaxed">
        Your payment is being processed. Your subscription will be activated shortly
        once PayPal confirms the transaction.
      </p>
      <p class="font-sans text-xs text-[#9E7060] mb-8">
        This usually takes a few seconds. Refresh your subscription page if it doesn't update immediately.
      </p>

      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          id="success-go-subscription"
          type="button"
          class="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#7D5A50] text-[#FDF3E7] font-display font-semibold text-sm hover:bg-[#684940] transition-colors"
          @click="router.push('/owner/subscription')"
        >
          <Icon name="heroicons:credit-card" class="w-4 h-4" />
          View My Subscription
        </button>
      </div>
    </div>
  </div>
</template>
