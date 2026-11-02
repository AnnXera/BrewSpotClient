// app/plugins/pwa.client.ts

export default defineNuxtPlugin(() => {
  const { setDeferredPrompt, markAsInstalled } = useA2HS()

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

    // 3. Track when app has been installed
    window.addEventListener('appinstalled', () => {
      markAsInstalled()
      console.log('BrewSpot POS PWA successfully installed to home screen / desktop.')
    })

    // 4. Register service worker immediately (don't wait for 'load' if document is already ready)
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
