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
  available: { fill: '#F0FDF4', stroke: '#16A34A', badge: '#16A34A', badgeText: '#FFFFFF' },
  reserved: { fill: '#FFFBEB', stroke: '#D97706', badge: '#D97706', badgeText: '#FFFFFF' },
  occupied: { fill: '#EFF6FF', stroke: '#2563EB', badge: '#2563EB', badgeText: '#FFFFFF' },
  cleaning: { fill: '#F3F4F6', stroke: '#6B7280', badge: '#6B7280', badgeText: '#FFFFFF' },
  unavailable: { fill: '#F3F4F6', stroke: '#9CA3AF', badge: '#6B7280', badgeText: '#FFFFFF' },
  neutral: { fill: '#FFFFFF', stroke: '#7D5A50', badge: '#7D5A50', badgeText: '#FFF0D1' },
  selected: { fill: '#3D2B24', stroke: '#A96746', badge: '#FFF0D1', badgeText: '#3D2B24' },
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
    color: '#16A34A',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    icon: 'heroicons:check-circle',
  },
  reserved: {
    label: 'Reserved',
    color: '#D97706',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    icon: 'heroicons:calendar-days',
  },
  occupied: {
    label: 'Occupied',
    color: '#2563EB',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    icon: 'heroicons:user-group',
  },
  cleaning: {
    label: 'Not Available',
    sublabel: 'Cleaning / Reset',
    color: '#6B7280',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
    dotClass: 'bg-gray-500',
    btnClass: 'bg-gray-600 hover:bg-gray-700 text-white',
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
