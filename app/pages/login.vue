<script setup lang="ts">
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const authStore = useAuthStore()

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const res = await authStore.login(email.value, password.value)
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
  <div class="min-h-screen flex items-center justify-center bg-[#fffdf9]">
    <form
      class="bg-[#fdf3e7] p-8 rounded-lg shadow w-full max-w-sm space-y-4"
      @submit.prevent="handleLogin"
    >
      <h1 class="text-xl font-semibold text-[#3b1f0e]">BrewSpot Login</h1>

      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="w-full border rounded px-3 py-2"
        required
      />
      <input
        v-model="password"
        type="password"
        placeholder="Password"
        class="w-full border rounded px-3 py-2"
        required
      />

      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-[#3b1f0e] text-white py-2 rounded"
      >
        {{ loading ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>