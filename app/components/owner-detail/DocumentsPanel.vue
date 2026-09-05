<!-- app/components/owner-detail/DocumentsPanel.vue -->
<template>
  <div class="mb-5 min-[360px]:mb-6">
    <h2 class="font-display text-[18px] min-[360px]:text-[20px] font-bold text-[#3D2B24] mb-3 min-[360px]:mb-4">
      Documents
    </h2>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 min-[360px]:gap-5 md:gap-6">
      <div class="bg-white border border-[#EDD8CC] rounded-2xl p-4 min-[360px]:p-5 sm:p-6 shadow-sm">
        <h3 class="font-display text-base min-[360px]:text-[18px] font-bold text-[#3D2B24] mb-3 min-[360px]:mb-4">Owner Documents</h3>

        <div v-if="!ownerDocuments.length" class="font-sans text-sm text-[#9E7060]">No documents uploaded.</div>

        <div class="space-y-3">
          <div
            v-for="doc in ownerDocuments"
            :key="doc.user_doc_id"
            class="flex items-center justify-between gap-2.5 rounded-xl border border-[#EDD8CC] p-2.5 min-[360px]:p-3"
          >
            <div class="flex items-center gap-2.5 min-[360px]:gap-3 font-display min-w-0">
              <div class="w-11 h-11 min-[360px]:w-14 min-[360px]:h-14 rounded-lg bg-[#FFF0D1] flex items-center justify-center shrink-0">
                <Icon name="heroicons:identification" class="w-5 h-5 min-[360px]:w-6 min-[360px]:h-6 text-[#7D5A50]" />
              </div>

              <div class="min-w-0">
                <p class="text-xs min-[360px]:text-sm font-semibold text-[#3D2B24] capitalize truncate">
                  {{ doc.id_type.replace(/_/g, ' ') }}
                </p>
                <p class="text-[11px] min-[360px]:text-xs font-medium text-[#9E7060]">Uploaded {{ formatDate(doc.uploaded_at) }}</p>
              </div>
            </div>

            <button
              type="button"
              class="cursor-pointer rounded-lg border border-[#EDD8CC] px-2.5 py-1 min-[360px]:px-3 min-[360px]:py-1.5 font-display font-semibold text-xs min-[360px]:text-[13px] text-[#7D5A50] hover:bg-[#7D5A50] hover:text-[#FFF0D1] hover:border-[#7D5A50] transition-colors shrink-0"
              @click="emit('view', doc.download_url)"
            >
              View
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#EDD8CC] rounded-2xl p-4 min-[360px]:p-5 sm:p-6 shadow-sm">
        <h3 class="font-display text-base min-[360px]:text-[18px] font-bold text-[#3D2B24] mb-3 min-[360px]:mb-4">Cafe Documents</h3>
        
        <div v-if="!cafeDocuments.length" class="font-sans text-sm text-[#9E7060]">No documents uploaded.</div>

        <div class="space-y-3">
          <div
            v-for="doc in cafeDocuments"
            :key="doc.cafe_doc_id"
            class="flex items-center justify-between gap-2.5 rounded-xl border border-[#EDD8CC] p-2.5 min-[360px]:p-3"
          >
            <div class="flex items-center gap-2.5 min-[360px]:gap-3 font-display min-w-0">
              <div class="w-11 h-11 min-[360px]:w-14 min-[360px]:h-14 rounded-lg bg-[#FFF0D1] flex items-center justify-center shrink-0">
                <Icon name="heroicons:document-text" class="w-5 h-5 min-[360px]:w-6 min-[360px]:h-6 text-[#7D5A50]" />
              </div>

              <div class="min-w-0">
                <p class="text-xs min-[360px]:text-sm font-semibold text-[#3D2B24] capitalize truncate">{{ doc.doc_type }} Certificate</p>
                <p class="text-[11px] min-[360px]:text-xs font-medium text-[#9E7060]">Uploaded {{ formatDate(doc.registered_at) }}</p>
              </div>
            </div>

            <button
              type="button"
              class="cursor-pointer rounded-lg border border-[#EDD8CC] px-2.5 py-1 min-[360px]:px-3 min-[360px]:py-1.5 font-display font-semibold text-xs min-[360px]:text-[13px] text-[#7D5A50] hover:bg-[#7D5A50] hover:text-[#FFF0D1] hover:border-[#7D5A50] transition-colors shrink-0"
              @click="emit('view', doc.download_url)"
            >
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface OwnerDoc {
  user_doc_id: number
  id_type: string
  download_url: string
  uploaded_at: string | null
}

interface CafeDoc {
  cafe_doc_id: number
  doc_type: string
  download_url: string
  registered_at: string | null
}

defineProps<{
  ownerDocuments: OwnerDoc[]
  cafeDocuments: CafeDoc[]
}>()

const emit = defineEmits<{
  view: [url: string]
}>()

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}
</script>