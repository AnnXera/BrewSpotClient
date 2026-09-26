<script setup lang="ts">
import type { BranchDetail } from '~/services/OwnerProfileService'

definePageMeta({
  role: 'Cafe Owner',
})

const links = [
  { label: 'Dashboard', to: '/owner/dashboard', icon: 'squares-2x2' },
  { label: 'Cafe Management', to: '/owner/cafes', icon: 'building-storefront' },
  { label: 'Menu Management', to: '/owner/menu-management', icon: 'book-open' },
  { label: 'Subscription', to: '/owner/subscription', icon: 'credit-card' },
]

const route = useRoute()
const ownerService = useOwnerProfileService()

const branch = ref<BranchDetail | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const activeTab = ref<'details' | 'employees'>(
  route.query.tab === 'employees' ? 'employees' : 'details'
)

watch(() => route.query.tab, (newTab) => {
  if (newTab === 'details' || newTab === 'employees') {
    activeTab.value = newTab
  }
})

const isMain = computed(() => (branch.value?.branch_type || '').toLowerCase() === 'main')

const pageTitle = computed(() => {
  if (!branch.value) return 'Branch Details'
  const { cafe_name, branch_name } = branch.value
  if (cafe_name && branch_name && !branch_name.toLowerCase().startsWith(cafe_name.toLowerCase())) {
    return `${cafe_name} - ${branch_name}`
  }
  return branch_name || cafe_name || 'Branch Details'
})

const birDocument = computed(() =>
  branch.value?.documents?.find(doc => doc.doc_type === 'BIR') ?? null,
)

function formatDate(value: string | null | undefined, month: 'short' | 'long' = 'long') {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month, day: 'numeric', year: 'numeric' })
}

function formatVat(value: string | null | undefined) {
  if (value === 'vat-registered') return 'VAT'
  if (value === 'non-vat') return 'Non-VAT'
  return '—'
}

async function fetchBranch() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await ownerService.getBranch(route.params.uuid as string)
    if (res.success && res.branch) {
      branch.value = res.branch
    } else {
      errorMessage.value = res.message || 'Branch not found.'
    }
  } catch (e: any) {
    errorMessage.value = e?.data?.message || 'Failed to load branch details.'
  } finally {
    loading.value = false
  }
}

async function viewDocument(url: string) {
  const newTab = window.open('', '_blank')
  const config = useRuntimeConfig()
  const token = useCookie<string | null>('auth_token')
  const origin = config.public.apiBase.replace(/\/api\/?$/, '')

  try {
    const response = await fetch(`${origin}${url}`, {
      headers: {
        Authorization: `Bearer ${token.value}`,
        Accept: 'application/pdf, image/*',
      },
    })

    if (!response.ok) throw new Error(`Request failed: ${response.status}`)

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)

    if (newTab) {
      newTab.location.href = objectUrl
    } else {
      window.open(objectUrl, '_blank')
    }
  } catch (e) {
    newTab?.close()
    console.error('Failed to load document', e)
  }
}

onMounted(fetchBranch)
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FFF8EA]">
    <NavBar :links="links" />
    <main class="flex-1 p-6 sm:p-8 lg:p-12 font-display">
      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2 text-sm">
        <NuxtLink to="/owner/cafes" class="font-medium text-[#9E7060] hover:text-[#3D2B24] transition-colors">
          Cafe Management
        </NuxtLink>
        <span class="font-medium text-[#9E7060]">/</span>
        <span class="font-semibold text-[#3D2B24]">Branch Details</span>
      </nav>

      <h1 class="mt-3 text-2xl sm:text-[32px] font-bold text-[#3D2B24] break-words">{{ pageTitle }}</h1>

      <!-- Tabs -->
      <div class="relative flex items-center mt-4">
        <button
          type="button"
          class="font-display transition-colors relative z-10
                 min-[360px]:px-5 min-[360px]:py-3.5 min-[360px]:text-[14px]
                 md:px-5 md:py-3.5 md:text-[16px]"
          :class="activeTab === 'details'
            ? 'text-[#3B1F0E] font-bold'
            : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
          @click="activeTab = 'details'"
        >
          Branch Details
          <span
            v-if="activeTab === 'details'"
            class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full"
          />
        </button>

        <button
          type="button"
          class="font-display transition-colors relative z-10
                 min-[360px]:px-5 min-[360px]:py-3.5 min-[360px]:text-[14px]
                 md:px-5 md:py-3.5 md:text-[16px]"
          :class="activeTab === 'employees'
            ? 'text-[#3B1F0E] font-bold'
            : 'text-[#9E7060] font-medium hover:text-[#3B1F0E]'"
          @click="activeTab = 'employees'"
        >
          Employees
          <span
            v-if="activeTab === 'employees'"
            class="absolute left-0 right-0 -bottom-px h-[3px] bg-[#3B1F0E] rounded-full"
          />
        </button>

        <!-- full-width baseline underneath both tabs -->
        <div class="absolute left-0 right-0 bottom-0 h-px bg-[#EEDFC4]" />
      </div>

      <div v-if="loading" class="flex justify-center items-center py-16">
        <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-[#7D5A50]" />
      </div>

      <div v-else-if="errorMessage" class="mt-4 bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 flex items-center gap-3">
        <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0" />
        <span class="text-sm font-medium">{{ errorMessage }}</span>
        <button class="ml-auto text-sm font-bold underline hover:text-red-900" @click="fetchBranch">Retry</button>
      </div>

      <template v-else-if="branch">
        <!-- Branch Details Tab -->
        <div v-if="activeTab === 'details'" class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <!-- Branch Information -->
          <section class="bg-white border border-[#EDD8CC] rounded-2xl p-6 flex flex-col gap-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-2xl font-bold text-[#3D2B24]">Branch Information</h2>
              <div class="flex items-center gap-1.5">
                <span class="bg-[#FFF0D1] border border-[#EDD8CC] rounded-lg px-2.5 py-1 text-xs font-bold text-[#7D5A50] uppercase">
                  {{ branch.branch_type }}
                </span>
                <StatusBadge :status="branch.status" />
              </div>
            </div>

            <div class="flex items-start gap-4">
              <img
                v-if="branch.cafe_picture_url"
                :src="branch.cafe_picture_url"
                :alt="pageTitle"
                class="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-xl object-cover shrink-0 border border-[#EDD8CC]"
              />
              <div v-else class="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-xl bg-[#F4ECE1] border border-[#EDD8CC] flex items-center justify-center shrink-0">
                <Icon name="heroicons:building-storefront" class="w-10 h-10 text-[#9E7060]" />
              </div>

              <div class="flex-1 min-w-0 flex flex-col gap-3">
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Branch Name</p>
                  <p class="text-[15px] font-medium text-[#3D2B24] break-words">{{ branch.branch_name }}</p>
                </div>
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">{{ isMain ? 'Main Address' : 'Address' }}</p>
                  <p class="text-base font-medium text-[#3D2B24] break-words">{{ branch.address || '—' }}</p>
                </div>
              </div>
            </div>

            <hr class="border-t border-[#EDD8CC]" />

            <div class="flex flex-col gap-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="flex flex-col gap-1 min-w-0">
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Email Address</p>
                  <p class="text-base font-medium text-[#3D2B24] break-all">{{ branch.cafe_email || '—' }}</p>
                </div>
                <div class="flex flex-col gap-1 min-w-0">
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Phone Number</p>
                  <p class="text-base font-medium text-[#3D2B24]">{{ branch.cafe_phonenumber || '—' }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- BIR Document -->
          <section class="bg-white border border-[#EDD8CC] rounded-2xl p-6 flex flex-col gap-4">
            <h2 class="text-[22px] font-bold text-[#3D2B24]">BIR Document</h2>

            <div v-if="birDocument" class="flex flex-col gap-5">
              <div class="border border-[#EDD8CC] rounded-xl p-4 flex items-center gap-3">
                <div class="bg-[#FFF0D1] rounded-[10px] w-12 h-12 flex items-center justify-center shrink-0">
                  <img src="/images/file-text.svg" alt="" width="20" height="20" />
                </div>
                <div class="flex-1 min-w-0 flex flex-col gap-1">
                  <p class="text-sm font-semibold text-[#3D2B24] truncate">BIR Certificate</p>
                  <p class="text-xs text-[#9E7060]">Uploaded {{ formatDate(birDocument.uploaded_at, 'short') }}</p>
                </div>
                <button
                  type="button"
                  class="border border-[#EDD8CC] rounded-[10px] px-4 py-2 text-[13px] font-semibold text-[#7D5A50] hover:bg-[#FFF8EA] transition-colors shrink-0"
                  @click="viewDocument(birDocument.download_url)"
                >
                  View
                </button>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1 min-w-0">
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">TIN Number</p>
                  <p class="text-[15px] font-medium text-[#3D2B24] break-all">{{ birDocument.tin_number || '—' }}</p>
                </div>
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">VAT Type</p>
                  <p class="text-[15px] font-medium text-[#3D2B24]">{{ formatVat(birDocument.vat) }}</p>
                </div>
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Registered Date</p>
                  <p class="text-[15px] font-medium text-[#3D2B24]">{{ formatDate(birDocument.registered_at) }}</p>
                </div>
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Expired Date</p>
                  <p class="text-[15px] font-medium text-[#3D2B24]">{{ formatDate(birDocument.expired_at) }}</p>
                </div>
              </div>
            </div>

            <p v-else class="text-sm text-[#9E7060]">No BIR document uploaded for this branch.</p>
          </section>
        </div>

        <!-- Employees Tab -->
        <div v-else class="mt-4 bg-white border border-[#EDD8CC] rounded-2xl p-10 flex flex-col items-center gap-2 text-center">
          <Icon name="heroicons:user-group" class="w-10 h-10 text-[#9E7060]" />
          <p class="text-base font-semibold text-[#3D2B24]">Employees</p>
          <p class="text-sm text-[#9E7060]">Branch employee management is not available yet.</p>
        </div>
      </template>
    </main>
  </div>
</template>
