import { ReservationService } from '~/services/ReservationService'
import { useApi } from './useApi'

export function useReservationService(scope: 'owner' | 'manager' = 'manager') {
  return new ReservationService(useApi(), scope)
}
