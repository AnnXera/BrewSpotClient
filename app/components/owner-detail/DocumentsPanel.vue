<!-- app/components/owner-detail/DocumentsPanel.vue -->
<template>
  <h2 class="font-display text-[20px] font-bold text-[#3D2B24] mb-[16px]">Documents</h2>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-[24px]">

    <div class="bg-white border border-[#EDD8CC] rounded-2xl p-6">

      <h3 class="font-display text-[18px] font-bold text-[#3D2B24] mb-[12px]">Owner Documents</h3>

      <div v-if="!ownerDocuments.length" class="font-sans text-sm text-[#9E7060]">No documents uploaded.</div>

      <div
        v-for="doc in ownerDocuments"
        :key="doc.user_doc_id"
        class="flex items-center justify-between rounded-xl border border-[#EDD8CC] p-3"
      >

        <div class="flex items-center gap-3 font-display">

          <div class="w-[56px] h-[56px] rounded-lg bg-[#FFF0D1] flex items-center justify-center shrink-0">
            <Icon name="heroicons:identification" class="w-[24px] h-[24px] text-[#7D5A50]" />
          </div>

          <div>

            <p class="text-[14px] font-semibold text-[#3D2B24] capitalize">
              {{ doc.id_type.replace(/_/g, ' ') }}
            </p>

            <p class="text-[12px] font-medium text-[#9E7060]">Uploaded {{ formatDate(doc.uploaded_at) }}</p>

          </div>

        </div>

        <button
          type="button"
          class="cursor-pointer rounded-lg border border-[#EDD8CC] px-[12px] py-[8px] font-display font-semibold text-[13px] text-[#7D5A50] hover:bg-[#7D5A50] hover:text-[#FFF0D1] hover:border-[#7D5A50] transition-colors"
          @click="emit('view', doc.download_url)">
          View
        </button>

      </div>

    </div>

    <div class="bg-white border border-[#EDD8CC] rounded-2xl p-6">
      
      <h3 class="font-display text-[18px] font-bold text-[#3D2B24] mb-[12px]">Cafe Documents</h3>
      
      <div v-if="!cafeDocuments.length" class="font-sans text-sm text-[#9E7060]">No documents uploaded.</div>

      <div
        v-for="doc in cafeDocuments"
        :key="doc.cafe_doc_id"
        class="flex items-center justify-between rounded-xl border border-[#EDD8CC] p-3">

        <div class="flex items-center gap-3 font-display">

          <div class="w-[56px] h-[56px] rounded-lg bg-[#FFF0D1] flex items-center justify-center shrink-0">
            <Icon name="heroicons:document-text" class="w-[24px] h-[24px] text-[#7D5A50]" />
          </div>

          <div>
            <p class="text-[14px] font-semibold text-[#3D2B24] capitalize">{{ doc.doc_type }} Certificate</p>
            <p class="text-[12px] font-medium text-[#9E7060]">Uploaded {{ formatDate(doc.registered_at) }}</p>
          </div>

        </div>

        <button
          type="button"
          class="cursor-pointer rounded-lg border border-[#EDD8CC] px-[12px] py-[8px] font-display font-semibold text-[13px] text-[#7D5A50] hover:bg-[#7D5A50] hover:text-[#FFF0D1] hover:border-[#7D5A50] transition-colors"
          @click="emit('view', doc.download_url)"
        >View</button>

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