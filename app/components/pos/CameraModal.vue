<script setup lang="ts">
const props = withDefaults(defineProps<{
  show?: boolean
  isOpen?: boolean
  title?: string
}>(), {
  show: false,
  isOpen: false,
  title: 'Scan or Capture ID'
})

const isVisible = computed(() => props.show || props.isOpen)

const emit = defineEmits<{
  close: []
  captured: [dataUrl: string]
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)
const error = ref('')
const loading = ref(true)
const facingMode = ref<'environment' | 'user'>('environment')
const hasMultipleCameras = ref(false)
const shutterEffect = ref(false)
const fallbackInputRef = ref<HTMLInputElement | null>(null)

async function startCamera() {
  stopCamera()
  loading.value = true
  error.value = ''

  if (!navigator?.mediaDevices?.getUserMedia) {
    error.value = 'Camera is not supported on this browser. Please upload a photo instead.'
    loading.value = false
    return
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoInputs = devices.filter(d => d.kind === 'videoinput')
    hasMultipleCameras.value = videoInputs.length > 1

    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facingMode.value,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })

    stream.value = mediaStream
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      await videoRef.value.play().catch(() => {})
    }
  } catch (err: any) {
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      error.value = 'Camera permission was denied. Please allow camera access in your browser or choose Upload.'
    } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
      error.value = 'No camera found on this device. Please upload a photo instead.'
    } else {
      error.value = err?.message || 'Could not start camera.'
    }
  } finally {
    loading.value = false
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
    stream.value = null
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
}

function toggleFacingMode() {
  facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
  startCamera()
}

function capture() {
  if (!videoRef.value || loading.value || !!error.value) return

  const video = videoRef.value
  const canvas = document.createElement('canvas')
  const width = video.videoWidth || 640
  const height = video.videoHeight || 480

  // Cap max resolution to 1280 max dimension to keep payload fast and sharp
  const maxDim = 1280
  const scale = Math.min(1, maxDim / Math.max(width, height))
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  shutterEffect.value = true
  setTimeout(() => { shutterEffect.value = false }, 180)

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

  stopCamera()
  emit('captured', dataUrl)
  emit('close')
}

function triggerFallbackUpload() {
  fallbackInputRef.value?.click()
}

function onFallbackFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target?.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const rawUrl = e.target?.result as string
    if (rawUrl) {
      stopCamera()
      emit('captured', rawUrl)
      emit('close')
    }
  }
  reader.readAsDataURL(file)
}

watch(isVisible, (newVal) => {
  if (newVal) {
    nextTick(() => { startCamera() })
  } else {
    stopCamera()
  }
}, { immediate: true })

onUnmounted(() => {
  stopCamera()
})
</script>

<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs"
    role="dialog"
    aria-modal="true"
    aria-labelledby="camera-modal-title"
  >
    <div class="relative w-full max-w-lg bg-[#2D201B] border border-[#523C34] text-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      <!-- Header -->
      <div class="px-5 py-3.5 border-b border-[#44312A] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon name="heroicons:camera" class="w-5 h-5 text-[#EADFD3]" />
          <h3 id="camera-modal-title" class="font-display text-base font-semibold text-[#F7F1EA]">
            {{ title }}
          </h3>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="w-9 h-9 rounded-full hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Close camera"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Viewfinder -->
      <div class="relative bg-black aspect-4/3 flex items-center justify-center overflow-hidden">
        <video
          ref="videoRef"
          autoplay
          playsinline
          muted
          class="w-full h-full object-cover"
          :class="{ 'opacity-0': loading || !!error }"
        />

        <!-- Flash shutter animation -->
        <div
          v-if="shutterEffect"
          class="absolute inset-0 bg-white pointer-events-none transition-opacity duration-150"
        />

        <!-- Framing guideline box -->
        <div v-if="!loading && !error" class="absolute inset-6 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
          <div class="flex justify-between text-[11px] font-bold text-white/80 uppercase tracking-widest">
            <span>ID Card Frame</span>
            <span>Align clearly</span>
          </div>
          <div class="text-center text-xs font-semibold text-white/80 bg-black/40 py-1 px-3 rounded-full mx-auto backdrop-blur-xs">
            Hold card flat inside the borders
          </div>
        </div>

        <!-- Loading spinner -->
        <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
          <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-[#D6C5B8]" />
          <span class="text-xs font-medium">Opening camera...</span>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-[#231814] space-y-3">
          <Icon name="heroicons:exclamation-triangle" class="w-10 h-10 text-amber-500" />
          <p class="text-sm font-semibold text-gray-200 max-w-xs">{{ error }}</p>
          <div class="flex gap-2 pt-2">
            <button
              type="button"
              @click="triggerFallbackUpload"
              class="h-10 px-4 rounded-lg bg-[#7B5A50] hover:bg-[#65463D] text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Icon name="heroicons:arrow-up-tray" class="w-4 h-4" />
              Upload from file
            </button>
            <button
              type="button"
              @click="startCamera"
              class="h-10 px-3 rounded-lg border border-[#6B5048] text-xs font-semibold text-gray-200 hover:bg-white/5 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>

      <!-- Hidden file input for fallback -->
      <input
        ref="fallbackInputRef"
        type="file"
        accept="image/*"
        class="sr-only"
        @change="onFallbackFileSelected"
      />

      <!-- Controls -->
      <div class="p-4 bg-[#231814] border-t border-[#44312A] flex items-center justify-between">
        <button
          v-if="hasMultipleCameras"
          type="button"
          @click="toggleFacingMode"
          :disabled="loading || !!error"
          class="h-10 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40"
          title="Switch camera"
        >
          <Icon name="heroicons:arrow-path" class="w-4 h-4" />
          <span>Flip</span>
        </button>
        <button
          v-else
          type="button"
          @click="triggerFallbackUpload"
          class="h-10 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-gray-200 flex items-center gap-1.5 transition-colors"
          title="Upload file instead"
        >
          <Icon name="heroicons:photo" class="w-4 h-4" />
          <span>Upload</span>
        </button>

        <!-- Capture Trigger Button -->
        <button
          type="button"
          @click="capture"
          :disabled="loading || !!error"
          class="h-14 px-7 rounded-full bg-white hover:bg-gray-100 text-[#2D201B] font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <div class="w-5 h-5 rounded-full border-2 border-[#2D201B] flex items-center justify-center">
            <div class="w-2.5 h-2.5 rounded-full bg-[#2D201B]" />
          </div>
          <span>Take Snapshot</span>
        </button>

        <button
          type="button"
          @click="emit('close')"
          class="h-10 px-3 rounded-lg text-xs font-semibold text-gray-300 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
