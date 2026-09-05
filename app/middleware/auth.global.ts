//auth.global.ts
import { useAuthStore } from "~/stores/auth"
import { getRedirectForRole } from "~/utils/roleRedirects"

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

    const publicRoutes = ['/', '/login', '/verify-login-code', '/register', '/setup-password', '/application', '/unauthorized']
    const isPublic = publicRoutes.some((p) => p === '/' ? to.path === '/' : (to.path === p || to.path.startsWith(p + '/')))

    // 3. Protect authenticated routes for unauthenticated users
    if (!token.value && !isPublic) {
        return navigateTo('/login', { replace: true })
    }

    // 4. Redirect logged-in users trying to access auth pages (login/register) back to their dashboard
    const authPagesOnly = ['/login', '/verify-login-code', '/register', '/setup-password']
    if (token.value && authStore.role && authPagesOnly.some((p) => to.path === p || to.path.startsWith(p + '/'))) {
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