<!--admin dashboard-->
<script setup lang="ts">
definePageMeta({
  role: 'Admin',
})

const links = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'Owners', to: '/admin/owners' },
  { label: 'Plans', to: '/admin/plans' },
]
</script>

<template>
  <div class="min-h-screen bg-[#fdf3e7]">
    <NavBar title="BrewSpot Admin" :links="links" />
    <main class="p-8">
      <h1 class="text-2xl font-semibold text-[#3b1f0e]">Admin Dashboard</h1>
      <p class="text-sm text-[#3b1f0e]/60 mt-2">Overview of owners, approvals, and plans.</p>
    </main>
  </div>
</template>