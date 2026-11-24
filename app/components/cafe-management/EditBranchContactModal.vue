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
  'w-full h-11 rounded-xl border bg-white px-3.5 text-sm font-semibold text-[#2D201B] outline-none transition-all shadow-2xs placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15',
  errors.value[field] ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]',
]
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-6">
      <div class="fixed inset-0 bg-black/45 backdrop-blur-sm" aria-hidden="true" @click="emit('close')" />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-branch-title"
        class="relative bg-white rounded-3xl w-full max-w-[520px] max-h-[calc(100dvh-1.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4]"
        @submit.prevent="save"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-[#EEDFC4] bg-[#FDFBF7] rounded-t-3xl">
          <div class="flex items-center gap-4 min-w-0">
            <div class="w-11 h-11 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0">
              <Icon name="heroicons:pencil-square" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h2 id="edit-branch-title" class="text-xl font-display font-extrabold text-[#3B1F0E]">Edit Contact Details</h2>
              <p class="mt-0.5 text-[13px] text-[#8A6E64] truncate">{{ branch.branch_name }}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] flex items-center justify-center shrink-0"
            @click="emit('close')"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          <!-- Picture -->
          <div class="flex items-center gap-4">
            <img
              v-if="preview || branch.cafe_picture_url"
              :src="preview || branch.cafe_picture_url || ''"
              alt=""
              class="w-20 h-20 rounded-2xl object-cover border border-[#EDD8CC] shrink-0"
            />
            <div v-else class="w-20 h-20 rounded-2xl bg-[#F4ECE1] border border-[#EDD8CC] flex items-center justify-center shrink-0">
              <Icon name="heroicons:building-storefront" class="w-8 h-8 text-[#9E7060]" />
            </div>
            <div class="min-w-0">
              <label class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#DED4CA] bg-white text-xs font-semibold text-[#5B463C] hover:border-[#7D5A50] hover:bg-[#F8EFE7] cursor-pointer transition-colors">
                <Icon name="heroicons:photo" class="size-3.5 text-[#7D5A50]" />
                <span>{{ picture ? 'Choose another' : 'Change picture' }}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="onPicture" />
              </label>
              <p class="mt-1.5 text-[11px] text-[#9E7060]">JPG, PNG or WEBP, up to 2MB.</p>
              <p v-if="errors.cafe_picture" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.cafe_picture }}</p>
            </div>
          </div>

          <div>
            <label for="edit-branch-email" class="block text-xs font-bold text-[#3B1F0E] mb-1">Email Address</label>
            <input id="edit-branch-email" v-model="email" type="email" autocomplete="off" :class="inputClass('cafe_email')" @input="delete errors.cafe_email" />
            <p v-if="errors.cafe_email" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.cafe_email }}</p>
          </div>

          <div>
            <label for="edit-branch-phone" class="block text-xs font-bold text-[#3B1F0E] mb-1">Phone Number</label>
            <input
              id="edit-branch-phone"
              v-model="phone"
              type="tel"
              inputmode="tel"
              maxlength="16"
              placeholder="09123456789 or 0822991234"
              :class="inputClass('cafe_phonenumber')"
              @input="delete errors.cafe_phonenumber"
            />
            <p v-if="errors.cafe_phonenumber" class="text-xs text-red-600 mt-1 font-semibold">{{ errors.cafe_phonenumber }}</p>
          </div>

          <p class="rounded-xl bg-[#FAF4ED] border border-[#EDD8CC] px-3.5 py-2.5 text-xs text-[#6B4A3A] flex items-start gap-2">
            <Icon name="heroicons:information-circle" class="w-4 h-4 shrink-0 mt-px text-[#A96746]" />
            <span>Changes apply right away. They are recorded in the activity log, and this branch's managers are notified.</span>
          </p>

          <p v-if="formError" role="alert" class="text-sm text-red-700 font-semibold">{{ formError }}</p>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#EEDFC4]">
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl border border-[#DED4CA] bg-white text-sm font-semibold text-[#5B463C] hover:bg-[#F8EFE7]"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2.5 rounded-xl bg-[#7D5A50] text-sm font-bold text-[#FFF8EA] hover:bg-[#6A4A41] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            :disabled="!dirty || saving"
          >
            <Icon v-if="saving" name="heroicons:arrow-path" class="size-4 animate-spin" />
            <span>{{ saving ? 'Saving...' : 'Save changes' }}</span>
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
