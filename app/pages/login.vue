<!--Login page-->
<script setup lang="ts">
const email = ref('')
const password = ref('')
const showPassword = ref(false)
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

function togglePassword() {
  showPassword.value = !showPassword.value
}

function goRegister() {
  navigateTo('/register')
}
</script>

<template>
  <div class="h-screen w-full flex items-center justify-center bg-[#f2e9de] overflow-hidden" style="font-family: 'Poppins', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <div class="w-full max-w-6xl h-full max-h-[calc(100vh-2rem)] rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row">
      <div class="relative w-full md:w-1/2 bg-[#6f4227] p-6 md:p-10 text-[#f5eddc] flex flex-col justify-between min-h-full">
        <div>
          <span class="text-2xl font-semibold tracking-[0.24em] uppercase">BrewSpot</span>
          <div class="mt-14">
            <h2 class="text-3xl md:text-4xl font-semibold leading-tight">
              Every great cup starts<br />with great management.
            </h2>
            <p class="mt-4 max-w-xs text-sm text-[#f5eddc]/80">
              BrewSpot · Café Management System · Davao City
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div class="rounded-3xl border border-[#f5eddc]/15 bg-[#7b4d36]/70 p-4 text-center">
            <p class="text-xs uppercase tracking-[0.18em] text-[#f5eddc]/80">Today’s Sales</p>
            <p class="mt-3 text-2xl font-semibold">₱9,240</p>
          </div>
          <div class="rounded-3xl border border-[#f5eddc]/15 bg-[#7b4d36]/70 p-4 text-center">
            <p class="text-xs uppercase tracking-[0.18em] text-[#f5eddc]/80">Reservation</p>
            <p class="mt-3 text-2xl font-semibold">14</p>
          </div>
          <div class="rounded-3xl border border-[#f5eddc]/15 bg-[#7b4d36]/70 p-4 text-center">
            <p class="text-xs uppercase tracking-[0.18em] text-[#f5eddc]/80">Table Turnover</p>
            <p class="mt-3 text-2xl font-semibold">2.4×</p>
          </div>
        </div>
      </div>

      <div class="w-full md:w-1/2 bg-[#fdf3e7] flex items-center justify-center p-6 md:p-10">
        <form class="w-full max-w-[360px] space-y-5" @submit.prevent="handleLogin">
          <div>
            <p class="text-sm uppercase tracking-[0.24em] text-[#6f4227]/80">Welcome back</p>
            <h1 class="mt-4 text-3xl font-semibold text-[#3b1f0e]">Sign in</h1>
            <p class="mt-2 text-sm text-[#3b1f0e]/60">
              Use your email and password to access the BrewSpot dashboard.
            </p>
          </div>

          <div class="space-y-4">
            <label class="block text-sm font-medium text-[#3b1f0e]/80">Email</label>
            <input
              v-model="email"
              type="email"
              placeholder="Enter your email"
              class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-5 py-3 text-sm text-[#3b1f0e] placeholder:text-[#3b1f0e]/40 focus:outline-none focus:ring-2 focus:ring-[#3b1f0e]/25"
              required
            />
          </div>

          <div class="space-y-4">
            <label class="block text-sm font-medium text-[#3b1f0e]/80">Password</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                class="w-full rounded-full border border-[#3b1f0e]/20 bg-[#fffdf9] px-5 py-3 pr-12 text-sm text-[#3b1f0e] placeholder:text-[#3b1f0e]/40 focus:outline-none focus:ring-2 focus:ring-[#3b1f0e]/25"
                required
              />
              <button
                type="button"
                @click="togglePassword"
                class="absolute inset-y-0 right-3 flex items-center justify-center text-[#3b1f0e]/60 hover:text-[#3b1f0e] focus:outline-none"
                aria-label="Toggle password visibility"
              >
                <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5">
                  <path fill="none" d="M0 0h24v24H0z"/>
                  <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 13c-3.04 0-5.5-2.46-5.5-5.5S8.96 6.5 12 6.5s5.5 2.46 5.5 5.5S15.04 17.5 12 17.5zm0-9a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5">
                  <path fill="none" d="M0 0h24v24H0z"/>
                  <path fill="currentColor" d="M12 6.5c-2.76 0-5 2.24-5 5 0 .82.22 1.59.6 2.26L4.1 17.2A11.94 11.94 0 011 12c1.73-4.39 6-7.5 11-7.5 2.65 0 5.13.88 7.16 2.36L16.76 8.6A4.994 4.994 0 0012 6.5zm9.19 3.81c-.85-1.94-2.16-3.63-3.76-4.89L16.5 6.8c1.15.7 2.11 1.68 2.78 2.87.91 1.64 1.34 3.43 1.34 5.33 0 .82-.1 1.64-.28 2.44l1.62 1.62c.75-1.58 1.15-3.28 1.15-5.06 0-1.81-.46-3.55-1.34-5.16zM3.5 5.27L2.27 6.5l3.2 3.2C4.13 11.05 3.2 9.58 3.2 8c0-.26.02-.52.05-.78L3.5 5.27zM1 12c0 1.46.35 2.84.98 4.09l1.65-1.65A7.835 7.835 0 012 12c0-1.01.16-1.99.45-2.91L1 7.01A9.98 9.98 0 001 12zm4.4 4.43l1.45-1.45A4.978 4.978 0 0012 16.5c1.15 0 2.21-.38 3.08-1.03l1.44 1.44A6.975 6.975 0 0112 18.5c-1.91 0-3.67-.69-5.11-1.82zm13.16.09l-1.45-1.45A4.978 4.978 0 0012 16.5c-1.15 0-2.21-.38-3.08-1.03l-1.44 1.44A6.975 6.975 0 0012 18.5c1.91 0 3.67-.69 5.11-1.82z"/>
                </svg>
              </button>
            </div>
          </div>

          <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>

          <div class="grid grid-cols-2 gap-4">
            <button
              type="submit"
              :disabled="loading"
              class="rounded-full bg-[#6f4227] text-[#fdf3e7] py-3 text-sm font-medium hover:bg-[#5c3622] transition disabled:opacity-60"
            >
              {{ loading ? 'Signing in...' : 'Sign in' }}
            </button>
            <button
              type="button"
              @click="goRegister"
              class="rounded-full border border-[#6f4227] bg-transparent py-3 text-sm font-medium text-[#6f4227] hover:bg-[#6f4227]/10 transition"
            >
              Register
            </button>
          </div>

          <p class="text-center text-sm text-[#3b1f0e]/60">
            New café owner? Register your Business
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
