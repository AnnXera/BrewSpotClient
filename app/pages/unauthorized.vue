<!--app/pages/unauthorized.vue-->
<script setup lang="ts">
const authStore = useAuthStore()
const logout = useLogout()

function goHome() {
  if (authStore.role) {
    navigateTo(getRedirectForRole(authStore.role))
  } else {
    navigateTo('/login')
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#FDF3E7] flex items-center justify-center p-4 font-display">
    <div class="bg-white border border-[#EEDFC4] rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
      <div class="w-16 h-16 rounded-full bg-[#FDE8E8] text-[#DC3545] mx-auto flex items-center justify-center mb-4">
        <Icon name="heroicons:shield-exclamation" class="w-8 h-8" />
      </div>
      <h1 class="text-2xl font-bold text-[#3D2B24] mb-2">Access Restricted</h1>
      <p class="text-sm text-[#9E7060] mb-6">
        You do not have administrative permissions to view this page.
      </p>
      <div class="space-y-3">
        <button
          type="button"
          class="w-full h-11 rounded-xl bg-[#7B5A50] text-[#FFF0D1] font-semibold text-sm hover:bg-[#65463D] transition-colors"
          @click="goHome"
        >
          Return to Dashboard
        </button>
        <button
          type="button"
          class="w-full h-11 rounded-xl border border-[#EDD8CC] text-[#7D5A50] font-semibold text-sm hover:bg-[#FAF5EE] transition-colors"
          @click="logout"
        >
          Sign Out
        </button>
      </div>
    </div>
  </div>
</template>
