<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'

const props = defineProps<{
  src: string
  alt?: string
  class?: string
  skipAuth?: boolean
}>

const api = useApi()
const objectUrl = ref<string | null>(null)
const loading = ref(false)
const error = ref<any>(null)

function isAbsolute(url: string) {
  return /^https?:\/\//i.test(url) || url.startsWith('data:')
}

async function fetchImage() {
  const src = props.src
  if (!src) {
    objectUrl.value = null
    return
  }

  // If caller explicitly asks to skip auth or the src is an absolute URL/data URL,
  // render it directly in the img tag (no fetch). This covers CDN-hosted images.
  if (props.skipAuth || isAbsolute(src)) {
    objectUrl.value = src
    return
  }

  loading.value = true
  error.value = null

  try {
    // Use the app's api client so the Authorization header is sent if present.
    // Accept either absolute paths (/files/...) or relative ones.
    const url = src.startsWith('/') ? src : `/${src}`
    const blob = await api(url, { method: 'GET', responseType: 'blob' }) as Blob
    if (objectUrl.value && objectUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(objectUrl.value)
    }
    objectUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    error.value = e
    objectUrl.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchImage())
watch(() => props.src, () => fetchImage())

onBeforeUnmount(() => {
  if (objectUrl.value && objectUrl.value.startsWith('blob:')) URL.revokeObjectURL(objectUrl.value)
})
</script>

<template>
  <img
    :src="objectUrl || ''"
    :alt="props.alt ?? ''"
    :class="props.class"
    v-if="objectUrl"
  />
  <div v-else class="bg-[#F3E7D2] w-full h-full flex items-center justify-center text-sm text-[#9E7060]">
    <!-- Simple placeholder while loading / on error -->
    <span v-if="loading">Loading image…</span>
    <span v-else-if="error">Image unavailable</span>
  </div>
</template>
