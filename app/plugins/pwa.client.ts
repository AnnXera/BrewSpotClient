// app/plugins/pwa.client.ts
import { isStandalonePwaWindow, useA2HS } from '~/composables/useA2HS'

export default defineNuxtPlugin(() => {
  const { setDeferredPrompt, markAsInstalled, redirectToOwnerLoginForPosSetup } = useA2HS()

  if (typeof window !== 'undefined') {
    // 1. Pick up beforeinstallprompt if caught early by inline script in head
    if ((window as any).__deferredInstallPrompt) {
      setDeferredPrompt((window as any).__deferredInstallPrompt)
    }

    // Callback when early inline script catches beforeinstallprompt
    ;(window as any).__onDeferredPromptReady = (e: any) => {
      setDeferredPrompt(e)
    }

    // 2. Fallback listener for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      ;(window as any).__deferredInstallPrompt = e
      setDeferredPrompt(e)
    })

    // 3. Track when app has been installed (via prompt or browser omnibox/menu)
    window.addEventListener('appinstalled', () => {
      markAsInstalled()
    })

    // 4. Also listen for display-mode transitioning to standalone (when Chrome reparents the tab into the PWA window)
    const standaloneMedia = window.matchMedia('(display-mode: standalone)')
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        markAsInstalled()
      }
    }
    if (typeof standaloneMedia.addEventListener === 'function') {
      standaloneMedia.addEventListener('change', handleDisplayModeChange)
    }

    // 5. If already launched in standalone A2HS mode on a dashboard route, immediately leave the dashboard
    if (isStandalonePwaWindow()) {
      const posDeviceCookie = usePosDeviceToken()
      const currentPath = window.location.pathname
      const isAllowedStandalonePath =
        currentPath === '/pos' ||
        currentPath === '/pos/setup' ||
        currentPath === '/login' ||
        currentPath === '/verify-login-code'

      if (!isAllowedStandalonePath) {
        if (posDeviceCookie.value) {
          navigateTo('/pos', { replace: true })
        } else {
          redirectToOwnerLoginForPosSetup()
        }
      }
    }

    // 6. Register service worker immediately
    if ('serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope)
          })
          .catch((err) => {
            console.warn('Service Worker registration failed:', err)
          })
      }

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        registerSW()
      } else {
        window.addEventListener('load', registerSW)
      }
    }
  }
})
