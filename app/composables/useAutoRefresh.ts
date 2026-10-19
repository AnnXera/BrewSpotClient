// Re-runs a loader on an interval so pages pick up changes made elsewhere (POS sales, bookings, approvals).
// Pauses while the tab is hidden, refreshes as soon as it is visible again, and never overlaps a slow request.
export const AUTO_REFRESH_MS = 30_000

export function useAutoRefresh(
  load: () => unknown,
  options: { interval?: number; enabled?: () => boolean } = {},
) {
  const interval = options.interval ?? AUTO_REFRESH_MS
  let timer: ReturnType<typeof setInterval> | undefined
  let running = false
  let lastRun = Date.now()

  async function tick() {
    if (running || document.hidden || !navigator.onLine) return
    if (options.enabled && !options.enabled()) return
    running = true
    lastRun = Date.now()
    try {
      await load()
    } catch (e) {
      console.warn('Auto refresh failed:', e)
    } finally {
      running = false
    }
  }

  // Coming back to a tab that sat hidden past one interval refreshes right away instead of waiting.
  function onVisible() {
    if (!document.hidden && Date.now() - lastRun >= interval) tick()
  }

  onMounted(() => {
    lastRun = Date.now()
    timer = setInterval(tick, interval)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
  })

  onBeforeUnmount(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onVisible)
  })

  return { refreshNow: tick }
}
