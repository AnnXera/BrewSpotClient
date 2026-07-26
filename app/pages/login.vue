<template>
  <div class="min-h-screen grid lg:grid-cols-2">
    <!-- Left Hero Section -->
    <section class="hidden lg:flex flex-col justify-center bg-[#7B5A50] text-white px-16 py-12">
      <div class="max-w-lg mx-auto text-center space-y-12">
        <!-- Brand Header -->
        <div>
          <h1 class="text-5xl font-extrabold tracking-wider">BREWSPOT</h1>
          <p class="mt-2 text-sm text-[#d9c9c4] tracking-wide">
            Café Management System • Davao City
          </p>
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
            <span class="text-2xl">☕</span>
            <p class="text-xs font-semibold mt-2 text-white">POS & Inventory</p>
          </div>

          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <span class="text-2xl">📅</span>
            <p class="text-xs font-semibold mt-2 text-white">Reservations</p>
          </div>

          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <span class="text-2xl">📊</span>
            <p class="text-xs font-semibold mt-2 text-white">Sales Analytics</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Right Login Form Section -->
    <section class="flex items-center justify-center bg-[#F8E9BE] px-8 py-12">
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
                <!-- Eye Open -->
                <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                <!-- Eye Slashed -->
                <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
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

          <!-- Register Link -->
          <p class="text-sm text-gray-600 text-center pt-2">
            New café owner?
            <NuxtLink to="/register" class="font-semibold text-[#7B5A50] hover:underline">
              Register your Business
            </NuxtLink>
          </p>
        </form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

useSeoMeta({
  title: "Login | BrewSpot",
  description: "BrewSpot Cafe Management System",
})

// Form Input State
const form = reactive({
  email: "",
  password: "",
})

// Form Errors State
const errors = reactive({
  email: "",
  password: "",
  auth: "",
})

// UI States
const showPassword = ref(false)
const isLoading = ref(false)

// Reset Validation Errors
const clearErrors = () => {
  errors.email = ""
  errors.password = ""
  errors.auth = ""
}

// Client-Side Validation Handler
const validateForm = (): boolean => {
  clearErrors()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  let isValid = true

  if (!form.email) {
    errors.email = "Email is required."
    isValid = false
  } else if (!emailRegex.test(form.email)) {
    errors.email = "Please enter a valid email address."
    isValid = false
  }

  if (!form.password) {
    errors.password = "Password is required."
    isValid = false
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters."
    isValid = false
  }

  return isValid
}

// Submit Handler
const handleLogin = async () => {
  if (!validateForm()) return

  isLoading.value = true

  try {
    // Simulate API request delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Demo credentials check (password must be "password123")
    if (form.password !== "password123") {
      errors.auth = "Wrong Credentials"
      return
    }

    // Redirect to Owner Dashboard on success
    await navigateTo("/owner/dashboard")
  } finally {
    isLoading.value = false
  }
}
</script>