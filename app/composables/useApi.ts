//app/composables/useApi.ts
export function useApi() {
    const config = useRuntimeConfig()
    const token = useCookie<string | null>('auth_token')

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
                const authStore = useAuthStore()
                authStore.clear()
                navigateTo('/login')
            }
        },
    })

    return api
}