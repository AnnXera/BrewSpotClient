<!-- app/pages/profile.vue -->
<script setup lang="ts">
import { useUserProfileService, type WorkplaceInfo } from '~/composables/useUserProfileService'
import { OWNER_NAV_LINKS, MANAGER_NAV_LINKS, ADMIN_NAV_LINKS } from '~/utils/constants'

const authStore = useAuthStore()
const profileService = useUserProfileService()

// Dynamic navigation links based on current user role
const navLinks = computed(() => {
  if (authStore.role === 'Admin') return ADMIN_NAV_LINKS
  if (authStore.role === 'Manager') return MANAGER_NAV_LINKS
  return OWNER_NAV_LINKS
})

const dashboardRoute = computed(() => {
  if (authStore.role === 'Admin') return '/admin/dashboard'
  if (authStore.role === 'Manager') return '/manager/dashboard'
  if (authStore.role === 'Cashier') return '/cashier/dashboard'
  return '/owner/dashboard'
})

const activeTab = ref<'details' | 'password'>('details')
const fileInput = ref<HTMLInputElement | null>(null)

// Loading States
const isLoading = ref(true)
const isSavingDetails = ref(false)
const isUploadingPhoto = ref(false)
const isChangingPassword = ref(false)

// Feedback Messages
const detailsError = ref('')
const passwordError = ref('')

// Toast Notification State (Emil Kowalski floor plan style)
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

// Initials fallback for avatar
const initials = computed(() => {
  const first = detailsForm.firstname?.trim()?.[0] ?? ''
  const last = detailsForm.lastname?.trim()?.[0] ?? ''
  return (first + last).toUpperCase() || authStore.user?.firstname?.[0]?.toUpperCase() || 'U'
})

onMounted(async () => {
  await fetchProfile()
})

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

function triggerPhotoUpload() {
  fileInput.value?.click()
}

async function onPhotoSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.size > 3 * 1024 * 1024) {
    detailsError.value = 'Profile photo must be smaller than 3MB.'
    return
  }

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
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FFF8EA]">
    <!-- Persistent Sidebar -->
    <NavBar :links="navLinks" />

    <!-- Main Screen Content Area -->
    <main class="flex-1 p-6 sm:p-8 lg:p-12 font-display overflow-y-auto">
      <div class="max-w-4xl mx-auto space-y-6">
        <!-- Top Screen Header with Back Link -->
        <div class="pb-2">
          <NuxtLink
            :to="dashboardRoute"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9E7060] hover:text-[#3B1F0E] transition-colors mb-2 cursor-pointer"
          >
            <Icon name="heroicons:chevron-left" class="w-4 h-4" />
            <span>Back to Dashboard</span>
          </NuxtLink>
          <h1 class="text-2xl sm:text-[32px] font-bold text-[#3D2B24] break-words">Account Profile</h1>
          <p class="text-sm font-medium text-[#9E7060] mt-0.5">
            Manage your personal profile, credentials, and password security.
          </p>
        </div>

        <!-- Main Profile Card -->
        <div class="bg-[#FFFDF9] rounded-2xl shadow-sm border border-[#EEDFC4] overflow-hidden">
          <!-- Cover Banner -->
          <div class="h-28 sm:h-36 bg-gradient-to-r from-[#7D5A50] via-[#5C3A28] to-[#3B1F0E] relative rounded-t-2xl overflow-hidden">
            <!-- Subtle decorative roast pattern -->
            <div class="absolute inset-0 opacity-10 bg-[radial-gradient(#FFF0D1_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>
          </div>

          <!-- Hero Identity Section: Avatar on left overlapping banner, Action buttons on right -->
          <div class="px-6 sm:px-8 pb-6 border-b border-[#EEDFC4] bg-[#FFFDF9]">
            <!-- Row 1: Overlapping Avatar & Action Buttons -->
            <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
              <!-- Avatar with white border ring -->
              <div class="relative group shrink-0 self-center sm:self-auto z-10">
                <div class="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-[#FFFDF9] shadow-lg bg-[#3B1F0E] overflow-hidden flex items-center justify-center">
                  <img
                    v-if="detailsForm.photo_url"
                    :src="detailsForm.photo_url"
                    alt="Profile Photo"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="font-display font-bold text-[#FFF0D1] text-3xl sm:text-4xl tracking-wider">
                    {{ initials }}
                  </span>
                </div>

                <!-- Hover Camera Button -->
                <button
                  type="button"
                  :disabled="isUploadingPhoto"
                  class="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer border-4 border-transparent"
                  title="Upload profile photo"
                  @click="triggerPhotoUpload"
                >
                  <Icon name="heroicons:camera" class="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  <span class="text-xs font-semibold mt-1">Change</span>
                </button>

                <!-- Floating mini upload button for mobile tap -->
                <button
                  type="button"
                  class="sm:hidden absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#7D5A50] text-[#FFF0D1] border-2 border-white flex items-center justify-center shadow cursor-pointer"
                  title="Upload profile photo"
                  @click="triggerPhotoUpload"
                >
                  <Icon name="heroicons:camera" class="w-5 h-5" />
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

              <!-- Action buttons aligned on the right of the baseline -->
              <div class="flex items-center justify-center sm:justify-end gap-2.5 pt-2 sm:pt-0">
                <button
                  type="button"
                  :disabled="isUploadingPhoto"
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#F5EBE1] text-[#7D5A50] hover:bg-[#EEDFC4] transition-colors border border-[#EEDFC4] shadow-sm cursor-pointer"
                  @click="triggerPhotoUpload"
                >
                  <Icon v-if="isUploadingPhoto" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                  <Icon v-else name="heroicons:arrow-up-tray" class="w-4 h-4" />
                  <span>{{ isUploadingPhoto ? 'Uploading...' : 'Change Photo' }}</span>
                </button>

                <button
                  v-if="detailsForm.photo_url"
                  type="button"
                  :disabled="isUploadingPhoto"
                  class="p-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#D9534F] hover:bg-red-50 transition-colors border border-red-200 shadow-sm cursor-pointer"
                  title="Remove photo and revert to initials"
                  @click="removePhoto"
                >
                  <Icon name="heroicons:trash" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Row 2: Name, Role & Workplace Block (Safely below banner, zero overlap!) -->
            <div class="space-y-1 text-center sm:text-left">
              <div class="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                <h2 class="text-2xl sm:text-3xl font-bold text-[#3B1F0E] leading-tight">
                  {{ detailsForm.firstname }} {{ detailsForm.lastname }}
                </h2>
                <span class="px-3 py-0.5 rounded-full text-xs font-semibold bg-[#F5EBE1] text-[#7D5A50] border border-[#EEDFC4]">
                  {{ detailsForm.role_name }}
                </span>
              </div>

              <p v-if="detailsForm.username" class="text-xs sm:text-sm text-gray-500 font-mono">
                @{{ detailsForm.username }}
              </p>

              <p v-if="workplace" class="text-xs sm:text-sm text-[#7D5A50] font-medium flex items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                <Icon name="heroicons:building-storefront" class="w-4 h-4 shrink-0 text-[#7D5A50]" />
                <span>{{ workplace.branch_name }} &bull; {{ workplace.cafe_name }}</span>
              </p>
            </div>
          </div>

          <!-- Tab Navigation matching cafe.vue standards -->
          <div class="relative flex items-center border-b border-[#EEDFC4] px-6 sm:px-8 bg-[#FFFDF9]">
            <button
              type="button"
              class="font-display transition-colors relative z-10 px-5 py-3.5 text-sm sm:text-base cursor-pointer"
              :class="activeTab === 'details'
                ? 'text-[#3B1F0E] font-bold'
                : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
              @click="activeTab = 'details'"
            >
              <span class="flex items-center gap-2">
                <Icon name="heroicons:user" class="w-4 h-4" />
                <span>Account Details</span>
              </span>
              <span
                v-if="activeTab === 'details'"
                class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full"
              />
            </button>

            <button
              type="button"
              class="font-display transition-colors relative z-10 px-5 py-3.5 text-sm sm:text-base cursor-pointer"
              :class="activeTab === 'password'
                ? 'text-[#3B1F0E] font-bold'
                : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
              @click="activeTab = 'password'"
            >
              <span class="flex items-center gap-2">
                <Icon name="heroicons:lock-closed" class="w-4 h-4" />
                <span>Change Password</span>
              </span>
              <span
                v-if="activeTab === 'password'"
                class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full"
              />
            </button>
          </div>

          <!-- Main Screen Body Content -->
          <div class="p-6 sm:p-8">
            <!-- Loading Spinner -->
            <div v-if="isLoading" class="py-16 flex flex-col items-center justify-center text-center text-[#7D5A50]">
              <span class="w-8 h-8 border-2 border-[#7D5A50] border-t-transparent rounded-full animate-spin mb-3"></span>
              <p class="text-sm font-medium">Loading your profile information...</p>
            </div>

            <!-- Tab 1: Account Details Form -->
            <div v-else-if="activeTab === 'details'" class="space-y-6">
              <!-- Error Alert Banner -->
              <div
                v-if="detailsError"
                class="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3 animate-in fade-in"
              >
                <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
                <span class="font-medium">{{ detailsError }}</span>
              </div>

              <form @submit.prevent="handleSaveDetails" class="space-y-5">
                <!-- Names Row (First, Middle, Last) -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1.5">
                      First Name <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="detailsForm.firstname"
                      type="text"
                      required
                      placeholder="First name"
                      class="w-full h-11 rounded-xl border border-[#EEDFC4] bg-white px-3.5 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1.5">
                      Middle Name
                    </label>
                    <input
                      v-model="detailsForm.middlename"
                      type="text"
                      placeholder="Optional"
                      class="w-full h-11 rounded-xl border border-[#EEDFC4] bg-white px-3.5 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1.5">
                      Last Name <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="detailsForm.lastname"
                      type="text"
                      required
                      placeholder="Last name"
                      class="w-full h-11 rounded-xl border border-[#EEDFC4] bg-white px-3.5 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                    />
                  </div>
                </div>

                <!-- Username & Email Row -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1.5">
                      Username
                    </label>
                    <div class="relative flex items-center">
                      <span class="absolute left-3.5 text-gray-400 font-mono text-sm">@</span>
                      <input
                        v-model="detailsForm.username"
                        type="text"
                        readonly
                        disabled
                        class="w-full h-11 rounded-xl border border-gray-200 bg-gray-100 pl-8 pr-3.5 text-sm text-gray-600 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Email Address</span>
                      <span class="text-xs font-normal text-emerald-600 flex items-center gap-1">
                        <Icon name="heroicons:check-badge" class="w-4 h-4" />
                        Verified
                      </span>
                    </label>
                    <input
                      v-model="detailsForm.email"
                      type="email"
                      readonly
                      disabled
                      class="w-full h-11 rounded-xl border border-gray-200 bg-gray-100 px-3.5 text-sm text-gray-600 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <!-- Phone & Address Row -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <div class="relative flex items-center">
                      <Icon name="heroicons:phone" class="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
                      <input
                        v-model="detailsForm.phone_number"
                        type="tel"
                        placeholder="e.g. 09171234567"
                        class="w-full h-11 rounded-xl border border-[#EEDFC4] bg-white pl-10 pr-3.5 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1.5">
                      Home / Store Address
                    </label>
                    <div class="relative flex items-center">
                      <Icon name="heroicons:map-pin" class="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
                      <input
                        v-model="detailsForm.address"
                        type="text"
                        placeholder="Street, City, Province"
                        class="w-full h-11 rounded-xl border border-[#EEDFC4] bg-white pl-10 pr-3.5 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                      />
                    </div>
                  </div>
                </div>

                <!-- Workplace Information Box -->
                <div v-if="workplace" class="p-4 rounded-xl bg-[#FBF2E1] border border-[#EEDFC4] flex items-center gap-3.5">
                  <div class="w-11 h-11 rounded-xl bg-[#7D5A50]/15 flex items-center justify-center text-[#7D5A50] shrink-0">
                    <Icon name="heroicons:building-storefront" class="w-6 h-6" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-bold text-[#3B1F0E] uppercase tracking-wider">Assigned Branch & Cafe</p>
                    <p class="text-sm font-semibold text-[#7D5A50] mt-0.5 truncate">
                      {{ workplace.branch_name }} &bull; {{ workplace.cafe_name }}
                    </p>
                    <p v-if="workplace.branch_address" class="text-xs text-gray-600 truncate mt-0.5">
                      {{ workplace.branch_address }}
                    </p>
                  </div>
                </div>

                <!-- Submit Button -->
                <div class="pt-3 flex justify-end">
                  <button
                    type="submit"
                    :disabled="isSavingDetails"
                    class="px-6 h-11 rounded-xl bg-[#7D5A50] hover:bg-[#65463D] text-[#FFF0D1] text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow cursor-pointer"
                  >
                    <span v-if="isSavingDetails" class="w-4 h-4 border-2 border-[#FFF0D1] border-t-transparent rounded-full animate-spin"></span>
                    <span>{{ isSavingDetails ? 'Saving Changes...' : 'Save Changes' }}</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- Tab 2: Change Password Form -->
            <div v-else-if="activeTab === 'password'" class="space-y-6">
              <div class="p-4 rounded-xl bg-[#FBF2E1] border border-[#EEDFC4]">
                <h3 class="text-xs font-bold text-[#3B1F0E] uppercase tracking-wider">Password Security Standards</h3>
                <p class="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                  Choose a strong, unique password of at least 8 characters to ensure your BrewSpot account and branch management remain protected.
                </p>
              </div>

              <!-- Error Alert Banner -->
              <div
                v-if="passwordError"
                class="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3 animate-in fade-in"
              >
                <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 shrink-0" />
                <span class="font-medium">{{ passwordError }}</span>
              </div>

              <form @submit.prevent="handleChangePassword" class="space-y-5 max-w-xl">
                <!-- Current Password -->
                <div>
                  <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1.5">
                    Current Password <span class="text-red-500">*</span>
                  </label>
                  <div class="relative flex items-center">
                    <input
                      v-model="passwordForm.current_password"
                      :type="showCurrentPassword ? 'text' : 'password'"
                      required
                      placeholder="Enter your current password"
                      class="w-full h-11 rounded-xl border border-[#EEDFC4] bg-white pl-3.5 pr-11 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                    />
                    <button
                      type="button"
                      class="absolute right-3.5 text-gray-400 hover:text-[#7D5A50] focus:outline-none cursor-pointer"
                      @click="showCurrentPassword = !showCurrentPassword"
                    >
                      <Icon :name="showCurrentPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <!-- New Password -->
                <div>
                  <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1.5">
                    New Password <span class="text-red-500">*</span>
                  </label>
                  <div class="relative flex items-center">
                    <input
                      v-model="passwordForm.password"
                      :type="showNewPassword ? 'text' : 'password'"
                      required
                      placeholder="Minimum 8 characters"
                      class="w-full h-11 rounded-xl border border-[#EEDFC4] bg-white pl-3.5 pr-11 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                    />
                    <button
                      type="button"
                      class="absolute right-3.5 text-gray-400 hover:text-[#7D5A50] focus:outline-none cursor-pointer"
                      @click="showNewPassword = !showNewPassword"
                    >
                      <Icon :name="showNewPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <!-- Confirm New Password -->
                <div>
                  <label class="block text-xs font-semibold text-[#3B1F0E] uppercase tracking-wider mb-1.5">
                    Confirm New Password <span class="text-red-500">*</span>
                  </label>
                  <div class="relative flex items-center">
                    <input
                      v-model="passwordForm.password_confirmation"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      required
                      placeholder="Repeat your new password"
                      class="w-full h-11 rounded-xl border border-[#EEDFC4] bg-white pl-3.5 pr-11 text-sm text-[#3B1F0E] outline-none transition focus:border-[#7D5A50] focus:ring-2 focus:ring-[#7D5A50]/20"
                    />
                    <button
                      type="button"
                      class="absolute right-3.5 text-gray-400 hover:text-[#7D5A50] focus:outline-none cursor-pointer"
                      @click="showConfirmPassword = !showConfirmPassword"
                    >
                      <Icon :name="showConfirmPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <!-- Submit Button -->
                <div class="pt-3">
                  <button
                    type="submit"
                    :disabled="isChangingPassword"
                    class="px-6 h-11 rounded-xl bg-[#7D5A50] hover:bg-[#65463D] text-[#FFF0D1] text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow cursor-pointer"
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
    </main>

    <!-- Emil Kowalski Toast (Floor Plan saved style) -->
    <FloorPlanToast
      :show="toastShow"
      :message="toastTitle"
      :description="toastDescription"
      @close="toastShow = false"
    />
  </div>
</template>
