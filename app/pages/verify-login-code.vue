<!--Verify login code page-->
<script setup lang="ts">
import { getRedirectForRole } from '~/utils/roleRedirects'

const route = useRoute()
const email = ref((route.query.email as string) || '')
const error = ref('')
const loading = ref(false)
const cooldown = ref(0)

onMounted(() => {
  if (!email.value) {
    navigateTo('/login')
  }
})

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
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-[#f2e9de] overflow-hidden" style="font-family: 'Poppins', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <div class="w-full max-w-[940px] h-[620px] rounded-[36px] overflow-hidden shadow-2xl flex flex-col md:flex-row">
      <div class="relative w-full md:w-7/12 bg-[#6f4227] p-6 md:p-8 text-[#f5eddc] flex flex-col justify-between min-h-full">
        <div>
          <span class="text-2xl font-semibold tracking-[0.24em] uppercase">BrewSpot</span>
          <div class="mt-10">
            <h2 class="text-3xl md:text-3xl font-semibold leading-tight">
              Every great cup starts<br />with great management.
            </h2>
            <p class="mt-3 max-w-[16rem] text-sm text-[#f5eddc]/80">
              BrewSpot · Café Management System · Davao City
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <div class="rounded-3xl border border-[#f5eddc]/15 bg-[#7b4d36]/70 p-3 text-center">
            <p class="text-[0.65rem] uppercase tracking-[0.18em] text-[#f5eddc]/80">Today’s Sales</p>
            <p class="mt-2 text-xl font-semibold">₱9,240</p>
          </div>
          <div class="rounded-3xl border border-[#f5eddc]/15 bg-[#7b4d36]/70 p-3 text-center">
            <p class="text-[0.65rem] uppercase tracking-[0.18em] text-[#f5eddc]/80">Reservation</p>
            <p class="mt-2 text-xl font-semibold">14</p>
          </div>
          <div class="rounded-3xl border border-[#f5eddc]/15 bg-[#7b4d36]/70 p-3 text-center">
            <p class="text-[0.65rem] uppercase tracking-[0.18em] text-[#f5eddc]/80">Table Turnover</p>
            <p class="mt-2 text-xl font-semibold">2.4×</p>
          </div>
        </div>
      </div>

      <div class="w-full md:w-5/12 bg-[#fdf3e7] flex items-center justify-center p-6 md:p-8">
        <form class="w-full max-w-[300px] space-y-5" @submit.prevent="handleVerify">
          <div class="space-y-4">
            <button
              type="button"
              class="text-xs text-[#6f4227]/70 hover:text-[#6f4227] focus:outline-none"
              @click="navigateTo('/login')"
            >
              &lsaquo; Change Email
            </button>
            <div>
              <p class="text-sm uppercase tracking-[0.24em] text-[#6f4227]/80">Welcome back</p>
              <h1 class="mt-2 text-2xl font-semibold text-[#3b1f0e]">Check your inbox</h1>
              <p class="mt-2 text-sm text-[#3b1f0e]/60">
                We sent a 6-digit code to <span class="font-medium">{{ email }}</span>. Enter it below to continue.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-6 gap-2">
            <input
              v-for="(digit, index) in digits"
              :key="index"
              ref="inputs"
              v-model="digits[index]"
              type="text"
              inputmode="numeric"
              maxlength="1"
              class="w-full h-14 text-center text-lg rounded-xl border border-[#3b1f0e]/15 bg-[#fffdf9] text-[#3b1f0e] focus:outline-none focus:ring-2 focus:ring-[#3b1f0e]/30"
              @input="onDigitInput(index, $event)"
              @keydown="onDigitKeydown(index, $event)"
            />
          </div>

          <button
            type="submit"
            :disabled="loading || code.length < 6"
            class="w-full rounded-full bg-[#6f4227] text-[#fdf3e7] py-3 text-sm font-medium hover:bg-[#5c3622] transition disabled:opacity-60"
          >
            {{ loading ? 'Verifying...' : 'Verify and Continue' }}
          </button>

          <p class="text-center text-sm text-[#3b1f0e]/60">
            Didn't receive it? <button type="button" class="font-semibold text-[#6f4227] hover:text-[#59311f]" @click="handleResend">Resend OTP</button>
          </p>

          <p v-if="error" class="text-red-600 text-sm text-center">{{ error }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

