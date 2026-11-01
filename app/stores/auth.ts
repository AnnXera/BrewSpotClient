//app/stores/auth.ts
import { defineStore } from 'pinia'

export interface User {
    uuid: string
    firstname: string
    middlename?: string | null
    lastname: string
    username?: string | null
    email: string
    phone_number?: string | null
    address?: string | null
    photo_url?: string | null
    role?: { role_name: string }
    welcome_pending?: boolean
}

export const useAuthStore = defineStore('auth', {
    state: () => {
        const token = useCookie<string | null>('auth_token').value
        return {
            user: token ? (useCookie<User | null>('user_data').value ?? null) : null,
            role: token ? (useCookie<string | null>('user_role').value ?? null) : null,
            registrationEmail: '',
            registrationUserUuid: '',
        }
    },

    getters: {
        isAuthenticated: (state) => {
            const token = useCookie<string | null>('auth_token').value
            return !!token && (!!state.user || !!state.role)
        },
    },

    actions: {
        setSession(user: User, role: string) {
            this.user = user
            this.role = role
            const userRole = useCookie<string | null>('user_role', { maxAge: 60 * 60 * 24 * 7 })
            userRole.value = role
            const userData = useCookie<User | null>('user_data', { maxAge: 60 * 60 * 24 * 7 })
            userData.value = user
        },
        updateUser(partial: Partial<User>) {
            if (!this.user) return
            this.user = { ...this.user, ...partial }
            const userData = useCookie<User | null>('user_data', { maxAge: 60 * 60 * 24 * 7 })
            userData.value = this.user
        },
        setRegistrationEmail(email: string) {
            this.registrationEmail = email
        },
        setRegistrationUserUuid(uuid: string) {
            this.registrationUserUuid = uuid
        },
        clearRegistrationData() {
            this.registrationEmail = ''
            this.registrationUserUuid = ''
        },
        clear() {
            this.user = null
            this.role = null
            this.registrationEmail = ''
            this.registrationUserUuid = ''
            const userRole = useCookie<string | null>('user_role')
            userRole.value = null
            const userData = useCookie<User | null>('user_data')
            userData.value = null
            const authToken = useCookie<string | null>('auth_token')
            authToken.value = null
        },
    },
})