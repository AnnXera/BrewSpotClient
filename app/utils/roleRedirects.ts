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