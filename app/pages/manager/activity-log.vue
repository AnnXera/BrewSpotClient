<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ActivityLogView from '~/components/activity/ActivityLogView.vue'
import type { ManagedBranchInfo } from '~/services/ManagerDashboardService'

// The manager's branch: who used its registers, who changed its employees, servings or
// floor plans, and the owner's menu changes.
definePageMeta({
  role: 'Manager',
})

const links = MANAGER_NAV_LINKS
const service = useManagerDashboardService()

const branch = ref<ManagedBranchInfo | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const res = await service.managedBranches()
    branch.value = res.branches?.[0] ?? null
    if (!branch.value) error.value = 'You are not currently assigned to any cafe branch. Please contact an owner.'
  } catch (err: any) {
    error.value = err?.data?.message || 'Your branch could not be loaded. Please check your connection.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#FDF3E7] md:flex-row">
    <NavBar :links="links" />

    <main class="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10 xl:px-12">
      <div class="mx-auto max-w-[1360px]">
        <div v-if="loading" class="space-y-3">
          <span class="skeleton block h-10 w-56 rounded-lg" />
          <span class="skeleton block h-64 rounded-[22px]" />
        </div>
        <p v-else-if="error" class="rounded-xl border border-[#F3E7D2] bg-white px-4 py-6 text-center text-[13px] text-[#8B6656]">{{ error }}</p>
        <ActivityLogView v-else-if="branch" scope="manager" :branch-uuid="branch.uuid" :branch-name="branch.branch_name" />
      </div>
    </main>
  </div>
</template>
