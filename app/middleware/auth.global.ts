//auth.global.ts
import { useAuthStore } from "~/stores/auth"

export default defineNuxtRouteMiddleware((to) => {
    const token = useCookie<string | null>('auth_token')
    const authStore = useAuthStore()

    const publicRoutes = ['/login', '/verify-login-code', '/register', '/setup-password']
    const isPublic = publicRoutes.some((p) => to.path.startsWith(p))

    if (!token.value && !isPublic) {
        return navigateTo('/login')
    }

    const requiredRole = to.meta.role as string | string[] | undefined
    if (requiredRole && authStore.role) {
        const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
        if (!allowed.includes(authStore.role)) {
            return navigateTo('/unauthorized')
        }
    }
})