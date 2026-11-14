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
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7]">
    <!-- Sidebar Navigation -->
    <NavBar :links="links" />

    <main class="flex-1 p-6 md:p-12">
      <AdminPaymentHistory />
    </main>
  </div>
</template>
