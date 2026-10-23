export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  devtools: { enabled: true },

  // SPA build: the Hostinger Single plan serves static files only (no Node.js runtime).
  ssr: false,

  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss', '@nuxt/fonts', '@nuxt/icon'],

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