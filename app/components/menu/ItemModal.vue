<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useMenuService } from '~/composables/useMenuService'
import { INGREDIENT_UNITS, INGREDIENT_UNIT_OPTIONS } from '~/utils/constants'
import { parseQuantity, formatQuantity, sanitizeQuantity } from '~/utils/fraction'
import type { Ingredient, MenuAddon } from '~/services/MenuService'
import IngredientPicker from '~/components/menu/IngredientPicker.vue'
import DropdownList from '~/components/common/DropdownList.vue'
import ConfirmModal from '~/components/common/ConfirmModal.vue'
import AlertModal from '~/components/common/AlertModal.vue'
import { useDialogs } from '~/composables/useDialogs'

interface RecipeRow {
  // Set when the row uses one of the cafe's existing ingredients; its unit is then fixed.
  ingredient_uuid: string | null
  ingredient_name: string
  quantity_display: string
  unit: string
  // The size this amount is for (a SizeRow key); null = every size.
  size_key: string | null
}

interface SizeRow {
  key: string // the size's uuid, or a temporary key until it is saved
  uuid: string | null
  name: string
  price: string // the hot price when the item is sold hot and iced
  iced_price: string
}

// Mirrors MenuItemRequest::MAX_SIZES on the server.
const MAX_SIZES = 6
let sizeKeySeq = 0
const newSizeKey = () => `new-${++sizeKeySeq}`

const props = defineProps<{
  show: boolean
  item: any | null
  categories: any[]
  defaultCategoryUuid?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const menuService = useMenuService()
const { confirmDialog, alertDialog, askConfirm, runConfirm, showAlert } = useDialogs()

const form = ref({
  menu_name: '',
  category_uuid: '',
  base_price: '',
  // Sold hot or iced at different prices; the recipe stays the same.
  is_hot_and_iced: false,
  iced_price: '',
  description: '',
  recipes: [] as RecipeRow[],
  has_sizes: false,
  sizes: [] as SizeRow[],
  addon_uuids: [] as string[]
})

function emptyRow(sizeKey: string | null = null): RecipeRow {
  return { ingredient_uuid: null, ingredient_name: '', quantity_display: '', unit: INGREDIENT_UNITS[0] ?? '', size_key: sizeKey }
}

// The cafe's ingredient list, loaded each time the modal opens.
const ingredients = ref<Ingredient[]>([])

async function loadIngredients() {
  try {
    const res = await menuService.getIngredients()
    ingredients.value = res.ingredients ?? []
  } catch (e) {
    // The picker still works without suggestions; new names are matched server-side.
    console.error('Failed to load ingredients', e)
    ingredients.value = []
  }
}

// The cafe's add-ons, loaded each time the modal opens.
const addons = ref<MenuAddon[]>([])

async function loadAddons() {
  try {
    const res = await menuService.getAddons()
    addons.value = res.addons ?? []
  } catch (e) {
    console.error('Failed to load add-ons', e)
    addons.value = []
  }
}

function toggleAddon(uuid: string) {
  const list = form.value.addon_uuids
  form.value.addon_uuids = list.includes(uuid) ? list.filter(u => u !== uuid) : [...list, uuid]
}

// Same rule as the server's Ingredient::normalize().
const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

// Same rules as the server's RecipeResolver: an ingredient appears once per
// size, and not both for all sizes and for one size (it would be counted twice).
const ALL_SIZES = '*'
const scopeOf = (r: RecipeRow) => (form.value.has_sizes && r.size_key) || ALL_SIZES
const scopesClash = (a: string, b: string) => a === ALL_SIZES || b === ALL_SIZES || a === b

// Hides only names already used for this row's exact size: a new row starts as
// "All sizes", and picking Espresso there should still be possible so it can be
// set for Large next (onPick moves it to a size without it).
function usedNamesExcept(index: number) {
  const row = form.value.recipes[index]
  if (!row) return []
  const scope = scopeOf(row)
  return form.value.recipes
    .filter((r, i) => i !== index && r.ingredient_name.trim() && scopeOf(r) === scope)
    .map(r => normalizeName(r.ingredient_name))
}

// The first size that doesn't have this ingredient yet, or null if every size has it.
function nextSizeWithout(name: string, exceptIndex: number) {
  const key = normalizeName(name)
  const taken = new Set(form.value.recipes
    .filter((r, i) => i !== exceptIndex && normalizeName(r.ingredient_name) === key)
    .map(r => r.size_key))
  return form.value.sizes.find(s => !taken.has(s.key))?.key ?? null
}

// Server-side recipe errors, keyed by row index.
const serverRowErrors = ref<Record<number, string>>({})

const rowErrors = computed(() => {
  const result: Record<number, string> = { ...serverRowErrors.value }
  const rows = form.value.recipes

  rows.forEach((r, i) => {
    const key = normalizeName(r.ingredient_name)
    if (!key) return
    const scope = scopeOf(r)
    const earlier = rows.slice(0, i).find(o => normalizeName(o.ingredient_name) === key && scopesClash(scope, scopeOf(o)))
    if (!earlier) return
    result[i] = scopeOf(earlier) === scope
      ? `${r.ingredient_name.trim()} is already in this recipe.`
      : `${r.ingredient_name.trim()} is already used for all sizes. Set its amount per size or for all sizes, not both.`
  })

  return result
})

// Same rule as the server's RecipeResolver: an ingredient set for one size must
// be set for every size (or for all sizes). Keyed by the ingredient's first row,
// the sizes it still needs.
const missingSizes = computed(() => {
  const result: Record<number, string[]> = {}
  if (!form.value.has_sizes) return result

  const groups = new Map<string, { first: number; sizes: Set<string>; allSizes: boolean }>()
  form.value.recipes.forEach((r, i) => {
    const key = normalizeName(r.ingredient_name)
    if (!key) return
    const group = groups.get(key) ?? { first: i, sizes: new Set<string>(), allSizes: false }
    if (r.size_key) group.sizes.add(r.size_key)
    else group.allSizes = true
    groups.set(key, group)
  })

  for (const group of groups.values()) {
    if (group.allSizes) continue
    const missing = form.value.sizes.filter(s => !group.sizes.has(s.key)).map(s => s.key)
    if (missing.length) result[group.first] = missing
  }
  return result
})

// Set once Confirm is pressed: from then on a missing size shows as an error.
const triedSave = ref(false)

// Adds the ingredient for a size it's missing, right after its last row.
async function addMissingSize(index: number, sizeKey: string) {
  const source = form.value.recipes[index]
  if (!source) return
  const key = normalizeName(source.ingredient_name)
  const last = form.value.recipes.reduce((at, r, i) => normalizeName(r.ingredient_name) === key ? i : at, index)

  form.value.recipes.splice(last + 1, 0, {
    ingredient_uuid: source.ingredient_uuid,
    ingredient_name: source.ingredient_name,
    quantity_display: '',
    unit: source.unit,
    size_key: sizeKey
  })
  serverRowErrors.value = {} // row indexes shifted

  await nextTick()
  bodyEl.value?.querySelectorAll<HTMLInputElement>('[data-amount-input]')[last + 1]?.focus()
}

// --- Sizes ---

const sizeErrors = ref<Record<number, { name?: string; price?: string; iced_price?: string }>>({})
const sizesError = ref('')

function sizeLabel(size: SizeRow, index: number) {
  return size.name.trim() || `Size ${index + 1}`
}

function addSize() {
  if (form.value.sizes.length >= MAX_SIZES) return
  form.value.sizes.push({ key: newSizeKey(), uuid: null, name: '', price: '', iced_price: '' })
}

// The size's own ingredient amounts go with it.
function removeSize(index: number) {
  const [removed] = form.value.sizes.splice(index, 1)
  if (!removed) return
  form.value.recipes = form.value.recipes.filter(r => r.size_key !== removed.key)
  if (form.value.recipes.length === 0) form.value.recipes.push(emptyRow())
  sizeErrors.value = {}
  serverRowErrors.value = {}
}

function turnSizesOn() {
  if (form.value.sizes.length === 0) {
    form.value.sizes = [
      { key: newSizeKey(), uuid: null, name: 'Small', price: String(form.value.base_price ?? ''), iced_price: String(form.value.iced_price ?? '') },
      { key: newSizeKey(), uuid: null, name: 'Large', price: '', iced_price: '' }
    ]
  }
  form.value.has_sizes = true
}

function turnSizesOff() {
  // One price again: start from the lowest size price.
  const prices = form.value.sizes.map(s => parseFloat(s.price)).filter(p => !Number.isNaN(p))
  if (!form.value.base_price && prices.length) form.value.base_price = String(Math.min(...prices))
  const icedPrices = form.value.sizes.map(s => parseFloat(s.iced_price)).filter(p => !Number.isNaN(p))
  if (!form.value.iced_price && icedPrices.length) form.value.iced_price = String(Math.min(...icedPrices))
  form.value.recipes = form.value.recipes.filter(r => !r.size_key)
  if (form.value.recipes.length === 0) form.value.recipes.push(emptyRow())
  form.value.sizes = []
  form.value.has_sizes = false
  sizeErrors.value = {}
  sizesError.value = ''
  serverRowErrors.value = {}
}

function onSizesToggle(event: Event) {
  const input = event.target as HTMLInputElement
  const wantSizes = input.checked
  input.checked = form.value.has_sizes // the state changes below, once confirmed

  if (wantSizes) return turnSizesOn()

  if (form.value.recipes.some(r => r.size_key && r.ingredient_name.trim())) {
    askConfirm({
      title: 'Turn Off Sizes',
      message: 'This item will have one price, and the ingredient amounts set per size will be removed.',
      confirmText: 'Turn Off',
      isDestructive: true,
      onConfirm: turnSizesOff,
    })
  } else {
    turnSizesOff()
  }
}

function validateSizes(): boolean {
  sizeErrors.value = {}
  sizesError.value = ''
  if (!form.value.has_sizes) return true

  if (form.value.sizes.length < 2) {
    sizesError.value = 'Add at least two sizes, or turn sizes off and use one price.'
    return false
  }

  const seen = new Set<string>()
  form.value.sizes.forEach((size, i) => {
    const errs: { name?: string; price?: string; iced_price?: string } = {}
    const key = normalizeName(size.name)
    if (!key) errs.name = 'Size name is required.'
    else if (seen.has(key)) errs.name = 'Two sizes have the same name.'
    seen.add(key)
    if (size.price === '' || size.price == null || Number(size.price) < 0) errs.price = 'Price is required.'
    if (form.value.is_hot_and_iced && (size.iced_price === '' || size.iced_price == null || Number(size.iced_price) < 0)) errs.iced_price = 'Iced price is required.'
    if (errs.name || errs.price || errs.iced_price) sizeErrors.value[i] = errs
  })

  return Object.keys(sizeErrors.value).length === 0
}

function onPick(recipe: RecipeRow, index: number, ingredient: Ingredient | null) {
  recipe.ingredient_uuid = ingredient?.uuid ?? null
  if (ingredient) recipe.unit = ingredient.unit
  delete serverRowErrors.value[index]

  // Already set per size elsewhere (Espresso on Small): put this row on the next size.
  if (ingredient && form.value.has_sizes && !recipe.size_key) {
    const elsewhere = form.value.recipes.some((r, i) =>
      i !== index && r.size_key && normalizeName(r.ingredient_name) === normalizeName(ingredient.name))
    if (elsewhere) recipe.size_key = nextSizeWithout(ingredient.name, index)
  }
}

const fileInput = ref<HTMLInputElement | null>(null)
const picturePreview = ref<string | null>(null)
const pictureFile = ref<File | null>(null)
const isSubmitting = ref(false)

const isEditMode = computed(() => !!props.item)

// Some pages pass an "Uncategorized" pseudo-category; the select always offers its own.
const realCategories = computed(() => props.categories.filter(cat => cat.uuid !== 'uncategorized'))

const categoryOptions = computed(() => [
  { value: 'uncategorized', label: 'Uncategorized' },
  ...realCategories.value.map(cat => ({ value: cat.uuid as string, label: cat.name as string }))
])

const sizeOptions = computed(() => [
  { value: null as string | null, label: 'All sizes' },
  ...form.value.sizes.map((size, i) => ({ value: size.key as string | null, label: sizeLabel(size, i) }))
])

// Inputs share one look; the error state swaps the border and focus ring.
function fieldClass(invalid: boolean) {
  return [
    'w-full bg-[#fef8f0] border text-[#3B1F0E] rounded-xl px-4 py-3 placeholder:text-[#B4846C]/70 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow',
    invalid ? 'border-red-500 focus:ring-red-500' : 'border-[#EEDFC4] focus:ring-[#B4846C]'
  ]
}

// On phones a row wraps over two lines, so a rule marks where the next one starts.
const rowDivider = 'max-sm:pb-4 max-sm:border-b max-sm:border-[#EEDFC4] max-sm:last:border-b-0 max-sm:last:pb-0'

// Columns of the size and recipe rows. On phones the name takes its own line.
const sizeGridClass = computed(() => form.value.is_hot_and_iced
  ? 'grid-cols-[1fr_1fr_auto] sm:grid-cols-[2fr_1fr_1fr_auto]'
  : 'grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_auto]')

const recipeGridClass = computed(() => form.value.has_sizes
  ? 'grid-cols-[1fr_1fr_auto] sm:grid-cols-[2fr_1.2fr_1fr_1fr_auto]'
  : 'grid-cols-[1fr_1fr_auto] sm:grid-cols-[2fr_1fr_1fr_auto]')

const isDirty = ref(false)
const errors = ref({
  menu_name: '',
  base_price: '',
  iced_price: ''
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    errors.value = { menu_name: '', base_price: '', iced_price: '' }
    serverRowErrors.value = {}
    sizeErrors.value = {}
    sizesError.value = ''
    triedSave.value = false
    loadIngredients()
    loadAddons()
    if (props.item) {
      const sizes: SizeRow[] = (props.item.sizes ?? []).map((s: any) => ({ key: s.uuid, uuid: s.uuid, name: s.name, price: String(s.price), iced_price: s.iced_price != null ? String(s.iced_price) : '' }))
      form.value = {
        menu_name: props.item.menu_name || '',
        category_uuid: props.item.category_uuid || 'uncategorized',
        base_price: props.item.base_price || '',
        is_hot_and_iced: !!props.item.is_hot_and_iced,
        iced_price: props.item.iced_price ?? '',
        description: props.item.description || '',
        recipes: props.item.recipes?.length 
          ? props.item.recipes.map((r: any): RecipeRow => ({
              ingredient_uuid: r.ingredient_uuid ?? null,
              ingredient_name: r.ingredient_name,
              quantity_display: formatQuantity(r.quantity),
              unit: r.unit,
              size_key: r.size_uuid ?? null
            }))
          : [emptyRow()],
        has_sizes: sizes.length > 0,
        sizes,
        addon_uuids: (props.item.addons ?? []).map((a: any) => a.uuid)
      }
      picturePreview.value = props.item.picture || null
    } else {
      form.value = {
        menu_name: '',
        category_uuid: props.defaultCategoryUuid || 'uncategorized',
        base_price: '',
        is_hot_and_iced: false,
        iced_price: '',
        description: '',
        recipes: [emptyRow()],
        has_sizes: false,
        sizes: [],
        addon_uuids: []
      }
      picturePreview.value = null
    }
    pictureFile.value = null
    nextTick(() => {
      isDirty.value = false
    })
  }
})

watch(form, () => { isDirty.value = true }, { deep: true })
watch(pictureFile, () => { isDirty.value = true })

const handleClose = () => {
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

const triggerFileInput = () => {
  fileInput.value?.click()
}

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    pictureFile.value = file
    picturePreview.value = URL.createObjectURL(file)
  }
}

const ingredientInputs = ref<{ focus: () => void }[]>([])

const setIngredientInputRef = (el: any, index: number) => {
  if (el) ingredientInputs.value[index] = el
}

const addIngredient = () => {
  form.value.recipes.push(emptyRow())
}

const handleEnterOnIngredient = async (index: number) => {
  if (index === form.value.recipes.length - 1) {
    addIngredient()
    await nextTick()
    ingredientInputs.value[form.value.recipes.length - 1]?.focus()
  }
}

const onQuantityInput = (recipe: { quantity_display: string }, event: Event) => {
  const input = event.target as HTMLInputElement
  const clean = sanitizeQuantity(input.value)
  recipe.quantity_display = clean
  // Write back directly: if only a rejected character was typed, the model is unchanged and Vue won't re-render.
  if (input.value !== clean) input.value = clean
}

const removeIngredient = (index: number) => {
  form.value.recipes.splice(index, 1)
  serverRowErrors.value = {} // row indexes shifted
  if (form.value.recipes.length === 0) {
    addIngredient() // always keep one empty row
  }
}

// The recipe can be long; bring the first row with an error into view so Confirm never looks like it did nothing.
const bodyEl = ref<HTMLElement | null>(null)
const scrollToFirstError = async () => {
  await nextTick()
  bodyEl.value?.querySelector('[data-row-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const saveItem = async () => {
  errors.value = { menu_name: '', base_price: '', iced_price: '' }
  let hasError = false

  if (!form.value.menu_name) {
    errors.value.menu_name = 'Item name is required.'
    hasError = true
  }
  if (!form.value.has_sizes && !form.value.base_price) {
    errors.value.base_price = 'Price is required.'
    hasError = true
  }
  if (!form.value.has_sizes && form.value.is_hot_and_iced && form.value.iced_price === '') {
    errors.value.iced_price = 'Iced price is required.'
    hasError = true
  }
  if (!validateSizes()) hasError = true

  if (Object.keys(rowErrors.value).length) hasError = true

  triedSave.value = true
  if (Object.keys(missingSizes.value).length) hasError = true

  if (hasError) {
    scrollToFirstError()
    return
  }

  isSubmitting.value = true
  try {
    const formData = new FormData()
    formData.append('menu_name', form.value.menu_name)
    // With sizes, the server takes the lowest size price as the item's price.
    if (!form.value.has_sizes) {
      formData.append('base_price', form.value.base_price.toString())
    }
    formData.append('is_hot_and_iced', form.value.is_hot_and_iced ? '1' : '0')
    if (form.value.is_hot_and_iced && !form.value.has_sizes) {
      formData.append('iced_price', form.value.iced_price.toString())
    }
    
    if (form.value.category_uuid && form.value.category_uuid !== 'uncategorized') {
      formData.append('category_uuid', form.value.category_uuid)
    } else {
      // Null category_uuid explicitly handled by the backend if we pass empty string or don't append it
      // But update requires 'category_uuid' key to be present with null value to unset it.
      // We will append empty string and the backend converts it to null if the request prepares it, 
      // but FormData stringifies null to "null".
      // Let's pass an empty string, or omit it for create, but for update we need a way to unset.
      // Laravel handles empty string as null via ConvertEmptyStringsToNull middleware.
      formData.append('category_uuid', '')
    }

    if (form.value.description) {
      formData.append('description', form.value.description)
    }
    
    if (pictureFile.value) {
      formData.append('picture', pictureFile.value)
    }

    // An existing ingredient goes by uuid; a new one by name (the server adds it to the list).
    // A row for one size points at it by position in the sizes sent alongside.
    const sizes = form.value.has_sizes ? form.value.sizes : []
    const recipesToSave = form.value.recipes.map(r => ({
      ...(r.ingredient_uuid ? { ingredient_uuid: r.ingredient_uuid } : { ingredient_name: r.ingredient_name }),
      quantity: parseQuantity(r.quantity_display),
      unit: r.unit,
      size_index: r.size_key && form.value.has_sizes ? sizes.findIndex(s => s.key === r.size_key) : null
    }))
    formData.append('recipes', JSON.stringify(recipesToSave))

    // [] turns sizes off. A saved size goes back with its uuid so it is updated, not replaced.
    formData.append('sizes', JSON.stringify(sizes.map(s => ({
      ...(s.uuid ? { uuid: s.uuid } : {}),
      name: s.name.trim(),
      price: Number(s.price),
      ...(form.value.is_hot_and_iced ? { iced_price: Number(s.iced_price) } : {})
    }))))
    formData.append('addon_uuids', JSON.stringify(form.value.addon_uuids))

    if (isEditMode.value) {
      formData.append('_method', 'PATCH')
      await menuService.updateMenuItem(props.item.uuid, formData)
    } else {
      await menuService.createMenuItem(formData)
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
      const recipe = field.match(/^recipes\.(\d+)\./)
      const size = field.match(/^sizes\.(\d+)\.(name|price|iced_price)$/)
      if (recipe) {
        rowMessages[Number(recipe[1])] ??= message
      } else if (size) {
        const i = Number(size[1])
        sizeErrors.value[i] = { ...sizeErrors.value[i], [size[2] as 'name' | 'price' | 'iced_price']: message }
        shownInForm = true
      } else if (field === 'sizes') {
        sizesError.value = message
        shownInForm = true
      } else if (field === 'base_price') {
        errors.value.base_price = message
        shownInForm = true
      } else if (field === 'iced_price') {
        errors.value.iced_price = message
        shownInForm = true
      } else if (field === 'addon_uuids') {
        showAlert('Save Failed', message)
        loadAddons()
        return
      }
    }

    if (Object.keys(rowMessages).length) serverRowErrors.value = rowMessages

    if (shownInForm || Object.keys(rowMessages).length) {
      scrollToFirstError()
      return
    }

    console.error('Error saving item:', error)
    showAlert('Save Failed', 'Failed to save item. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <!-- Overlay -->
    <div
      class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      @click="handleClose"
    ></div>

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-modal-title"
      class="relative bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
    >

      <!-- Header -->
      <div class="flex items-center justify-between gap-4 px-6 md:px-8 py-5 border-b border-[#EEDFC4]">
        <h2 id="item-modal-title" class="text-2xl md:text-3xl font-display font-bold text-[#3B1F0E] truncate">
          {{ isEditMode ? 'Edit Item' : 'Add Item' }}
        </h2>
        <button
          type="button"
          @click="handleClose"
          class="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-[#7D5A50] hover:bg-[#FBF2E1] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]"
          aria-label="Close"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Body: one section per job, each titled above its fields -->
      <div ref="bodyEl" class="flex-1 overflow-y-auto px-6 md:px-8 divide-y divide-[#EEDFC4]">

        <!-- ── Details ─────────────────────────────────────────── -->
        <section class="py-7" aria-labelledby="item-details-title">
          <div class="mb-5">
            <h3 id="item-details-title" class="text-base font-bold text-[#3B1F0E]">Details</h3>
            <p class="text-sm text-[#9E7060] mt-1">How the item shows on the menu and at the register.</p>
          </div>

          <!-- From lg the photo sits beside the fields as a square exactly as tall as them -->
          <div class="flex flex-col lg:flex-row gap-5">
            <!-- Photo -->
            <div class="w-36 lg:w-60 shrink-0">
              <button
                type="button"
                class="relative w-full aspect-square rounded-2xl bg-[#FBF2E1] border-2 border-dashed border-[#EEDFC4] overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B4846C]/40"
                :aria-label="picturePreview ? 'Change photo' : 'Upload photo'"
                @click="triggerFileInput"
              >
                <img
                  v-if="picturePreview"
                  :src="picturePreview"
                  class="w-full h-full object-cover"
                  alt=""
                />
                <span v-else class="w-full h-full flex flex-col items-center justify-center gap-1 text-[#B4846C]">
                  <Icon name="heroicons:photo" class="w-9 h-9 opacity-60" />
                  <span class="text-sm font-bold">Upload photo</span>
                </span>
                <span
                  v-if="picturePreview"
                  class="absolute inset-x-2 bottom-2 rounded-lg bg-white/90 text-[#3B1F0E] text-xs font-bold py-1.5 text-center shadow-sm opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                >
                  Change photo
                </span>
              </button>
              <input
                type="file"
                ref="fileInput"
                class="hidden"
                accept="image/*"
                @change="onFileChange"
              />
            </div>

            <!-- Name, category, description -->
            <div class="flex-1 min-w-0 flex flex-col gap-4 lg:h-60">
              <div class="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-4">
                <div>
                  <label for="item-name" class="block text-sm font-semibold text-[#3B1F0E] mb-1.5">Name</label>
                  <input
                    id="item-name"
                    v-model="form.menu_name"
                    type="text"
                    maxlength="150"
                    placeholder="e.g. Caramel Macchiato"
                    :class="fieldClass(!!errors.menu_name)"
                  />
                  <p v-if="errors.menu_name" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ errors.menu_name }}</p>
                </div>
                <div>
                  <span class="block text-sm font-semibold text-[#3B1F0E] mb-1.5">Category</span>
                  <DropdownList v-model="form.category_uuid" :options="categoryOptions" aria-label="Category" />
                </div>
              </div>

              <div class="lg:flex-1 lg:min-h-0 flex flex-col">
                <label for="item-description" class="block text-sm font-semibold text-[#3B1F0E] mb-1.5">
                  Description <span class="font-normal text-[#9E7060]">(optional)</span>
                </label>
                <textarea
                  id="item-description"
                  v-model="form.description"
                  rows="3"
                  placeholder="What makes this item worth ordering?"
                  :class="[fieldClass(false), 'resize-none lg:flex-1 lg:min-h-0']"
                ></textarea>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Pricing ─────────────────────────────────────────── -->
        <section class="py-7" aria-labelledby="item-pricing-title">
          <div class="mb-5">
            <h3 id="item-pricing-title" class="text-base font-bold text-[#3B1F0E]">Pricing</h3>
            <p class="text-sm text-[#9E7060] mt-1">What the cashier charges for one serving.</p>
          </div>

          <div class="min-w-0">
            <!-- Options that change the price grid below -->
            <div class="flex flex-wrap gap-2" role="group" aria-label="Price options">
              <label
                :class="[
                  'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold cursor-pointer select-none transition-colors focus-within:ring-2 focus-within:ring-[#B4846C]',
                  form.has_sizes ? 'border-[#3B1F0E] bg-[#3B1F0E] text-white' : 'border-[#EEDFC4] bg-[#fef8f0] text-[#7D5A50] hover:bg-[#FBF2E1]'
                ]"
              >
                <input
                  type="checkbox"
                  :checked="form.has_sizes"
                  @change="onSizesToggle"
                  class="sr-only"
                />
                <Icon :name="form.has_sizes ? 'heroicons:check' : 'heroicons:plus'" class="w-4 h-4" />
                Comes in sizes
              </label>
              <label
                :class="[
                  'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold cursor-pointer select-none transition-colors focus-within:ring-2 focus-within:ring-[#B4846C]',
                  form.is_hot_and_iced ? 'border-[#3B1F0E] bg-[#3B1F0E] text-white' : 'border-[#EEDFC4] bg-[#fef8f0] text-[#7D5A50] hover:bg-[#FBF2E1]'
                ]"
              >
                <input
                  v-model="form.is_hot_and_iced"
                  type="checkbox"
                  class="sr-only"
                />
                <Icon :name="form.is_hot_and_iced ? 'heroicons:check' : 'heroicons:plus'" class="w-4 h-4" />
                Hot and iced
              </label>
            </div>
            <p v-if="form.is_hot_and_iced" class="text-sm text-[#9E7060] mt-2">
              Hot and iced use the same recipe. Only the price changes.
            </p>

            <!-- One price, or hot and iced prices -->
            <div v-if="!form.has_sizes" class="mt-5 grid grid-cols-2 sm:grid-cols-[repeat(2,minmax(0,11rem))] gap-4">
              <div>
                <label for="item-price" class="block text-sm font-semibold text-[#3B1F0E] mb-1.5">{{ form.is_hot_and_iced ? 'Hot price' : 'Price' }}</label>
                <div class="relative">
                  <span class="pointer-events-none absolute inset-y-0 left-0 pl-4 flex items-center text-[#B4846C] font-semibold">₱</span>
                  <input
                    id="item-price"
                    v-model="form.base_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    :class="[fieldClass(!!errors.base_price), 'pl-9 tabular-nums']"
                  />
                </div>
                <p v-if="errors.base_price" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ errors.base_price }}</p>
              </div>
              <div v-if="form.is_hot_and_iced">
                <label for="item-iced-price" class="block text-sm font-semibold text-[#3B1F0E] mb-1.5">Iced price</label>
                <div class="relative">
                  <span class="pointer-events-none absolute inset-y-0 left-0 pl-4 flex items-center text-[#B4846C] font-semibold">₱</span>
                  <input
                    id="item-iced-price"
                    v-model="form.iced_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    :class="[fieldClass(!!errors.iced_price), 'pl-9 tabular-nums']"
                  />
                </div>
                <p v-if="errors.iced_price" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ errors.iced_price }}</p>
              </div>
            </div>

            <!-- Price per size (and per temperature) -->
            <div v-else class="mt-5">
              <div :class="['hidden sm:grid gap-3 mb-2 px-1', sizeGridClass]">
                <span class="text-xs font-bold text-[#B4846C] uppercase tracking-wider">Size</span>
                <span class="text-xs font-bold text-[#B4846C] uppercase tracking-wider">{{ form.is_hot_and_iced ? 'Hot price' : 'Price' }}</span>
                <span v-if="form.is_hot_and_iced" class="text-xs font-bold text-[#B4846C] uppercase tracking-wider">Iced price</span>
                <span class="w-10"></span>
              </div>

              <div class="space-y-3">
                <div
                  v-for="(size, index) in form.sizes"
                  :key="size.key"
                  :class="['grid gap-3 items-start', rowDivider, sizeGridClass]"
                >
                  <div class="col-span-full sm:col-span-1">
                    <label :for="`size-name-${size.key}`" class="block sm:hidden text-xs font-bold text-[#B4846C] uppercase tracking-wider mb-1">Size</label>
                    <input
                      :id="`size-name-${size.key}`"
                      v-model="size.name"
                      type="text"
                      maxlength="50"
                      placeholder="e.g. Small (12oz)"
                      :class="fieldClass(!!sizeErrors[index]?.name)"
                    />
                    <p v-if="sizeErrors[index]?.name" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ sizeErrors[index].name }}</p>
                  </div>

                  <div>
                    <label :for="`size-price-${size.key}`" class="block sm:hidden text-xs font-bold text-[#B4846C] uppercase tracking-wider mb-1">{{ form.is_hot_and_iced ? 'Hot price' : 'Price' }}</label>
                    <div class="relative">
                      <span class="pointer-events-none absolute inset-y-0 left-0 pl-4 flex items-center text-[#B4846C] font-semibold">₱</span>
                      <input
                        :id="`size-price-${size.key}`"
                        v-model="size.price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        :aria-label="sizeLabel(size, index) + (form.is_hot_and_iced ? ' hot price' : ' price')"
                        :class="[fieldClass(!!sizeErrors[index]?.price), 'pl-9 tabular-nums']"
                      />
                    </div>
                    <p v-if="sizeErrors[index]?.price" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ sizeErrors[index].price }}</p>
                  </div>

                  <div v-if="form.is_hot_and_iced">
                    <label :for="`size-iced-${size.key}`" class="block sm:hidden text-xs font-bold text-[#B4846C] uppercase tracking-wider mb-1">Iced price</label>
                    <div class="relative">
                      <span class="pointer-events-none absolute inset-y-0 left-0 pl-4 flex items-center text-[#B4846C] font-semibold">₱</span>
                      <input
                        :id="`size-iced-${size.key}`"
                        v-model="size.iced_price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        :aria-label="`${sizeLabel(size, index)} iced price`"
                        :class="[fieldClass(!!sizeErrors[index]?.iced_price), 'pl-9 tabular-nums']"
                      />
                    </div>
                    <p v-if="sizeErrors[index]?.iced_price" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ sizeErrors[index].iced_price }}</p>
                  </div>

                  <button
                    type="button"
                    @click="removeSize(index)"
                    class="self-end sm:self-start w-10 h-12 flex items-center justify-center rounded-xl text-[#D9534F] hover:bg-[#FDE8E8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9534F]/40"
                    :aria-label="`Remove ${sizeLabel(size, index)}`"
                  >
                    <Icon name="heroicons:trash" class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p v-if="sizesError" data-row-error class="text-red-500 text-xs font-bold mt-2 ml-1">{{ sizesError }}</p>

              <button
                v-if="form.sizes.length < MAX_SIZES"
                type="button"
                @click="addSize"
                class="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-sm font-bold text-[#7D5A50] hover:bg-[#FBF2E1] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]"
              >
                <Icon name="heroicons:plus" class="w-4 h-4" />
                Add size
              </button>
            </div>
          </div>
        </section>

        <!-- ── Recipe ──────────────────────────────────────────── -->
        <section class="py-7" aria-labelledby="item-recipe-title">
          <div class="mb-5">
            <h3 id="item-recipe-title" class="text-base font-bold text-[#3B1F0E]">Recipe</h3>
            <p class="text-sm text-[#9E7060] mt-1">The ingredients in one serving.</p>
          </div>

          <div class="min-w-0">
            <p v-if="form.has_sizes" class="text-sm text-[#9E7060] mb-4">
              Use "All sizes" for what every size gets the same of. Add a row per size for amounts that change, like milk.
            </p>

            <!-- Column headers (sm and up) -->
            <div :class="['hidden sm:grid gap-3 mb-2 px-1', recipeGridClass]">
              <span class="text-xs font-bold text-[#B4846C] uppercase tracking-wider">Ingredient</span>
              <span v-if="form.has_sizes" class="text-xs font-bold text-[#B4846C] uppercase tracking-wider">For</span>
              <span class="text-xs font-bold text-[#B4846C] uppercase tracking-wider">Amount</span>
              <span class="text-xs font-bold text-[#B4846C] uppercase tracking-wider">Unit</span>
              <span class="w-10"></span>
            </div>

            <div class="space-y-3">
              <div
                v-for="(recipe, index) in form.recipes"
                :key="index"
                :class="['grid gap-3 items-center', rowDivider, recipeGridClass]"
              >
                <div class="col-span-full sm:col-span-1">
                  <IngredientPicker
                    :ref="(el) => setIngredientInputRef(el, index)"
                    v-model:name="recipe.ingredient_name"
                    :ingredients="ingredients"
                    :used-names="usedNamesExcept(index)"
                    :invalid="!!rowErrors[index] || (triedSave && !!missingSizes[index])"
                    @pick="onPick(recipe, index, $event)"
                    @enter="handleEnterOnIngredient(index)"
                  />
                </div>

                <div v-if="form.has_sizes" class="col-span-full sm:col-span-1">
                  <DropdownList
                    v-model="recipe.size_key"
                    :options="sizeOptions"
                    aria-label="Size this amount is for"
                    @change="serverRowErrors = {}"
                  />
                </div>

                <input
                  :value="recipe.quantity_display"
                  @input="onQuantityInput(recipe, $event)"
                  data-amount-input
                  type="text"
                  inputmode="decimal"
                  placeholder="e.g. 1/4 or 2.5"
                  aria-label="Amount"
                  @keydown.enter.prevent="handleEnterOnIngredient(index)"
                  :class="[fieldClass(false), 'tabular-nums']"
                />

                <!-- An existing ingredient is always measured in its own unit. -->
                <DropdownList
                  v-model="recipe.unit"
                  :options="INGREDIENT_UNIT_OPTIONS"
                  :disabled="!!recipe.ingredient_uuid"
                  aria-label="Unit"
                  :title="recipe.ingredient_uuid ? `${recipe.ingredient_name} is measured in ${recipe.unit}` : undefined"
                />

                <button
                  type="button"
                  @click="removeIngredient(index)"
                  class="w-10 h-12 flex items-center justify-center rounded-xl text-[#D9534F] hover:bg-[#FDE8E8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9534F]/40"
                  :aria-label="`Remove ${recipe.ingredient_name.trim() || 'ingredient'}`"
                >
                  <Icon name="heroicons:trash" class="w-4 h-4" />
                </button>

                <!-- Messages get their own line under the row, so the inputs above stay aligned -->
                <div v-if="rowErrors[index] || missingSizes[index]" class="col-span-full -mt-1">
                  <p v-if="rowErrors[index]" data-row-error class="text-red-500 text-xs font-bold ml-1">{{ rowErrors[index] }}</p>
                  <!-- Set for some sizes only: offer the missing ones -->
                  <p
                    v-else-if="missingSizes[index]"
                    :data-row-error="triedSave ? '' : undefined"
                    :class="['text-xs font-bold ml-1 flex flex-wrap items-center gap-x-2 gap-y-1', triedSave ? 'text-red-500' : 'text-[#9E7060]']"
                  >
                    <span>Also needs an amount for</span>
                    <button
                      v-for="sizeKey in missingSizes[index]"
                      :key="sizeKey"
                      type="button"
                      @click="addMissingSize(index, sizeKey)"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-current hover:bg-[#FBF2E1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]"
                    >
                      <Icon name="heroicons:plus" class="w-3 h-3" />
                      {{ sizeLabel(form.sizes.find(s => s.key === sizeKey)!, form.sizes.findIndex(s => s.key === sizeKey)) }}
                    </button>
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              @click="addIngredient"
              class="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-sm font-bold text-[#7D5A50] hover:bg-[#FBF2E1] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]"
            >
              <Icon name="heroicons:plus" class="w-4 h-4" />
              Add ingredient
            </button>
          </div>
        </section>

        <!-- ── Add-ons ─────────────────────────────────────────── -->
        <section class="py-7" aria-labelledby="item-addons-title">
          <div class="mb-5">
            <h3 id="item-addons-title" class="text-base font-bold text-[#3B1F0E]">Add-ons</h3>
            <p class="text-sm text-[#9E7060] mt-1">Extras the cashier can add. Prices and ingredients are set on the Add-ons page.</p>
          </div>

          <div class="min-w-0">
            <p v-if="addons.length === 0" class="text-sm text-[#7D5A50] bg-[#fef8f0] border border-dashed border-[#EEDFC4] rounded-xl px-4 py-3">
              No add-ons yet. Create them on the Add-ons page, then pick them here.
            </p>
            <div v-else class="flex flex-wrap gap-2">
              <button
                v-for="addon in addons"
                :key="addon.uuid"
                type="button"
                role="checkbox"
                :aria-checked="form.addon_uuids.includes(addon.uuid)"
                @click="toggleAddon(addon.uuid)"
                :class="[
                  'flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]',
                  form.addon_uuids.includes(addon.uuid)
                    ? 'bg-[#3B1F0E] border-[#3B1F0E] text-white'
                    : 'bg-[#fef8f0] border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FBF2E1]'
                ]"
              >
                <Icon :name="form.addon_uuids.includes(addon.uuid) ? 'heroicons:check' : 'heroicons:plus'" class="w-4 h-4" />
                {{ addon.name }}
                <span :class="['tabular-nums', form.addon_uuids.includes(addon.uuid) ? 'text-white/70' : 'text-[#B4846C]']">+₱{{ Number(addon.price).toFixed(2) }}</span>
                <span v-if="!addon.is_available" class="text-xs font-normal opacity-70">(off)</span>
              </button>
            </div>
          </div>
        </section>

      </div>

      <!-- Footer -->
      <div class="px-6 md:px-8 py-4 border-t border-[#EEDFC4] flex items-center justify-end gap-3 bg-white">
        <button
          type="button"
          @click="handleClose"
          :disabled="isSubmitting"
          class="px-5 py-3 rounded-xl font-bold text-[#7D5A50] hover:bg-[#FBF2E1] transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="saveItem"
          :disabled="isSubmitting"
          class="bg-[#3B1F0E] text-white px-7 py-3 rounded-xl font-bold hover:bg-[#2A160A] transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3B1F0E]/40 focus-visible:ring-offset-2"
        >
          <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
          {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Save changes' : 'Add item') }}
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
