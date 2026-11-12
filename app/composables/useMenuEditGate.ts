// app/composables/useMenuEditGate.ts
// Menu Management stays viewable without the plan feature or after the subscription lapses;
// only adding, editing and deleting are locked. Call canEditMenu() before any change: it
// returns false and shows the upgrade / renew popup when the owner can't edit.
export function useMenuEditGate(refresh = true) {
  const { fetchCurrentSubscription } = usePlanFeature()
  const { requireFeature } = useSubscriptionGate()

  // Refresh quietly on each page so a subscription that just lapsed is caught.
  if (refresh) fetchCurrentSubscription(true, true)

  function canEditMenu(): boolean {
    return requireFeature('menu_management', 'Menu management')
  }

  return { canEditMenu }
}
