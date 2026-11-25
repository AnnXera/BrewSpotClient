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

const { openDocument, openImage } = useDocumentViewer()

function cafePictureUrl(branchUuid?: string | null) {
  if (!branchUuid) return null
  const config = useRuntimeConfig()
  const origin = config.public.apiBase.replace(/\/api\/?$/, '')
  return `${origin}/api/branch-picture/${branchUuid}`
}

function viewCafePicture() {
  const url = cafePictureUrl(relevantBranch.value?.uuid)
  if (url) openImage(url, `${relevantBranch.value?.branch_name ?? 'Cafe'} photo`)
}

// Label / value rows for the Branch Details card
const branchRows = computed(() => [
  { label: 'Cafe Name', value: primaryCafe.value?.cafe_name ?? '—' },
  { label: 'Owner', value: ownerFullName.value },
  { label: 'Email', value: relevantBranch.value?.cafe_email ?? '—' },
  { label: 'Phone Number', value: relevantBranch.value?.cafe_phonenumber ?? '—' },
  { label: 'Address', value: relevantBranch.value?.address ?? '—', wide: true },
])
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-5"
      @click.self="emit('close')"
    >
      <!-- Card: same frame as the owner-side modals -->
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Branch Registration Details"
        class="relative bg-white rounded-3xl w-full max-w-[720px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div v-if="loading" class="p-10 flex flex-col items-center justify-center gap-3 text-[#3B1F0E]/50">
          <Icon name="heroicons:arrow-path" class="w-6 h-6 animate-spin text-[#B4846C]" />
          <span class="font-sans text-sm">Loading application…</span>
        </div>

        <template v-else-if="ownerDetails && approval">
          <!-- Header (unchanged): title, branch picture, cafe name, status badge and ID; stays put while the body scrolls -->
          <div class="px-6 pt-6 shrink-0">
            <div class="flex items-center justify-between mb-[24px]">
              <p class="font-display text-[14px] leading-[16.5px] tracking-[0.77%] font-semibold text-[#9E7060] uppercase">
                Branch Registration Details
              </p>

              <button type="button" class="cursor-pointer" @click="emit('close')">
                <img src="@/assets/images/x-button.svg" class="w-[24px] h-[24px]" />
              </button>
            </div>

            <div class="flex items-center gap-3 pb-[24px] border-b border-[#B4846C]">
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
          </div>

          <!-- Body -->
          <div class="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
            <!-- Branch Details -->
            <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs">
              <h3 class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5 mb-3">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                Branch Details<template v-if="relevantBranch?.branch_name"> · {{ relevantBranch.branch_name }}</template>
                <span
                  v-if="primaryCafe?.is_archived || relevantBranch?.is_archived"
                  class="ml-1 normal-case tracking-normal text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F0E3CE] text-[#8B6656]"
                >Archived</span>
              </h3>
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <div v-for="row in branchRows" :key="row.label" class="min-w-0" :class="row.wide ? 'sm:col-span-2' : ''">
                  <dt class="text-xs font-bold text-[#8A6E64]">{{ row.label }}</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-[#2D201B] break-words">{{ row.value }}</dd>
                </div>
              </dl>
            </section>

            <!-- Submitted Documents (branch documents only) -->
            <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs">
              <h3 class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5 mb-3">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                Submitted Documents
              </h3>

              <ul class="space-y-2">
                <!-- Cafe Picture lives on branch.cafe_picture (public disk), not in branch.documents. -->
                <li
                  v-if="relevantBranch?.cafe_picture"
                  class="flex items-center justify-between gap-3 bg-white border border-[#EADCC7] rounded-xl px-3 py-2.5"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="w-9 h-9 rounded-lg bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0">
                      <Icon name="heroicons:photo" class="w-[18px] h-[18px]" />
                    </span>
                    <p class="text-sm font-semibold text-[#3D2B24]">Cafe Picture</p>
                  </div>
                  <button
                    type="button"
                    class="shrink-0 h-8 px-3 rounded-lg bg-[#7D5A50] hover:bg-[#684940] text-xs font-bold text-[#FFF8EA] transition-colors cursor-pointer"
                    @click="viewCafePicture"
                  >
                    View
                  </button>
                </li>

                <li
                  v-for="doc in relevantBranch?.documents ?? []"
                  :key="doc.branch_doc_id"
                  class="bg-white border border-[#EADCC7] rounded-xl overflow-hidden"
                >
                  <div class="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="w-9 h-9 rounded-lg bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0">
                        <Icon name="heroicons:document-text" class="w-[18px] h-[18px]" />
                      </span>
                      <p class="text-sm font-semibold text-[#3D2B24] capitalize truncate">{{ doc.doc_type.replace(/_/g, ' ') }}</p>
                    </div>
                    <button
                      type="button"
                      class="shrink-0 h-8 px-3 rounded-lg bg-[#7D5A50] hover:bg-[#684940] text-xs font-bold text-[#FFF8EA] transition-colors cursor-pointer"
                      @click="openDocument(doc.download_url, `${doc.doc_type.replace(/_/g, ' ')} document`)"
                    >
                      View
                    </button>
                  </div>

                  <!-- BIR details -->
                  <dl
                    v-if="doc.doc_type?.toUpperCase() === 'BIR'"
                    class="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#F3E7D2] bg-[#FDFBF7] px-3.5 py-3"
                  >
                    <div>
                      <dt class="text-[11px] font-bold uppercase tracking-wide text-[#8A6E64]">TIN Number</dt>
                      <dd class="mt-0.5 text-sm font-semibold text-[#2D201B]">{{ doc.tin_number || '—' }}</dd>
                    </div>
                    <div>
                      <dt class="text-[11px] font-bold uppercase tracking-wide text-[#8A6E64]">VAT Type</dt>
                      <dd class="mt-0.5 text-sm font-semibold text-[#2D201B] capitalize">{{ doc.vat ? doc.vat.replace('-', ' ') : '—' }}</dd>
                    </div>
                    <div>
                      <dt class="text-[11px] font-bold uppercase tracking-wide text-[#8A6E64]">Date Registered</dt>
                      <dd class="mt-0.5 text-sm font-semibold text-[#2D201B]">{{ formatDate(doc.registered_at) }}</dd>
                    </div>
                  </dl>
                </li>

                <li v-if="!relevantBranch?.cafe_picture && !(relevantBranch?.documents ?? []).length" class="text-xs text-[#8A6E64]">
                  No documents submitted.
                </li>
              </ul>
            </section>

            <!-- Review Information -->
            <p
              v-if="approval.status === 'withdrawn'"
              class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] px-5 py-4 text-sm font-semibold text-[#7D5A50]"
            >
              The owner withdrew this branch before it was reviewed.
            </p>
            <section
              v-else-if="approval.status !== 'pending_approval'"
              class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs"
            >
              <h3 class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5 mb-3">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                Review Information
              </h3>
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt class="text-xs font-bold text-[#8A6E64]">Reviewed By</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-[#2D201B]">
                    {{ approval.reviewer ? `${approval.reviewer.firstname} ${approval.reviewer.lastname}` : '—' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-bold text-[#8A6E64]">Reviewed At</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-[#2D201B]">{{ formatDate(approval.reviewed_at) }}</dd>
                </div>
                <div v-if="approval.status === 'rejected' && approval.can_resubmit !== undefined">
                  <dt class="text-xs font-bold text-[#8A6E64]">Resubmission</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-[#2D201B]">{{ approval.can_resubmit ? 'Allowed' : 'Not allowed (final)' }}</dd>
                </div>
                <div v-if="approval.status === 'rejected' && approval.reason" class="sm:col-span-2">
                  <dt class="text-xs font-bold text-[#8A6E64]">Reason</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-[#2D201B] break-words">{{ approval.reason }}</dd>
                </div>
              </dl>
            </section>
          </div>
        </template>

        <!-- Actions -->
        <div
          v-if="approval?.status === 'pending_approval' && !loading"
          class="flex items-center gap-3 border-t border-[#F3E7D2] p-6 bg-white shrink-0"
        >
          <button
            type="button"
            class="flex-1 rounded-xl border border-[#7D5A50] bg-white text-[#7D5A50] font-display font-semibold text-[14px] py-3 hover:bg-[#FFF8EA] transition-colors disabled:opacity-50"
            :disabled="decisionLoading"
            @click="emit('reject')"
          >Reject Application</button>

          <button
            type="button"
            class="flex-1 rounded-xl border border-[#7D5A50] bg-[#7D5A50] text-[#FFF0D1] font-display font-semibold text-[14px] py-3 hover:bg-[#65463D] hover:border-[#65463D] transition-colors disabled:opacity-50"
            :disabled="decisionLoading"
            @click="emit('approve')"
          >Approve Application</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
