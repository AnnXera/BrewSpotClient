<script setup lang="ts">
// Owner asks to move one branch: the new address plus the updated BIR COR (Form 2303)
// showing it, since the COR carries the registered address. The request goes to an
// admin; the old address stays in use until it is approved. Same look as RenameCafeModal.
import EmilCalendar from '~/components/common/EmilCalendar.vue'
import type { CafeUpdateRequest } from '~/services/CafeUpdateService'

const props = defineProps<{
  show: boolean
  branchUuid: string
  branchName: string
  currentAddress: string | null
  currentRegisteredAt?: string | null
  // The last declined request, so its address can be offered again and its reason shown
  previous?: CafeUpdateRequest | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submitted', request: CafeUpdateRequest): void
}>()

const service = useCafeUpdateService()

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPT = '.jpg,.jpeg,.png,.pdf'

const newAddress = ref('')
const file = ref<File | null>(null)
const registeredAt = ref('')
const errors = ref<Record<string, string>>({})
const generalError = ref('')
const submitting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const today = new Date().toISOString().slice(0, 10)

watch(() => props.show, (open) => {
  if (!open) return
  newAddress.value = props.previous?.status === 'rejected' && props.previous.can_resubmit ? (props.previous.new_address ?? '') : ''
  file.value = null
  registeredAt.value = ''
  errors.value = {}
  generalError.value = ''
})

const normalize = (v: string | null | undefined) => (v ?? '').trim().replace(/\s+/g, ' ')
const trimmedAddress = computed(() => normalize(newAddress.value))

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = input.files?.[0] ?? null
  input.value = ''
  if (!picked) return
  delete errors.value.file
  if (picked.size > MAX_FILE_BYTES) {
    errors.value.file = 'The COR must not exceed 5MB.'
    return
  }
  if (!/\.(jpe?g|png|pdf)$/i.test(picked.name)) {
    errors.value.file = 'The COR must be a jpg, png or pdf file.'
    return
  }
  file.value = picked
}

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

function validate(): boolean {
  errors.value = {}
  if (trimmedAddress.value.length < 5) errors.value.new_address = 'Enter the new branch address.'
  else if (trimmedAddress.value.length > 500) errors.value.new_address = 'The address must not exceed 500 characters.'
  else if (trimmedAddress.value.toLowerCase() === normalize(props.currentAddress).toLowerCase()) {
    errors.value.new_address = 'Enter an address different from the current one.'
  }
  if (!file.value) errors.value.file = 'Upload the updated COR showing the new address.'
  if (!registeredAt.value) errors.value.registered_at = 'Enter the date on the updated COR.'
  return Object.keys(errors.value).length === 0
}

async function submit() {
  generalError.value = ''
  if (!validate()) return

  submitting.value = true
  try {
    const res = await service.submitAddressChange(props.branchUuid, trimmedAddress.value, file.value!, registeredAt.value)
    emit('submitted', res.request)
  } catch (e: any) {
    const data = e?.data ?? {}
    const fieldErrors: Record<string, string[]> = data.errors ?? {}
    errors.value = Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v[0] ?? '']))
    generalError.value = Object.keys(errors.value).length ? '' : (data.message || 'Could not send the address change. Please try again.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div class="fixed inset-0 bg-black/45 backdrop-blur-sm" aria-hidden="true" @click="!submitting && emit('close')"></div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-address-title"
        class="relative bg-white rounded-3xl w-full max-w-[640px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-4 px-6 md:px-8 pt-5 pb-4 border-b border-[#EEDFC4] bg-[#FDFBF7] shrink-0">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0">
              <Icon name="heroicons:map-pin" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h2 id="change-address-title" class="text-xl font-display font-extrabold text-[#3B1F0E]">Change Branch Address</h2>
              <p class="text-xs text-[#8A6E64] mt-0.5 truncate">{{ branchName }}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            :disabled="submitting"
            class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3B1F0E] active:scale-95 transition-all flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 disabled:opacity-50"
            @click="emit('close')"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-5 space-y-4">
          <div class="rounded-2xl border border-[#F3D9A4] bg-[#FDF8EC] px-4 py-3 text-xs text-[#6B4A12] flex gap-2.5">
            <Icon name="heroicons:information-circle" class="w-4 h-4 shrink-0 mt-0.5 text-[#B07A1E]" />
            <p>
              The address is on this branch's BIR Certificate of Registration, so an admin reviews the change.
              Update your registration with BIR first, then upload the new COR showing the new address.
              The current address stays in use until it is approved.
            </p>
          </div>

          <div v-if="previous?.status === 'rejected'" class="rounded-2xl border border-[#F6D3D6] bg-[#FDF1F1] px-4 py-3 text-xs text-[#8A2A33]">
            <p class="font-bold">Your last request was not approved.</p>
            <p class="mt-0.5"><span class="font-semibold">Reason:</span> {{ previous.reason || 'No reason was given.' }}</p>
            <p v-if="!previous.can_resubmit" class="mt-0.5 text-[#A2535B]">That address can't be requested again. You can ask for a different one.</p>
          </div>

          <div class="space-y-1">
            <span class="block text-xs font-bold text-[#3B1F0E]">Current address</span>
            <p class="min-h-11 px-3.5 py-2.5 rounded-xl border border-[#EADCC7] bg-[#FAF6F0] text-sm font-semibold text-[#8A6E64] break-words">{{ currentAddress || '—' }}</p>
          </div>

          <label class="block">
            <span class="block text-xs font-bold text-[#3B1F0E] mb-1">New address <span class="text-red-500">*</span></span>
            <textarea
              v-model="newAddress"
              rows="2"
              maxlength="500"
              autocomplete="street-address"
              placeholder="As it appears on your new BIR COR"
              class="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs resize-none"
              :class="errors.new_address ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
              @input="delete errors.new_address"
            />
            <span v-if="errors.new_address" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
              <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
              <span>{{ errors.new_address }}</span>
            </span>
          </label>

          <!-- Updated COR -->
          <div
            class="rounded-2xl border bg-[#FCFBF8] p-4 space-y-3"
            :class="errors.file || errors.registered_at ? 'border-red-300' : 'border-[#EADCC7]'"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-bold text-[#3B1F0E]">Updated COR</p>
                <p class="text-[11px] text-[#8A6E64]">
                  Must show the new address and the same TIN
                  <template v-if="currentRegisteredAt"> · current COR {{ formatDate(currentRegisteredAt) }}</template>
                </p>
              </div>
              <Icon v-if="file && registeredAt" name="heroicons:check-circle" class="w-5 h-5 shrink-0 text-emerald-600" aria-label="Ready" />
            </div>

            <input ref="fileInput" type="file" :accept="ACCEPT" class="hidden" @change="onFile" />

            <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_12rem] gap-3">
              <div>
                <button
                  v-if="!file"
                  type="button"
                  class="w-full h-11 border-2 border-dashed border-[#D8C7B5] hover:border-[#3B1F0E] bg-white hover:bg-[#FAF6F0] rounded-xl px-3 flex items-center gap-2 text-xs font-bold text-[#3B1F0E] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                  @click="fileInput?.click()"
                >
                  <Icon name="heroicons:arrow-up-tray" class="w-4 h-4 text-[#7D5A50]" />
                  Upload new COR
                  <span class="ml-auto font-normal text-[11px] text-[#8A6E64]">JPG, PNG, PDF · 5MB</span>
                </button>
                <div v-else class="h-11 flex items-center gap-2.5 px-3 bg-white rounded-xl border border-[#D8C7B5]">
                  <Icon name="heroicons:document-check" class="w-4 h-4 shrink-0 text-amber-700" />
                  <span class="min-w-0 flex-1 text-xs font-bold text-[#3B1F0E] truncate">{{ file.name }}</span>
                  <span class="shrink-0 text-[11px] text-[#8A6E64]">{{ formatFileSize(file.size) }}</span>
                  <button type="button" class="shrink-0 text-xs font-bold text-[#7D5A50] underline underline-offset-2 hover:text-[#3B1F0E]" @click="fileInput?.click()">
                    Change
                  </button>
                </div>
                <p v-if="errors.file" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.file }}</p>
              </div>

              <div>
                <EmilCalendar
                  v-model="registeredAt"
                  placeholder="Date on new COR"
                  align="right"
                  :max="today"
                  :invalid="!!errors.registered_at"
                  button-class="w-full h-11 px-3.5 rounded-xl border border-[#D8C7B5] bg-white text-sm font-semibold text-[#2D201B] shadow-2xs hover:border-[#3B1F0E]"
                  @update:model-value="delete errors.registered_at"
                />
                <p v-if="errors.registered_at" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.registered_at }}</p>
              </div>
            </div>
          </div>

          <p v-if="generalError" role="alert" class="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-800">
            {{ generalError }}
          </p>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-6 md:px-8 py-3.5 border-t border-[#EEDFC4] bg-[#FAF8F5] shrink-0">
          <button
            type="button"
            :disabled="submitting"
            class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="submitting"
            class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="submit"
          >
            <Icon v-if="submitting" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            {{ submitting ? 'Sending…' : 'Send for review' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
