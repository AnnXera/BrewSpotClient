<!-- app/pages/manager/floor-plan/index.vue -->
<script setup lang="ts">
definePageMeta({
  role: 'Manager',
})

const links = [
  { label: 'Dashboard', to: '/manager/dashboard', icon: 'squares-2x2' },
  { label: 'Servings', to: '/manager/servings', icon: 'cake' },
  { label: 'Floor Plan', to: '/manager/floor-plan', icon: 'map' },
]
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#fdf3e7]">
    <NavBar :links="links" />
    <main class="flex-1 p-8 space-y-6">
      <h1 class="font-display text-2xl font-semibold text-[#3b1f0e]">Floor Plan</h1>
    </main>
  </div>
</template>
