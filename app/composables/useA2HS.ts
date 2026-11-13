// app/composables/useA2HS.ts
import { useAuthStore } from '~/stores/auth'

// Global state so beforeinstallprompt event captured anytime is shared across all pages/components
const deferredPrompt = ref<any>(null)
const isInstalled = ref(false)
const showInstructionsModal = ref(false)

export function isStandalonePwaWindow(): boolean {
  if (typeof window === 'undefined') return false
  const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches
  const isIosStandalone = (window.navigator as any).standalone === true
  return isStandaloneDisplay || isIosStandalone
}

export function useA2HS() {
  const isIos = computed(() => {
    if (typeof window === 'undefined') return false
    const ua = window.navigator.userAgent.toLowerCase()
    return /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  })

  const checkStandalone = () => isStandalonePwaWindow()

  // Initialize client state
  if (typeof window !== 'undefined') {
    isInstalled.value = checkStandalone()
    if (!deferredPrompt.value && (window as any).__deferredInstallPrompt) {
      deferredPrompt.value = (window as any).__deferredInstallPrompt
    }
  }

  const canInstallDirectly = computed(() => !!deferredPrompt.value)

  /**
   * Called right after A2HS is downloaded/installed so the app never stays on the
   * Owner/Manager Dashboard. Logs out the dashboard session and sends the window
   * to /login?redirect=/pos/setup so the owner logs in to identify & register the
   * device token, then proceeds to /pos.
   */
  function redirectToOwnerLoginForPosSetup() {
    if (typeof window === 'undefined') return

    try {
      sessionStorage.removeItem('pos_setup_login_done')
    } catch {}

    const token = useCookie<string | null>('auth_token')
    const userRoleCookie = useCookie<string | null>('user_role')
    const userDataCookie = useCookie<any>('user_data')
    const posDeviceCookie = usePosDeviceToken()
    const authStore = useAuthStore()

    token.value = null
    userRoleCookie.value = null
    userDataCookie.value = null
    posDeviceCookie.value = null
    authStore.clear()

    navigateTo(
      {
        path: '/login',
        query: {
          redirect: '/pos/setup',
          notice: 'Sign in with your Cafe Owner or Manager account to identify and register this POS device.',
        },
      },
      { replace: true }
    )
  }

  async function promptInstall() {
    if (isInstalled.value) {
      const posDeviceCookie = usePosDeviceToken()
      if (posDeviceCookie.value) {
        navigateTo('/pos')
      } else {
        redirectToOwnerLoginForPosSetup()
      }
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
          redirectToOwnerLoginForPosSetup()
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
    redirectToOwnerLoginForPosSetup()
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
    redirectToOwnerLoginForPosSetup,
  }
}
