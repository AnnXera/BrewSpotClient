// app/utils/floorPlanCatalog.ts
// What the editor can place. Keys must match `assets` in the server's config/floor_plan.php.
import doorSgl from '~/assets/floor-plan/door_sgl.svg'
import doorDouble from '~/assets/floor-plan/door_double.svg'

export type LibraryCategory = 'tables' | 'fixtures'

export interface TableAsset {
  key: string
  name: string
  shape: 'square' | 'long'
  seats: number
  w: number
  h: number
}

// Natural size of each table SVG (chairs included), as drawn in the Figma file.
// The SVGs fill whatever box they are given (viewBox), so tables render at TABLE_SCALE of this.
const TABLE_SCALE = 0.8
const scaled = (n: number) => Math.round(n * TABLE_SCALE)

export const TABLE_ASSETS: TableAsset[] = [
  { key: 'table_sqr_1', name: 'Square table', shape: 'square', seats: 1, w: scaled(89), h: scaled(67) },
  { key: 'table_sqr_2', name: 'Square table', shape: 'square', seats: 2, w: scaled(112), h: scaled(67) },
  { key: 'table_sqr_3', name: 'Square table', shape: 'square', seats: 3, w: scaled(112), h: scaled(90) },
  { key: 'table_sqr_4', name: 'Square table', shape: 'square', seats: 4, w: scaled(112), h: scaled(112) },
  { key: 'table_rec_2', name: 'Long table', shape: 'long', seats: 2, w: scaled(137), h: scaled(89) },
  { key: 'table_rec_4', name: 'Long table', shape: 'long', seats: 4, w: scaled(137), h: scaled(112) },
]

export const DOOR_ASSETS = [
  { key: 'door_sgl', name: 'Door', note: 'Single swing', src: doorSgl, w: 64, h: 64 },
  { key: 'door_double', name: 'Double door', note: 'Double swing', src: doorDouble, w: 122, h: 64 },
]

export const tableAsset = (key: string | null | undefined) => TABLE_ASSETS.find((a) => a.key === key)
export const doorAsset = (key: string | null | undefined) => DOOR_ASSETS.find((a) => a.key === key)

// Drawn (no image) elements: the server wants a width and height for these.
export const DRAWN = {
  wall: { w: 240, h: 8, label: null as string | null },
  counter: { w: 240, h: 36, label: 'Counter' },
} as const

// What the library hands to the canvas (by click or drag).
export type PlaceSpec =
  | { kind: 'table'; key: string }
  | { kind: 'door'; key: string }
  | { kind: 'counter' }
  | { kind: 'wall' }
