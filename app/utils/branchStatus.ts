/**
 * Branch statuses that can be operated. Mirrors CafeBranch::OPERATIONAL_STATUSES on the
 * server: pending and rejected branches are view-only (no staff, POS, menu, servings,
 * reservations or floor plans). Inactive is the owner's own pause and stays usable.
 */
export const OPERATIONAL_BRANCH_STATUSES = ['active', 'inactive'] as const

export function isOperationalBranchStatus(status: string | null | undefined): boolean {
  return OPERATIONAL_BRANCH_STATUSES.includes((status || '').toLowerCase() as typeof OPERATIONAL_BRANCH_STATUSES[number])
}
