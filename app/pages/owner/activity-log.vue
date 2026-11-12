<script setup lang="ts">
import ActivityLogView from '~/components/activity/ActivityLogView.vue'

// Audit log of what people did at the owner's cafe, every branch.
definePageMeta({
  role: 'Cafe Owner',
})

const links = OWNER_NAV_LINKS
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#FDF3E7] md:flex-row">
    <NavBar :links="links" />

    <main class="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10 xl:px-12">
      <div class="mx-auto max-w-[1360px]">
        <ActivityLogView scope="owner" />
      </div>
    </main>
  </div>
</template>
