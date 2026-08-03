<!--NavBar component-->
<script setup lang="ts">
defineProps<{
  title: string
  links: { label: string; to: string }[]
}>()

const authService = useAuthService()
const authStore = useAuthStore()

async function handleLogout() {
  const token = useCookie<string | null>('auth_token')

  try {
    await authService.logout()
  } catch {
    // clear local state regardless of API outcome
  } finally {
    token.value = null
    authStore.clear()
    navigateTo('/login')
  }
}
</script>

<template>
  <nav class="flex items-center justify-between px-6 py-4 bg-[#3b1f0e] text-[#fdf3e7]">
    <div class="flex items-center gap-8">
      <span class="font-semibold tracking-wide">{{ title }}</span>

      <div class="flex items-center gap-5">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="text-sm text-[#fdf3e7]/80 hover:text-[#fdf3e7] transition"
          active-class="text-[#fdf3e7] font-medium"
        >
          {{ link.label }}
        </NuxtLink>
      </div>
    </div>

    <button
      class="text-sm rounded-full border border-[#fdf3e7]/30 px-4 py-1.5 hover:bg-[#fdf3e7]/10 transition"
      @click="handleLogout"
    >
      Log Out
    </button>
  </nav>
</template>