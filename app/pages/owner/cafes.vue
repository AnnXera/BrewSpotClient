<script setup lang="ts">
import type { BranchSummary } from '~/services/OwnerProfileService'
import { usePlanFeature } from '~/composables/usePlanFeature'

definePageMeta({
  role: 'Cafe Owner',
})

const links = [
  { label: 'Dashboard', to: '/owner/dashboard', icon: 'squares-2x2' },
  { label: 'Cafe Management', to: '/owner/cafes', icon: 'building-storefront' },
  { label: 'Menu Management', to: '/owner/menu-management', icon: 'book-open' },
  { label: 'Subscription', to: '/owner/subscription', icon: 'credit-card' },
]

const ownerService = useOwnerProfileService()
const { hasFeature, fetchCurrentSubscription } = usePlanFeature()

const branches = ref<BranchSummary[]>([])
const loading = ref(false)
const errorMessage = ref('')

const currentPage = ref(1)
const lastPage = ref(1)
const perPage = 6

const search = ref('')
const status = ref('')

const canAddBranch = computed(() => hasFeature('multi_branch'))

async function fetchBranches() {
  errorMessage.value = ''
  loading.value = true
  try {
    const res = await ownerService.getBranches(perPage, currentPage.value, search.value, status.value)
    if (res.success) {
      branches.value = res.branches.data
      currentPage.value = res.branches.current_page
      lastPage.value = res.branches.last_page
      selectedBranches.value = [] // clear selection on page change
    }
  } catch (e) {
    branches.value = []
    errorMessage.value = 'Failed to load cafe branches. Please try again or check your connection.'
  } finally {
    loading.value = false
  }
}

function goToPage(page: number) {
  if (page < 1 || page > lastPage.value || page === currentPage.value) return
  currentPage.value = page
  fetchBranches()
}

onMounted(() => {
  fetchCurrentSubscription(true, true) // force refetch, but silently
  fetchBranches()
})

watch(status, () => {
  currentPage.value = 1
  fetchBranches()
})

let searchTimeout: any = null
watch(search, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchBranches()
  }, 300)
})

// statusColor function moved to BranchCard.vue

const selectedBranches = ref<string[]>([])
const bulkLoading = ref(false)

function toggleSelectAll(checked: boolean) {
  selectedBranches.value = checked ? branches.value.map(b => b.uuid) : []
}

async function bulkUpdateStatus(newStatus: string) {
  if (!selectedBranches.value.length || bulkLoading.value) return
  bulkLoading.value = true
  
  const promises = selectedBranches.value.map(uuid => ownerService.updateBranch(uuid, { status: newStatus }))
  await Promise.allSettled(promises)
  
  selectedBranches.value = []
  bulkLoading.value = false
  await fetchBranches()
}

function viewDetails(uuid: string) {
  navigateTo(`/owner/branches/${uuid}`)
}
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FDF3E7]">
    <NavBar :links="links" />
    <main class="flex-1 p-8">
      <h1 class="font-display text-[32px] font-extrabold text-[#3D2B24] tracking-tight mb-6">Cafe Management</h1>

      <div class="bg-white border border-[#EEDFC4] rounded-[20px] shadow-sm flex flex-col">
        <CafeManagementCafeFilterBar 
          v-model:search="search"
          v-model:status="status"
          :selected-count="selectedBranches.length"
          :total-count="branches.length"
          :can-add-branch="canAddBranch"
          :bulk-loading="bulkLoading"
          @toggle-select-all="toggleSelectAll"
          @bulk-action="bulkUpdateStatus"
          @cancel-selection="selectedBranches = []"
        />

        <!-- List Content -->
        <div class="p-6 flex flex-col gap-4">
          <div v-if="errorMessage" class="bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0" />
            <span class="text-sm font-medium">{{ errorMessage }}</span>
            <button @click="fetchBranches" class="ml-auto text-sm font-bold underline hover:text-red-900 focus:outline-none">Retry</button>
          </div>

          <div v-if="loading" class="flex justify-center items-center py-12">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-[#B4846C]" />
          </div>

          <div v-else-if="!branches.length" class="text-center py-12 text-[#3B1F0E]/50">
            <p>No cafe branches found.</p>
          </div>

          <template v-else>
            <CafeManagementBranchCard 
              v-for="branch in branches" 
              :key="branch.uuid" 
              :branch="branch"
              :selected="selectedBranches.includes(branch.uuid)"
              @update:selected="$event ? selectedBranches.push(branch.uuid) : selectedBranches = selectedBranches.filter(id => id !== branch.uuid)"
              @view="viewDetails"
            />
          </template>
        </div>

        <!-- Pagination -->
        <div class="border-t border-[#EEDFC4] p-4 flex items-center justify-center">
          <div class="flex items-center gap-6 text-[#9E7060] text-sm font-medium">
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              aria-label="Previous page"
              class="disabled:opacity-50 disabled:cursor-not-allowed hover:text-[#3D2B24] transition-colors p-1"
            >
              <Icon name="heroicons:chevron-left" class="w-4 h-4" />
            </button>
            <span>Page {{ currentPage }} of {{ lastPage }}</span>
            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === lastPage"
              aria-label="Next page"
              class="disabled:opacity-50 disabled:cursor-not-allowed hover:text-[#3D2B24] transition-colors p-1"
            >
              <Icon name="heroicons:chevron-right" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
