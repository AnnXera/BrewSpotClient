<!--app/components/approval/CafeUpdateDetailsModal.vue-->
<!-- A cafe name change request: old and new name, then each branch's current COR beside the
     updated one, so the admin can check every new COR shows the new name. -->
<script setup lang="ts">
import type { CafeUpdateRequest } from '~/services/CafeUpdateService'

const props = defineProps<{
  open: boolean
  loading: boolean
  request: CafeUpdateRequest | null
  decisionLoading: boolean
}>()

const emit = defineEmits<{
  close: []
  approve: []
  reject: []
}>()

const { openDocument } = useDocumentViewer()

const isPending = computed(() => props.request?.status === 'pending_approval' || props.request?.status === 'resubmitted')
const approved = computed(() => props.request?.status === 'approved')

function formatDate(value?: string | null, withTime = false) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

function docIcon(type: string) {
  return type === 'pdf' ? 'heroicons:document-text' : 'heroicons:photo'
}

const detailRows = computed(() => {
  const r = props.request
  if (!r) return []
  return [
    { label: 'Current Name', value: r.old_name },
    { label: 'Requested Name', value: r.new_name },
    { label: 'Owner', value: r.owner?.name || '—' },
    { label: 'Owner Email', value: r.owner?.email || '—' },
    { label: 'Date Submitted', value: formatDate(r.submitted_at, true) },
    { label: 'Branches', value: `${r.documents.length} ${r.documents.length === 1 ? 'branch' : 'branches'}` },
  ]
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-5"
      @click.self="emit('close')"
    >
      <!-- Card: same frame as the owner and branch application modals -->
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cafe Name Change"
        class="relative bg-white rounded-3xl w-full max-w-[720px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div v-if="loading || !request" class="p-10 flex flex-col items-center justify-center gap-3 text-[#3B1F0E]/50">
          <Icon name="heroicons:arrow-path" class="w-6 h-6 animate-spin text-[#B4846C]" />
          <span class="font-sans text-sm">Loading request…</span>
        </div>

        <template v-else>
          <!-- Header: title, requested name, status badge and ID; stays put while the body scrolls -->
          <div class="px-6 pt-6 shrink-0">
            <div class="flex items-center justify-between mb-[24px]">
              <p class="font-display text-[14px] leading-[16.5px] tracking-[0.77%] font-semibold text-[#9E7060] uppercase">
                Cafe Name Change Details
              </p>

              <button type="button" class="cursor-pointer" aria-label="Close" @click="emit('close')">
                <img src="@/assets/images/x-button.svg" class="w-[24px] h-[24px]" alt="" />
              </button>
            </div>

            <div class="flex items-center gap-3 pb-[24px] border-b border-[#B4846C]">
              <div class="w-[56px] h-[56px] rounded-[12px] bg-[#F0E3CE] text-[#7D5A50] flex items-center justify-center shrink-0">
                <Icon name="heroicons:pencil-square" class="w-7 h-7" />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-3">
                  <p class="font-display text-[24px] font-bold text-[#3D2B24] truncate">{{ request.new_name }}</p>
                  <StatusBadge :status="request.status" />
                </div>

                <p class="font-display text-[12px] text-[#9E7060] truncate">
                  From {{ request.old_name }} · ID: {{ request.uuid.slice(0, 8) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
            <!-- Request details -->
            <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs">
              <h3 class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5 mb-3">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                Request Details
              </h3>
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <div v-for="row in detailRows" :key="row.label" class="min-w-0">
                  <dt class="text-xs font-bold text-[#8A6E64]">{{ row.label }}</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-[#2D201B] break-words">{{ row.value }}</dd>
                </div>
              </dl>
            </section>

            <!-- Updated CORs: one row per branch -->
            <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs">
              <h3 class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5 mb-1">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                Updated CORs
              </h3>
              <p v-if="isPending" class="text-xs text-[#8A6E64] mb-3">
                Check that each new COR shows <span class="font-semibold text-[#3D2B24]">{{ request.new_name }}</span> and the same TIN as the current one.
              </p>
              <div v-else class="mb-3" />

              <ul class="space-y-2">
                <li v-for="doc in request.documents" :key="doc.id" class="bg-white border border-[#EADCC7] rounded-xl overflow-hidden">
                  <div class="flex items-center gap-3 px-3 py-2.5">
                    <span class="w-9 h-9 rounded-lg bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0">
                      <Icon name="heroicons:building-storefront" class="w-[18px] h-[18px]" />
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold text-[#3D2B24] truncate">{{ doc.branch_name || 'Deleted branch' }}</p>
                      <p class="text-xs text-[#8A6E64] capitalize truncate">
                        {{ doc.branch_type }} branch · {{ (doc.branch_status || '').replace(/_/g, ' ') }}
                      </p>
                    </div>
                  </div>

                  <!-- Current and new COR, one row each -->
                  <dl class="border-t border-[#F3E7D2] bg-[#FDFBF7] divide-y divide-[#F3E7D2] [&>div]:px-3.5 [&>div]:py-3">
                    <!-- Current (or, once approved, the replaced) COR -->
                    <div class="flex items-center justify-between gap-3 min-w-0">
                      <div class="min-w-0">
                        <dt class="text-[11px] font-bold uppercase tracking-wide text-[#8A6E64]">{{ approved ? 'Previous COR' : 'Current COR' }}</dt>
                        <dd class="mt-0.5 text-sm font-semibold text-[#2D201B]">
                          {{ doc.current_document ? `Dated ${formatDate(doc.current_document.registered_at)}` : 'None on file' }}
                        </dd>
                        <dd v-if="doc.current_document?.tin_number" class="text-xs text-[#8A6E64] tabular-nums">TIN {{ doc.current_document.tin_number }}</dd>
                      </div>
                      <button
                        v-if="doc.current_document"
                        type="button"
                        class="shrink-0 h-8 px-3 rounded-lg border border-[#D8C7B5] bg-white hover:bg-[#FAF4ED] text-xs font-bold text-[#5C4037] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        @click="openDocument(doc.current_document.download_url, `${doc.branch_name} · ${approved ? 'previous' : 'current'} COR`)"
                      >
                        <Icon :name="docIcon(doc.current_document.file_type)" class="w-3.5 h-3.5" />
                        View
                      </button>
                    </div>

                    <!-- New COR -->
                    <div class="flex items-center justify-between gap-3 min-w-0">
                      <div class="min-w-0">
                        <dt class="text-[11px] font-bold uppercase tracking-wide text-[#8A6E64]">New COR</dt>
                        <dd class="mt-0.5 text-sm font-semibold text-[#2D201B] truncate">Dated {{ formatDate(doc.registered_at) }}</dd>
                      </div>
                      <button
                        type="button"
                        class="shrink-0 h-8 px-3 rounded-lg bg-[#7D5A50] hover:bg-[#684940] text-xs font-bold text-[#FFF8EA] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        @click="openDocument(doc.download_url, `${doc.branch_name} · new COR`)"
                      >
                        <Icon :name="docIcon(doc.file_type)" class="w-3.5 h-3.5" />
                        View
                      </button>
                    </div>
                  </dl>
                </li>
              </ul>
            </section>

            <!-- Review Information -->
            <p
              v-if="request.status === 'withdrawn'"
              class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] px-5 py-4 text-sm font-semibold text-[#7D5A50]"
            >
              The owner cancelled this request before it was reviewed.
            </p>
            <section
              v-else-if="!isPending"
              class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs"
            >
              <h3 class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5 mb-3">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                Review Information
              </h3>
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt class="text-xs font-bold text-[#8A6E64]">Reviewed By</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-[#2D201B]">{{ request.reviewed_by || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-bold text-[#8A6E64]">Reviewed At</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-[#2D201B]">{{ formatDate(request.reviewed_at, true) }}</dd>
                </div>
                <template v-if="request.status === 'rejected'">
                  <div>
                    <dt class="text-xs font-bold text-[#8A6E64]">Resubmission</dt>
                    <dd class="mt-0.5 text-sm font-semibold text-[#2D201B]">{{ request.can_resubmit ? 'Allowed' : 'This name is final' }}</dd>
                  </div>
                  <div class="sm:col-span-2">
                    <dt class="text-xs font-bold text-[#8A6E64]">Reason</dt>
                    <dd class="mt-0.5 text-sm font-semibold text-[#2D201B] break-words">{{ request.reason || 'No reason given' }}</dd>
                  </div>
                </template>
              </dl>
            </section>
          </div>
        </template>

        <!-- Actions (same as the owner and branch application modals) -->
        <div v-if="request && isPending && !loading" class="flex items-center gap-3 border-t border-[#F3E7D2] p-6 bg-white shrink-0">
          <button
            type="button"
            class="flex-1 rounded-xl border border-[#7D5A50] bg-white text-[#7D5A50] font-display font-semibold text-[14px] py-3 hover:bg-[#FFF8EA] transition-colors disabled:opacity-50"
            :disabled="decisionLoading"
            @click="emit('reject')"
          >Reject Change</button>
          <button
            type="button"
            class="flex-1 rounded-xl border border-[#7D5A50] bg-[#7D5A50] text-[#FFF0D1] font-display font-semibold text-[14px] py-3 hover:bg-[#65463D] hover:border-[#65463D] transition-colors disabled:opacity-50"
            :disabled="decisionLoading"
            @click="emit('approve')"
          >{{ decisionLoading ? 'Saving…' : 'Approve & Rename' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
