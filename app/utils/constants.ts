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

// Sidebar links, grouped into sections. An `isHeader` entry draws a divider and a small label.
const navHeader = (label: string) => ({ label, to: '', isHeader: true });

// Sidebar links on every owner page.
export const OWNER_NAV_LINKS = [
    navHeader('Overview'),
    { label: 'Dashboard', to: '/owner/dashboard', icon: 'squares-2x2' },
    { label: 'Analytics', to: '/owner/analytics', icon: 'chart-bar' },
    { label: 'Activity Log', to: '/owner/activity-log', icon: 'clipboard-document-list' },
    navHeader('Cafe Setup'),
    { label: 'Cafe Management', to: '/owner/cafes', icon: 'building-storefront' },
    { label: 'Menu Management', to: '/owner/menu-management', icon: 'book-open' },
    // Same screens as the manager's, for whichever branch the owner picks.
    navHeader('Daily Operations'),
    { label: 'Servings', to: '/owner/servings', icon: 'cake' },
    { label: 'Reservations', to: '/owner/reservations', icon: 'calendar-days' },
    { label: 'Floor Plan', to: '/owner/floor-plan', icon: 'map' },
    navHeader('Billing'),
    { label: 'Subscription', to: '/owner/subscription', icon: 'credit-card' },
];

// Sidebar links on manager pages.
export const MANAGER_NAV_LINKS = [
    navHeader('Overview'),
    { label: 'Dashboard', to: '/manager/dashboard', icon: 'squares-2x2' },
    { label: 'Activity Log', to: '/manager/activity-log', icon: 'clipboard-document-list' },
    navHeader('Branch'),
    { label: 'Cafe Management', to: '/manager/cafe', icon: 'building-storefront' },
    navHeader('Daily Operations'),
    { label: 'Servings', to: '/manager/servings', icon: 'cake' },
    { label: 'Reservations', to: '/manager/reservations', icon: 'calendar-days' },
    { label: 'Floor Plan', to: '/manager/floor-plan', icon: 'map' },
];

// Sidebar links on admin pages.
export const ADMIN_NAV_LINKS = [
    navHeader('Overview'),
    { label: 'Dashboard', to: '/admin/dashboard', icon: 'squares-2x2' },
    navHeader('Cafe Owners'),
    { label: 'Owner Management', to: '/admin/owners', icon: 'users' },
    { label: 'Approval Status', to: '/admin/approvals', icon: 'check-circle' },
    navHeader('Billing'),
    { label: 'Subscriptions', to: '/admin/subscriptions', icon: 'credit-card' },
    { label: 'Payment History', to: '/admin/payments', icon: 'clipboard' },
];
