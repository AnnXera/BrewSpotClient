<!--Login page-->
<script setup lang="ts">
import { useRoute } from 'vue-router'
import logoFull from '~/assets/images/logo-with-tag.svg'
import { getSafeRedirect } from '~/utils/roleRedirects'

const route = useRoute()
const notice = ref((route.query.notice as string) || '')

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
  notice.value = ''
  isLoading.value = true

  try {
    const res = await authService.login(form.email, form.password)

    if (res.success && res.requires_2fa) {
      const redirect = getSafeRedirect(route.query.redirect)
      navigateTo({ path: '/verify-login-code', query: { email: form.email, ...(redirect ? { redirect } : {}) } })
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

// Forgot Password Modal State
const isForgotModalOpen = ref(false)
const forgotEmail = ref('')
const isSendingForgot = ref(false)
const forgotSuccess = ref('')
const forgotError = ref('')

function openForgotPasswordModal() {
  forgotEmail.value = form.email.trim()
  forgotSuccess.value = ''
  forgotError.value = ''
  isForgotModalOpen.value = true
}

function closeForgotPasswordModal() {
  isForgotModalOpen.value = false
  forgotSuccess.value = ''
  forgotError.value = ''
}

async function handleForgotPassword() {
  forgotError.value = ''
  forgotSuccess.value = ''

  if (!forgotEmail.value.trim()) {
    forgotError.value = 'Please enter your email address.'
    return
  }

  isSendingForgot.value = true
  try {
    const res = await authService.forgotPassword(forgotEmail.value.trim())
    if (res.success) {
      forgotSuccess.value = res.message || 'A temporary password has been sent to your email.'
      form.email = forgotEmail.value.trim()
    } else {
      forgotError.value = res.message || 'Could not send reset password email.'
    }
  } catch (e: any) {
    forgotError.value = e?.data?.message ?? 'Failed to send reset password email. Please verify the email and try again.'
  } finally {
    isSendingForgot.value = false
  }
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
        <!-- Back to Landing Page -->
        <NuxtLink
          to="/"
          class="flex items-center gap-1 text-sm font-semibold text-[#7B5A50] hover:opacity-80 transition-opacity"
        >
          <Icon name="heroicons:chevron-left" class="w-4 h-4" />
          Back to Home
        </NuxtLink>

        <!-- Form Header -->
        <div>
          <h1 class="text-3xl font-bold text-[#2d201b]">Welcome back</h1>
          <p class="text-gray-600 text-sm mt-1">Sign in to your account</p>
        </div>

        <!-- Info Notice Banner (e.g. "password already set up") -->
        <div
          v-if="notice"
          class="p-3.5 rounded-lg bg-[#E3F3E7] border border-[#28A745]/30 text-[#1F8A4C] text-sm flex items-center gap-3"
        >
          <Icon name="heroicons:information-circle" class="w-5 h-5 shrink-0" />
          <span class="font-medium">{{ notice }}</span>
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
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-sm font-medium text-[#2d201b]">Password</label>
              <button
                type="button"
                @click="openForgotPasswordModal"
                class="text-xs font-semibold text-[#7B5A50] hover:text-[#5C453C] hover:underline cursor-pointer transition-colors"
              >
                Forgot password?
              </button>
            </div>
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

          <!-- Register link -->
          <p class="text-sm text-gray-600 text-center pt-2">
            Don't have an account?
            <button
              type="button"
              class="font-semibold text-[#7B5A50] hover:underline ml-1"
              @click="goRegister"
            >
              Register Business
            </button>
          </p>
        </form>
      </div>
    </section>

    <!-- Forgot Password Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isForgotModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="closeForgotPasswordModal"
          @keydown.escape.window="closeForgotPasswordModal"
        >
          <div
            class="w-full max-w-md bg-[#FFF8EA] rounded-2xl shadow-2xl border border-[#7B5A50]/20 overflow-hidden p-6 sm:p-7 relative transition-transform duration-200"
          >
            <!-- Close button -->
            <button
              type="button"
              @click="closeForgotPasswordModal"
              class="absolute top-4 right-4 p-1.5 rounded-full text-[#7B5A50] hover:bg-[#7B5A50]/10 transition-colors"
              aria-label="Close"
            >
              <Icon name="heroicons:x-mark" class="w-5 h-5" />
            </button>

            <!-- State 1: Form to enter email -->
            <div v-if="!forgotSuccess">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-11 h-11 rounded-xl bg-[#7B5A50]/10 flex items-center justify-center text-[#7B5A50]">
                  <Icon name="heroicons:key" class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="text-xl font-bold text-[#2d201b]">Reset Password</h3>
                  <p class="text-xs text-gray-600">Temporary password delivery via Gmail / Email</p>
                </div>
              </div>

              <p class="text-sm text-gray-600 leading-relaxed mb-5">
                Enter your registered email address below. We'll generate a new temporary password and deliver it straight to your Gmail inbox so you can access your account immediately.
              </p>

              <!-- Error Alert -->
              <div
                v-if="forgotError"
                class="p-3 mb-4 rounded-lg bg-red-100 border border-red-300 text-red-700 text-xs sm:text-sm flex items-center gap-2.5"
              >
                <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
                <span>{{ forgotError }}</span>
              </div>

              <form @submit.prevent="handleForgotPassword" class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-[#2d201b] uppercase tracking-wider mb-1.5">
                    Registered Email
                  </label>
                  <div class="relative flex items-center">
                    <input
                      v-model="forgotEmail"
                      type="email"
                      required
                      placeholder="name@example.com"
                      class="w-full h-11 rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-[#2d201b] outline-none transition focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                    />
                  </div>
                </div>

                <div class="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    @click="closeForgotPasswordModal"
                    class="px-4 h-10 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200/60 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="isSendingForgot"
                    class="px-5 h-10 rounded-lg bg-[#7B5A50] text-white text-sm font-semibold hover:bg-[#65463d] transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <span v-if="isSendingForgot" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>{{ isSendingForgot ? 'Sending to Gmail...' : 'Send Password' }}</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- State 2: Success sent confirmation -->
            <div v-else class="text-center py-2 space-y-4">
              <div class="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 mx-auto flex items-center justify-center">
                <Icon name="heroicons:check-circle" class="w-8 h-8" />
              </div>

              <div>
                <h3 class="text-xl font-bold text-[#2d201b]">Password Sent!</h3>
                <p class="text-sm text-gray-600 mt-1.5 leading-relaxed">
                  A temporary password has been sent to <br />
                  <span class="font-semibold text-[#2d201b] bg-white px-2 py-0.5 rounded border border-gray-200 text-xs mt-1 inline-block">{{ forgotEmail }}</span>
                </p>
              </div>

              <div class="p-3.5 rounded-xl bg-white/80 border border-[#7B5A50]/15 text-xs text-gray-600 text-left space-y-1.5">
                <div class="flex items-center gap-1.5 font-semibold text-[#7B5A50]">
                  <Icon name="heroicons:envelope" class="w-4 h-4" />
                  <span>Next Steps:</span>
                </div>
                <ol class="list-decimal list-inside space-y-1 text-gray-600 pl-1">
                  <li>Check your Gmail / inbox (and Spam folder).</li>
                  <li>Copy the temporary password provided in the email.</li>
                  <li>Sign in below with your email and the temporary password.</li>
                </ol>
              </div>

              <button
                type="button"
                @click="closeForgotPasswordModal"
                class="w-full h-11 rounded-lg bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition shadow-sm text-sm"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>