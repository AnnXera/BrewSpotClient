<script setup lang="ts">
import { ref } from 'vue'
import { useOperatingHours } from '~/composables/useOperatingHours'

const props = defineProps<{
  show: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: typeof form.value): void
}>()

const { formattedSummary } = useOperatingHours()

const activeTab = ref<'details' | 'manager' | 'amenities'>('details')

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
  status: 'active',
  use_general_hours: true,
  custom_open_time: '07:00',
  custom_close_time: '22:00',
  amenities: ['High-speed WiFi', 'Airconditioned', 'Power Outlets']
})

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

function toggleAmenity(amenity: string) {
  const index = form.value.amenities.indexOf(amenity)
  if (index > -1) {
    form.value.amenities.splice(index, 1)
  } else {
    form.value.amenities.push(amenity)
  }
}

function validate() {
  errors.value = {}
  if (!form.value.branch_name.trim()) errors.value.branch_name = 'Branch name is required'
  if (!form.value.address.trim()) errors.value.address = 'Branch address is required'
  if (form.value.seating_capacity < 1) errors.value.seating_capacity = 'Must be at least 1 seat'
  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (!validate()) return
  emit('save', { ...form.value })
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
    <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div class="bg-white border border-[#EEDFC4] rounded-[24px] max-w-2xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] my-auto">
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

        <!-- Navigation Tabs -->
        <div class="flex border-b border-[#F3E7D2] gap-4">
          <button
            type="button"
            @click="activeTab = 'details'"
            class="pb-2 text-xs font-extrabold transition-colors border-b-2"
            :class="activeTab === 'details' ? 'border-[#7D5A50] text-[#7D5A50]' : 'border-transparent text-[#9E7060] hover:text-[#3D2B24]'"
          >
            1. Branch Info
          </button>
          <button
            type="button"
            @click="activeTab = 'manager'"
            class="pb-2 text-xs font-extrabold transition-colors border-b-2"
            :class="activeTab === 'manager' ? 'border-[#7D5A50] text-[#7D5A50]' : 'border-transparent text-[#9E7060] hover:text-[#3D2B24]'"
          >
            2. Manager & Operating Hours
          </button>
          <button
            type="button"
            @click="activeTab = 'amenities'"
            class="pb-2 text-xs font-extrabold transition-colors border-b-2"
            :class="activeTab === 'amenities' ? 'border-[#7D5A50] text-[#7D5A50]' : 'border-transparent text-[#9E7060] hover:text-[#3D2B24]'"
          >
            3. Capacity & Amenities
          </button>
        </div>

        <!-- Form Fields -->
        <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          <!-- TAB 1: Branch Details -->
          <div v-show="activeTab === 'details'" class="space-y-4">
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

            <div class="grid grid-cols-2 gap-4">
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
                <label class="block text-xs font-bold text-[#3D2B24] mb-1">Initial Status</label>
                <select
                  v-model="form.status"
                  class="w-full px-4 py-2.5 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] text-sm text-[#3D2B24] focus:outline-none focus:border-[#7D5A50]"
                >
                  <option value="active">Active</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
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

          <!-- TAB 2: Manager & Operating Hours -->
          <div v-show="activeTab === 'manager'" class="space-y-4">
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

          <!-- TAB 3: Capacity & Amenities -->
          <div v-show="activeTab === 'amenities'" class="space-y-4">
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

          <!-- Actions -->
          <div class="flex items-center justify-between pt-4 border-t border-[#F3E7D2]">
            <div class="flex items-center gap-2">
              <button
                v-if="activeTab !== 'details'"
                type="button"
                @click="activeTab = activeTab === 'amenities' ? 'manager' : 'details'"
                class="px-4 py-2 rounded-xl border border-[#EEDFC4] text-[#7D5A50] font-bold text-xs hover:bg-[#FDF3E7] transition"
              >
                Back
              </button>
              <button
                v-if="activeTab !== 'amenities'"
                type="button"
                @click="activeTab = activeTab === 'details' ? 'manager' : 'amenities'"
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
                type="submit"
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
