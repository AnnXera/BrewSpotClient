// app/composables/useA2HS.ts

// Global state so beforeinstallprompt event captured anytime is shared across all pages/components
const deferredPrompt = ref<any>(null)
const isInstalled = ref(false)
const showInstructionsModal = ref(false)

export function useA2HS() {
  const isIos = computed(() => {
    if (typeof window === 'undefined') return false
    const ua = window.navigator.userAgent.toLowerCase()
    return /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  })

  const checkStandalone = () => {
    if (typeof window === 'undefined') return false
    const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches
    const isIosStandalone = (window.navigator as any).standalone === true
    return isStandaloneDisplay || isIosStandalone
  }

  // Initialize client state
  if (typeof window !== 'undefined') {
    isInstalled.value = checkStandalone()
    if (!deferredPrompt.value && (window as any).__deferredInstallPrompt) {
      deferredPrompt.value = (window as any).__deferredInstallPrompt
    }
  }

  const canInstallDirectly = computed(() => !!deferredPrompt.value)

  async function promptInstall() {
    if (isInstalled.value) {
      // Already running as an installed PWA, redirect to /pos
      navigateTo('/pos')
      return
    }

    if (deferredPrompt.value) {
      // Direct native browser prompt in Chromium / Brave / Edge / Android
      try {
        await deferredPrompt.value.prompt()
        const choice = await deferredPrompt.value.userChoice
        if (choice && choice.outcome === 'accepted') {
          isInstalled.value = true
          showInstructionsModal.value = false
        }
        deferredPrompt.value = null
      } catch (err) {
        console.error('Error triggering A2HS prompt:', err)
        showInstructionsModal.value = true
      }
    } else {
      // If native event not yet triggered or desktop browser requires menu/omnibox install
      showInstructionsModal.value = true
    }
  }

  function setDeferredPrompt(e: any) {
    deferredPrompt.value = e
  }

  function markAsInstalled() {
    isInstalled.value = true
    deferredPrompt.value = null
    showInstructionsModal.value = false
  }

  return {
    deferredPrompt,
    isInstalled,
    isIos,
    canInstallDirectly,
    showInstructionsModal,
    promptInstall,
    setDeferredPrompt,
    markAsInstalled,
  }
}
