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
