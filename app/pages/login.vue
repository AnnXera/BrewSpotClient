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

