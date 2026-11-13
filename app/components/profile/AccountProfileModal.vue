<!-- app/components/profile/AccountProfileModal.vue -->
<script setup lang="ts">
import { useUserProfileService, type WorkplaceInfo } from '~/composables/useUserProfileService'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const authStore = useAuthStore()
const profileService = useUserProfileService()

const activeTab = ref<'details' | 'password'>('details')
const fileInput = ref<HTMLInputElement | null>(null)

// Loading States
const isLoading = ref(false)
const isSavingDetails = ref(false)
const isUploadingPhoto = ref(false)
const isChangingPassword = ref(false)

// Messages
const detailsError = ref('')
const passwordError = ref('')

// Toast Notification State (Floor plan saved Emil Kowalski style)
const toastShow = ref(false)
const toastTitle = ref('Profile updated')
const toastDescription = ref('Account details successfully saved')
let toastTimer: ReturnType<typeof setTimeout> | undefined

function triggerToast(title: string, desc: string) {
  toastTitle.value = title
  toastDescription.value = desc
  toastShow.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastShow.value = false
  }, 3000)
}

// Forms
const detailsForm = reactive({
  firstname: '',
  middlename: '',
  lastname: '',
  username: '',
  email: '',
  phone_number: '',
  address: '',
  role_name: '',
  photo_url: null as string | null,
})

const workplace = ref<WorkplaceInfo | null>(null)

const passwordForm = reactive({
  current_password: '',
  password: '',
  password_confirmation: '',
})

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// Initials fallback
const initials = computed(() => {
  const first = detailsForm.firstname?.trim()?.[0] ?? ''
  const last = detailsForm.lastname?.trim()?.[0] ?? ''
  return (first + last).toUpperCase() || authStore.user?.firstname?.[0]?.toUpperCase() || 'U'
})

// Load profile data whenever modal opens
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      activeTab.value = 'details'
      detailsError.value = ''
      passwordError.value = ''
      resetPasswordForm()
      await fetchProfile()
    }
  },
  { immediate: true }
)

async function fetchProfile() {
  isLoading.value = true
  try {
    const res = await profileService.getProfile()
    if (res.success && res.user) {
      detailsForm.firstname = res.user.firstname ?? ''
      detailsForm.middlename = res.user.middlename ?? ''
      detailsForm.lastname = res.user.lastname ?? ''
      detailsForm.username = res.user.username ?? ''
      detailsForm.email = res.user.email ?? ''
      detailsForm.phone_number = res.user.phone_number ?? ''
      detailsForm.address = res.user.address ?? ''
      detailsForm.role_name = (res.user.role as any)?.role_name ?? authStore.role ?? 'User'
      detailsForm.photo_url = res.user.photo_url ?? null
      workplace.value = res.workplace ?? null

      // Sync into authStore
      authStore.updateUser({
        firstname: res.user.firstname,
        middlename: res.user.middlename,
        lastname: res.user.lastname,
        username: res.user.username,
        phone_number: res.user.phone_number,
        address: res.user.address,
        photo_url: res.user.photo_url,
      })
    }
  } catch (err: any) {
    console.error('Failed to load profile', err)
    // Fall back to authStore user data
    if (authStore.user) {
      detailsForm.firstname = authStore.user.firstname ?? ''
      detailsForm.middlename = authStore.user.middlename ?? ''
      detailsForm.lastname = authStore.user.lastname ?? ''
      detailsForm.username = authStore.user.username ?? ''
      detailsForm.email = authStore.user.email ?? ''
      detailsForm.phone_number = authStore.user.phone_number ?? ''
      detailsForm.address = authStore.user.address ?? ''
      detailsForm.role_name = authStore.role ?? 'User'
      detailsForm.photo_url = authStore.user.photo_url ?? null
    }
  } finally {
    isLoading.value = false
  }
}

// Trigger file picker
function triggerPhotoUpload() {
  fileInput.value?.click()
}

// Handle Photo Selection & Upload
async function onPhotoSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Validate file size (max 3MB)
  if (file.size > 3 * 1024 * 1024) {
    detailsError.value = 'Profile photo must be smaller than 3MB.'
    return
  }

  // Validate format
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  if (!validTypes.includes(file.type)) {
    detailsError.value = 'Please upload a JPG, PNG, or WebP image.'
    return
  }

  isUploadingPhoto.value = true
  detailsError.value = ''

  try {
    const formData = new FormData()
    formData.append('photo', file)

    const res = await profileService.uploadPhoto(formData)
    if (res.success && res.photo_url) {
      detailsForm.photo_url = res.photo_url
      authStore.updateUser({ photo_url: res.photo_url })
      triggerToast('Photo updated', 'Profile picture successfully uploaded')
    }
  } catch (err: any) {
    detailsError.value = err?.data?.message || err?.message || 'Failed to upload photo.'
  } finally {
    isUploadingPhoto.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

// Handle Photo Removal
async function removePhoto() {
  if (!confirm('Are you sure you want to remove your profile photo?')) return

  isUploadingPhoto.value = true
  detailsError.value = ''

  try {
    const res = await profileService.deletePhoto()
    if (res.success) {
      detailsForm.photo_url = null
      authStore.updateUser({ photo_url: null })
      triggerToast('Photo removed', 'Reverted back to your initials')
    }
  } catch (err: any) {
    detailsError.value = err?.data?.message || err?.message || 'Failed to remove photo.'
  } finally {
    isUploadingPhoto.value = false
  }
}

// Handle Profile Details Save
async function handleSaveDetails() {
  detailsError.value = ''

  if (!detailsForm.firstname.trim()) {
    detailsError.value = 'First name is required.'
    return
  }

  if (!detailsForm.lastname.trim()) {
    detailsError.value = 'Last name is required.'
    return
  }

  isSavingDetails.value = true
  try {
    const res = await profileService.updateProfile({
      firstname: detailsForm.firstname.trim(),
      middlename: detailsForm.middlename.trim() || null,
      lastname: detailsForm.lastname.trim(),
      phone_number: detailsForm.phone_number.trim() || null,
      address: detailsForm.address.trim() || null,
    })

    if (res.success) {
      triggerToast('Profile updated', 'Account details successfully saved')
      authStore.updateUser({
        firstname: detailsForm.firstname.trim(),
        middlename: detailsForm.middlename.trim() || null,
        lastname: detailsForm.lastname.trim(),
        phone_number: detailsForm.phone_number.trim() || null,
        address: detailsForm.address.trim() || null,
      })
    }
  } catch (err: any) {
    detailsError.value = err?.data?.message || err?.message || 'Failed to update account details.'
  } finally {
    isSavingDetails.value = false
  }
}

// Handle Change Password
async function handleChangePassword() {
  passwordError.value = ''

  if (!passwordForm.current_password) {
    passwordError.value = 'Please enter your current password.'
    return
  }

  if (passwordForm.password.length < 8) {
    passwordError.value = 'New password must be at least 8 characters long.'
    return
  }

  if (passwordForm.password !== passwordForm.password_confirmation) {
    passwordError.value = 'New password and confirmation do not match.'
    return
  }

  isChangingPassword.value = true
  try {
    const res = await profileService.changePassword({
      current_password: passwordForm.current_password,
      password: passwordForm.password,
      password_confirmation: passwordForm.password_confirmation,
    })

    if (res.success) {
      triggerToast('Password changed', 'Your password has been updated successfully')
      resetPasswordForm()
    }
  } catch (err: any) {
    passwordError.value = err?.data?.message || err?.message || 'Failed to change password. Please check your current password.'
  } finally {
    isChangingPassword.value = false
  }
}

function resetPasswordForm() {
  passwordForm.current_password = ''
  passwordForm.password = ''
  passwordForm.password_confirmation = ''
}

function handleClose() {
  emit('close')
}
</script>

<template>
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
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-sm"
        @click.self="handleClose"
        @keydown.escape.window="handleClose"
      >
        <div
          class="w-full max-w-2xl bg-[#FFFDF9] rounded-2xl shadow-2xl border border-[#EEDFC4] overflow-hidden flex flex-col max-h-[92vh] relative animate-in fade-in zoom-in-95 duration-200"
        >
          <!-- Top Header Banner -->
          <div class="h-28 bg-gradient-to-r from-[#7D5A50] via-[#65463D] to-[#3B1F0E] relative px-6 flex items-start justify-between pt-4 shrink-0">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-widest text-[#FFF0D1]/80">Account Center</span>
              <h2 class="text-xl font-bold text-[#FFF0D1]">My Profile</h2>
            </div>

            <!-- Close Button -->
            <button
              type="button"
              class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#FFF0D1] flex items-center justify-center transition-colors focus:outline-none"
              aria-label="Close Profile"
              @click="handleClose"
            >
              <Icon name="heroicons:x-mark" class="w-5 h-5" />
            </button>
          </div>

          <!-- Profile Hero Row (Avatar + Details + Actions) -->
          <div class="px-6 pt-0 pb-4 relative -mt-12 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 border-b border-[#EEDFC4] bg-[#FFFDF9]">
            <div class="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <!-- Avatar with hover upload overlay -->
              <div class="relative group shrink-0">
                <div class="w-24 h-24 rounded-full border-4 border-[#FFFDF9] shadow-md bg-[#3B1F0E] overflow-hidden flex items-center justify-center">
                  <img
                    v-if="detailsForm.photo_url"
                    :src="detailsForm.photo_url"
                    alt="Profile Photo"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="font-display font-bold text-[#FFF0D1] text-2xl tracking-wider">
                    {{ initials }}
                  </span>
                </div>

                <!-- Hover Camera Button -->
                <button
                  type="button"
                  :disabled="isUploadingPhoto"
                  class="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer border-4 border-transparent"
                  title="Upload profile photo"
                  @click="triggerPhotoUpload"
                >
                  <Icon name="heroicons:camera" class="w-6 h-6 text-white" />
                  <span class="text-[10px] font-semibold mt-0.5">Change</span>
                </button>

                <!-- Floating mini upload button (always visible on mobile) -->
                <button
                  type="button"
                  class="sm:hidden absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#7D5A50] text-[#FFF0D1] border-2 border-white flex items-center justify-center shadow"
                  title="Upload profile photo"
                  @click="triggerPhotoUpload"
                >
                  <Icon name="heroicons:camera" class="w-4 h-4" />
                </button>

                <!-- Hidden native file input -->
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="onPhotoSelected"
                />
              </div>

              <!-- Name & Role -->
              <div class="space-y-1">
                <div class="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h3 class="text-xl font-bold text-[#3B1F0E]">
                    {{ detailsForm.firstname }} {{ detailsForm.lastname }}
                  </h3>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F5EBE1] text-[#7D5A50] border border-[#EEDFC4]">
                    {{ detailsForm.role_name }}
                  </span>
                </div>

                <p v-if="detailsForm.username" class="text-xs text-gray-500 font-mono">
                  @{{ detailsForm.username }}
                </p>

                <p v-if="workplace" class="text-xs text-[#7D5A50] font-medium flex items-center justify-center sm:justify-start gap-1">
                  <Icon name="heroicons:building-storefront" class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ workplace.branch_name }} ({{ workplace.cafe_name }})</span>
                </p>
              </div>
            </div>

            <!-- Photo actions -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                :disabled="isUploadingPhoto"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F5EBE1] text-[#7D5A50] hover:bg-[#EEDFC4] transition-colors border border-[#EEDFC4]"
                @click="triggerPhotoUpload"
              >
                <Icon v-if="isUploadingPhoto" name="heroicons:arrow-path" class="w-3.5 h-3.5 animate-spin" />
                <Icon v-else name="heroicons:arrow-up-tray" class="w-3.5 h-3.5" />
                <span>{{ isUploadingPhoto ? 'Uploading...' : 'Change Photo' }}</span>
              </button>

              <button
                v-if="detailsForm.photo_url"
                type="button"
                :disabled="isUploadingPhoto"
                class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#D9534F] hover:bg-red-50 transition-colors border border-red-200"
                title="Remove photo and revert to initials"
                @click="removePhoto"
              >
                <Icon name="heroicons:trash" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Tab Navigation -->
          <div class="flex items-center gap-2 px-6 pt-3 border-b border-[#EEDFC4] bg-[#FFFDF9] shrink-0">
            <button
              type="button"
              class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer"
              :class="activeTab === 'details'
                ? 'border-[#7D5A50] text-[#7D5A50]'
                : 'border-transparent text-gray-500 hover:text-[#7D5A50]'"
              @click="activeTab = 'details'"
            >
              <Icon name="heroicons:user" class="w-4 h-4" />
              <span>Account Details</span>
            </button>

            <button
              type="button"
              class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer"
              :class="activeTab === 'password'
                ? 'border-[#7D5A50] text-[#7D5A50]'
                : 'border-transparent text-gray-500 hover:text-[#7D5A50]'"
              @click="activeTab = 'password'"
            >
              <Icon name="heroicons:lock-closed" class="w-4 h-4" />
              <span>Change Password</span>
            </button>
          </div>

          <!-- Scrollable Body Content -->
          <div class="p-6 overflow-y-auto space-y-5 flex-1">
            <!-- Loading Indicator -->
            <div v-if="isLoading" class="py-12 flex flex-col items-center justify-center text-center text-[#7D5A50]">
              <span class="w-7 h-7 border-2 border-[#7D5A50] border-t-transparent rounded-full animate-spin mb-3"></span>
              <p class="text-sm font-medium">Loading profile details...</p>
            </div>

            <!-- Tab 1: Account Details -->
            <div v-else-if="activeTab === 'details'" class="space-y-4">

              <!-- Error Alert -->
              <div
                v-if="detailsError"
                class="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2.5"
              >
                <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
                <span class="font-medium">{{ detailsError }}</span>
              </div>

              <form @submit.prevent="handleSaveDetails" class="space-y-4">
                <!-- Names Row -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1">
                      First Name <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="detailsForm.firstname"
                      type="text"
                      required
                      placeholder="First name"
                      class="w-full h-10 rounded-lg border border-[#EEDFC4] bg-white px-3 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1">
                      Middle Name
                    </label>
                    <input
                      v-model="detailsForm.middlename"
                      type="text"
                      placeholder="Optional"
                      class="w-full h-10 rounded-lg border border-[#EEDFC4] bg-white px-3 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1">
                      Last Name <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="detailsForm.lastname"
                      type="text"
                      required
                      placeholder="Last name"
                      class="w-full h-10 rounded-lg border border-[#EEDFC4] bg-white px-3 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                    />
                  </div>
                </div>

                <!-- Username & Email Row -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1">
                      Username
                    </label>
                    <div class="relative flex items-center">
                      <span class="absolute left-3 text-gray-400 font-mono text-sm">@</span>
                      <input
                        v-model="detailsForm.username"
                        type="text"
                        readonly
                        disabled
                        class="w-full h-10 rounded-lg border border-gray-200 bg-gray-100 pl-8 pr-3 text-sm text-gray-600 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Email Address</span>
                      <span class="text-[10px] font-normal text-emerald-600 flex items-center gap-0.5">
                        <Icon name="heroicons:check-badge" class="w-3.5 h-3.5" />
                        Verified
                      </span>
                    </label>
                    <input
                      v-model="detailsForm.email"
                      type="email"
                      readonly
                      disabled
                      class="w-full h-10 rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm text-gray-600 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <!-- Phone & Address Row -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <div class="relative flex items-center">
                      <Icon name="heroicons:phone" class="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                      <input
                        v-model="detailsForm.phone_number"
                        type="tel"
                        placeholder="e.g. 09171234567"
                        class="w-full h-10 rounded-lg border border-[#EEDFC4] bg-white pl-9 pr-3 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1">
                      Home / Store Address
                    </label>
                    <div class="relative flex items-center">
                      <Icon name="heroicons:map-pin" class="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                      <input
                        v-model="detailsForm.address"
                        type="text"
                        placeholder="Street, City, Province"
                        class="w-full h-10 rounded-lg border border-[#EEDFC4] bg-white pl-9 pr-3 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                      />
                    </div>
                  </div>
                </div>

                <!-- Workplace Information Card -->
                <div v-if="workplace" class="p-3.5 rounded-xl bg-[#FBF2E1] border border-[#EEDFC4] flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-[#7D5A50]/15 flex items-center justify-center text-[#7D5A50] shrink-0">
                    <Icon name="heroicons:briefcase" class="w-5 h-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-semibold text-[#3B1F0E]">Assigned Branch & Cafe</p>
                    <p class="text-xs text-[#7D5A50] truncate">
                      {{ workplace.branch_name }} &bull; {{ workplace.cafe_name }}
                    </p>
                    <p v-if="workplace.branch_address" class="text-[11px] text-gray-500 truncate">
                      {{ workplace.branch_address }}
                    </p>
                  </div>
                </div>

                <!-- Submit Button -->
                <div class="pt-2 flex justify-end">
                  <button
                    type="submit"
                    :disabled="isSavingDetails"
                    class="px-5 h-10 rounded-xl bg-[#7D5A50] hover:bg-[#65463D] text-[#FFF0D1] text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow"
                  >
                    <span v-if="isSavingDetails" class="w-4 h-4 border-2 border-[#FFF0D1] border-t-transparent rounded-full animate-spin"></span>
                    <span>{{ isSavingDetails ? 'Saving Changes...' : 'Save Changes' }}</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- Tab 2: Change Password -->
            <div v-else-if="activeTab === 'password'" class="space-y-4">
              <div class="p-3.5 rounded-xl bg-[#FBF2E1] border border-[#EEDFC4]">
                <h4 class="text-xs font-bold text-[#3B1F0E] uppercase tracking-wider">Password Security</h4>
                <p class="text-xs text-gray-600 mt-0.5">
                  Choose a strong, unique password of at least 8 characters to ensure your BrewSpot account remains protected.
                </p>
              </div>

              <!-- Error Alert -->
              <div
                v-if="passwordError"
                class="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2.5"
              >
                <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
                <span class="font-medium">{{ passwordError }}</span>
              </div>

              <form @submit.prevent="handleChangePassword" class="space-y-4">
                <!-- Current Password -->
                <div>
                  <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1">
                    Current Password <span class="text-red-500">*</span>
                  </label>
                  <div class="relative flex items-center">
                    <input
                      v-model="passwordForm.current_password"
                      :type="showCurrentPassword ? 'text' : 'password'"
                      required
                      placeholder="Enter your current password"
                      class="w-full h-10 rounded-lg border border-[#EEDFC4] bg-white pl-3 pr-10 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                    />
                    <button
                      type="button"
                      class="absolute right-3 text-gray-400 hover:text-[#7D5A50]"
                      @click="showCurrentPassword = !showCurrentPassword"
                    >
                      <Icon :name="showCurrentPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- New Password -->
                <div>
                  <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1">
                    New Password <span class="text-red-500">*</span>
                  </label>
                  <div class="relative flex items-center">
                    <input
                      v-model="passwordForm.password"
                      :type="showNewPassword ? 'text' : 'password'"
                      required
                      placeholder="Minimum 8 characters"
                      class="w-full h-10 rounded-lg border border-[#EEDFC4] bg-white pl-3 pr-10 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                    />
                    <button
                      type="button"
                      class="absolute right-3 text-gray-400 hover:text-[#7D5A50]"
                      @click="showNewPassword = !showNewPassword"
                    >
                      <Icon :name="showNewPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Confirm New Password -->
                <div>
                  <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1">
                    Confirm New Password <span class="text-red-500">*</span>
                  </label>
                  <div class="relative flex items-center">
                    <input
                      v-model="passwordForm.password_confirmation"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      required
                      placeholder="Repeat your new password"
                      class="w-full h-10 rounded-lg border border-[#EEDFC4] bg-white pl-3 pr-10 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                    />
                    <button
                      type="button"
                      class="absolute right-3 text-gray-400 hover:text-[#7D5A50]"
                      @click="showConfirmPassword = !showConfirmPassword"
                    >
                      <Icon :name="showConfirmPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Submit Button -->
                <div class="pt-2 flex justify-end">
                  <button
                    type="submit"
                    :disabled="isChangingPassword"
                    class="px-5 h-10 rounded-xl bg-[#7D5A50] hover:bg-[#65463D] text-[#FFF0D1] text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow"
                  >
                    <span v-if="isChangingPassword" class="w-4 h-4 border-2 border-[#FFF0D1] border-t-transparent rounded-full animate-spin"></span>
                    <span>{{ isChangingPassword ? 'Updating Password...' : 'Update Password' }}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Emil Kowalski Toast (Floor Plan saved style) -->
    <FloorPlanToast
      :show="toastShow"
      :message="toastTitle"
      :description="toastDescription"
      @close="toastShow = false"
    />
  </Teleport>
</template>
