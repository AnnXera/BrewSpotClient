<script setup lang="ts">
// Owner-only: change a branch's contact email, phone number and picture. These go live
// at once (no admin review); the server logs the change and notifies the branch's managers.
const props = defineProps<{
  show: boolean
  branch: {
    uuid: string
    branch_name: string
    cafe_email: string | null
    cafe_phonenumber: string | null
    cafe_picture_url?: string | null
  }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', branch: any): void
}>()

const ownerService = useOwnerProfileService()

// +639XXXXXXXXX is shown the way people type it (09XXXXXXXXX); landlines as stored.
const toLocal = (p: string | null) => (p && p.startsWith('+63') ? `0${p.slice(3)}` : p ?? '')

const email = ref('')
const phone = ref('')
const picture = ref<File | null>(null)
const preview = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const formError = ref('')
const saving = ref(false)

function reset() {
  email.value = props.branch.cafe_email ?? ''
  phone.value = toLocal(props.branch.cafe_phonenumber)
  picture.value = null
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = null
  errors.value = {}
  formError.value = ''
}

watch(() => props.show, (open) => { if (open) reset() }, { immediate: true })
onBeforeUnmount(() => { if (preview.value) URL.revokeObjectURL(preview.value) })

const emailChanged = computed(() => email.value.trim() !== (props.branch.cafe_email ?? ''))
const phoneChanged = computed(() => phone.value.trim() !== toLocal(props.branch.cafe_phonenumber))
const dirty = computed(() => emailChanged.value || phoneChanged.value || !!picture.value)

function onPicture(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  delete errors.value.cafe_picture
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    errors.value.cafe_picture = 'Picture must be a JPG, PNG or WEBP image.'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    errors.value.cafe_picture = 'Picture must not exceed 2MB.'
    return
  }
  if (preview.value) URL.revokeObjectURL(preview.value)
  picture.value = file
  preview.value = URL.createObjectURL(file)
}

function validate() {
  const next: Record<string, string> = {}
  if (emailChanged.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    next.cafe_email = 'Please enter a valid email address.'
  }
  if (phoneChanged.value) {
    const digits = phone.value.replace(/\D/g, '')
    if (!/^(09\d{9}|639\d{9}|9\d{9}|082\d{7})$/.test(digits)) {
      next.cafe_phonenumber = 'Enter a mobile number (09123456789) or an 082 landline (0822991234).'
    }
  }
  errors.value = { ...next, ...(errors.value.cafe_picture ? { cafe_picture: errors.value.cafe_picture } : {}) }
  return Object.keys(errors.value).length === 0
}

async function save() {
  formError.value = ''
  if (!dirty.value || saving.value || !validate()) return

  // Only what changed, so an untouched field is never re-validated or logged.
  const form = new FormData()
  if (emailChanged.value) form.append('cafe_email', email.value.trim())
  if (phoneChanged.value) form.append('cafe_phonenumber', phone.value.trim())
  if (picture.value) form.append('cafe_picture', picture.value)

  saving.value = true
  try {
    const res = await ownerService.updateBranchDetails(props.branch.uuid, form)
    if (res.success) {
      emit('saved', res.branch)
    } else {
      formError.value = res.message || 'Could not update the branch.'
    }
  } catch (e: any) {
    const apiErrors = e?.data?.errors as Record<string, string[]> | undefined
    if (apiErrors) {
      errors.value = Object.fromEntries(Object.entries(apiErrors).map(([k, v]) => [k, v[0] ?? 'Invalid value.']))
    }
    formError.value = apiErrors ? '' : (e?.data?.message || 'Could not update the branch. Please try again.')
  } finally {
    saving.value = false
  }
}

const inputClass = (field: string) => [
  'w-full bg-white border rounded-xl px-3.5 py-3 text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] placeholder:font-normal shadow-2xs focus:outline-none focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 transition-all',
  errors.value[field] ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]',
]

function close() {
  if (!saving.value) emit('close')
}

// Escape closes, except while saving
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.show) close()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div class="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200" aria-hidden="true" @click="close" />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-branch-title"
        class="relative bg-white rounded-3xl w-full max-w-[600px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        @submit.prevent="save"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-4 px-6 md:px-8 pt-5 pb-4 border-b border-[#EEDFC4] bg-[#FDFBF7] shrink-0">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="heroicons:pencil-square" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h2 id="edit-branch-title" class="text-xl font-display font-extrabold text-[#3B1F0E] truncate">Edit Contact Details</h2>
              <p class="text-xs text-[#8A6E64] mt-0.5 truncate">{{ branch.branch_name }}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            :disabled="saving"
            class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3B1F0E] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40 disabled:opacity-50"
            @click="close"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-4 space-y-4">
          <!-- ── Picture ─────────────────────────────────────────── -->
          <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5" aria-labelledby="edit-branch-picture-title">
            <h3 id="edit-branch-picture-title" class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              <span>Picture</span>
            </h3>

            <div class="flex items-center gap-4">
              <img
                v-if="preview || branch.cafe_picture_url"
                :src="preview || branch.cafe_picture_url || ''"
                alt=""
                class="w-20 h-20 rounded-2xl object-cover border border-[#D8C7B5] shadow-2xs shrink-0"
              />
              <div v-else class="w-20 h-20 rounded-2xl bg-[#FBF2E1] border border-[#D8C7B5] flex items-center justify-center shrink-0 shadow-2xs">
                <Icon name="heroicons:building-storefront" class="w-8 h-8 text-[#B4846C]" />
              </div>
              <div class="min-w-0">
                <label class="inline-flex items-center gap-2 h-11 px-3.5 rounded-xl border border-[#D8C7B5] bg-white text-sm font-bold text-[#5C4037] shadow-2xs hover:bg-[#FAF4ED] cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#7D5A50]/40">
                  <Icon name="heroicons:photo" class="w-4 h-4 text-[#7D5A50]" />
                  <span>{{ picture ? 'Choose another' : 'Change picture' }}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="onPicture" />
                </label>
                <p v-if="picture" class="mt-1.5 text-[11px] font-semibold text-emerald-700 truncate">New picture selected · {{ picture.name }}</p>
                <p v-else class="mt-1.5 text-[11px] text-[#8A6E64]">JPG, PNG or WEBP, up to 2MB.</p>
                <p v-if="errors.cafe_picture" class="text-red-600 text-xs font-semibold mt-1">{{ errors.cafe_picture }}</p>
              </div>
            </div>
          </section>

          <!-- ── Contact ─────────────────────────────────────────── -->
          <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5" aria-labelledby="edit-branch-contact-title">
            <div>
              <h3 id="edit-branch-contact-title" class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                <span>Contact</span>
              </h3>
              <p class="text-[11px] text-[#8A6E64] mt-1">How customers and BrewSpot reach this branch.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div class="min-w-0">
                <label for="edit-branch-email" class="block text-xs font-bold text-[#3B1F0E] mb-1">Email address</label>
                <input
                  id="edit-branch-email"
                  v-model="email"
                  type="email"
                  autocomplete="off"
                  placeholder="branch@example.com"
                  :class="inputClass('cafe_email')"
                  @input="delete errors.cafe_email"
                />
                <p v-if="errors.cafe_email" class="text-red-600 text-xs font-semibold mt-1">{{ errors.cafe_email }}</p>
              </div>

              <div class="min-w-0">
                <label for="edit-branch-phone" class="block text-xs font-bold text-[#3B1F0E] mb-1">Phone number</label>
                <input
                  id="edit-branch-phone"
                  v-model="phone"
                  type="tel"
                  inputmode="tel"
                  maxlength="16"
                  placeholder="09123456789"
                  :class="inputClass('cafe_phonenumber')"
                  @input="delete errors.cafe_phonenumber"
                />
                <p v-if="errors.cafe_phonenumber" class="text-red-600 text-xs font-semibold mt-1">{{ errors.cafe_phonenumber }}</p>
                <p v-else class="text-[11px] text-[#8A6E64] mt-1">Mobile, or an 082 landline.</p>
              </div>
            </div>
          </section>

          <p class="rounded-2xl border border-[#F3D9A4] bg-[#FDF8EC] px-4 py-3 text-xs text-[#6B4A12] flex items-start gap-2.5">
            <Icon name="heroicons:information-circle" class="w-4 h-4 shrink-0 mt-0.5 text-[#B07A1E]" />
            <span>Changes apply right away. They are recorded in the activity log, and this branch's managers are notified.</span>
          </p>

          <p v-if="formError" role="alert" class="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-800">{{ formError }}</p>
        </div>

        <!-- Footer: Cancel on the left, the main action on the right -->
        <div class="flex items-center justify-between gap-3 px-6 md:px-8 py-3.5 border-t border-[#EEDFC4] bg-[#FAF8F5] rounded-b-3xl shrink-0">
          <button
            type="button"
            :disabled="saving"
            class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!dirty || saving"
            class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            <Icon v-if="saving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            <span>{{ saving ? 'Saving...' : 'Save Changes' }}</span>
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
