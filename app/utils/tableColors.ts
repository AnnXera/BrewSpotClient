// app/utils/tableColors.ts
// Table visual states for floor plan representation and status tracking
export type TableVisual =
  | 'available'
  | 'reserved'
  | 'occupied'
  | 'cleaning'
  | 'unavailable'
  | 'neutral'
  | 'selected'

// fill/stroke paint the table and chairs; badge/badgeText paint the number circle on the table top.
export const TABLE_STYLE: Record<TableVisual, { fill: string; stroke: string; badge: string; badgeText: string }> = {
  available: { fill: '#FFFFFF', stroke: '#7D5A50', badge: '#7D5A50', badgeText: '#FFF0D1' },
  // Brand palette only: held tables read as latte, seated as taken gray, cleaning as pale gray.
  reserved: { fill: '#F4E7DA', stroke: '#B4846C', badge: '#B4846C', badgeText: '#FFFFFF' },
  occupied: { fill: '#D9D9D9', stroke: '#BDBDBD', badge: '#8A8A8A', badgeText: '#FFFFFF' },
  cleaning: { fill: '#EFEDEB', stroke: '#CFCAC6', badge: '#A8A19C', badgeText: '#FFFFFF' },
  unavailable: { fill: '#D9D9D9', stroke: '#BDBDBD', badge: '#8A8A8A', badgeText: '#FFFFFF' },
  neutral: { fill: '#FFFFFF', stroke: '#7D5A50', badge: '#7D5A50', badgeText: '#FFF0D1' },
  selected: { fill: '#7D5A50', stroke: '#7D5A50', badge: '#FFF0D1', badgeText: '#7D5A50' },
}

export function tableVisual(status: string | null | undefined, selected = false): TableVisual {
  if (selected) return 'selected'
  if (!status) return 'available'
  const s = status.toLowerCase()
  if (s === 'reserved') return 'reserved'
  if (s === 'occupied') return 'occupied'
  if (s === 'cleaning' || s === 'not_available' || s === 'not available') return 'cleaning'
  if (s === 'unavailable') return 'unavailable'
  if (s === 'neutral') return 'neutral'
  return 'available'
}

export const TABLE_STATUS_CONFIG = {
  available: {
    label: 'Available',
    color: '#7D5A50',
    badgeClass: 'bg-white text-[#2D1E17] border-[#7D5A50]',
    dotClass: 'bg-white ring-1 ring-[#7D5A50]',
    btnClass: 'bg-[#7D5A50] hover:bg-[#65463D] text-[#FFF0D1]',
    icon: 'heroicons:check-circle',
  },
  reserved: {
    label: 'Reserved',
    color: '#B4846C',
    badgeClass: 'bg-[#F4E7DA] text-[#5B3F33] border-[#B4846C]',
    dotClass: 'bg-[#B4846C]',
    btnClass: 'bg-[#B4846C] hover:bg-[#9C6F58] text-white',
    icon: 'heroicons:calendar-days',
  },
  occupied: {
    label: 'Occupied',
    color: '#8A8A8A',
    badgeClass: 'bg-[#D9D9D9] text-[#3D3D3D] border-[#BDBDBD]',
    dotClass: 'bg-[#8A8A8A]',
    btnClass: 'bg-[#8A8A8A] hover:bg-[#757575] text-white',
    icon: 'heroicons:user-group',
  },
  cleaning: {
    label: 'Not Available',
    sublabel: 'Cleaning / Reset',
    color: '#A8A19C',
    badgeClass: 'bg-[#EFEDEB] text-[#5C5550] border-[#CFCAC6]',
    dotClass: 'bg-[#A8A19C]',
    btnClass: 'bg-[#A8A19C] hover:bg-[#8F8883] text-white',
    icon: 'heroicons:no-symbol',
  },
} as const

export function getTableStatusMeta(status: string | null | undefined) {
  const s = (status || '').toLowerCase()
  if (s === 'reserved') return TABLE_STATUS_CONFIG.reserved
  if (s === 'occupied') return TABLE_STATUS_CONFIG.occupied
  if (s === 'cleaning' || s === 'unavailable' || s === 'not_available' || s === 'not available') {
    return TABLE_STATUS_CONFIG.cleaning
  }
  return TABLE_STATUS_CONFIG.available
}
