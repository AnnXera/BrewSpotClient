<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useOperatingHours } from '~/composables/useOperatingHours'

const props = defineProps<{
  show: boolean
  saving?: boolean
  backendErrors?: Record<string, string[]>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: typeof form.value): void
}>()

const { formattedSummary } = useOperatingHours()

const currentStep = ref(1)

const form = ref({
  branch_name: '',
  branch_type: 'SIDE',
  address: '',
  phone_number: '',
  manager_name: '',
  manager_email: '',
  manager_phone: '',
  seating_capacity: 40,
  has_drivethru: false,
  use_general_hours: true,
  custom_open_time: '07:00',
  custom_close_time: '22:00',
  amenities: ['High-speed WiFi', 'Airconditioned', 'Power Outlets'],
  cafe_email: '',
  cafe_phonenumber: '',
  tin_number: '',
  vat: 'vat-registered',
  bir_registered_at: ''
})
const birFile = ref<File | null>(null)
const cafePicture = ref<File | null>(null)

const errors = ref<Record<string, string>>({})

const availableAmenities = [
  'High-speed WiFi',
  'Airconditioned',
  'Outdoor Dining',
  'Power Outlets',
  'Pet-Friendly',
  'Parking Space',
  'Drive-Thru Window'
]

const hasBackendErrors = computed(() => Object.keys(props.backendErrors || {}).length > 0)

watch(() => props.backendErrors, (newVal) => {
  if (newVal && Object.keys(newVal).length > 0) {
    currentStep.value = 1
  }
}, { deep: true })

function toggleAmenity(amenity: string) {
  const index = form.value.amenities.indexOf(amenity)
  if (index > -1) {
    form.value.amenities.splice(index, 1)
  } else {
    form.value.amenities.push(amenity)
  }
}

function validateStep(step: number): boolean {
  errors.value = {}
  if (step === 1) {
    if (!form.value.branch_name.trim()) errors.value.branch_name = 'Branch name is required'
    if (!form.value.address.trim()) errors.value.address = 'Branch address is required'
  } else if (step === 3) {
    if (form.value.seating_capacity < 1) errors.value.seating_capacity = 'Must be at least 1 seat'
  } else if (step === 4) {
    if (!form.value.cafe_email.trim()) errors.value.cafe_email = 'Cafe email is required'
    if (!form.value.cafe_phonenumber.trim()) errors.value.cafe_phonenumber = 'Phone number is required'
    if (!form.value.tin_number.trim()) errors.value.tin_number = 'TIN number is required'
    if (!form.value.bir_registered_at.trim()) errors.value.bir_registered_at = 'BIR Registration date is required'
    if (!birFile.value) errors.value.bir_file = 'BIR File is required'
  }
  return Object.keys(errors.value).length === 0
}

function nextStep() {
  if (validateStep(currentStep.value)) {
    currentStep.value++
  }
}

function prevStep() {
  currentStep.value--
}

function handleFileChange(e: Event, type: 'bir' | 'picture') {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    if (type === 'bir') birFile.value = target.files[0]
    if (type === 'picture') cafePicture.value = target.files[0]
  }
}

function handleSubmit() {
  if (!validateStep(4)) return
  const formData = new FormData()
  Object.keys(form.value).forEach(key => {
    formData.append(key, (form.value as any)[key])
  })
  if (birFile.value) formData.append('bir_file', birFile.value)
  if (cafePicture.value) formData.append('cafe_picture', cafePicture.value)

  emit('save', formData as any)
}
</script>

<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="show" class="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-y-auto">
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" @click="emit('close')"></div>
      <div class="relative bg-white border border-[#EEDFC4] rounded-3xl w-full max-w-[806px] p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] my-auto">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-[#F3E7D2] pb-4">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-[#7D5A50] text-white flex items-center justify-center shadow-md">
              <Icon name="heroicons:building-storefront" class="w-6 h-6" />
            </div>
            <div>
              <h2 class="font-display font-extrabold text-xl text-[#3D2B24]">Add New Cafe Branch</h2>
              <p class="text-xs text-[#9E7060]">Register an additional branch location with capacity and operating hours.</p>
            </div>
          </div>
          <button @click="emit('close')" class="p-2 rounded-lg text-[#9E7060] hover:bg-[#FDF3E7] transition-colors">
            <Icon name="heroicons:x-mark" class="w-6 h-6" />
          </button>
        </div>

        <!-- Backend Errors Alert -->
        <div v-if="hasBackendErrors" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs shrink-0">
          <p class="font-bold mb-2 text-sm flex items-center gap-2">
            <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-red-500" />
            Please correct the following errors:
          </p>
          <ul class="list-disc pl-8 space-y-1">
            <template v-for="(msgs, field) in backendErrors" :key="field">
              <li v-for="msg in msgs" :key="msg">{{ msg }}</li>
            </template>
          </ul>
        </div>

        <!-- Form Fields -->
        <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto py-3 pr-1">
          <!-- SECTION 1: Branch Details -->
          <div v-show="currentStep === 1" class="space-y-4">
            <h3 class="text-sm font-extrabold text-[#7D5A50] uppercase tracking-wider">1. Branch Info</h3>
            <div>
              <label class="block text-xs font-bold text-[#3D2B24] mb-1">Branch Name *</label>
              <input
                type="text"
                v-model="form.branch_name"
                placeholder="e.g. La Vida Cafe - Brew City Branch"
                class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
              />
              <p v-if="errors.branch_name" class="text-xs text-red-600 mt-1 font-medium">{{ errors.branch_name }}</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#3D2B24] mb-1">Branch Type *</label>
              <select
                v-model="form.branch_type"
                class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
              >
                <option value="MAIN">MAIN (Headquarters)</option>
                <option value="SIDE">SIDE (Secondary Branch)</option>
                <option value="KIOSK">KIOSK (Express Counter)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#3D2B24] mb-1">Full Branch Address *</label>
              <input
                type="text"
                v-model="form.address"
                placeholder="e.g. 78 Latte Lane, Espresso Heights, Metro City"
                class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
              />
              <p v-if="errors.address" class="text-xs text-red-600 mt-1 font-medium">{{ errors.address }}</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#3D2B24] mb-1">Store Direct Phone Number</label>
              <input
                type="text"
                v-model="form.phone_number"
                placeholder="+63 912 345 6789"
                class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
              />
            </div>
          </div>

          <!-- SECTION 2: Manager & Operating Hours -->
          <div v-show="currentStep === 2" class="space-y-4">
            <h3 class="text-sm font-extrabold text-[#7D5A50] uppercase tracking-wider">2. Manager & Operating Hours</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">Branch Manager Name</label>
                <input
                  type="text"
                  v-model="form.manager_name"
                  placeholder="e.g. Juan Dela Cruz"
                  class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">Manager Phone</label>
                <input
                  type="text"
                  v-model="form.manager_phone"
                  placeholder="+63 917 123 4567"
                  class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#3D2B24] mb-1">Manager Email</label>
              <input
                type="email"
                v-model="form.manager_email"
                placeholder="manager@brewspot.com"
                class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
              />
            </div>

            <!-- Operating Hours Option -->
            <div class="p-4 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] space-y-3">
              <label class="block text-xs font-bold text-[#3D2B24]">Branch Operating Hours Configuration</label>
              
              <div class="flex items-center gap-3">
                <input
                  id="inheritHours"
                  type="radio"
                  :value="true"
                  v-model="form.use_general_hours"
                  class="w-4 h-4 text-[#7D5A50] focus:ring-[#7D5A50]"
                />
                <label for="inheritHours" class="text-xs text-[#3D2B24] font-semibold">
                  Inherit General Store Hours (<span class="text-[#7D5A50] font-extrabold">{{ formattedSummary }}</span>)
                </label>
              </div>

              <div class="flex items-center gap-3">
                <input
                  id="customHours"
                  type="radio"
                  :value="false"
                  v-model="form.use_general_hours"
                  class="w-4 h-4 text-[#7D5A50] focus:ring-[#7D5A50]"
                />
                <label for="customHours" class="text-xs text-[#3D2B24] font-semibold">
                  Set Custom Hours for this Branch
                </label>
              </div>

              <div v-if="!form.use_general_hours" class="flex items-center gap-3 pt-2 text-xs">
                <input
                  type="time"
                  v-model="form.custom_open_time"
                  class="px-3 py-1.5 rounded-lg border border-[#EEDFC4] bg-white text-[#3D2B24] font-bold"
                />
                <span class="text-[#9E7060]">to</span>
                <input
                  type="time"
                  v-model="form.custom_close_time"
                  class="px-3 py-1.5 rounded-lg border border-[#EEDFC4] bg-white text-[#3D2B24] font-bold"
                />
              </div>
            </div>
          </div>

          <!-- SECTION 3: Capacity & Amenities -->
          <div v-show="currentStep === 3" class="space-y-4">
            <h3 class="text-sm font-extrabold text-[#7D5A50] uppercase tracking-wider">3. Capacity & Amenities</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">Seating Capacity (Guests)</label>
                <input
                  type="number"
                  v-model.number="form.seating_capacity"
                  min="1"
                  placeholder="40"
                  class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">Drive-Thru Service</label>
                <div class="flex items-center gap-2 pt-2">
                  <input
                    id="drivethruToggle"
                    type="checkbox"
                    v-model="form.has_drivethru"
                    class="w-4 h-4 rounded border-[#EEDFC4] text-[#7D5A50] focus:ring-[#7D5A50]"
                  />
                  <label for="drivethruToggle" class="text-xs font-bold text-[#3D2B24]">Available at this location</label>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#3D2B24] mb-2">Available Branch Amenities</label>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  v-for="amenity in availableAmenities"
                  :key="amenity"
                  @click="toggleAmenity(amenity)"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                  :class="form.amenities.includes(amenity) ? 'bg-[#7D5A50] text-white border-[#7D5A50]' : 'bg-[#FDF8F3] text-[#7D5A50] border-[#EEDFC4] hover:bg-[#FCDEC0]/50'"
                >
                  <Icon :name="form.amenities.includes(amenity) ? 'heroicons:check-circle' : 'heroicons:plus-circle'" class="w-4 h-4" />
                  <span>{{ amenity }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- SECTION 4: Legal Docs -->
          <div v-show="currentStep === 4" class="space-y-4">
            <h3 class="text-sm font-extrabold text-[#7D5A50] uppercase tracking-wider">4. Legal Docs</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">Cafe Email *</label>
                <input type="email" v-model="form.cafe_email" class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm focus:border-[#7D5A50]" />
                <p v-if="errors.cafe_email" class="text-xs text-red-600 mt-1 font-medium">{{ errors.cafe_email }}</p>
              </div>
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">Cafe Phone Number *</label>
                <input type="text" v-model="form.cafe_phonenumber" placeholder="+639..." class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm focus:border-[#7D5A50]" />
                <p v-if="errors.cafe_phonenumber" class="text-xs text-red-600 mt-1 font-medium">{{ errors.cafe_phonenumber }}</p>
              </div>
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">TIN Number *</label>
                <input type="text" v-model="form.tin_number" class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm focus:border-[#7D5A50]" />
                <p v-if="errors.tin_number" class="text-xs text-red-600 mt-1 font-medium">{{ errors.tin_number }}</p>
              </div>
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">VAT Status *</label>
                <select v-model="form.vat" class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm focus:border-[#7D5A50]">
                  <option value="vat-registered">VAT Registered</option>
                  <option value="non-vat">Non-VAT</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">BIR Registered Date *</label>
                <input type="date" v-model="form.bir_registered_at" class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm focus:border-[#7D5A50]" />
                <p v-if="errors.bir_registered_at" class="text-xs text-red-600 mt-1 font-medium">{{ errors.bir_registered_at }}</p>
              </div>
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">BIR File *</label>
                <input type="file" @change="e => handleFileChange(e, 'bir')" class="w-full text-xs" accept=".jpg,.jpeg,.png,.pdf" />
                <p v-if="errors.bir_file" class="text-xs text-red-600 mt-1 font-medium">{{ errors.bir_file }}</p>
              </div>
              <div>
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">Cafe Picture</label>
                <input type="file" @change="e => handleFileChange(e, 'picture')" class="w-full text-xs" accept=".jpg,.jpeg,.png,.webp" />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-4 mt-6 border-t border-[#F3E7D2]">
            <div class="flex items-center gap-2">
              <button
                v-if="currentStep > 1"
                type="button"
                @click="prevStep"
                class="px-4 py-2 rounded-xl border border-[#EEDFC4] text-[#7D5A50] font-bold text-xs hover:bg-[#FDF3E7] transition"
              >
                Back
              </button>
              <button
                v-if="currentStep < 4"
                type="button"
                @click="nextStep"
                class="px-4 py-2 rounded-xl bg-[#FDF8F3] border border-[#EEDFC4] text-[#7D5A50] font-bold text-xs hover:bg-[#FCDEC0]/40 transition"
              >
                Next Step
              </button>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                @click="emit('close')"
                class="px-5 py-2.5 rounded-xl border border-[#EEDFC4] text-[#7D5A50] font-semibold text-sm hover:bg-[#FDF3E7] transition"
              >
                Cancel
              </button>
              <button
                v-if="currentStep === 4"
                type="button"
                @click="handleSubmit"
                :disabled="saving"
                class="px-6 py-2.5 rounded-xl bg-[#7D5A50] text-white font-bold text-sm hover:bg-[#65463D] transition shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <Icon v-if="saving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                <span>Create Branch</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>
