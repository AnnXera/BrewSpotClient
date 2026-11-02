import { UserProfileService } from '~/services/UserProfileService'
export * from '~/services/UserProfileService'

export function useUserProfileService() {
    return new UserProfileService(useApi())
}
