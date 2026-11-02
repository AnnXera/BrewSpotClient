// State for the single CommonDocumentViewer mounted in app.vue: documents and pictures open in a
// popup over the current page instead of a new browser tab.

export type DocumentKind = 'pdf' | 'image' | 'other'

interface DocumentViewerState {
  open: boolean
  title: string
  loading: boolean
  error: string
  src: string
  kind: DocumentKind
}

// Object URLs from fetched documents; freed when the viewer closes or loads another one.
let objectUrl: string | null = null
let requestId = 0
let lastUrl = '' // for Try again

function releaseObjectUrl() {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
}

function kindOf(type: string, url = ''): DocumentKind {
  if (type.includes('pdf') || /\.pdf($|\?)/i.test(url)) return 'pdf'
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(url)) return 'image'
  return 'other'
}

export function useDocumentViewer() {
  const state = useState<DocumentViewerState>('document-viewer', () => ({
    open: false,
    title: '',
    loading: false,
    error: '',
    src: '',
    kind: 'other',
  }))

  /** Opens a protected API document (e.g. a `download_url`), fetched with the user's token. */
  async function openDocument(url: string, title = 'Document') {
    const id = ++requestId
    lastUrl = url
    releaseObjectUrl()
    state.value = { open: true, title, loading: true, error: '', src: '', kind: 'other' }

    const config = useRuntimeConfig()
    const token = useCookie<string | null>('auth_token')
    const origin = config.public.apiBase.replace(/\/api\/?$/, '')

    try {
      const response = await fetch(`${origin}${url}`, {
        headers: {
          Authorization: `Bearer ${token.value}`,
          Accept: 'application/pdf, image/*',
        },
      })
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)

      const blob = await response.blob()
      if (id !== requestId || !state.value.open) return
      objectUrl = URL.createObjectURL(blob)
      state.value = { ...state.value, loading: false, src: objectUrl, kind: kindOf(blob.type, url) }
    } catch (e) {
      if (id !== requestId) return
      console.error('Failed to load document', e)
      state.value = { ...state.value, loading: false, error: 'The document could not be loaded. Check your connection and try again.' }
    }
  }

  /** Opens a picture that is already reachable by URL, such as a cafe photo. */
  function openImage(src: string, title = 'Picture') {
    ++requestId
    releaseObjectUrl()
    state.value = { open: true, title, loading: false, error: '', src, kind: 'image' }
  }

  function retryDocument() {
    if (lastUrl) openDocument(lastUrl, state.value.title)
  }

  function closeDocument() {
    ++requestId
    releaseObjectUrl()
    state.value = { ...state.value, open: false, loading: false, src: '' }
  }

  return { state, openDocument, openImage, retryDocument, closeDocument }
}
