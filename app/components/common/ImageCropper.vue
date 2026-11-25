<script setup lang="ts">
// Crop / adjust dialog for an uploaded picture. The owner drags to reposition, zooms with
// the slider (or mouse wheel / + and - keys) and can rotate in 90 degree steps. On "Apply"
// the visible frame is drawn to a canvas and returned as a new File; the original is untouched.
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  show: boolean
  file: File | null
  aspect?: number // width / height of the crop frame
  maxOutputWidth?: number
  title?: string
}>(), {
  aspect: 4 / 3,
  maxOutputWidth: 1200,
  title: 'Adjust Picture',
})

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'apply', file: File): void
}>()

const MAX_ZOOM = 4

const viewport = ref<HTMLElement | null>(null)
const imgEl = ref<HTMLImageElement | null>(null)
const src = ref<string | null>(null)
const natural = ref({ w: 0, h: 0 })
const box = ref({ w: 0, h: 0 })
const zoom = ref(1)
const rotation = ref(0) // 0, 90, 180, 270
const offset = ref({ x: 0, y: 0 }) // image centre relative to frame centre, in CSS px
const isApplying = ref(false)

const rotated = computed(() => {
  const sideways = rotation.value % 180 !== 0
  return sideways
    ? { w: natural.value.h, h: natural.value.w }
    : { w: natural.value.w, h: natural.value.h }
})

// Smallest scale that still covers the whole frame, so there is never an empty edge
const baseScale = computed(() => {
  if (!rotated.value.w || !box.value.w) return 1
  return Math.max(box.value.w / rotated.value.w, box.value.h / rotated.value.h)
})
const scale = computed(() => baseScale.value * zoom.value)

const clampOffset = () => {
  const maxX = Math.max(0, (rotated.value.w * scale.value - box.value.w) / 2)
  const maxY = Math.max(0, (rotated.value.h * scale.value - box.value.h) / 2)
  offset.value = {
    x: Math.min(maxX, Math.max(-maxX, offset.value.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.value.y)),
  }
}

const imgStyle = computed(() => ({
  width: `${natural.value.w * scale.value}px`,
  height: `${natural.value.h * scale.value}px`,
  transform: `translate(-50%, -50%) translate(${offset.value.x}px, ${offset.value.y}px) rotate(${rotation.value}deg)`,
}))

let resizeObserver: ResizeObserver | null = null

const measure = () => {
  if (!viewport.value) return
  const r = viewport.value.getBoundingClientRect()
  box.value = { w: r.width, h: r.height }
  clampOffset()
}

const reset = () => {
  zoom.value = 1
  rotation.value = 0
  offset.value = { x: 0, y: 0 }
}

watch(() => [props.show, props.file] as const, async ([show, file]) => {
  if (src.value) URL.revokeObjectURL(src.value)
  src.value = null
  natural.value = { w: 0, h: 0 }
  reset()
  if (!show || !file) {
    resizeObserver?.disconnect()
    return
  }
  src.value = URL.createObjectURL(file)
  await nextTick()
  if (viewport.value) {
    resizeObserver?.disconnect()
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(viewport.value)
    measure()
    viewport.value.focus({ preventScroll: true })
  }
}, { immediate: true })

const onImageLoad = () => {
  if (!imgEl.value) return
  natural.value = { w: imgEl.value.naturalWidth, h: imgEl.value.naturalHeight }
  clampOffset()
}

// Zoom keeps the point under the frame centre in place
const setZoom = (next: number) => {
  const z = Math.min(MAX_ZOOM, Math.max(1, next))
  const ratio = z / zoom.value
  offset.value = { x: offset.value.x * ratio, y: offset.value.y * ratio }
  zoom.value = z
  clampOffset()
}

const rotate = () => {
  rotation.value = (rotation.value + 90) % 360
  offset.value = { x: 0, y: 0 }
  clampOffset()
}

// Dragging
let drag: { id: number, startX: number, startY: number, ox: number, oy: number } | null = null
const isDragging = ref(false)

const onPointerDown = (e: PointerEvent) => {
  if (e.button !== 0) return
  drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, ox: offset.value.x, oy: offset.value.y }
  isDragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
const onPointerMove = (e: PointerEvent) => {
  if (!drag || drag.id !== e.pointerId) return
  offset.value = { x: drag.ox + e.clientX - drag.startX, y: drag.oy + e.clientY - drag.startY }
  clampOffset()
}
const onPointerUp = (e: PointerEvent) => {
  if (!drag || drag.id !== e.pointerId) return
  drag = null
  isDragging.value = false
}

const onWheel = (e: WheelEvent) => {
  setZoom(zoom.value * (e.deltaY < 0 ? 1.08 : 1 / 1.08))
}

const onKeydown = (e: KeyboardEvent) => {
  const step = e.shiftKey ? 40 : 10
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step],
  }
  if (moves[e.key]) {
    e.preventDefault()
    offset.value = { x: offset.value.x + moves[e.key]![0], y: offset.value.y + moves[e.key]![1] }
    clampOffset()
  } else if (e.key === '+' || e.key === '=') {
    e.preventDefault()
    setZoom(zoom.value + 0.1)
  } else if (e.key === '-' || e.key === '_') {
    e.preventDefault()
    setZoom(zoom.value - 0.1)
  }
}

const apply = async () => {
  if (!props.file || !imgEl.value || !natural.value.w || !box.value.w) return
  isApplying.value = true
  try {
    // Output resolution follows the source pixels inside the frame, capped at maxOutputWidth
    const outW = Math.max(1, Math.round(Math.min(props.maxOutputWidth, box.value.w / scale.value)))
    const outH = Math.max(1, Math.round(outW / props.aspect))
    const k = outW / box.value.w

    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const keepsAlpha = props.file.type === 'image/png' || props.file.type === 'image/webp'
    const type = keepsAlpha ? props.file.type : 'image/jpeg'
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, outW, outH)
    }
    ctx.imageSmoothingQuality = 'high'
    ctx.translate(outW / 2 + offset.value.x * k, outH / 2 + offset.value.y * k)
    ctx.rotate((rotation.value * Math.PI) / 180)
    const dw = natural.value.w * scale.value * k
    const dh = natural.value.h * scale.value * k
    ctx.drawImage(imgEl.value, -dw / 2, -dh / 2, dw, dh)

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.9))
    if (!blob) return
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'
    const base = props.file.name.replace(/\.[^.]+$/, '') || 'picture'
    emit('apply', new File([blob], `${base}.${ext}`, { type }))
  } finally {
    isApplying.value = false
  }
}

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (src.value) URL.revokeObjectURL(src.value)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && file"
      class="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5"
      @keydown.esc.stop="emit('cancel')"
    >
      <div class="fixed inset-0 bg-black/55 backdrop-blur-sm" aria-hidden="true" @click="emit('cancel')"></div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-cropper-title"
        class="relative w-full max-w-[560px] bg-white rounded-3xl border border-[#EEDFC4] shadow-[0_24px_50px_-12px_rgba(59,31,14,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-[#EEDFC4] bg-[#FDFBF7]">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0">
              <Icon name="heroicons:scissors" class="w-[18px] h-[18px]" />
            </div>
            <div>
              <h2 id="image-cropper-title" class="text-lg font-display font-extrabold text-[#3B1F0E]">{{ title }}</h2>
              <p class="text-xs text-[#8A6E64] mt-0.5">Drag to reposition. Zoom to crop tighter.</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cancel cropping"
            class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3B1F0E] active:scale-95 transition-all flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="emit('cancel')"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Crop area -->
        <div class="px-5 sm:px-6 pt-5">
          <div
            ref="viewport"
            tabindex="0"
            role="application"
            aria-label="Picture crop area. Use arrow keys to move and plus or minus to zoom."
            class="relative w-full overflow-hidden rounded-2xl bg-[#2A1C16] select-none touch-none outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/50 focus-visible:ring-offset-2"
            :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
            :style="{ aspectRatio: String(aspect) }"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @wheel.prevent="onWheel"
            @keydown="onKeydown"
          >
            <img
              v-if="src"
              ref="imgEl"
              :src="src"
              alt=""
              draggable="false"
              class="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
              :class="isDragging ? '' : 'transition-transform duration-150 ease-out'"
              :style="imgStyle"
              @load="onImageLoad"
            />
            <!-- Rule-of-thirds guide while dragging -->
            <div
              class="pointer-events-none absolute inset-0 transition-opacity duration-150"
              :class="isDragging ? 'opacity-100' : 'opacity-0'"
              aria-hidden="true"
            >
              <div class="absolute inset-y-0 left-1/3 w-px bg-white/40"></div>
              <div class="absolute inset-y-0 left-2/3 w-px bg-white/40"></div>
              <div class="absolute inset-x-0 top-1/3 h-px bg-white/40"></div>
              <div class="absolute inset-x-0 top-2/3 h-px bg-white/40"></div>
            </div>
            <div class="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/25" aria-hidden="true"></div>
          </div>
        </div>

        <!-- Controls -->
        <div class="px-5 sm:px-6 pt-4 pb-5 flex items-center gap-3">
          <button
            type="button"
            aria-label="Zoom out"
            class="w-9 h-9 shrink-0 rounded-xl border border-[#EEDFC4] bg-white text-[#7D5A50] hover:bg-[#FAF4ED] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            :disabled="zoom <= 1"
            @click="setZoom(zoom - 0.25)"
          >
            <Icon name="heroicons:minus" class="w-4 h-4" />
          </button>
          <input
            type="range"
            min="1"
            :max="MAX_ZOOM"
            step="0.01"
            :value="zoom"
            aria-label="Zoom"
            class="flex-1 min-w-0 h-1.5 rounded-full appearance-none bg-[#EEDFC4] accent-[#7D5A50] cursor-pointer"
            @input="setZoom(Number(($event.target as HTMLInputElement).value))"
          />
          <button
            type="button"
            aria-label="Zoom in"
            class="w-9 h-9 shrink-0 rounded-xl border border-[#EEDFC4] bg-white text-[#7D5A50] hover:bg-[#FAF4ED] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            :disabled="zoom >= MAX_ZOOM"
            @click="setZoom(zoom + 0.25)"
          >
            <Icon name="heroicons:plus" class="w-4 h-4" />
          </button>
          <span class="w-px h-6 bg-[#EEDFC4] shrink-0" aria-hidden="true"></span>
          <button
            type="button"
            aria-label="Rotate 90 degrees"
            title="Rotate"
            class="w-9 h-9 shrink-0 rounded-xl border border-[#EEDFC4] bg-white text-[#7D5A50] hover:bg-[#FAF4ED] flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="rotate"
          >
            <Icon name="heroicons:arrow-path-rounded-square" class="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Reset adjustments"
            title="Reset"
            class="w-9 h-9 shrink-0 rounded-xl border border-[#EEDFC4] bg-white text-[#7D5A50] hover:bg-[#FAF4ED] flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="reset"
          >
            <Icon name="heroicons:arrow-uturn-left" class="w-4 h-4" />
          </button>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-[#EEDFC4] bg-[#FAF8F5]">
          <button
            type="button"
            class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isApplying || !natural.w"
            class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="apply"
          >
            <Icon v-if="isApplying" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
