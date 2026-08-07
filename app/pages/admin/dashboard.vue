<!--dashboard.vue-->
<script setup lang="ts">
definePageMeta({
  role: 'Admin',
})

const links = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'squares-2x2' },
  { label: 'Owner Management', to: '/admin/ownermanagement', icon: 'users' },
  { label: 'Approval List', to: '/admin/approvals', icon: 'check-circle' },
  { label: 'Subscriptions', to: '/admin/subscriptions', icon: 'credit-card' },
  { label: 'Payment History', to: '/admin/payments', icon: 'clipboard' },
]
</script>

<template>
  <div class="flex min-h-screen bg-[#fdf3e7]">
    <NavBar :links="links" />
    <main class="flex-1 p-8">
      <h1 class="font-display text-2xl font-semibold text-[#3b1f0e]">Admin Dashboard</h1>
    </main>
  </div>
</template>