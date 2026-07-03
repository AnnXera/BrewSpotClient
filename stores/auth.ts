import { defineStore } from 'pinia'

interface User {
    uuid: string
    firstname: string
    lastname: string
    email: string
    role?: { role_name: string }
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null as User | null,
        role: null as string | null,
    }),

    actions: {
        async login(email: string, password: string) {
            const api = useApi()
            return await api<{
                success: boolean
                message: string
                requires_2fa?: boolean
                user_uuid?: string
            }>('/auth/login', {
                method: 'POST',
                body: { email, password },
            })
        },

        async verifyLoginCode(email: string, code: string) {
            const api = useApi()
            const token = useCookie<string | null>('auth_token', {
                maxAge: 60 * 60 * 24 * 7,
            })

            const res = await api<{
                success: boolean
                message: string
                token?: string
                role?: string
                redirect?: string
                user?: User
            }>('/auth/verify-login-code', {
                method: 'POST',
                body: { email, code },
            })

            if (res.success && res.token) {
                token.value = res.token
                this.user = res.user ?? null
                this.role = res.role ?? null
            }

            return res
        },

        async resendLoginCode(email: string) {
            const api = useApi()
            return await api('/auth/resend-login-code', {
                method: 'POST',
                body: { email },
            })
        },

        async logout() {
            const api = useApi()
            const token = useCookie('auth_token')
            try {
                await api('/auth/logout', { method: 'POST' })
            } finally {
                token.value = null
                this.user = null
                this.role = null
                navigateTo('/login')
            }
        },
    },
})