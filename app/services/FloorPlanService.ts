//app/services/FloorPlanService.ts
import type { $Fetch } from 'nitropack'
import { BaseService } from './BaseService'

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'

export interface FloorPlanTable {
    uuid: string
    table_name: string
    capacity: number
    asset_key: string | null
    x_location: number
    y_location: number
    rotation: number
    status: TableStatus
}

export interface FloorPlanElement {
    uuid: string
    category: string
    asset_key: string | null
    label: string | null
    x_location: number
    y_location: number
    width: number | null
    height: number | null
    rotation: number
    z_index: number
}

export interface FloorPlan {
    uuid: string
    floorplan_name: string
    canvas_width: number
    canvas_height: number
    boundary_points: { x: number; y: number }[] | null
    is_active: boolean
    tables?: FloorPlanTable[]
    elements?: FloorPlanElement[]
}

export interface FloorPlanAssets {
    assets: { key: string; category: string; capacity?: number }[]
    drawn_categories: string[]
    table_statuses: TableStatus[]
    limits: {
        canvas_min: number
        canvas_max: number
        max_tables: number
        max_elements: number
        max_table_capacity: number
    }
}

// A row sent to PUT .../layout; rows without a uuid are created, rows left out are removed.
export interface LayoutTable {
    uuid?: string | null
    table_name: string
    capacity: number
    asset_key: string | null
    x_location: number
    y_location: number
    rotation: number
}

export interface LayoutElement {
    uuid?: string | null
    category: string
    asset_key: string | null
    label: string | null
    x_location: number
    y_location: number
    width: number | null
    height: number | null
    rotation: number
    z_index: number
}

export interface FloorPlanInput {
    floorplan_name?: string
    canvas_width?: number
    canvas_height?: number
    boundary_points?: { x: number; y: number }[] | null
}

type Saved = { success: boolean; message: string; floor_plan: FloorPlan }

/**
 * Floor Plan editor. The same routes exist under /owner and /manager, so the
 * scope is chosen per instance.
 */
export class FloorPlanService extends BaseService {
    constructor(client: $Fetch, private readonly scope: 'owner' | 'manager' = 'manager') {
        super(client)
    }

    private base(branchUuid: string) {
        return `/${this.scope}/branches/${branchUuid}`
    }

    // Branch switcher (manager only).
    managedBranches() {
        return this.get<{ success: boolean; branches: { uuid: string; branch_name: string }[] }>('/manager/branches')
    }

    assets(branchUuid: string) {
        return this.get<{ success: boolean } & FloorPlanAssets>(`${this.base(branchUuid)}/floor-plans/assets`)
    }

    list(branchUuid: string) {
        return this.get<{ success: boolean; floor_plans: FloorPlan[] }>(`${this.base(branchUuid)}/floor-plans`)
    }

    show(branchUuid: string, planUuid: string) {
        return this.get<{ success: boolean; floor_plan: FloorPlan }>(`${this.base(branchUuid)}/floor-plans/${planUuid}`)
    }

    create(branchUuid: string, data: Required<Pick<FloorPlanInput, 'floorplan_name' | 'canvas_width' | 'canvas_height'>>) {
        return this.post<Saved>(`${this.base(branchUuid)}/floor-plans`, data)
    }

    update(branchUuid: string, planUuid: string, data: FloorPlanInput) {
        return this.patch<Saved>(`${this.base(branchUuid)}/floor-plans/${planUuid}`, data)
    }

    remove(branchUuid: string, planUuid: string) {
        return this.delete<{ success: boolean; message: string }>(`${this.base(branchUuid)}/floor-plans/${planUuid}`)
    }

    activate(branchUuid: string, planUuid: string) {
        return this.post<Saved>(`${this.base(branchUuid)}/floor-plans/${planUuid}/activate`)
    }

    // Save layout: full replace of tables and elements (422 with `errors` keyed "tables.N.field").
    saveLayout(branchUuid: string, planUuid: string, tables: LayoutTable[], elements: LayoutElement[]) {
        return this.put<Saved>(`${this.base(branchUuid)}/floor-plans/${planUuid}/layout`, { tables, elements })
    }

    tableStatus(branchUuid: string, tableUuid: string, status: TableStatus) {
        return this.patch<{ success: boolean; message: string; table: FloorPlanTable }>(
            `${this.base(branchUuid)}/tables/${tableUuid}/status`, { status })
    }
}
