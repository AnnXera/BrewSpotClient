<!-- app/components/menu/AddonModal.vue -->
<!-- Add or edit an add-on: price, how many one drink can have, what one serving uses, and the items that offer it. -->
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

interface RecipeRow {
  ingredient_uuid: string | null
  ingredient_name: string
  quantity_display: string
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
  recipes: [] as RecipeRow[],
  item_uuids: [] as string[]
})

function emptyRow(): RecipeRow {
  return { ingredient_uuid: null, ingredient_name: '', quantity_display: '', unit: INGREDIENT_UNITS[0] ?? '' }
}

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

// Same rule as the server's Ingredient::normalize().
const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

function usedNamesExcept(index: number) {
  return form.value.recipes
    .filter((r, i) => i !== index && r.ingredient_name.trim())
    .map(r => normalizeName(r.ingredient_name))
}

const serverRowErrors = ref<Record<number, string>>({})

const rowErrors = computed(() => {
  const result: Record<number, string> = { ...serverRowErrors.value }
  const seen = new Set<string>()

  form.value.recipes.forEach((r, i) => {
    const key = normalizeName(r.ingredient_name)
    if (!key) return
    if (seen.has(key)) result[i] = `${r.ingredient_name.trim()} is already in this recipe.`
    seen.add(key)
  })

  return result
})

function onPick(recipe: RecipeRow, index: number, ingredient: Ingredient | null) {
  recipe.ingredient_uuid = ingredient?.uuid ?? null
  if (ingredient) recipe.unit = ingredient.unit
  delete serverRowErrors.value[index]
}

const isEditMode = computed(() => !!props.addon)
const isSubmitting = ref(false)
const isDirty = ref(false)
const errors = ref({ name: '', price: '', max_quantity: '' })

watch(() => props.show, (open) => {
  if (!open) return
  errors.value = { name: '', price: '', max_quantity: '' }
  serverRowErrors.value = {}
  itemSearch.value = ''
  itemCategory.value = 'all'
  loadOptions()

  const a = props.addon
  form.value = {
    name: a?.name ?? '',
    price: a ? String(a.price) : '',
    max_quantity: a?.max_quantity ?? '',
    is_available: a?.is_available ?? true,
    recipes: a?.recipes?.length
      ? a.recipes.map(r => ({
          ingredient_uuid: r.ingredient_uuid ?? null,
          ingredient_name: r.ingredient_name,
          quantity_display: formatQuantity(r.quantity),
          unit: r.unit
        }))
      : [emptyRow()],
    item_uuids: a?.items?.map(i => i.uuid) ?? []
  }
  nextTick(() => { isDirty.value = false })
}, { immediate: true }) // also when the page opens with the modal already showing (an ?action= link)

watch(form, () => { isDirty.value = true }, { deep: true })

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

const ingredientInputs = ref<{ focus: () => void }[]>([])
const setIngredientInputRef = (el: any, index: number) => {
  if (el) ingredientInputs.value[index] = el
}

function addIngredient() {
  form.value.recipes.push(emptyRow())
}

async function handleEnterOnIngredient(index: number) {
  if (index === form.value.recipes.length - 1) {
    addIngredient()
    await nextTick()
    ingredientInputs.value[form.value.recipes.length - 1]?.focus()
  }
}

function onQuantityInput(recipe: RecipeRow, event: Event) {
  const input = event.target as HTMLInputElement
  const clean = sanitizeQuantity(input.value)
  recipe.quantity_display = clean
  if (input.value !== clean) input.value = clean
}

function removeIngredient(index: number) {
  form.value.recipes.splice(index, 1)
  serverRowErrors.value = {}
  if (form.value.recipes.length === 0) addIngredient()
}

const bodyEl = ref<HTMLElement | null>(null)
async function scrollToFirstError() {
  await nextTick()
  bodyEl.value?.querySelector('[data-row-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function save() {
  errors.value = { name: '', price: '', max_quantity: '' }
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
  if (Object.keys(rowErrors.value).length) hasError = true

  if (hasError) {
    scrollToFirstError()
    return
  }

  // An add-on may use no ingredients; rows left blank are dropped.
  const rows = form.value.recipes.filter(r => r.ingredient_name.trim() || r.quantity_display.trim())

  isSubmitting.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      price: Number(form.value.price),
      max_quantity: max,
      is_available: form.value.is_available,
      recipes: rows.map(r => ({
        ...(r.ingredient_uuid ? { ingredient_uuid: r.ingredient_uuid } : { ingredient_name: r.ingredient_name }),
        quantity: parseQuantity(r.quantity_display),
        unit: r.unit
      })),
      item_uuids: form.value.item_uuids
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
    const rowMessages: Record<number, string> = {}
    let shownInForm = false

    for (const [field, messages] of Object.entries(serverErrors ?? {})) {
      const message = messages[0]
      if (message === undefined) continue
      const match = field.match(/^recipes\.(\d+)\./)
      if (match) {
        // Map back past the blank rows that were dropped.
        const sent = rows[Number(match[1])]
        const row = sent ? form.value.recipes.indexOf(sent) : -1
        if (row >= 0) rowMessages[row] ??= message
      } else if (field === 'name' || field === 'price' || field === 'max_quantity') {
        errors.value[field] = message
        shownInForm = true
      }
    }

    if (Object.keys(rowMessages).length) serverRowErrors.value = rowMessages

    if (shownInForm || Object.keys(rowMessages).length) {
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
  invalid ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'
]
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200"
      @click="handleClose"
      aria-hidden="true"
    ></div>

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="addon-modal-title"
      class="relative bg-white rounded-3xl w-full max-w-[820px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
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
              {{ isEditMode ? 'Update the price, recipe, and which items offer this add-on.' : 'Set the price, what one serving uses, and which items offer it.' }}
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
              <label for="addon-name" class="block text-xs font-bold text-[#3B1F0E] mb-1">Name <span class="text-red-500">*</span></label>
              <input id="addon-name" v-model="form.name" type="text" maxlength="100" placeholder="e.g. Oreo Crumbles" :class="inputClass(!!errors.name)" />
              <p v-if="errors.name" data-row-error class="text-red-600 text-xs font-semibold mt-1">{{ errors.name }}</p>
            </div>
            <div class="min-w-0">
              <label for="addon-price" class="block text-xs font-bold text-[#3B1F0E] mb-1">Price <span class="text-red-500">*</span></label>
              <div class="relative">
                <span class="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-semibold text-[#B4846C]">₱</span>
                <input id="addon-price" v-model="form.price" type="number" step="0.01" min="0" placeholder="0.00" :class="[inputClass(!!errors.price), 'pl-8 tabular-nums']" />
              </div>
              <p v-if="errors.price" data-row-error class="text-red-600 text-xs font-semibold mt-1">{{ errors.price }}</p>
            </div>
            <div class="min-w-0">
              <label for="addon-max" class="block text-xs font-bold text-[#3B1F0E] mb-1 whitespace-nowrap">Max per drink <span class="font-semibold text-[#8A6E64]">(Optional)</span></label>
              <input id="addon-max" v-model.number="form.max_quantity" type="number" min="1" :max="MAX_PER_DRINK" step="1" placeholder="No limit" :class="[inputClass(!!errors.max_quantity), 'tabular-nums']" />
              <p v-if="errors.max_quantity" data-row-error class="text-red-600 text-xs font-semibold mt-1">{{ errors.max_quantity }}</p>
              <p v-else class="text-[11px] text-[#8A6E64] mt-1">1 to {{ MAX_PER_DRINK }}, or empty for no limit.</p>
            </div>
          </div>

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

        <!-- ── Recipe ──────────────────────────────────────────── -->
        <section class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs" aria-labelledby="addon-recipe-title">
          <div class="mb-3.5">
            <h3 id="addon-recipe-title" class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              <span>Recipe</span>
            </h3>
            <p class="text-[11px] text-[#8A6E64] mt-1">What one serving uses. A drink with 2 of this add-on uses twice as much. Leave empty if it uses nothing you track.</p>
          </div>

          <div class="hidden sm:grid grid-cols-[2fr_1fr_1fr_auto] gap-3 mb-2 px-1">
            <span class="text-[11px] font-bold text-[#8A6E64] uppercase tracking-wider">Ingredient</span>
            <span class="text-[11px] font-bold text-[#8A6E64] uppercase tracking-wider">Amount</span>
            <span class="text-[11px] font-bold text-[#8A6E64] uppercase tracking-wider">Unit</span>
            <span class="w-10"></span>
          </div>

          <div class="space-y-3">
            <div
              v-for="(recipe, index) in form.recipes"
              :key="index"
              class="grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-start max-sm:pb-3 max-sm:border-b max-sm:border-[#EEDFC4] max-sm:last:border-b-0 max-sm:last:pb-0"
            >
              <div class="col-span-full sm:col-span-1 min-w-0">
                <label class="block sm:hidden text-[11px] font-bold text-[#8A6E64] uppercase tracking-wider mb-1">Ingredient</label>
                <IngredientPicker
                  :ref="(el) => setIngredientInputRef(el, index)"
                  v-model:name="recipe.ingredient_name"
                  :ingredients="ingredients"
                  :used-names="usedNamesExcept(index)"
                  :invalid="!!rowErrors[index]"
                  white
                  @pick="onPick(recipe, index, $event)"
                  @enter="handleEnterOnIngredient(index)"
                />
                <p v-if="rowErrors[index]" data-row-error class="text-red-600 text-xs font-semibold mt-1">{{ rowErrors[index] }}</p>
              </div>

              <div class="min-w-0">
                <label class="block sm:hidden text-[11px] font-bold text-[#8A6E64] uppercase tracking-wider mb-1">Amount</label>
                <input
                  :value="recipe.quantity_display"
                  @input="onQuantityInput(recipe, $event)"
                  type="text"
                  inputmode="decimal"
                  placeholder="e.g. 1/4 or 2.5"
                  aria-label="Amount"
                  @keydown.enter.prevent="handleEnterOnIngredient(index)"
                  :class="[inputClass(false), 'tabular-nums']"
                />
              </div>

              <div class="min-w-0">
                <label class="block sm:hidden text-[11px] font-bold text-[#8A6E64] uppercase tracking-wider mb-1">Unit</label>
                <!-- An existing ingredient is always measured in its own unit. -->
                <DropdownList
                  v-model="recipe.unit"
                  :options="INGREDIENT_UNIT_OPTIONS"
                  :disabled="!!recipe.ingredient_uuid"
                  size="sm"
                  card
                  aria-label="Unit"
                  :title="recipe.ingredient_uuid ? `${recipe.ingredient_name} is measured in ${recipe.unit}` : undefined"
                />
              </div>

              <button
                type="button"
                class="self-end sm:self-start w-10 h-11 flex items-center justify-center rounded-xl text-[#D9534F] hover:bg-[#FDE8E8] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#D9534F]/40"
                :aria-label="`Remove ${recipe.ingredient_name.trim() || 'ingredient'}`"
                @click="removeIngredient(index)"
              >
                <Icon name="heroicons:trash" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            class="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-sm font-bold text-[#7D5A50] hover:bg-[#FBF2E1] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]"
            @click="addIngredient"
          >
            <Icon name="heroicons:plus" class="w-4 h-4" />
            Add ingredient
          </button>
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
          type="button"
          :disabled="isSubmitting"
          class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          @click="save"
        >
          <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <span>{{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Add-on' }}</span>
        </button>
      </div>
    </div>

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
</template>
