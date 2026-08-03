<!--Cafe Owner dashboard-->
<script setup lang="ts">
definePageMeta({
  role: 'Cafe Owner',
})

const links = [
  { label: 'Dashboard', to: '/owner/dashboard' },
  { label: 'Branches', to: '/owner/branches' },
  { label: 'Menu', to: '/owner/menu' },
  { label: 'Subscription', to: '/owner/subscription' },
]
</script>

<template>
  <div class="min-h-screen bg-[#fdf3e7]">
    <NavBar title="BrewSpot Owner" :links="links" />
    <main class="p-8">
      <h1 class="text-2xl font-semibold text-[#3b1f0e]">Owner Dashboard</h1>
      <p class="text-sm text-[#3b1f0e]/60 mt-2">Manage your cafe, branches, and menu.</p>
    </main>
  </div>
</template>