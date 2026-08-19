//auth.ts
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
        role: (useCookie<string | null>('user_role').value) ?? null,
        registrationEmail: '',
        registrationUserUuid: '',
    }),

    getters: {
        isAuthenticated: (state) => !!state.user || !!state.role,
    },

    actions: {
        setSession(user: User, role: string) {
            this.user = user
            this.role = role
            const userRole = useCookie<string | null>('user_role', { maxAge: 60 * 60 * 24 * 7 })
            userRole.value = role
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
        },
    },
})