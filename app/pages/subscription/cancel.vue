<!-- pages/subscription/cancel.vue -->
<script setup lang="ts">
definePageMeta({ auth: false })

const route = useRoute()
const router = useRouter()
const subService = useSubscriptionService()

const cancelling = ref(true)

onMounted(async () => {
  const token = route.query.token as string
  const baToken = route.query.ba_token as string
  const subscriptionId = route.query.subscription_id as string

  if (token || baToken || subscriptionId) {
    try {
      await subService.cancelCheckout({
        token,
        ba_token: baToken,
        subscription_id: subscriptionId
      })
    } catch (e) {
      console.error('Error cancelling transaction', e)
    }
  }
  
  cancelling.value = false
})
</script>

<template>
  <div class="min-h-screen bg-[#FDF3E7] flex items-center justify-center p-6">
    <div class="bg-white border border-[#EEDFC4] rounded-2xl shadow-sm p-10 max-w-md w-full text-center">

      <!-- Icon -->
      <div class="w-16 h-16 rounded-full bg-[#F8D7DA] flex items-center justify-center mx-auto mb-5">
        <Icon name="heroicons:x-circle" class="w-9 h-9 text-[#DC3545]" />
      </div>

      <h1 class="font-display text-2xl font-bold text-[#3B1F0E] mb-2">
        Payment Cancelled
      </h1>
      
      <div v-if="cancelling" class="text-center py-2">
        <Icon name="heroicons:arrow-path" class="w-5 h-5 mx-auto animate-spin text-[#9E7060]" />
        <p class="font-sans text-sm text-[#8B6656] mt-2 leading-relaxed">
          Cancelling your transaction...
        </p>
      </div>
      <div v-else>
        <p class="font-sans text-sm text-[#8B6656] mb-8 leading-relaxed">
          You have cancelled the checkout process. No charges were made to your account.
        </p>

        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#7D5A50] text-[#FDF3E7] font-display font-semibold text-sm hover:bg-[#684940] transition-colors"
            @click="router.push('/owner/subscription')"
          >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            Return to Subscriptions
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
