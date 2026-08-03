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
        role: null as string | null,
    }),

    getters: {
        isAuthenticated: (state) => !!state.user,
    },

    actions: {
        setSession(user: User, role: string) {
            this.user = user
            this.role = role
        },
        clear() {
            this.user = null
            this.role = null
        },
    },
})