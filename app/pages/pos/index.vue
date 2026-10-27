<script setup lang="ts">
import logoIcon from '~/assets/images/logo-icon.svg'
import FloorPlanModal from '~/components/pos/FloorPlanModal.vue'

// POS Register uses its own auth via pos_device_token cookie
// It does not use the standard user auth, so we don't define a 'role' requirement here.
definePageMeta({
  layout: 'blank',
})

const devicePosService = useDevicePosService()
const router = useRouter()
const posDeviceCookie = usePosDeviceToken()

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

const activePinKey = ref<string | null>(null)
let pinKeyFeedbackTimeout: any = null

function triggerPinKeyFeedback(key: string) {
  activePinKey.value = key
  if (pinKeyFeedbackTimeout) clearTimeout(pinKeyFeedbackTimeout)
  pinKeyFeedbackTimeout = setTimeout(() => {
    activePinKey.value = null
  }, 120)
}

function handleNumpad(num: string) {
  if (isChangingPin.value) {
    if (newPinInput.value.length < 6) newPinInput.value += num
  } else {
    if (pinInput.value.length < 6) {
      pinInput.value += num
      if (pinInput.value.length === 6) {
        nextTick(() => {
          submitPin()
        })
      }
    }
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
  if (!selectedStaff.value || loading.value) return
  
  const currentPin = isChangingPin.value ? newPinInput.value : pinInput.value
  if (!currentPin || currentPin.length === 0) return

  if (isChangingPin.value && newPinInput.value.length < 6) {
    errorMessage.value = 'New PIN must be 6 digits'
    return
  }
  
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

function handlePinKeyDown(e: KeyboardEvent) {
  // Only handle keys if we are on the PIN lock screen (staff selected and register locked)
  if (!selectedStaff.value || device.value?.active_staff) return

  // Let browser shortcuts with modifier keys (e.g. Ctrl+R, Alt+Tab, etc.) work normally
  if (e.ctrlKey || e.altKey || e.metaKey) return

  // Prevent Spacebar from activating currently focused element
  if (e.key === ' ') {
    e.preventDefault()
    return
  }

  // Handle Escape: cancel unlock and return to staff selection
  if (e.key === 'Escape') {
    e.preventDefault()
    triggerPinKeyFeedback('Escape')
    cancelUnlock()
    return
  }

  // Handle Backspace / Delete
  if (e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault()
    if (loading.value) return
    triggerPinKeyFeedback('Backspace')
    handleBackspace()
    return
  }

  // Handle Enter (both main keyboard Enter and Numpad Enter)
  if (e.key === 'Enter') {
    e.preventDefault()
    if (loading.value) return
    triggerPinKeyFeedback('Enter')
    submitPin()
    return
  }

  // Handle Digits 0-9 (from top row numbers or numpad, even with NumLock off)
  let digit: string | null = null
  if (/^[0-9]$/.test(e.key)) {
    digit = e.key
  } else if (/^Numpad[0-9]$/.test(e.code)) {
    digit = e.code.replace('Numpad', '')
  }

  if (digit !== null) {
    e.preventDefault()
    if (loading.value) return
    triggerPinKeyFeedback(digit)
    handleNumpad(digit)
    return
  }
}

function handlePinPaste(e: ClipboardEvent) {
  if (!selectedStaff.value || device.value?.active_staff || loading.value) return
  const text = e.clipboardData?.getData('text') || ''
  const digits = text.replace(/\D/g, '')
  if (!digits) return
  e.preventDefault()
  for (const char of digits.slice(0, 6)) {
    handleNumpad(char)
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
  else if (isSpoilageOpen.value) isSpoilageOpen.value = false
  else if (isFloorPlanOpen.value) isFloorPlanOpen.value = false
}
onMounted(() => {
  window.addEventListener('keydown', onEscape)
  window.addEventListener('keydown', handlePinKeyDown)
  window.addEventListener('paste', handlePinPaste)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onEscape)
  window.removeEventListener('keydown', handlePinKeyDown)
  window.removeEventListener('paste', handlePinPaste)
})

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

const timeOnly = computed(() => {
  return currentTime.value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
})

const dateOnly = computed(() => {
  const d = currentTime.value
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear()).slice(-2)
  return `${day}.${month}.${year}`
})

function getCategoryName(categoryUuid?: string) {
  if (!categoryUuid) return 'Item'
  const c = categories.value.find(cat => cat.uuid === categoryUuid)
  return c ? c.name : 'Item'
}

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

const promoCodeInput = ref('')

function onPromoInput() {
  // Reserved for custom promotional or voucher codes
}

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
const discountIdNumber = ref('')

const changeAmount = computed(() => {
  if (selectedPaymentMethod.value !== 'cash') return 0
  const tendered = Number(amountTendered.value)
  return tendered > total.value ? tendered - total.value : 0
})

const isDiscountIdValid = computed(() => {
  if (selectedDiscountType.value === 'none') return true
  if (selectedDiscountType.value === 'PWD') {
    // Must strictly follow 03-5416-000-0000021 (2-4-3-7 digits)
    return /^\d{2}-\d{4}-\d{3}-\d{7}$/.test(discountIdNumber.value)
  }
  if (selectedDiscountType.value === 'Senior') {
    // Must follow OSCA-XXXXX (4 to 7 characters, max 12 chars total)
    return /^OSCA-[A-Z0-9]{4,7}$/.test(discountIdNumber.value)
  }
  if (selectedDiscountType.value === 'VIP') {
    // Must follow VIP-XXXX (4 to 6 characters, max 10 chars total)
    return /^VIP-[A-Z0-9]{4,6}$/.test(discountIdNumber.value)
  }
  return true
})

function formatDiscountId() {
  if (selectedDiscountType.value === 'PWD') {
    // Format must follow: 03-5416-000-0000021 (max 16 digits, 19 characters with hyphens, not exceed)
    const digits = discountIdNumber.value.replace(/\D/g, '').slice(0, 16)
    let formatted = ''
    if (digits.length > 0) {
      formatted += digits.slice(0, 2)
    }
    if (digits.length > 2) {
      formatted += '-' + digits.slice(2, 6)
    }
    if (digits.length > 6) {
      formatted += '-' + digits.slice(6, 9)
    }
    if (digits.length > 9) {
      formatted += '-' + digits.slice(9, 16)
    }
    discountIdNumber.value = formatted
  } else if (selectedDiscountType.value === 'Senior') {
    // Format: OSCA-XXXXXXX (max 12 characters, not exceed)
    let val = discountIdNumber.value.toUpperCase().replace(/\s+/g, '')
    if (val.length === 0) {
      discountIdNumber.value = ''
      return
    }
    if (!val.startsWith('OSCA')) {
      val = 'OSCA-' + val.replace(/[^A-Z0-9]/g, '')
    } else if (val.startsWith('OSCA') && !val.startsWith('OSCA-') && val.length > 4) {
      val = 'OSCA-' + val.slice(4).replace(/[^A-Z0-9]/g, '')
    } else if (val.startsWith('OSCA-')) {
      val = 'OSCA-' + val.slice(5).replace(/[^A-Z0-9]/g, '')
    }
    discountIdNumber.value = val.slice(0, 12)
  } else if (selectedDiscountType.value === 'VIP') {
    // Format: VIP-XXXX (max 10 characters, not exceed)
    let val = discountIdNumber.value.toUpperCase().replace(/\s+/g, '')
    if (val.length === 0) {
      discountIdNumber.value = ''
      return
    }
    if (!val.startsWith('VIP')) {
      val = 'VIP-' + val.replace(/[^A-Z0-9]/g, '')
    } else if (val.startsWith('VIP') && !val.startsWith('VIP-') && val.length > 3) {
      val = 'VIP-' + val.slice(3).replace(/[^A-Z0-9]/g, '')
    } else if (val.startsWith('VIP-')) {
      val = 'VIP-' + val.slice(4).replace(/[^A-Z0-9]/g, '')
    }
    discountIdNumber.value = val.slice(0, 10)
  }
}

const canCheckout = computed(() => {
  if (cart.value.length === 0) return false
  if (!isOnline.value) return false
  if (selectedDiscountType.value !== 'none' && !isDiscountIdValid.value) {
    return false
  }
  if (selectedPaymentMethod.value === 'cash') {
    return Number(amountTendered.value) >= total.value
  }
  if (selectedPaymentMethod.value === 'card' || selectedPaymentMethod.value === 'ewallet') {
    return referenceNumber.value.trim().length > 0
  }
  return true
})


watch([() => cart.value.length, total, selectedPaymentMethod, amountTendered, referenceNumber, discountIdNumber, selectedDiscountType], () => { checkoutError.value = '' })

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
  if (selectedDiscountType.value === 'PWD' && !isDiscountIdValid.value) {
    return 'Enter complete PWD ID format: 03-5416-000-0000021 to continue.'
  }
  if (selectedDiscountType.value === 'Senior' && !isDiscountIdValid.value) {
    return 'Enter complete Senior (OSCA) ID format (e.g. OSCA-1234567) to continue.'
  }
  if (selectedDiscountType.value === 'VIP' && !isDiscountIdValid.value) {
    return 'Enter complete VIP Number format (e.g. VIP-0001) to continue.'
  }
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
const pwdIdInputRef = ref<HTMLInputElement | null>(null)
const seniorIdInputRef = ref<HTMLInputElement | null>(null)
const vipIdInputRef = ref<HTMLInputElement | null>(null)

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
  if (selectedDiscountType.value !== 'none' && !isDiscountIdValid.value) {
    if (selectedDiscountType.value === 'PWD') pwdIdInputRef.value?.focus()
    else if (selectedDiscountType.value === 'Senior') seniorIdInputRef.value?.focus()
    else if (selectedDiscountType.value === 'VIP') vipIdInputRef.value?.focus()
  } else {
    ;(tenderInput.value ?? referenceInput.value)?.focus()
  }
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

    const fullRef = [
      referenceNumber.value.trim(),
      discountIdNumber.value.trim() ? `${selectedDiscountType.value} ID: ${discountIdNumber.value.trim()}` : ''
    ].filter(Boolean).join(' | ')

    const res = await devicePosService.checkout(
      items, 
      selectedPaymentMethod.value, 
      Number(amountTendered.value) || total.value, 
      fullRef || referenceNumber.value,
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
        discountIdNumber: discountIdNumber.value.trim(),
        total: currentTotal,
        paymentMethod: currentMethod,
        change: currentChange,
        staff: currentStaff,
        date: new Date().toLocaleString()
      }
      isPaymentModalOpen.value = false
      isReceiptModalOpen.value = true
      cart.value = []
      selectedTableForOrder.value = null
      amountTendered.value = ''
      referenceNumber.value = ''
      discountIdNumber.value = ''
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

// Spoilage: logged entries come out of the item's servings, so the menu's stock is reloaded.
const isSpoilageOpen = ref(false)

// Floor plan & table reservations modal
const isFloorPlanOpen = ref(false)
const selectedTableForOrder = ref<any>(null)
const isUpdatingTableStatus = ref(false)

function openFloorPlan() {
  isFloorPlanOpen.value = true
}

function onTableSelectedFromFloorPlan(table: any) {
  selectedTableForOrder.value = { ...table, status: 'occupied' }
  isFloorPlanOpen.value = false
  showNotice(`Assigned ${table.table_name} (Occupied) to current order.`)
}

async function freeAssignedTable() {
  if (!selectedTableForOrder.value || isUpdatingTableStatus.value) return
  const table = selectedTableForOrder.value
  isUpdatingTableStatus.value = true
  try {
    const res = await devicePosService.updateTableStatus(table.uuid, 'available')
    if (res.success) {
      showNotice(`${table.table_name} is now Available (Customer Left).`)
      selectedTableForOrder.value = null
    }
  } catch (e: any) {
    showNotice(e?.data?.message || 'Could not update table status.')
  } finally {
    isUpdatingTableStatus.value = false
  }
}

async function onSpoilageLogged() {
  try {
    const m = await devicePosService.getMenu()
    if (!m.success) return
    menuItems.value = m.items
  } catch {
    return
  }
  // The open order can now ask for more than is left; checkout re-checks, but say so now.
  for (const uuid of new Set(cart.value.map(i => i.uuid))) {
    const item = menuItems.value.find(i => i.uuid === uuid)
    if (item && inCart(uuid) > item.available_stock) showNotice(`Only ${item.available_stock} ${item.menu_name} left now. Adjust the order.`)
  }
}

function printZReading() {
  window.print()
}

async function refreshMenu() {
  try {
    const menuRes = await devicePosService.getMenu()
    if (menuRes.success) {
      categories.value = [{ uuid: 'all', name: 'All Items' }, ...menuRes.categories]
      menuItems.value = menuRes.items
    }
  } catch (err) {
    console.error('Failed to refresh menu', err)
  }
}

// Keeps available stock current when servings are adjusted or other registers sell.
useAutoRefresh(refreshMenu, { enabled: () => !!device.value })

async function onTransactionRefunded() {
  await openTransactions()
  await refreshMenu()
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

const { downloadReceiptImage } = useReceiptDownload()

async function downloadCurrentReceipt() {
  if (!completedOrderDetails.value) return
  const o = completedOrderDetails.value
  await downloadReceiptImage({
    receiptNumber: o.receiptNumber,
    date: o.date || new Date(),
    cashier: o.staff,
    cafeName: device.value?.cafe_name || 'BrewSpot',
    branchName: device.value?.branch_name || 'Main Branch',
    items: (o.items || []).map((i: any) => ({
      name: i.menu_name,
      quantity: i.quantity,
      unitPrice: getItemUnitPrice(i),
      lineTotal: getItemUnitPrice(i) * (i.quantity || 1),
      sizeName: i.size_name,
      addons: i.addons,
    })),
    subtotal: o.subtotal || o.baseItemsTotal || 0,
    discountType: o.discountType !== 'none' ? o.discountType : null,
    discountAmount: o.discountAmount || 0,
    total: o.total,
    paymentMethod: o.paymentMethod || 'Cash',
    change: o.change,
  })
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
      <header class="bg-white border-b border-[#EFECE6] px-5 py-2.5 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <div class="flex-1 flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl overflow-hidden shadow-xs ring-1 ring-[#7B5A50]/15 shrink-0 bg-[#FAF8F5] flex items-center justify-center">
            <img :src="logoIcon" alt="BrewSpot" class="w-full h-full object-cover" />
          </div>
          <div class="min-w-0">
            <h1 class="text-base font-extrabold text-[#2D201B] tracking-tight truncate leading-snug">
              {{ device.cafe_name || device.branch_name || 'BrewSpot POS' }}
            </h1>
            <div class="flex items-center gap-1.5 text-xs text-[#8A6E64] truncate">
              <span>{{ device.branch_name }}</span>
              <span class="text-gray-300">&bull;</span>
              <span class="font-medium">{{ device.name }}</span>
              <span class="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Online</span>
            </div>
          </div>
        </div>

        <div class="flex-1 text-center hidden md:flex justify-center">
          <div class="inline-flex items-center gap-2.5 px-4 py-1.5 bg-[#FAF8F5] hover:bg-[#F5EFE6] border border-[#EFECE6] rounded-full text-xs font-bold text-[#5C453C] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-colors">
            <span class="flex h-2 w-2 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Icon name="heroicons:clock" class="w-3.5 h-3.5 text-[#7B5A50]" />
            <span class="tracking-wide">{{ formattedTime }}</span>
          </div>
        </div>

        <div class="flex-1 flex items-center justify-end gap-2.5">
          <template v-if="device.active_staff">
            <div class="flex items-center gap-2 bg-[#FAF8F5] px-3 py-1.5 rounded-full border border-[#EFECE6] shadow-xs">
              <div class="w-6 h-6 bg-[#7B5A50] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-xs">
                {{ device.active_staff.firstname?.charAt(0) || 'U' }}
              </div>
              <span class="font-bold text-xs text-[#2D201B]">{{ device.active_staff.firstname }}</span>
            </div>
            
            <button @click="openTransactions" class="h-9 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE4] border border-[#EFECE6] text-[#4A3830] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95">
              <Icon name="heroicons:document-text" class="w-4 h-4 text-[#7B5A50]" /> 
              <span>Transactions</span>
            </button>
            <button @click="isSpoilageOpen = true" title="Log servings that were thrown away" class="h-9 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE4] border border-[#EFECE6] text-[#4A3830] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95">
              <Icon name="heroicons:trash" class="w-4 h-4 text-[#7B5A50]" /> 
              <span>Spoilage</span>
            </button>
            <button @click="lockRegister" title="Lock the register and clear the current order" class="h-9 w-9 rounded-xl bg-[#FAF8F5] hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-[#EFECE6] text-gray-500 transition-all shadow-xs flex items-center justify-center active:scale-95">
              <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
            </button>
          </template>
          <template v-else>
            <button @click="unregisterDevice" class="h-9 text-xs font-bold text-red-700 hover:text-red-900 transition-colors px-3">
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
            <p class="text-xs text-gray-400 mt-1">
              Type on keyboard or use keypad
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
                    class="bg-white border border-gray-200 rounded-lg h-12 text-xl font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-200 active:scale-95 transition-all shadow-sm select-none"
                    :class="{ 'ring-2 ring-[#7B5A50] bg-gray-100 scale-95': activePinKey === n }">
              {{ n }}
            </button>
            <button @click="cancelUnlock" aria-label="Choose a different staff member" class="bg-gray-100 border border-gray-200 rounded-lg h-12 text-sm font-semibold text-gray-600 hover:bg-gray-200 active:scale-95 transition-all select-none"
                    :class="{ 'ring-2 ring-gray-400 bg-gray-200 scale-95': activePinKey === 'Escape' }">
              Cancel
            </button>
            <button @click="handleNumpad('0')" class="bg-white border border-gray-200 rounded-lg h-12 text-xl font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-200 active:scale-95 transition-all shadow-sm select-none"
                    :class="{ 'ring-2 ring-[#7B5A50] bg-gray-100 scale-95': activePinKey === '0' }">
              0
            </button>
            <button @click="handleBackspace" aria-label="Delete last digit" class="bg-gray-100 border border-gray-200 rounded-lg h-12 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all select-none"
                    :class="{ 'ring-2 ring-[#7B5A50] bg-gray-200 scale-95': activePinKey === 'Backspace' }">
              <Icon name="heroicons:backspace" class="w-5 h-5" />
            </button>
          </div>

          <button 
            @click="submitPin" 
            class="w-full bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold rounded-lg py-3 text-base transition-all shadow-sm flex items-center justify-center gap-2 select-none"
            :class="{ 'ring-2 ring-[#533830] bg-[#533830] scale-[0.98]': activePinKey === 'Enter' }"
            :disabled="loading"
          >
            <Icon v-if="loading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            {{ isChangingPin ? 'SET NEW PIN' : 'UNLOCK' }}
          </button>
        </div>

      </main>

      <!-- ── ACTIVE REGISTER (UNLOCKED) ───────────────────────────────────── -->
      <main v-else class="flex-1 flex overflow-hidden bg-[#F5F6F8]">
        <!-- ── COLUMN 1: LEFT NAV & FILTERS ─────────────────────────────── -->
        <aside class="w-60 lg:w-64 shrink-0 flex flex-col p-3.5 gap-3.5 overflow-y-auto border-r border-[#E8E2D8] bg-white shadow-[2px_0_12px_rgba(0,0,0,0.015)] z-1">
          <!-- Search Pill -->
          <div class="relative w-full">
            <Icon name="heroicons:magnifying-glass" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7B5A50]/70" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search..." 
              class="w-full bg-[#FAF8F5] border border-[#EFECE6] rounded-full pl-10 pr-8 h-10 text-xs text-[#2D201B] placeholder:text-gray-400 shadow-xs focus:outline-none focus:bg-white focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] transition-all"
            />
            <button 
              v-if="searchQuery" 
              @click="searchQuery = ''"
              aria-label="Clear search"
              class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#7B5A50] rounded-full"
            >
              <Icon name="heroicons:x-mark" class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Perforated Divider -->
          <div class="border-b border-dashed border-[#E8E2D8] my-0.5"></div>

          <!-- Quick Navigation Tiles (4 Squircle Tiles: Home, Tables, Orders, Refresh) -->
          <div class="grid grid-cols-2 gap-2.5">
            <!-- Home -->
            <button
              @click="selectedCategory = 'all'; searchQuery = ''"
              class="h-22 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all text-center select-none active:scale-95"
              :class="selectedCategory === 'all' && !searchQuery
                ? 'bg-[#7B5A50] text-white shadow-md shadow-[#7B5A50]/20 border border-[#7B5A50]'
                : 'bg-[#FAF8F5] text-[#4A3830] hover:bg-[#F5EFE6] border border-[#EFECE6] hover:border-[#7B5A50]/40 shadow-xs'"
            >
              <Icon name="heroicons:home" class="w-5 h-5" :class="selectedCategory === 'all' && !searchQuery ? 'text-white' : 'text-[#7B5A50]'" />
              <span class="text-xs font-bold">Home</span>
            </button>

            <!-- Tables -->
            <button
              @click="openFloorPlan"
              title="View floor plan and table reservations"
              class="h-22 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all text-center select-none shadow-xs active:scale-95 relative"
              :class="selectedTableForOrder
                ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 border'
                : 'bg-[#FAF8F5] text-[#4A3830] hover:bg-[#F5EFE6] border border-[#EFECE6] hover:border-[#7B5A50]/40'"
            >
              <div v-if="selectedTableForOrder" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></div>
              <Icon name="heroicons:squares-2x2" class="w-5 h-5" :class="selectedTableForOrder ? 'text-emerald-700' : 'text-[#7B5A50]'" />
              <span class="text-xs font-bold truncate w-full">
                {{ selectedTableForOrder ? selectedTableForOrder.table_name : 'Tables' }}
              </span>
            </button>

            <!-- Orders / Transactions -->
            <button
              @click="openTransactions"
              title="View today's transactions"
              class="h-22 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all text-center select-none bg-[#FAF8F5] text-[#4A3830] hover:bg-[#F5EFE6] border border-[#EFECE6] hover:border-[#7B5A50]/40 shadow-xs active:scale-95"
            >
              <Icon name="heroicons:shopping-bag" class="w-5 h-5 text-[#7B5A50]" />
              <span class="text-xs font-bold">Orders</span>
            </button>

            <!-- Refresh Menu -->
            <button
              @click="loadDeviceData"
              title="Refresh menu and stock"
              class="h-22 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all text-center select-none bg-[#FAF8F5] text-[#4A3830] hover:bg-[#F5EFE6] border border-[#EFECE6] hover:border-[#7B5A50]/40 shadow-xs active:scale-95"
            >
              <Icon name="heroicons:arrow-path" class="w-5 h-5 text-[#7B5A50]" :class="{'animate-spin': loading}" />
              <span class="text-xs font-bold">Refresh</span>
            </button>
          </div>

          <!-- Promo / Voucher Card (Positioned at bottom foot, compact width) -->
          <div class="mt-auto mb-1 relative overflow-hidden rounded-2xl p-3 bg-[#FAF8F5] border border-[#EAE3D9] shadow-xs w-full max-w-[230px] mx-auto">
            <!-- Warm yellow gradient glow in bottom corner -->
            <div class="absolute -bottom-8 -right-8 w-28 h-28 bg-gradient-to-tr from-amber-300/40 via-yellow-200/30 to-transparent rounded-full blur-2xl pointer-events-none"></div>

            <div class="relative z-10 space-y-2">
              <p class="font-bold text-[11px] text-[#2D201B] leading-snug">
                Don't forget<br />
                to enter your promo code<br />
                for a special discount<br />
                on your purchase!
              </p>

              <!-- Pill Input with Gift Box Icon -->
              <div class="relative">
                <input 
                  v-model="promoCodeInput"
                  @input="onPromoInput"
                  type="text" 
                  placeholder="Enter" 
                  class="w-full bg-white border border-[#E8E2D8] rounded-full pl-3 pr-8 h-8 text-[11px] font-semibold text-[#2D201B] placeholder:text-gray-400 focus:outline-none focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] transition-all"
                />
                <div class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#7B5A50] pointer-events-none">
                  <Icon name="heroicons:gift" class="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- ── COLUMN 2: CENTER MENU CATALOG ────────────────────────────── -->
        <section class="flex-1 flex flex-col overflow-hidden p-4 min-w-0" aria-label="Menu Items">
          <!-- Banners -->
          <div v-if="!isOnline" role="status" class="mb-3 px-4 py-2 bg-amber-100 text-amber-900 text-xs font-semibold rounded-2xl border border-amber-300">
            Offline. You can build orders, but sales can't be recorded until the connection returns.
          </div>
          <div v-else-if="loadError" role="alert" class="mb-3 px-4 py-2 bg-red-50 text-red-800 text-xs font-semibold rounded-2xl border border-red-200 flex items-center justify-between gap-3">
            <span>{{ loadError }} The menu may be out of date.</span>
            <button @click="loadDeviceData" class="font-bold underline">Try again</button>
          </div>

          <!-- Catalog Header / Filter Bar -->
          <div class="flex items-center justify-between mb-3.5 px-1 shrink-0">
            <div>
              <h2 class="text-base font-bold text-[#2D201B]">
                {{ categories.find(c => c.uuid === selectedCategory)?.name || 'Menu Catalog' }}
              </h2>
              <p class="text-xs text-[#8A6E64]">
                Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'item' : 'items' }}
              </p>
            </div>

            <!-- Horizontal quick chips -->
            <div class="flex items-center gap-1.5 overflow-x-auto hide-scrollbar max-w-md">
              <button 
                v-for="cat in categories.slice(0, 6)" 
                :key="cat.uuid"
                @click="selectedCategory = cat.uuid"
                class="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0"
                :class="selectedCategory === cat.uuid
                  ? 'bg-[#7B5A50] text-white shadow-sm'
                  : 'bg-white border border-[#EFECE6] text-gray-600 hover:bg-gray-50'"
              >
                {{ cat.name }}
              </button>
            </div>
          </div>

          <!-- Items Grid (3 Columns with Circular Food Photos matching reference) -->
          <div class="flex-1 overflow-y-auto pr-1 pb-20">
            <div v-if="filteredItems.length === 0" class="h-64 flex flex-col items-center justify-center text-center p-8 text-gray-500">
              <Icon name="heroicons:magnifying-glass" class="w-10 h-10 mb-2 text-gray-300" />
              <p class="text-sm font-semibold text-gray-700">No menu items found</p>
              <p class="text-xs text-gray-400 mt-1">{{ searchQuery.trim() ? `No results for "${searchQuery.trim()}"` : 'This category has no items yet.' }}</p>
            </div>

            <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              <button 
                v-for="item in filteredItems" 
                :key="item.uuid"
                @click="addToCart(item)"
                :disabled="item.sold_out"
                class="bg-white rounded-2xl border border-[#EFECE6] p-3 flex flex-col justify-between shadow-[0_3px_14px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_22px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all group text-left cursor-pointer relative select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <!-- Circular Image Container (Centered Floating Circle) -->
                <div class="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full overflow-hidden shadow-xs bg-gradient-to-tr from-[#FAF8F5] to-[#EFEAE2] flex items-center justify-center mb-2 relative">
                  <img 
                    v-if="item.picture" 
                    :src="item.picture" 
                    :alt="item.menu_name" 
                    class="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300" 
                  />
                  <div v-else class="w-full h-full flex items-center justify-center bg-[#FDF8F3] text-[#7B5A50]">
                    <Icon name="heroicons:cake" class="w-7 h-7 sm:w-8 sm:h-8 opacity-60 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div v-if="item.sold_out" class="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                    Sold Out
                  </div>
                </div>

                <!-- Info matching reference layout -->
                <div class="flex-1 flex flex-col justify-between">
                  <h3 :title="item.menu_name" class="font-bold text-xs sm:text-sm text-[#2D201B] line-clamp-2 leading-snug mb-1.5 min-h-8">
                    {{ item.menu_name }}
                  </h3>

                  <div class="flex items-baseline justify-between mt-auto pt-1">
                    <span class="text-[11px] text-[#8A6E64] capitalize truncate max-w-[55%]">
                      {{ getCategoryName(item.category_uuid) }}
                    </span>
                    <span class="font-bold text-xs sm:text-sm text-[#2D201B] tabular-nums">
                      {{ formatCurrency(item.base_price) }}
                    </span>
                  </div>

                  <p v-if="!item.sold_out" class="text-[10px] text-gray-400 mt-0.5">
                    {{ item.available_stock }} left
                  </p>
                </div>
              </button>
            </div>
          </div>
        </section>

        <!-- ── COLUMN 3: RIGHT ORDER TICKET (Matching Reference Design) ───── -->
        <aside class="w-80 lg:w-[350px] shrink-0 bg-white rounded-[32px] border border-[#EFECE6] shadow-[0_8px_30px_rgba(0,0,0,0.04)] m-4 ml-0 flex flex-col overflow-hidden" aria-label="Current Order">
          <!-- Ticket Header with Time & Date (Matching reference top) -->
          <div class="px-6 pt-5 pb-2 flex items-center justify-between text-xs text-gray-400 font-normal shrink-0">
            <span>{{ timeOnly }}</span>
            <span>{{ dateOnly }}</span>
          </div>

          <!-- Order Title Bar -->
          <div class="px-6 pb-2.5 flex items-center justify-between border-b border-[#F0EBE3] shrink-0">
            <h2 class="text-sm font-bold text-[#2D201B] flex items-center gap-2">
              Order
              <span v-if="cartCount" class="min-w-5 h-5 px-1.5 rounded-full bg-[#7B5A50] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                {{ cartCount }}
              </span>
            </h2>

            <button 
              v-if="cart.length" 
              @click="clearCart" 
              class="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
            >
              Clear
            </button>
          </div>

          <!-- Table Assigned to Order Indicator -->
          <div v-if="selectedTableForOrder" class="px-3.5 py-2 bg-[#FDF3E7] border-b border-[#E3CFB4] flex items-center justify-between text-xs shrink-0">
            <div class="flex items-center gap-1.5 min-w-0 mr-2">
              <Icon name="heroicons:map-pin" class="w-4 h-4 text-[#7D5A50] shrink-0" />
              <span class="truncate font-bold text-[#2D201B]">{{ selectedTableForOrder.table_name }}</span>
              <span class="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E8DEC8] text-[#5B463C]">Occupied</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                @click="freeAssignedTable"
                :disabled="isUpdatingTableStatus"
                class="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-50"
                title="Customer has left: Mark table Available"
              >
                <Icon name="heroicons:arrow-path" v-if="isUpdatingTableStatus" class="w-3 h-3 animate-spin" />
                <Icon name="heroicons:check" v-else class="w-3 h-3" />
                <span>Customer Left</span>
              </button>
              <button
                @click="selectedTableForOrder = null"
                title="Unlink from this ticket"
                class="w-6 h-6 rounded-md hover:bg-[#F3E5D4] text-[#8B6656] hover:text-[#5B463C] flex items-center justify-center transition-colors"
              >
                <Icon name="heroicons:x-mark" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Order Notice / Undo -->
          <div v-if="orderNotice" role="status" class="px-4 py-1.5 bg-gray-800 text-white text-xs flex items-center justify-between gap-2 shrink-0">
            <span>{{ orderNotice.text }}</span>
            <button v-if="orderNotice.restore" @click="undoClear" class="font-bold underline">Undo</button>
          </div>

          <!-- Ticket Items List (Matching Reference Squircle Cards with Cutlery Icon) -->
          <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <div class="w-12 h-12 rounded-full bg-[#F5EFE6] flex items-center justify-center text-[#7B5A50] mb-2">
                <Icon name="heroicons:shopping-bag" class="w-6 h-6 opacity-60" />
              </div>
              <p class="text-sm font-semibold text-gray-700">No items in order</p>
              <p class="text-xs text-gray-400 mt-0.5">Tap any menu item to add</p>
            </div>

            <TransitionGroup v-else name="list" tag="ul" class="space-y-2.5">
              <li 
                v-for="item in cart" 
                :key="item.line_key" 
                class="bg-[#F8F9FA] hover:bg-[#F3F4F6] border border-gray-100 rounded-2xl p-3 flex items-center justify-between gap-3 transition-colors group"
              >
                <!-- Cutlery Icon (Fork & Knife SVG) -->
                <div class="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-gray-500 shadow-xs shrink-0">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/>
                    <path d="M15 2v12a2 2 0 0 1-2 2h-1"/>
                    <path d="M5 2v7a2 2 0 0 0 2 2h1"/>
                    <path d="M8 2v20"/>
                  </svg>
                </div>

                <div class="min-w-0 flex-1">
                  <p class="font-bold text-xs text-[#1E1B18] truncate">{{ item.menu_name }}</p>
                  <p v-if="lineDetails(item)" class="text-[11px] text-[#8A6E64] truncate leading-tight">{{ lineDetails(item) }}</p>
                  
                  <div class="flex items-center gap-2 mt-1">
                    <button 
                      @click="updateQuantity(item, -1)" 
                      :aria-label="`Remove one ${item.menu_name}`" 
                      class="w-5 h-5 rounded-md bg-white border border-[#EFECE6] flex items-center justify-center text-gray-600 hover:bg-gray-100 text-xs font-bold transition-all active:scale-90"
                    >
                      -
                    </button>
                    <span class="text-xs font-bold text-[#2D201B] tabular-nums">{{ item.quantity }}</span>
                    <button 
                      @click="updateQuantity(item, 1)" 
                      :aria-label="`Add one ${item.menu_name}`" 
                      class="w-5 h-5 rounded-md bg-white border border-[#EFECE6] flex items-center justify-center text-gray-600 hover:bg-gray-100 text-xs font-bold transition-all active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="font-bold text-xs text-[#1E1B18] tabular-nums">
                    {{ formatCurrency(getItemUnitPrice(item) * item.quantity) }}
                  </span>
                </div>
              </li>
            </TransitionGroup>
          </div>

          <!-- Perforated Ticket Notch Divider (Authentic cutout notch) -->
          <div class="relative py-2 flex items-center justify-between overflow-hidden shrink-0">
            <div class="w-4 h-7 bg-[#F5F6F8] rounded-r-full -ml-1 border-r border-[#EFECE6]"></div>
            <div class="flex-1 border-b-2 border-dashed border-[#DFDAD2] mx-2"></div>
            <div class="w-4 h-7 bg-[#F5F6F8] rounded-l-full -mr-1 border-l border-[#EFECE6]"></div>
          </div>

          <!-- Summary & Quick Payment Section -->
          <div class="px-6 pt-1 pb-5 space-y-3.5 shrink-0">
            <!-- Subtotal & Discount -->
            <div v-if="discountAmount > 0" class="flex justify-between text-xs text-red-600 font-medium">
              <span>Discount ({{ selectedDiscountType }})</span>
              <span>-{{ formatCurrency(discountAmount) }}</span>
            </div>

            <!-- Total -->
            <div class="flex items-baseline justify-between pt-1">
              <span class="text-sm font-semibold text-gray-400">Total</span>
              <span class="text-2xl font-bold text-[#1E1B18] tabular-nums">{{ formatCurrency(total) }}</span>
            </div>

            <!-- Customer Discount Pills (PWD, Senior, VIP, None) placed directly after the total -->
            <div class="space-y-1 pt-0.5">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Discount</span>
                <span v-if="selectedDiscountType !== 'none'" class="text-[11px] font-bold text-red-600">
                  {{ selectedDiscountType === 'VIP' ? '10% OFF' : '20% OFF' }}
                </span>
              </div>
              <div role="radiogroup" aria-label="Customer Discount" class="grid grid-cols-4 gap-1.5">
                <button
                  v-for="d in discountOptions"
                  :key="d.value"
                  type="button"
                  role="radio"
                  :aria-checked="selectedDiscountType === d.value"
                  @click="selectedDiscountType = d.value"
                  :disabled="cart.length === 0"
                  class="h-8 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center select-none active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="selectedDiscountType === d.value
                    ? 'border-[#7B5A50] bg-[#7B5A50] text-white shadow-xs'
                    : 'border-gray-200 bg-[#F8F9FA] text-gray-600 hover:bg-gray-100'"
                >
                  {{ d.label }}
                </button>
              </div>
            </div>

            <!-- Main Process Payment Button -->
            <button
              @click="openPayment"
              :disabled="cart.length === 0 || !isOnline"
              class="w-full h-12 bg-[#7B5A50] hover:bg-[#65463D] text-white font-bold rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              <span>Process Payment</span>
            </button>
          </div>
        </aside>
      </main>

      <!-- ── PAYMENT MODAL ────────────────────────────────────────────────── -->
      <div v-if="isPaymentModalOpen" role="dialog" aria-modal="true" aria-labelledby="pay-title" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 print:hidden" @click.self="closePayment">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden modal-pop max-h-[92vh] border border-[#EFECE6]">
          <!-- Modal Header -->
          <div class="px-5 py-3.5 border-b border-[#EFECE6] flex items-center justify-between bg-[#FAF8F5] shrink-0">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-[#7B5A50]/10 flex items-center justify-center text-[#7B5A50]">
                <Icon name="heroicons:credit-card" class="w-4 h-4" />
              </div>
              <h2 id="pay-title" class="text-base sm:text-lg font-bold text-[#2D201B]">Process Payment</h2>
            </div>
            <button @click="closePayment" :disabled="isProcessingOrder" aria-label="Close payment" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg border border-transparent hover:border-[#EFECE6] transition-all disabled:opacity-50">
              <Icon name="heroicons:x-mark" class="w-4 h-4" />
            </button>
          </div>

          <fieldset :disabled="isProcessingOrder" class="m-0 border-0 min-w-0 px-5 py-3.5 space-y-3 overflow-y-auto" :class="{ 'opacity-60': isProcessingOrder }">
            <!-- Total Due Banner matching Image 3 -->
            <div class="flex items-baseline justify-between pt-0.5">
              <div>
                <span class="text-xs font-bold text-[#8A6E64] uppercase tracking-wider block">Total due</span>
                <span v-if="discountAmount > 0" class="text-[11px] font-semibold text-red-600">
                  {{ selectedDiscountType }} (-{{ formatCurrency(discountAmount) }})
                </span>
              </div>
              <span class="font-display text-3xl sm:text-4xl font-extrabold text-[#7B5A50] tabular-nums tracking-tight">{{ formatCurrency(total) }}</span>
            </div>

            <!-- Payment Method Buttons matching Image 2 & 3 (Banknote, Card, Smartphone) -->
            <div role="radiogroup" aria-label="Payment method" class="grid grid-cols-3 gap-2">
              <!-- Cash (Banknote icon) -->
              <button
                type="button"
                role="radio"
                :aria-checked="selectedPaymentMethod === 'cash'"
                @click="selectedPaymentMethod = 'cash'"
                class="h-14 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all active:scale-95"
                :class="selectedPaymentMethod === 'cash' ? 'border-[#7B5A50] bg-[#FAF8F5] text-[#7B5A50] ring-1 ring-[#7B5A50]' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'"
              >
                <svg class="w-5 h-4.5" viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="2" width="20" height="16" rx="2" />
                  <circle cx="12" cy="10" r="3" />
                  <line x1="5" y1="10" x2="5.01" y2="10" stroke-width="2" />
                  <line x1="19" y1="10" x2="19.01" y2="10" stroke-width="2" />
                </svg>
                <span>Cash</span>
              </button>

              <!-- Card (Credit Card icon) -->
              <button
                type="button"
                role="radio"
                :aria-checked="selectedPaymentMethod === 'card'"
                @click="selectedPaymentMethod = 'card'"
                class="h-14 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all active:scale-95"
                :class="selectedPaymentMethod === 'card' ? 'border-[#7B5A50] bg-[#FAF8F5] text-[#7B5A50] ring-1 ring-[#7B5A50]' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'"
              >
                <svg class="w-5 h-4.5" viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="2" y1="8" x2="22" y2="8" stroke-width="1.75" />
                </svg>
                <span>Card</span>
              </button>

              <!-- E-Wallet (Smartphone icon) -->
              <button
                type="button"
                role="radio"
                :aria-checked="selectedPaymentMethod === 'ewallet'"
                @click="selectedPaymentMethod = 'ewallet'"
                class="h-14 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all active:scale-95"
                :class="selectedPaymentMethod === 'ewallet' ? 'border-[#7B5A50] bg-[#FAF8F5] text-[#7B5A50] ring-1 ring-[#7B5A50]' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'"
              >
                <svg class="w-4.5 h-5.5" viewBox="0 0 20 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="4" y="2" width="12" height="20" rx="2.5" />
                  <line x1="8.5" y1="5" x2="11.5" y2="5" stroke-width="1.5" stroke-linecap="round" />
                  <circle cx="10" cy="18.5" r="1" fill="currentColor" />
                </svg>
                <span>E-Wallet</span>
              </button>
            </div>

            <!-- PWD ID Requirement (Format: 03-5416-000-0000021, max 19 chars) -->
            <div v-if="selectedDiscountType === 'PWD'" class="p-3 bg-[#FAF8F5] border border-[#EAE3D9] rounded-xl space-y-1.5">
              <div class="flex items-center justify-between">
                <label for="pwd-id-input" class="text-xs font-bold text-[#7B5A50] flex items-center gap-1.5 cursor-pointer">
                  <Icon name="heroicons:identification" class="w-4 h-4 text-[#7B5A50]" />
                  <span>PWD ID Number</span>
                  <span class="text-red-500">*</span>
                </label>
                <span class="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">20% Discount</span>
              </div>
              <input
                id="pwd-id-input"
                ref="pwdIdInputRef"
                v-model="discountIdNumber"
                @input="formatDiscountId"
                type="text"
                maxlength="19"
                placeholder="03-5416-000-0000021"
                class="w-full h-10 bg-white border border-[#D8CEBE] focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] text-[#2D201B] placeholder:text-gray-400 rounded-lg px-3 text-xs sm:text-sm font-semibold tracking-wider font-mono outline-none transition-all"
              />
              <div class="flex items-center justify-between text-[11px]">
                <p class="text-gray-500 flex items-center gap-1">
                  <span>Format:</span>
                  <span class="font-mono font-bold text-[#7B5A50] bg-white px-1.5 py-0.5 rounded border border-[#EAE3D9]">03-5416-000-0000021</span>
                </p>
                <span v-if="isDiscountIdValid" class="text-emerald-700 font-semibold flex items-center gap-1">
                  <Icon name="heroicons:check-circle" class="w-3.5 h-3.5" /> Valid PWD ID
                </span>
                <span v-else-if="discountIdNumber" class="text-red-600 font-medium">
                  Must follow format
                </span>
              </div>
            </div>

            <!-- Senior Citizen (OSCA) ID Requirement (Format: OSCA-XXXXXXX, max 12 chars) -->
            <div v-else-if="selectedDiscountType === 'Senior'" class="p-3 bg-[#FAF8F5] border border-[#EAE3D9] rounded-xl space-y-1.5">
              <div class="flex items-center justify-between">
                <label for="senior-id-input" class="text-xs font-bold text-[#7B5A50] flex items-center gap-1.5 cursor-pointer">
                  <Icon name="heroicons:identification" class="w-4 h-4 text-[#7B5A50]" />
                  <span>Senior Citizen (OSCA) ID Number</span>
                  <span class="text-red-500">*</span>
                </label>
                <span class="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">20% Discount</span>
              </div>
              <input
                id="senior-id-input"
                ref="seniorIdInputRef"
                v-model="discountIdNumber"
                @input="formatDiscountId"
                type="text"
                maxlength="12"
                placeholder="OSCA-1234567"
                class="w-full h-10 bg-white border border-[#D8CEBE] focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] text-[#2D201B] placeholder:text-gray-400 rounded-lg px-3 text-xs sm:text-sm font-semibold tracking-wider font-mono outline-none transition-all uppercase"
              />
              <div class="flex items-center justify-between text-[11px]">
                <p class="text-gray-500 flex items-center gap-1">
                  <span>Format:</span>
                  <span class="font-mono font-bold text-[#7B5A50] bg-white px-1.5 py-0.5 rounded border border-[#EAE3D9]">OSCA-XXXXXXX</span>
                </p>
                <span v-if="isDiscountIdValid" class="text-emerald-700 font-semibold flex items-center gap-1">
                  <Icon name="heroicons:check-circle" class="w-3.5 h-3.5" /> Valid OSCA ID
                </span>
                <span v-else-if="discountIdNumber" class="text-red-600 font-medium">
                  Must follow OSCA-XXXXX
                </span>
              </div>
            </div>

            <!-- VIP Member Number Requirement (Format: VIP-XXXX, max 10 chars) -->
            <div v-else-if="selectedDiscountType === 'VIP'" class="p-3 bg-[#FAF8F5] border border-[#EAE3D9] rounded-xl space-y-1.5">
              <div class="flex items-center justify-between">
                <label for="vip-id-input" class="text-xs font-bold text-[#7B5A50] flex items-center gap-1.5 cursor-pointer">
                  <Icon name="heroicons:star" class="w-4 h-4 text-[#7B5A50]" />
                  <span>VIP Member Number</span>
                  <span class="text-red-500">*</span>
                </label>
                <span class="text-[10px] font-bold text-amber-800 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-full">10% Discount</span>
              </div>
              <input
                id="vip-id-input"
                ref="vipIdInputRef"
                v-model="discountIdNumber"
                @input="formatDiscountId"
                type="text"
                maxlength="10"
                placeholder="VIP-0001"
                class="w-full h-10 bg-white border border-[#D8CEBE] focus:border-[#7B5A50] focus:ring-1 focus:ring-[#7B5A50] text-[#2D201B] placeholder:text-gray-400 rounded-lg px-3 text-xs sm:text-sm font-semibold tracking-wider font-mono outline-none transition-all uppercase"
              />
              <div class="flex items-center justify-between text-[11px]">
                <p class="text-gray-500 flex items-center gap-1">
                  <span>Format:</span>
                  <span class="font-mono font-bold text-[#7B5A50] bg-white px-1.5 py-0.5 rounded border border-[#EAE3D9]">VIP-XXXX</span>
                </p>
                <span v-if="isDiscountIdValid" class="text-emerald-700 font-semibold flex items-center gap-1">
                  <Icon name="heroicons:check-circle" class="w-3.5 h-3.5" /> Valid VIP
                </span>
                <span v-else-if="discountIdNumber" class="text-red-600 font-medium">
                  Must follow VIP-XXXX
                </span>
              </div>
            </div>

            <!-- Cash Tendered Input -->
            <div v-if="selectedPaymentMethod === 'cash'" class="space-y-2.5">
              <label class="block">
                <span class="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Amount tendered</span>
                <div class="relative flex items-center">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-[#7B5A50] select-none pointer-events-none">&#8369;</span>
                  <input
                    ref="tenderInput"
                    v-model="amountTendered"
                    @keydown.enter="completeOrder"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="0.01"
                    class="w-full h-13 sm:h-14 bg-white border-2 border-gray-200 focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/15 text-gray-900 rounded-xl pl-10 pr-10 text-2xl font-extrabold tabular-nums outline-none transition-all shadow-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0.00"
                  />
                  <button
                    v-if="amountTendered"
                    type="button"
                    @click="amountTendered = ''; tenderInput?.focus()"
                    title="Clear amount"
                    class="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors active:scale-90"
                  >
                    <Icon name="heroicons:x-mark" class="w-4 h-4" />
                  </button>
                </div>
              </label>

              <!-- Quick cash amount buttons -->
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-semibold text-gray-400">Quick:</span>
                <button
                  type="button"
                  @click="amountTendered = total"
                  class="h-7.5 px-2.5 rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] hover:bg-[#F2ECE4] text-xs font-bold text-[#7B5A50] transition-all shadow-xs active:scale-95"
                >
                  Exact ({{ formatCurrency(total) }})
                </button>
                <button
                  v-if="total < 200"
                  type="button"
                  @click="amountTendered = 200"
                  class="h-7.5 px-2.5 rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] hover:bg-[#F2ECE4] text-xs font-bold text-[#7B5A50] transition-all shadow-xs active:scale-95"
                >
                  ₱200
                </button>
                <button
                  v-if="total < 500"
                  type="button"
                  @click="amountTendered = 500"
                  class="h-7.5 px-2.5 rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] hover:bg-[#F2ECE4] text-xs font-bold text-[#7B5A50] transition-all shadow-xs active:scale-95"
                >
                  ₱500
                </button>
                <button
                  v-if="total < 1000"
                  type="button"
                  @click="amountTendered = 1000"
                  class="h-7.5 px-2.5 rounded-lg bg-[#FAF8F5] border border-[#EAE3D9] hover:bg-[#F2ECE4] text-xs font-bold text-[#7B5A50] transition-all shadow-xs active:scale-95"
                >
                  ₱1,000
                </button>
              </div>

              <!-- Compact & Sleek Change Due / Still Needed Display Banner -->
              <div
                v-if="Number(amountTendered) > 0"
                class="px-3.5 py-2.5 rounded-xl border flex justify-between items-center transition-all shadow-2xs"
                :class="shortBy > 0 ? 'bg-red-50/90 border-red-200 text-red-700' : 'bg-emerald-50/90 border-emerald-300 text-emerald-800'"
                aria-live="polite"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="shortBy > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'"></span>
                  <div>
                    <span class="text-xs font-bold uppercase tracking-wider block leading-tight">
                      {{ shortBy > 0 ? 'Still needed' : 'Change Due' }}
                    </span>
                    <span v-if="shortBy === 0 && changeAmount > 0" class="text-[10px] text-emerald-700 font-semibold block leading-tight">Return to customer</span>
                  </div>
                </div>
                <span class="text-xl sm:text-2xl font-black tabular-nums tracking-tight">
                  {{ formatCurrency(shortBy > 0 ? shortBy : changeAmount) }}
                </span>
              </div>
            </div>

            <!-- Card / E-Wallet Reference Number Input -->
            <label v-else class="block space-y-1.5">
              <span class="block text-xs font-bold text-gray-600 uppercase tracking-wider">Reference number</span>
              <input ref="referenceInput" v-model="referenceNumber" @keydown.enter="completeOrder" type="text" class="w-full h-12 bg-white border-2 border-gray-200 focus:border-[#7B5A50] focus:ring-2 focus:ring-[#7B5A50]/15 text-gray-900 rounded-xl px-4 text-base font-semibold outline-none transition-all shadow-xs" placeholder="From the terminal or app" />
            </label>
          </fieldset>

          <div class="px-5 py-3 border-t border-[#EFECE6] bg-[#FAF8F5] shrink-0">
            <p v-if="checkoutError" role="alert" class="mb-2 p-2 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">{{ checkoutError }}</p>
            <div class="flex gap-2.5">
              <button @click="closePayment" :disabled="isProcessingOrder" class="px-5 h-11 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors disabled:opacity-50">Cancel</button>
              <button
                @click="completeOrder"
                class="flex-1 h-11 bg-[#7B5A50] hover:bg-[#65463D] text-white font-bold rounded-xl text-sm sm:text-base transition-all shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!canCheckout || isProcessingOrder"
              >
                {{ isProcessingOrder ? 'Recording sale...' : `Charge ${formatCurrency(total)}` }}
              </button>
            </div>
            <p v-if="!canCheckout && !isProcessingOrder" class="mt-1.5 text-[11px] sm:text-xs text-gray-500 text-center truncate">{{ checkoutHint }}</p>
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
        @refunded="onTransactionRefunded"
      />

      <!-- ── SPOILAGE ───────────────────────────────────────────────────── -->
      <PosSpoilagePanel
        v-if="isSpoilageOpen"
        :items="menuItems"
        @close="isSpoilageOpen = false"
        @logged="onSpoilageLogged"
      />

      <!-- ── FLOOR PLAN & TABLE RESERVATIONS ───────────────────────────── -->
      <FloorPlanModal
        v-if="isFloorPlanOpen"
        :show="isFloorPlanOpen"
        :branch-name="device?.branch_name"
        @close="isFloorPlanOpen = false"
        @select-table="onTableSelectedFromFloorPlan"
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
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden emil-modal-enter border-0">
          
          <!-- Header Banner with Emil Kowalski Check Animation -->
          <div class="bg-[#7B5A50] text-white text-center py-5 px-6 relative overflow-hidden shrink-0 rounded-t-2xl">
            <!-- Celebratory ambient aura -->
            <div class="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" aria-hidden="true"></div>

            <!-- Emil Kowalski Check Badge Container (Clean, no white border) -->
            <div :key="completedOrderDetails?.receiptNumber || 'receipt-badge'" class="relative w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <!-- Soft spring badge circle with NO white border -->
              <div class="emil-check-badge w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <!-- SVG Animated Checkmark with guaranteed stroke draw and spring pop -->
                <svg class="w-6 h-6 text-white emil-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path
                    d="M4.5 12.75l6 6 9-13.5"
                    class="emil-check-path"
                  />
                </svg>
              </div>
            </div>

            <!-- Staggered Title and Receipt Number -->
            <h2 id="receipt-title" class="text-xl font-bold tracking-tight emil-stagger-1">Payment Successful</h2>
            <p class="text-xs sm:text-sm text-white/80 mt-0.5 emil-stagger-2">Receipt No: <span class="font-mono font-semibold text-white">{{ completedOrderDetails.receiptNumber }}</span></p>
          </div>

          <div class="p-4 sm:p-5 flex-1 bg-[#FAF8F5] overflow-y-auto max-h-[60vh] space-y-3 emil-stagger-3">
            <div class="bg-white border border-[#EAE3D9] rounded-xl p-3.5 shadow-2xs">
              <h3 class="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 border-b border-[#F0EBE3] pb-2">Order Items</h3>
              <div class="space-y-2.5">
                <div v-for="item in completedOrderDetails.items" :key="item.line_key" class="flex justify-between text-xs sm:text-sm">
                  <div class="flex flex-col">
                    <span class="font-bold text-gray-900">{{ item.menu_name }}</span>
                    <span v-if="lineDetails(item)" class="text-[11px] text-gray-500">{{ lineDetails(item) }}</span>
                    <span class="text-[11px] text-gray-400">{{ item.quantity }} x {{ formatCurrency(getItemUnitPrice(item)) }}</span>
                  </div>
                  <span class="font-bold text-gray-700 tabular-nums">{{ formatCurrency(getItemUnitPrice(item) * item.quantity) }}</span>
                </div>
              </div>
            </div>

            <div class="bg-white border border-[#EAE3D9] rounded-xl p-3.5 shadow-2xs">
              <div class="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Items Subtotal</span>
                <span class="tabular-nums font-semibold">{{ formatCurrency(completedOrderDetails.baseItemsTotal) }}</span>
              </div>
              <div v-if="completedOrderDetails.discountAmount > 0" class="flex justify-between text-xs text-red-600 font-semibold mb-1.5">
                <span>Discount ({{ completedOrderDetails.discountType }})</span>
                <span class="tabular-nums">- {{ formatCurrency(completedOrderDetails.discountAmount) }}</span>
              </div>
              <div v-if="completedOrderDetails.discountIdNumber" class="flex justify-between text-[11px] text-gray-500 mb-1.5">
                <span>{{ completedOrderDetails.discountType === 'Senior' ? 'OSCA ID' : (completedOrderDetails.discountType === 'VIP' ? 'VIP Number' : 'PWD ID') }}</span>
                <span class="font-mono font-bold text-[#7B5A50]">{{ completedOrderDetails.discountIdNumber }}</span>
              </div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-bold text-gray-600 uppercase tracking-wide">Total Paid</span>
                <span class="text-xl font-black text-gray-900 tabular-nums">{{ formatCurrency(completedOrderDetails.total) }}</span>
              </div>
              <div class="flex justify-between items-center mb-2 text-xs text-gray-500">
                <span>Payment Method</span>
                <span class="font-bold capitalize text-gray-800">{{ completedOrderDetails.paymentMethod }}</span>
              </div>
              <div class="flex justify-between items-center pt-2.5 border-t border-[#F0EBE3]">
                <span class="text-xs sm:text-sm font-bold text-gray-700">Change</span>
                <span class="text-xl font-black text-emerald-600 tabular-nums">{{ formatCurrency(completedOrderDetails.change) }}</span>
              </div>
            </div>
          </div>

          <div class="p-3.5 border-t border-[#EFECE6] flex gap-2 bg-white shrink-0 emil-stagger-4">
            <button @click="downloadCurrentReceipt" class="emil-btn-press flex-1 bg-white border border-[#D6C5B8] hover:bg-[#FBF7F2] text-[#2d201b] font-bold rounded-xl py-2.5 text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-2xs">
              <Icon name="heroicons:arrow-down-tray" class="w-4 h-4 text-[#7B5A50]" /> Download
            </button>
            <button @click="printReceipt" class="emil-btn-press flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl py-2.5 text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-2xs">
              <Icon name="heroicons:printer" class="w-4 h-4 text-gray-600" /> Print
            </button>
            <button @click="closeReceipt" class="emil-btn-press flex-1 bg-[#7B5A50] hover:bg-[#65463D] text-white font-bold rounded-xl py-2.5 text-xs sm:text-sm transition-all shadow-sm">
              Next order
            </button>
          </div>

        </div>
      </div>
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


.emil-modal-enter {
  transform-origin: center;
  animation: emil-modal-pop 250ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
}
@keyframes emil-modal-pop {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(6px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Checkmark badge: spring pop with physical overshoot */
.emil-check-badge {
  transform-origin: center;
  animation: emil-badge-pop 440ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes emil-badge-pop {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  65% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Check icon spring pop */
.emil-check-icon {
  transform-origin: center;
  animation: emil-icon-spring 420ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms both;
}
@keyframes emil-icon-spring {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  65% {
    opacity: 1;
    transform: scale(1.15);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Checkmark SVG stroke draw: draws complete Heroicons check cleanly */
.emil-check-path {
  stroke-dasharray: 40;
  stroke-dashoffset: 0;
  animation: emil-check-draw 380ms cubic-bezier(0.65, 0, 0.35, 1) 120ms both;
}
@keyframes emil-check-draw {
  0% {
    stroke-dashoffset: 40;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

/* Content Stagger (30-80ms intervals) */
.emil-stagger-1 {
  animation: emil-stagger-fade 240ms cubic-bezier(0.23, 1, 0.32, 1) 150ms both;
}
.emil-stagger-2 {
  animation: emil-stagger-fade 240ms cubic-bezier(0.23, 1, 0.32, 1) 210ms both;
}
.emil-stagger-3 {
  animation: emil-stagger-fade 260ms cubic-bezier(0.23, 1, 0.32, 1) 270ms both;
}
.emil-stagger-4 {
  animation: emil-stagger-fade 260ms cubic-bezier(0.23, 1, 0.32, 1) 330ms both;
}
@keyframes emil-stagger-fade {
  0% {
    opacity: 0;
    transform: translateY(6px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Button tactile press feedback */
.emil-btn-press {
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms cubic-bezier(0.23, 1, 0.32, 1);
}
.emil-btn-press:active {
  transform: scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .modal-pop,
  .emil-modal-enter,
  .emil-check-badge,
  .emil-check-icon,
  .emil-check-path,
  .emil-stagger-1,
  .emil-stagger-2,
  .emil-stagger-3,
  .emil-stagger-4 {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
    stroke-dashoffset: 0 !important;
  }
  .emil-btn-press {
    transition: none !important;
  }
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
