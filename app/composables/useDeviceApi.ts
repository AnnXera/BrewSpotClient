//app/composables/useDeviceApi.ts
export function useDeviceApi() {
    const config = useRuntimeConfig()
    const token = useCookie<string | null>('pos_device_token')

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
        onResponseError({ response }) {
            if (response.status === 401) {
                token.value = null
                navigateTo('/pos/setup')
            }
        },
    })

    return api
}
