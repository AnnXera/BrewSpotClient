<script setup lang="ts">
// Owner asks to rename the cafe. Step 1: the new name. Step 2: an updated BIR COR
// (Form 2303) for every branch, since each branch's COR carries the trade name.
// The request goes to an admin; the old name stays in use until it is approved.
import EmilCalendar from '~/components/common/EmilCalendar.vue'
import type { CafeUpdateRequest, NameChangeBranch } from '~/services/CafeUpdateService'

const props = defineProps<{
  show: boolean
  currentName: string
  branches: NameChangeBranch[]
  // The last declined request, so its name can be offered again and its reason shown
  previous?: CafeUpdateRequest | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submitted', request: CafeUpdateRequest): void
}>()

const service = useCafeUpdateService()

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPT = '.jpg,.jpeg,.png,.pdf'

const step = ref<1 | 2>(1)
const newName = ref('')
const files = ref<Record<string, File | null>>({})
const dates = ref<Record<string, string>>({})
const errors = ref<Record<string, string>>({})
const generalError = ref('')
const submitting = ref(false)
const fileInputs = ref<Record<string, HTMLInputElement | null>>({})

const today = new Date().toISOString().slice(0, 10)

watch(() => props.show, (open) => {
  if (!open) return
  step.value = 1
  newName.value = props.previous?.status === 'rejected' && props.previous.can_resubmit ? (props.previous.new_name ?? '') : ''
  files.value = Object.fromEntries(props.branches.map(b => [b.uuid, null]))
  dates.value = Object.fromEntries(props.branches.map(b => [b.uuid, '']))
  errors.value = {}
  generalError.value = ''
})

const trimmedName = computed(() => newName.value.trim().replace(/\s+/g, ' '))
const branchCount = computed(() => props.branches.length)
const readyCount = computed(() => props.branches.filter(b => files.value[b.uuid] && dates.value[b.uuid]).length)

function validateName(): boolean {
  errors.value = {}
  if (trimmedName.value.length < 2) {
    errors.value.new_name = 'Enter the new cafe name.'
  } else if (trimmedName.value.length > 150) {
    errors.value.new_name = 'The cafe name must not exceed 150 characters.'
  } else if (trimmedName.value === props.currentName) {
    errors.value.new_name = 'Enter a name different from the current one.'
  }
  return !errors.value.new_name
}

function next() {
  if (validateName()) step.value = 2
}

function pickFile(uuid: string) {
  fileInputs.value[uuid]?.click()
}

function onFile(uuid: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (!file) return
  delete errors.value[`documents.${uuid}.file`]
  if (file.size > MAX_FILE_BYTES) {
    errors.value[`documents.${uuid}.file`] = 'The COR must not exceed 5MB.'
    return
  }
  if (!/\.(jpe?g|png|pdf)$/i.test(file.name)) {
    errors.value[`documents.${uuid}.file`] = 'The COR must be a jpg, png or pdf file.'
    return
  }
  files.value[uuid] = file
}

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

async function submit() {
  errors.value = {}
  generalError.value = ''
  for (const b of props.branches) {
    if (!files.value[b.uuid]) errors.value[`documents.${b.uuid}.file`] = 'Upload the updated COR for this branch.'
    if (!dates.value[b.uuid]) errors.value[`documents.${b.uuid}.registered_at`] = 'Enter the date on the updated COR.'
  }
  if (Object.keys(errors.value).length) return

  submitting.value = true
  try {
    const docs = Object.fromEntries(props.branches.map(b => [b.uuid, { file: files.value[b.uuid]!, registeredAt: dates.value[b.uuid]! }]))
    const res = await service.submit(trimmedName.value, docs)
    emit('submitted', res.request)
  } catch (e: any) {
    const data = e?.data ?? {}
    const fieldErrors: Record<string, string[]> = data.errors ?? {}
    errors.value = Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v[0] ?? '']))
    if (errors.value.new_name) step.value = 1
    generalError.value = Object.keys(errors.value).length ? '' : (data.message || 'Could not send the name change. Please try again.')
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
        aria-labelledby="rename-cafe-title"
        class="relative bg-white rounded-3xl w-full max-w-[640px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-4 px-6 md:px-8 pt-5 pb-4 border-b border-[#EEDFC4] bg-[#FDFBF7] shrink-0">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0">
              <Icon name="heroicons:pencil-square" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h2 id="rename-cafe-title" class="text-xl font-display font-extrabold text-[#3B1F0E]">Rename Cafe</h2>
              <p class="text-xs text-[#8A6E64] mt-0.5">Step {{ step }} of 2 · {{ step === 1 ? 'New name' : 'Updated CORs' }}</p>
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
          <!-- Step 1: name -->
          <template v-if="step === 1">
            <div class="rounded-2xl border border-[#F3D9A4] bg-[#FDF8EC] px-4 py-3 text-xs text-[#6B4A12] flex gap-2.5">
              <Icon name="heroicons:information-circle" class="w-4 h-4 shrink-0 mt-0.5 text-[#B07A1E]" />
              <p>
                This changes the name on receipts and all
                <strong>{{ branchCount }} {{ branchCount === 1 ? 'branch' : 'branches' }}</strong>.
                An admin reviews it, and each branch needs an updated BIR Certificate of Registration showing the new name.
                <strong>{{ currentName }}</strong> stays in use until it is approved.
              </p>
            </div>

            <div v-if="previous?.status === 'rejected'" class="rounded-2xl border border-[#F6D3D6] bg-[#FDF1F1] px-4 py-3 text-xs text-[#8A2A33]">
              <p class="font-bold">Your last request ({{ previous.new_name }}) was not approved.</p>
              <p class="mt-0.5"><span class="font-semibold">Reason:</span> {{ previous.reason || 'No reason was given.' }}</p>
              <p v-if="!previous.can_resubmit" class="mt-0.5 text-[#A2535B]">That name can't be requested again. You can ask for a different one.</p>
            </div>

            <div class="space-y-1">
              <span class="block text-xs font-bold text-[#3B1F0E]">Current name</span>
              <p class="h-11 px-3.5 rounded-xl border border-[#EADCC7] bg-[#FAF6F0] text-sm font-semibold text-[#8A6E64] flex items-center">{{ currentName }}</p>
            </div>

            <label class="block">
              <span class="block text-xs font-bold text-[#3B1F0E] mb-1">New name <span class="text-red-500">*</span></span>
              <input
                v-model="newName"
                type="text"
                maxlength="150"
                autocomplete="organization"
                placeholder="As it appears on your new BIR COR"
                class="w-full h-11 px-3.5 rounded-xl border bg-white text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                :class="errors.new_name ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
                @input="delete errors.new_name"
                @keydown.enter.prevent="next"
              />
              <span v-if="errors.new_name" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                <span>{{ errors.new_name }}</span>
              </span>
            </label>
          </template>

          <!-- Step 2: one COR per branch -->
          <template v-else>
            <div class="flex items-baseline justify-between gap-3">
              <p class="text-xs text-[#8A6E64]">
                Upload each branch's new COR showing <strong class="text-[#3B1F0E]">{{ trimmedName }}</strong>.
              </p>
              <span class="shrink-0 text-xs font-bold tabular-nums" :class="readyCount === branchCount ? 'text-emerald-700' : 'text-[#8A6E64]'">
                {{ readyCount }} / {{ branchCount }} ready
              </span>
            </div>

            <ul class="space-y-3">
              <li
                v-for="b in branches"
                :key="b.uuid"
                class="rounded-2xl border bg-[#FCFBF8] p-4 space-y-3"
                :class="errors[`documents.${b.uuid}.file`] || errors[`documents.${b.uuid}.registered_at`] ? 'border-red-300' : 'border-[#EADCC7]'"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-[#3B1F0E] truncate">{{ b.branch_name }}</p>
                    <p class="text-[11px] text-[#8A6E64] capitalize">
                      {{ b.branch_type }} branch · {{ b.status.replace(/_/g, ' ') }}
                      <template v-if="b.current_registered_at"> · current COR {{ formatDate(b.current_registered_at) }}</template>
                    </p>
                  </div>
                  <Icon
                    v-if="files[b.uuid] && dates[b.uuid]"
                    name="heroicons:check-circle"
                    class="w-5 h-5 shrink-0 text-emerald-600"
                    aria-label="Ready"
                  />
                </div>

                <input
                  :ref="el => (fileInputs[b.uuid] = el as HTMLInputElement | null)"
                  type="file"
                  :accept="ACCEPT"
                  class="hidden"
                  @change="onFile(b.uuid, $event)"
                />

                <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_12rem] gap-3">
                  <!-- File -->
                  <div>
                    <button
                      v-if="!files[b.uuid]"
                      type="button"
                      class="w-full h-11 border-2 border-dashed border-[#D8C7B5] hover:border-[#3B1F0E] bg-white hover:bg-[#FAF6F0] rounded-xl px-3 flex items-center gap-2 text-xs font-bold text-[#3B1F0E] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                      @click="pickFile(b.uuid)"
                    >
                      <Icon name="heroicons:arrow-up-tray" class="w-4 h-4 text-[#7D5A50]" />
                      Upload new COR
                      <span class="ml-auto font-normal text-[11px] text-[#8A6E64]">JPG, PNG, PDF · 5MB</span>
                    </button>
                    <div v-else class="h-11 flex items-center gap-2.5 px-3 bg-white rounded-xl border border-[#D8C7B5]">
                      <Icon name="heroicons:document-check" class="w-4 h-4 shrink-0 text-amber-700" />
                      <span class="min-w-0 flex-1 text-xs font-bold text-[#3B1F0E] truncate">{{ files[b.uuid]!.name }}</span>
                      <span class="shrink-0 text-[11px] text-[#8A6E64]">{{ formatFileSize(files[b.uuid]!.size) }}</span>
                      <button type="button" class="shrink-0 text-xs font-bold text-[#7D5A50] underline underline-offset-2 hover:text-[#3B1F0E]" @click="pickFile(b.uuid)">
                        Change
                      </button>
                    </div>
                    <p v-if="errors[`documents.${b.uuid}.file`]" class="text-xs text-red-600 mt-1 font-semibold">{{ errors[`documents.${b.uuid}.file`] }}</p>
                  </div>

                  <!-- Date on the new COR -->
                  <div>
                    <EmilCalendar
                      v-model="dates[b.uuid]"
                      placeholder="Date on new COR"
                      align="right"
                      :max="today"
                      :invalid="!!errors[`documents.${b.uuid}.registered_at`]"
                      button-class="w-full h-11 px-3.5 rounded-xl border border-[#D8C7B5] bg-white text-sm font-semibold text-[#2D201B] shadow-2xs hover:border-[#3B1F0E]"
                      @update:model-value="delete errors[`documents.${b.uuid}.registered_at`]"
                    />
                    <p v-if="errors[`documents.${b.uuid}.registered_at`]" class="text-xs text-red-600 mt-1 font-semibold">{{ errors[`documents.${b.uuid}.registered_at`] }}</p>
                  </div>
                </div>
              </li>
            </ul>

            <p v-if="generalError" role="alert" class="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-800">
              {{ generalError }}
            </p>
          </template>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-6 md:px-8 py-3.5 border-t border-[#EEDFC4] bg-[#FAF8F5] shrink-0">
          <button
            type="button"
            :disabled="submitting"
            class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="step === 2 ? (step = 1) : emit('close')"
          >
            {{ step === 2 ? 'Back' : 'Cancel' }}
          </button>

          <button
            v-if="step === 1"
            type="button"
            class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="next"
          >
            Next: upload CORs
            <Icon name="heroicons:arrow-right" class="w-4 h-4" />
          </button>
          <button
            v-else
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
