//useLogout
// redirectTo: false ends the session without navigating (e.g. POS setup handles its own redirect)
export function useLogout(options: { redirectTo?: string | false } = {}) {
    const authService = useAuthService()
    const authStore = useAuthStore()
    const redirectTo = options.redirectTo ?? '/login'

    return async function logout() {
        const token = useCookie<string | null>('auth_token')
        const userRole = useCookie<string | null>('user_role')

        try {
            await authService.logout()
        } catch {
            // clear local state regardless of API outcome
        } finally {
            token.value = null
            userRole.value = null
            authStore.clear()
            if (redirectTo) await navigateTo(redirectTo)
        }
    }
}
