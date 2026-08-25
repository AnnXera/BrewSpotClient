<script setup lang="ts">
definePageMeta({
  role: 'Cafe Owner',
})

const links = [
  { label: 'Dashboard', to: '/owner/dashboard', icon: 'squares-2x2' },
  { label: 'Branches', to: '/owner/branches', icon: 'building-storefront' },
  { label: 'Menu', to: '/owner/menu', icon: 'clipboard' },
  { label: 'Subscription', to: '/owner/subscription', icon: 'credit-card' },
]
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#fdf3e7]">
    <NavBar :links="links" />
    <main class="flex-1 p-8">
      <h1 class="font-display text-2xl font-semibold text-[#3b1f0e]">Owner Dashboard</h1>
    </main>
  </div>
</template>