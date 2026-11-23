<!-- app/components/servings/LogIngredientsModal.vue -->
<!-- Ingredients one serving log entry used: the line total and the amount per serving, add-ons included. -->
<script setup lang="ts">
import DialogShell from '~/components/common/DialogShell.vue'
import type { ServingLogDetail, ServingLogEntry, ServingLogIngredient } from '~/services/ServingService'

const props = defineProps<{
  entry: ServingLogEntry | null // the row clicked; shown while the details load
  detail: ServingLogDetail | null
  ingredients: ServingLogIngredient[]
  loading: boolean
  error: string
}>()

defineEmits<{ (e: 'close'): void; (e: 'retry'): void }>()

const shown = computed(() => props.detail ?? props.entry)
const qty = computed(() => shown.value?.quantity ?? 1)
const multi = computed(() => qty.value > 1)
const measured = computed(() => props.ingredients.filter(i => i.measured))
const unmeasured = computed(() => props.ingredients.filter(i => !i.measured))

function time(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function amount(n: number | null) {
  if (n == null) return ''
  return Number.isInteger(n) ? n.toLocaleString('en-PH') : n.toLocaleString('en-PH', { maximumFractionDigits: 2 })
}
</script>

<template>
  <DialogShell
    :open="!!entry"
    :title="shown?.menu_name ?? 'Removed item'"
    icon="heroicons:beaker"
    @close="$emit('close')"
  >
    <!-- Sale details -->
    <div v-if="shown" class="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[#6B5A52]">
      <span class="inline-flex items-center gap-1.5">
        <Icon name="heroicons:shopping-bag" class="w-4 h-4 text-[#B4846C]" />
        <span><span class="font-semibold text-[#3D2B24]">{{ qty }}</span> {{ qty === 1 ? 'serving' : 'servings' }}<template v-if="detail?.size_name">, {{ detail.size_name }}</template></span>
      </span>
      <span class="inline-flex items-center gap-1.5">
        <Icon name="heroicons:hashtag" class="w-4 h-4 text-[#B4846C]" />
        {{ shown.order_number }}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <Icon name="heroicons:clock" class="w-4 h-4 text-[#B4846C]" />
        {{ time(shown.sold_at) }}
      </span>
    </div>

    <!-- Add-ons on this line -->
    <div v-if="detail?.addons.length" class="mt-3 flex flex-wrap items-center gap-1.5">
      <span class="text-[12px] text-[#8B6656]">With</span>
      <span
        v-for="a in detail.addons"
        :key="a.name"
        class="rounded-full bg-[#F1E9DE] px-2.5 py-0.5 text-[12px] font-medium text-[#5E4A42]"
      >
        {{ a.name }}<template v-if="a.quantity > 1"> x{{ a.quantity }}</template>
      </span>
    </div>

    <div class="mt-5">
      <div class="mb-2 flex items-baseline justify-between">
        <h3 class="font-display text-[15px] font-semibold text-[#3D2B24]">Ingredients used</h3>
        <span v-if="!loading && !error && ingredients.length" class="text-[12px] text-[#8B6656]">
          {{ multi ? `Total for ${qty} servings` : 'For this serving' }}
        </span>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-2" aria-busy="true">
        <div v-for="n in 3" :key="n" class="h-[52px] rounded-xl bg-[#FAF4ED] animate-pulse" />
      </div>

      <!-- Error -->
      <div v-else-if="error" role="alert" class="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] text-rose-800">
        <span>{{ error }}</span>
        <button type="button" class="shrink-0 font-semibold underline underline-offset-2 hover:text-rose-900" @click="$emit('retry')">Try again</button>
      </div>

      <!-- Empty -->
      <div v-else-if="!ingredients.length" class="rounded-xl border border-dashed border-[#E3CFB4] px-4 py-6 text-center">
        <p class="font-display text-[14px] font-semibold text-[#3D2B24]">No ingredients recorded</p>
        <p class="mt-0.5 text-[12px] text-[#8B6656]">This item had no recipe when it was sold.</p>
      </div>

      <!-- Ingredients -->
      <ul v-else class="max-h-[300px] overflow-y-auto rounded-xl border border-[#EBE0D2] divide-y divide-[#F1E9DE] bg-white">
        <li
          v-for="i in measured"
          :key="i.name + i.unit"
          class="flex items-center justify-between gap-4 px-4 py-3"
        >
          <span class="min-w-0 truncate text-[14px] font-medium text-[#3D2B24]">{{ i.name }}</span>
          <span class="shrink-0 text-right leading-tight">
            <span class="block text-[15px] font-semibold tabular-nums text-[#3D2B24]">
              {{ amount(i.quantity) }} <span class="text-[13px] font-medium text-[#8B6656]">{{ i.unit }}</span>
            </span>
            <span v-if="multi" class="block text-[12px] tabular-nums text-[#9E8A7E]">
              {{ amount(i.per_serving) }} {{ i.unit }} each
            </span>
          </span>
        </li>
        <li
          v-for="i in unmeasured"
          :key="i.name + i.unit"
          class="flex items-center justify-between gap-4 px-4 py-3"
        >
          <span class="min-w-0 truncate text-[14px] font-medium text-[#3D2B24]">{{ i.name }}</span>
          <span class="shrink-0 text-[13px] text-[#8B6656]">{{ i.unit }}</span>
        </li>
      </ul>
    </div>

    <template #actions>
      <button
        type="button"
        data-autofocus
        class="whitespace-nowrap rounded-[10px] px-5 py-[11px] text-[13px] font-semibold text-white bg-[#3A2923] hover:bg-[#2C1E19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] focus-visible:ring-[#3A2923] transition-colors"
        @click="$emit('close')"
      >
        Done
      </button>
    </template>
  </DialogShell>
</template>
