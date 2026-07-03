<script setup lang="ts">
const route = useRoute()
const email = ref((route.query.email as string) || '')
const code = ref('')
const error = ref('')
const loading = ref(false)
const cooldown = ref(0)

const authStore = useAuthStore()

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
  <div class="min-h-screen flex items-center justify-center bg-[#fffdf9]">
    <form
      class="bg-[#fdf3e7] p-8 rounded-lg shadow w-full max-w-sm space-y-4"
      @submit.prevent="handleVerify"
    >
      <h1 class="text-xl font-semibold text-[#3b1f0e]">Enter Verification Code</h1>
      <p class="text-sm text-gray-600">Code sent to {{ email }}</p>

      <input
        v-model="code"
        type="text"
        maxlength="6"
        placeholder="6-digit code"
        class="w-full border rounded px-3 py-2 tracking-widest text-center"
        required
      />

      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-[#3b1f0e] text-white py-2 rounded"
      >
        {{ loading ? 'Verifying...' : 'Verify' }}
      </button>

      <button
        type="button"
        :disabled="cooldown > 0"
        class="w-full text-sm text-[#3b1f0e] underline"
        @click="handleResend"
      >
        {{ cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code' }}
      </button>
    </form>
  </div>
</template>