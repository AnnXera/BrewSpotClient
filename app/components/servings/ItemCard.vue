<!-- app/components/servings/ItemCard.vue -->
<!-- One item on a category's servings page. Shows the unsaved limit/eye (`limit`, `enabled`); the parent owns the draft. -->
<script setup lang="ts">
import type { CategoryServingItem, ServingItemStatus } from '~/services/ServingService'

const MAX_LIMIT = 100000

const props = defineProps<{
  item: CategoryServingItem
  limit: number
  enabled: boolean
  error?: string
}>()

const emit = defineEmits<{
  'update:limit': [value: number]
  toggle: []
}>()

// Stock follows the draft limit: raising the limit by 5 adds 5 to what is left.
const stock = computed(() =>
  props.item.daily_limit > 0
    ? Math.max(0, props.item.available_stock + props.limit - props.item.daily_limit)
    : props.limit,
)

// Items visible at the branch start out available; the manager decides to switch one off.
// A limit of 0 means no limit has been set yet, so it is not "sold out".
const status = computed<ServingItemStatus>(() => {
  if (!props.item.editable) return 'branch_unavailable'
  if (!props.enabled) return 'unavailable'
  return props.limit > 0 && stock.value === 0 ? 'sold_out' : 'available'
})

const badge = computed(() => ({
  available: { label: 'Available', cls: 'bg-[#D4EDDA] text-[#28A745]' },
  sold_out: { label: 'Sold Out', cls: 'bg-[#FFE0E0] text-[#B31E1E]' },
  unavailable: { label: 'Unavailable', cls: 'bg-[#F0E8E5]/70 border border-[#B4846C] text-[#B4846C]' },
  branch_unavailable: { label: 'Unavailable for this branch', cls: 'bg-[#AAAAAA]/70 text-[#5A5A5A]' },
}[status.value]))

const editing = ref(false)
const text = ref<string | number>('')
const input = ref<HTMLInputElement | null>(null)

async function startEdit() {
  if (!props.item.editable) return
  text.value = String(props.limit)
  editing.value = true
  await nextTick()
  input.value?.select()
}

function commit() {
  if (!editing.value) return
  editing.value = false
  // A number input's v-model gives a number, or '' when empty.
  const raw = String(text.value).trim()
  const n = Math.floor(Number(raw))
  if (raw !== '' && Number.isFinite(n)) {
    emit('update:limit', Math.min(MAX_LIMIT, Math.max(0, n)))
  }
}

function onEye() {
  if (props.item.editable) emit('toggle')
}
</script>

<template>
  <div class="relative">
    <div
      class="bg-white border rounded-2xl p-[22px] flex flex-col gap-3"
      :class="error ? 'border-[#B31E1E]' : 'border-[#EDD8CC]'"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <img v-if="item.picture" :src="item.picture" :alt="item.menu_name" class="size-9 rounded-full object-cover shrink-0">
          <div v-else class="size-9 rounded-full bg-[#FFF8EA] flex items-center justify-center shrink-0">
            <Icon name="heroicons:cake" class="w-5 h-5 text-[#9E7060]" />
          </div>
          <p class="font-display font-semibold text-[20px] text-[#3D2B24] truncate">{{ item.menu_name }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 text-[#3D2B24] disabled:cursor-not-allowed"
          :disabled="!item.editable"
          :aria-label="enabled ? 'Mark unavailable for today' : 'Mark available for today'"
          :aria-pressed="enabled"
          @click="onEye"
        >
          <Icon :name="enabled ? 'heroicons:eye' : 'heroicons:eye-slash'" class="w-6 h-6" />
        </button>
      </div>

      <div class="bg-[#F2ECE5] rounded-2xl p-4 flex flex-col">
        <div class="flex items-center justify-between h-[38px] pb-2.5">
          <span class="font-display font-medium text-[16px] text-[#3D2B24]">Status</span>
          <span class="font-display font-semibold text-[12px] rounded-full px-2.5 py-[5px]" :class="badge.cls">{{ badge.label }}</span>
        </div>

        <div class="flex items-center justify-between pb-2.5">
          <span class="font-display font-medium text-[16px] text-[#3D2B24]">Daily Limit</span>
          <input
            v-if="editing"
            ref="input"
            v-model="text"
            type="number"
            min="0"
            :max="MAX_LIMIT"
            step="1"
            inputmode="numeric"
            aria-label="Daily limit"
            class="w-[84px] bg-white rounded-md px-3 py-1 font-display font-semibold text-[16px] text-[#7D5A50] outline-none ring-2 ring-[#7D5A50]"
            @blur="commit"
            @keydown.enter.prevent="commit"
            @keydown.esc.prevent="editing = false"
          >
          <button
            v-else
            type="button"
            class="bg-white rounded-md px-3 py-1 flex items-center gap-3 font-display font-semibold text-[16px] text-[#7D5A50] disabled:cursor-not-allowed"
            :disabled="!item.editable"
            aria-label="Edit daily limit"
            @click="startEdit"
          >
            {{ limit }}
            <Icon name="heroicons:pencil-square" class="w-4 h-4" />
          </button>
        </div>

        <div class="flex items-center justify-between">
          <span class="font-display font-medium text-[16px] text-[#3D2B24]">Available Stock</span>
          <span class="w-[72px] text-center font-display font-semibold text-[16px] text-[#7D5A50]">{{ stock }}</span>
        </div>
      </div>

      <p v-if="error" role="alert" class="text-[12px] text-[#B31E1E]">{{ error }}</p>
    </div>

    <!-- Switched off for this branch: greyed out and not editable -->
    <div v-if="!item.editable" class="absolute inset-0 rounded-2xl bg-[#D9D9D9]/50" aria-hidden="true" />
  </div>
</template>
