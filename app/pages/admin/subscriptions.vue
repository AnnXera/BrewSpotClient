<!--app/pages/admin/subscriptions.vue-->
<script setup lang="ts">
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
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7]">
    <NavBar :links="links" />
    <main class="flex-1 p-4 sm:p-6 md:p-12">
      <header class="mb-6">
        <h1 class="font-display text-xl sm:text-2xl md:text-[28px] font-bold text-[#3D2B24]">
          Subscriptions
        </h1>
        <p class="font-sans text-xs sm:text-sm text-[#9E7060] mt-1">
          Manage and monitor platform subscription plans and active subscriber statuses.
        </p>
      </header>

      <div class="bg-white border border-[#EEDFC4] rounded-2xl p-8 text-center">
        <Icon name="heroicons:credit-card" class="w-12 h-12 text-[#9E7060] mx-auto mb-3" />
        <p class="font-display font-bold text-lg text-[#3D2B24]">Subscription Management Portal</p>
        <p class="text-sm text-[#9E7060] mt-1">Subscriber overview and plan management console.</p>
      </div>
    </main>
  </div>
</template>
