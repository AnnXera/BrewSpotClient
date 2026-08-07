export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss', '@nuxt/fonts', '@nuxt/icon'],

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