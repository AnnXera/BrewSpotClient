// app/services/UserProfileService.ts
import { BaseService } from './BaseService'
import type { User } from '~/stores/auth'

export interface WorkplaceInfo {
    cafe_name: string
    branch_name: string
    branch_address?: string | null
    branch_type?: string | null
    position?: string | null
}

export interface UserProfileResponse {
    success: boolean
    user: User
    workplace?: WorkplaceInfo | null
}

export interface UpdateProfilePayload {
    firstname: string
    middlename?: string | null
    lastname: string
    phone_number?: string | null
    address?: string | null
}

export interface ChangePasswordPayload {
    current_password: string
    password: string
    password_confirmation: string
}

export class UserProfileService extends BaseService {
    getProfile() {
        return this.get<UserProfileResponse>('/user/profile')
    }

    updateProfile(payload: UpdateProfilePayload) {
        return this.put<{ success: boolean; message: string; user: User }>('/user/profile', payload)
    }

    uploadPhoto(formData: FormData) {
        return this.post<{ success: boolean; message: string; photo_url: string }>('/user/profile-photo', formData)
    }

    deletePhoto() {
        return this.delete<{ success: boolean; message: string }>('/user/profile-photo')
    }

    changePassword(payload: ChangePasswordPayload) {
        return this.put<{ success: boolean; message: string }>('/user/change-password', payload)
    }
}
