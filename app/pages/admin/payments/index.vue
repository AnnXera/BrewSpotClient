<script setup lang="ts">
import AdminPaymentHistory from '~/components/payments/AdminPaymentHistory.vue'

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
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7] w-full overflow-x-hidden">
    <!-- Sidebar Navigation -->
    <NavBar :links="links" />

    <main class="flex-1 min-w-0 overflow-x-hidden p-3.5 min-[360px]:p-4 sm:p-6 md:p-8 xl:p-10">
      <div class="mx-auto max-w-[1360px] w-full min-w-0">
        <AdminPaymentHistory />
      </div>
    </main>
  </div>
</template>
