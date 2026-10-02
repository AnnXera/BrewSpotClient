<!--Verify login code page-->
<script setup lang="ts">
import logoFull from '~/assets/images/logo-with-tag.svg'
import { getRedirectForRole } from '~/utils/roleRedirects'

const route = useRoute()
const email = ref((route.query.email as string) || '')
const error = ref('')
const loading = ref(false)
const cooldown = ref(0)

const RESEND_COOLDOWN = 30
const notice = ref('')
const resending = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const authService = useAuthService()
const authStore = useAuthStore()

const digits = ref(['', '', '', '', '', ''])
const inputs = ref<HTMLInputElement[]>([])

const code = computed(() => digits.value.join(''))

onMounted(() => {
  if (!email.value) {
    navigateTo('/login')
    return
  }
  inputs.value[0]?.focus()
  startCooldown(RESEND_COOLDOWN)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

function startCooldown(seconds: number) {
  cooldown.value = seconds
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

const cooldownLabel = computed(() => {
  const m = Math.floor(cooldown.value / 60)
  const sec = String(cooldown.value % 60).padStart(2, '0')
  return `${m}:${sec}`
})

function resetDigits() {
  digits.value = ['', '', '', '', '', '']
  nextTick(() => inputs.value[0]?.focus())
}

function fillFrom(index: number, raw: string) {
  const chars = raw.replace(/\D/g, '').slice(0, 6 - index).split('')
  chars.forEach((c, i) => (digits.value[index + i] = c))
  inputs.value[Math.min(index + chars.length, 5)]?.focus()
  if (code.value.length === 6) handleVerify()
}

function onDigitInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const cleaned = target.value.replace(/\D/g, '')
  if (cleaned.length > 1) {
    // Browser autofill or OTP suggestion delivers the whole code in one field
    fillFrom(index, cleaned)
    return
  }
  digits.value[index] = cleaned
  target.value = cleaned
  if (cleaned && index < 5) inputs.value[index + 1]?.focus()
  if (code.value.length === 6) handleVerify()
}

function onDigitKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    inputs.value[index - 1]?.focus()
  } else if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault()
    inputs.value[index - 1]?.focus()
  } else if (event.key === 'ArrowRight' && index < 5) {
    event.preventDefault()
    inputs.value[index + 1]?.focus()
  }
}

function onDigitPaste(index: number, event: ClipboardEvent) {
  event.preventDefault()
  fillFrom(index, event.clipboardData?.getData('text') ?? '')
}

async function handleVerify() {
  if (loading.value || code.value.length < 6) return
  error.value = ''
  notice.value = ''
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
      error.value = res.message || 'That code did not work. Check it and try again.'
      resetDigits()
    }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Verification failed. Check your connection and try again.'
    resetDigits()
  } finally {
    loading.value = false
    if (error.value) nextTick(() => inputs.value[0]?.focus())
  }
}

async function handleResend() {
  if (cooldown.value > 0 || resending.value) return
  error.value = ''
  notice.value = ''
  resending.value = true
  try {
    const res = await authService.resendLoginCode(email.value)
    if (res.success) {
      notice.value = `A new code was sent to ${email.value}.`
      startCooldown(RESEND_COOLDOWN)
      resetDigits()
    } else if (res.retry_after_seconds) {
      startCooldown(res.retry_after_seconds)
    } else {
      error.value = res.message || 'Could not resend code.'
    }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Could not resend code.'
  } finally {
    resending.value = false
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
    <section class="flex items-center justify-center bg-[#FFF8EA] px-8 py-12">
      <div class="w-full max-w-sm">
        <!-- Change Email -->
        <button
          type="button"
          class="flex items-center gap-1 text-sm font-semibold text-[#7B5A50] hover:opacity-80 transition-opacity mb-8"
          @click="changeEmail"
        >
          <Icon name="heroicons:chevron-left" class="w-4 h-4" />
          Change Email
        </button>

        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-[#2d201b]">Check your inbox</h1>
          <p class="text-gray-600 text-sm mt-1.5 leading-relaxed">
            We sent a 6-digit code to <span class="font-semibold text-[#2d201b]">{{ email }}</span>.
            Enter it below to continue.
          </p>
        </div>

        <!-- Auth Error Banner -->
        <div
          v-if="error"
          role="alert"
          class="p-3.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-3 mb-6"
        >
          <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
          <span class="font-medium">{{ error }}</span>
        </div>

        <!-- Resend confirmation -->
        <p
          v-if="notice && !error"
          role="status"
          class="mb-6 flex items-center gap-2 text-sm font-medium text-[#1F8A4C]"
        >
          <Icon name="heroicons:check-circle" class="w-5 h-5 shrink-0" />
          {{ notice }}
        </p>

        <!-- Form -->
        <form @submit.prevent="handleVerify" class="space-y-6">
          <!-- Digit Inputs -->
          <div class="flex justify-between gap-2" role="group" aria-label="6-digit verification code">
            <input
              v-for="(digit, index) in digits"
              :key="index"
              ref="inputs"
              :value="digit"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              :autocomplete="index === 0 ? 'one-time-code' : 'off'"
              :aria-label="`Digit ${index + 1} of 6`"
              :disabled="loading"
              :class="digit ? 'border-[#7B5A50]' : 'border-gray-300'"
              class="min-w-0 w-full h-14 text-center text-xl font-semibold tabular-nums rounded-md border bg-white text-[#2d201b] outline-none focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20 transition"
              @input="onDigitInput(index, $event)"
              @keydown="onDigitKeydown(index, $event)"
              @paste="onDigitPaste(index, $event)"
              @focus="($event.target as HTMLInputElement).select()"
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading || code.length < 6"
            class="w-full h-11 rounded-md bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ loading ? "Verifying..." : "Verify and Continue" }}
          </button>

          <!-- Resend -->
          <p class="text-sm text-gray-600 text-center">
            Didn't receive it?
            <button
              type="button"
              :disabled="cooldown > 0 || resending"
              class="font-semibold tabular-nums text-[#7B5A50] hover:underline disabled:opacity-50 disabled:no-underline"
              @click="handleResend"
            >
              {{ cooldown > 0 ? `Resend code in ${cooldownLabel}` : resending ? 'Sending...' : 'Resend code' }}
            </button>
          </p>
        </form>
      </div>
    </section>
  </div>
</template>