//app/composables/useDeviceApi.ts
export function useDeviceApi() {
    const config = useRuntimeConfig()
    const token = usePosDeviceToken()
    const nuxtApp = useNuxtApp()

    const api = $fetch.create({
        baseURL: config.public.apiBase,
        onRequest({ options }) {
            if (token.value) {
                options.headers = new Headers(options.headers)
                options.headers.set('Authorization', `Bearer ${token.value}`)
            }
            options.headers = new Headers(options.headers)
            options.headers.set('Accept', 'application/json')
        },
        onResponseError({ request, response, options }) {
            if (response.status === 401) {
                token.value = null
                navigateTo('/pos/setup')
            }
            // Plan-locked or expired: a change the user clicked (POST/PATCH/PUT/DELETE) gets the
            // shared popup. Page loads (GET) don't; the page shows its own locked card instead.
            const method = String(options.method ?? (request instanceof Request ? request.method : 'GET')).toUpperCase()
            if (response.status === 403 && response._data?.required_feature && method !== 'GET' && method !== 'HEAD') {
                nuxtApp.runWithContext(() => useSubscriptionGate().show(response._data))
            }
        },
    })

    return api
}
