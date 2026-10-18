//app/utils/roleRedirects.ts
export const roleRedirects: Record<string, string> = {
    'Admin': '/admin/dashboard',
    'Cafe Owner': '/owner/dashboard',
    'Manager': '/manager/dashboard',
    'Cashier': '/cashier/dashboard',
}

export function getRedirectForRole(role: string | null | undefined): string {
    if (!role) return '/login'
    return roleRedirects[role] ?? '/login'
}

// Only same-site paths ("/pos/setup"), never "//evil.com" or "https://...".
export function getSafeRedirect(value: unknown): string | null {
    if (typeof value !== 'string') return null
    if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
    return value
}