//app/composables/useDevicePosService.ts
import { DevicePosService } from '~/services/PosService'

export function useDevicePosService() {
    return new DevicePosService(useDeviceApi())
}
