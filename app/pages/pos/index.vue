<script setup lang="ts">
// POS Register uses its own auth via pos_device_token cookie
// It does not use the standard user auth, so we don't define a 'role' requirement here.
definePageMeta({
  layout: 'blank',
})

const devicePosService = useDevicePosService()
const router = useRouter()
const posDeviceCookie = useCookie<string | null>('pos_device_token')

const loading = ref(true)
const errorMessage = ref('')
const device = ref<any>(null)
const staffList = ref<any[]>([])

const selectedStaff = ref<any>(null)
const pinInput = ref('')
const isChangingPin = ref(false)
const newPinInput = ref('')

async function loadDeviceData() {
  // If no device token, go to setup
  if (!posDeviceCookie.value) {
    router.push('/pos/setup')
    return
  }

  loading.value = true
  try {
    // 1. Fetch current device info
    const devRes = await devicePosService.getCurrentDevice()
    if (devRes.success) {
      device.value = devRes.device
      
      // If a staff is already active, we are unlocked!
      if (device.value.active_staff) {
        selectedStaff.value = device.value.active_staff
      }
    } else {
      router.push('/pos/setup')
      return
    }

    // 2. Fetch lock screen staff
    const staffRes = await devicePosService.getLockScreenStaff()
    if (staffRes.success) {
      staffList.value = staffRes.staff
    }

    // 3. Fetch menu
    const menuRes = await devicePosService.getMenu()
    if (menuRes.success) {
      categories.value = [{ uuid: 'all', name: 'All Items' }, ...menuRes.categories]
      menuItems.value = menuRes.items
    }
  } catch (e: any) {
    // 401 Unauthorized means the token was revoked or expired
    if (e?.response?.status === 401) {
      posDeviceCookie.value = null
      router.push('/pos/setup')
    }
    errorMessage.value = e?.data?.message || 'Failed to load POS data'
  } finally {
    loading.value = false
  }
}

function handleNumpad(num: string) {
  if (isChangingPin.value) {
    if (newPinInput.value.length < 6) newPinInput.value += num
  } else {
    if (pinInput.value.length < 6) pinInput.value += num
  }
}

function handleBackspace() {
  if (isChangingPin.value) {
    newPinInput.value = newPinInput.value.slice(0, -1)
  } else {
    pinInput.value = pinInput.value.slice(0, -1)
  }
}

function clearPin() {
  pinInput.value = ''
  newPinInput.value = ''
  errorMessage.value = ''
}

function selectStaffForUnlock(staff: any) {
  selectedStaff.value = staff
  isChangingPin.value = false
  clearPin()
}

function cancelUnlock() {
  selectedStaff.value = null
  isChangingPin.value = false
  clearPin()
}

async function submitPin() {
  if (!selectedStaff.value) return
  
  loading.value = true
  errorMessage.value = ''
  
  try {
    if (isChangingPin.value) {
      // Submit change PIN
      const res = await devicePosService.changePinAndUnlock(selectedStaff.value.uuid, pinInput.value, newPinInput.value)
      if (res.success) {
        // Unlocked!
        device.value.active_staff = res.staff
        selectedStaff.value = res.staff
        isChangingPin.value = false
        clearPin()
      } else {
        errorMessage.value = res.message || 'Failed to change PIN'
      }
    } else {
      // Standard Unlock
      const res = await devicePosService.unlock(selectedStaff.value.uuid, pinInput.value)
      
      if (res.must_change_pin) {
        isChangingPin.value = true
        errorMessage.value = res.message // "This is a temporary PIN..."
      } else if (res.success) {
        // Unlocked!
        device.value.active_staff = res.staff
        selectedStaff.value = res.staff
        clearPin()
      } else {
        errorMessage.value = res.message || 'Incorrect PIN'
        pinInput.value = '' // Clear for retry
      }
    }
  } catch (e: any) {
    if (e?.data?.must_change_pin) {
      isChangingPin.value = true
      errorMessage.value = e.data.message
    } else {
      errorMessage.value = e?.data?.message || 'Incorrect PIN'
      pinInput.value = '' // Clear for retry
    }
  } finally {
    loading.value = false
  }
}

async function lockRegister() {
  loading.value = true
  try {
    await devicePosService.lock()
    device.value.active_staff = null
    selectedStaff.value = null
    clearPin()
    // Clear cart on lock
    cart.value = []
    selectedCategory.value = 'all'
  } catch (e) {
    console.error('Failed to lock', e)
  } finally {
    loading.value = false
  }
}

async function unregisterDevice() {
  if (!confirm('Are you sure you want to unregister this POS device? It will need to be set up again by a manager.')) return
  
  loading.value = true
  try {
    await devicePosService.unregisterDevice()
    posDeviceCookie.value = null
    router.push('/pos/setup')
  } catch (e) {
    console.error('Failed to unregister', e)
    loading.value = false
  }
}

onMounted(() => {
  loadDeviceData()
  timer = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// ── LIVE CLOCK ─────────────────────────────────────────────────────────────
const currentTime = ref(new Date())
let timer: any

const formattedTime = computed(() => {
  return currentTime.value.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
})

// ── POS REGISTER STATE & LOGIC ──────────────────────────────────────────────
const categories = ref<any[]>([])
const selectedCategory = ref('all')

const menuItems = ref<any[]>([])

const searchQuery = ref('')

const filteredItems = computed(() => {
  let items = menuItems.value
  
  if (selectedCategory.value !== 'all') {
    items = items.filter(item => item.category_uuid === selectedCategory.value)
  }
  
  if (searchQuery.value.trim() !== '') {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(item => item.menu_name.toLowerCase().includes(q))
  }
  
  return items
})

interface CartItem {
  uuid: string
  menu_name: string
  base_price: number
  quantity: number
  picture?: string
  sugar_level?: number
  addons?: string[]
}

const cart = ref<CartItem[]>([])

function getAddonPrice(addon: string) {
  return !addon.toLowerCase().includes('ice') ? 25 : 0;
}

function getItemUnitPrice(item: any) {
  let price = item.base_price;
  if (item.addons && item.addons.length > 0) {
    item.addons.forEach((addon: string) => {
      price += getAddonPrice(addon);
    });
  }
  return price;
}

const baseItemsTotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + (item.base_price * item.quantity), 0);
})

const addonsTotal = computed(() => {
  return cart.value.reduce((sum, item) => {
    let itemAddonTotal = 0;
    if (item.addons && item.addons.length > 0) {
      item.addons.forEach((addon: string) => {
        itemAddonTotal += getAddonPrice(addon);
      });
    }
    return sum + (itemAddonTotal * item.quantity);
  }, 0);
})

const subtotal = computed(() => {
  return baseItemsTotal.value + addonsTotal.value;
})
const tax = computed(() => {
  if (device.value?.vat_status === 'vat-registered') {
    return subtotal.value * 0.12 // 12% VAT
  }
  return 0 // Non-VAT
})

const selectedDiscountType = ref<'none'|'PWD'|'Senior'|'VIP'>('none')
const discountAmount = computed(() => {
  if (selectedDiscountType.value === 'none') return 0
  if (selectedDiscountType.value === 'PWD' || selectedDiscountType.value === 'Senior') {
    return subtotal.value * 0.20 // 20% discount
  }
  if (selectedDiscountType.value === 'VIP') {
    return subtotal.value * 0.10 // 10% discount
  }
  return 0
})

const total = computed(() => subtotal.value + tax.value - discountAmount.value)

const availableAddons = [
  'Extra Espresso Shot', 'Vanilla Syrup', 'Caramel Syrup', 'Hazelnut Syrup', 'Oat Milk', 'Almond Milk', 'Extra Ice', 'Less Ice', 'No Ice'
]
const sugarLevels = [0, 25, 50, 75, 100]

const isCustomizationModalOpen = ref(false)
const pendingCartItem = ref<any>(null)

function openCustomizationModal(item: any) {
  pendingCartItem.value = { ...item, sugar_level: 100, addons: [] }
  isCustomizationModalOpen.value = true
}

function confirmAddToCart() {
  if (!pendingCartItem.value) return
  
  const pAddons = pendingCartItem.value.addons.slice().sort().join(',')
  
  const existing = cart.value.find(i => {
    if (i.uuid !== pendingCartItem.value.uuid) return false
    if (i.sugar_level !== pendingCartItem.value.sugar_level) return false
    const iAddons = i.addons ? i.addons.slice().sort().join(',') : ''
    return iAddons === pAddons
  })
  
  if (existing) {
    existing.quantity++
  } else {
    cart.value.push({ ...pendingCartItem.value, quantity: 1 })
  }
  
  isCustomizationModalOpen.value = false
  pendingCartItem.value = null
}

function cancelAddToCart() {
  isCustomizationModalOpen.value = false
  pendingCartItem.value = null
}

function pendingAddonChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const addon = target.value
  if (!addon) return
  if (!pendingCartItem.value.addons.includes(addon)) {
    pendingCartItem.value.addons.push(addon)
  }
  target.value = ''
}

function removePendingAddon(addon: string) {
  pendingCartItem.value.addons = pendingCartItem.value.addons.filter((a: string) => a !== addon)
}

function updateQuantity(item: CartItem, delta: number) {
  const existing = cart.value.find(i => i.uuid === item.uuid && i.sugar_level === item.sugar_level)
  if (existing) {
    existing.quantity += delta
    if (existing.quantity <= 0) {
      cart.value = cart.value.filter(i => !(i.uuid === item.uuid && i.sugar_level === item.sugar_level))
    }
  }
}

function clearCart() {
  if (confirm('Clear the current order?')) {
    cart.value = []
  }
}

// Payment Modal State

const selectedPaymentMethod = ref('cash')
const amountTendered = ref<number | string>('')
const referenceNumber = ref('')

const changeAmount = computed(() => {
  if (selectedPaymentMethod.value !== 'cash') return 0
  const tendered = Number(amountTendered.value)
  return tendered > total.value ? tendered - total.value : 0
})

const canCheckout = computed(() => {
  if (cart.value.length === 0) return false
  if (selectedPaymentMethod.value === 'cash') {
    return Number(amountTendered.value) >= total.value
  }
  if (selectedPaymentMethod.value === 'card' || selectedPaymentMethod.value === 'ewallet') {
    return referenceNumber.value.trim().length > 0
  }
  return true
})


const isProcessingOrder = ref(false)
const isReceiptModalOpen = ref(false)
const isConfirmOrderModalOpen = ref(false)
const completedOrderDetails = ref<any>(null)

function promptConfirmOrder() {
  if (!canCheckout.value) return
  isConfirmOrderModalOpen.value = true
}

async function completeOrder() {
  isConfirmOrderModalOpen.value = false
  if (!canCheckout.value) return
  isProcessingOrder.value = true
  try {
    const items = cart.value.map(i => ({ 
      uuid: i.uuid, 
      quantity: i.quantity, 
      sugar_level: i.sugar_level,
      addons: i.addons && i.addons.length > 0 ? i.addons : null
    }))
    const currentChange = changeAmount.value
    const currentTotal = total.value
    const currentMethod = selectedPaymentMethod.value
    const currentItems = [...cart.value]
    const currentStaff = device.value?.active_staff?.firstname || 'Admin'

    const res = await devicePosService.checkout(
      items, 
      selectedPaymentMethod.value, 
      Number(amountTendered.value) || total.value, 
      referenceNumber.value,
      selectedDiscountType.value !== 'none' ? selectedDiscountType.value : undefined,
      discountAmount.value
    )
    if (res.success) {
      completedOrderDetails.value = {
        receiptNumber: res.receipt_number || res.transaction_uuid,
        items: currentItems,
        baseItemsTotal: baseItemsTotal.value,
        addonsTotal: addonsTotal.value,
        subtotal: subtotal.value,
        tax: tax.value,
        discountType: selectedDiscountType.value,
        discountAmount: discountAmount.value,
        total: currentTotal,
        paymentMethod: currentMethod,
        change: currentChange,
        staff: currentStaff,
        date: new Date().toLocaleString()
      }
      isReceiptModalOpen.value = true
      cart.value = []
      amountTendered.value = ''
      referenceNumber.value = ''
      selectedDiscountType.value = 'none'
    }
  } catch (e: any) {
    alert(e?.data?.message || 'Failed to complete checkout')
  } finally {
    isProcessingOrder.value = false
  }
}

// Transactions Modal State
const isTransactionsModalOpen = ref(false)
const transactionsData = ref<any>(null)
const isLoadingTransactions = ref(false)

async function openTransactions() {
  isTransactionsModalOpen.value = true
  isLoadingTransactions.value = true
  try {
    const res = await devicePosService.getTransactions()
    if (res.success) {
      transactionsData.value = res
    }
  } catch (e: any) {
    alert('Failed to load transactions')
  } finally {
    isLoadingTransactions.value = false
  }
}

function printZReading() {
  window.print()
}

function printReceipt() {
  // Briefly hide the Z-reading and show the receipt, then print
  const zReading = document.getElementById('z-reading-print')
  const receiptTicket = document.getElementById('receipt-print')
  if(zReading) zReading.style.display = 'none'
  if(receiptTicket) receiptTicket.style.display = 'block'
  
  window.print()
  
  if(zReading) zReading.style.display = ''
  if(receiptTicket) receiptTicket.style.display = ''
}

function closeReceipt() {
  isReceiptModalOpen.value = false
  completedOrderDetails.value = null
}

function exportTransactionsCSV() {
  if (!transactionsData.value || !transactionsData.value.transactions) return
  
  const headers = ['Receipt Number', 'Date', 'Staff', 'Total Amount', 'Status', 'Items Count']
  const rows = transactionsData.value.transactions.map((t: any) => [
    t.receipt_number || t.uuid,
    new Date(t.created_at).toLocaleString(),
    t.staff_name,
    t.total_amount,
    t.status,
    t.items_count
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map((row: any) => row.map((field: any) => `"${field}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `Transactions_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
}
</script>

<template>
  <div class="w-full h-full">
    <!-- Main App Interface (Hidden during printing) -->
    <div class="h-[100dvh] overflow-hidden bg-[#FFF8EA] font-sans flex flex-col text-[#2d201b] selection:bg-[#7B5A50]/20 selection:text-[#7B5A50] print:hidden">
      <!-- Loading State -->
      <div v-if="loading && !device" class="flex-1 flex items-center justify-center">
      <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <template v-else-if="device">
      <!-- ── HEADER ───────────────────────────────────────────────────────── -->
      <header class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div class="flex-1 flex items-center gap-2">
          <Icon name="lucide:coffee" class="w-7 h-7 text-[#7B5A50]" />
          <div>
            <h1 class="text-lg font-bold text-[#7B5A50]">{{ device.cafe_name || device.branch_name || 'BrewSpot POS' }}</h1>
            <p class="text-sm text-gray-500">{{ device.branch_name }} &bull; {{ device.name }}</p>
          </div>
        </div>

        <div class="flex-1 text-center hidden md:block">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
            <Icon name="heroicons:clock" class="w-4 h-4 text-gray-400" />
            <span class="text-sm font-bold font-mono tracking-tight">{{ formattedTime }}</span>
          </div>
        </div>

        <div class="flex-1 flex items-center justify-end gap-3">
          <template v-if="device.active_staff">
            <div class="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
              <div class="w-6 h-6 bg-[#7B5A50] text-white rounded-full flex items-center justify-center text-sm font-bold">
                {{ device.active_staff.firstname?.charAt(0) || 'U' }}
              </div>
              <span class="font-semibold text-base text-gray-700">{{ device.active_staff.firstname }}</span>
            </div>
            
            <button @click="openTransactions" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md text-base font-semibold transition-colors flex items-center gap-1.5 shadow-sm">
              <Icon name="heroicons:document-text" class="w-4 h-4" /> Transactions
            </button>
            <button @click="lockRegister" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md text-base font-semibold transition-colors flex items-center gap-1.5 shadow-sm">
              <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" /> End Shift
            </button>
          </template>
          <template v-else>
            <button @click="unregisterDevice" class="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors px-2 py-1">
              De-register
            </button>
          </template>
        </div>
      </header>

      <!-- ── LOCK SCREEN ──────────────────────────────────────────────────── -->
      <main v-if="!device.active_staff" class="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50">
        
        <!-- STEP 1: Select Staff -->
        <div v-if="!selectedStaff" class="w-full max-w-3xl">
          <h2 class="text-2xl font-bold text-gray-800 text-center mb-6">Select Staff</h2>
          
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <button 
              v-for="staff in staffList" 
              :key="staff.uuid"
              @click="selectStaffForUnlock(staff)"
              class="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center gap-2 hover:border-gray-400 hover:shadow-sm transition-all group"
            >
              <div class="w-12 h-12 rounded-full bg-gray-100 text-[#7B5A50] flex items-center justify-center text-2xl font-bold group-hover:bg-[#7B5A50] group-hover:text-white transition-colors">
                {{ staff.firstname.charAt(0) }}
              </div>
              <div class="text-center">
                <p class="font-semibold text-gray-800 text-base">{{ staff.firstname }}</p>
                <p class="text-sm text-gray-500">{{ staff.role }}</p>
              </div>
            </button>
          </div>
        </div>

        <!-- STEP 2: PIN Entry -->
        <div v-else class="w-full max-w-[280px]">
          <div class="text-center mb-4">
            <h2 class="text-xl font-bold text-gray-800">{{ selectedStaff.firstname }}</h2>
            <p class="text-base text-gray-500">
              {{ isChangingPin ? 'Enter new PIN' : 'Enter PIN to unlock' }}
            </p>
          </div>

          <div v-if="errorMessage" class="mb-4 p-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm font-medium text-center">
            {{ errorMessage }}
          </div>

          <!-- PIN Display -->
          <div class="flex justify-center gap-2 mb-6">
            <div v-for="i in 6" :key="i" class="w-8 h-10 rounded-md border flex items-center justify-center text-2xl transition-colors"
                 :class="(isChangingPin ? newPinInput.length : pinInput.length) >= i ? 'border-[#7B5A50] bg-[#7B5A50] text-white' : 'border-gray-300 bg-white'">
              <span v-if="(isChangingPin ? newPinInput.length : pinInput.length) >= i">•</span>
            </div>
          </div>

          <!-- Numpad -->
          <div class="grid grid-cols-3 gap-2 mb-4">
            <button v-for="n in ['1','2','3','4','5','6','7','8','9']" :key="n" @click="handleNumpad(n)" 
                    class="bg-white border border-gray-200 rounded-lg h-12 text-xl font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-200 active:scale-95 transition-all shadow-sm">
              {{ n }}
            </button>
            <button @click="cancelUnlock" class="bg-gray-100 border border-gray-200 rounded-lg h-12 text-sm font-semibold text-gray-600 hover:bg-gray-200 active:scale-95 transition-all">
              CLR
            </button>
            <button @click="handleNumpad('0')" class="bg-white border border-gray-200 rounded-lg h-12 text-xl font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-200 active:scale-95 transition-all shadow-sm">
              0
            </button>
            <button @click="handleBackspace" class="bg-gray-100 border border-gray-200 rounded-lg h-12 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all">
              <Icon name="heroicons:backspace" class="w-5 h-5" />
            </button>
          </div>

          <button 
            @click="submitPin" 
            class="w-full bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-lg py-3 text-base transition-colors shadow-sm flex items-center justify-center gap-2"
            :disabled="loading"
          >
            <Icon v-if="loading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            {{ isChangingPin ? 'SET NEW PIN' : 'UNLOCK' }}
          </button>
        </div>

      </main>

      <!-- ── ACTIVE REGISTER (UNLOCKED) ───────────────────────────────────── -->
      <main v-else class="flex-1 flex overflow-hidden">
        <!-- Left Side: Menu Grid -->
        <div class="flex-1 flex flex-col bg-gray-50 overflow-hidden border-r border-gray-200">
          <!-- Search and Categories Filter -->
          <div class="px-4 py-2 bg-white border-b border-gray-200 flex flex-col gap-2">
            <!-- Search Bar -->
            <div class="relative w-full">
              <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Search products..." 
                class="w-full bg-gray-50 border border-gray-200 rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] transition-all"
              />
              <button 
                v-if="searchQuery" 
                @click="searchQuery = ''"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Icon name="heroicons:x-mark" class="w-4 h-4" />
              </button>
            </div>
            
            <!-- Category Pills -->
            <div class="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
              <button 
                v-for="cat in categories" 
                :key="cat.uuid"
                @click="selectedCategory = cat.uuid"
                class="whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-semibold transition-all border shrink-0"
                :class="selectedCategory === cat.uuid ? 'bg-[#7B5A50] border-[#7B5A50] text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'"
              >
                {{ cat.name }}
              </button>
            </div>
          </div>

          <!-- Items Grid -->
          <div class="flex-1 overflow-y-auto p-4 min-h-0">
            <div class="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              <button 
                v-for="item in filteredItems" 
                :key="item.uuid"
                @click="openCustomizationModal(item)"
                class="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-md hover:border-[#7B5A50]/50 transition-all text-left flex flex-col group active:scale-[0.98]"
              >
                <div class="h-20 w-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400 overflow-hidden">
                  <img v-if="item.picture" :src="item.picture" :alt="item.menu_name" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  <Icon v-else name="heroicons:photo" class="w-8 h-8 opacity-30 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div class="p-2.5 flex flex-col gap-0.5">
                  <h3 class="font-semibold text-gray-800 text-sm leading-tight truncate">{{ item.menu_name }}</h3>
                  <p class="text-gray-500 text-sm">{{ formatCurrency(item.base_price) }}</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Right Side: Cart / Order Summary -->
        <div class="w-[320px] bg-white flex flex-col shadow-sm border-l border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h2 class="text-base font-semibold text-gray-800 flex items-center gap-1.5">
              <Icon name="heroicons:shopping-cart" class="w-4 h-4" />
              Current Order
            </h2>
            <button v-if="cart.length" @click="clearCart" class="text-sm text-red-600 hover:text-red-800 font-medium">
              Clear
            </button>
          </div>

          <!-- Cart Items List -->
          <div class="flex-1 overflow-y-auto p-3 min-h-0">
            <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-center opacity-50">
              <Icon name="heroicons:document-text" class="w-8 h-8 text-gray-400 mb-2" />
              <p class="text-base text-gray-500 font-medium">Empty Order</p>
            </div>
            <div v-else class="space-y-2 overflow-x-hidden">
              <TransitionGroup name="list" tag="div" class="space-y-2">
                <div v-for="item in cart" :key="item.uuid + '-' + item.sugar_level + '-' + (item.addons?.join(',') || '')" class="flex flex-col bg-white p-2.5 rounded-md border border-gray-100 shadow-sm gap-2 transition-all">
                  <div class="flex justify-between items-start w-full">
                    <div class="flex flex-col flex-1 pr-2">
                      <p class="font-semibold text-gray-800 text-sm leading-tight">
                        {{ item.menu_name }}
                        <span v-if="item.sugar_level !== undefined" class="text-[10px] bg-gray-100 text-[#7B5A50] px-1 py-0.5 rounded ml-1 whitespace-nowrap">{{ item.sugar_level }}% Sugar</span>
                      </p>
                      <div v-if="item.addons && item.addons.length > 0" class="flex flex-wrap gap-1 mt-1">
                        <span v-for="addon in item.addons" :key="addon" class="text-[9px] bg-gray-50 text-gray-500 border border-gray-200 px-1 py-0.5 rounded">
                          {{ addon }} <span v-if="getAddonPrice(addon) > 0">(+{{ formatCurrency(getAddonPrice(addon)) }})</span>
                        </span>
                      </div>
                    </div>
                    <div class="font-semibold text-gray-800 text-right text-sm whitespace-nowrap">
                      {{ formatCurrency(getItemUnitPrice(item) * item.quantity) }}
                    </div>
                  </div>
                  
                  <div class="flex items-center justify-between w-full">
                    <p class="text-xs text-gray-500">{{ formatCurrency(getItemUnitPrice(item)) }} each</p>
                    <div class="flex items-center gap-2 bg-gray-50 rounded border border-gray-200">
                      <button @click="updateQuantity(item, -1)" class="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors active:scale-90">
                        <Icon name="heroicons:minus" class="w-3 h-3" />
                      </button>
                      <span class="w-4 text-center font-semibold text-gray-800 text-sm">{{ item.quantity }}</span>
                      <button @click="updateQuantity(item, 1)" class="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors active:scale-90">
                        <Icon name="heroicons:plus" class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </TransitionGroup>
            </div>
          </div>

          <!-- Cart Totals & Payment -->
          <div class="p-4 bg-gray-50 border-t border-gray-200 shrink-0">
            <div class="space-y-1.5 mb-3 text-sm font-medium text-gray-500">
              <div class="flex justify-between">
                <span>Items Subtotal</span>
                <span>{{ formatCurrency(baseItemsTotal) }}</span>
              </div>
              <div v-if="addonsTotal > 0" class="flex justify-between">
                <span>Add-ons Total</span>
                <span>{{ formatCurrency(addonsTotal) }}</span>
              </div>
              
              <!-- Discount Selection -->
              <div class="flex justify-between items-center py-1 border-t border-gray-100 mt-1 pt-2">
                <span class="text-xs font-bold uppercase text-gray-500">Discount</span>
                <select v-model="selectedDiscountType" class="text-xs py-0.5 px-2 rounded border border-gray-200 bg-white outline-none">
                  <option value="none">None</option>
                  <option value="PWD">PWD (20%)</option>
                  <option value="Senior">Senior (20%)</option>
                  <option value="VIP">VIP Member (10%)</option>
                </select>
              </div>

              <div v-if="device?.vat_status === 'vat-registered'" class="flex justify-between">
                <span>VAT (12%)</span>
                <span>{{ formatCurrency(tax) }}</span>
              </div>
              <div v-if="discountAmount > 0" class="flex justify-between text-red-500">
                <span>Discount ({{ selectedDiscountType }})</span>
                <span>- {{ formatCurrency(discountAmount) }}</span>
              </div>
              <div class="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200 mt-2">
                <span>Total Due</span>
                <span class="text-[#7B5A50]">{{ formatCurrency(total) }}</span>
              </div>
            </div>

            <!-- Payment Method Selection -->
            <div v-if="cart.length > 0" class="pt-3 border-t border-gray-200 space-y-3 mb-4">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Method</p>
              <div class="grid grid-cols-3 gap-2">
                <button @click="selectedPaymentMethod = 'cash'" class="py-2 flex flex-col items-center justify-center gap-1 rounded-md border transition-all active:scale-95" :class="selectedPaymentMethod === 'cash' ? 'border-[#7B5A50] bg-[#7B5A50]/10 text-[#7B5A50] shadow-sm' : 'border-gray-300 text-gray-600 hover:bg-gray-100'">
                  <Icon name="heroicons:banknotes" class="w-6 h-6" />
                  <span class="text-sm font-semibold">Cash</span>
                </button>
                <button @click="selectedPaymentMethod = 'card'" class="py-2 flex flex-col items-center justify-center gap-1 rounded-md border transition-all active:scale-95" :class="selectedPaymentMethod === 'card' ? 'border-[#7B5A50] bg-[#7B5A50]/10 text-[#7B5A50] shadow-sm' : 'border-gray-300 text-gray-600 hover:bg-gray-100'">
                  <div class="flex items-center gap-1 h-6">
                    <Icon name="logos:visa" class="w-6 h-6" />
                    <Icon name="logos:mastercard" class="w-5 h-5" />
                  </div>
                  <span class="text-sm font-semibold">Card</span>
                </button>
                <button @click="selectedPaymentMethod = 'ewallet'" class="py-2 flex flex-col items-center justify-center gap-1 rounded-md border transition-all active:scale-95" :class="selectedPaymentMethod === 'ewallet' ? 'border-[#7B5A50] bg-[#7B5A50]/10 text-[#7B5A50] shadow-sm' : 'border-gray-300 text-gray-600 hover:bg-gray-100'">
                  <div class="flex items-center gap-1 h-6">
                    <span class="text-[11px] font-bold bg-blue-500 text-white px-1 py-0.5 rounded leading-none">GCash</span>
                    <span class="text-[11px] font-bold bg-green-500 text-white px-1 py-0.5 rounded leading-none">Maya</span>
                  </div>
                  <span class="text-sm font-semibold">E-Wallet</span>
                </button>
              </div>

              <!-- Cash Amount Input -->
              <div v-if="selectedPaymentMethod === 'cash'" class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Amount Tendered</label>
                <div class="relative">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-gray-500 font-semibold">₱</span>
                  <input v-model="amountTendered" type="number" class="w-full bg-white border border-gray-300 focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] text-gray-900 rounded-md pl-7 pr-3 py-1.5 text-base font-semibold outline-none transition-colors" placeholder="0.00" />
                </div>
                <div v-if="Number(amountTendered) > 0" class="flex justify-between items-center text-[11px] mt-1 bg-white p-1.5 rounded border border-gray-200">
                  <span class="text-gray-500 font-semibold">Change:</span>
                  <span class="font-bold" :class="changeAmount >= 0 ? 'text-emerald-600' : 'text-red-500'">
                    {{ changeAmount >= 0 ? formatCurrency(changeAmount) : 'Insufficient' }}
                  </span>
                </div>
              </div>

              <!-- Reference Number Input -->
              <div v-if="selectedPaymentMethod === 'card' || selectedPaymentMethod === 'ewallet'" class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Reference Number</label>
                <div class="relative">
                  <input v-model="referenceNumber" type="text" class="w-full bg-white border border-gray-300 focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] text-gray-900 rounded-md px-3 py-1.5 text-base font-semibold outline-none transition-colors" placeholder="Enter reference number" />
                </div>
              </div>
            </div>

            <button 
              @click="promptConfirmOrder" 
              class="w-full bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md py-2.5 text-base transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!canCheckout || isProcessingOrder"
            >
              {{ isProcessingOrder ? 'Processing...' : 'Confirm Order' }}
            </button>
          </div>
        </div>
      </main>

      <!-- ── TRANSACTIONS MODAL ───────────────────────────────────────────── -->
      <div v-if="isTransactionsModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[85vh]">
          
          <div class="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 class="text-xl font-bold text-[#7B5A50]">Transaction History</h2>
            <div class="flex items-center gap-2">
              <button @click="exportTransactionsCSV" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md flex items-center gap-1.5 shadow-sm transition-colors">
                <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" /> Export CSV
              </button>
              <button @click="printZReading" class="px-3 py-1.5 bg-[#7B5A50] hover:bg-[#65463D] text-white text-sm font-semibold rounded-md flex items-center gap-1.5 shadow-sm transition-colors">
                <Icon name="heroicons:printer" class="w-4 h-4" /> Print Z-Reading
              </button>
              <button @click="isTransactionsModalOpen = false" class="p-1.5 text-gray-400 hover:text-gray-700 transition-colors bg-white border border-gray-200 hover:bg-gray-100 rounded-md">
                <Icon name="heroicons:x-mark" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="p-5 flex-1 overflow-y-auto">
            <div v-if="isLoadingTransactions" class="flex justify-center py-10">
              <Icon name="heroicons:arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
            </div>
            <div v-else-if="transactionsData">
              <!-- Stats Row -->
              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-[#7B5A50]/10 border border-[#7B5A50]/20 rounded-lg p-4">
                  <p class="text-sm font-semibold text-[#7B5A50] uppercase tracking-wider mb-1">Today's Sales</p>
                  <p class="text-3xl font-bold text-[#7B5A50]">{{ formatCurrency(transactionsData.today_total) }}</p>
                </div>
                <div class="bg-[#7B5A50]/10 border border-[#7B5A50]/20 rounded-lg p-4">
                  <p class="text-sm font-semibold text-[#7B5A50] uppercase tracking-wider mb-1">This Month's Sales</p>
                  <p class="text-3xl font-bold text-[#7B5A50]">{{ formatCurrency(transactionsData.month_total) }}</p>
                </div>
              </div>

              <!-- Transactions List -->
              <h3 class="font-bold text-gray-800 text-base mb-3">Recent Transactions</h3>
              <div v-if="transactionsData.transactions.length === 0" class="text-center py-8 text-gray-500 text-base">
                No transactions recorded yet.
              </div>
              <div v-else class="space-y-2">
                <div v-for="txn in transactionsData.transactions" :key="txn.uuid" class="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition-colors">
                  <div class="flex flex-col gap-0.5">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-gray-900 text-base">{{ formatCurrency(txn.total_amount) }}</span>
                      <span class="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{{ txn.receipt_number || 'N/A' }}</span>
                    </div>
                    <span class="text-sm text-gray-500">{{ new Date(txn.created_at).toLocaleString() }} &bull; Staff: {{ txn.staff_name }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase">{{ txn.status }}</span>
                    <span class="text-sm text-gray-500 font-medium">{{ txn.items_count }} items</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ── RECEIPT MODAL ────────────────────────────────────────────────── -->
      <div v-if="isReceiptModalOpen && completedOrderDetails" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
          
          <div class="bg-[#7B5A50] text-white text-center py-4 px-6 relative">
            <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Icon name="heroicons:check" class="w-6 h-6 text-white" />
            </div>
            <h2 class="text-xl font-bold">Payment Successful</h2>
            <p class="text-sm text-white/80 mt-1">Receipt No: <span class="font-mono">{{ completedOrderDetails.receiptNumber }}</span></p>
          </div>

          <div class="p-5 flex-1 bg-gray-50 overflow-y-auto max-h-[60vh]">
            <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
              <h3 class="text-base font-bold text-gray-800 mb-3 border-b pb-2">Order Items</h3>
              <div class="space-y-3">
                <div v-for="item in completedOrderDetails.items" :key="item.uuid" class="flex justify-between text-base">
                  <div class="flex flex-col">
                    <span class="font-medium text-gray-900">{{ item.menu_name }}</span>
                    <span class="text-sm text-gray-500">{{ item.quantity }} x {{ formatCurrency(getItemUnitPrice(item)) }}</span>
                    <div v-if="item.addons && item.addons.length > 0" class="flex flex-wrap gap-1 mt-1">
                      <span v-for="addon in item.addons" :key="addon" class="text-[10px] text-gray-500">+ {{ addon }} <span v-if="getAddonPrice(addon) > 0">({{ formatCurrency(getAddonPrice(addon)) }})</span></span>
                    </div>
                  </div>
                  <span class="font-semibold text-gray-700">{{ formatCurrency(getItemUnitPrice(item) * item.quantity) }}</span>
                </div>
              </div>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div class="flex justify-between text-sm text-gray-500 mb-2">
                <span>Items Subtotal</span>
                <span>{{ formatCurrency(completedOrderDetails.baseItemsTotal) }}</span>
              </div>
              <div v-if="completedOrderDetails.addonsTotal > 0" class="flex justify-between text-sm text-gray-500 mb-2">
                <span>Add-ons Total</span>
                <span>{{ formatCurrency(completedOrderDetails.addonsTotal) }}</span>
              </div>
              <div v-if="completedOrderDetails.discountAmount > 0" class="flex justify-between text-sm text-red-500 mb-2">
                <span>Discount ({{ completedOrderDetails.discountType }})</span>
                <span>- {{ formatCurrency(completedOrderDetails.discountAmount) }}</span>
              </div>
              <div v-if="completedOrderDetails.tax > 0" class="flex justify-between text-sm text-gray-500 mb-3 border-b border-gray-100 pb-2">
                <span>VAT (12%)</span>
                <span>{{ formatCurrency(completedOrderDetails.tax) }}</span>
              </div>
              <div class="flex justify-between items-center mb-3">
                <span class="text-sm font-semibold text-gray-500 uppercase">Total Paid</span>
                <span class="text-xl font-bold text-gray-900">{{ formatCurrency(completedOrderDetails.total) }}</span>
              </div>
              <div class="flex justify-between items-center mb-3 text-base">
                <span class="text-gray-500">Payment Method</span>
                <span class="font-medium capitalize">{{ completedOrderDetails.paymentMethod }}</span>
              </div>
              <div class="flex justify-between items-center pt-3 border-t border-gray-100">
                <span class="text-base font-semibold text-gray-600">Change</span>
                <span class="text-xl font-bold text-emerald-600">{{ formatCurrency(completedOrderDetails.change) }}</span>
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-gray-200 flex gap-3 bg-white">
            <button @click="printReceipt" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-md py-2.5 text-base transition-colors flex items-center justify-center gap-2">
              <Icon name="heroicons:printer" class="w-4 h-4" /> Print Receipt
            </button>
            <button @click="closeReceipt" class="flex-1 bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md py-2.5 text-base transition-colors shadow-sm">
              Done
            </button>
          </div>

        </div>
      </div>
      <!-- ── FLOATING SYNC BUTTON ───────────────────────────────────────────── -->
      <button 
        v-if="device && device.active_staff"
        @click="loadDeviceData" 
        class="fixed bottom-6 left-6 w-14 h-14 bg-[#7B5A50] hover:bg-[#65463D] text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-50 group"
        title="Sync live menu changes"
      >
        <Icon name="heroicons:arrow-path" class="w-6 h-6" :class="{'animate-spin': loading}" />
        <span class="absolute left-16 bg-gray-800 text-white text-sm font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Sync Menu</span>
      </button>

    </template>
    </div>

    <!-- ── Z-READING PRINT TICKET (Only visible when printing) ── -->
    <div id="z-reading-print" class="hidden print:block font-mono text-black p-4 bg-white mx-auto w-full max-w-[80mm] text-base">
      <div class="text-center mb-4">
        <h2 class="text-2xl font-bold">{{ device?.cafe_name || 'BrewSpot POS' }}</h2>
        <p class="text-sm">{{ device?.branch_name }}</p>
        <p class="text-sm">{{ device?.name }}</p>
        <p class="text-sm mt-2 border-b border-black pb-2 border-dashed font-bold tracking-widest">Z-READING</p>
      </div>

      <div v-if="transactionsData" class="space-y-1 border-b border-black pb-4 border-dashed mb-4">
        <div class="flex justify-between">
          <span>Date:</span>
          <span>{{ new Date().toLocaleDateString() }}</span>
        </div>
        <div class="flex justify-between">
          <span>Time:</span>
          <span>{{ new Date().toLocaleTimeString() }}</span>
        </div>
        <div class="flex justify-between">
          <span>Cashier:</span>
          <span>{{ device?.active_staff?.firstname || 'Admin' }}</span>
        </div>
      </div>

      <div v-if="transactionsData" class="space-y-2 border-b border-black pb-4 border-dashed mb-4">
        <div class="flex justify-between font-bold text-lg">
          <span>GROSS SALES</span>
          <span>{{ formatCurrency(transactionsData.today_total) }}</span>
        </div>
        <div class="flex justify-between">
          <span>Total Transactions</span>
          <span>{{ transactionsData.today_count }}</span>
        </div>
      </div>
      
      <div class="text-center text-sm mt-8">
        <p>*** END OF REPORT ***</p>
      </div>
    </div>

    <!-- ── CUSTOMER RECEIPT PRINT TICKET (Only visible when printing) ── -->
    <div id="receipt-print" class="hidden font-mono text-black p-4 bg-white mx-auto w-full max-w-[80mm] text-base" style="display: none;">
      <div class="text-center mb-4">
        <h2 class="text-2xl font-bold">{{ device?.cafe_name || 'BrewSpot POS' }}</h2>
        <p class="text-sm">{{ device?.branch_name }}</p>
        <p class="text-sm mt-1 border-b border-black pb-2 border-dashed">RECEIPT</p>
      </div>

      <div v-if="completedOrderDetails" class="space-y-1 border-b border-black pb-3 border-dashed mb-3 text-sm">
        <div class="flex justify-between">
          <span>Receipt No:</span>
          <span>{{ completedOrderDetails.receiptNumber }}</span>
        </div>
        <div class="flex justify-between">
          <span>Date:</span>
          <span>{{ completedOrderDetails.date }}</span>
        </div>
        <div class="flex justify-between">
          <span>Cashier:</span>
          <span>{{ completedOrderDetails.staff }}</span>
        </div>
      </div>

      <div v-if="completedOrderDetails" class="space-y-2 border-b border-black pb-3 border-dashed mb-3 text-sm">
        <div v-for="item in completedOrderDetails.items" :key="item.uuid + '-' + item.sugar_level" class="flex justify-between">
          <div class="flex flex-col">
            <span class="font-bold">
              {{ item.menu_name }}
              <span v-if="item.sugar_level !== undefined" class="text-xs font-normal">({{ item.sugar_level }}%)</span>
            </span>
            <span class="text-xs ml-2">{{ item.quantity }} x {{ formatCurrency(getItemUnitPrice(item)) }}</span>
            <div v-if="item.addons && item.addons.length > 0" class="flex flex-col ml-2 mt-0.5">
              <span v-for="addon in item.addons" :key="addon" class="text-[10px] text-gray-600 leading-tight">
                + {{ addon }} <span v-if="getAddonPrice(addon) > 0">({{ formatCurrency(getAddonPrice(addon)) }})</span>
              </span>
            </div>
          </div>
          <span class="font-bold">{{ formatCurrency(getItemUnitPrice(item) * item.quantity) }}</span>
        </div>
      </div>

      <div v-if="completedOrderDetails" class="space-y-1 mb-6 text-sm">
        <div class="flex justify-between font-bold">
          <span>Subtotal</span>
          <span>{{ formatCurrency(completedOrderDetails.subtotal) }}</span>
        </div>
        
        <div v-if="completedOrderDetails.discountAmount > 0" class="flex justify-between">
          <span>Discount ({{ completedOrderDetails.discountType }})</span>
          <span>- {{ formatCurrency(completedOrderDetails.discountAmount) }}</span>
        </div>
        <div v-if="completedOrderDetails.tax > 0" class="flex justify-between">
          <span>VAT (12%)</span>
          <span>{{ formatCurrency(completedOrderDetails.tax) }}</span>
        </div>
        
        <div class="flex justify-between font-bold text-lg border-t border-black pt-1 mt-1 border-dashed">
          <span>TOTAL</span>
          <span>{{ formatCurrency(completedOrderDetails.total) }}</span>
        </div>
        <div class="flex justify-between">
          <span>Payment ({{ completedOrderDetails.paymentMethod }})</span>
          <span>{{ formatCurrency(completedOrderDetails.total + completedOrderDetails.change) }}</span>
        </div>
        <div class="flex justify-between">
          <span>Change</span>
          <span>{{ formatCurrency(completedOrderDetails.change) }}</span>
        </div>
      </div>
      
      <div class="text-center text-sm mt-8">
        <p>Thank you for your purchase!</p>
        <p>Please come again.</p>
      </div>
    </div>

    <!-- ── CUSTOMIZATION MODAL ──────────────────────────────────────────── -->
    <div v-if="isCustomizationModalOpen && pendingCartItem" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 print:hidden">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        <div class="p-5 flex flex-col items-center border-b border-gray-100">
          <h2 class="text-xl font-bold text-gray-800">{{ pendingCartItem.menu_name }}</h2>
          <p class="text-sm text-gray-500">Customize your order</p>
        </div>
        
        <div class="p-5 space-y-5 bg-gray-50">
          <!-- Sugar Level -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">Sugar Level</label>
            <div class="grid grid-cols-5 gap-2 w-full">
              <button 
                v-for="level in sugarLevels" :key="level"
                @click="pendingCartItem.sugar_level = level"
                class="py-2 bg-white border rounded-md transition-colors font-semibold text-gray-700 text-sm"
                :class="pendingCartItem.sugar_level === level ? 'bg-[#7B5A50]/10 border-[#7B5A50] text-[#7B5A50]' : 'border-gray-200 hover:border-[#7B5A50]/50'"
              >
                {{ level }}%
              </button>
            </div>
          </div>
          
          <!-- Addons -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">Add-ons</label>
            <select class="w-full py-2 px-3 rounded-md bg-white border border-gray-200 outline-none text-sm text-gray-700" @change="pendingAddonChange($event)">
              <option value="">+ Select an Add-on</option>
              <option v-for="addon in availableAddons" :key="addon" :value="addon">{{ addon }}</option>
            </select>
            
            <div v-if="pendingCartItem.addons.length > 0" class="flex flex-wrap gap-2 mt-3">
              <span v-for="addon in pendingCartItem.addons" :key="addon" class="text-xs bg-white text-gray-700 border border-gray-200 px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                {{ addon }}
                <button @click="removePendingAddon(addon)" class="text-gray-400 hover:text-red-500 transition-colors">
                  <Icon name="heroicons:x-mark" class="w-3.5 h-3.5"/>
                </button>
              </span>
            </div>
          </div>
        </div>
        
        <div class="p-5 flex gap-3 border-t border-gray-100 bg-white">
          <button @click="cancelAddToCart" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-md py-2.5 transition-colors">
            Cancel
          </button>
          <button @click="confirmAddToCart" class="flex-1 bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md py-2.5 transition-colors shadow-sm">
            Add to Order
          </button>
        </div>
      </div>
    </div>

    <!-- ── CONFIRM ORDER MODAL ──────────────────────────────────────────── -->
    <div v-if="isConfirmOrderModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 print:hidden">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        <div class="p-5 border-b border-gray-100">
          <h2 class="text-xl font-bold text-gray-800">Confirm Order</h2>
          <p class="text-sm text-gray-500">Please review the order details before proceeding.</p>
        </div>
        
        <div class="p-5 space-y-4 max-h-[50vh] overflow-y-auto bg-gray-50">
          <div v-for="item in cart" :key="item.uuid + '-' + item.sugar_level + '-' + (item.addons?.join(',') || '')" class="flex justify-between items-start text-sm bg-white p-3 rounded border border-gray-100 shadow-sm">
            <div class="flex flex-col">
              <span class="font-bold text-gray-800">{{ item.menu_name }}</span>
              <span class="text-gray-500 text-xs">{{ item.quantity }} x {{ formatCurrency(getItemUnitPrice(item)) }}</span>
              <span v-if="item.sugar_level !== undefined" class="text-[11px] text-[#7B5A50] font-medium mt-0.5">{{ item.sugar_level }}% Sugar</span>
              <div v-if="item.addons && item.addons.length > 0" class="flex flex-wrap gap-1 mt-1">
                <span v-for="addon in item.addons" :key="addon" class="text-[9px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded leading-none">
                  + {{ addon }} <span v-if="getAddonPrice(addon) > 0">({{ formatCurrency(getAddonPrice(addon)) }})</span>
                </span>
              </div>
            </div>
            <span class="font-bold text-gray-800">{{ formatCurrency(getItemUnitPrice(item) * item.quantity) }}</span>
          </div>
        </div>
        
        <div class="p-5 border-t border-gray-100 bg-white">
          <div class="flex justify-between text-sm text-gray-600 mb-1">
            <span>Subtotal</span>
            <span>{{ formatCurrency(subtotal) }}</span>
          </div>
          <div v-if="discountAmount > 0" class="flex justify-between text-sm text-red-500 mb-1">
            <span>Discount ({{ selectedDiscountType }})</span>
            <span>- {{ formatCurrency(discountAmount) }}</span>
          </div>
          <div v-if="device?.vat_status === 'vat-registered'" class="flex justify-between text-sm text-gray-600 mb-3 border-b border-gray-100 pb-3">
            <span>VAT (12%)</span>
            <span>{{ formatCurrency(tax) }}</span>
          </div>
          <div class="flex justify-between text-base font-bold text-gray-800 mb-2">
            <span>Total Amount</span>
            <span class="text-[#7B5A50]">{{ formatCurrency(total) }}</span>
          </div>
          <div class="flex justify-between text-sm text-gray-600 mb-6">
            <span>Payment via <span class="capitalize">{{ selectedPaymentMethod }}</span></span>
            <span v-if="selectedPaymentMethod === 'cash'" class="font-medium text-gray-800">Tendered: {{ formatCurrency(Number(amountTendered)) }}</span>
          </div>
          
          <div class="flex gap-3 w-full">
            <button @click="isConfirmOrderModalOpen = false" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-md py-2.5 transition-colors">
              Back to Edit
            </button>
            <button @click="completeOrder" class="flex-1 bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md py-2.5 transition-colors shadow-sm disabled:opacity-50" :disabled="isProcessingOrder">
              {{ isProcessingOrder ? 'Processing...' : 'Finalize Checkout' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
