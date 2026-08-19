<!--Login page-->
<script setup lang="ts">
import logoFull from '~/assets/images/logo-with-tag.svg'

const form = reactive({
  email: '',
  password: '',
})

const errors = reactive({
  auth: '',
  email: '',
  password: '',
})

const showPassword = ref(false)
const isLoading = ref(false)

const authService = useAuthService()

function clearErrors() {
  errors.auth = ''
  errors.email = ''
  errors.password = ''
}

async function handleLogin() {
  clearErrors()
  isLoading.value = true

  try {
    const res = await authService.login(form.email, form.password)

    if (res.success && res.requires_2fa) {
      navigateTo({ path: '/verify-login-code', query: { email: form.email } })
    } else {
      errors.auth = res.message
    }
  } catch (e: any) {
    errors.auth = e?.data?.message ?? 'Login failed.'
  } finally {
    isLoading.value = false
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
  <div class="min-h-screen grid lg:grid-cols-2">
    <!-- Left Hero Section -->
    <section class="hidden lg:flex flex-col justify-center bg-[#7B5A50] font-display text-white px-16 py-12">
      <div class="max-w-lg mx-auto text-center space-y-12">
        <!-- Brand Header -->
        <div>
          <img :src="logoFull" alt="BrewSpot" class="h-16 mx-auto" />
        </div>

        <!-- Tagline -->
        <div class="space-y-3">
          <h2 class="text-3xl font-bold leading-tight">
            Every great cup starts with great management.
          </h2>
          <p class="text-sm text-[#e5d9d4] leading-relaxed">
            Streamline your daily orders, table reservations, and cafe sales with ease.
          </p>
        </div>

        <!-- System Features Highlight -->
        <div class="grid grid-cols-3 gap-3 pt-4">
          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <Icon name="heroicons:shopping-bag" class="w-6 h-6 mx-auto text-white" />
            <p class="text-xs font-semibold mt-2 text-white">POS & Inventory</p>
          </div>

          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <Icon name="heroicons:calendar-days" class="w-6 h-6 mx-auto text-white" />
            <p class="text-xs font-semibold mt-2 text-white">Reservations</p>
          </div>

          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <Icon name="heroicons:chart-bar" class="w-6 h-6 mx-auto text-white" />
            <p class="text-xs font-semibold mt-2 text-white">Sales Analytics</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Right Login Form Section -->
    <section class="flex items-center justify-center bg-[#FFF8EA] px-8 py-12">
      <div class="w-full max-w-sm space-y-6">
        <!-- Form Header -->
        <div>
          <h1 class="text-3xl font-bold text-[#2d201b]">Welcome back</h1>
          <p class="text-gray-600 text-sm mt-1">Sign in to your account</p>
        </div>

        <!-- Auth Error Banner -->
        <div
          v-if="errors.auth"
          class="p-3.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-3"
        >
          <svg class="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-medium">{{ errors.auth }}</span>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Email Input -->
          <div>
            <label class="block text-sm font-medium mb-1.5 text-[#2d201b]">Email Address</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="Enter your email"
              class="w-full h-11 rounded-md border px-3 outline-none transition bg-white text-sm"
              :class="errors.email ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20'"
            />
            <p v-if="errors.email" class="text-red-500 text-xs mt-1">{{ errors.email }}</p>
          </div>

          <!-- Password Input -->
          <div>
            <label class="block text-sm font-medium mb-1.5 text-[#2d201b]">Password</label>
            <div class="relative flex items-center">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                class="w-full h-11 rounded-md border pl-3 pr-10 outline-none transition bg-white text-sm"
                :class="errors.password ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20'"
              />

              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 text-gray-500 hover:text-[#7B5A50] focus:outline-none transition-colors"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
              >
                <Icon
                  :name="showPassword ? 'heroicons:eye' : 'heroicons:eye-slash'"
                  class="w-5 h-5"
                />
              </button>
            </div>
            <p v-if="errors.password" class="text-red-500 text-xs mt-1">{{ errors.password }}</p>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button
              type="submit"
              class="w-full h-11 rounded-md bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition disabled:opacity-50 flex items-center justify-center gap-2"
              :disabled="isLoading"
            >
              <span v-if="isLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ isLoading ? "Signing In..." : "Sign In" }}
            </button>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>