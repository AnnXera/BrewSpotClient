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

const filteredItems = computed(() => {
  if (selectedCategory.value === 'all') return menuItems.value
  return menuItems.value.filter(item => item.category_uuid === selectedCategory.value)
})

interface CartItem {
  uuid: string
  menu_name: string
  base_price: number
  quantity: number
  picture?: string
}

const cart = ref<CartItem[]>([])

const subtotal = computed(() => cart.value.reduce((sum, item) => sum + (item.base_price * item.quantity), 0))
const tax = computed(() => subtotal.value * 0.12) // 12% VAT
const total = computed(() => subtotal.value + tax.value)

function addToCart(item: any) {
  const existing = cart.value.find(i => i.uuid === item.uuid)
  if (existing) {
    existing.quantity++
  } else {
    cart.value.push({ ...item, quantity: 1 })
  }
}

function updateQuantity(item: CartItem, delta: number) {
  const existing = cart.value.find(i => i.uuid === item.uuid)
  if (existing) {
    existing.quantity += delta
    if (existing.quantity <= 0) {
      cart.value = cart.value.filter(i => i.uuid !== item.uuid)
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
  return true
})


const isProcessingOrder = ref(false)
const isReceiptModalOpen = ref(false)
const completedOrderDetails = ref<any>(null)

async function completeOrder() {
  if (!canCheckout.value) return
  isProcessingOrder.value = true
  try {
    const items = cart.value.map(i => ({ uuid: i.uuid, quantity: i.quantity }))
    const currentChange = changeAmount.value
    const currentTotal = total.value
    const currentMethod = selectedPaymentMethod.value
    const currentItems = [...cart.value]
    const currentStaff = device.value?.active_staff?.firstname || 'Admin'

    const res = await devicePosService.checkout(items, selectedPaymentMethod.value, Number(amountTendered.value) || total.value)
    if (res.success) {
      completedOrderDetails.value = {
        receiptNumber: res.receipt_number || res.transaction_uuid,
        items: currentItems,
        total: currentTotal,
        paymentMethod: currentMethod,
        change: currentChange,
        staff: currentStaff,
        date: new Date().toLocaleString()
      }
      isReceiptModalOpen.value = true
      cart.value = []
      amountTendered.value = ''
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
    <div class="min-h-screen bg-[#FFF8EA] font-sans flex flex-col text-[#2d201b] selection:bg-[#7B5A50]/20 selection:text-[#7B5A50] print:hidden">
      <!-- Loading State -->
      <div v-if="loading && !device" class="flex-1 flex items-center justify-center">
      <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <template v-else-if="device">
      <!-- ── HEADER ───────────────────────────────────────────────────────── -->
      <header class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div class="flex-1">
          <h1 class="text-base font-bold text-[#7B5A50]">{{ device.cafe_name || device.branch_name || 'BrewSpot POS' }}</h1>
          <p class="text-xs text-gray-500">{{ device.branch_name }} &bull; {{ device.name }}</p>
        </div>

        <div class="flex-1 text-center hidden md:block">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
            <Icon name="heroicons:clock" class="w-4 h-4 text-gray-400" />
            <span class="text-xs font-bold font-mono tracking-tight">{{ formattedTime }}</span>
          </div>
        </div>

        <div class="flex-1 flex items-center justify-end gap-3">
          <template v-if="device.active_staff">
            <div class="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
              <div class="w-6 h-6 bg-[#7B5A50] text-white rounded-full flex items-center justify-center text-xs font-bold">
                {{ device.active_staff.firstname?.charAt(0) || 'U' }}
              </div>
              <span class="font-semibold text-sm text-gray-700">{{ device.active_staff.firstname }}</span>
            </div>
            
            <button @click="openTransactions" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm">
              <Icon name="heroicons:document-text" class="w-4 h-4" /> Transactions
            </button>
            <button @click="lockRegister" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm">
              <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" /> End Shift
            </button>
          </template>
          <template v-else>
            <button @click="unregisterDevice" class="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors px-2 py-1">
              De-register
            </button>
          </template>
        </div>
      </header>

      <!-- ── LOCK SCREEN ──────────────────────────────────────────────────── -->
      <main v-if="!device.active_staff" class="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50">
        
        <!-- STEP 1: Select Staff -->
        <div v-if="!selectedStaff" class="w-full max-w-3xl">
          <h2 class="text-xl font-bold text-gray-800 text-center mb-6">Select Staff</h2>
          
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <button 
              v-for="staff in staffList" 
              :key="staff.uuid"
              @click="selectStaffForUnlock(staff)"
              class="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center gap-2 hover:border-gray-400 hover:shadow-sm transition-all group"
            >
              <div class="w-12 h-12 rounded-full bg-gray-100 text-[#7B5A50] flex items-center justify-center text-xl font-bold group-hover:bg-[#7B5A50] group-hover:text-white transition-colors">
                {{ staff.firstname.charAt(0) }}
              </div>
              <div class="text-center">
                <p class="font-semibold text-gray-800 text-sm">{{ staff.firstname }}</p>
                <p class="text-xs text-gray-500">{{ staff.role }}</p>
              </div>
            </button>
          </div>
        </div>

        <!-- STEP 2: PIN Entry -->
        <div v-else class="w-full max-w-[280px]">
          <div class="text-center mb-4">
            <h2 class="text-lg font-bold text-gray-800">{{ selectedStaff.firstname }}</h2>
            <p class="text-sm text-gray-500">
              {{ isChangingPin ? 'Enter new PIN' : 'Enter PIN to unlock' }}
            </p>
          </div>

          <div v-if="errorMessage" class="mb-4 p-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs font-medium text-center">
            {{ errorMessage }}
          </div>

          <!-- PIN Display -->
          <div class="flex justify-center gap-2 mb-6">
            <div v-for="i in 6" :key="i" class="w-8 h-10 rounded-md border flex items-center justify-center text-xl transition-colors"
                 :class="(isChangingPin ? newPinInput.length : pinInput.length) >= i ? 'border-[#7B5A50] bg-[#7B5A50] text-white' : 'border-gray-300 bg-white'">
              <span v-if="(isChangingPin ? newPinInput.length : pinInput.length) >= i">•</span>
            </div>
          </div>

          <!-- Numpad -->
          <div class="grid grid-cols-3 gap-2 mb-4">
            <button v-for="n in ['1','2','3','4','5','6','7','8','9']" :key="n" @click="handleNumpad(n)" 
                    class="bg-white border border-gray-200 rounded-lg h-12 text-lg font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-all shadow-sm">
              {{ n }}
            </button>
            <button @click="cancelUnlock" class="bg-gray-100 border border-gray-200 rounded-lg h-12 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-all">
              CLR
            </button>
            <button @click="handleNumpad('0')" class="bg-white border border-gray-200 rounded-lg h-12 text-lg font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-all shadow-sm">
              0
            </button>
            <button @click="handleBackspace" class="bg-gray-100 border border-gray-200 rounded-lg h-12 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all">
              <Icon name="heroicons:backspace" class="w-5 h-5" />
            </button>
          </div>

          <button 
            @click="submitPin" 
            class="w-full bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-lg py-3 text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
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
          <!-- Categories Filter -->
          <div class="px-4 py-2 bg-white border-b border-gray-200 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <button 
              v-for="cat in categories" 
              :key="cat.uuid"
              @click="selectedCategory = cat.uuid"
              class="whitespace-nowrap px-4 py-1.5 rounded-md text-xs font-semibold transition-all border"
              :class="selectedCategory === cat.uuid ? 'bg-[#7B5A50] border-[#7B5A50] text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'"
            >
              {{ cat.name }}
            </button>
          </div>

          <!-- Items Grid -->
          <div class="flex-1 overflow-y-auto p-4">
            <div class="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              <button 
                v-for="item in filteredItems" 
                :key="item.uuid"
                @click="addToCart(item)"
                class="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-sm hover:border-gray-400 transition-all text-left flex flex-col"
              >
                <div class="h-20 w-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400">
                  <img v-if="item.picture" :src="item.picture" :alt="item.menu_name" class="w-full h-full object-cover" />
                  <Icon v-else name="heroicons:photo" class="w-8 h-8 opacity-30" />
                </div>
                <div class="p-2.5 flex flex-col gap-0.5">
                  <h3 class="font-semibold text-gray-800 text-xs leading-tight truncate">{{ item.menu_name }}</h3>
                  <p class="text-gray-500 text-xs">{{ formatCurrency(item.base_price) }}</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Right Side: Cart / Order Summary -->
        <div class="w-[320px] bg-white flex flex-col shadow-sm border-l border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h2 class="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <Icon name="heroicons:shopping-cart" class="w-4 h-4" />
              Current Order
            </h2>
            <button v-if="cart.length" @click="clearCart" class="text-xs text-red-600 hover:text-red-800 font-medium">
              Clear
            </button>
          </div>

          <!-- Cart Items List -->
          <div class="flex-1 overflow-y-auto p-3">
            <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-center opacity-50">
              <Icon name="heroicons:document-text" class="w-8 h-8 text-gray-400 mb-2" />
              <p class="text-sm text-gray-500 font-medium">Empty Order</p>
            </div>
            <div v-else class="space-y-2">
              <div v-for="item in cart" :key="item.uuid" class="flex flex-col bg-white p-2.5 rounded-md border border-gray-100 shadow-sm gap-2">
                <div class="flex justify-between items-start w-full">
                  <p class="font-semibold text-gray-800 text-xs flex-1 pr-2 leading-tight">{{ item.menu_name }}</p>
                  <div class="font-semibold text-gray-800 text-right text-xs whitespace-nowrap">
                    {{ formatCurrency(item.base_price * item.quantity) }}
                  </div>
                </div>
                
                <div class="flex items-center justify-between w-full">
                  <p class="text-[10px] text-gray-500">{{ formatCurrency(item.base_price) }} each</p>
                  <div class="flex items-center gap-2 bg-gray-50 rounded border border-gray-200">
                    <button @click="updateQuantity(item, -1)" class="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
                      <Icon name="heroicons:minus" class="w-3 h-3" />
                    </button>
                    <span class="w-4 text-center font-semibold text-gray-800 text-xs">{{ item.quantity }}</span>
                    <button @click="updateQuantity(item, 1)" class="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
                      <Icon name="heroicons:plus" class="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cart Totals & Payment -->
          <div class="p-4 bg-gray-50 border-t border-gray-200 shrink-0">
            <div class="space-y-1.5 mb-3 text-xs font-medium text-gray-500">
              <div class="flex justify-between">
                <span>Subtotal</span>
                <span>{{ formatCurrency(subtotal) }}</span>
              </div>
              <div class="flex justify-between">
                <span>VAT (12%)</span>
                <span>{{ formatCurrency(tax) }}</span>
              </div>
              <div class="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200 mt-2">
                <span>Total Due</span>
                <span class="text-[#7B5A50]">{{ formatCurrency(total) }}</span>
              </div>
            </div>

            <!-- Payment Method Selection -->
            <div v-if="cart.length > 0" class="pt-3 border-t border-gray-200 space-y-3 mb-4">
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment Method</p>
              <div class="grid grid-cols-3 gap-2">
                <button @click="selectedPaymentMethod = 'cash'" class="py-1.5 rounded-md border text-xs font-semibold transition-all" :class="selectedPaymentMethod === 'cash' ? 'border-[#7B5A50] bg-[#7B5A50]/10 text-[#7B5A50] shadow-sm' : 'border-gray-300 text-gray-600 hover:bg-gray-100'">Cash</button>
                <button @click="selectedPaymentMethod = 'card'" class="py-1.5 rounded-md border text-xs font-semibold transition-all" :class="selectedPaymentMethod === 'card' ? 'border-[#7B5A50] bg-[#7B5A50]/10 text-[#7B5A50] shadow-sm' : 'border-gray-300 text-gray-600 hover:bg-gray-100'">Card</button>
                <button @click="selectedPaymentMethod = 'ewallet'" class="py-1.5 rounded-md border text-xs font-semibold transition-all" :class="selectedPaymentMethod === 'ewallet' ? 'border-[#7B5A50] bg-[#7B5A50]/10 text-[#7B5A50] shadow-sm' : 'border-gray-300 text-gray-600 hover:bg-gray-100'">E-Wallet</button>
              </div>

              <!-- Cash Amount Input -->
              <div v-if="selectedPaymentMethod === 'cash'" class="space-y-1">
                <label class="block text-xs font-medium text-gray-700">Amount Tendered</label>
                <div class="relative">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-semibold">₱</span>
                  <input v-model="amountTendered" type="number" class="w-full bg-white border border-gray-300 focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] text-gray-900 rounded-md pl-7 pr-3 py-1.5 text-sm font-semibold outline-none transition-colors" placeholder="0.00" />
                </div>
                <div v-if="Number(amountTendered) > 0" class="flex justify-between items-center text-[11px] mt-1 bg-white p-1.5 rounded border border-gray-200">
                  <span class="text-gray-500 font-semibold">Change:</span>
                  <span class="font-bold" :class="changeAmount >= 0 ? 'text-emerald-600' : 'text-red-500'">
                    {{ changeAmount >= 0 ? formatCurrency(changeAmount) : 'Insufficient' }}
                  </span>
                </div>
              </div>
            </div>

            <button 
              @click="completeOrder" 
              class="w-full bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md py-2.5 text-sm transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!canCheckout || isProcessingOrder"
            >
              {{ isProcessingOrder ? 'Processing...' : 'Confirm Payment' }}
            </button>
          </div>
        </div>
      </main>

      <!-- ── TRANSACTIONS MODAL ───────────────────────────────────────────── -->
      <div v-if="isTransactionsModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[85vh]">
          
          <div class="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 class="text-lg font-bold text-[#7B5A50]">Transaction History</h2>
            <div class="flex items-center gap-2">
              <button @click="exportTransactionsCSV" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-sm transition-colors">
                <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" /> Export CSV
              </button>
              <button @click="printZReading" class="px-3 py-1.5 bg-[#7B5A50] hover:bg-[#65463D] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-sm transition-colors">
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
                  <p class="text-xs font-semibold text-[#7B5A50] uppercase tracking-wider mb-1">Today's Sales</p>
                  <p class="text-2xl font-bold text-[#7B5A50]">{{ formatCurrency(transactionsData.today_total) }}</p>
                </div>
                <div class="bg-[#7B5A50]/10 border border-[#7B5A50]/20 rounded-lg p-4">
                  <p class="text-xs font-semibold text-[#7B5A50] uppercase tracking-wider mb-1">This Month's Sales</p>
                  <p class="text-2xl font-bold text-[#7B5A50]">{{ formatCurrency(transactionsData.month_total) }}</p>
                </div>
              </div>

              <!-- Transactions List -->
              <h3 class="font-bold text-gray-800 text-sm mb-3">Recent Transactions</h3>
              <div v-if="transactionsData.transactions.length === 0" class="text-center py-8 text-gray-500 text-sm">
                No transactions recorded yet.
              </div>
              <div v-else class="space-y-2">
                <div v-for="txn in transactionsData.transactions" :key="txn.uuid" class="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition-colors">
                  <div class="flex flex-col gap-0.5">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-gray-900 text-sm">{{ formatCurrency(txn.total_amount) }}</span>
                      <span class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{{ txn.receipt_number || 'N/A' }}</span>
                    </div>
                    <span class="text-xs text-gray-500">{{ new Date(txn.created_at).toLocaleString() }} &bull; Staff: {{ txn.staff_name }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase">{{ txn.status }}</span>
                    <span class="text-xs text-gray-500 font-medium">{{ txn.items_count }} items</span>
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
            <h2 class="text-lg font-bold">Payment Successful</h2>
            <p class="text-xs text-white/80 mt-1">Receipt No: <span class="font-mono">{{ completedOrderDetails.receiptNumber }}</span></p>
          </div>

          <div class="p-5 flex-1 bg-gray-50 overflow-y-auto max-h-[60vh]">
            <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
              <h3 class="text-sm font-bold text-gray-800 mb-3 border-b pb-2">Order Items</h3>
              <div class="space-y-3">
                <div v-for="item in completedOrderDetails.items" :key="item.uuid" class="flex justify-between text-sm">
                  <div class="flex flex-col">
                    <span class="font-medium text-gray-900">{{ item.menu_name }}</span>
                    <span class="text-xs text-gray-500">{{ item.quantity }} x {{ formatCurrency(item.base_price) }}</span>
                  </div>
                  <span class="font-semibold text-gray-700">{{ formatCurrency(item.base_price * item.quantity) }}</span>
                </div>
              </div>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div class="flex justify-between items-center mb-3">
                <span class="text-xs font-semibold text-gray-500 uppercase">Total Paid</span>
                <span class="text-lg font-bold text-gray-900">{{ formatCurrency(completedOrderDetails.total) }}</span>
              </div>
              <div class="flex justify-between items-center mb-3 text-sm">
                <span class="text-gray-500">Payment Method</span>
                <span class="font-medium capitalize">{{ completedOrderDetails.paymentMethod }}</span>
              </div>
              <div class="flex justify-between items-center pt-3 border-t border-gray-100">
                <span class="text-sm font-semibold text-gray-600">Change</span>
                <span class="text-lg font-bold text-emerald-600">{{ formatCurrency(completedOrderDetails.change) }}</span>
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-gray-200 flex gap-3 bg-white">
            <button @click="printReceipt" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-md py-2.5 text-sm transition-colors flex items-center justify-center gap-2">
              <Icon name="heroicons:printer" class="w-4 h-4" /> Print Receipt
            </button>
            <button @click="closeReceipt" class="flex-1 bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md py-2.5 text-sm transition-colors shadow-sm">
              Done
            </button>
          </div>

        </div>
      </div>
    </template>
    </div>

    <!-- ── Z-READING PRINT TICKET (Only visible when printing) ── -->
    <div id="z-reading-print" class="hidden print:block font-mono text-black p-4 bg-white mx-auto w-full max-w-[80mm] text-sm">
      <div class="text-center mb-4">
        <h2 class="text-xl font-bold">{{ device?.cafe_name || 'BrewSpot POS' }}</h2>
        <p class="text-xs">{{ device?.branch_name }}</p>
        <p class="text-xs">{{ device?.name }}</p>
        <p class="text-xs mt-2 border-b border-black pb-2 border-dashed font-bold tracking-widest">Z-READING</p>
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
        <div class="flex justify-between font-bold text-base">
          <span>GROSS SALES</span>
          <span>{{ formatCurrency(transactionsData.today_total) }}</span>
        </div>
        <div class="flex justify-between">
          <span>Total Transactions</span>
          <span>{{ transactionsData.today_count }}</span>
        </div>
      </div>
      
      <div class="text-center text-xs mt-8">
        <p>*** END OF REPORT ***</p>
      </div>
    </div>

    <!-- ── CUSTOMER RECEIPT PRINT TICKET (Only visible when printing) ── -->
    <div id="receipt-print" class="hidden font-mono text-black p-4 bg-white mx-auto w-full max-w-[80mm] text-sm" style="display: none;">
      <div class="text-center mb-4">
        <h2 class="text-xl font-bold">{{ device?.cafe_name || 'BrewSpot POS' }}</h2>
        <p class="text-xs">{{ device?.branch_name }}</p>
        <p class="text-xs mt-1 border-b border-black pb-2 border-dashed">OFFICIAL RECEIPT</p>
      </div>

      <div v-if="completedOrderDetails" class="space-y-1 border-b border-black pb-3 border-dashed mb-3 text-xs">
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

      <div v-if="completedOrderDetails" class="space-y-2 border-b border-black pb-3 border-dashed mb-3 text-xs">
        <div v-for="item in completedOrderDetails.items" :key="item.uuid" class="flex justify-between">
          <div class="flex flex-col">
            <span class="font-bold">{{ item.menu_name }}</span>
            <span class="text-[10px] ml-2">{{ item.quantity }} x {{ formatCurrency(item.base_price) }}</span>
          </div>
          <span class="font-bold">{{ formatCurrency(item.base_price * item.quantity) }}</span>
        </div>
      </div>

      <div v-if="completedOrderDetails" class="space-y-1 mb-6 text-xs">
        <div class="flex justify-between font-bold text-sm">
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
      
      <div class="text-center text-xs mt-8">
        <p>Thank you for your purchase!</p>
        <p>Please come again.</p>
      </div>
    </div>
  </div>
</template>
