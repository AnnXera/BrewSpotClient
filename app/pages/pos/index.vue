<script setup lang="ts">
import logoIcon from '~/assets/images/logo-icon.svg'

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
const loadError = ref('')
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
  loadError.value = ''
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
    loadError.value = e?.data?.message || (navigator.onLine ? 'The register data could not be loaded.' : 'No internet connection.')
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
    optionsItem.value = null
    selectedCategory.value = 'all'
  } catch (e) {
    console.error('Failed to lock', e)
  } finally {
    loading.value = false
  }
}

async function unregisterDevice() {
  if (!confirm('Unregister this POS device? A manager will need to set it up again before it can take orders.')) return
  
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

function onEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (isReceiptModalOpen.value) closeReceipt()
  else if (optionsItem.value) closeOptions()
  else if (isPaymentModalOpen.value) closePayment()
  else if (isTransactionsModalOpen.value) isTransactionsModalOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onEscape))
onUnmounted(() => window.removeEventListener('keydown', onEscape))

// -- CONNECTIVITY -----------------------------------------------------------
const isOnline = ref(true)
function syncOnline() { isOnline.value = navigator.onLine }

onMounted(() => {
  syncOnline()
  window.addEventListener('online', syncOnline)
  window.addEventListener('offline', syncOnline)
})
onUnmounted(() => {
  window.removeEventListener('online', syncOnline)
  window.removeEventListener('offline', syncOnline)
})

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

interface CartAddon {
  uuid: string
  name: string
  price: number
  quantity: number // per drink
}

// One line per item + size + add-ons, so a Large with Oreo and a plain Large are separate lines.
interface CartItem {
  line_key: string
  uuid: string
  menu_name: string
  base_price: number
  size_uuid: string | null
  size_name: string | null
  addons: CartAddon[]
  unit_price: number // size (or base) price + add-ons, per drink
  quantity: number
  picture?: string
}

const cart = ref<CartItem[]>([])

function getItemUnitPrice(item: CartItem) {
  return item.unit_price
}

// "Large · 2x Oreo Crumbles" under the item name.
function lineDetails(item: CartItem) {
  const parts = item.size_name ? [item.size_name] : []
  for (const a of item.addons) parts.push(a.quantity > 1 ? `${a.quantity}x ${a.name}` : a.name)
  return parts.join(' · ')
}

const baseItemsTotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
})

const subtotal = computed(() => baseItemsTotal.value)

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

const total = computed(() => subtotal.value - discountAmount.value)

// -- ORDER NOTICE (stock limits, undo) --------------------------------------
const orderNotice = ref<{ text: string, restore?: CartItem[] } | null>(null)
let noticeTimer: any
function showNotice(text: string, restore?: CartItem[]) {
  orderNotice.value = { text, restore }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { orderNotice.value = null }, restore ? 8000 : 4000)
}
onUnmounted(() => clearTimeout(noticeTimer))

function undoClear() {
  if (orderNotice.value?.restore) cart.value = orderNotice.value.restore
  orderNotice.value = null
}

// Servings left for a menu item, or Infinity when the menu does not track it.
function stockLimit(uuid: string) {
  const menuItem = menuItems.value.find(i => i.uuid === uuid)
  const stock = Number(menuItem?.available_stock)
  return menuItem?.available_stock != null && Number.isFinite(stock) ? stock : Infinity
}

// Every size and add-on combination of an item draws from the same servings.
function inCart(uuid: string) {
  return cart.value.reduce((n, i) => n + (i.uuid === uuid ? i.quantity : 0), 0)
}

function addLine(item: any, size: { uuid: string; name: string; price: number } | null, addons: CartAddon[]) {
  const limit = stockLimit(item.uuid)
  if (inCart(item.uuid) >= limit) {
    showNotice(`Only ${limit} ${item.menu_name} left in stock.`)
    return false
  }

  const sorted = [...addons].sort((a, b) => a.uuid.localeCompare(b.uuid))
  const lineKey = [item.uuid, size?.uuid ?? '', ...sorted.map(a => `${a.uuid}x${a.quantity}`)].join('|')
  const existing = cart.value.find(i => i.line_key === lineKey)

  if (existing) {
    existing.quantity++
  } else {
    const price = size ? Number(size.price) : Number(item.base_price)
    cart.value.push({
      line_key: lineKey,
      uuid: item.uuid,
      menu_name: item.menu_name,
      base_price: Number(item.base_price),
      picture: item.picture,
      size_uuid: size?.uuid ?? null,
      size_name: size?.name ?? null,
      addons: sorted,
      unit_price: price + sorted.reduce((sum, a) => sum + a.price * a.quantity, 0),
      quantity: 1
    })
  }
  return true
}

function addToCart(item: any) {
  if (item.sold_out || isProcessingOrder.value) return
  // Sizes or add-ons to choose: ask first.
  if (item.sizes?.length || item.addons?.length) {
    openOptions(item)
    return
  }
  addLine(item, null, [])
}

function updateQuantity(item: CartItem, delta: number) {
  if (isProcessingOrder.value) return
  const existing = cart.value.find(i => i.line_key === item.line_key)
  if (existing) {
    if (delta > 0 && inCart(existing.uuid) + delta > stockLimit(existing.uuid)) {
      showNotice(`Only ${stockLimit(existing.uuid)} ${existing.menu_name} left in stock.`)
      return
    }
    existing.quantity += delta
    if (existing.quantity <= 0) {
      cart.value = cart.value.filter(i => i.line_key !== item.line_key)
    }
  }
}

// -- SIZE AND ADD-ON PICKER -------------------------------------------------
const optionsItem = ref<any | null>(null)
const optionsSizeUuid = ref<string | null>(null)
const optionsAddonQty = ref<Record<string, number>>({})

function openOptions(item: any) {
  optionsItem.value = item
  optionsSizeUuid.value = item.sizes?.length === 1 ? item.sizes[0].uuid : null
  optionsAddonQty.value = {}
}

function closeOptions() {
  optionsItem.value = null
}

function setAddonQty(addon: any, qty: number) {
  optionsAddonQty.value = { ...optionsAddonQty.value, [addon.uuid]: Math.max(0, Math.min(addon.max_quantity, qty)) }
}

const optionsSize = computed(() => optionsItem.value?.sizes?.find((s: any) => s.uuid === optionsSizeUuid.value) ?? null)

const optionsAddons = computed<CartAddon[]>(() =>
  (optionsItem.value?.addons ?? [])
    .filter((a: any) => (optionsAddonQty.value[a.uuid] ?? 0) > 0)
    .map((a: any) => ({ uuid: a.uuid, name: a.name, price: Number(a.price), quantity: optionsAddonQty.value[a.uuid] }))
)

const optionsNeedsSize = computed(() => !!optionsItem.value?.sizes?.length && !optionsSize.value)

const optionsPrice = computed(() => {
  if (!optionsItem.value) return 0
  const base = optionsSize.value ? Number(optionsSize.value.price) : Number(optionsItem.value.base_price)
  return base + optionsAddons.value.reduce((sum, a) => sum + a.price * a.quantity, 0)
})

function confirmOptions() {
  if (!optionsItem.value || optionsNeedsSize.value) return
  if (addLine(optionsItem.value, optionsSize.value, optionsAddons.value)) closeOptions()
}

function clearCart() {
  if (isProcessingOrder.value || cart.value.length === 0) return
  const snapshot = cart.value.map(i => ({ ...i }))
  cart.value = []
  showNotice('Order cleared.', snapshot)
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
  if (!isOnline.value) return false
  if (selectedPaymentMethod.value === 'cash') {
    return Number(amountTendered.value) >= total.value
  }
  if (selectedPaymentMethod.value === 'card' || selectedPaymentMethod.value === 'ewallet') {
    return referenceNumber.value.trim().length > 0
  }
  return true
})


watch([() => cart.value.length, total, selectedPaymentMethod, amountTendered, referenceNumber], () => { checkoutError.value = '' })

const cartCount = computed(() => cart.value.reduce((n, i) => n + i.quantity, 0))

const discountOptions = [
  { value: 'none', label: 'None' },
  { value: 'PWD', label: 'PWD' },
  { value: 'Senior', label: 'Senior' },
  { value: 'VIP', label: 'VIP' },
] as const

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: 'heroicons:banknotes' },
  { value: 'card', label: 'Card', icon: 'heroicons:credit-card' },
  { value: 'ewallet', label: 'E-Wallet', icon: 'heroicons:device-phone-mobile' },
]

const shortBy = computed(() => {
  const tendered = Number(amountTendered.value)
  return tendered > 0 && tendered < total.value ? total.value - tendered : 0
})

const checkoutHint = computed(() => {
  if (!isOnline.value) return 'Offline. Reconnect to record the sale.'
  if (selectedPaymentMethod.value === 'cash') {
    return Number(amountTendered.value) > 0 ? 'Amount tendered is less than the total.' : 'Enter the cash received to continue.'
  }
  return 'Enter the reference number to continue.'
})

const isProcessingOrder = ref(false)
const checkoutError = ref('')
const isReceiptModalOpen = ref(false)
const isPaymentModalOpen = ref(false)
const tenderInput = ref<HTMLInputElement | null>(null)
const referenceInput = ref<HTMLInputElement | null>(null)

function openPayment() {
  if (cart.value.length === 0 || !isOnline.value) return
  checkoutError.value = ''
  isPaymentModalOpen.value = true
}

function closePayment() {
  if (isProcessingOrder.value) return
  isPaymentModalOpen.value = false
}

// Put the cursor where the cashier types next.
watch([isPaymentModalOpen, selectedPaymentMethod], async ([open]) => {
  if (!open) return
  await nextTick()
  ;(tenderInput.value ?? referenceInput.value)?.focus()
})

// An emptied cart leaves nothing to pay for.
watch(() => cart.value.length, (n) => { if (n === 0 && !isProcessingOrder.value) isPaymentModalOpen.value = false })
const completedOrderDetails = ref<any>(null)

async function completeOrder() {
  if (!canCheckout.value || isProcessingOrder.value) return
  isProcessingOrder.value = true
  checkoutError.value = ''
  try {
    const items = cart.value.map(i => ({
      uuid: i.uuid,
      quantity: i.quantity,
      size_uuid: i.size_uuid,
      addons: i.addons.map(a => ({ uuid: a.uuid, quantity: a.quantity }))
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
        subtotal: subtotal.value,
        discountType: selectedDiscountType.value,
        discountAmount: discountAmount.value,
        total: currentTotal,
        paymentMethod: currentMethod,
        change: currentChange,
        staff: currentStaff,
        date: new Date().toLocaleString()
      }
      isPaymentModalOpen.value = false
      isReceiptModalOpen.value = true
      cart.value = []
      amountTendered.value = ''
      referenceNumber.value = ''
      selectedDiscountType.value = 'none'
      // Servings left changed with this sale.
      devicePosService.getMenu().then((m) => { if (m.success) menuItems.value = m.items }).catch(() => {})
    }
  } catch (e: any) {
    const status = e?.response?.status ?? e?.status
    if (status === 401) {
      posDeviceCookie.value = null
      isPaymentModalOpen.value = false
      router.push('/pos/setup')
      return
    }
    if (status == null && !e?.data) {
      // No response: the server may have recorded the sale before the connection dropped.
      checkoutError.value = 'Could not confirm the sale. Check Transactions before charging again so the customer is not charged twice.'
    } else {
      checkoutError.value = `${e?.data?.message ? e.data.message + ' ' : ''}The sale was not recorded and the order is still open. Tap Charge to try again.`
    }
  } finally {
    isProcessingOrder.value = false
  }
}

// Transactions Modal State
const isTransactionsModalOpen = ref(false)
const transactionsData = ref<any>(null)
const isLoadingTransactions = ref(false)
const transactionsError = ref('')

async function openTransactions() {
  isTransactionsModalOpen.value = true
  isLoadingTransactions.value = true
  transactionsError.value = ''
  try {
    const res = await devicePosService.getTransactions()
    if (res.success) {
      transactionsData.value = res
    } else {
      transactionsError.value = 'Transactions could not be loaded.'
    }
  } catch (e: any) {
    transactionsError.value = navigator.onLine ? 'Transactions could not be loaded.' : 'No internet connection.'
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
          <img :src="logoIcon" alt="BrewSpot" class="w-9 h-9 rounded-lg" />
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
            
            <button @click="openTransactions" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 min-h-11 rounded-md text-base font-semibold transition-colors flex items-center gap-1.5 shadow-sm">
              <Icon name="heroicons:document-text" class="w-4 h-4" /> Transactions
            </button>
            <button @click="lockRegister" title="Lock the register and clear the current order" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 min-h-11 rounded-md text-base font-semibold transition-colors flex items-center gap-1.5 shadow-sm">
              <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" /> Lock Register
            </button>
          </template>
          <template v-else>
            <button @click="unregisterDevice" class="min-h-11 text-sm font-semibold text-red-700 hover:text-red-900 transition-colors px-3">
              Unregister device
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
            <button @click="cancelUnlock" aria-label="Choose a different staff member" class="bg-gray-100 border border-gray-200 rounded-lg h-12 text-sm font-semibold text-gray-600 hover:bg-gray-200 active:scale-95 transition-all">
              Cancel
            </button>
            <button @click="handleNumpad('0')" class="bg-white border border-gray-200 rounded-lg h-12 text-xl font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-200 active:scale-95 transition-all shadow-sm">
              0
            </button>
            <button @click="handleBackspace" aria-label="Delete last digit" class="bg-gray-100 border border-gray-200 rounded-lg h-12 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all">
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
          <div v-if="!isOnline" role="status" class="px-4 py-2 bg-amber-100 text-amber-900 text-sm font-medium">
            Offline. You can build orders, but sales can't be recorded until the connection returns.
          </div>
          <div v-else-if="loadError" role="alert" class="px-4 py-2 bg-red-50 text-red-800 text-sm font-medium flex items-center justify-between gap-3">
            <span>{{ loadError }} The menu may be out of date.</span>
            <button @click="loadDeviceData" class="min-h-11 px-3 font-semibold underline">Try again</button>
          </div>
          <!-- Search and Categories Filter -->
          <div class="px-4 py-2 bg-white border-b border-gray-200 flex flex-col gap-2">
            <!-- Search Bar -->
            <div class="relative w-full">
              <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Search menu" 
                class="w-full bg-gray-50 border border-gray-200 rounded-md pl-9 pr-11 h-11 text-base focus:outline-none focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] transition-all"
              />
              <button 
                v-if="searchQuery" 
                @click="searchQuery = ''"
                aria-label="Clear search"
                class="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-700"
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
                class="whitespace-nowrap px-4 min-h-11 rounded-md text-sm font-semibold transition-all border shrink-0"
                :class="selectedCategory === cat.uuid ? 'bg-[#7B5A50] border-[#7B5A50] text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'"
              >
                {{ cat.name }}
              </button>
            </div>
          </div>

          <!-- Items Grid -->
          <div class="flex-1 overflow-y-auto p-4 pb-24 min-h-0">
            <p v-if="filteredItems.length === 0" class="text-center text-base text-gray-600 py-12">
              {{ searchQuery.trim() ? `No menu items match "${searchQuery.trim()}".` : 'No items in this category.' }}
            </p>
            <div class="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              <button 
                v-for="item in filteredItems" 
                :key="item.uuid"
                @click="addToCart(item)"
                :disabled="item.sold_out"
                :class="item.sold_out ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:border-[#7B5A50]/50 active:scale-[0.98]'"
                class="bg-white border border-gray-200 rounded-md overflow-hidden transition-all text-left flex flex-col group"
              >
                <div class="h-20 w-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400 overflow-hidden">
                  <img v-if="item.picture" :src="item.picture" :alt="item.menu_name" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  <Icon v-else name="heroicons:photo" class="w-8 h-8 opacity-30 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div class="p-2.5 flex flex-col gap-0.5">
                  <h3 :title="item.menu_name" class="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 break-words">{{ item.menu_name }}</h3>
                  <p class="text-gray-500 text-sm"><span v-if="item.sizes?.length" class="text-xs">from </span>{{ formatCurrency(item.base_price) }}</p>
                  <p v-if="item.sold_out" class="text-red-600 text-xs font-semibold">Sold out</p>
                  <p v-else class="text-gray-500 text-xs">{{ item.available_stock }} left</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Right Side: Cart / Order Summary -->
        <div class="w-[320px] lg:w-[380px] shrink-0 bg-white flex flex-col shadow-sm border-l border-gray-200">
          <div class="px-4 h-14 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
            <h2 class="text-base font-semibold text-gray-800 flex items-center gap-2">
              Current Order
              <span v-if="cartCount" class="min-w-6 h-6 px-1.5 rounded-full bg-[#7B5A50] text-white text-xs font-semibold flex items-center justify-center tabular-nums">{{ cartCount }}</span>
            </h2>
            <button v-if="cart.length" @click="clearCart" class="min-h-11 px-3 -mr-3 text-sm text-red-600 hover:text-red-800 font-medium">
              Clear
            </button>
          </div>

          <div v-if="orderNotice" role="status" class="px-4 py-2 bg-gray-800 text-white text-sm flex items-center justify-between gap-3 shrink-0">
            <span>{{ orderNotice.text }}</span>
            <button v-if="orderNotice.restore" @click="undoClear" class="min-h-11 px-3 -mr-3 font-semibold underline">Undo</button>
          </div>

          <!-- Cart Items List -->
          <div class="flex-1 overflow-y-auto px-3 py-2 min-h-[120px]">
            <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-center px-6">
              <Icon name="heroicons:document-text" class="w-8 h-8 text-gray-300 mb-2" />
              <p class="text-base text-gray-600 font-medium">No items yet</p>
              <p class="text-sm text-gray-500">Tap an item on the left to start the order.</p>
            </div>
            <TransitionGroup v-else name="list" tag="ul" class="divide-y divide-gray-100">
              <li v-for="item in cart" :key="item.line_key" class="flex items-center gap-3 py-2">
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-800 text-sm leading-tight break-words">{{ item.menu_name }}</p>
                  <p v-if="lineDetails(item)" class="text-xs text-gray-600 leading-snug break-words">{{ lineDetails(item) }}</p>
                  <p class="text-xs text-gray-500 tabular-nums">{{ formatCurrency(getItemUnitPrice(item)) }} each</p>
                </div>
                <div class="flex items-center">
                  <button @click="updateQuantity(item, -1)" :aria-label="`Remove one ${item.menu_name}`" class="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-md transition-colors active:scale-90">
                    <Icon name="heroicons:minus" class="w-4 h-4" />
                  </button>
                  <span class="w-6 text-center font-semibold text-gray-800 text-base tabular-nums">{{ item.quantity }}</span>
                  <button @click="updateQuantity(item, 1)" :aria-label="`Add one ${item.menu_name}`" class="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-md transition-colors active:scale-90">
                    <Icon name="heroicons:plus" class="w-4 h-4" />
                  </button>
                </div>
                <div class="w-[72px] text-right font-semibold text-gray-800 text-sm tabular-nums">
                  {{ formatCurrency(getItemUnitPrice(item) * item.quantity) }}
                </div>
              </li>
            </TransitionGroup>
          </div>

          <!-- Summary + discount -->
          <div class="bg-gray-50 border-t border-gray-200 px-4 pt-3 pb-3 space-y-3 shrink-0">
            <div class="space-y-1 text-sm text-gray-600 tabular-nums">
              <div class="flex justify-between">
                <span>Subtotal</span>
                <span>{{ formatCurrency(baseItemsTotal) }}</span>
              </div>
              <div v-if="discountAmount > 0" class="flex justify-between text-red-700">
                <span>Discount ({{ selectedDiscountType }})</span>
                <span>- {{ formatCurrency(discountAmount) }}</span>
              </div>
            </div>

            <div v-if="cart.length > 0" role="radiogroup" aria-label="Discount" class="grid grid-cols-4 gap-1.5">
              <button
                v-for="d in discountOptions"
                :key="d.value"
                role="radio"
                :aria-checked="selectedDiscountType === d.value"
                @click="selectedDiscountType = d.value"
                class="h-11 rounded-md border text-sm font-semibold transition-colors"
                :class="selectedDiscountType === d.value ? 'border-[#7B5A50] bg-[#7B5A50]/10 text-[#7B5A50]' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'"
              >{{ d.label }}</button>
            </div>
          </div>

          <!-- Pinned: total + process payment -->
          <div class="px-4 pt-3 pb-4 bg-white border-t border-gray-200 shrink-0">
            <div class="flex items-baseline justify-between mb-2">
              <span class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total due</span>
              <span class="font-display text-3xl font-bold text-[#7B5A50] tabular-nums" aria-live="polite">{{ formatCurrency(total) }}</span>
            </div>
            <button
              @click="openPayment"
              class="w-full h-14 bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md text-lg transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="cart.length === 0 || !isOnline"
            >
              Process Payment
            </button>
            <p v-if="cart.length && !isOnline" class="mt-2 text-sm text-gray-600 text-center">Offline. Reconnect to record the sale.</p>
          </div>
        </div>
      </main>

      <!-- ── PAYMENT MODAL ────────────────────────────────────────────────── -->
      <div v-if="isPaymentModalOpen" role="dialog" aria-modal="true" aria-labelledby="pay-title" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 print:hidden" @click.self="closePayment">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden modal-pop max-h-[92vh]">
          <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
            <h2 id="pay-title" class="text-xl font-bold text-[#7B5A50]">Process Payment</h2>
            <button @click="closePayment" :disabled="isProcessingOrder" aria-label="Close payment" class="w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-md disabled:opacity-50">
              <Icon name="heroicons:x-mark" class="w-4 h-4" />
            </button>
          </div>

          <fieldset :disabled="isProcessingOrder" class="m-0 border-0 min-w-0 p-5 space-y-4 overflow-y-auto" :class="{ 'opacity-60': isProcessingOrder }">
            <div class="flex items-baseline justify-between">
              <span class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total due</span>
              <span class="font-display text-4xl font-bold text-[#7B5A50] tabular-nums">{{ formatCurrency(total) }}</span>
            </div>

            <div role="radiogroup" aria-label="Payment method" class="grid grid-cols-3 gap-2">
              <button
                v-for="m in paymentMethods"
                :key="m.value"
                role="radio"
                :aria-checked="selectedPaymentMethod === m.value"
                @click="selectedPaymentMethod = m.value"
                class="h-16 rounded-md border flex flex-col items-center justify-center gap-1 text-sm font-semibold transition-colors active:scale-95"
                :class="selectedPaymentMethod === m.value ? 'border-[#7B5A50] bg-[#7B5A50]/10 text-[#7B5A50]' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'"
              >
                <Icon :name="m.icon" class="w-6 h-6" />
                {{ m.label }}
              </button>
            </div>

            <div v-if="selectedPaymentMethod === 'cash'" class="space-y-2">
              <label class="block">
                <span class="block text-sm font-medium text-gray-700 mb-1">Amount tendered</span>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base text-gray-500 font-semibold">&#8369;</span>
                  <input ref="tenderInput" v-model="amountTendered" @keydown.enter="completeOrder" type="number" inputmode="decimal" min="0" step="0.01" class="w-full h-14 bg-white border border-gray-300 focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] text-gray-900 rounded-md pl-8 pr-3 text-xl font-semibold tabular-nums outline-none transition-colors" placeholder="0.00" />
                </div>
              </label>
              <div v-if="Number(amountTendered) > 0" class="flex justify-between items-baseline" aria-live="polite">
                <span class="text-sm font-semibold text-gray-600">{{ shortBy > 0 ? 'Still needed' : 'Change' }}</span>
                <span class="text-2xl font-bold tabular-nums" :class="shortBy > 0 ? 'text-red-700' : 'text-emerald-700'">
                  {{ formatCurrency(shortBy > 0 ? shortBy : changeAmount) }}
                </span>
              </div>
            </div>

            <label v-else class="block">
              <span class="block text-sm font-medium text-gray-700 mb-1">Reference number</span>
              <input ref="referenceInput" v-model="referenceNumber" @keydown.enter="completeOrder" type="text" class="w-full h-14 bg-white border border-gray-300 focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] text-gray-900 rounded-md px-3 text-lg font-semibold outline-none transition-colors" placeholder="From the terminal or app" />
            </label>
          </fieldset>

          <div class="px-5 pt-3 pb-5 border-t border-gray-200 bg-white shrink-0">
            <p v-if="checkoutError" role="alert" class="mb-3 p-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">{{ checkoutError }}</p>
            <div class="flex gap-3">
              <button @click="closePayment" :disabled="isProcessingOrder" class="px-5 h-14 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-md text-base transition-colors disabled:opacity-50">Cancel</button>
              <button
                @click="completeOrder"
                class="flex-1 h-14 bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md text-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!canCheckout || isProcessingOrder"
              >
                {{ isProcessingOrder ? 'Recording sale...' : `Charge ${formatCurrency(total)}` }}
              </button>
            </div>
            <p v-if="!canCheckout && !isProcessingOrder" class="mt-2 text-sm text-gray-600 text-center">{{ checkoutHint }}</p>
          </div>
        </div>
      </div>

      <!-- ── TODAY'S SALES ──────────────────────────────────────────────── -->
      <PosTransactionsPanel
        v-if="isTransactionsModalOpen"
        :data="transactionsData"
        :loading="isLoadingTransactions"
        :error="transactionsError"
        :branch-name="device.branch_name"
        @close="isTransactionsModalOpen = false"
        @retry="openTransactions"
        @export="exportTransactionsCSV"
        @print="printZReading"
      />

      <!-- ── SIZE AND ADD-ON PICKER ───────────────────────────────────────── -->
      <div v-if="optionsItem" role="dialog" aria-modal="true" aria-labelledby="options-title" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 print:hidden" @click.self="closeOptions">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden modal-pop max-h-[92vh]">
          <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-gray-50 shrink-0">
            <h2 id="options-title" class="text-xl font-bold text-[#7B5A50] break-words">{{ optionsItem.menu_name }}</h2>
            <button @click="closeOptions" aria-label="Close" class="w-11 h-11 shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-md">
              <Icon name="heroicons:x-mark" class="w-4 h-4" />
            </button>
          </div>

          <div class="p-5 space-y-5 overflow-y-auto">
            <fieldset v-if="optionsItem.sizes?.length">
              <legend class="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Size</legend>
              <div role="radiogroup" aria-label="Size" class="grid grid-cols-2 gap-2">
                <button
                  v-for="size in optionsItem.sizes"
                  :key="size.uuid"
                  role="radio"
                  :aria-checked="optionsSizeUuid === size.uuid"
                  @click="optionsSizeUuid = size.uuid"
                  class="min-h-14 px-3 py-2 rounded-md border text-left transition-colors"
                  :class="optionsSizeUuid === size.uuid ? 'border-[#7B5A50] bg-[#7B5A50]/10 text-[#7B5A50]' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
                >
                  <span class="block font-semibold text-base leading-tight">{{ size.name }}</span>
                  <span class="block text-sm tabular-nums">{{ formatCurrency(size.price) }}</span>
                </button>
              </div>
            </fieldset>

            <fieldset v-if="optionsItem.addons?.length">
              <legend class="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Add-ons</legend>
              <ul class="divide-y divide-gray-100 border border-gray-200 rounded-md">
                <li v-for="addon in optionsItem.addons" :key="addon.uuid" class="flex items-center gap-3 px-3 py-1.5">
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-gray-800 text-sm break-words">{{ addon.name }}</p>
                    <p class="text-xs text-gray-500 tabular-nums">+{{ formatCurrency(addon.price) }}<template v-if="addon.max_quantity > 1"> each, up to {{ addon.max_quantity }}</template></p>
                  </div>
                  <div class="flex items-center">
                    <button
                      @click="setAddonQty(addon, (optionsAddonQty[addon.uuid] ?? 0) - 1)"
                      :disabled="!optionsAddonQty[addon.uuid]"
                      :aria-label="`Remove one ${addon.name}`"
                      class="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-30"
                    >
                      <Icon name="heroicons:minus" class="w-4 h-4" />
                    </button>
                    <span class="w-6 text-center font-semibold text-gray-800 text-base tabular-nums">{{ optionsAddonQty[addon.uuid] ?? 0 }}</span>
                    <button
                      @click="setAddonQty(addon, (optionsAddonQty[addon.uuid] ?? 0) + 1)"
                      :disabled="(optionsAddonQty[addon.uuid] ?? 0) >= addon.max_quantity"
                      :aria-label="`Add one ${addon.name}`"
                      class="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-30"
                    >
                      <Icon name="heroicons:plus" class="w-4 h-4" />
                    </button>
                  </div>
                </li>
              </ul>
            </fieldset>
          </div>

          <div class="px-5 pt-3 pb-5 border-t border-gray-200 shrink-0">
            <button
              @click="confirmOptions"
              :disabled="optionsNeedsSize"
              class="w-full h-14 bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md text-lg transition-colors shadow-sm flex items-center justify-between px-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{{ optionsNeedsSize ? 'Pick a size' : 'Add to order' }}</span>
              <span class="tabular-nums">{{ formatCurrency(optionsPrice) }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── RECEIPT MODAL ────────────────────────────────────────────────── -->
      <div v-if="isReceiptModalOpen && completedOrderDetails" role="dialog" aria-modal="true" aria-labelledby="receipt-title" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden modal-pop">
          
          <div class="bg-[#7B5A50] text-white text-center py-4 px-6 relative">
            <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Icon name="heroicons:check" class="w-6 h-6 text-white" />
            </div>
            <h2 id="receipt-title" class="text-xl font-bold">Payment Successful</h2>
            <p class="text-sm text-white/80 mt-1">Receipt No: <span class="font-mono">{{ completedOrderDetails.receiptNumber }}</span></p>
          </div>

          <div class="p-5 flex-1 bg-gray-50 overflow-y-auto max-h-[60vh]">
            <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
              <h3 class="text-base font-bold text-gray-800 mb-3 border-b pb-2">Order Items</h3>
              <div class="space-y-3">
                <div v-for="item in completedOrderDetails.items" :key="item.line_key" class="flex justify-between text-base">
                  <div class="flex flex-col">
                    <span class="font-medium text-gray-900">{{ item.menu_name }}</span>
                    <span v-if="lineDetails(item)" class="text-sm text-gray-600">{{ lineDetails(item) }}</span>
                    <span class="text-sm text-gray-500">{{ item.quantity }} x {{ formatCurrency(getItemUnitPrice(item)) }}</span>
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
              <div v-if="completedOrderDetails.discountAmount > 0" class="flex justify-between text-sm text-red-500 mb-2">
                <span>Discount ({{ completedOrderDetails.discountType }})</span>
                <span>- {{ formatCurrency(completedOrderDetails.discountAmount) }}</span>
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
              Next order
            </button>
          </div>

        </div>
      </div>
      <!-- ── FLOATING SYNC BUTTON ───────────────────────────────────────────── -->
      <button 
        v-if="device && device.active_staff"
        @click="loadDeviceData" 
        class="fixed bottom-6 left-6 w-14 h-14 bg-[#7B5A50] hover:bg-[#65463D] text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-50 group"
        title="Refresh menu and stock" aria-label="Refresh menu and stock"
      >
        <Icon name="heroicons:arrow-path" class="w-6 h-6" :class="{'animate-spin': loading}" />
        <span class="absolute left-16 bg-gray-800 text-white text-sm font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Refresh menu</span>
      </button>

    </template>

    <div v-else class="flex-1 flex items-center justify-center p-6">
      <div class="max-w-sm text-center" role="alert">
        <h2 class="text-xl font-bold text-gray-800">The register could not start</h2>
        <p class="text-base text-gray-600 mt-1">{{ loadError || 'Something went wrong while loading.' }}</p>
        <button @click="loadDeviceData" class="mt-4 h-12 px-6 bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-md">Try again</button>
      </div>
    </div>
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
        <div class="flex justify-between">
          <span>GROSS SALES</span>
          <span>{{ formatCurrency(transactionsData.gross_total ?? transactionsData.today_total) }}</span>
        </div>
        <div class="flex justify-between">
          <span>VOIDS ({{ transactionsData.void_count ?? 0 }})</span>
          <span>-{{ formatCurrency(transactionsData.void_total ?? 0) }}</span>
        </div>
        <div class="flex justify-between font-bold text-lg border-t border-black border-dashed pt-1">
          <span>NET SALES</span>
          <span>{{ formatCurrency(transactionsData.today_total) }}</span>
        </div>
        <div class="flex justify-between">
          <span>Settled Transactions</span>
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
        <div v-for="item in completedOrderDetails.items" :key="item.line_key" class="flex justify-between">
          <div class="flex flex-col">
            <span class="font-bold">{{ item.menu_name }}</span>
            <span v-if="lineDetails(item)" class="text-xs ml-2">{{ lineDetails(item) }}</span>
            <span class="text-xs ml-2">{{ item.quantity }} x {{ formatCurrency(getItemUnitPrice(item)) }}</span>
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
  </div>
</template>

<style scoped>
button:focus-visible,
select:focus-visible,
[role='radio']:focus-visible {
  outline: 2px solid #7B5A50;
  outline-offset: 2px;
}
.hide-scrollbar {
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.modal-pop {
  animation: modal-pop 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes modal-pop {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .modal-pop { animation: none; }
  .list-enter-active, .list-leave-active { transition: none; }
}
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
