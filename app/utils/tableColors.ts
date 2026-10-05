// app/utils/tableColors.ts
// "selected" is client-side UI state; the server only knows available / occupied / reserved / cleaning.
export type TableVisual = 'available' | 'unavailable' | 'selected'

// fill/stroke paint the table and chairs; badge/badgeText paint the number circle on the table top.
export const TABLE_STYLE: Record<TableVisual, { fill: string; stroke: string; badge: string; badgeText: string }> = {
  available: { fill: '#FFFFFF', stroke: '#7D5A50', badge: '#7D5A50', badgeText: '#FFF0D1' },
  unavailable: { fill: '#D9D9D9', stroke: '#BDBDBD', badge: '#8A8A8A', badgeText: '#FFFFFF' },
  selected: { fill: '#7D5A50', stroke: '#7D5A50', badge: '#FFF0D1', badgeText: '#7D5A50' },
}

export function tableVisual(status: string | null | undefined, selected = false): TableVisual {
  if (selected) return 'selected'
  return status === 'available' ? 'available' : 'unavailable'
}
