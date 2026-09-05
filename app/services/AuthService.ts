//app/services/AuthService.ts
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

interface VerificationResponse {
    success: boolean
    message: string
    user_uuid?: string
    retry_after_seconds?: number
}

interface SimpleResponse {
    success: boolean
    message: string
    retry_after_seconds?: number
}

interface CheckSetupStatusResponse {
    success: boolean
    status?: string
    already_active?: boolean
    message?: string
    email?: string
    role?: string
}

interface SetupPasswordResponse {
    success: boolean
    message: string
    already_active?: boolean
    user?: User
}

export interface ApplicationDetails {
    user: {
        uuid: string
        firstname: string
        middlename?: string | null
        lastname: string
        username: string
        email: string
        phone_number: string
        address: string
        status: string
        created_at: string
    }
    cafe?: {
        uuid: string
        cafe_name: string
        doc_type?: string
    } | null
    branch?: {
        uuid: string
        branch_name: string
        address: string
        cafe_email: string
        cafe_phonenumber: string
        branch_type: string
        status: string
    } | null
    documents: {
        government_id: { type?: string; uploaded: boolean }
        cafe_document: { type?: string; uploaded: boolean }
        bir: { type: string; uploaded: boolean }
        mayors_permit: { type: string; uploaded: boolean }
        sanitary_permit: { type: string; uploaded: boolean }
    }
    approval: {
        status: string
        reason?: string | null
        submitted_at: string
        reviewed_at?: string | null
    }
}

export interface ApplicationDetailsResponse {
    success: boolean
    message?: string
    application?: ApplicationDetails
}

export class AuthService extends BaseService {
    getApplicationDetails(uuid: string) {
        return this.get<ApplicationDetailsResponse>(`/auth/application/${uuid}`)
    }

    checkSetupStatus(uuid: string) {
        return this.get<CheckSetupStatusResponse>(`/auth/setup-password/${uuid}`)
    }

    login(email: string, password: string) {
        return this.post<LoginResponse>('/auth/login', { email, password })
    }

    verifyLoginCode(email: string, code: string) {
        return this.post<VerifyLoginCodeResponse>('/auth/verify-login-code', { email, code })
    }

    resendLoginCode(email: string) {
        return this.post<SimpleResponse>('/auth/resend-login-code', { email })
    }

    sendRegistrationCode(email: string) {
        return this.post<SimpleResponse>('/auth/send-code', { email })
    }

    verifyRegistrationCode(email: string, code: string) {
        return this.post<VerificationResponse>('/auth/verify-code', { email, code })
    }

    resendRegistrationCode(email: string) {
        return this.post<SimpleResponse>('/auth/resend-code', { email })
    }

    register(userUuid: string, payload: FormData) {
        return this.post<SimpleResponse>(`/auth/register/${userUuid}`, payload)
    }

    setupPassword(uuid: string, password: string, passwordConfirmation: string) {
        return this.post<SetupPasswordResponse>(`/auth/setup-password/${uuid}`, {
            password,
            password_confirmation: passwordConfirmation,
        })
    }

    logout() {
        return this.post<SimpleResponse>('/auth/logout')
    }
}