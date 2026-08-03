//useLogout
export function useLogout() {
    const authService = useAuthService()
    const authStore = useAuthStore()

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
            await navigateTo('/login')
        }
    }
}