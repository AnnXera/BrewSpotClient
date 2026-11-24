<script setup lang="ts">
// A manager or the owner approves something on the register: pick who, enter their PIN.
// Same look as the refund modal's approval side. The parent sends the request and passes back any error.

interface ApprovingManager {
  uuid: string
  name: string
  role: string
  has_pin: boolean
  is_locked: boolean
}

const props = withDefaults(defineProps<{
  confirmLabel: string // e.g. "Approve and log 2 spoiled Latte"
  busy?: boolean
  error?: string
  attemptsLeft?: number | null
  rejectKey?: number // bump after a rejected PIN: the boxes shake and the PIN clears
}>(), { busy: false, error: '', attemptsLeft: null, rejectKey: 0 })

const emit = defineEmits<{
  submit: [managerUuid: string, pin: string]
  cancel: []
}>()

const PIN_LENGTH = 6
const service = useDevicePosService()

const managers = ref<ApprovingManager[]>([])
const selectedUuid = ref('')
const pin = ref('')
const loading = ref(true)
const loadError = ref('')

async function fetchManagers() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await service.getApprovingManagers()
    managers.value = res.managers ?? []
    selectedUuid.value = managers.value.find(m => m.has_pin && !m.is_locked)?.uuid ?? ''
  } catch (e: any) {
    loadError.value = e?.data?.message || 'Could not load managers for this branch.'
  } finally {
    loading.value = false
  }
}

const selected = computed(() => managers.value.find(m => m.uuid === selectedUuid.value))
const canSubmit = computed(() => !!selectedUuid.value && pin.value.length >= 4 && !props.busy)
const hint = computed(() => {
  if (!selectedUuid.value) return 'Pick a manager to approve'
  if (pin.value.length < 4) return 'Enter PIN to approve'
  return ''
})

watch(() => props.rejectKey, () => { pin.value = '' })

function press(d: string) {
  if (props.busy || pin.value.length >= PIN_LENGTH) return
  pin.value += d
}
function backspace() {
  if (!props.busy) pin.value = pin.value.slice(0, -1)
}
function clear() {
  if (!props.busy) pin.value = ''
}
function submit() {
  if (canSubmit.value) emit('submit', selectedUuid.value, pin.value)
}

function onKey(e: KeyboardEvent) {
  if (props.busy) return
  if (e.target instanceof HTMLInputElement && e.target.type === 'text') return
  if (e.key >= '0' && e.key <= '9') { e.preventDefault(); press(e.key) }
  else if (e.key === 'Backspace') { e.preventDefault(); backspace() }
  else if (e.key === 'Enter') { e.preventDefault(); submit() }
}

onMounted(() => {
  fetchManagers()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="flex flex-col">
    <!-- Who approves -->
    <div v-if="loading" class="flex gap-2" aria-busy="true" aria-label="Loading managers">
      <div class="h-14 flex-1 rounded-xl bg-[#F3EBE2] animate-pulse" />
      <div class="h-14 flex-1 rounded-xl bg-[#F3EBE2] animate-pulse" />
    </div>
    <div v-else-if="loadError" class="flex items-center justify-between gap-3 text-sm text-red-800">
      <span>{{ loadError }}</span>
      <button type="button" class="min-h-11 px-3 shrink-0 rounded-lg border border-[#D6C5B8] bg-white font-semibold text-[#2d201b] hover:bg-[#F3EBE2]" @click="fetchManagers">Retry</button>
    </div>
    <p v-else-if="!managers.length" class="text-sm text-[#6B5048]">
      No one at this branch can approve yet. An owner can give a staff member the manager role and a PIN.
    </p>
    <fieldset v-else :disabled="busy">
      <legend class="sr-only">Approving manager</legend>
      <div class="flex flex-wrap gap-2 max-h-[7.5rem] overflow-y-auto">
        <label
          v-for="m in managers"
          :key="m.uuid"
          class="choice flex-1 basis-[9.5rem] min-h-14 flex flex-col justify-center px-3.5 py-2 rounded-xl border transition-colors"
          :class="[
            selectedUuid === m.uuid ? 'border-[#7B5A50] bg-white shadow-[inset_0_0_0_1px_#7B5A50]' : 'border-[#E2D5C8] bg-white/60 hover:bg-white',
            (!m.has_pin || m.is_locked) ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer',
          ]"
        >
          <input v-model="selectedUuid" type="radio" name="approver" :value="m.uuid" :disabled="!m.has_pin || m.is_locked" class="sr-only" @change="clear" />
          <span class="text-sm font-semibold text-[#2d201b] truncate">{{ m.name }}</span>
          <span class="text-xs truncate" :class="!m.has_pin ? 'text-amber-800' : m.is_locked ? 'text-red-800' : 'text-[#6B5048]'">
            {{ !m.has_pin ? 'No PIN set' : m.is_locked ? 'PIN locked' : m.role }}
          </span>
        </label>
      </div>
    </fieldset>

    <!-- PIN -->
    <p id="approval-pin-label" class="sr-only">{{ selected ? `${selected.name}'s PIN` : 'Manager PIN' }}</p>
    <div
      :key="rejectKey"
      class="mt-4 flex justify-center gap-2"
      :class="{ 'pin-reject': rejectKey > 0 }"
      role="img"
      :aria-label="`${pin.length} of ${PIN_LENGTH} digits entered`"
    >
      <span
        v-for="i in PIN_LENGTH"
        :key="i"
        class="w-10 h-12 rounded-lg border-2 flex items-center justify-center transition-colors duration-150"
        :class="pin.length >= i ? 'border-[#7B5A50] bg-white' : pin.length + 1 === i && !busy ? 'border-[#7B5A50]/50 bg-white' : 'border-[#E2D5C8] bg-white/60'"
      >
        <span v-if="pin.length >= i" class="w-3 h-3 rounded-full bg-[#2d201b]" />
      </span>
    </div>

    <div class="min-h-9 mt-2 text-center text-sm" aria-live="polite">
      <template v-if="error">
        <p class="font-semibold text-red-800">{{ error }}</p>
        <p v-if="attemptsLeft != null && attemptsLeft > 0" class="text-xs text-red-800">
          {{ attemptsLeft }} {{ attemptsLeft === 1 ? 'try' : 'tries' }} left before this PIN locks
        </p>
      </template>
    </div>

    <!-- Keypad -->
    <div class="grid grid-cols-3 gap-2" aria-labelledby="approval-pin-label">
      <button
        v-for="n in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
        :key="n"
        type="button"
        :disabled="busy"
        class="key h-14 rounded-xl bg-white border border-[#E2D5C8] text-xl font-semibold text-[#2d201b] tabular-nums"
        @click="press(n)"
      >{{ n }}</button>
      <button type="button" :disabled="busy || !pin.length" class="key h-14 rounded-xl text-sm font-semibold text-[#6B5048]" @click="clear">Clear</button>
      <button type="button" :disabled="busy" class="key h-14 rounded-xl bg-white border border-[#E2D5C8] text-xl font-semibold text-[#2d201b] tabular-nums" @click="press('0')">0</button>
      <button type="button" :disabled="busy || !pin.length" aria-label="Delete last digit" class="key h-14 rounded-xl flex items-center justify-center text-[#6B5048]" @click="backspace">
        <Icon name="heroicons:backspace" class="w-6 h-6" />
      </button>
    </div>

    <div class="mt-4 grid grid-cols-[auto_1fr] gap-2">
      <button
        type="button"
        :disabled="busy"
        class="h-14 px-4 rounded-xl border border-[#D6C5B8] bg-white text-sm font-semibold text-[#2d201b] hover:bg-[#F3EBE2] disabled:opacity-50"
        @click="emit('cancel')"
      >
        Back
      </button>
      <button
        type="button"
        :disabled="!canSubmit"
        class="h-14 rounded-xl bg-[#7B5A50] hover:bg-[#65463D] text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors disabled:bg-[#E2D5C8] disabled:text-[#6B5048] disabled:cursor-not-allowed"
        @click="submit"
      >
        <Icon v-if="busy" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
        {{ busy ? 'Checking PIN' : hint || confirmLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.key {
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 120ms, transform 80ms;
}
.key:not(:disabled):hover { background-color: #F3EBE2; }
.key:not(:disabled):active { background-color: #EADFD3; transform: scale(0.96); }
.key:disabled { opacity: 0.45; }

.pin-reject { animation: pin-shake 360ms cubic-bezier(0.36, 0.07, 0.19, 0.97); }
@keyframes pin-shake {
  15%, 85% { transform: translateX(-2px); }
  30%, 70% { transform: translateX(5px); }
  45% { transform: translateX(-7px); }
  60% { transform: translateX(7px); }
}

button:focus-visible,
.choice:has(input:focus-visible) {
  outline: 2px solid #7B5A50;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .pin-reject { animation: none; }
  .key:not(:disabled):active { transform: none; }
}
</style>
