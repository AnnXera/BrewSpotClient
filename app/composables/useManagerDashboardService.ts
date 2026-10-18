// app/composables/useManagerDashboardService.ts
import { ManagerDashboardService } from '~/services/ManagerDashboardService'

export function useManagerDashboardService() {
  return new ManagerDashboardService(useApi())
}
