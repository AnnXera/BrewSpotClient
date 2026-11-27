<!-- app/components/pos/PosQrModal.vue -->
<!-- POS QR Code Modal: Owner edits the print title, Manager views. Both can copy the link, save a PNG or a print-ready PDF.
     Laid out like the owner add/edit modals (EditBranchContactModal): header, scrolling body, footer actions. -->
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
}, { immediate: true })

// Escape closes, except while the PDF is being made
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.show && !isGeneratingPdf.value) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

function close() {
  if (!isGeneratingPdf.value) emit('close')
}

function selectAll(e: FocusEvent) {
  (e.target as HTMLInputElement).select()
}

function savePng() {
  persistTitle()
  downloadQrImage()
}

// Owner: the print title is remembered per branch (on blur and whenever a file is made), no separate Save step.
function persistTitle() {
  if (props.scope !== 'owner' || typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey.value, JSON.stringify({
      url: DEFAULT_URL,
      title: qrTitle.value.trim() || DEFAULT_TITLE,
      subtitle: qrSubtitle.value.trim() || DEFAULT_SUBTITLE,
      updatedAt: new Date().toISOString()
    }))
  } catch {
    // storage unavailable
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
  persistTitle()
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
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-6 print:hidden">
      <div class="fixed inset-0 bg-black/45 backdrop-blur-sm" aria-hidden="true" @click="close" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-qr-title"
        class="relative bg-white rounded-3xl w-full max-w-[520px] max-h-[calc(100dvh-1.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4]"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-[#EEDFC4] bg-[#FDFBF7] rounded-t-3xl">
          <div class="flex items-center gap-4 min-w-0">
            <div class="w-11 h-11 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0">
              <Icon name="heroicons:qr-code" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h2 id="pos-qr-title" class="text-xl font-display font-extrabold text-[#3B1F0E]">POS Register QR Code</h2>
              <p class="mt-0.5 text-[13px] text-[#8A6E64] truncate">
                {{ branchName || 'Print it for the counter so staff can open the register' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            :disabled="isGeneratingPdf"
            class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            @click="close"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          <!-- QR preview -->
          <div class="flex items-center gap-4">
            <div class="relative shrink-0 rounded-2xl bg-white border border-[#EDD8CC] p-2">
              <img
                :src="qrCodeImageUrl"
                :alt="`QR code that opens ${posUrl}`"
                class="block size-[120px] select-none object-contain"
                loading="eager"
              >
              <span class="pointer-events-none absolute left-1 top-1 size-3 rounded-tl border-l-2 border-t-2 border-[#7D5A50]" />
              <span class="pointer-events-none absolute right-1 top-1 size-3 rounded-tr border-r-2 border-t-2 border-[#7D5A50]" />
              <span class="pointer-events-none absolute bottom-1 left-1 size-3 rounded-bl border-b-2 border-l-2 border-[#7D5A50]" />
              <span class="pointer-events-none absolute bottom-1 right-1 size-3 rounded-br border-b-2 border-r-2 border-[#7D5A50]" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold text-[#3B1F0E]">Printed as</p>
              <p class="mt-0.5 font-display text-base font-bold text-[#3B1F0E] truncate" :title="qrTitle">{{ qrTitle || DEFAULT_TITLE }}</p>
              <p class="mt-1 text-[12px] leading-snug text-[#8A6E64]">
                Staff scan it on a tablet or phone. An owner or manager links the device once, then cashiers unlock with their PIN.
              </p>
            </div>
          </div>

          <!-- Register link -->
          <div>
            <label for="pos-qr-link" class="block text-xs font-bold text-[#3B1F0E] mb-1">Register link</label>
            <div class="flex gap-2">
              <div class="relative min-w-0 flex-1">
                <input
                  id="pos-qr-link"
                  :value="posUrl"
                  type="text"
                  readonly
                  class="w-full h-11 rounded-xl border border-[#D8C7B5] bg-[#FAF4ED] pl-3.5 pr-9 text-sm font-semibold text-[#5B463C] outline-none shadow-2xs focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15"
                  @focus="selectAll"
                >
                <Icon name="heroicons:lock-closed" class="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#A8988B] pointer-events-none" />
              </div>
              <button
                type="button"
                class="h-11 px-3.5 rounded-xl border text-sm font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                :class="copiedLink ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-[#DED4CA] bg-white text-[#5B463C] hover:bg-[#F8EFE7]'"
                @click="copyPosUrl"
              >
                <Icon :name="copiedLink ? 'heroicons:check' : 'heroicons:clipboard-document'" class="size-4" />
                {{ copiedLink ? 'Copied' : 'Copy' }}
              </button>
              <a
                :href="posUrl"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open register in a new tab"
                title="Open register in a new tab"
                class="h-11 w-11 rounded-xl border border-[#DED4CA] bg-white text-[#5B463C] hover:bg-[#F8EFE7] inline-flex items-center justify-center shrink-0"
              >
                <Icon name="heroicons:arrow-top-right-on-square" class="size-4" />
              </a>
            </div>
          </div>

          <!-- Owner: print title -->
          <div v-if="scope === 'owner'">
            <label for="pos-qr-title-input" class="block text-xs font-bold text-[#3B1F0E] mb-1">Print title</label>
            <input
              id="pos-qr-title-input"
              v-model="qrTitle"
              type="text"
              maxlength="60"
              :placeholder="DEFAULT_TITLE"
              class="w-full h-11 rounded-xl border border-[#D8C7B5] bg-white px-3.5 text-sm font-semibold text-[#2D201B] outline-none transition-all shadow-2xs placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15"
              @blur="persistTitle"
            >
            <p class="mt-1.5 text-[11px] text-[#9E7060]">Shown above the QR code on the printed sheet, e.g. the branch or counter name.</p>
          </div>

          <p class="rounded-xl bg-[#FAF4ED] border border-[#EDD8CC] px-3.5 py-2.5 text-xs text-[#6B4A3A] flex items-start gap-2">
            <Icon name="heroicons:information-circle" class="w-4 h-4 shrink-0 mt-px text-[#A96746]" />
            <span v-if="scope === 'owner'">The PDF is an A4 sheet with the QR code, link and setup steps, ready for a counter standee.</span>
            <span v-else>Set up by the cafe owner. Download the PDF to print it for the counter.</span>
          </p>
        </div>

        <!-- Footer -->
        <div class="flex flex-wrap items-center justify-end gap-2 px-6 py-4 border-t border-[#EEDFC4]">
          <button
            type="button"
            :disabled="isGeneratingPdf"
            class="px-4 py-2.5 rounded-xl border border-[#DED4CA] bg-white text-sm font-semibold text-[#5B463C] hover:bg-[#F8EFE7] inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            @click="savePng"
          >
            <Icon name="heroicons:photo" class="size-4" />
            Save PNG
          </button>
          <button
            type="button"
            :disabled="isGeneratingPdf"
            class="px-4 py-2.5 rounded-xl bg-[#7D5A50] text-sm font-bold text-[#FFF8EA] hover:bg-[#6A4A41] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 cursor-pointer"
            @click="downloadPrintReadyPdf"
          >
            <Icon v-if="isGeneratingPdf" name="heroicons:arrow-path" class="size-4 animate-spin" />
            <Icon v-else name="heroicons:document-arrow-down" class="size-4" />
            <span>{{ isGeneratingPdf ? 'Making PDF...' : 'Download PDF' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
