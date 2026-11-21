<!-- app/components/pos/PosQrModal.vue -->
<!-- POS QR Code Modal: Generation for Owner, View-Only for Manager, Print-Ready PDF for Both -->
<!-- Emil Kowalski Craft: Compact Pop-up Modal, Fixed Proportions, Absolutely Zero Scrolling, No Overlap -->
<script setup lang="ts">
import { jsPDF } from 'jspdf'

const props = defineProps<{
  show: boolean
  scope: 'owner' | 'manager'
  branchUuid?: string
  branchName?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Default Configuration
const DEFAULT_URL = 'https://brewspotph.online/pos'
const DEFAULT_TITLE = 'BrewSpot POS Register'
const DEFAULT_SUBTITLE = 'Scan with camera to launch POS'

// Form State
const posUrl = DEFAULT_URL
const qrTitle = ref(DEFAULT_TITLE)
const qrSubtitle = ref(DEFAULT_SUBTITLE)
const copiedLink = ref(false)
const isGeneratingPdf = ref(false)
let copyTimer: any = null

// Storage key scoped to branch if provided
const storageKey = computed(() => `brewspot_pos_qr_${props.branchUuid || 'global'}`)

// Load persisted configuration from localStorage
function loadSavedConfig() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (raw) {
      const parsed = JSON.parse(raw)
      qrTitle.value = parsed.title || (props.branchName ? `${props.branchName} POS` : DEFAULT_TITLE)
      qrSubtitle.value = parsed.subtitle || DEFAULT_SUBTITLE
      return
    }
  } catch {
    // fallback to defaults
  }
  if (props.branchName) {
    qrTitle.value = `${props.branchName} POS Register`
  }
}

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    loadSavedConfig()
    copiedLink.value = false
  }
})

// Teleport & keyboard listeners
const isMounted = ref(false)
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.show) {
    emit('close')
  }
}

onMounted(() => {
  isMounted.value = true
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown)
  }
})

// Owner: Save / Regenerate QR configuration
const isSaved = ref(false)
function saveAndRegenerate() {
  if (props.scope !== 'owner') return
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(storageKey.value, JSON.stringify({
        url: DEFAULT_URL,
        title: qrTitle.value.trim() || DEFAULT_TITLE,
        subtitle: qrSubtitle.value.trim() || DEFAULT_SUBTITLE,
        updatedAt: new Date().toISOString()
      }))
      isSaved.value = true
      setTimeout(() => { isSaved.value = false }, 2500)
    } catch {
      // storage unavailable
    }
  }
}

// Online QR Generator Image URL (via api.qrserver.com, 0 backend edits, 0 downloads)
const qrCodeImageUrl = computed(() => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(DEFAULT_URL)}&margin=10`
})

// 1-Tap Copy POS Link
function copyPosUrl() {
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(DEFAULT_URL).then(() => {
      copiedLink.value = true
      clearTimeout(copyTimer)
      copyTimer = setTimeout(() => { copiedLink.value = false }, 2000)
    }).catch(() => {})
  }
}

// Convert image URL to Data URL via canvas/blob for jsPDF embedding
async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Ready-to-Print PDF Generation (Both Owner & Manager)
async function downloadPrintReadyPdf() {
  if (isGeneratingPdf.value) return
  isGeneratingPdf.value = true
  try {
    const qrDataUrl = await toDataUrl(qrCodeImageUrl.value)
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const pageWidth = 210
    const pageHeight = 297

    // Outer Decorative Double Border
    doc.setDrawColor(214, 197, 184) // #D6C5B8
    doc.setLineWidth(0.8)
    doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 6, 6, 'S')

    doc.setDrawColor(240, 230, 220)
    doc.setLineWidth(0.3)
    doc.roundedRect(15, 15, pageWidth - 30, pageHeight - 30, 4, 4, 'S')

    // Top Category Pill
    doc.setFillColor(250, 244, 237)
    doc.roundedRect(70, 24, 70, 8, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(125, 90, 80)
    doc.text('POINT OF SALE TERMINAL', 105, 29.5, { align: 'center' })

    // Cafe / Terminal Heading
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(45, 32, 27)
    const titleText = qrTitle.value || 'BrewSpot POS Register'
    doc.text(titleText, 105, 43, { align: 'center' })

    // Subtitle
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(125, 90, 80)
    const subText = qrSubtitle.value || 'Scan with camera on any tablet or smartphone to launch POS'
    doc.text(subText, 105, 51, { align: 'center' })

    // Separator line
    doc.setDrawColor(230, 215, 202)
    doc.setLineWidth(0.5)
    doc.line(45, 58, 165, 58)

    // Center QR Card Frame
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(200, 180, 165)
    doc.setLineWidth(0.8)
    doc.roundedRect(45, 68, 120, 120, 6, 6, 'FD')

    // Embed High-Res QR Code Image
    doc.addImage(qrDataUrl, 'PNG', 53, 76, 104, 104)

    // Viewfinder Corner Accents
    doc.setDrawColor(123, 90, 80) // #7B5A50
    doc.setLineWidth(1.5)
    // Top-left
    doc.line(49, 72, 57, 72)
    doc.line(49, 72, 49, 80)
    // Top-right
    doc.line(161, 72, 153, 72)
    doc.line(161, 72, 161, 80)
    // Bottom-left
    doc.line(49, 184, 57, 184)
    doc.line(49, 184, 49, 176)
    // Bottom-right
    doc.line(161, 184, 153, 184)
    doc.line(161, 184, 161, 176)

    // Clean URL Card
    doc.setFillColor(250, 244, 237)
    doc.setDrawColor(220, 205, 192)
    doc.setLineWidth(0.4)
    doc.roundedRect(35, 198, 140, 14, 3, 3, 'FD')

    doc.setFont('courier', 'bold')
    doc.setFontSize(11.5)
    doc.setTextColor(45, 32, 27)
    doc.text(DEFAULT_URL, 105, 207, { align: 'center' })

    // Instructions Box
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(230, 220, 210)
    doc.setLineWidth(0.3)
    doc.roundedRect(30, 220, 150, 32, 4, 4, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(125, 90, 80)
    doc.text('CASHIER SETUP INSTRUCTIONS', 105, 227, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(70, 50, 40)
    doc.text('1. Open the camera app on an iPad, Android tablet, or smartphone.', 38, 234)
    doc.text('2. Scan the QR code or navigate directly to the URL shown above.', 38, 240)
    doc.text('3. Sign in as Manager/Owner to link the register, or enter Staff PIN.', 38, 246)

    // Footer
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(160, 140, 130)
    doc.text('BrewSpot POS System · Ready to print and place on counter standee', 105, 268, { align: 'center' })
    doc.text(`Document generated on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, 105, 273, { align: 'center' })

    const fileName = `BrewSpot-POS-QR-${(titleText).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
    doc.save(fileName)
  } catch (err) {
    console.error('Failed to create PDF:', err)
  } finally {
    isGeneratingPdf.value = false
  }
}

// Download raw PNG QR image
async function downloadQrImage() {
  try {
    const res = await fetch(qrCodeImageUrl.value)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BrewSpot-POS-QR.png`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    window.open(qrCodeImageUrl.value, '_blank')
  }
}
</script>

<template>
  <Teleport to="body" v-if="isMounted">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-qr-title"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm print:hidden overflow-hidden"
        @click.self="emit('close')"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <!-- Crisp pop-up modal: 100% non-scrollable, perfectly centered, no bottom overlap -->
          <div
            v-if="show"
            class="relative w-full max-w-[640px] bg-white rounded-2xl shadow-2xl modal-pop border border-[#EAE3D9] overflow-hidden flex flex-col my-auto"
          >
      <!-- Modal Header -->
      <div class="px-5 py-3 border-b border-[#EFECE6] bg-[#FAF8F5] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-[#7B5A50]/10 flex items-center justify-center text-[#7B5A50] shrink-0">
            <Icon name="heroicons:qr-code" class="w-4 h-4" />
          </div>
          <h3 id="pos-qr-title" class="font-bold text-sm text-[#2D201B] truncate">
            {{ scope === 'owner' ? 'POS QR Code Generator' : 'POS Terminal QR Code' }}
          </h3>
          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
            :class="scope === 'owner' ? 'bg-[#7B5A50]/15 text-[#7B5A50]' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'"
          >
            {{ scope === 'owner' ? 'Owner' : 'Manager' }}
          </span>
        </div>

        <button
          type="button"
          @click="emit('close')"
          aria-label="Close"
          class="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all cursor-pointer active:scale-90"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>

      <!-- Body: 2 Columns Side by Side (Always side by side, perfectly fitted, NO scrollbars) -->
      <div class="p-4 sm:p-5 grid grid-cols-[200px_1fr] sm:grid-cols-[220px_1fr] gap-4 sm:gap-5 items-stretch bg-white">
        <!-- LEFT: QR Code Frame & Quick Image Actions -->
        <div class="p-3 bg-[#FAF8F5] border border-[#EAE3D9] rounded-xl flex flex-col items-center justify-between text-center shadow-2xs">
          <!-- QR Frame -->
          <div class="relative p-2 bg-white rounded-lg border border-gray-200 shadow-2xs">
            <img
              :src="qrCodeImageUrl"
              alt="BrewSpot POS QR Code"
              class="w-36 h-36 sm:w-40 sm:h-40 object-contain block mx-auto select-none"
              loading="eager"
            />
            <!-- Visual Corner Viewfinder Accents -->
            <div class="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#7B5A50] rounded-tl pointer-events-none"></div>
            <div class="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#7B5A50] rounded-tr pointer-events-none"></div>
            <div class="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#7B5A50] rounded-bl pointer-events-none"></div>
            <div class="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#7B5A50] rounded-br pointer-events-none"></div>
          </div>

          <p class="font-bold text-xs text-[#2D201B] truncate max-w-full mt-1.5">{{ qrTitle }}</p>

          <!-- Buttons under QR -->
          <div class="w-full flex items-center justify-center gap-1.5 pt-2 border-t border-[#EAE3D9]/60">
            <button
              type="button"
              @click="downloadQrImage"
              title="Save PNG image"
              class="flex-1 h-7 px-2 bg-white hover:bg-[#F3EBE2] border border-[#D8CEBE] text-[#2D201B] font-bold rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 active:scale-95 shadow-2xs cursor-pointer"
            >
              <Icon name="heroicons:arrow-down-tray" class="w-3 h-3 text-[#7B5A50]" />
              <span>PNG</span>
            </button>
            <a
              :href="posUrl"
              target="_blank"
              rel="noopener noreferrer"
              title="Open link in new tab"
              class="flex-1 h-7 px-2 bg-white hover:bg-[#F3EBE2] border border-[#D8CEBE] text-[#2D201B] font-bold rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 active:scale-95 shadow-2xs cursor-pointer"
            >
              <Icon name="heroicons:arrow-top-right-on-square" class="w-3 h-3 text-[#7B5A50]" />
              <span>Open</span>
            </a>
          </div>
        </div>

        <!-- RIGHT: Settings/Details & Download PDF -->
        <div class="flex flex-col justify-between space-y-2.5">
          <!-- OWNER SETTINGS -->
          <div v-if="scope === 'owner'" class="p-3 bg-[#FAF8F5] border border-[#EAE3D9] rounded-xl space-y-2 shadow-2xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-[#7B5A50] uppercase tracking-wider flex items-center gap-1">
                <Icon name="heroicons:cog-6-tooth" class="w-3.5 h-3.5" />
                <span>QR Settings</span>
              </span>
              <button
                type="button"
                @click="saveAndRegenerate"
                class="h-6 px-2.5 bg-[#7B5A50] hover:bg-[#65463D] text-white text-[11px] font-bold rounded-md transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <Icon name="heroicons:check" class="w-3 h-3" />
                <span>{{ isSaved ? 'Saved!' : 'Save' }}</span>
              </button>
            </div>

            <!-- Target URL (Fixed / Non-editable) -->
            <div>
              <div class="flex items-center justify-between mb-0.5">
                <label for="pos-url-input" class="block text-[11px] font-bold text-gray-600">
                  Target URL
                </label>
                <span class="text-[9px] font-bold uppercase tracking-wider text-[#7B5A50] bg-[#7B5A50]/10 px-1.5 py-0.5 rounded">
                  Fixed
                </span>
              </div>
              <div class="relative flex items-center">
                <input
                  id="pos-url-input"
                  :value="DEFAULT_URL"
                  type="text"
                  readonly
                  tabindex="-1"
                  class="w-full h-7.5 bg-[#F4EFEB] border border-[#D8CEBE] text-[#5C453C] rounded-lg pl-2 pr-7 text-xs font-mono outline-none shadow-2xs cursor-not-allowed select-all"
                />
                <Icon name="heroicons:lock-closed" class="w-3.5 h-3.5 text-[#8A6E64] absolute right-2 pointer-events-none" />
              </div>
            </div>

            <!-- Title Input -->
            <div>
              <label for="pos-title-input" class="block text-[11px] font-bold text-gray-600 mb-0.5">
                Print Title
              </label>
              <input
                id="pos-title-input"
                v-model="qrTitle"
                type="text"
                placeholder="Terminal name"
                class="w-full h-7.5 bg-white border border-[#D8CEBE] focus:border-[#7B5A50] text-[#2D201B] rounded-lg px-2 text-xs outline-none shadow-2xs"
              />
            </div>
          </div>

          <!-- MANAGER DETAILS -->
          <div v-else class="p-3 bg-[#FAF8F5] border border-[#EAE3D9] rounded-xl space-y-2 shadow-2xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-[#7B5A50] uppercase tracking-wider flex items-center gap-1">
                <Icon name="heroicons:information-circle" class="w-3.5 h-3.5" />
                <span>Terminal Access</span>
              </span>
              <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                Active
              </span>
            </div>

            <p class="text-xs text-gray-600 leading-snug">
              Configured by Owner. Point tablet or smartphone camera at the QR code to open the register.
            </p>

            <div class="text-[11px] text-gray-500 space-y-1 pt-1 border-t border-[#EAE3D9]">
              <p>• Point camera & scan QR code</p>
              <p>• Opens <strong>brewspotph.online/pos</strong></p>
              <p>• Cashier unlocks with PIN</p>
            </div>
          </div>

          <!-- URL Pill with 1-tap Copy -->
          <div class="p-1.5 bg-[#FAF8F5] border border-[#EAE3D9] rounded-xl flex items-center justify-between gap-1.5 shadow-2xs">
            <div class="flex items-center gap-1 min-w-0 pl-1">
              <Icon name="heroicons:link" class="w-3.5 h-3.5 text-[#7B5A50] shrink-0" />
              <span class="font-mono text-xs font-semibold text-[#2D201B] truncate select-all">{{ posUrl }}</span>
            </div>
            <button
              type="button"
              @click="copyPosUrl"
              class="h-6.5 px-2 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
              :class="copiedLink ? 'bg-emerald-600 text-white' : 'bg-[#7B5A50] hover:bg-[#65463D] text-white'"
            >
              <Icon :name="copiedLink ? 'heroicons:check' : 'heroicons:clipboard-document'" class="w-3 h-3" />
              <span>{{ copiedLink ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>

          <!-- PRIMARY ACTION: Print-Ready PDF Button -->
          <button
            type="button"
            @click="downloadPrintReadyPdf"
            :disabled="isGeneratingPdf"
            class="w-full h-10 bg-[#7B5A50] hover:bg-[#65463D] disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Icon v-if="isGeneratingPdf" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            <Icon v-else name="heroicons:document-arrow-down" class="w-4 h-4" />
            <span>{{ isGeneratingPdf ? 'Generating PDF...' : 'Download PDF (Print Ready)' }}</span>
          </button>
        </div>
      </div>
    </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
