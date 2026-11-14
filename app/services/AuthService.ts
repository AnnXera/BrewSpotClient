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
        government_id: { type?: string; uploaded: boolean; has_back?: boolean }
        cafe_document: { type?: string; uploaded: boolean }
        bir: { type: string; uploaded: boolean }
        mayors_permit: { type: string; uploaded: boolean }
        sanitary_permit: { type: string; uploaded: boolean }
    }
    approval: {
        status: string
        reason?: string | null
        /** Rejected and the admin allowed the applicant to edit and resubmit */
        can_resubmit?: boolean
        submitted_at: string
        reviewed_at?: string | null
    }
    /** Set only while the owner may edit and resubmit from the application page */
    editable?: PreviousApplication | null
}

/** Sent in place of a temp upload path to reuse a document from the rejected application */
export const KEEP_FILE = 'keep'

/** The rejected application being resubmitted, used to prefill the registration form */
export interface PreviousApplication {
    reason: string | null
    rejected_at: string | null
    firstname: string | null
    middlename: string | null
    lastname: string | null
    username: string | null
    phone_number: string | null
    owner_address: string | null
    id_type: string | null
    cafe_name: string | null
    cafe_doc_type: 'DTI' | 'SEC' | null
    branch_name: string | null
    address: string | null
    cafe_email: string | null
    cafe_phonenumber: string | null
    bir_registered_at: string | null
    tin_number: string | null
    vat: 'vat-registered' | 'non-vat' | null
    /** File names of documents that can be kept; null when there is none */
    documents: {
        file: string | null
        file_back: string | null
        dti_sec_file: string | null
        bir_file: string | null
        cafe_picture: string | null
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

    forgotPassword(email: string) {
        return this.post<SimpleResponse>('/auth/forgot-password', { email })
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

    validateRegistrationStep(userUuid: string, data: Record<string, any>) {
        return this.post<{ success: boolean; errors?: Record<string, string[]>; message?: string }>(
            `/auth/validate-registration-step/${userUuid}`,
            data
        )
    }

    /** Needs a re-verified email; application is null when there is nothing to resubmit */
    previousApplication(userUuid: string) {
        return this.get<{ success: boolean; application: PreviousApplication | null }>(
            `/auth/register/${userUuid}/previous-application`
        )
    }

    /** Edit a rejected application from its page (no OTP); same fields as register */
    resubmitApplication(uuid: string, payload: Record<string, string>) {
        return this.post<SimpleResponse>(`/auth/application/${uuid}/resubmit`, payload)
    }

    register(userUuid: string, payload: FormData) {
        return this.post<SimpleResponse>(`/auth/register/${userUuid}`, payload)
    }

    uploadTempFile(payload: FormData) {
        return this.post<{ success: boolean; path?: string; message?: string }>('/upload/temp', payload)
    }

    // pin/pinConfirmation are required for managers and ignored for everyone else.
    setupPassword(uuid: string, password: string, passwordConfirmation: string, pin?: string, pinConfirmation?: string) {
        return this.post<SetupPasswordResponse>(`/auth/setup-password/${uuid}`, {
            password,
            password_confirmation: passwordConfirmation,
            ...(pin !== undefined && { pin, pin_confirmation: pinConfirmation }),
        })
    }

    logout() {
        return this.post<SimpleResponse>('/auth/logout')
    }
}