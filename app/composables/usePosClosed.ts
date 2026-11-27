// Set when the register is outside the cafe's opening hours (server answered 423).
// null while open. opensAt is an ISO time, or null when the cafe has no upcoming hours.
export function usePosClosed() {
  return useState<{ opensAt: string | null } | null>('pos_closed', () => null)
}
