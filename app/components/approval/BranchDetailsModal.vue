<!--app/components/approval/BranchDetailsModal.vue-->
<script setup lang="ts">
import type { ApprovalListItem } from '~/services/OwnerManagementService'

const props = defineProps<{
  open: boolean
  loading: boolean
  approval: ApprovalListItem | null
  ownerDetails: any | null
  decisionLoading: boolean
}>()

const emit = defineEmits<{
  close: []
  approve: []
  reject: []
}>()

// Snapshot payload already scopes cafe/branch to this exact approval row —
// including archived data if the branch was later rejected/superseded.
const primaryCafe = computed(() => props.ownerDetails?.cafe ?? null)

const relevantBranch = computed(() => props.ownerDetails?.branch ?? null)

const ownerFullName = computed(() => {
  const owner = props.ownerDetails?.owner
  if (!owner) return '—'
  return `${owner.firstname ?? ''} ${owner.middlename ?? ''} ${owner.lastname ?? ''}`.replace(/\s+/g, ' ').trim()
})

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
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

// cafe_picture is a public-disk column, not a BranchDocument row — served by
// the unauthenticated GET /api/branch-picture/{uuid} route.
function cafePictureUrl(branchUuid?: string | null) {
  if (!branchUuid) return null
  const config = useRuntimeConfig()
  const origin = config.public.apiBase.replace(/\/api\/?$/, '')
  return `${origin}/api/branch-picture/${branchUuid}`
}

function viewCafePicture() {
  const url = cafePictureUrl(relevantBranch.value?.uuid)
  if (url) window.open(url, '_blank')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#3B1F0E]/40 backdrop-blur-sm p-4"
      @click.self="emit('close')"
    >
      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        <!-- Scrollable Content -->
        <div class="flex-1 min-h-0 overflow-y-auto">
          <div v-if="loading" class="p-10 text-center font-sans text-sm text-[#3B1F0E]/50">Loading application…</div>

          <template v-else-if="ownerDetails && approval">
            <div class="p-6">

              <!-- Header -->
              <div class="flex items-center justify-between mb-[24px]">
                <p class="font-display text-[14px] leading-[16.5px] tracking-[0.77%] font-semibold text-[#9E7060] uppercase">
                  Branch Registration Details
                </p>

                <button type="button" class="cursor-pointer" @click="emit('close')">
                  <img src="@/assets/images/x-button.svg" class="w-[24px] h-[24px]" />
                </button>
              </div>

              <!-- Cafe / Branch Information -->
              <div class="flex items-center gap-3 pb-[24px] mb-[24px] border-b border-[#B4846C]">
                <img
                  v-if="relevantBranch?.cafe_picture"
                  :src="cafePictureUrl(relevantBranch?.uuid) ?? ''"
                  class="w-[56px] h-[56px] rounded-[12px] object-cover shrink-0"
                />
                <div v-else class="w-[56px] h-[56px] rounded-[12px] bg-[#F0E3CE] shrink-0" />

                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <p class="font-display text-[24px] font-bold text-[#3D2B24]">
                      {{ primaryCafe?.cafe_name ?? '—' }}
                    </p>

                    <StatusBadge :status="approval.status" />
                  </div>

                  <p class="font-display text-[12px] text-[#9E7060]">
                    ID: {{ relevantBranch?.uuid ?? '—' }}
                  </p>
                </div>
              </div>

              <!-- Branch Details -->
              <h3 class="font-display text-[18px] font-bold text-[#3D2B24] mb-[16px] flex items-center gap-2">
                Branch Details
                <span
                  v-if="primaryCafe?.is_archived || relevantBranch?.is_archived"
                  class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F0E3CE] text-[#8B6656]"
                >Archived</span>
              </h3>

              <div class="rounded-xl overflow-hidden border border-[#EDD8CC] mb-[24px] font-display text-[14px]">
                <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-[20px] py-[10px]">
                  <p class="font-semibold text-[#7D5A50]">Cafe Name</p>
                  <p class="text-[#3B1F0E]">{{ primaryCafe?.cafe_name ?? '—' }}</p>
                </div>

                <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-[20px] py-[10px] border-t border-[#EDD8CC]">
                  <p class="font-semibold text-[#7D5A50]">Owner</p>
                  <p class="text-[#3B1F0E]">{{ ownerFullName }}</p>
                </div>

                <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-[20px] py-[10px] border-t border-[#EDD8CC]">
                  <p class="font-semibold text-[#7D5A50]">Email</p>
                  <p class="text-[#3B1F0E]">{{ relevantBranch?.cafe_email ?? '—' }}</p>
                </div>

                <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-[20px] py-[10px] border-t border-[#EDD8CC]">
                  <p class="font-semibold text-[#7D5A50]">Phone Number</p>
                  <p class="text-[#3B1F0E]">{{ relevantBranch?.cafe_phonenumber ?? '—' }}</p>
                </div>

                <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-[20px] py-[10px] border-t border-[#EDD8CC]">
                  <p class="font-semibold text-[#7D5A50]">Address</p>
                  <p class="text-[#3B1F0E]">{{ relevantBranch?.address ?? '—' }}</p>
                </div>
              </div>

              <!-- Submitted Documents (branch documents only) -->
              <h3 class="font-display text-[18px] font-bold text-[#3D2B24] mb-[16px]">
                Submitted Documents
              </h3>

              <div class="font-display bg-[#FFF8EA] border border-[#EDD8CC] rounded-[16px] p-[24px]">
                <div>
                  <p class="text-[16px] font-bold text-[#3D2B24] mb-[12px]">
                    Branch Documents
                  </p>

                  <div class="space-y-2">
                    <!-- Cafe Picture — lives on branch.cafe_picture (public disk),
                         not in branch.documents. -->
                    <div
                      v-if="relevantBranch?.cafe_picture"
                      class="flex items-center justify-between bg-white border border-[#EDD8CC] rounded-[12px] px-[12px] py-[12px]"
                    >
                      <div class="flex items-center gap-3 font-display">
                        <div class="w-[36px] h-[36px] rounded-[8px] bg-[#FFF8EA] flex items-center justify-center shrink-0">
                          <Icon name="heroicons:photo" class="w-[20px] h-[20px] text-[#7D5A50]" />
                        </div>
                        <p class="text-[14px] font-semibold text-[#3D2B24]">Cafe Picture</p>
                      </div>

                      <button
                        type="button"
                        class="cursor-pointer font-semibold text-[14px] text-[#FFF0D1] rounded-[10px] border px-[20px] py-[6px] bg-[#7D5A50]"
                        @click="viewCafePicture"
                      >
                        View
                      </button>
                    </div>

                    <div
                      v-for="doc in relevantBranch?.documents ?? []"
                      :key="doc.branch_doc_id"
                      class="flex items-center justify-between bg-white border border-[#EDD8CC] rounded-[12px] px-[12px] py-[12px]"
                    >
                      <div class="flex items-center gap-3 font-display">
                        <div class="w-[36px] h-[36px] rounded-[8px] bg-[#FFF8EA] flex items-center justify-center shrink-0">
                          <Icon name="heroicons:document-text" class="w-[20px] h-[20px] text-[#7D5A50]" />
                        </div>
                        <p class="text-[14px] font-semibold text-[#3D2B24] capitalize">
                          {{ doc.doc_type.replace(/_/g, ' ') }}
                        </p>
                      </div>

                      <button
                        type="button"
                        class="cursor-pointer font-semibold text-[14px] text-[#FFF0D1] rounded-[10px] border px-[20px] py-[6px] bg-[#7D5A50]"
                        @click="viewDocument(doc.download_url)"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Review Info -->
              <template v-if="approval.status !== 'pending_approval'">
                <h3 class="font-display text-[18px] font-bold text-[#3D2B24] mb-[16px] mt-[24px]">
                  Review Information
                </h3>

                <div class="rounded-xl overflow-hidden border border-[#EDD8CC] font-display text-[14px]">
                  <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-[20px] py-[10px]">
                    <p class="font-semibold text-[#7D5A50]">Reviewed By</p>
                    <p class="text-[#3B1F0E]">
                      {{ approval.reviewer ? `${approval.reviewer.firstname} ${approval.reviewer.lastname}` : '—' }}
                    </p>
                  </div>

                  <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-[20px] py-[10px] border-t border-[#EDD8CC]">
                    <p class="font-semibold text-[#7D5A50]">Reviewed At</p>
                    <p class="text-[#3B1F0E]">{{ formatDate(approval.reviewed_at) }}</p>
                  </div>

                  <div
                    v-if="approval.status === 'rejected' && approval.reason"
                    class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-[20px] py-[10px] border-t border-[#EDD8CC]"
                  >
                    <p class="font-semibold text-[#7D5A50]">Reason</p>
                    <p class="text-[#DC3545]">{{ approval.reason }}</p>
                  </div>
                </div>
              </template>
            </div>
          </template>
        </div>

        <!-- Actions -->
        <div
          v-if="approval?.status === 'pending_approval'"
          class="flex items-center gap-3 border-t border-[#F3E7D2] p-6 bg-white shrink-0"
        >
          <button
            type="button"
            class="flex-1 rounded-xl bg-[#FDE8E8] text-[#DC3545] font-display font-semibold text-[14px] py-3 hover:opacity-80 transition-opacity disabled:opacity-50"
            :disabled="decisionLoading"
            @click="emit('reject')"
          >Reject Application</button>

          <button
            type="button"
            class="flex-1 rounded-xl bg-[#D4EDDA] text-[#28A745] font-display font-semibold text-[14px] py-3 hover:opacity-80 transition-opacity disabled:opacity-50"
            :disabled="decisionLoading"
            @click="emit('approve')"
          >Approve Application</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>