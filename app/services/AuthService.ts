//AuthService
import { BaseService } from './BaseService'

interface User {
    uuid: string
    firstname: string
    lastname: string
    email: string
    role?: { role_name: string }
}

interface LoginResponse {
    success: boolean
    message: string
    requires_2fa?: boolean
    user_uuid?: string
}

interface VerifyLoginCodeResponse {
    success: boolean
    message: string
    token?: string
    role?: string
    redirect?: string
    user?: User
}

interface SimpleResponse {
    success: boolean
    message: string
    retry_after_seconds?: number
}

export class AuthService extends BaseService {
    login(email: string, password: string) {
        return this.post<LoginResponse>('/auth/login', { email, password })
    }

    verifyLoginCode(email: string, code: string) {
        return this.post<VerifyLoginCodeResponse>('/auth/verify-login-code', { email, code })
    }

    resendLoginCode(email: string) {
        return this.post<SimpleResponse>('/auth/resend-login-code', { email })
    }

    logout() {
        return this.post<SimpleResponse>('/auth/logout')
    }
}