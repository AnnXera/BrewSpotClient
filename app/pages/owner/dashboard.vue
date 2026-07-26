<script setup lang="ts">
definePageMeta({ role: 'Cafe Owner' })

useSeoMeta({
  title: "Dashboard | BrewSpot",
  description: "BrewSpot Cafe Management Dashboard",
})
</script>

<template>
  <div class="p-8 max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-800">Owner Dashboard</h1>
      <p class="text-sm text-gray-500">BrewSpot • Davao City</p>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium text-gray-500">Today's Sales</p>
        <h3 class="text-3xl font-extrabold text-[#7B5A50] mt-2">₱9,240</h3>
        <p class="text-xs text-green-600 mt-2">↑ 12% from yesterday</p>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium text-gray-500">Reservations</p>
        <h3 class="text-3xl font-extrabold text-[#7B5A50] mt-2">14</h3>
        <p class="text-xs text-gray-400 mt-2">4 pending confirmation</p>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium text-gray-500">Table Turnover</p>
        <h3 class="text-3xl font-extrabold text-[#7B5A50] mt-2">2.4★</h3>
        <p class="text-xs text-blue-600 mt-2">Average 45 mins / table</p>
      </div>
    </div>
  </div>
</template>