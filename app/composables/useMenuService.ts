import { MenuService } from '~/services/MenuService'
import { useApi } from './useApi'

export function useMenuService() {
    return new MenuService(useApi())
}
