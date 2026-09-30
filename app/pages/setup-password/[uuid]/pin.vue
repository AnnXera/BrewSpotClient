<!--Manager PIN setup page (step 2 of the invitation, after the password)-->
<script setup lang="ts">
import type { Ref } from 'vue'
import { useRoute } from 'vue-router'
import logoFull from '~/assets/images/logo-with-tag.svg'

definePageMeta({
  layout: false,
})

const route = useRoute()
const uuid = route.params.uuid as string

const PIN_LENGTH = 4

const pin = ref('')
const pinConfirmation = ref('')
const showPin = ref(false)
const showConfirmPin = ref(false)

const error = ref('')
const isLoading = ref(false)

const draft = useSetupPasswordDraft()
const authService = useAuthService()

const passwordPage = `/setup-password/${uuid}`

onMounted(() => {
  // The password only lives in memory; after a refresh or a direct visit
  // they have to enter it again.
  if (draft.value?.uuid !== uuid) {
    navigateTo(passwordPage, { replace: true })
  }
})

const requirements = computed(() => ({
  length: pin.value.length === PIN_LENGTH,
  match: pin.value.length > 0 && pin.value === pinConfirmation.value,
}))

function digitsOnly(event: Event, target: Ref<string>) {
  const input = event.target as HTMLInputElement
  target.value = input.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
  input.value = target.value
}

const onPinInput = (event: Event) => digitsOnly(event, pin)
const onPinConfirmationInput = (event: Event) => digitsOnly(event, pinConfirmation)

async function handleSubmit() {
  error.value = ''

  if (!requirements.value.length) {
    error.value = `PIN must be exactly ${PIN_LENGTH} digits.`
    return
  }
  if (!requirements.value.match) {
    error.value = 'PINs do not match.'
    return
  }
  if (!draft.value) {
    navigateTo(passwordPage, { replace: true })
    return
  }

  isLoading.value = true
  try {
    const res = await authService.setupPassword(
      uuid,
      draft.value.password,
      draft.value.passwordConfirmation,
      pin.value,
      pinConfirmation.value,
    )

    if (res.success) {
      draft.value = null
      navigateTo({ path: '/setup-password/success', query: { message: res.message } })
      return
    }

    if (res.already_active) {
      draft.value = null
      navigateTo({ path: '/login', query: { notice: res.message } })
      return
    }

    error.value = res.message || 'Something went wrong. Please try again.'
  } catch (e: any) {
    const data = e?.data
    const errs = data?.errors

    if (data?.already_active) {
      draft.value = null
      navigateTo({ path: '/login', query: { notice: data.message } })
      return
    }

    // A password problem belongs on the password page.
    if (errs?.password) {
      navigateTo({ path: passwordPage, query: { error: [errs.password].flat().join('\n') } })
      return
    }

    if (errs && typeof errs === 'object') {
      error.value = Object.values(errs).flat().join('\n')
    } else {
      error.value = data?.message ?? 'This link is invalid or has already been used.'
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
            Almost there.
          </h2>
          <p class="text-sm text-[#e5d9d4] leading-relaxed">
            Your PIN signs you in on the register and approves voids and refunds at your branch.
          </p>
        </div>

        <div class="grid grid-cols-3 gap-3 pt-4">
          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <Icon name="heroicons:computer-desktop" class="w-6 h-6 mx-auto text-white" />
            <p class="text-xs font-semibold mt-2 text-white">Register Sign-in</p>
          </div>
          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <Icon name="heroicons:receipt-refund" class="w-6 h-6 mx-auto text-white" />
            <p class="text-xs font-semibold mt-2 text-white">Void &amp; Refund Approval</p>
          </div>
          <div class="rounded-lg border border-[#9a776c]/60 bg-[#65463d]/30 p-4 text-center">
            <Icon name="heroicons:lock-closed" class="w-6 h-6 mx-auto text-white" />
            <p class="text-xs font-semibold mt-2 text-white">Known Only to You</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Right Form Section -->
    <section class="flex items-center justify-center bg-[#FFF8EA] px-8 py-12">
      <div class="w-full max-w-sm space-y-6">
        <p class="text-xs font-semibold uppercase tracking-wide text-[#7B5A50]">
          Step 2 of 2
        </p>

        <div>
          <h1 class="text-3xl font-bold text-[#2d201b]">Set your PIN</h1>
          <p class="text-gray-600 text-sm mt-1">Choose a {{ PIN_LENGTH }}-digit PIN. Don't share it with anyone.</p>
        </div>

        <div
          v-if="error"
          class="p-3.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-3 whitespace-pre-line"
        >
          <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
          <span class="font-medium">{{ error }}</span>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- PIN -->
          <div>
            <label class="block text-sm font-medium mb-1.5 text-[#2d201b]">PIN</label>
            <div class="relative flex items-center">
              <input
                :value="pin"
                :type="showPin ? 'text' : 'password'"
                inputmode="numeric"
                autocomplete="off"
                placeholder="Enter a 4-digit PIN"
                class="w-full h-11 rounded-md border pl-3 pr-10 outline-none transition bg-white text-sm tracking-widest border-gray-300 focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20"
                @input="onPinInput"
              />
              <button
                type="button"
                @click="showPin = !showPin"
                class="absolute right-3 text-gray-500 hover:text-[#7B5A50] transition-colors"
              >
                <Icon :name="showPin ? 'heroicons:eye' : 'heroicons:eye-slash'" class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Confirm PIN -->
          <div>
            <label class="block text-sm font-medium mb-1.5 text-[#2d201b]">Confirm PIN</label>
            <div class="relative flex items-center">
              <input
                :value="pinConfirmation"
                :type="showConfirmPin ? 'text' : 'password'"
                inputmode="numeric"
                autocomplete="off"
                placeholder="Re-enter your PIN"
                class="w-full h-11 rounded-md border pl-3 pr-10 outline-none transition bg-white text-sm tracking-widest"
                :class="pinConfirmation && !requirements.match
                  ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/20'"
                @input="onPinConfirmationInput"
              />
              <button
                type="button"
                @click="showConfirmPin = !showConfirmPin"
                class="absolute right-3 text-gray-500 hover:text-[#7B5A50] transition-colors"
              >
                <Icon :name="showConfirmPin ? 'heroicons:eye' : 'heroicons:eye-slash'" class="w-5 h-5" />
              </button>
            </div>
            <p v-if="pinConfirmation && !requirements.match" class="text-red-500 text-xs mt-1">
              PINs do not match.
            </p>
          </div>

          <!-- Requirements checklist -->
          <ul class="text-xs space-y-1 pt-1">
            <li class="flex items-center gap-1.5" :class="requirements.length ? 'text-[#28A745]' : 'text-gray-400'">
              <Icon :name="requirements.length ? 'heroicons:check-circle' : 'heroicons:minus-circle'" class="w-4 h-4" />
              Exactly {{ PIN_LENGTH }} digits
            </li>
            <li class="flex items-center gap-1.5" :class="requirements.match ? 'text-[#28A745]' : 'text-gray-400'">
              <Icon :name="requirements.match ? 'heroicons:check-circle' : 'heroicons:minus-circle'" class="w-4 h-4" />
              Both PINs match
            </li>
          </ul>

          <div class="pt-2 flex gap-3">
            <button
              type="button"
              class="h-11 px-4 rounded-md border border-[#7B5A50] text-[#7B5A50] font-medium hover:bg-[#7B5A50]/5 transition disabled:opacity-50"
              :disabled="isLoading"
              @click="navigateTo(passwordPage)"
            >
              Back
            </button>
            <button
              type="submit"
              class="flex-1 h-11 rounded-md bg-[#7B5A50] text-white font-medium hover:bg-[#65463d] transition disabled:opacity-50 flex items-center justify-center gap-2"
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
