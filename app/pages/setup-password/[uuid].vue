<script setup lang="ts">
import { useRoute } from 'vue-router'
import logoFull from '~/assets/images/logo-with-tag.svg'

definePageMeta({
  layout: false,
})

const route = useRoute()
const uuid = route.params.uuid as string

const password = ref('')
const passwordConfirmation = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const isChecking = ref(true)
const isInvalid = ref(false)
const invalidMessage = ref('')

const error = ref('')
const isLoading = ref(false)

const authService = useAuthService()

onMounted(async () => {
  try {
    const res = await authService.checkSetupStatus(uuid)

    if (res.already_active) {
      navigateTo({ path: '/login', query: { notice: res.message || 'Your password has already been set up. Please sign in instead.' } })
      return
    }

    if (!res.success) {
      isInvalid.value = true
      invalidMessage.value = res.message || 'This link is invalid or has expired.'
      return
    }
  } catch (e: any) {
    const data = e?.data
    if (data?.already_active) {
      navigateTo({ path: '/login', query: { notice: data.message || 'Your password has already been set up. Please sign in instead.' } })
      return
    }
    isInvalid.value = true
    invalidMessage.value = data?.message || 'This link is invalid or has expired.'
  } finally {
    isChecking.value = false
  }
})

const requirements = computed(() => ({
  length: password.value.length >= 8,
  upper: /[A-Z]/.test(password.value),
  lower: /[a-z]/.test(password.value),
  number: /[0-9]/.test(password.value),
  symbol: /[^A-Za-z0-9]/.test(password.value),
}))

const requirementsMet = computed(() => Object.values(requirements.value).every(Boolean))
const passwordsMatch = computed(() =>
  password.value.length > 0 && password.value === passwordConfirmation.value
)

async function handleSubmit() {
  error.value = ''

  if (!requirementsMet.value) {
    error.value = 'Please meet all password requirements below.'
    return
  }
  if (!passwordsMatch.value) {
    error.value = 'Passwords do not match.'
    return
  }

  isLoading.value = true
  try {
    const res = await authService.setupPassword(uuid, password.value, passwordConfirmation.value)

    if (res.success) {
      navigateTo({ path: '/setup-password/success', query: { message: res.message } })
      return
    }

    if (res.already_active) {
      navigateTo({ path: '/login', query: { notice: res.message } })
      return
    }

    error.value = res.message || 'Something went wrong. Please try again.'
  } catch (e: any) {
    const errs = e?.data?.errors
    if (errs && typeof errs === 'object') {
      error.value = Object.values(errs).flat().join('\n')
    } else {
      error.value = e?.data?.message ?? 'This link is invalid or has already been used.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2">
    <!-- Left Hero Section -->
    <section class="hidden lg:flex flex-col justify-center bg-[#7B5A50] font-display text-white px-16 py-12">
      <div class="max-w-lg mx-auto text-center space-y-12">
        <div>
          <img :src="logoFull" alt="BrewSpot" class="h-16 mx-auto" />
        </div>

        <div class="space-y-3">
          <h2 class="text-3xl font-bold leading-tight">
            One last step before you get started.
          </h2>
          <p class="text-sm text-[#e5d9d4] leading-relaxed">
            Set a secure password to activate your account and access your dashboard.
          </p>
        </div>

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

    <!-- Right Form Section -->
    <section class="flex items-center justify-center bg-[#FFF8EA] px-8 py-12">
      <!-- Loading State -->
      <div v-if="isChecking" class="w-full max-w-sm text-center py-12 space-y-4">
        <div class="w-10 h-10 border-4 border-[#7B5A50] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-sm text-[#7B5A50] font-medium">Verifying invitation link...</p>
      </div>

      <!-- Invalid Link State -->
      <div v-else-if="isInvalid" class="w-full max-w-sm space-y-6 text-center">
        <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600">
          <Icon name="heroicons:exclamation-triangle" class="w-8 h-8" />
        </div>
        <div class="space-y-2">
          <h1 class="text-2xl font-bold text-[#2d201b]">Invalid or Expired Link</h1>
          <p class="text-sm text-gray-600 leading-relaxed">{{ invalidMessage }}</p>
        </div>
        <div class="pt-2">
          <button
            type="button"
            @click="navigateTo('/login')"
            class="w-full h-11 rounded-md bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition flex items-center justify-center gap-2"
          >
            Go to Sign In
          </button>
        </div>
      </div>

      <!-- Normal Setup Form -->
      <div v-else class="w-full max-w-sm space-y-6">
        <div>
          <h1 class="text-3xl font-bold text-[#2d201b]">Set your password</h1>
          <p class="text-gray-600 text-sm mt-1">Create a password to activate your account.</p>
        </div>

        <div
          v-if="error"
          class="p-3.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-3 whitespace-pre-line"
        >
          <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
          <span class="font-medium">{{ error }}</span>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Password -->
          <div>
            <label class="block text-sm font-medium mb-1.5 text-[#2d201b]">Password</label>
            <div class="relative flex items-center">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter a new password"
                class="w-full h-11 rounded-md border pl-3 pr-10 outline-none transition bg-white text-sm border-gray-300 focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 text-gray-500 hover:text-[#7B5A50] transition-colors"
              >
                <Icon :name="showPassword ? 'heroicons:eye' : 'heroicons:eye-slash'" class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-sm font-medium mb-1.5 text-[#2d201b]">Confirm Password</label>
            <div class="relative flex items-center">
              <input
                v-model="passwordConfirmation"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Re-enter your password"
                class="w-full h-11 rounded-md border pl-3 pr-10 outline-none transition bg-white text-sm"
                :class="passwordConfirmation && !passwordsMatch
                  ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20'"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 text-gray-500 hover:text-[#7B5A50] transition-colors"
              >
                <Icon :name="showConfirmPassword ? 'heroicons:eye' : 'heroicons:eye-slash'" class="w-5 h-5" />
              </button>
            </div>
            <p v-if="passwordConfirmation && !passwordsMatch" class="text-red-500 text-xs mt-1">
              Passwords do not match.
            </p>
          </div>

          <!-- Requirements checklist -->
          <ul class="text-xs space-y-1 pt-1">
            <li class="flex items-center gap-1.5" :class="requirements.length ? 'text-[#28A745]' : 'text-gray-400'">
              <Icon :name="requirements.length ? 'heroicons:check-circle' : 'heroicons:minus-circle'" class="w-4 h-4" />
              At least 8 characters
            </li>
            <li class="flex items-center gap-1.5" :class="requirements.upper && requirements.lower ? 'text-[#28A745]' : 'text-gray-400'">
              <Icon :name="requirements.upper && requirements.lower ? 'heroicons:check-circle' : 'heroicons:minus-circle'" class="w-4 h-4" />
              Upper &amp; lowercase letters
            </li>
            <li class="flex items-center gap-1.5" :class="requirements.number ? 'text-[#28A745]' : 'text-gray-400'">
              <Icon :name="requirements.number ? 'heroicons:check-circle' : 'heroicons:minus-circle'" class="w-4 h-4" />
              At least one number
            </li>
            <li class="flex items-center gap-1.5" :class="requirements.symbol ? 'text-[#28A745]' : 'text-gray-400'">
              <Icon :name="requirements.symbol ? 'heroicons:check-circle' : 'heroicons:minus-circle'" class="w-4 h-4" />
              At least one symbol
            </li>
          </ul>

          <div class="pt-2">
            <button
              type="submit"
              class="w-full h-11 rounded-md bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition disabled:opacity-50 flex items-center justify-center gap-2"
              :disabled="isLoading"
            >
              <span v-if="isLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ isLoading ? "Activating..." : "Activate Account" }}
            </button>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>