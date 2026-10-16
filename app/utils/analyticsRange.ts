// Date range presets for the owner Analytics page.
import { toDay } from './dashboardFormat'

export type AnalyticsPreset = '7d' | '30d' | '90d' | 'month' | 'last_month' | 'custom'
export type AnalyticsTab = 'sales' | 'menu' | 'branches' | 'operations'

export interface AnalyticsFilterState {
    preset: AnalyticsPreset
    from: string
    to: string
    branch: string | null
}

export const ANALYTICS_PRESETS: { value: AnalyticsPreset; label: string }[] = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: 'month', label: 'This month' },
    { value: 'last_month', label: 'Last month' },
    { value: 'custom', label: 'Custom' },
]

// Inclusive dates for a preset, ending today.
export function rangeFor(preset: Exclude<AnalyticsPreset, 'custom'>, now = new Date()): { from: string; to: string } {
    const back = (days: number) => { const d = new Date(now); d.setDate(d.getDate() - days); return d }
    switch (preset) {
        case '7d': return { from: toDay(back(6)), to: toDay(now) }
        case '90d': return { from: toDay(back(89)), to: toDay(now) }
        case 'month': return { from: toDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDay(now) }
        case 'last_month': return {
            from: toDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
            to: toDay(new Date(now.getFullYear(), now.getMonth(), 0)),
        }
        default: return { from: toDay(back(29)), to: toDay(now) }
    }
}
