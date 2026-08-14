<!--Verify login code page-->
<script setup lang="ts">
import logoFull from '~/assets/images/logo-with-tag.svg'
import { getRedirectForRole } from '~/utils/roleRedirects'

const route = useRoute()
const email = ref((route.query.email as string) || '')
const error = ref('')
const loading = ref(false)
const cooldown = ref(0)

const authService = useAuthService()
const authStore = useAuthStore()

const digits = ref(['', '', '', '', '', ''])
const inputs = ref<HTMLInputElement[]>([])

const code = computed(() => digits.value.join(''))

function onDigitInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/[^0-9]/g, '').slice(-1)
  digits.value[index] = value

  if (value && index < 5) {
    inputs.value[index + 1]?.focus()
  }
}

function onDigitKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    inputs.value[index - 1]?.focus()
  }
}

async function handleVerify() {
  error.value = ''
  loading.value = true
  try {
    const res = await authService.verifyLoginCode(email.value, code.value)

    if (res.success && res.token && res.user && res.role) {
      const token = useCookie<string | null>('auth_token', {
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      token.value = res.token
      authStore.setSession(res.user, res.role)

      navigateTo(getRedirectForRole(res.role))
    } else {
      error.value = res.message
    }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Verification failed.'
  } finally {
    loading.value = false
  }
}

async function handleResend() {
  if (cooldown.value > 0) return
  try {
    const res = await authService.resendLoginCode(email.value)
    if (!res.success && res.retry_after_seconds) {
      cooldown.value = res.retry_after_seconds
      const interval = setInterval(() => {
        cooldown.value--
        if (cooldown.value <= 0) clearInterval(interval)
      }, 1000)
    }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Could not resend code.'
  }
}

function changeEmail() {
  navigateTo('/login')
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

    <!-- Right Verification Section -->
    <section class="flex items-center justify-center bg-[#F8E9BE] px-8 py-12">
      <div class="w-full max-w-sm">
        <!-- Change Email -->
        <button
          type="button"
          class="flex items-center gap-1 text-sm font-semibold text-[#7B5A50] hover:opacity-80 transition-opacity mb-10"
          @click="changeEmail"
        >
          <Icon name="heroicons:chevron-left" class="w-4 h-4" />
          Change Email
        </button>

        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-[#2d201b]">Check your inbox</h1>
          <p class="text-gray-600 text-sm mt-2 leading-relaxed">
            We sent a 6-digit code to <span class="font-semibold text-[#2d201b]">{{ email }}</span>.
            Enter it below to continue.
          </p>
        </div>

        <!-- Auth Error Banner -->
        <div
          v-if="error"
          class="p-3.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-3 mb-6"
        >
          <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
          <span class="font-medium">{{ error }}</span>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleVerify" class="space-y-6">
          <!-- Digit Inputs -->
          <div class="flex justify-between gap-2">
            <input
              v-for="(digit, index) in digits"
              :key="index"
              ref="inputs"
              v-model="digits[index]"
              type="text"
              inputmode="numeric"
              maxlength="1"
              class="w-full h-14 text-center text-lg font-semibold rounded-lg border border-gray-300 bg-white text-[#2d201b] outline-none focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20 transition"
              @input="onDigitInput(index, $event)"
              @keydown="onDigitKeydown(index, $event)"
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading || code.length < 6"
            class="w-full h-11 rounded-md bg-[#7B5A50] text-white font-semibold hover:bg-[#65463d] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ loading ? "Verifying..." : "Verify and Continue" }}
          </button>

          <!-- Resend -->
          <p class="text-sm text-gray-600 text-center">
            Didn't receive it?
            <button
              type="button"
              :disabled="cooldown > 0"
              class="font-semibold text-[#7B5A50] hover:underline disabled:opacity-50 disabled:no-underline"
              @click="handleResend"
            >
              {{ cooldown > 0 ? `Resend OTP (${cooldown}s)` : 'Resend OTP' }}
            </button>
          </p>
        </form>
      </div>
    </section>
  </div>
</template>