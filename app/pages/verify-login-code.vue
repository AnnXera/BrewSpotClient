<script setup lang="ts">
const route = useRoute()
const email = ref((route.query.email as string) || '')
const error = ref('')
const loading = ref(false)
const cooldown = ref(0)

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
    const res = await authStore.verifyLoginCode(email.value, code.value)
    if (res.success) {
      navigateTo(res.redirect || '/')
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
    const res = await authStore.resendLoginCode(email.value)
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
  <div class="min-h-screen w-full flex items-center justify-center bg-[#3b1f0e] p-4 md:p-8">
    <div class="relative w-full max-w-6xl h-[640px] rounded-3xl overflow-hidden shadow-2xl flex">

      <div
        class="hidden md:flex relative w-1/2 flex-col justify-between p-8 bg-cover bg-center"
        style="background-image: linear-gradient(180deg, rgba(59,31,14,0.15) 0%, rgba(59,31,14,0.55) 100%), url('https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80');"
      >
        <span class="text-[#fdf3e7] text-xl font-semibold tracking-wide drop-shadow">
          BrewSpot
        </span>

        <div class="text-[#fdf3e7] drop-shadow">
          <h2 class="text-3xl font-semibold italic mb-2">Almost<br />There</h2>
          <p class="text-sm text-[#fdf3e7]/80 max-w-xs">
            Just one more step to secure your account and continue.
          </p>
        </div>
      </div>

      <div class="w-full md:w-1/2 bg-[#fdf3e7] flex items-center justify-center p-8 md:p-12">
        <form class="w-full max-w-sm space-y-6" @submit.prevent="handleVerify">
          <div>
            <h1 class="text-3xl font-semibold text-[#3b1f0e]">
              <span class="italic font-normal text-4xl">V</span>erify it's you
            </h1>
            <p class="text-sm text-[#3b1f0e]/60 mt-2">
              Complete the verification to secure your account. Enter the code sent to
              <span class="font-medium">{{ email }}</span>.
            </p>
          </div>

          <div class="flex justify-between gap-2">
            <input
              v-for="(digit, index) in digits"
              :key="index"
              ref="inputs"
              v-model="digits[index]"
              type="text"
              inputmode="numeric"
              maxlength="1"
              class="w-12 h-14 text-center text-lg rounded-xl border border-[#3b1f0e]/15 bg-[#fffdf9] text-[#3b1f0e] focus:outline-none focus:ring-2 focus:ring-[#3b1f0e]/30"
              @input="onDigitInput(index, $event)"
              @keydown="onDigitKeydown(index, $event)"
            />
          </div>

          <button
            type="button"
            :disabled="cooldown > 0"
            class="block mx-auto text-xs text-[#3b1f0e]/60 hover:text-[#3b1f0e] disabled:opacity-50"
            @click="handleResend"
          >
            {{ cooldown > 0 ? `Resend code in ${cooldown}s` : 'active period — tap to resend code' }}
          </button>

          <p v-if="error" class="text-red-600 text-sm text-center">{{ error }}</p>

          <button
            type="submit"
            :disabled="loading || code.length < 6"
            class="w-full rounded-full bg-[#3b1f0e] text-[#fdf3e7] py-3 text-sm font-medium hover:bg-[#2c1609] transition disabled:opacity-60"
          >
            {{ loading ? 'Verifying...' : 'Log In' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>