import type { OwnerListItem, OwnerStats } from '~/services/OwnerManagementService'

/**
 * Sample owners for previewing the Owner Management page before there's
 * real data in the database. Covers every status so filters have something
 * to actually filter, and a few different cafes/dates so search and the
 * date filter are testable too.
 *
 * Delete this file (and flip USE_MOCK_DATA to false in ownermanagement.vue)
 * once you have real owners to work with.
 */
export const mockOwners: OwnerListItem[] = [
    {
        uuid: 'mock-uuid-1',
        name: 'Sofia Miles',
        cafe_name: 'La Vida Cafe',
        email: 'sofia@bp.com',
        phone_number: '09123456789',
        status: 'active',
        subscription: 'Growth Plan',
        date_joined: '2026-01-20T08:00:00Z',
    },
    {
        uuid: 'mock-uuid-2',
        name: 'Marco Reyes',
        cafe_name: 'Kape Lokal',
        email: 'marco.reyes@kapelokal.ph',
        phone_number: '09171234567',
        status: 'suspended',
        subscription: 'Starter Plan',
        date_joined: '2026-01-18T08:00:00Z',
    },
    {
        uuid: 'mock-uuid-3',
        name: 'Andrea Cruz',
        cafe_name: 'Brew & Bean Co.',
        email: 'andrea.cruz@brewbean.co',
        phone_number: '09209876543',
        status: 'inactive',
        subscription: null,
        date_joined: '2026-01-15T08:00:00Z',
    },
    {
        uuid: 'mock-uuid-4',
        name: 'Julian Santos',
        cafe_name: 'The Daily Grind',
        email: 'julian@dailygrind.com',
        phone_number: '09051112233',
        status: 'pending_approval',
        subscription: null,
        date_joined: '2026-01-25T08:00:00Z',
    },
    {
        uuid: 'mock-uuid-5',
        name: 'Patricia Lim',
        cafe_name: 'Cafe Solene',
        email: 'patricia.lim@solene.ph',
        phone_number: '09184445566',
        status: 'approved',
        subscription: null,
        date_joined: '2026-01-22T08:00:00Z',
    },
    {
        uuid: 'mock-uuid-6',
        name: 'Diego Fernandez',
        cafe_name: 'Roast House Manila',
        email: 'diego@roasthouse.mnl',
        phone_number: '09997778899',
        status: 'rejected',
        subscription: null,
        date_joined: '2026-01-10T08:00:00Z',
    },
    {
        uuid: 'mock-uuid-7',
        name: 'Isabelle Tan',
        cafe_name: 'Common Grounds',
        email: 'isabelle.tan@commongrounds.co',
        phone_number: '09261239876',
        status: 'active',
        subscription: 'Pro Plan',
        date_joined: '2026-01-05T08:00:00Z',
    },
    {
        uuid: 'mock-uuid-8',
        name: 'Ramon Villanueva',
        cafe_name: 'Sundried Espresso Bar',
        email: 'ramon.v@sundried.ph',
        phone_number: '09334455667',
        status: 'inactive',
        subscription: null,
        date_joined: '2025-12-28T08:00:00Z',
    },
]

export const mockOwnerStats: OwnerStats = {
    total_owners: mockOwners.length,
    active: mockOwners.filter((o) => o.status === 'active').length,
    suspended: mockOwners.filter((o) => o.status === 'suspended').length,
    inactive: mockOwners.filter((o) => o.status === 'inactive').length,
    inactive_or_suspended: mockOwners.filter((o) => o.status === 'inactive' || o.status === 'suspended').length,
}