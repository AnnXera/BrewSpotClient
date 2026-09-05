<!-- Unified Application Status & Input Review Page for Registering Users -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import logoFull from '~/assets/images/logo-with-tag.svg'
import type { ApplicationDetails } from '~/services/AuthService'

definePageMeta({
  layout: false,
})

const route = useRoute()
const uuid = route.params.uuid as string
const authService = useAuthService()

const loading = ref(true)
const error = ref('')
const application = ref<ApplicationDetails | null>(null)

async function fetchApplication() {
  loading.value = true
  error.value = ''
  try {
    const res = await authService.getApplicationDetails(uuid)
    if (res.success && res.application) {
      application.value = res.application
    } else {
      error.value = res.message || 'Application not found or link is invalid.'
    }
  } catch (e: any) {
    error.value = e?.data?.message || 'Unable to load application details. Please check the link and try again.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (uuid) {
    fetchApplication()
  } else {
    error.value = 'Invalid application reference.'
    loading.value = false
  }
})

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusConfig = computed(() => {
  const st = application.value?.user?.status || 'pending_approval'
  switch (st) {
    case 'approved':
      return {
        label: 'Approved',
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500',
        description: 'Your application has been approved! You can now set up your password and access your dashboard.',
      }
    case 'rejected':
      return {
        label: 'Application Rejected',
        bg: 'bg-red-100 text-red-800 border-red-300',
        dot: 'bg-red-500',
        description: 'Your application was not approved during review. Please see the notes below or contact support.',
      }
    case 'active':
      return {
        label: 'Active Account',
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500',
        description: 'Your account is active and operational.',
      }
    case 'pending_approval':
    default:
      return {
        label: 'Under Admin Review',
        bg: 'bg-amber-100 text-amber-800 border-amber-300',
        dot: 'bg-amber-500 animate-pulse',
        description: 'Our team is verifying your business documents. This typically takes 1–3 business days.',
      }
  }
})

function formatIdType(type?: string | null): string {
  if (!type) return 'Government Issued ID'
  const map: Record<string, string> = {
    drivers_license: "Driver's License",
    passport: 'Passport',
    umid: 'UMID',
    national_id: 'Philippine National ID (PhilSys)',
    postal_id: 'Postal ID',
    voters_id: "Voter's ID",
    prc_id: 'PRC ID',
  }
  return map[type] || type.replace(/_/g, ' ').toUpperCase()
}

function goLogin() {
  navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-[#FFF8EA] text-[#2d201b] flex flex-col font-sans selection:bg-[#7B5A50]/20 selection:text-[#7B5A50]">

    <!-- Header / Sticky Navigation (Matches Homepage Aesthetic) -->
    <header class="sticky top-0 z-50 backdrop-blur-md bg-[#7B5A50]/95 border-b border-[#65463d] shadow-md transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-3 group">
          <img :src="logoFull" alt="BrewSpot Logo" class="h-10 sm:h-12 w-auto transition-transform group-hover:scale-[1.02]" />
        </NuxtLink>

        <!-- Action Button -->
        <div class="flex items-center gap-3">
          <button
            @click="goLogin"
            class="h-11 px-5 rounded-md text-white border border-white/40 hover:border-white font-medium text-sm hover:bg-white/10 transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
            <span>Sign In</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12">

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-24 space-y-4">
        <div class="w-12 h-12 border-4 border-[#7B5A50]/30 border-t-[#7B5A50] rounded-full animate-spin"></div>
        <p class="text-sm font-medium text-gray-600">Loading your application details...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error || !application" class="max-w-lg mx-auto bg-white rounded-2xl p-8 border border-red-200 shadow-sm text-center space-y-5 my-12">
        <div class="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
          <Icon name="heroicons:exclamation-triangle" class="w-8 h-8" />
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-bold text-[#2d201b]">Application Not Found</h2>
          <p class="text-sm text-gray-600 leading-relaxed">{{ error }}</p>
        </div>
        <div class="pt-2 flex justify-center gap-3">
          <NuxtLink
            to="/"
            class="px-5 py-2.5 rounded-lg border border-[#7B5A50] text-[#7B5A50] font-medium text-sm hover:bg-[#7B5A50]/10 transition"
          >
            Back to Home
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="px-5 py-2.5 rounded-lg bg-[#7B5A50] text-white font-medium text-sm hover:bg-[#65463d] transition"
          >
            Start Registration
          </NuxtLink>
        </div>
      </div>

      <!-- Application Details Loaded -->
      <div v-else class="space-y-8">

        <!-- Top Header & Status Banner -->
        <div class="bg-white rounded-2xl border border-[#7B5A50]/15 p-6 md:p-8 shadow-sm space-y-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
            <div>
              <span class="text-xs uppercase tracking-wider font-bold text-[#7B5A50]">Registration Application</span>
              <h1 class="text-2xl md:text-3xl font-bold text-[#2d201b] mt-1">
                {{ application.cafe?.cafe_name || 'Café Business Application' }}
              </h1>
              <p class="text-xs text-gray-500 mt-1">
                Submitted on {{ formatDate(application.user.created_at) }} • Ref: <span class="font-mono text-gray-700">{{ application.user.uuid }}</span>
              </p>
            </div>

            <!-- Status Pill -->
            <div class="flex items-center gap-2 self-start md:self-auto">
              <div :class="`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${statusConfig.bg}`">
                <span :class="`w-2 h-2 rounded-full ${statusConfig.dot}`"></span>
                {{ statusConfig.label }}
              </div>
            </div>
          </div>

          <!-- Progress Stepper Tracker -->
          <div>
            <div class="grid grid-cols-3 gap-2 relative">
              <!-- Step 1: Submitted -->
              <div class="flex flex-col items-center text-center space-y-2">
                <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow">
                  ✓
                </div>
                <div>
                  <p class="text-xs font-bold text-[#2d201b]">1. Submitted</p>
                  <p class="text-[0.68rem] text-gray-500 hidden sm:block">{{ formatDate(application.user.created_at) }}</p>
                </div>
              </div>

              <!-- Step 2: Under Review -->
              <div class="flex flex-col items-center text-center space-y-2">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow"
                  :class="application.user.status === 'approved' || application.user.status === 'active' ? 'bg-emerald-600 text-white' : application.user.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white animate-pulse'"
                >
                  <span v-if="application.user.status === 'approved' || application.user.status === 'active'">✓</span>
                  <span v-else-if="application.user.status === 'rejected'">✕</span>
                  <span v-else>2</span>
                </div>
                <div>
                  <p class="text-xs font-bold text-[#2d201b]">2. Admin Review</p>
                  <p class="text-[0.68rem] text-gray-500 hidden sm:block">
                    {{ application.user.status === 'pending_approval' ? 'In progress' : (application.approval?.reviewed_at ? formatDate(application.approval.reviewed_at) : 'Completed') }}
                  </p>
                </div>
              </div>

              <!-- Step 3: Activation -->
              <div class="flex flex-col items-center text-center space-y-2">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow"
                  :class="application.user.status === 'approved' || application.user.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'"
                >
                  <span v-if="application.user.status === 'approved' || application.user.status === 'active'">✓</span>
                  <span v-else>3</span>
                </div>
                <div>
                  <p class="text-xs font-bold text-[#2d201b]">3. Password Setup</p>
                  <p class="text-[0.68rem] text-gray-500 hidden sm:block">
                    {{ application.user.status === 'approved' ? 'Ready to setup' : 'After approval' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Status Notice Callout -->
          <div
            v-if="application.user.status === 'approved'"
            class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-emerald-900"
          >
            <div class="flex items-start gap-3">
              <Icon name="heroicons:check-badge" class="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p class="font-bold text-sm">Congratulations! Your application has been approved.</p>
                <p class="text-xs text-emerald-700 mt-0.5">You can now proceed to set up your account password and start your trial.</p>
              </div>
            </div>
            <NuxtLink
              :to="`/setup-password/${application.user.uuid}`"
              class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition text-center shadow-sm shrink-0"
            >
              Set Up Password →
            </NuxtLink>
          </div>

          <div
            v-else-if="application.user.status === 'rejected'"
            class="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-2"
          >
            <div class="flex items-start gap-3">
              <Icon name="heroicons:x-circle" class="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p class="font-bold text-sm">Application Needs Attention</p>
                <p class="text-xs text-red-700 mt-0.5">
                  {{ application.approval.reason || 'Your application was not approved. Please review requirements and reach out to our team.' }}
                </p>
              </div>
            </div>
          </div>

          <div
            v-else
            class="p-4 rounded-xl bg-[#FFF8EA] border border-[#7B5A50]/20 flex items-start gap-3 text-sm text-[#5c3d2e]"
          >
            <Icon name="heroicons:clock" class="w-5 h-5 text-[#7B5A50] shrink-0 mt-0.5" />
            <div class="text-xs leading-relaxed">
              <span class="font-bold text-[#2d201b]">Status Notice: </span>
              {{ statusConfig.description }} You will receive an automated email notification as soon as an administrator completes the review.
            </div>
          </div>
        </div>

        <!-- Two Column Detailed Inputs View -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- 1. Owner / Applicant Information -->
          <div class="bg-white rounded-2xl border border-[#7B5A50]/15 p-6 shadow-sm space-y-5">
            <div class="flex items-center gap-2.5 border-b border-gray-100 pb-3">
              <div class="w-8 h-8 rounded-lg bg-[#7B5A50]/10 text-[#7B5A50] flex items-center justify-center">
                <Icon name="heroicons:user" class="w-4 h-4" />
              </div>
              <div>
                <h2 class="text-base font-bold text-[#2d201b]">Owner Information</h2>
                <p class="text-[0.7rem] text-gray-500">Personal details submitted for identity verification</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div class="bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">Full Name</p>
                <p class="font-bold text-[#2d201b] mt-0.5 text-sm">
                  {{ [application.user.firstname, application.user.middlename, application.user.lastname].filter(Boolean).join(' ') }}
                </p>
              </div>

              <div class="bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">Username</p>
                <p class="font-bold text-[#2d201b] mt-0.5 text-sm font-mono">
                  @{{ application.user.username }}
                </p>
              </div>

              <div class="bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">Email Address</p>
                <p class="font-semibold text-[#2d201b] mt-0.5 break-all">
                  {{ application.user.email }}
                </p>
              </div>

              <div class="bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">Phone Number</p>
                <p class="font-semibold text-[#2d201b] mt-0.5">
                  {{ application.user.phone_number }}
                </p>
              </div>

              <div class="sm:col-span-2 bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">Residential / Owner Address</p>
                <p class="font-medium text-[#2d201b] mt-0.5 leading-relaxed">
                  {{ application.user.address }}
                </p>
              </div>

              <div class="sm:col-span-2 bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">ID Document Provided</p>
                <p class="font-semibold text-[#7B5A50] mt-0.5 flex items-center gap-1.5">
                  <Icon name="heroicons:identification" class="w-4 h-4" />
                  {{ formatIdType(application.documents.government_id.type) }}
                </p>
              </div>
            </div>
          </div>

          <!-- 2. Café & Main Branch Information -->
          <div class="bg-white rounded-2xl border border-[#7B5A50]/15 p-6 shadow-sm space-y-5">
            <div class="flex items-center gap-2.5 border-b border-gray-100 pb-3">
              <div class="w-8 h-8 rounded-lg bg-[#7B5A50]/10 text-[#7B5A50] flex items-center justify-center">
                <Icon name="heroicons:building-storefront" class="w-4 h-4" />
              </div>
              <div>
                <h2 class="text-base font-bold text-[#2d201b]">Café & Branch Details</h2>
                <p class="text-[0.7rem] text-gray-500">Commercial entity and main location details</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div class="bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">Café / Business Name</p>
                <p class="font-bold text-[#2d201b] mt-0.5 text-sm">
                  {{ application.cafe?.cafe_name || '—' }}
                </p>
              </div>

              <div class="bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">Business Structure</p>
                <p class="font-bold text-[#2d201b] mt-0.5 text-sm">
                  {{ application.cafe?.doc_type ? `${application.cafe.doc_type} Registered` : 'Registered Business' }}
                </p>
              </div>

              <div class="bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">Main Branch Name</p>
                <p class="font-semibold text-[#2d201b] mt-0.5">
                  {{ application.branch?.branch_name || 'Main Branch' }}
                </p>
              </div>

              <div class="bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">Branch Type</p>
                <p class="font-semibold text-[#7B5A50] mt-0.5 uppercase tracking-wide">
                  {{ application.branch?.branch_type || 'Main' }}
                </p>
              </div>

              <div class="sm:col-span-2 bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">Branch Location Address</p>
                <p class="font-medium text-[#2d201b] mt-0.5 leading-relaxed">
                  {{ application.branch?.address || '—' }}
                </p>
              </div>

              <div class="bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">Branch Contact Email</p>
                <p class="font-semibold text-[#2d201b] mt-0.5 break-all">
                  {{ application.branch?.cafe_email || '—' }}
                </p>
              </div>

              <div class="bg-[#FFF8EA]/50 p-3 rounded-lg border border-[#7B5A50]/10">
                <p class="text-gray-500 font-medium">Branch Contact Phone</p>
                <p class="font-semibold text-[#2d201b] mt-0.5">
                  {{ application.branch?.cafe_phonenumber || '—' }}
                </p>
              </div>
            </div>
          </div>

        </div>

        <!-- 3. Uploaded Documents & Requirements Checklist -->
        <div class="bg-white rounded-2xl border border-[#7B5A50]/15 p-6 md:p-8 shadow-sm space-y-5">
          <div class="flex items-center justify-between border-b border-gray-100 pb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-[#7B5A50]/10 text-[#7B5A50] flex items-center justify-center">
                <Icon name="heroicons:document-check" class="w-4 h-4" />
              </div>
              <div>
                <h2 class="text-base font-bold text-[#2d201b]">Submitted Documents Checklist</h2>
                <p class="text-[0.7rem] text-gray-500">All 5 mandatory documents attached for compliance verification</p>
              </div>
            </div>
            <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              ✓ All Requirements Attached
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <!-- 1. Government ID -->
            <div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 flex items-start justify-between">
              <div class="flex items-start gap-2.5">
                <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="heroicons:check" class="w-4 h-4 font-bold" />
                </div>
                <div>
                  <p class="font-bold text-xs text-[#2d201b]">1. Government ID</p>
                  <p class="text-[0.7rem] text-gray-600 mt-0.5">{{ formatIdType(application.documents.government_id.type) }}</p>
                </div>
              </div>
              <span class="text-[0.65rem] font-bold text-emerald-700 uppercase">Attached</span>
            </div>

            <!-- 2. BIR Certificate -->
            <div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 flex items-start justify-between">
              <div class="flex items-start gap-2.5">
                <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="heroicons:check" class="w-4 h-4 font-bold" />
                </div>
                <div>
                  <p class="font-bold text-xs text-[#2d201b]">2. BIR Certificate</p>
                  <p class="text-[0.7rem] text-gray-600 mt-0.5">Form 2303 Registration</p>
                </div>
              </div>
              <span class="text-[0.65rem] font-bold text-emerald-700 uppercase">Attached</span>
            </div>

            <!-- 3. Mayor's Permit -->
            <div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 flex items-start justify-between">
              <div class="flex items-start gap-2.5">
                <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="heroicons:check" class="w-4 h-4 font-bold" />
                </div>
                <div>
                  <p class="font-bold text-xs text-[#2d201b]">3. Mayor's Permit</p>
                  <p class="text-[0.7rem] text-gray-600 mt-0.5">LGU Business Clearance</p>
                </div>
              </div>
              <span class="text-[0.65rem] font-bold text-emerald-700 uppercase">Attached</span>
            </div>

            <!-- 4. DTI / SEC Document -->
            <div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 flex items-start justify-between">
              <div class="flex items-start gap-2.5">
                <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="heroicons:check" class="w-4 h-4 font-bold" />
                </div>
                <div>
                  <p class="font-bold text-xs text-[#2d201b]">4. {{ application.cafe?.doc_type || 'DTI/SEC' }} Document</p>
                  <p class="text-[0.7rem] text-gray-600 mt-0.5">Business Name Certificate</p>
                </div>
              </div>
              <span class="text-[0.65rem] font-bold text-emerald-700 uppercase">Attached</span>
            </div>

            <!-- 5. Sanitary Permit -->
            <div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 flex items-start justify-between">
              <div class="flex items-start gap-2.5">
                <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="heroicons:check" class="w-4 h-4 font-bold" />
                </div>
                <div>
                  <p class="font-bold text-xs text-[#2d201b]">5. Sanitary Permit</p>
                  <p class="text-[0.7rem] text-gray-600 mt-0.5">Health & Safety Clearance</p>
                </div>
              </div>
              <span class="text-[0.65rem] font-bold text-emerald-700 uppercase">Attached</span>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#7B5A50]/15">
          <NuxtLink
            to="/"
            class="text-xs font-semibold text-[#7B5A50] hover:underline flex items-center gap-1.5"
          >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            Return to BrewSpot Home
          </NuxtLink>

          <div class="flex items-center gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-lg border border-[#7B5A50] text-[#7B5A50] text-xs font-medium hover:bg-[#7B5A50]/10 transition flex items-center gap-1.5"
              @click="fetchApplication"
            >
              <Icon name="heroicons:arrow-path" class="w-4 h-4" />
              Refresh Status
            </button>
            <NuxtLink
              to="/login"
              class="px-5 py-2 rounded-lg bg-[#7B5A50] hover:bg-[#65463d] text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              Go to Sign In
            </NuxtLink>
          </div>
        </div>

      </div>

    </main>
  </div>
</template>
