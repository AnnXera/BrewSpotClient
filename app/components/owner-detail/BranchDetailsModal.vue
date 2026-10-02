<!-- app/components/owner-detail/BranchDetailsModal.vue -->
<script setup lang="ts">
const props = defineProps<{
  open: boolean
  branch: any | null
  owner: any | null
}>()

const emit = defineEmits<{
  close: []
}>()

const ownerFullName = computed(() => {
  if (!props.owner) return '—'
  return `${props.owner.firstname ?? ''} ${props.owner.lastname ?? ''}`.trim()
})

const displayName = computed(() => {
  if (!props.branch) return 'Branch Details'
  const bName = props.branch.branch_name || ''
  const cName = props.branch.cafe_name || ''
  if (cName && bName) {
    if (bName.toLowerCase().startsWith(cName.toLowerCase())) {
      return bName
    }
    return `${cName} - ${props.branch.branch_type === 'main' ? 'Main' : bName}`
  }
  return bName || cName || 'Branch Details'
})

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

function viewCafePicture() {
  if (props.branch?.cafe_picture) {
    window.open(props.branch.cafe_picture, '_blank')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && branch"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#3B1F0E]/40 backdrop-blur-sm p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[#EDD8CC]">
        <!-- Header -->
        <div class="p-6 border-b border-[#F3E7D2] flex items-center justify-between">
          <p class="font-display text-[14px] leading-[16.5px] tracking-[0.77%] font-semibold text-[#9E7060] uppercase">
            Branch Details
          </p>

          <button type="button" class="cursor-pointer text-[#9E7060] hover:text-[#3D2B24] transition-colors" @click="emit('close')">
            <Icon name="heroicons:x-mark" class="w-6 h-6" />
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          <!-- Cafe / Branch Header -->
          <div class="flex items-center gap-4 pb-5 border-b border-[#F3E7D2]">
            <img
              v-if="branch.cafe_picture"
              :src="branch.cafe_picture"
              :alt="displayName"
              class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-[#EDD8CC]"
            />
            <div
              v-else
              class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#F4ECE1] border border-[#EDD8CC] flex items-center justify-center shrink-0"
            >
              <Icon name="heroicons:building-storefront" class="w-8 h-8 text-[#9E7060]" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h2 class="font-display text-xl sm:text-2xl font-bold text-[#3D2B24] truncate">
                  {{ displayName }}
                </h2>
                <StatusBadge :status="branch.status" />
              </div>

              <div class="flex items-center gap-2">
                <span
                  v-if="branch.branch_type"
                  class="px-2.5 py-0.5 rounded-md bg-[#F4ECE1] text-[#9E7060] font-display font-bold text-xs uppercase tracking-wider"
                >
                  {{ branch.branch_type }}
                </span>
                <p class="font-display text-xs text-[#9E7060] truncate">
                  ID: {{ branch.uuid }}
                </p>
              </div>
            </div>
          </div>

          <!-- Info Table -->
          <div>
            <h3 class="font-display text-base sm:text-lg font-bold text-[#3D2B24] mb-3">
              Branch Information
            </h3>

            <div class="rounded-xl overflow-hidden border border-[#EDD8CC] font-display text-sm">
              <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-5 py-3">
                <p class="font-semibold text-[#7D5A50]">Cafe Name</p>
                <p class="text-[#3B1F0E]">{{ branch.cafe_name || '—' }}</p>
              </div>

              <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-5 py-3 border-t border-[#EDD8CC]">
                <p class="font-semibold text-[#7D5A50]">Owner</p>
                <p class="text-[#3B1F0E]">{{ ownerFullName }}</p>
              </div>

              <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-5 py-3 border-t border-[#EDD8CC]">
                <p class="font-semibold text-[#7D5A50]">Branch Type</p>
                <p class="text-[#3B1F0E] capitalize">{{ branch.branch_type || '—' }}</p>
              </div>

              <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-5 py-3 border-t border-[#EDD8CC]">
                <p class="font-semibold text-[#7D5A50]">Email Address</p>
                <p class="text-[#3B1F0E] break-all">{{ branch.cafe_email || '—' }}</p>
              </div>

              <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-5 py-3 border-t border-[#EDD8CC]">
                <p class="font-semibold text-[#7D5A50]">Phone Number</p>
                <p class="text-[#3B1F0E]">{{ branch.cafe_phonenumber || '—' }}</p>
              </div>

              <div class="grid grid-cols-[35%_65%] bg-[#FFF8EA] px-5 py-3 border-t border-[#EDD8CC]">
                <p class="font-semibold text-[#7D5A50]">Address</p>
                <p class="text-[#3B1F0E] break-words">{{ branch.address || '—' }}</p>
              </div>
            </div>
          </div>

          <!-- Documents -->
          <div>
            <h3 class="font-display text-base sm:text-lg font-bold text-[#3D2B24] mb-3">
              Branch Documents
            </h3>

            <div class="bg-[#FFF8EA] border border-[#EDD8CC] rounded-2xl p-4 sm:p-5 space-y-3">
              <!-- Cafe Picture -->
              <div
                v-if="branch.cafe_picture"
                class="flex items-center justify-between bg-white border border-[#EDD8CC] rounded-xl px-4 py-3"
              >
                <div class="flex items-center gap-3 font-display">
                  <div class="w-9 h-9 rounded-lg bg-[#FFF8EA] flex items-center justify-center shrink-0">
                    <Icon name="heroicons:photo" class="w-5 h-5 text-[#7D5A50]" />
                  </div>
                  <p class="text-sm font-semibold text-[#3D2B24]">Cafe Picture</p>
                </div>

                <button
                  type="button"
                  class="cursor-pointer font-semibold text-xs sm:text-sm text-[#FFF0D1] rounded-lg px-4 py-1.5 bg-[#7D5A50] hover:bg-[#64463D] transition-colors"
                  @click="viewCafePicture"
                >
                  View
                </button>
              </div>

              <!-- Other Branch Docs -->
              <div
                v-for="doc in branch.documents ?? []"
                :key="doc.branch_doc_id"
                class="flex items-center justify-between bg-white border border-[#EDD8CC] rounded-xl px-4 py-3"
              >
                <div class="flex items-center gap-3 font-display">
                  <div class="w-9 h-9 rounded-lg bg-[#FFF8EA] flex items-center justify-center shrink-0">
                    <Icon name="heroicons:document-text" class="w-5 h-5 text-[#7D5A50]" />
                  </div>
                  <p class="text-sm font-semibold text-[#3D2B24] capitalize">
                    {{ doc.doc_type?.replace(/_/g, ' ') }}
                  </p>
                </div>

                <button
                  type="button"
                  class="cursor-pointer font-semibold text-xs sm:text-sm text-[#FFF0D1] rounded-lg px-4 py-1.5 bg-[#7D5A50] hover:bg-[#64463D] transition-colors"
                  @click="viewDocument(doc.download_url)"
                >
                  View
                </button>
              </div>

              <p
                v-if="!branch.cafe_picture && (!branch.documents || branch.documents.length === 0)"
                class="text-sm text-[#9E7060] font-display text-center py-2"
              >
                No documents uploaded for this branch.
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-[#F3E7D2] p-4 bg-white flex justify-end">
          <button
            type="button"
            class="px-5 py-2 rounded-xl border border-[#8B6656] text-[#6D4C41] font-display font-semibold text-sm hover:bg-[#FDF3E7] transition-colors"
            @click="emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
