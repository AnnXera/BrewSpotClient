<!-- app/components/pos/ReservationActions.vue -->
<!-- The next step for one booking, mirroring the server's transitions and time rules:
     bookings are saved confirmed, so: confirmed -> seat (no-show once started, cancel before); seated -> finish.
     An older pending booking can only be cancelled.
     Cancel and no-show ask for a second tap so a stray touch can't drop a booking. -->
<script setup lang="ts">
const props = defineProps<{
  status: string
  start: string
  now: Date
  busy?: boolean
}>()

const emit = defineEmits<{ act: [status: string] }>()

const started = computed(() => new Date(props.start).getTime() <= props.now.getTime())

const primary = computed(() => {
  if (props.status === 'confirmed') return { status: 'seated', label: 'Seat', icon: 'heroicons:arrow-right-end-on-rectangle' }
  if (props.status === 'seated') return { status: 'completed', label: 'Finish', icon: 'heroicons:check-badge' }
  return null
})

const secondary = computed(() => {
  if (props.status === 'confirmed' && started.value) return { status: 'no_show', label: 'No-show' }
  if ((props.status === 'pending' || props.status === 'confirmed') && !started.value) return { status: 'cancelled', label: 'Cancel' }
  return null
})

const armed = ref(false)
let disarmTimer: ReturnType<typeof setTimeout> | undefined

function tapSecondary() {
  if (!secondary.value) return
  if (!armed.value) {
    armed.value = true
    clearTimeout(disarmTimer)
    disarmTimer = setTimeout(() => { armed.value = false }, 3000)
    return
  }
  armed.value = false
  clearTimeout(disarmTimer)
  emit('act', secondary.value.status)
}

onUnmounted(() => clearTimeout(disarmTimer))
</script>

<template>
  <div v-if="primary || secondary" class="flex items-center gap-2" @click.stop>
    <button
      v-if="secondary"
      type="button"
      :disabled="busy"
      class="rsv-press h-11 rounded-xl px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-40"
      :class="armed
        ? 'bg-[#2D1E17] text-[#FFF0D1]'
        : 'text-[#7D5A50] hover:bg-[#F6ECE0]'"
      :aria-label="armed ? `Tap again to mark ${secondary.label.toLowerCase()}` : secondary.label"
      @click="tapSecondary"
    >
      {{ armed ? `Tap to ${secondary.label.toLowerCase()}` : secondary.label }}
    </button>
    <button
      v-if="primary"
      type="button"
      :disabled="busy"
      class="rsv-press inline-flex h-11 min-w-[92px] items-center justify-center gap-1.5 rounded-xl px-4 text-[14px] font-semibold transition-colors disabled:opacity-40"
      :class="primary.status === 'completed'
        ? 'border border-[#7D5A50] text-[#2D1E17] hover:bg-[#F6ECE0]'
        : 'bg-[#7D5A50] text-[#FFF0D1] hover:bg-[#65463D]'"
      @click="emit('act', primary.status)"
    >
      <Icon :name="primary.icon" class="size-[18px]" />
      {{ primary.label }}
    </button>
  </div>
</template>

<style scoped>
.rsv-press {
  transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1), background-color 140ms ease, color 140ms ease;
}
.rsv-press:active:not(:disabled) {
  transform: scale(0.96);
}
.rsv-press:focus-visible {
  outline: 2px solid #7D5A50;
  outline-offset: 2px;
}
</style>
