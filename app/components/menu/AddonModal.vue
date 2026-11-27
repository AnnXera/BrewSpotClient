<!-- app/components/menu/AddonModal.vue -->
<!-- Add or edit an add-on. The add-on is its own ingredient ("Oreo Crumbles" uses Oreo Crumbles), so the
     recipe is just how much one serving uses. Boxed sections with uppercase headings; LowStockLimitModal shares this look. -->
<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useMenuService } from '~/composables/useMenuService'
import { INGREDIENT_UNITS, INGREDIENT_UNIT_OPTIONS } from '~/utils/constants'
import { parseQuantity, formatQuantity, sanitizeQuantity } from '~/utils/fraction'
import type { Ingredient, MenuAddon } from '~/services/MenuService'
import IngredientPicker from '~/components/menu/IngredientPicker.vue'
import ConfirmModal from '~/components/common/ConfirmModal.vue'
import DropdownList from '~/components/common/DropdownList.vue'
import SearchInput from '~/components/common/SearchInput.vue'
import AlertModal from '~/components/common/AlertModal.vue'
import { useDialogs } from '~/composables/useDialogs'

interface LegacyRow {
  ingredient_uuid: string | null
  ingredient_name: string
  quantity: number
  unit: string
}

// Mirrors MenuAddon::MAX_QUANTITY_LIMIT on the server.
const MAX_PER_DRINK = 10

const props = defineProps<{
  show: boolean
  addon: MenuAddon | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const menuService = useMenuService()
const { confirmDialog, alertDialog, askConfirm, runConfirm, showAlert } = useDialogs()

const form = ref({
  name: '',
  price: '',
  max_quantity: '' as number | '', // empty = no limit
  is_available: true,
  amount: '', // per serving, e.g. "1/4" or "15"; empty = not tracked
  unit: INGREDIENT_UNITS[0] ?? '',
  item_uuids: [] as string[],
})

// An older add-on whose recipe isn't just "itself" (several ingredients, or one with another name).
// Kept exactly as it was unless the owner switches it to the add-on's own name.
const legacyRecipes = ref<LegacyRow[]>([])

interface OfferableItem {
  uuid: string
  menu_name: string
  category_uuid: string | null
  category_name: string | null
  base_price: string | number | null
  picture: string | null
}

const ingredients = ref<Ingredient[]>([])
const menuItems = ref<OfferableItem[]>([])
const itemSearch = ref('')
// 'all', 'uncategorized', or a category uuid
const itemCategory = ref('all')

async function loadOptions() {
  const [ingredientRes, itemRes] = await Promise.allSettled([menuService.getIngredients(), menuService.getMenuItems()])
  ingredients.value = ingredientRes.status === 'fulfilled' ? ingredientRes.value.ingredients ?? [] : []
  if (itemRes.status === 'fulfilled') {
    const items = itemRes.value.items as any
    menuItems.value = (Array.isArray(items) ? items : items?.data ?? []).map((i: any) => ({
      uuid: i.uuid,
      menu_name: i.menu_name,
      category_uuid: i.category_uuid ?? null,
      category_name: i.category_name ?? null,
      base_price: i.base_price ?? null,
      picture: i.picture ?? null,
    }))
  } else {
    menuItems.value = []
  }
}

// Same rule as the server's Ingredient::normalize().
const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

// The tracked ingredient this add-on's name matches, if any. Its unit is fixed (the server rejects another).
const matchedIngredient = computed(() => {
  const key = normalizeName(form.value.name)
  return key ? ingredients.value.find(i => normalizeName(i.name) === key) ?? null : null
})

watch(matchedIngredient, (ing) => {
  if (ing) form.value.unit = ing.unit
})

// Categories that actually have items, A to Z, with Uncategorized last.
const itemCategoryOptions = computed(() => {
  const named = new Map<string, string>()
  let hasUncategorized = false
  for (const item of menuItems.value) {
    if (item.category_uuid) named.set(item.category_uuid, item.category_name || 'Category')
    else hasUncategorized = true
  }
  return [
    { value: 'all', label: 'All categories' },
    ...[...named].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label })),
    ...(hasUncategorized ? [{ value: 'uncategorized', label: 'Uncategorized' }] : []),
  ]
})

const filteredMenuItems = computed(() => {
  const q = itemSearch.value.trim().toLowerCase()
  const category = itemCategory.value
  return menuItems.value.filter(i =>
    (category === 'all' || (category === 'uncategorized' ? !i.category_uuid : i.category_uuid === category))
    && (!q || i.menu_name.toLowerCase().includes(q))
  )
})

const allShownSelected = computed(() =>
  filteredMenuItems.value.length > 0 && filteredMenuItems.value.every(i => form.value.item_uuids.includes(i.uuid))
)

function toggleItem(uuid: string) {
  const list = form.value.item_uuids
  form.value.item_uuids = list.includes(uuid) ? list.filter(u => u !== uuid) : [...list, uuid]
}

// Selects every item the search and category filter show, or clears them if all are already selected.
function toggleAllShown() {
  const shown = filteredMenuItems.value.map(i => i.uuid)
  form.value.item_uuids = allShownSelected.value
    ? form.value.item_uuids.filter(u => !shown.includes(u))
    : [...new Set([...form.value.item_uuids, ...shown])]
}

function formatItemPrice(value: string | number | null) {
  return value === null || value === '' ? '' : `₱${Number(value).toFixed(2)}`
}

const isEditMode = computed(() => !!props.addon)
const isSubmitting = ref(false)
const isDirty = ref(false)
const errors = ref({ name: '', price: '', max_quantity: '', amount: '' })

watch(() => props.show, (open) => {
  if (!open) return
  errors.value = { name: '', price: '', max_quantity: '', amount: '' }
  itemSearch.value = ''
  itemCategory.value = 'all'
  loadOptions()

  const a = props.addon
  const recipes = a?.recipes ?? []
  const own = recipes.length === 1 && a && normalizeName(recipes[0]!.ingredient_name) === normalizeName(a.name)
    ? recipes[0]!
    : null

  legacyRecipes.value = recipes.length && !own
    ? recipes.map(r => ({ ingredient_uuid: r.ingredient_uuid ?? null, ingredient_name: r.ingredient_name, quantity: Number(r.quantity), unit: r.unit }))
    : []

  form.value = {
    name: a?.name ?? '',
    price: a ? String(a.price) : '',
    max_quantity: a?.max_quantity ?? '',
    is_available: a?.is_available ?? true,
    amount: own ? formatQuantity(own.quantity) : '',
    unit: own?.unit ?? INGREDIENT_UNITS[0] ?? '',
    item_uuids: a?.items?.map(i => i.uuid) ?? [],
  }
  nextTick(() => { isDirty.value = false })
}, { immediate: true }) // also when the page opens with the modal already showing (an ?action= link)

watch([form, legacyRecipes], () => { isDirty.value = true }, { deep: true })

// Switch an older recipe to "the add-on is its own ingredient". A single row keeps its amount and unit.
function useOwnName() {
  const only = legacyRecipes.value.length === 1 ? legacyRecipes.value[0]! : null
  if (only) {
    form.value.amount = formatQuantity(only.quantity)
    form.value.unit = only.unit
  }
  legacyRecipes.value = []
}

function handleClose() {
  if (isDirty.value) {
    askConfirm({
      title: 'Discard Changes',
      message: 'You have unsaved changes. Are you sure you want to discard them?',
      confirmText: 'Discard',
      isDestructive: true,
      onConfirm: () => emit('close'),
    })
  } else {
    emit('close')
  }
}

function onAmountInput(event: Event) {
  const input = event.target as HTMLInputElement
  const clean = sanitizeQuantity(input.value)
  form.value.amount = clean
  if (input.value !== clean) input.value = clean
  errors.value.amount = ''
}

const bodyEl = ref<HTMLElement | null>(null)
async function scrollToFirstError() {
  await nextTick()
  bodyEl.value?.querySelector('[data-row-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function buildRecipes() {
  if (legacyRecipes.value.length) {
    return legacyRecipes.value.map(r => ({
      ...(r.ingredient_uuid ? { ingredient_uuid: r.ingredient_uuid } : { ingredient_name: r.ingredient_name }),
      quantity: r.quantity,
      unit: r.unit,
    }))
  }
  if (!form.value.amount.trim()) return []
  const match = matchedIngredient.value
  return [{
    ...(match ? { ingredient_uuid: match.uuid } : { ingredient_name: form.value.name.trim() }),
    quantity: parseQuantity(form.value.amount),
    unit: match?.unit ?? form.value.unit,
  }]
}

async function save() {
  errors.value = { name: '', price: '', max_quantity: '', amount: '' }
  let hasError = false

  if (!form.value.name.trim()) {
    errors.value.name = 'Add-on name is required.'
    hasError = true
  }
  if (form.value.price === '' || Number(form.value.price) < 0) {
    errors.value.price = 'Price is required.'
    hasError = true
  }
  // Optional: left empty, the add-on has no limit of its own
  const maxRaw = form.value.max_quantity
  const max = maxRaw === '' || maxRaw === null ? null : Number(maxRaw)
  if (max !== null && (!Number.isInteger(max) || max < 1 || max > MAX_PER_DRINK)) {
    errors.value.max_quantity = `Between 1 and ${MAX_PER_DRINK}, or leave it empty for no limit.`
    hasError = true
  }
  if (!legacyRecipes.value.length && form.value.amount.trim() && !(parseQuantity(form.value.amount) > 0)) {
    errors.value.amount = 'Enter an amount like 15, 2.5 or 1/4, or leave it empty.'
    hasError = true
  }

  if (hasError) {
    scrollToFirstError()
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      price: Number(form.value.price),
      max_quantity: max,
      is_available: form.value.is_available,
      recipes: buildRecipes(),
      item_uuids: form.value.item_uuids,
    }

    if (isEditMode.value) {
      await menuService.updateAddon(props.addon!.uuid, payload)
    } else {
      await menuService.createAddon(payload)
    }

    emit('saved')
    emit('close')
  } catch (error: any) {
    const serverErrors = error?.data?.errors as Record<string, string[]> | undefined
    let shownInForm = false

    for (const [field, messages] of Object.entries(serverErrors ?? {})) {
      const message = messages[0]
      if (message === undefined) continue
      if (field.startsWith('recipes.')) {
        errors.value.amount ||= message
        shownInForm = true
      } else if (field === 'name' || field === 'price' || field === 'max_quantity') {
        errors.value[field] = message
        shownInForm = true
      }
    }

    if (shownInForm) {
      scrollToFirstError()
      return
    }

    console.error('Error saving add-on:', error)
    showAlert('Save Failed', error?.data?.message || 'Failed to save add-on. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

function confirmDelete() {
  if (!props.addon) return
  askConfirm({
    title: 'Delete Add-on',
    message: `${props.addon.name} will be removed from every menu item. Past sales keep it on their receipts.`,
    confirmText: 'Delete',
    isDestructive: true,
    onConfirm: async () => {
      try {
        await menuService.deleteAddon(props.addon!.uuid)
        emit('saved')
        emit('close')
      } catch (error) {
        console.error('Error deleting add-on:', error)
        showAlert('Delete Failed', 'Failed to delete add-on. Please try again.')
      }
    },
  })
}

const inputClass = (invalid: boolean) => [
  'w-full bg-white border rounded-xl px-3.5 py-3 text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] placeholder:font-normal shadow-2xs focus:outline-none focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 transition-all',
  invalid ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]',
]

const usageSummary = computed(() => {
  const name = form.value.name.trim() || 'this add-on'
  if (!form.value.amount.trim()) return `Not tracked. Sales of ${name} won't count toward ingredients used.`
  return `Each serving uses ${form.value.amount} ${matchedIngredient.value?.unit ?? form.value.unit} of ${name}. A drink with 2 uses twice as much.`
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200" aria-hidden="true" @click="handleClose" />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="addon-modal-title"
        class="relative bg-white rounded-3xl w-full max-w-[820px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        @submit.prevent="save"
        @keydown.esc.prevent="handleClose"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-4 px-6 md:px-8 pt-5 pb-4 border-b border-[#EEDFC4] bg-[#FDFBF7] shrink-0">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="heroicons:sparkles" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h2 id="addon-modal-title" class="text-xl font-display font-extrabold text-[#3B1F0E] truncate">
                {{ isEditMode ? 'Edit Add-on' : 'Add New Add-on' }}
              </h2>
              <p class="text-xs text-[#8A6E64] mt-0.5">
                {{ isEditMode ? 'Update the price, how much it uses, and which items offer it.' : 'Set the price, how much one serving uses, and which items offer it.' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3B1F0E] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="handleClose"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Body -->
        <div ref="bodyEl" class="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-4 space-y-4">
          <!-- ── Details ─────────────────────────────────────────── -->
          <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5" aria-labelledby="addon-details-title">
            <h3 id="addon-details-title" class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              <span>Details</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3.5">
              <div class="min-w-0">
                <label class="block text-xs font-bold text-[#3B1F0E] mb-1">Name <span class="text-red-500">*</span></label>
                <IngredientPicker
                  v-model:name="form.name"
                  :ingredients="ingredients"
                  :used-names="[]"
                  :invalid="!!errors.name"
                  white
                  @update:name="errors.name = ''"
                />
                <p v-if="errors.name" data-row-error class="text-red-600 text-xs font-semibold mt-1">{{ errors.name }}</p>
              </div>
              <div class="min-w-0">
                <label for="addon-price" class="block text-xs font-bold text-[#3B1F0E] mb-1">Price <span class="text-red-500">*</span></label>
                <div class="relative">
                  <span class="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-semibold text-[#B4846C]">₱</span>
                  <input id="addon-price" v-model="form.price" type="number" step="0.01" min="0" placeholder="0.00" :class="[inputClass(!!errors.price), 'pl-8 tabular-nums']" @input="errors.price = ''" />
                </div>
                <p v-if="errors.price" data-row-error class="text-red-600 text-xs font-semibold mt-1">{{ errors.price }}</p>
              </div>
              <div class="min-w-0">
                <label for="addon-max" class="block text-xs font-bold text-[#3B1F0E] mb-1 whitespace-nowrap">Max per drink <span class="font-semibold text-[#8A6E64]">(Optional)</span></label>
                <input id="addon-max" v-model.number="form.max_quantity" type="number" min="1" :max="MAX_PER_DRINK" step="1" placeholder="No limit" :class="[inputClass(!!errors.max_quantity), 'tabular-nums']" @input="errors.max_quantity = ''" />
                <p v-if="errors.max_quantity" data-row-error class="text-red-600 text-xs font-semibold mt-1">{{ errors.max_quantity }}</p>
                <p v-else class="text-[11px] text-[#8A6E64] mt-1">1 to {{ MAX_PER_DRINK }}, or empty for no limit.</p>
              </div>
            </div>

            <!-- Name = ingredient hint -->
            <p v-if="!errors.name" class="-mt-1 text-[11px] text-[#8A6E64] flex items-center gap-1">
              <template v-if="matchedIngredient">
                <Icon name="heroicons:check-circle" class="size-3.5 text-emerald-600 shrink-0" />
                <span>Matches your tracked ingredient <strong class="font-semibold text-[#5C4037]">{{ matchedIngredient.name }}</strong> ({{ matchedIngredient.unit }}).</span>
              </template>
              <span v-else>The name is also the ingredient it uses. Pick one you track, or type a new one.</span>
            </p>

            <!-- Availability -->
            <button
              type="button"
              role="switch"
              :aria-checked="form.is_available"
              class="w-full flex items-center justify-between gap-3 rounded-xl border border-[#D8C7B5] bg-white px-3.5 py-2.5 text-left shadow-2xs hover:bg-[#FAF6F0] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
              @click="form.is_available = !form.is_available"
            >
              <span class="min-w-0">
                <span class="block text-xs font-bold text-[#3B1F0E]">Available at the register</span>
                <span class="block text-[11px] text-[#8A6E64] mt-0.5">
                  {{ form.is_available ? 'Cashiers can add it to orders.' : 'Hidden from cashiers until you turn it back on.' }}
                </span>
              </span>
              <span
                aria-hidden="true"
                :class="[
                  'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
                  form.is_available ? 'border-[#3B1F0E] bg-[#3B1F0E]' : 'border-[#B4846C] bg-white'
                ]"
              >
                <span
                  :class="[
                    'rounded-full transition-[transform,width,height,background-color]',
                    form.is_available ? 'h-4 w-4 translate-x-[17px] bg-white shadow-sm' : 'h-3.5 w-3.5 translate-x-[2px] bg-[#B4846C]'
                  ]"
                ></span>
              </span>
            </button>
          </section>

          <!-- ── Uses per serving ────────────────────────────────── -->
          <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs" aria-labelledby="addon-usage-title">
            <div class="mb-3.5">
              <h3 id="addon-usage-title" class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                <span>Uses Per Serving</span>
              </h3>
              <p class="text-[11px] text-[#8A6E64] mt-1">How much of {{ form.name.trim() || 'this add-on' }} one serving uses. A drink with 2 uses twice as much. Leave empty if you don't track it.</p>
            </div>

            <!-- Older add-on with a different recipe: kept as is unless switched -->
            <div v-if="legacyRecipes.length" class="rounded-xl border border-[#D8C7B5] bg-white px-3.5 py-3 text-xs text-[#5C4037] shadow-2xs">
              <p class="font-bold text-[#3B1F0E]">This add-on uses other ingredients</p>
              <ul class="mt-1.5 space-y-0.5">
                <li v-for="(r, i) in legacyRecipes" :key="i" class="tabular-nums">
                  {{ formatQuantity(r.quantity) }} {{ r.unit }} {{ r.ingredient_name }}
                </li>
              </ul>
              <p class="mt-2 text-[#8A6E64]">They're kept as they are when you save.</p>
              <button
                type="button"
                class="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-sm font-bold text-[#7D5A50] hover:bg-[#FBF2E1] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]"
                @click="useOwnName"
              >
                <Icon name="heroicons:arrow-path" class="w-4 h-4" />
                Use "{{ form.name.trim() || 'the add-on name' }}" instead
              </button>
            </div>

            <template v-else>
              <div class="hidden sm:grid grid-cols-[2fr_1fr] gap-3 mb-2 px-1">
                <span class="text-[11px] font-bold text-[#8A6E64] uppercase tracking-wider">Amount</span>
                <span class="text-[11px] font-bold text-[#8A6E64] uppercase tracking-wider">Unit</span>
              </div>
              <div class="grid grid-cols-[2fr_1fr] gap-3">
                <input
                  id="addon-amount"
                  :value="form.amount"
                  type="text"
                  inputmode="decimal"
                  placeholder="e.g. 15 or 1/4"
                  aria-label="Amount per serving"
                  :class="[inputClass(!!errors.amount), 'tabular-nums']"
                  @input="onAmountInput"
                />
                <DropdownList
                  v-model="form.unit"
                  :options="INGREDIENT_UNIT_OPTIONS"
                  :disabled="!!matchedIngredient"
                  size="sm"
                  card
                  aria-label="Unit"
                  :title="matchedIngredient ? `${matchedIngredient.name} is measured in ${matchedIngredient.unit}` : undefined"
                />
              </div>
              <p v-if="errors.amount" data-row-error class="text-red-600 text-xs font-semibold mt-1">{{ errors.amount }}</p>
              <p v-else class="text-[11px] text-[#8A6E64] mt-1.5">{{ usageSummary }}</p>
            </template>
          </section>

          <!-- ── Offered on ──────────────────────────────────────── -->
          <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5" aria-labelledby="addon-items-title">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 id="addon-items-title" class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
                  <span>Offered On</span>
                </h3>
                <p class="text-[11px] text-[#8A6E64] mt-1">The menu items cashiers can add this to.</p>
              </div>
              <span class="text-xs font-bold text-[#8A6E64] whitespace-nowrap tabular-nums">
                {{ form.item_uuids.length }} of {{ menuItems.length }} selected
              </span>
            </div>

            <p v-if="menuItems.length === 0" class="text-xs text-[#8A6E64] bg-white border border-dashed border-[#D8C7B5] rounded-xl px-4 py-3">
              No menu items yet. Add items first, then offer this add-on on them.
            </p>
            <template v-else>
              <!-- Filters -->
              <div class="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <SearchInput v-model="itemSearch" placeholder="Search items" clearable white class="sm:flex-1" />
                <div class="sm:w-52 shrink-0">
                  <DropdownList
                    v-model="itemCategory"
                    :options="itemCategoryOptions"
                    size="sm"
                    card
                    icon="heroicons:squares-2x2"
                    aria-label="Filter items by category"
                  />
                </div>
                <button
                  type="button"
                  :disabled="filteredMenuItems.length === 0"
                  class="h-11 px-3.5 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-sm font-bold whitespace-nowrap shadow-2xs hover:bg-[#FAF4ED] transition-colors disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                  @click="toggleAllShown"
                >
                  {{ allShownSelected ? 'Clear shown' : 'Select all shown' }}
                </button>
              </div>

              <!-- Item tiles: tap to offer it on that item -->
              <div v-if="filteredMenuItems.length" class="max-h-[19rem] overflow-y-auto -mx-1 px-1 py-1">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    v-for="item in filteredMenuItems"
                    :key="item.uuid"
                    type="button"
                    role="checkbox"
                    :aria-checked="form.item_uuids.includes(item.uuid)"
                    class="flex items-center gap-3 p-2 pr-3 rounded-xl border bg-white text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                    :class="form.item_uuids.includes(item.uuid)
                      ? 'border-[#3B1F0E] ring-1 ring-[#3B1F0E] shadow-sm'
                      : 'border-[#D8C7B5] hover:border-[#B4846C] hover:bg-[#FAF6F0] shadow-2xs'"
                    @click="toggleItem(item.uuid)"
                  >
                    <span class="relative w-12 h-12 rounded-lg overflow-hidden bg-[#FBF2E1] shrink-0 flex items-center justify-center">
                      <img
                        v-if="item.picture"
                        :src="item.picture"
                        alt=""
                        class="w-full h-full object-cover"
                        @error="($event.target as HTMLImageElement).style.display = 'none'"
                      />
                      <Icon v-else name="heroicons:photo" class="w-5 h-5 text-[#B4846C]/50" />
                    </span>
                    <span class="flex-1 min-w-0">
                      <span class="block text-sm font-bold text-[#2D201B] truncate">{{ item.menu_name }}</span>
                      <span class="block text-[11px] text-[#8A6E64] truncate">
                        {{ item.category_name || 'Uncategorized' }}<template v-if="formatItemPrice(item.base_price)"> · {{ formatItemPrice(item.base_price) }}</template>
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      class="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors"
                      :class="form.item_uuids.includes(item.uuid) ? 'bg-[#3B1F0E] border-[#3B1F0E] text-white' : 'bg-white border-[#D8C7B5] text-transparent'"
                    >
                      <Icon v-if="form.item_uuids.includes(item.uuid)" name="heroicons:check" class="w-3 h-3" />
                    </span>
                  </button>
                </div>
              </div>

              <p v-else class="text-xs text-[#8A6E64] bg-white border border-dashed border-[#D8C7B5] rounded-xl px-4 py-3">
                No items match<template v-if="itemSearch.trim()"> "{{ itemSearch.trim() }}"</template><template v-if="itemCategory !== 'all'"> in this category</template>.
              </p>
            </template>
          </section>
        </div>

        <!-- Footer: Cancel (and Delete) on the left, the main action on the right -->
        <div class="flex items-center justify-between gap-3 px-6 md:px-8 py-3.5 border-t border-[#EEDFC4] bg-[#FAF8F5] rounded-b-3xl shrink-0">
          <div class="flex items-center gap-2.5">
            <button
              type="button"
              class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
              @click="handleClose"
            >
              Cancel
            </button>
            <button
              v-if="isEditMode"
              type="button"
              :disabled="isSubmitting"
              class="px-4 py-2 rounded-xl border border-red-200 bg-white text-red-600 text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-red-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              @click="confirmDelete"
            >
              <Icon name="heroicons:trash" class="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          >
            <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            <span>{{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Add-on' }}</span>
          </button>
        </div>
      </form>

      <ConfirmModal
        :show="confirmDialog.show"
        :title="confirmDialog.title"
        :message="confirmDialog.message"
        :confirmText="confirmDialog.confirmText"
        :isDestructive="confirmDialog.isDestructive"
        @close="confirmDialog.show = false"
        @confirm="runConfirm"
      />
      <AlertModal
        :show="alertDialog.show"
        :title="alertDialog.title"
        :message="alertDialog.message"
        @close="alertDialog.show = false"
      />
    </div>
  </Teleport>
</template>
