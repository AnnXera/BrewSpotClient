//useAuthService
import { AuthService } from '~/services/AuthService'

export function useAuthService() {
    return new AuthService(useApi())
}