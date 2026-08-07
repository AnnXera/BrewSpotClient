<!-- pages/admin/ownermanagement.vue -->
<script setup lang="ts">
import type { OwnerListItem, OwnerStats } from '~/services/OwnerManagementService'
import { mockOwners, mockOwnerStats } from '~/mocks/mockOwners'

definePageMeta({
  role: 'Admin',
})

// DEV/DEMO MODE — flip to false once real owners exist in the database.
// While true, the page never calls the API; it filters/paginates mockOwners
// locally so search, status, and date filters are all testable right now.
const USE_MOCK_DATA = false

const links = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'squares-2x2' },
  { label: 'Owner Management', to: '/admin/ownermanagement', icon: 'users' },
  { label: 'Approval List', to: '/admin/approvals', icon: 'check-circle' },
  { label: 'Subscriptions', to: '/admin/subscriptions', icon: 'credit-card' },
  { label: 'Payment History', to: '/admin/payments', icon: 'clipboard' },
]

const ownerService = useOwnerManagementService()

const stats = ref<OwnerStats | null>(null)
const owners = ref<OwnerListItem[]>([])
const loading = ref(false)

const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)
const perPage = 15

const search = ref('')
const status = ref('')
const date = ref('')
const dateInputEl = ref<HTMLInputElement | null>(null)

function openDatePicker() {
  // showPicker() is supported in current Chrome/Edge/Safari; falls back to
  // a plain focus() (which still lets the user open the native picker) elsewhere.
  const el = dateInputEl.value as any
  if (el?.showPicker) {
    el.showPicker()
  } else {
    el?.focus()
  }
}

const statusOptions = [
  { value: '', label: 'Status' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'rejected', label: 'Rejected' },
]

const avatarColors = ['#B4846C', '#8B6656', '#5C3A28', '#2C1609', '#7D5A50']

function avatarColor(index: number) {
  return avatarColors[index % avatarColors.length]
}

function initials(name: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase()
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusBadgeClasses(s: string) {
  switch (s) {
    case 'active':
      return 'bg-[#E3F3E7] text-[#1F8A4C]'
    case 'suspended':
    case 'rejected':
      return 'bg-[#FCE4E4] text-[#D9534F]'
    case 'approved':
      return 'bg-[#E3EEFB] text-[#2F6FB0]'
    case 'pending_approval':
      return 'bg-[#FBF0D9] text-[#B4842A]'
    default: // inactive, and anything else
      return 'bg-[#F0E3CE] text-[#8B6656]'
  }
}

async function fetchStats() {
  if (USE_MOCK_DATA) {
    stats.value = mockOwnerStats
    return
  }

  try {
    const res = await ownerService.stats()
    if (res.success) stats.value = res.stats
  } catch {
    // stat cards just show placeholders if this fails
  }
}

function getFilteredMockOwners(): OwnerListItem[] {
  let list = [...mockOwners]

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.cafe_name ?? '').toLowerCase().includes(q)
    )
  }

  if (status.value) {
    list = list.filter((o) => o.status === status.value)
  }

  if (date.value) {
    list = list.filter((o) => o.date_joined?.slice(0, 10) === date.value)
  }

  return list
}

async function fetchOwners() {
  loading.value = true

  if (USE_MOCK_DATA) {
    // small artificial delay so the loading state is visible, same as a real request
    await new Promise((resolve) => setTimeout(resolve, 250))

    const filtered = getFilteredMockOwners()
    total.value = filtered.length
    lastPage.value = Math.max(1, Math.ceil(filtered.length / perPage))
    currentPage.value = Math.min(currentPage.value, lastPage.value)

    const start = (currentPage.value - 1) * perPage
    owners.value = filtered.slice(start, start + perPage)
    loading.value = false
    return
  }

  try {
    const res = await ownerService.list({
      per_page: perPage,
      page: currentPage.value,
      search: search.value || undefined,
      status: status.value || undefined,
      date: date.value || undefined,
    })

    if (res.success) {
      owners.value = res.owners.data
      currentPage.value = res.owners.current_page
      lastPage.value = res.owners.last_page
      total.value = res.owners.total
    }
  } catch {
    owners.value = []
  } finally {
    loading.value = false
  }
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchOwners()
  }, 400)
})

watch([status, date], () => {
  currentPage.value = 1
  fetchOwners()
})

function goToPage(page: number) {
  if (page < 1 || page > lastPage.value || page === currentPage.value) return
  currentPage.value = page
  fetchOwners()
}

const pageNumbers = computed(() => {
  const pages: number[] = []
  const span = 2
  const start = Math.max(1, currentPage.value - span)
  const end = Math.min(lastPage.value, currentPage.value + span)
  for (let p = start; p <= end; p++) pages.push(p)
  return pages
})

function viewOwner(owner: OwnerListItem) {
  navigateTo(`/admin/owners/${owner.uuid}`)
}

onMounted(() => {
  fetchStats()
  fetchOwners()
})
</script>

<template>
  <div class="flex min-h-screen bg-[#FDF3E7]">
    <NavBar :links="links" />

    <main class="flex-1 p-12">
      <!-- Header -->
      <header class="mb-8">
        <h1 class="font-display text-4xl font-bold text-[#3B1F0E]">Owner Management</h1>
        <p class="font-sans text-sm text-[#3B1F0E]/60 mt-2">
          Manage all registered cafe owners across the platform.
        </p>
      </header>

      <!-- Stat cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6">
          <p class="font-display text-3xl font-bold text-[#3B1F0E]">{{ stats?.total_owners ?? '—' }}</p>
          <p class="font-sans text-sm text-[#3B1F0E]/60 mt-1">Total Owners</p>
        </div>
        <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6">
          <p class="font-display text-3xl font-bold text-[#2E9E5B]">{{ stats?.active ?? '—' }}</p>
          <p class="font-sans text-sm text-[#3B1F0E]/60 mt-1">Active</p>
        </div>
        <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6">
          <p class="font-display text-3xl font-bold text-[#D9622B]">{{ stats?.inactive_or_suspended ?? '—' }}</p>
          <p class="font-sans text-sm text-[#3B1F0E]/60 mt-1">Inactive/Suspended</p>
        </div>
      </div>

      <!-- Table card -->
      <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden">
        <!-- Filters -->
        <div class="flex flex-col md:flex-row md:items-center gap-3 p-6 border-b border-[#F3E7D2]">
          <div class="relative flex-1 min-w-[220px]">
            <Icon
              name="heroicons:magnifying-glass"
              class="w-4 h-4 text-[#3B1F0E]/40 absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              v-model="search"
              type="text"
              placeholder="Search owner or cafe"
              class="w-full rounded-lg border border-[#EEDFC4] bg-[#FFFDF9] pl-9 pr-3 py-3 font-sans text-sm text-[#3B1F0E] placeholder:text-[#3B1F0E]/40 focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
            />
          </div>

          <div class="relative">
            <select
              v-model="status"
              class="appearance-none rounded-lg border border-[#EEDFC4] bg-[#FFFDF9] p-3 pr-9 font-sans text-sm text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
            >
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <Icon
              name="heroicons:chevron-down"
              class="w-4 h-4 text-[#3B1F0E]/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>

          <div class="relative">
            <input
              ref="dateInputEl"
              v-model="date"
              type="date"
              class="date-input-clean rounded-lg border border-[#EEDFC4] bg-[#FFFDF9] p-3 pr-9 font-sans text-sm text-[#3B1F0E] focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
            />
            <button
              type="button"
              tabindex="-1"
              class="absolute right-3 top-1/2 -translate-y-1/2"
              @click="openDatePicker"
            >
              <Icon name="heroicons:calendar-days" class="w-4 h-4 text-[#3B1F0E]/40" />
            </button>
          </div>

          <span class="font-sans text-sm text-[#3B1F0E]/60 md:ml-auto whitespace-nowrap">
            {{ total }} record{{ total === 1 ? '' : 's' }}
          </span>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-[#FBF2E1] border-b border-[#F3E7D2]">
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Owner</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Cafe</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Contacts</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Status</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Joined</th>
                <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="px-6 py-10 text-center font-sans text-sm text-[#3B1F0E]/50">
                  Loading owners…
                </td>
              </tr>
              <tr v-else-if="!owners.length">
                <td colspan="6" class="px-6 py-10 text-center font-sans text-sm text-[#3B1F0E]/50">
                  No owners found.
                </td>
              </tr>
              <tr
                v-for="(owner, index) in owners"
                :key="owner.uuid"
                class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FFFAF0] transition-colors"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      :style="{ backgroundColor: avatarColor(index) }"
                    >
                      <span class="font-display text-xs font-semibold text-[#FFF0D1]">{{ initials(owner.name) }}</span>
                    </div>
                    <span class="font-sans text-base font-medium text-[#3B1F0E]">{{ owner.name || '—' }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 font-sans text-base text-[#3B1F0E]">{{ owner.cafe_name ?? '—' }}</td>
                <td class="px-6 py-4">
                  <div class="font-sans text-base text-[#3B1F0E] leading-tight">
                    <p>{{ owner.phone_number ?? '—' }}</p>
                    <p class="text-[#3B1F0E]/60">{{ owner.email }}</p>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    :class="statusBadgeClasses(owner.status)"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-current" />
                    {{ statusLabel(owner.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 font-sans text-base text-[#3B1F0E]">{{ formatDate(owner.date_joined) }}</td>
                <td class="px-6 py-4">
                  <button
                    class="rounded-lg bg-[#3B1F0E] text-[#FDF3E7] text-xs font-semibold px-4 py-2 hover:bg-[#2C1609] transition-colors"
                    @click="viewOwner(owner)"
                  >
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="total > 0" class="flex items-center justify-center gap-3 p-6">
          <button
            class="flex items-center justify-center p-3 text-[#9E7060] disabled:opacity-30 hover:text-[#3B1F0E] transition-colors"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            <Icon name="heroicons:chevron-left-20-solid" class="w-6 h-6" />
          </button>

          <button
            v-for="p in pageNumbers"
            :key="p"
            class="p-3 font-sans text-12px transition-colors"
            :class="p === currentPage ? 'font-semibold text-[#3B1F0E]' : 'text-[#9E7060] hover:text-[#3B1F0E]'"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>

          <button
            class="flex items-center justify-center p-3 text-[#9E7060] disabled:opacity-30 hover:text-[#3B1F0E] transition-colors"
            :disabled="currentPage === lastPage"
            @click="goToPage(currentPage + 1)"
          >
            <Icon name="heroicons:chevron-right-20-solid" class="w-6 h-6" />
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Hide the browser's built-in calendar icon (Chrome/Edge/Safari) so only
   our custom heroicons:calendar-days icon shows. Firefox doesn't expose
   this pseudo-element, so its native icon will still appear there. */
.date-input-clean::-webkit-calendar-picker-indicator {
  opacity: 0;
  position: absolute;
  right: 0;
  width: 2rem;
  height: 100%;
  cursor: pointer;
}
</style>