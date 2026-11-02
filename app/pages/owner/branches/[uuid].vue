<script setup lang="ts">
import type { BranchDetail } from '~/services/OwnerProfileService'

definePageMeta({
  role: 'Cafe Owner',
})

const links = OWNER_NAV_LINKS

const route = useRoute()
const router = useRouter()
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

// ?employee=<uuid> opens that employee's details inside the Employees tab,
// so the view survives a refresh and the browser Back button returns to the list.
const viewedEmployee = computed(() =>
  typeof route.query.employee === 'string' ? route.query.employee : null
)

function viewEmployee(uuid: string) {
  router.push({ query: { ...route.query, tab: 'employees', employee: uuid } })
}

function backToEmployees() {
  const { employee, ...restQuery } = route.query
  router.push({ query: { ...restQuery, tab: 'employees' } })
}

function selectTab(tab: 'details' | 'employees') {
  activeTab.value = tab
  if (viewedEmployee.value) {
    const { employee, ...restQuery } = route.query
    router.replace({ query: { ...restQuery, tab } })
  }
}

const isMain = computed(() => (branch.value?.branch_type || '').toLowerCase() === 'main')

const pageTitle = computed(() => branch.value?.branch_name || 'Branch Details')

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
    <main class="flex-1 p-6 sm:p-8 lg:p-12 font-display cafe-entrance">
      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2 text-sm pb-1">
        <NuxtLink to="/owner/cafes" class="inline-flex items-center gap-1.5 font-medium text-[#8C6E63] hover:text-[#3A2923] transition-colors">
          <Icon name="heroicons:arrow-left" class="size-4 text-[#7D5A50]" />
          <span>Cafe Management</span>
        </NuxtLink>
        <span class="text-[#8C6E63]/60">/</span>
        <span class="font-medium text-[#3A2923]">{{ pageTitle }}</span>
      </nav>

      <!-- Header -->
      <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2 pb-2">
        <div class="space-y-1 min-w-0">
          <h1 class="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[#3A2923] tracking-tight break-words">
            {{ pageTitle }}
          </h1>
          <p class="text-xs sm:text-sm text-[#7D5A50]">
            Branch overview, legal documentation, and employee records.
          </p>
        </div>

        <!-- Quick actions -->
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#DED4CA] bg-white text-xs font-semibold text-[#5B463C] shadow-sm hover:border-[#7D5A50] hover:bg-[#F8EFE7] active:scale-[0.97] transition-all duration-150 cursor-pointer disabled:opacity-50"
            :disabled="loading"
            title="Refresh branch details"
            @click="fetchBranch"
          >
            <Icon name="heroicons:arrow-path" class="size-3.5 text-[#7D5A50]" :class="loading ? 'animate-spin' : ''" />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <!-- Clean Navigation Tabs -->
      <nav class="flex items-center gap-6 border-b border-[#EDD8CC] mt-4" aria-label="Tabs">
        <button
          type="button"
          class="group relative pb-3 pt-1 text-sm font-semibold transition-colors duration-150 flex items-center gap-2 cursor-pointer focus-visible:outline-none active:scale-[0.98]"
          :class="activeTab === 'details' ? 'text-[#3A2923]' : 'text-[#8C6E63] hover:text-[#3A2923]'"
          @click="selectTab('details')"
        >
          <Icon name="heroicons:building-storefront" class="size-4.5 transition-colors" :class="activeTab === 'details' ? 'text-[#A96746]' : 'text-[#8C6E63] group-hover:text-[#3A2923]'" />
          <span>Branch Details</span>
          <span
            v-if="activeTab === 'details'"
            class="absolute inset-x-0 -bottom-px h-0.5 bg-[#3A2923] rounded-full"
          />
        </button>

        <button
          type="button"
          data-walkthrough="cafe-employees-tab"
          class="group relative pb-3 pt-1 text-sm font-semibold transition-colors duration-150 flex items-center gap-2 cursor-pointer focus-visible:outline-none active:scale-[0.98]"
          :class="activeTab === 'employees' ? 'text-[#3A2923]' : 'text-[#8C6E63] hover:text-[#3A2923]'"
          @click="selectTab('employees')"
        >
          <Icon name="heroicons:users" class="size-4.5 transition-colors" :class="activeTab === 'employees' ? 'text-[#A96746]' : 'text-[#8C6E63] group-hover:text-[#3A2923]'" />
          <span>Employees</span>
          <span
            v-if="activeTab === 'employees'"
            class="absolute inset-x-0 -bottom-px h-0.5 bg-[#3A2923] rounded-full"
          />
        </button>
      </nav>

      <!-- Smooth Content Transition after Loading -->
      <Transition name="fade-content" mode="out-in">
        <!-- Loading Spinner -->
        <div v-if="loading" key="loading" class="flex flex-col items-center justify-center py-20 gap-3">
          <div class="relative flex items-center justify-center">
            <div class="size-9 rounded-full border-2 border-[#EDD8CC] border-t-[#7D5A50] animate-spin" />
          </div>
          <p class="text-xs font-medium text-[#8C6E63] animate-pulse">Loading cafe details...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="errorMessage" key="error" class="mt-4 bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0" />
          <span class="text-sm font-medium">{{ errorMessage }}</span>
          <button class="ml-auto text-sm font-bold underline hover:text-red-900" @click="fetchBranch">Retry</button>
        </div>

        <!-- Loaded Content with Staggered Card Entrance -->
        <div v-else-if="branch" key="content" class="fade-reveal">
          <Transition name="fade-tab" mode="out-in">
            <!-- Branch Details Tab -->
            <div v-if="activeTab === 'details'" key="details" class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <!-- Branch Information -->
              <section class="cafe-card cafe-card-1 bg-white border border-[#EDD8CC] rounded-2xl p-6 shadow-sm flex flex-col gap-5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h2 class="text-xl sm:text-2xl font-bold text-[#3D2B24] flex items-center gap-2">
                    <Icon name="heroicons:information-circle" class="size-6 text-[#A96746]" />
                    Branch Information
                  </h2>
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
                    class="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-2xl object-cover shrink-0 border border-[#EDD8CC] shadow-sm"
                  />
                  <div v-else class="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-2xl bg-[#F4ECE1] border border-[#EDD8CC] flex items-center justify-center shrink-0 shadow-sm">
                    <Icon name="heroicons:building-storefront" class="w-10 h-10 text-[#9E7060]" />
                  </div>

                  <div class="flex-1 min-w-0 flex flex-col gap-3">
                    <div class="flex flex-col gap-1">
                      <p class="text-xs font-bold text-[#9E7060] uppercase tracking-wider">Branch Name</p>
                      <p class="text-base font-semibold text-[#3D2B24] break-words">{{ branch.branch_name }}</p>
                    </div>
                    <div class="flex flex-col gap-1">
                      <p class="text-xs font-bold text-[#9E7060] uppercase tracking-wider">{{ isMain ? 'Main Address' : 'Address' }}</p>
                      <p class="text-sm sm:text-base font-medium text-[#3D2B24] break-words">{{ branch.address || '—' }}</p>
                    </div>
                  </div>
                </div>

                <hr class="border-t border-[#EDD8CC]" />

                <div class="flex flex-col gap-3">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1 min-w-0">
                      <p class="text-xs font-bold text-[#9E7060] uppercase tracking-wider">Email Address</p>
                      <p class="text-sm sm:text-base font-medium text-[#3D2B24] break-all">{{ branch.cafe_email || '—' }}</p>
                    </div>
                    <div class="flex flex-col gap-1 min-w-0">
                      <p class="text-xs font-bold text-[#9E7060] uppercase tracking-wider">Phone Number</p>
                      <p class="text-sm sm:text-base font-medium text-[#3D2B24]">{{ branch.cafe_phonenumber || '—' }}</p>
                    </div>
                  </div>
                </div>
              </section>

              <!-- BIR Document -->
              <section class="cafe-card cafe-card-2 bg-white border border-[#EDD8CC] rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <h2 class="text-xl sm:text-2xl font-bold text-[#3D2B24] flex items-center gap-2">
                  <Icon name="heroicons:document-text" class="size-6 text-[#A96746]" />
                  BIR Document
                </h2>

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
                  </div>
                </div>

                <p v-else class="text-sm text-[#9E7060]">No BIR document uploaded for this branch.</p>
              </section>

              <!-- POS Registers (full width, under both cards) -->
              <div class="cafe-card cafe-card-3 lg:col-span-2">
                <PosDevicesCard :branch-uuid="branch.uuid" scope="owner" />
              </div>
            </div>

            <!-- Employees Tab: the list, or one employee's details -->
            <div v-else key="employees" class="mt-4">
              <EmployeesDetails
                v-if="viewedEmployee"
                :branch-uuid="branch.uuid"
                :employee-uuid="viewedEmployee"
                @back="backToEmployees"
              />
              <EmployeesTab v-else :branch-uuid="branch.uuid" @view-employee="viewEmployee($event.uuid)" />
            </div>
          </Transition>
        </div>
      </Transition>
    </main>
  </div>
</template>

<style scoped>
/* Page entrance */
.cafe-entrance {
  animation: cafePageEnter 260ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

@keyframes cafePageEnter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Smooth content transition after loading */
.fade-content-enter-active,
.fade-content-leave-active {
  transition: opacity 240ms cubic-bezier(0.23, 1, 0.32, 1), transform 240ms cubic-bezier(0.23, 1, 0.32, 1);
}

.fade-content-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-content-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Staggered card entrance on load */
.fade-reveal .cafe-card {
  opacity: 0;
  animation: cardGlideUp 280ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

.fade-reveal .cafe-card-1 {
  animation-delay: 0ms;
}

.fade-reveal .cafe-card-2 {
  animation-delay: 60ms;
}

.fade-reveal .cafe-card-3 {
  animation-delay: 120ms;
}

@keyframes cardGlideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Tab change transition */
.fade-tab-enter-active,
.fade-tab-leave-active {
  transition: opacity 180ms cubic-bezier(0.23, 1, 0.32, 1), transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
}

.fade-tab-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-tab-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  .cafe-entrance,
  .fade-reveal .cafe-card {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .fade-content-enter-active,
  .fade-content-leave-active,
  .fade-tab-enter-active,
  .fade-tab-leave-active {
    transition: opacity 120ms ease !important;
    transform: none !important;
  }
  .fade-content-enter-from,
  .fade-content-leave-to,
  .fade-tab-enter-from,
  .fade-tab-leave-to {
    transform: none !important;
  }
}
</style>
