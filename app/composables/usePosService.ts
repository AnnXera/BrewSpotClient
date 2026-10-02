//app/composables/usePosService.ts
import { PosService } from '~/services/PosService'

export function usePosService() {
    return new PosService(useApi())
}
