<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useMenuService } from '~/composables/useMenuService'
import { INGREDIENT_UNITS } from '~/utils/constants'
import { parseQuantity, formatQuantity, sanitizeQuantity } from '~/utils/fraction'
import type { Ingredient, MenuAddon } from '~/services/MenuService'
import IngredientPicker from '~/components/menu/IngredientPicker.vue'
import SelectMenu from '~/components/common/SelectMenu.vue'
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
  price: string
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
  description: '',
  recipes: [] as RecipeRow[],
  has_sizes: false,
  sizes: [] as SizeRow[],
  addon_uuids: [] as string[]
})

function emptyRow(sizeKey: string | null = null): RecipeRow {
  return { ingredient_uuid: null, ingredient_name: '', quantity_display: '', unit: INGREDIENT_UNITS[0], size_key: sizeKey }
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
  const scope = scopeOf(form.value.recipes[index])
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

// --- Sizes ---

const sizeErrors = ref<Record<number, { name?: string; price?: string }>>({})
const sizesError = ref('')

function sizeLabel(size: SizeRow, index: number) {
  return size.name.trim() || `Size ${index + 1}`
}

function addSize() {
  if (form.value.sizes.length >= MAX_SIZES) return
  form.value.sizes.push({ key: newSizeKey(), uuid: null, name: '', price: '' })
}

// The size's own ingredient amounts go with it.
function removeSize(index: number) {
  const [removed] = form.value.sizes.splice(index, 1)
  form.value.recipes = form.value.recipes.filter(r => r.size_key !== removed.key)
  if (form.value.recipes.length === 0) form.value.recipes.push(emptyRow())
  sizeErrors.value = {}
  serverRowErrors.value = {}
}

function turnSizesOn() {
  if (form.value.sizes.length === 0) {
    form.value.sizes = [
      { key: newSizeKey(), uuid: null, name: 'Small', price: String(form.value.base_price ?? '') },
      { key: newSizeKey(), uuid: null, name: 'Large', price: '' }
    ]
  }
  form.value.has_sizes = true
}

function turnSizesOff() {
  // One price again: start from the lowest size price.
  const prices = form.value.sizes.map(s => parseFloat(s.price)).filter(p => !Number.isNaN(p))
  if (!form.value.base_price && prices.length) form.value.base_price = String(Math.min(...prices))
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
    const errs: { name?: string; price?: string } = {}
    const key = normalizeName(size.name)
    if (!key) errs.name = 'Size name is required.'
    else if (seen.has(key)) errs.name = 'Two sizes have the same name.'
    seen.add(key)
    if (size.price === '' || size.price == null || Number(size.price) < 0) errs.price = 'Price is required.'
    if (errs.name || errs.price) sizeErrors.value[i] = errs
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

const isDirty = ref(false)
const errors = ref({
  menu_name: '',
  base_price: ''
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    errors.value = { menu_name: '', base_price: '' }
    serverRowErrors.value = {}
    sizeErrors.value = {}
    sizesError.value = ''
    loadIngredients()
    loadAddons()
    if (props.item) {
      const sizes: SizeRow[] = (props.item.sizes ?? []).map((s: any) => ({ key: s.uuid, uuid: s.uuid, name: s.name, price: String(s.price) }))
      form.value = {
        menu_name: props.item.menu_name || '',
        category_uuid: props.item.category_uuid || 'uncategorized',
        base_price: props.item.base_price || '',
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
  if (target.files && target.files.length > 0) {
    pictureFile.value = target.files[0]
    picturePreview.value = URL.createObjectURL(pictureFile.value)
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
  errors.value = { menu_name: '', base_price: '' }
  let hasError = false

  if (!form.value.menu_name) {
    errors.value.menu_name = 'Item name is required.'
    hasError = true
  }
  if (!form.value.has_sizes && !form.value.base_price) {
    errors.value.base_price = 'Price is required.'
    hasError = true
  }
  if (!validateSizes()) hasError = true

  if (Object.keys(rowErrors.value).length) hasError = true

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
      price: Number(s.price)
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
      const recipe = field.match(/^recipes\.(\d+)\./)
      const size = field.match(/^sizes\.(\d+)\.(name|price)$/)
      if (recipe) {
        rowMessages[Number(recipe[1])] ??= messages[0]
      } else if (size) {
        const i = Number(size[1])
        sizeErrors.value[i] = { ...sizeErrors.value[i], [size[2] as 'name' | 'price']: messages[0] }
        shownInForm = true
      } else if (field === 'sizes') {
        sizesError.value = messages[0]
        shownInForm = true
      } else if (field === 'base_price') {
        errors.value.base_price = messages[0]
        shownInForm = true
      } else if (field === 'addon_uuids') {
        showAlert('Save Failed', messages[0])
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

    <!-- Modal Content -->
    <div class="relative bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-8 py-5 border-b border-[#EEDFC4]">
        <h2 class="text-3xl font-display font-bold text-[#3B1F0E]">
          {{ isEditMode ? 'Edit Item' : 'Add Item' }}
        </h2>
        <button 
          @click="handleClose"
          class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F5F5] text-[#7D5A50] hover:bg-[#EEDFC4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/40"
          title="Close Modal"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Body (Scrollable) -->
      <div ref="bodyEl" class="flex-1 overflow-y-auto p-8 space-y-8">
        
        <!-- Top Section: Image & Basic Info -->
        <div class="flex flex-col md:flex-row gap-8">
          
          <!-- Image Upload -->
          <div class="w-full md:w-1/3 flex flex-col gap-2">
            <button 
              type="button"
              class="relative w-full aspect-[4/3] rounded-2xl bg-[#FBF2E1] border-2 border-dashed border-[#EEDFC4] overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B4846C]/40"
              @click="triggerFileInput"
            >
              <img 
                v-if="picturePreview" 
                :src="picturePreview" 
                class="w-full h-full object-cover"
                alt="Item preview"
              />
              <div v-else class="w-full h-full flex flex-col items-center justify-center text-[#B4846C]/60">
                <Icon name="heroicons:photo" class="w-12 h-12 mb-2" />
                <span class="text-sm font-bold">Upload Image</span>
              </div>
              
              <!-- Edit icon floating -->
              <div class="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow group-hover:bg-gray-50 transition-colors">
                <Icon name="heroicons:pencil" class="w-4 h-4 text-[#7D5A50]" />
              </div>

              <!-- Hover overlay -->
              <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span class="bg-white/90 text-[#3B1F0E] px-3 py-1 rounded-lg text-sm font-bold shadow-sm">Change Image</span>
              </div>
            </button>
            <input 
              type="file" 
              ref="fileInput" 
              class="hidden" 
              accept="image/*"
              @change="onFileChange"
            />
          </div>

          <!-- Basic Info Fields -->
          <div class="w-full md:w-2/3 flex flex-col gap-5">
            <div>
              <label class="block text-sm font-bold text-[#B4846C] uppercase tracking-wider mb-2">Item Name</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="heroicons:pencil" class="w-5 h-5 text-[#B4846C]/60" />
                </div>
                <input 
                  v-model="form.menu_name"
                  type="text" 
                  placeholder="e.g. Caramel Macchiato"
                  :class="[
                    'w-full bg-[#fef8f0] border text-[#3B1F0E] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow',
                    errors.menu_name ? 'border-red-500 focus:ring-red-500' : 'border-[#EEDFC4] focus:ring-[#B4846C]'
                  ]"
                />
              </div>
              <p v-if="errors.menu_name" class="text-red-500 text-xs font-bold mt-1 ml-1">{{ errors.menu_name }}</p>
            </div>

            <div class="flex flex-col sm:flex-row gap-5">
              <div class="flex-1">
                <label class="block text-sm font-bold text-[#B4846C] uppercase tracking-wider mb-2">Category</label>
                <SelectMenu v-model="form.category_uuid" :options="categoryOptions" />
              </div>

              <div class="flex-1">
                <label class="block text-sm font-bold text-[#B4846C] uppercase tracking-wider mb-2">Price</label>
                <p v-if="form.has_sizes" class="py-3 text-sm text-[#7D5A50]">Set for each size below.</p>
                <div v-else class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon name="heroicons:banknotes" class="w-5 h-5 text-[#B4846C]/60" />
                  </div>
                  <input 
                    v-model="form.base_price"
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    :class="[
                      'w-full bg-[#fef8f0] border text-[#3B1F0E] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow',
                      errors.base_price ? 'border-red-500 focus:ring-red-500' : 'border-[#EEDFC4] focus:ring-[#B4846C]'
                    ]"
                  />
                </div>
                <p v-if="errors.base_price && !form.has_sizes" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ errors.base_price }}</p>
                <label class="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[#7D5A50] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    :checked="form.has_sizes"
                    @change="onSizesToggle"
                    class="w-4 h-4 rounded accent-[#3B1F0E]"
                  />
                  Comes in sizes
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-bold text-[#B4846C] uppercase tracking-wider mb-2">Item Description</label>
          <textarea 
            v-model="form.description"
            rows="3"
            placeholder="Describe your delicious item..."
            class="w-full bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#B4846C] focus:border-transparent transition-shadow resize-none"
          ></textarea>
        </div>

        <!-- Sizes Section -->
        <template v-if="form.has_sizes">
          <hr class="border-[#EEDFC4]" />

          <div>
            <div class="mb-4">
              <h3 class="text-2xl font-display font-bold text-[#3B1F0E]">Sizes</h3>
              <p class="text-sm text-[#9E7060] mt-1">Each size has its own price. Set how much of each ingredient a size uses in the recipe below.</p>
            </div>

            <div class="hidden md:grid grid-cols-[2fr_1fr_auto] gap-4 mb-2 px-1">
              <span class="text-sm font-bold text-[#B4846C] uppercase tracking-wider">Size</span>
              <span class="text-sm font-bold text-[#B4846C] uppercase tracking-wider">Price</span>
              <span class="w-8"></span>
            </div>

            <div class="space-y-4">
              <div
                v-for="(size, index) in form.sizes"
                :key="size.key"
                class="flex flex-col md:grid md:grid-cols-[2fr_1fr_auto] gap-4 items-start md:items-center bg-white md:bg-transparent p-4 md:p-0 rounded-xl border border-[#EEDFC4] md:border-none"
              >
                <div class="w-full">
                  <label class="block md:hidden text-xs font-bold text-[#B4846C] uppercase mb-1">Size</label>
                  <input
                    v-model="size.name"
                    type="text"
                    maxlength="50"
                    placeholder="e.g. Small (12oz)"
                    :class="[
                      'w-full bg-[#fef8f0] border text-[#3B1F0E] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent',
                      sizeErrors[index]?.name ? 'border-red-500 focus:ring-red-500' : 'border-[#EEDFC4] focus:ring-[#B4846C]'
                    ]"
                  />
                  <p v-if="sizeErrors[index]?.name" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ sizeErrors[index].name }}</p>
                </div>

                <div class="w-full">
                  <label class="block md:hidden text-xs font-bold text-[#B4846C] uppercase mb-1">Price</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icon name="heroicons:banknotes" class="w-5 h-5 text-[#B4846C]/60" />
                    </div>
                    <input
                      v-model="size.price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      :class="[
                        'w-full bg-[#fef8f0] border text-[#3B1F0E] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent',
                        sizeErrors[index]?.price ? 'border-red-500 focus:ring-red-500' : 'border-[#EEDFC4] focus:ring-[#B4846C]'
                      ]"
                    />
                  </div>
                  <p v-if="sizeErrors[index]?.price" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ sizeErrors[index].price }}</p>
                </div>

                <div class="w-full md:w-auto flex justify-end md:justify-center mt-2 md:mt-0">
                  <button
                    type="button"
                    @click="removeSize(index)"
                    class="w-8 h-8 flex items-center justify-center rounded-lg text-[#D9534F] bg-[#fef8f0] hover:bg-[#FDE8E8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D9534F]/40"
                    :title="`Remove ${sizeLabel(size, index)}`"
                  >
                    <Icon name="heroicons:trash" class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <p v-if="sizesError" data-row-error class="text-red-500 text-xs font-bold mt-2 ml-1">{{ sizesError }}</p>

            <button
              v-if="form.sizes.length < MAX_SIZES"
              type="button"
              @click="addSize"
              class="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-[#EEDFC4] bg-[#fef8f0]/30 hover:bg-[#EEDFC4]/30 text-[#B4846C] text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[#B4846C]"
            >
              <Icon name="heroicons:plus" class="w-5 h-5" />
              Add size
            </button>
          </div>
        </template>

        <hr class="border-[#EEDFC4]" />

        <!-- Recipe Section -->
        <div>
          <div class="mb-4">
            <h3 class="text-2xl font-display font-bold text-[#3B1F0E]">Recipe</h3>
            <p v-if="form.has_sizes" class="text-sm text-[#9E7060] mt-1">Use "All sizes" for what every size gets the same of. Add a row per size for amounts that change, like milk.</p>
          </div>

          <!-- Recipe Table Headers (visible on md+) -->
          <div :class="['hidden md:grid gap-4 mb-2 px-1', form.has_sizes ? 'grid-cols-[2fr_1fr_1fr_1fr_auto]' : 'grid-cols-[2fr_1fr_1fr_auto]']">
            <span class="text-sm font-bold text-[#B4846C] uppercase tracking-wider">Ingredient</span>
            <span v-if="form.has_sizes" class="text-sm font-bold text-[#B4846C] uppercase tracking-wider">For</span>
            <span class="text-sm font-bold text-[#B4846C] uppercase tracking-wider">Amount</span>
            <span class="text-sm font-bold text-[#B4846C] uppercase tracking-wider">Unit</span>
            <span class="w-8"></span> <!-- Spacer for subtle delete button -->
          </div>

          <!-- Recipe Rows -->
          <div class="space-y-4">
            <div 
              v-for="(recipe, index) in form.recipes" 
              :key="index"
              :class="[
                'flex flex-col md:grid gap-4 items-start md:items-center bg-white md:bg-transparent p-4 md:p-0 rounded-xl border border-[#EEDFC4] md:border-none',
                form.has_sizes ? 'md:grid-cols-[2fr_1fr_1fr_1fr_auto]' : 'md:grid-cols-[2fr_1fr_1fr_auto]'
              ]"
            >
              <!-- Ingredient Name -->
              <div class="w-full">
                <label class="block md:hidden text-xs font-bold text-[#B4846C] uppercase mb-1">Ingredient</label>
                <IngredientPicker
                  :ref="(el) => setIngredientInputRef(el, index)"
                  v-model:name="recipe.ingredient_name"
                  :ingredients="ingredients"
                  :used-names="usedNamesExcept(index)"
                  :invalid="!!rowErrors[index]"
                  @pick="onPick(recipe, index, $event)"
                  @enter="handleEnterOnIngredient(index)"
                />
                <p v-if="rowErrors[index]" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ rowErrors[index] }}</p>
              </div>

              <!-- Size the amount is for -->
              <div v-if="form.has_sizes" class="w-full">
                <label class="block md:hidden text-xs font-bold text-[#B4846C] uppercase mb-1">For</label>
                <div class="relative">
                  <select
                    v-model="recipe.size_key"
                    @change="serverRowErrors = {}"
                    class="w-full bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl pl-4 pr-10 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#B4846C] focus:border-transparent"
                  >
                    <option :value="null">All sizes</option>
                    <option v-for="(size, sizeIndex) in form.sizes" :key="size.key" :value="size.key">
                      {{ sizeLabel(size, sizeIndex) }}
                    </option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#B4846C]">
                    <Icon name="heroicons:chevron-down" class="w-5 h-5" />
                  </div>
                </div>
              </div>

              <!-- Amount -->
              <div class="w-full">
                <label class="block md:hidden text-xs font-bold text-[#B4846C] uppercase mb-1">Amount</label>
                <input
                  :value="recipe.quantity_display"
                  @input="onQuantityInput(recipe, $event)"
                  type="text"
                  inputmode="decimal"
                  placeholder="e.g. 1/4 or 2.5"
                  @keydown.enter.prevent="handleEnterOnIngredient(index)"
                  class="w-full bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#B4846C] focus:border-transparent"
                />
              </div>

              <!-- Unit -->
              <div class="w-full relative">
                <label class="block md:hidden text-xs font-bold text-[#B4846C] uppercase mb-1">Unit</label>
                <div class="relative">
                  <!-- An existing ingredient is always measured in its own unit. -->
                  <select 
                    v-model="recipe.unit"
                    :disabled="!!recipe.ingredient_uuid"
                    :title="recipe.ingredient_uuid ? `${recipe.ingredient_name} is measured in ${recipe.unit}` : undefined"
                    @keydown.enter.prevent="handleEnterOnIngredient(index)"
                    class="w-full bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl pl-4 pr-10 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#B4846C] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option v-for="unit in INGREDIENT_UNITS" :key="unit" :value="unit">
                      {{ unit }}
                    </option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#B4846C]">
                    <Icon name="heroicons:chevron-down" class="w-5 h-5" />
                  </div>
                </div>
              </div>

              <!-- Delete Button -->
              <div class="w-full md:w-auto flex justify-end md:justify-center mt-2 md:mt-0">
                <button 
                  @click="removeIngredient(index)"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-[#D9534F] bg-[#fef8f0] hover:bg-[#FDE8E8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D9534F]/40"
                  title="Remove Ingredient"
                >
                  <Icon name="heroicons:trash" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Add Row Button -->
          <button 
            @click="addIngredient"
            class="w-full mt-4 flex items-center justify-center py-3 rounded-xl border border-[#EEDFC4] bg-[#fef8f0]/30 hover:bg-[#EEDFC4]/30 text-[#B4846C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#B4846C]"
          >
            <Icon name="heroicons:plus" class="w-5 h-5" />
          </button>
        </div>

        <hr class="border-[#EEDFC4]" />

        <!-- Add-ons Section -->
        <div>
          <div class="mb-4">
            <h3 class="text-2xl font-display font-bold text-[#3B1F0E]">Add-ons</h3>
            <p class="text-sm text-[#9E7060] mt-1">Extras the cashier can add to this item. Their prices and ingredients are set on the Add-ons page.</p>
          </div>

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
                'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]',
                form.addon_uuids.includes(addon.uuid)
                  ? 'bg-[#3B1F0E] border-[#3B1F0E] text-white'
                  : 'bg-[#fef8f0] border-[#EEDFC4] text-[#7D5A50] hover:bg-[#EEDFC4]/40'
              ]"
            >
              <Icon :name="form.addon_uuids.includes(addon.uuid) ? 'heroicons:check' : 'heroicons:plus'" class="w-4 h-4" />
              {{ addon.name }}
              <span :class="form.addon_uuids.includes(addon.uuid) ? 'text-white/70' : 'text-[#B4846C]'">+₱{{ Number(addon.price).toFixed(2) }}</span>
              <span v-if="!addon.is_available" class="text-xs font-normal opacity-70">(off)</span>
            </button>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="px-8 py-5 border-t border-[#EEDFC4] flex justify-end bg-white">
        <button 
          @click="saveItem"
          :disabled="isSubmitting"
          class="bg-[#3B1F0E] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#2A160A] transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3B1F0E]/40 focus-visible:ring-offset-2"
        >
          <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
          {{ isSubmitting ? 'Saving...' : 'Confirm' }}
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
