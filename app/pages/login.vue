<!--Login page-->
<script setup lang="ts">
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const authService = useAuthService()

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const res = await authService.login(email.value, password.value)
    if (res.success && res.requires_2fa) {
      navigateTo({ path: '/verify-login-code', query: { email: email.value } })
    } else {
      error.value = res.message
    }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Login failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-[#3b1f0e] p-4 md:p-8">
    <div class="relative w-full max-w-6xl h-[640px] rounded-3xl overflow-hidden shadow-2xl flex">

      <div
        class="hidden md:flex relative w-1/2 flex-col justify-between p-8 bg-cover bg-center"
        style="background-image: linear-gradient(180deg, rgba(59,31,14,0.15) 0%, rgba(59,31,14,0.55) 100%), url('https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80');"
      >
        <span class="text-[#fdf3e7] text-xl font-semibold tracking-wide drop-shadow">
          BrewSpot
        </span>

        <div class="text-[#fdf3e7] drop-shadow">
          <h2 class="text-3xl font-semibold italic mb-2">Your Café,<br />Your Way</h2>
          <p class="text-sm text-[#fdf3e7]/80 max-w-xs">
            Manage your café operations, subscriptions, and branches — all from one place.
          </p>
        </div>
      </div>

      <div class="w-full md:w-1/2 bg-[#fdf3e7] flex items-center justify-center p-8 md:p-12">
        <form class="w-full max-w-sm space-y-5" @submit.prevent="handleLogin">
          <div>
            <h1 class="text-3xl font-semibold text-[#3b1f0e]">
              <span class="italic font-normal text-4xl">W</span>elcome back
            </h1>
            <p class="text-sm text-[#3b1f0e]/60 mt-2">
              Sign in to continue to your BrewSpot dashboard.
            </p>
          </div>

          <div class="space-y-3">
            <input
              v-model="email"
              type="email"
              placeholder="Enter your email"
              class="w-full rounded-full border border-[#3b1f0e]/15 bg-[#fffdf9] px-5 py-3 text-sm text-[#3b1f0e] placeholder:text-[#3b1f0e]/40 focus:outline-none focus:ring-2 focus:ring-[#3b1f0e]/30"
              required
            />
            <input
              v-model="password"
              type="password"
              placeholder="Enter your password"
              class="w-full rounded-full border border-[#3b1f0e]/15 bg-[#fffdf9] px-5 py-3 text-sm text-[#3b1f0e] placeholder:text-[#3b1f0e]/40 focus:outline-none focus:ring-2 focus:ring-[#3b1f0e]/30"
              required
            />
          </div>

          <p v-if="error" class="text-red-[#e05252] text-sm">{{ error }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full rounded-full bg-[#3b1f0e] text-[#fdf3e7] py-3 text-sm font-medium hover:bg-[#2c1609] transition disabled:opacity-60"
          >
            {{ loading ? 'Signing in...' : 'Log In' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
