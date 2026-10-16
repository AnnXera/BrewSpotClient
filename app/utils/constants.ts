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
