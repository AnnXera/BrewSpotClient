//auth.global.ts
import { useAuthStore } from "~/stores/auth"
import { getRedirectForRole, getSafeRedirect } from "~/utils/roleRedirects"
import { isStandalonePwaWindow } from "~/composables/useA2HS"

export default defineNuxtRouteMiddleware((to) => {
    const token = useCookie<string | null>('auth_token')
    const authStore = useAuthStore()

    const userRoleCookie = useCookie<string | null>('user_role')
    const userDataCookie = useCookie<any>('user_data')
    const posDeviceCookie = usePosDeviceToken()

    if (!token.value) {
        if (authStore.role || authStore.user || userRoleCookie.value || userDataCookie.value) {
            authStore.clear()
        }
    } else {
        if (!authStore.role && userRoleCookie.value) {
            authStore.role = userRoleCookie.value
        }
        if (!authStore.user && userDataCookie.value) {
            authStore.user = userDataCookie.value
        }
    }

    // ── A2HS / Standalone PWA Guard: NEVER allow A2HS to open any Dashboard ──
    if (import.meta.client && isStandalonePwaWindow()) {
        // 1. If this device already has its pos_device_token, always stay on /pos
        if (posDeviceCookie.value) {
            if (to.path !== '/pos') {
                return navigateTo('/pos', { replace: true })
            }
            return
        }

        // 2. No pos_device_token yet: owner must log in specifically in A2HS to identify & register this device
        let hasCompletedA2hsLogin = false
        try {
            hasCompletedA2hsLogin = sessionStorage.getItem('pos_setup_login_done') === '1'
        } catch {}

        // If auth_token was inherited from the main browser tab before A2HS login, clear it so the owner logs in fresh
        if (token.value && !hasCompletedA2hsLogin) {
            token.value = null
            userRoleCookie.value = null
            userDataCookie.value = null
            authStore.clear()
        }

        if (token.value && hasCompletedA2hsLogin) {
            if (to.path !== '/pos/setup') {
                return navigateTo('/pos/setup', { replace: true })
            }
            return
        }

        // Unauthenticated inside A2HS without a device token: only allow /login and /verify-login-code (with redirect=/pos/setup)
        if (to.path === '/login' || to.path === '/verify-login-code') {
            if (to.query.redirect !== '/pos/setup') {
                return navigateTo(
                    {
                        path: to.path,
                        query: {
                            ...to.query,
                            redirect: '/pos/setup',
                            ...(to.path === '/login' && !to.query.notice
                                ? { notice: 'Sign in with your Cafe Owner or Manager account to identify and register this POS device.' }
                                : {}),
                        },
                    },
                    { replace: true }
                )
            }
            return
        }

        return navigateTo(
            {
                path: '/login',
                query: {
                    redirect: '/pos/setup',
                    notice: 'Sign in with your Cafe Owner or Manager account to identify and register this POS device.',
                },
            },
            { replace: true }
        )
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

    // Allow /pos exactly to bypass the user auth check (it uses pos_device_token internally)
    const isPosRegister = to.path === '/pos'

    // 3. Protect authenticated routes for unauthenticated users
    if (!token.value && !isPublic && !isPosRegister) {
        // Remember where they were going so login can bring them back (e.g. /pos/setup)
        return navigateTo({ path: '/login', query: { redirect: to.fullPath } }, { replace: true })
    }

    // 4. Redirect logged-in users trying to access auth pages (login/register) back to their dashboard
    const authPagesOnly = ['/login', '/verify-login-code', '/register', '/setup-password']
    if (token.value && authStore.role && authPagesOnly.some((p) => to.path === p || to.path.startsWith(p + '/'))) {
        return navigateTo(getSafeRedirect(to.query.redirect) ?? getRedirectForRole(authStore.role), { replace: true })
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
