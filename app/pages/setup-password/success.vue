<!--Password setup success page-->
<script setup lang="ts">
import { useRoute } from 'vue-router'
import logoFull from '~/assets/images/logo-with-tag.svg'

definePageMeta({
  layout: false,
})

const route = useRoute()

const message = computed(() =>
  (route.query.message as string) || 'Your account has been activated successfully.'
)

function goLogin() {
  navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2">
    <!-- Left Hero Section -->
    <section class="hidden lg:flex flex-col justify-center bg-[#7B5A50] font-display text-white px-16 py-12">
      <div class="max-w-lg mx-auto text-center space-y-12">
        <div>
          <img :src="logoFull" alt="BrewSpot" class="h-16 mx-auto" />
        </div>

        <div class="space-y-3">
          <h2 class="text-3xl font-bold leading-tight">
            You're all set.
          </h2>
          <p class="text-sm text-[#e5d9d4] leading-relaxed">
            Your account is active and ready — sign in to start managing your cafe.
          </p>
        </div>

        <div class="grid grid-cols-3 gap-3 pt-4">
          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <Icon name="heroicons:shopping-bag" class="w-6 h-6 mx-auto text-white" />
            <p class="text-xs font-semibold mt-2 text-white">POS & Inventory</p>
          </div>
          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <Icon name="heroicons:calendar-days" class="w-6 h-6 mx-auto text-white" />
            <p class="text-xs font-semibold mt-2 text-white">Reservations</p>
          </div>
          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <Icon name="heroicons:chart-bar" class="w-6 h-6 mx-auto text-white" />
            <p class="text-xs font-semibold mt-2 text-white">Sales Analytics</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Right Success Section -->
    <section class="flex items-center justify-center bg-[#FFF8EA] px-8 py-12">
      <div class="w-full max-w-sm space-y-6 text-center">
        <div class="w-16 h-16 rounded-full bg-[#D4EDDA] text-[#28A745] mx-auto flex items-center justify-center">
          <Icon name="heroicons:check-circle" class="w-9 h-9" />
        </div>

        <div>
          <h1 class="text-2xl font-bold text-[#2d201b]">Account activated</h1>
          <p class="text-gray-600 text-sm mt-2 leading-relaxed">{{ message }}</p>
        </div>

        <button
          type="button"
          class="w-full h-11 rounded-md bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition flex items-center justify-center gap-2"
          @click="goLogin"
        >
          <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
          <span>Continue to Sign In</span>
        </button>
      </div>
    </section>
  </div>
</template>