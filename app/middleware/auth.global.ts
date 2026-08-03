import { useAuthStore } from "~/stores/auth"
import { getRedirectForRole } from "~/utils/roleRedirects"

export default defineNuxtRouteMiddleware((to) => {
    const token = useCookie<string | null>('auth_token')
    const authStore = useAuthStore()

    const userRoleCookie = useCookie<string | null>('user_role')
    if (!authStore.role && userRoleCookie.value) {
        authStore.role = userRoleCookie.value
    }

    const publicRoutes = ['/login', '/verify-login-code', '/register', '/setup-password']
    const isPublic = publicRoutes.some((p) => to.path.startsWith(p))

    if (!token.value && !isPublic) {
        return navigateTo('/login')
    }

    if (token.value && authStore.role && isPublic) {
        return navigateTo(getRedirectForRole(authStore.role))
    }

    const requiredRole = to.meta.role as string | string[] | undefined
    if (requiredRole && authStore.role) {
        const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
        if (!allowed.includes(authStore.role)) {
            return navigateTo('/unauthorized')
        }
    }
})