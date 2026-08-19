import { useAuthStore } from "~/stores/auth"
import { getRedirectForRole } from "~/utils/roleRedirects"

let isInitialPageLoad = true

export default defineNuxtRouteMiddleware((to) => {
    const token = useCookie<string | null>('auth_token')
    const authStore = useAuthStore()

    const userRoleCookie = useCookie<string | null>('user_role')
    if (!authStore.role && userRoleCookie.value) {
        authStore.role = userRoleCookie.value
    }

    // 1. Obsolete/removed step extensions automatically redirect to /login immediately without rendering
    const oldStepPaths = [
        '/register-personal',
        '/register-business',
        '/register-documents',
        '/register-review',
        '/verify-register-code'
    ]
    if (oldStepPaths.some((path) => to.path.startsWith(path))) {
        return navigateTo('/login', { replace: true })
    }

    const publicRoutes = ['/login', '/verify-login-code', '/register', '/setup-password']
    const isPublic = publicRoutes.some((p) => to.path.startsWith(p))

    // 2. On browser refresh or direct URL load for unauthenticated users, redirect immediately to /login
    const isFresh = isInitialPageLoad
    if (import.meta.client) {
        isInitialPageLoad = false
    }

    if (!token.value && isFresh && to.path !== '/login') {
        return navigateTo('/login', { replace: true })
    }

    // 3. Protect authenticated routes for unauthenticated users
    if (!token.value && !isPublic) {
        return navigateTo('/login', { replace: true })
    }

    // 4. Redirect logged-in users trying to access login/register back to their dashboard
    if (token.value && authStore.role && isPublic) {
        return navigateTo(getRedirectForRole(authStore.role), { replace: true })
    }

    // 5. Role permissions check
    const requiredRole = to.meta.role as string | string[] | undefined
    if (requiredRole && authStore.role) {
        const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
        if (!allowed.includes(authStore.role)) {
            return navigateTo('/unauthorized', { replace: true })
        }
    }
})