// Live clock for page headers: "12:39PM" and "Mon, Jul 9, 2026". Starts after mount to avoid a hydration mismatch.
export function useNowClock() {
  const now = ref(new Date())
  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    now.value = new Date()
    timer = setInterval(() => (now.value = new Date()), 1000)
  })
  onBeforeUnmount(() => clearInterval(timer))

  const timeLabel = computed(() =>
    now.value.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '').toUpperCase(),
  )
  const dateLabel = computed(() =>
    now.value.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
  )

  return { timeLabel, dateLabel }
}
