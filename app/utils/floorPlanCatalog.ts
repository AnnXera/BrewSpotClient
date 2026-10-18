// app/utils/floorPlanCatalog.ts
// What the editor can place. Keys must match `assets` in the server's config/floor_plan.php.
import doorSgl from '~/assets/floor-plan/door_sgl.svg'
import doorDouble from '~/assets/floor-plan/door_double.svg'

export type LibraryCategory = 'tables' | 'fixtures'

export interface TableAsset {
  key: string
  name: string
  shape: TableShape
  seats: number
  ends?: boolean // one chair at each short end
  w: number
  h: number
}

// Natural size of each table SVG (chairs included), as drawn in the Figma file.
// The SVGs fill whatever box they are given (viewBox), so tables render at TABLE_SCALE of this.
const TABLE_SCALE = 0.8
// Not rounded: the box must keep the drawing's exact proportions, or the svg is centred on a half pixel and one edge renders thin.
const scaled = (n: number) => n * TABLE_SCALE

export const TABLE_ASSETS: TableAsset[] = [
  { key: 'table_sqr_1', name: 'Square table', shape: 'square', seats: 1, w: scaled(89), h: scaled(67) },
  { key: 'table_sqr_2', name: 'Square table', shape: 'square', seats: 2, w: scaled(112), h: scaled(67) },
  { key: 'table_sqr_3', name: 'Square table', shape: 'square', seats: 3, w: scaled(112), h: scaled(90) },
  { key: 'table_sqr_4', name: 'Square table', shape: 'square', seats: 4, w: scaled(112), h: scaled(112) },
  { key: 'table_rec_2', name: 'Long table', shape: 'long', seats: 2, w: scaled(137), h: scaled(89) },
  { key: 'table_rec_4', name: 'Long table', shape: 'long', seats: 4, w: scaled(137), h: scaled(112) },
  // Drawn in code by TableRecWide (3 and 4 chairs per side): width = 62 * perSide + 13.
  { key: 'table_rec_6', name: 'Long table', shape: 'long', seats: 6, w: scaled(199), h: scaled(112) },
  { key: 'table_rec_8', name: 'Long table', shape: 'long', seats: 8, w: scaled(261), h: scaled(112) },
  // Same, but two of the chairs sit at the short ends (2 / 3 per long side): the svg grows by 23px each end.
  // Round tables are drawn in code (TableRound), always in a 112 x 112 box.
  { key: 'table_round_2', name: 'Round table', shape: 'round', seats: 2, w: scaled(112), h: scaled(112) },
  { key: 'table_round_3', name: 'Round table', shape: 'round', seats: 3, w: scaled(112), h: scaled(112) },
  { key: 'table_round_4', name: 'Round table', shape: 'round', seats: 4, w: scaled(112), h: scaled(112) },
  // Counter seating (TableBar): 40px per stool, 62px tall. Booked by seat, so `shared` on the server.
  ...[2, 3, 4, 5, 6, 7, 8].map((n): TableAsset => (
    { key: `table_bar_${n}`, name: 'Counter seating', shape: 'bar', seats: n, w: scaled(n * 40 + 13), h: scaled(62) })),
  { key: 'table_rec_6_ends', name: 'Long table', shape: 'long', seats: 6, ends: true, w: scaled(183), h: scaled(112) },
  { key: 'table_rec_8_ends', name: 'Long table', shape: 'long', seats: 8, ends: true, w: scaled(245), h: scaled(112) },
]

export type TableShape = 'square' | 'long' | 'round' | 'bar'

// One table per shape in the library; its seat count picks the drawing (and so the asset_key).
export const TABLE_SHAPES: Record<TableShape, { name: string; label: string; seats: number[]; defaultSeats: number }> = {
  square: { name: 'Square table', label: 'Square', seats: [1, 2, 3, 4], defaultSeats: 4 },
  round: { name: 'Round table', label: 'Round', seats: [2, 3, 4], defaultSeats: 4 },
  long: { name: 'Long table', label: 'Long', seats: [2, 4, 6, 8], defaultSeats: 4 },
  bar: { name: 'Counter seating', label: 'Counter seating', seats: [2, 3, 4, 5, 6, 7, 8], defaultSeats: 4 },
}

// With `ends`, the variant with chairs at the short ends when one exists (6 and 8 seat long tables), else the usual drawing.
export const assetFor = (shape: TableShape, seats: number, ends = false) =>
  TABLE_ASSETS.find((a) => a.shape === shape && a.seats === seats && !!a.ends === ends)
  ?? TABLE_ASSETS.find((a) => a.shape === shape && a.seats === seats && !a.ends)

export const hasEndsOption = (shape: TableShape, seats: number) =>
  TABLE_ASSETS.some((a) => a.shape === shape && a.seats === seats && a.ends)

// Seat count to keep when the shape changes: the closest one the new shape has a drawing for.
export const nearestSeats = (shape: TableShape, seats: number) =>
  TABLE_SHAPES[shape].seats.reduce((best, s) => (Math.abs(s - seats) < Math.abs(best - seats) ? s : best))

export const DOOR_ASSETS = [
  { key: 'door_sgl', name: 'Door', note: 'Single swing', src: doorSgl, w: 64, h: 64 },
  { key: 'door_double', name: 'Double door', note: 'Double swing', src: doorDouble, w: 122, h: 64 },
]

// Up to this many floors show as tabs (one click); more become the FloorPlanSwitcher dropdown.
export const FLOOR_TAB_LIMIT = 3

export const tableAsset = (key: string | null | undefined) => TABLE_ASSETS.find((a) => a.key === key)
export const doorAsset = (key: string | null | undefined) => DOOR_ASSETS.find((a) => a.key === key)

// Drawn (no image) elements: the server wants a width and height for these.
export const DRAWN = {
  wall: { w: 240, h: 8, label: null as string | null },
  counter: { w: 240, h: 36, label: 'Counter' },
} as const

// What the library hands to the canvas (by click or drag).
export type PlaceSpec =
  | { kind: 'table'; shape: TableShape }
  | { kind: 'door'; key: string }
  | { kind: 'counter' }
  | { kind: 'wall' }
