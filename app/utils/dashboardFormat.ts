// Number and date formatting shared by the owner dashboard panels.

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })
const pesoCents = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pesoCompact = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: 'compact', maximumFractionDigits: 1 })
const count = new Intl.NumberFormat('en-PH')

export const formatPeso = (n: number) => peso.format(n)
export const formatPesoCents = (n: number) => pesoCents.format(n)
export const formatPesoCompact = (n: number) => (Math.abs(n) < 1000 ? peso.format(n) : pesoCompact.format(n))
export const formatCount = (n: number) => count.format(n)

// Y-m-d strings are calendar days; parse them as local dates, not UTC midnight.
export function parseDay(day: string): Date {
    const [y, m, d] = day.split('-').map(Number)
    return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
    return parseDay(day).toLocaleDateString('en-PH', opts)
}

export function formatSpan(from: string, to: string) {
    const a = parseDay(from)
    const b = parseDay(to)
    const sameYear = a.getFullYear() === b.getFullYear()
    const left = a.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
    const right = b.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${left} – ${right}`
}

// Round an axis maximum up to a number that splits cleanly into four ticks.
export function niceMax(value: number): number {
    if (value <= 0) return 1000
    const exp = Math.pow(10, Math.floor(Math.log10(value)))
    const steps = [1, 1.2, 1.6, 2, 2.4, 3, 4, 6, 8, 10]
    const step = steps.find(s => s * exp >= value) ?? 10
    return step * exp
}

// Local calendar day as Y-m-d (what the API filters take).
export function toDay(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const percent = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 })
export const formatPercent = (n: number) => `${percent.format(n)}%`

// 0..23 as "9 AM" / "12 PM".
export function formatHour(h: number): string {
    const suffix = h < 12 ? 'AM' : 'PM'
    return `${h % 12 === 0 ? 12 : h % 12} ${suffix}`
}

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Payment method keys from the POS ("gcash", "card") as display labels.
export function formatMethod(key: string): string {
    const known: Record<string, string> = { cash: 'Cash', gcash: 'GCash', maya: 'Maya', paymaya: 'Maya', card: 'Card', unknown: 'Not recorded' }
    return known[key.toLowerCase()] ?? key.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
