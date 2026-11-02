export const INGREDIENT_UNITS = [
    'tbsp',
    'tsp',
    'ml',
    'l',
    'g',
    'kg',
    'pumps',
    'shots',
    'cups',
    'pieces',
    'oz',
    'lb',
    'slice',
    'dash',
    'pinch',
    'stick',
    'pint'
];

// INGREDIENT_UNITS as DropdownList options.
export const INGREDIENT_UNIT_OPTIONS = INGREDIENT_UNITS.map(unit => ({ value: unit, label: unit }));

// Sidebar links on every owner page.
export const OWNER_NAV_LINKS = [
    { label: 'Dashboard', to: '/owner/dashboard', icon: 'squares-2x2' },
    { label: 'Cafe Management', to: '/owner/cafes', icon: 'building-storefront' },
    { label: 'Menu Management', to: '/owner/menu-management', icon: 'book-open' },
    { label: 'Analytics', to: '/owner/analytics', icon: 'chart-bar' },
    { label: 'Subscription', to: '/owner/subscription', icon: 'credit-card' },
];

// Sidebar links on manager pages.
export const MANAGER_NAV_LINKS = [
    { label: 'Dashboard', to: '/manager/dashboard', icon: 'squares-2x2' },
    { label: 'Cafe Management', to: '/manager/cafe', icon: 'building-storefront' },
    { label: 'Servings', to: '/manager/servings', icon: 'cake' },
    { label: 'Reservations', to: '/manager/reservations', icon: 'calendar-days' },
    { label: 'Floor Plan', to: '/manager/floor-plan', icon: 'map' },
];

// Sidebar links on admin pages.
export const ADMIN_NAV_LINKS = [
    { label: 'Dashboard', to: '/admin/dashboard', icon: 'squares-2x2' },
    { label: 'Owner Management', to: '/admin/owners', icon: 'users' },
    { label: 'Approval Status', to: '/admin/approvals', icon: 'check-circle' },
    { label: 'Subscriptions', to: '/admin/subscriptions', icon: 'credit-card' },
    { label: 'Payment History', to: '/admin/payments', icon: 'clipboard' },
];
