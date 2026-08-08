<!-- pages/admin/owners/[uuid].vue -->
<script setup lang="ts">
definePageMeta({
  role: 'Admin',
})

interface DocumentItem {
  file_id?: number
  user_doc_id?: number
  cafe_doc_id?: number
  branch_doc_id?: number
  id_type?: string
  doc_type?: string
  download_url: string
  uploaded_at?: string
  registered_at?: string
}

interface BranchItem {
  uuid: string
  branch_name: string
  cafe_picture: string | null
  cafe_email: string
  cafe_phonenumber: string
  address: string
  branch_type: string
  status: string
  documents: DocumentItem[]
}

interface CafeItem {
  uuid: string
  cafe_name: string
  documents: DocumentItem[]
  branches: BranchItem[]
}

interface OwnerDetail {
  uuid: string
  firstname: string
  middlename: string | null
  lastname: string
  username: string | null
  email: string
  phone_number: string | null
  status: string
  email_verified_at: string | null
  role?: { uuid: string; role_name: string }
  created_at: string | null
}

interface SubscriptionDetail {
  uuid: string
  status: string
  plan_name: string | null
  price: number | string | null
  max_branches: number | null
  start_date: string | null
  end_date: string | null
  payment_method: string | null
}

interface PaymentHistoryItem {
  transaction_id: string
  date: string | null
  description: string
  amount: string
  status: string
}

const route = useRoute()
const uuid = route.params.uuid as string

const links = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'squares-2x2' },
  { label: 'Owner Management', to: '/admin/ownermanagement', icon: 'users' },
  { label: 'Approval List', to: '/admin/approvals', icon: 'check-circle' },
  { label: 'Subscriptions', to: '/admin/subscriptions', icon: 'credit-card' },
  { label: 'Payment History', to: '/admin/payments', icon: 'clipboard' },
]

const ownerService = useOwnerManagementService()

// Resolve media paths returned by the backend. Laravel often returns 
// "/storage/..." or "storage/..."; convert to absolute URL using the
// apiBase runtime config (strip any trailing /api).
const runtime = useRuntimeConfig()
function resolveMediaUrl(p: string | null) {
  if (!p) return ''
  if (p.startsWith('http')) return p
  const apiBase = (runtime.public.apiBase || '').replace(/\/api\/?$/i, '')
  if (!apiBase) return p
  if (p.startsWith('/')) return apiBase + p
  return apiBase + '/' + p
}

const loading = ref(true)
const errorMessage = ref('')
const statusChangeLoading = ref(false)

const owner = ref<OwnerDetail | null>(null)
const ownerDocuments = ref<DocumentItem[]>([])
const cafes = ref<CafeItem[]>([])
const subscription = ref<SubscriptionDetail | null>(null)
const paymentHistory = ref<PaymentHistoryItem[]>([])

const tab = ref<'profile' | 'branches'>('profile')

const primaryCafe = computed(() => cafes.value[0] ?? null)
const primaryBranch = computed(() => primaryCafe.value?.branches?.[0] ?? null)
const branchCount = computed(() =>
  cafes.value.reduce((total, cafe) => total + (cafe.branches?.length ?? 0), 0)
)

const ownerName = computed(() =>
  owner.value ? `${owner.value.firstname ?? ''} ${owner.value.lastname ?? ''}`.trim() || '—' : '—'
)

function initials(name: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase()
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function formatPrice(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0.00'
  return Number(value).toFixed(2)
}

const idTypeLabels: Record<string, string> = {
  national_id: 'National ID',
  passport: 'Passport',
  drivers_license: "Driver's License",
  sss: 'SSS ID',
  philhealth: 'PhilHealth ID',
  pagibig: 'Pag-IBIG ID',
  voters_id: "Voter's ID",
}

function ownerDocLabel(doc: DocumentItem) {
  return idTypeLabels[doc.id_type ?? ''] ?? doc.id_type ?? 'Document'
}

function cafeDocLabel(doc: DocumentItem) {
  const map: Record<string, string> = {
    DTI: 'DTI Certificate',
    SEC: 'SEC Certificate',
  }
  return map[doc.doc_type ?? ''] ?? (doc.doc_type ? `${doc.doc_type} Document` : 'Document')
}

function branchDocLabel(doc: DocumentItem) {
  const map: Record<string, string> = {
    BIR: 'BIR Certificate',
    mayors_permit: "Mayor's Permit",
    sanitary_permit: 'Sanitary Permit',
  }
  return map[doc.doc_type ?? ''] ?? (doc.doc_type ? `${doc.doc_type} Document` : 'Document')
}

function planTierLabel(planName: string | null) {
  if (!planName) return null
  const upper = planName.toUpperCase()
  if (upper.includes('PREMIUM')) return 'PREMIUM'
  if (upper.includes('ENTERPRISE')) return 'ENTERPRISE'
  if (upper.includes('BASIC')) return 'BASIC'
  if (upper.includes('TRIAL')) return 'TRIAL'
  return upper
}

const paymentStatusClasses: Record<string, string> = {
  succeeded: 'bg-[#E3F3E7] text-[#1F8A4C]',
  success: 'bg-[#E3F3E7] text-[#1F8A4C]',
  active: 'bg-[#E3F3E7] text-[#1F8A4C]',
  pending: 'bg-[#FBF0D9] text-[#B4842A]',
  failed: 'bg-[#FCE4E4] text-[#D9534F]',
  cancelled: 'bg-[#FCE4E4] text-[#D9534F]',
}

function paymentStatusClass(status: string) {
  return paymentStatusClasses[status?.toLowerCase()] ?? 'bg-[#F0E3CE] text-[#8B6656]'
}

// --- Pagination for payment history table (client-side, backend returns a flat list) ---
const currentPage = ref(1)
const perPage = 10
const lastPage = computed(() => Math.max(1, Math.ceil(paymentHistory.value.length / perPage)))
const pagedPayments = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return paymentHistory.value.slice(start, start + perPage)
})
function goToPage(page: number) {
  if (page < 1 || page > lastPage.value) return
  currentPage.value = page
}

async function fetchOwner() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await ownerService.show(uuid)
    if (res.success) {
      owner.value = res.owner
      ownerDocuments.value = res.owner_documents ?? []
      cafes.value = res.cafes ?? []
      subscription.value = res.subscription ?? null
      paymentHistory.value = res.payment_history ?? []
      currentPage.value = 1
    } else {
      errorMessage.value = 'Could not load this owner.'
    }
  } catch (e: any) {
    errorMessage.value = e?.data?.message ?? 'Could not load this owner.'
  } finally {
    loading.value = false
  }
}

const canSuspend = computed(() => owner.value?.status === 'active')
const canReactivate = computed(() => owner.value?.status === 'suspended')

const confirmDialog = ref<{ newStatus: 'active' | 'suspended' } | null>(null)

function requestChange(newStatus: 'active' | 'suspended') {
  confirmDialog.value = { newStatus }
}

function cancelChange() {
  confirmDialog.value = null
}

async function confirmChange() {
  if (!confirmDialog.value || !owner.value) return
  const { newStatus } = confirmDialog.value
  confirmDialog.value = null

  const previousStatus = owner.value.status
  statusChangeLoading.value = true
  owner.value.status = newStatus // optimistic

  try {
    const res = await ownerService.updateStatus(owner.value.uuid, newStatus)
    if (!res.success) {
      owner.value.status = previousStatus
      errorMessage.value = res.message ?? 'Could not update status.'
    } else {
      // refresh full record so cascaded branch/subscription changes are reflected
      await fetchOwner()
    }
  } catch (e: any) {
    if (owner.value) owner.value.status = previousStatus
    errorMessage.value = e?.data?.message ?? 'Could not update status.'
  } finally {
    statusChangeLoading.value = false
  }
}

onMounted(() => {
  fetchOwner()
})
</script>

<template>
  <div class="flex min-h-screen bg-[#FDF3E7]">
    <NavBar :links="links" />

    <main class="flex-1 p-12">
      <!-- Breadcrumb -->
      <div class="font-sans text-sm mb-2">
        <NuxtLink to="/admin/ownermanagement" class="text-[#9E7060] hover:text-[#3B1F0E] transition-colors">
          Owner Management
        </NuxtLink>
        <span class="text-[#9E7060] mx-1.5">/</span>
        <span class="text-[#3B1F0E] font-semibold">Owner Details</span>
      </div>

      <!-- Header -->
      <header class="flex items-center justify-between mb-8">
        <h1 class="font-display text-4xl font-bold text-[#3B1F0E]">{{ ownerName }}</h1>

        <button
          v-if="canSuspend"
          type="button"
          :disabled="statusChangeLoading"
          class="rounded-full px-5 py-2.5 font-sans text-sm font-semibold bg-[#FCE4E4] text-[#D9534F] hover:bg-[#F8D0D0] transition-colors disabled:opacity-50"
          @click="requestChange('suspended')"
        >
          Suspend Account
        </button>
        <button
          v-else-if="canReactivate"
          type="button"
          :disabled="statusChangeLoading"
          class="rounded-full px-5 py-2.5 font-sans text-sm font-semibold bg-[#E3F3E7] text-[#1F8A4C] hover:bg-[#D2EBD8] transition-colors disabled:opacity-50"
          @click="requestChange('active')"
        >
          Reactivate Account
        </button>
      </header>

      <p v-if="errorMessage" class="mb-6 font-sans text-sm text-[#D9534F]">{{ errorMessage }}</p>

      <div v-if="loading" class="font-sans text-sm text-[#3B1F0E]/50 py-10 text-center">
        Loading owner details…
      </div>

      <template v-else-if="owner">
        <!-- Tabs -->
        <div class="flex gap-8 border-b border-[#EEDFC4] mb-8">
          <button
            type="button"
            class="pb-3 font-sans text-sm transition-colors border-b-2 -mb-px"
            :class="tab === 'profile'
              ? 'border-[#3B1F0E] text-[#3B1F0E] font-semibold'
              : 'border-transparent text-[#9E7060] hover:text-[#3B1F0E]'"
            @click="tab = 'profile'"
          >
            Profile
          </button>
          <button
            type="button"
            class="pb-3 font-sans text-sm transition-colors border-b-2 -mb-px"
            :class="tab === 'branches'
              ? 'border-[#3B1F0E] text-[#3B1F0E] font-semibold'
              : 'border-transparent text-[#9E7060] hover:text-[#3B1F0E]'"
            @click="tab = 'branches'"
          >
            Cafe Branches ({{ branchCount }})
          </button>
        </div>

        <!-- PROFILE TAB -->
        <section v-if="tab === 'profile'">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <!-- Account Details -->
            <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-display text-lg font-semibold text-[#3B1F0E]">Account Details</h2>
                <StatusBadge :status="owner.status" />
              </div>

              <div class="flex items-center gap-3 pb-4 border-b border-[#F3E7D2]">
                <div class="w-12 h-12 rounded-full bg-[#7D5A50] flex items-center justify-center shrink-0">
                  <span class="font-display text-sm font-semibold text-[#FFF0D1]">{{ initials(ownerName) }}</span>
                </div>
                <div>
                  <p class="font-sans text-base font-semibold text-[#3B1F0E]">{{ ownerName }}</p>
                  <p class="font-sans text-xs text-[#9E7060]">ID: {{ owner.uuid.slice(0, 8).toUpperCase() }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Email Address</p>
                  <p class="font-sans text-sm text-[#3B1F0E] mt-1 break-all">{{ owner.email }}</p>
                </div>
                <div>
                  <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Phone Contact</p>
                  <p class="font-sans text-sm text-[#3B1F0E] mt-1">{{ owner.phone_number ?? '—' }}</p>
                </div>
                <div>
                  <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Member Since</p>
                  <p class="font-sans text-sm text-[#3B1F0E] mt-1">{{ formatDate(owner.created_at) }}</p>
                </div>
                <div>
                  <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Total Cafe Branches</p>
                  <p class="font-sans text-sm text-[#3B1F0E] mt-1">{{ branchCount }} Branch{{ branchCount === 1 ? '' : 'es' }}</p>
                </div>
              </div>
            </div>

            <!-- Cafe Details -->
            <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6">
              <h2 class="font-display text-lg font-semibold text-[#3B1F0E] mb-4">
                {{ primaryCafe?.cafe_name ?? 'Cafe' }} Details
              </h2>

              <div class="flex items-center gap-3 pb-4 border-b border-[#F3E7D2]">
                <img
                  v-if="primaryBranch?.cafe_picture"
                                    :src="resolveMediaUrl(primaryBranch.cafe_picture)"
                  alt=""
                  class="w-12 h-12 rounded-xl object-cover shrink-0"
                />
                <div v-else class="w-12 h-12 rounded-xl bg-[#F0E3CE] flex items-center justify-center shrink-0">
                  <Icon name="heroicons:building-storefront" class="w-6 h-6 text-[#8B6656]" />
                </div>
                <p class="font-sans text-base font-semibold text-[#3B1F0E]">
                  {{ primaryBranch?.branch_name ?? 'No branch on record' }}
                </p>
              </div>

              <div v-if="primaryBranch" class="mt-4 space-y-4">
                <div>
                  <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Main Address</p>
                  <p class="font-sans text-sm text-[#3B1F0E] mt-1">{{ primaryBranch.address }}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Email Address</p>
                    <p class="font-sans text-sm text-[#3B1F0E] mt-1 break-all">{{ primaryBranch.cafe_email }}</p>
                  </div>
                  <div>
                    <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Phone Number</p>
                    <p class="font-sans text-sm text-[#3B1F0E] mt-1">{{ primaryBranch.cafe_phonenumber }}</p>
                  </div>
                </div>
              </div>
              <p v-else class="font-sans text-sm text-[#3B1F0E]/50 mt-4">No cafe branch has been registered yet.</p>
            </div>

            <!-- Active Subscription -->
            <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-display text-lg font-semibold text-[#3B1F0E]">
                  {{ subscription ? 'Active Subscription' : 'Subscription' }}
                </h2>
                <span
                  v-if="subscription && planTierLabel(subscription.plan_name)"
                  class="rounded-full px-3 py-1 font-sans text-xs font-semibold bg-[#F0E3CE] text-[#8B6656]"
                >
                  {{ planTierLabel(subscription.plan_name) }}
                </span>
              </div>

              <template v-if="subscription">
                <p class="pb-4 border-b border-[#F3E7D2]">
                  <span class="font-display text-3xl font-bold text-[#3B1F0E]">${{ formatPrice(subscription.price) }}</span>
                  <span class="font-sans text-sm text-[#9E7060]"> / month</span>
                </p>
                <p class="font-sans text-sm text-[#9E7060] mt-2">
                  {{ subscription.plan_name }}<span v-if="subscription.max_branches"> (up to {{ subscription.max_branches }} branches)</span>
                </p>

                <div class="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Payment Method</p>
                    <p class="font-sans text-sm text-[#3B1F0E] mt-1">{{ subscription.payment_method ?? '—' }}</p>
                  </div>
                  <div>
                    <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Next Payment</p>
                    <p class="font-sans text-sm text-[#3B1F0E] mt-1">{{ formatDate(subscription.end_date) }}</p>
                  </div>
                  <div class="col-span-2">
                    <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Status</p>
                    <p class="font-sans text-sm text-[#3B1F0E] mt-1 capitalize">{{ subscription.status }}</p>
                  </div>
                </div>
              </template>
              <p v-else class="font-sans text-sm text-[#3B1F0E]/50">This owner has no active subscription.</p>
            </div>
          </div>

          <!-- Documents -->
          <h2 class="font-display text-2xl font-bold text-[#3B1F0E] mb-4">Documents</h2>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6">
              <h3 class="font-display text-base font-semibold text-[#3B1F0E] mb-4">Owner Documents</h3>
              <div v-if="!ownerDocuments.length" class="font-sans text-sm text-[#3B1F0E]/50">No documents uploaded.</div>
              <div
                v-for="doc in ownerDocuments"
                :key="doc.user_doc_id"
                class="flex items-center justify-between gap-3 rounded-xl border border-[#F3E7D2] p-4"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-[#FBEBC9] flex items-center justify-center shrink-0">
                    <Icon name="heroicons:document-text" class="w-5 h-5 text-[#B4842A]" />
                  </div>
                  <div>
                    <p class="font-sans text-sm font-medium text-[#3B1F0E]">{{ ownerDocLabel(doc) }}</p>
                    <p class="font-sans text-xs text-[#9E7060]">Uploaded {{ formatDate(doc.uploaded_at) }}</p>
                  </div>
                </div>
                <a
                  :href="doc.download_url"
                  target="_blank"
                  rel="noopener"
                  class="rounded-full px-4 py-1.5 font-sans text-xs font-semibold border border-[#EEDFC4] text-[#3B1F0E] hover:bg-[#FBF2E1] transition-colors shrink-0"
                >
                  View
                </a>
              </div>
            </div>

            <div class="bg-white border border-[#EEDFC4] rounded-2xl p-6">
              <h3 class="font-display text-base font-semibold text-[#3B1F0E] mb-4">Cafe Documents</h3>
              <div v-if="!primaryCafe?.documents?.length" class="font-sans text-sm text-[#3B1F0E]/50">No documents uploaded.</div>
              <div
                v-for="doc in primaryCafe?.documents"
                :key="doc.cafe_doc_id"
                class="flex items-center justify-between gap-3 rounded-xl border border-[#F3E7D2] p-4"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-[#FBEBC9] flex items-center justify-center shrink-0">
                    <Icon name="heroicons:document-text" class="w-5 h-5 text-[#B4842A]" />
                  </div>
                  <div>
                    <p class="font-sans text-sm font-medium text-[#3B1F0E]">{{ cafeDocLabel(doc) }}</p>
                    <p class="font-sans text-xs text-[#9E7060]">Uploaded {{ formatDate(doc.registered_at) }}</p>
                  </div>
                </div>
                <a
                  :href="doc.download_url"
                  target="_blank"
                  rel="noopener"
                  class="rounded-full px-4 py-1.5 font-sans text-xs font-semibold border border-[#EEDFC4] text-[#3B1F0E] hover:bg-[#FBF2E1] transition-colors shrink-0"
                >
                  View
                </a>
              </div>
            </div>
          </div>

          <!-- Payment history -->
          <h2 class="font-display text-2xl font-bold text-[#3B1F0E] mb-4">Recent Activity &amp; Payment History</h2>
          <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="bg-[#FBF2E1] border-b border-[#F3E7D2]">
                    <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Transaction ID</th>
                    <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Date</th>
                    <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Activity / Plan Type</th>
                    <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3 text-right">Amount</th>
                    <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!pagedPayments.length">
                    <td colspan="5" class="px-6 py-10 text-center font-sans text-sm text-[#3B1F0E]/50">
                      No activity recorded yet.
                    </td>
                  </tr>
                  <tr
                    v-for="item in pagedPayments"
                    :key="item.transaction_id"
                    class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FFFAF0] transition-colors"
                  >
                    <td class="px-6 py-4 font-sans text-sm font-semibold text-[#3B1F0E]">{{ item.transaction_id }}</td>
                    <td class="px-6 py-4 font-sans text-sm text-[#3B1F0E]">{{ formatDate(item.date) }}</td>
                    <td class="px-6 py-4 font-sans text-sm text-[#3B1F0E]">{{ item.description }}</td>
                    <td class="px-6 py-4 font-sans text-sm font-semibold text-[#3B1F0E] text-right">${{ item.amount }}</td>
                    <td class="px-6 py-4">
                      <span
                        class="inline-flex items-center rounded-full px-3 py-1 font-sans text-xs font-medium capitalize"
                        :class="paymentStatusClass(item.status)"
                      >
                        {{ item.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex items-center justify-center gap-3 p-6">
              <button
                class="flex items-center justify-center p-3 text-[#9E7060] disabled:opacity-30 hover:text-[#3B1F0E] transition-colors"
                :disabled="currentPage === 1"
                @click="goToPage(currentPage - 1)"
              >
                <Icon name="heroicons:chevron-left-20-solid" class="w-6 h-6" />
              </button>
              <span class="font-sans text-sm text-[#9E7060]">Page {{ currentPage }} of {{ lastPage }}</span>
              <button
                class="flex items-center justify-center p-3 text-[#9E7060] disabled:opacity-30 hover:text-[#3B1F0E] transition-colors"
                :disabled="currentPage === lastPage"
                @click="goToPage(currentPage + 1)"
              >
                <Icon name="heroicons:chevron-right-20-solid" class="w-6 h-6" />
              </button>
            </div>
          </div>
        </section>

        <!-- CAFE BRANCHES TAB -->
        <section v-else>
          <div v-if="!primaryCafe?.branches?.length" class="bg-white border border-[#EEDFC4] rounded-2xl p-10 text-center">
            <p class="font-sans text-sm text-[#3B1F0E]/50">No branches registered for this owner.</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="branch in primaryCafe.branches"
              :key="branch.uuid"
              class="bg-white border border-[#EEDFC4] rounded-2xl p-6"
            >
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <img
                    v-if="branch.cafe_picture"
                    :src="resolveMediaUrl(branch.cafe_picture)"
                    alt=""
                    class="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                  <div v-else class="w-12 h-12 rounded-xl bg-[#F0E3CE] flex items-center justify-center shrink-0">
                    <Icon name="heroicons:building-storefront" class="w-6 h-6 text-[#8B6656]" />
                  </div>
                  <div>
                    <p class="font-sans text-base font-semibold text-[#3B1F0E]">{{ branch.branch_name }}</p>
                    <p class="font-sans text-xs text-[#9E7060] capitalize">{{ branch.branch_type }} branch</p>
                  </div>
                </div>
                <StatusBadge :status="branch.status" />
              </div>

              <div class="space-y-3 pt-4 border-t border-[#F3E7D2]">
                <div>
                  <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Address</p>
                  <p class="font-sans text-sm text-[#3B1F0E] mt-1">{{ branch.address }}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Email</p>
                    <p class="font-sans text-sm text-[#3B1F0E] mt-1 break-all">{{ branch.cafe_email }}</p>
                  </div>
                  <div>
                    <p class="font-sans text-xs font-semibold tracking-wide text-[#9E7060] uppercase">Phone</p>
                    <p class="font-sans text-sm text-[#3B1F0E] mt-1">{{ branch.cafe_phonenumber }}</p>
                  </div>
                </div>
              </div>

              <div v-if="branch.documents?.length" class="mt-4 pt-4 border-t border-[#F3E7D2] space-y-2">
                <div
                  v-for="doc in branch.documents"
                  :key="doc.branch_doc_id"
                  class="flex items-center justify-between gap-3"
                >
                  <span class="font-sans text-sm text-[#3B1F0E]">{{ branchDocLabel(doc) }}</span>
                  <a
                    :href="doc.download_url"
                    target="_blank"
                    rel="noopener"
                    class="rounded-full px-3 py-1 font-sans text-xs font-semibold border border-[#EEDFC4] text-[#3B1F0E] hover:bg-[#FBF2E1] transition-colors shrink-0"
                  >
                    View
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>

  <ConfirmDialog
    :open="!!confirmDialog"
    :title="confirmDialog?.newStatus === 'suspended' ? 'Suspend this owner?' : 'Reactivate this owner?'"
    :message="confirmDialog?.newStatus === 'suspended'
      ? `This will suspend ${ownerName}, deactivate their branches, and cancel their active subscription. This action can be reversed later.`
      : `This will reactivate ${ownerName} and restore their branches.`"
    :confirm-label="confirmDialog?.newStatus === 'suspended' ? 'Suspend' : 'Reactivate'"
    :danger="confirmDialog?.newStatus === 'suspended'"
    @confirm="confirmChange"
    @cancel="cancelChange"
  />
</template>