<script setup lang="ts">
// Owner or Manager needs to be logged in to set up a POS device
definePageMeta({
  role: ['Cafe Owner', 'Manager'],
  layout: 'blank'
})

const posService = usePosService()
const router = useRouter()
const authCookie = useCookie<string | null>('auth_token')
const posDeviceCookie = useCookie<string | null>('pos_device_token')

const loading = ref(false)
const errorMessage = ref('')
const branches = ref<any[]>([])

const selectedBranch = ref('')
const deviceName = ref('')

async function fetchBranches() {
  loading.value = true
  try {
    const res = await posService.getSetupBranches()
    if (res.success && res.branches) {
      branches.value = res.branches
      if (branches.value.length > 0) {
        selectedBranch.value = branches.value[0].uuid
      }
    } else {
      errorMessage.value = 'Failed to load branches for setup.'
    }
  } catch (e: any) {
    errorMessage.value = e?.data?.message || 'Error fetching branches'
  } finally {
    loading.value = false
  }
}

async function registerDevice() {
  if (!selectedBranch.value || !deviceName.value) {
    errorMessage.value = 'Please select a branch and enter a device name.'
    return
  }

  loading.value = true
  errorMessage.value = ''
  
  try {
    const res = await posService.registerDevice(selectedBranch.value, deviceName.value)
    if (res.success && res.device_token) {
      // 1. Save the POS device token
      posDeviceCookie.value = res.device_token
      
      // 2. Discard the owner/manager auth token from this shared device
      authCookie.value = null
      
      // 3. Redirect to the actual POS register screen
      router.push('/pos')
    } else {
      errorMessage.value = res.message || 'Failed to register device.'
    }
  } catch (e: any) {
    errorMessage.value = e?.data?.message || 'Error registering POS device'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchBranches()
})
</script>

<template>
  <div class="min-h-screen bg-[#FFF8EA] flex flex-col items-center justify-center p-6 font-display">
    <div class="w-full max-w-md bg-white border border-[#EDD8CC] rounded-2xl p-8 shadow-sm">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-[#3D2B24] mb-2">Setup Register</h1>
        <p class="text-[#8B6656] text-sm">Register this device as a POS terminal for your branch.</p>
      </div>

      <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm font-medium">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="registerDevice" class="space-y-5">
        <div>
          <label class="block text-sm font-bold text-[#3D2B24] mb-2">Branch</label>
          <select 
            v-model="selectedBranch" 
            class="w-full bg-[#FDF3E7] border border-[#EDD8CC] text-[#3D2B24] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7D5A50]"
            :disabled="loading"
          >
            <option disabled value="">Select a branch</option>
            <option v-for="branch in branches" :key="branch.uuid" :value="branch.uuid">
              {{ branch.branch_name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-bold text-[#3D2B24] mb-2">Register Name</label>
          <input 
            v-model="deviceName" 
            type="text" 
            placeholder="e.g. Front Counter 1" 
            class="w-full bg-[#FDF3E7] border border-[#EDD8CC] text-[#3D2B24] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7D5A50]"
            :disabled="loading"
          />
        </div>

        <button 
          type="submit" 
          class="w-full bg-[#7D5A50] hover:bg-[#684940] text-white font-bold rounded-xl py-3.5 transition-colors flex items-center justify-center gap-2 mt-4"
          :disabled="loading"
        >
          <Icon v-if="loading" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
          {{ loading ? 'Registering...' : 'Register Device' }}
        </button>
        
        <p class="text-xs text-center text-[#8B6656] mt-4">
          Note: This will log you out of your manager account on this device so staff can safely use the register.
        </p>
      </form>
    </div>
  </div>
</template>
