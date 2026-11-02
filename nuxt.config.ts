export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  devtools: { enabled: true },

  // SPA build: the Hostinger Single plan serves static files only (no Node.js runtime).
  ssr: false,

  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss', '@nuxt/fonts', '@nuxt/icon'],

  app: {
    head: {
      title: 'BrewSpot',
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/icons/icon-192x192.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icons/icon.svg' },
      ],
      meta: [
        { name: 'theme-color', content: '#7D5A50' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'BrewSpot POS' },
      ],
      script: [
        {
          innerHTML: `(function(){window.__deferredInstallPrompt=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__deferredInstallPrompt=e;if(window.__onDeferredPromptReady){window.__onDeferredPromptReady(e);}});})();`,
        },
      ],
    },
  },

  icon: {
    clientBundle: {
      scan: true,
      // Built at runtime (`${name}-solid` for the active nav link / tab), so the scan can't see them.
      icons: [
        'heroicons:squares-2x2-solid',
        'heroicons:chart-bar-solid',
        'heroicons:building-storefront-solid',
        'heroicons:book-open-solid',
        'heroicons:credit-card-solid',
        'heroicons:banknotes-solid',
        'heroicons:clipboard-document-list-solid',
      ],
      sizeLimitKb: 512,
    },
  },

  fonts: {
    families: [
      { name: 'Inter', provider: 'google' },
      { name: 'Outfit', provider: 'google' },
    ],
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8000/api',
    },
  },

  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
  },
})