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
  max_quantity: 1,
  is_available: true,
  recipes: [] as RecipeRow[],
  item_uuids: [] as string[]
})

function emptyRow(): RecipeRow {
  return { ingredient_uuid: null, ingredient_name: '', quantity_display: '', unit: INGREDIENT_UNITS[0] }
}

const ingredients = ref<Ingredient[]>([])
const menuItems = ref<Array<{ uuid: string; menu_name: string }>>([])
const itemSearch = ref('')

async function loadOptions() {
  const [ingredientRes, itemRes] = await Promise.allSettled([menuService.getIngredients(), menuService.getMenuItems()])
  ingredients.value = ingredientRes.status === 'fulfilled' ? ingredientRes.value.ingredients ?? [] : []
  if (itemRes.status === 'fulfilled') {
    const items = itemRes.value.items as any
    menuItems.value = (Array.isArray(items) ? items : items?.data ?? []).map((i: any) => ({ uuid: i.uuid, menu_name: i.menu_name }))
  } else {
    menuItems.value = []
  }
}

const filteredMenuItems = computed(() => {
  const q = itemSearch.value.trim().toLowerCase()
  return q ? menuItems.value.filter(i => i.menu_name.toLowerCase().includes(q)) : menuItems.value
})

function toggleItem(uuid: string) {
  const list = form.value.item_uuids
  form.value.item_uuids = list.includes(uuid) ? list.filter(u => u !== uuid) : [...list, uuid]
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
  loadOptions()

  const a = props.addon
  form.value = {
    name: a?.name ?? '',
    price: a ? String(a.price) : '',
    max_quantity: a?.max_quantity ?? 1,
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
})

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
  const max = Number(form.value.max_quantity)
  if (!Number.isInteger(max) || max < 1 || max > MAX_PER_DRINK) {
    errors.value.max_quantity = `Between 1 and ${MAX_PER_DRINK}.`
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
      const match = field.match(/^recipes\.(\d+)\./)
      if (match) {
        // Map back past the blank rows that were dropped.
        const row = form.value.recipes.indexOf(rows[Number(match[1])])
        if (row >= 0) rowMessages[row] ??= messages[0]
      } else if (field === 'name' || field === 'price' || field === 'max_quantity') {
        errors.value[field] = messages[0]
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
  'w-full bg-[#fef8f0] border text-[#3B1F0E] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow',
  invalid ? 'border-red-500 focus:ring-red-500' : 'border-[#EEDFC4] focus:ring-[#B4846C]'
]
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" @click="handleClose"></div>

    <div class="relative bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between px-8 py-5 border-b border-[#EEDFC4]">
        <h2 class="text-3xl font-display font-bold text-[#3B1F0E]">
          {{ isEditMode ? 'Edit Add-on' : 'Add Add-on' }}
        </h2>
        <button
          @click="handleClose"
          class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F5F5] text-[#7D5A50] hover:bg-[#EEDFC4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/40"
          title="Close Modal"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div ref="bodyEl" class="flex-1 overflow-y-auto p-8 space-y-8">
        <div class="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-5">
          <div>
            <label class="block text-sm font-bold text-[#B4846C] uppercase tracking-wider mb-2">Name</label>
            <input v-model="form.name" type="text" maxlength="100" placeholder="e.g. Oreo Crumbles" :class="inputClass(!!errors.name)" />
            <p v-if="errors.name" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ errors.name }}</p>
          </div>
          <div>
            <label class="block text-sm font-bold text-[#B4846C] uppercase tracking-wider mb-2">Price</label>
            <input v-model="form.price" type="number" step="0.01" min="0" placeholder="0.00" :class="inputClass(!!errors.price)" />
            <p v-if="errors.price" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ errors.price }}</p>
          </div>
          <div>
            <label class="block text-sm font-bold text-[#B4846C] uppercase tracking-wider mb-2">Max per drink</label>
            <input v-model.number="form.max_quantity" type="number" min="1" :max="MAX_PER_DRINK" step="1" :class="inputClass(!!errors.max_quantity)" />
            <p v-if="errors.max_quantity" data-row-error class="text-red-500 text-xs font-bold mt-1 ml-1">{{ errors.max_quantity }}</p>
          </div>
        </div>

        <label class="inline-flex items-center gap-2 text-sm font-bold text-[#7D5A50] cursor-pointer select-none">
          <input v-model="form.is_available" type="checkbox" class="w-4 h-4 rounded accent-[#3B1F0E]" />
          Available at the register
        </label>

        <hr class="border-[#EEDFC4]" />

        <!-- Recipe -->
        <div>
          <div class="mb-4">
            <h3 class="text-2xl font-display font-bold text-[#3B1F0E]">Recipe</h3>
            <p class="text-sm text-[#9E7060] mt-1">What one serving uses. A drink with 2 of this add-on uses twice as much. Leave empty if it uses nothing you track.</p>
          </div>

          <div class="hidden md:grid grid-cols-[2fr_1fr_1fr_auto] gap-4 mb-2 px-1">
            <span class="text-sm font-bold text-[#B4846C] uppercase tracking-wider">Ingredient</span>
            <span class="text-sm font-bold text-[#B4846C] uppercase tracking-wider">Amount</span>
            <span class="text-sm font-bold text-[#B4846C] uppercase tracking-wider">Unit</span>
            <span class="w-8"></span>
          </div>

          <div class="space-y-4">
            <div
              v-for="(recipe, index) in form.recipes"
              :key="index"
              class="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-start md:items-center bg-white md:bg-transparent p-4 md:p-0 rounded-xl border border-[#EEDFC4] md:border-none"
            >
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

              <div class="w-full relative">
                <label class="block md:hidden text-xs font-bold text-[#B4846C] uppercase mb-1">Unit</label>
                <DropdownList
                  v-model="recipe.unit"
                  :options="INGREDIENT_UNIT_OPTIONS"
                  :disabled="!!recipe.ingredient_uuid"
                  :title="recipe.ingredient_uuid ? `${recipe.ingredient_name} is measured in ${recipe.unit}` : undefined"
                />
              </div>

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

          <button
            @click="addIngredient"
            class="w-full mt-4 flex items-center justify-center py-3 rounded-xl border border-[#EEDFC4] bg-[#fef8f0]/30 hover:bg-[#EEDFC4]/30 text-[#B4846C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#B4846C]"
            title="Add Ingredient"
          >
            <Icon name="heroicons:plus" class="w-5 h-5" />
          </button>
        </div>

        <hr class="border-[#EEDFC4]" />

        <!-- Items that offer it -->
        <div>
          <div class="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h3 class="text-2xl font-display font-bold text-[#3B1F0E]">Offered On</h3>
              <p class="text-sm text-[#9E7060] mt-1">{{ form.item_uuids.length }} of {{ menuItems.length }} menu items</p>
            </div>
            <SearchInput v-model="itemSearch" placeholder="Search items" clearable class="sm:w-56" />
          </div>

          <p v-if="menuItems.length === 0" class="text-sm text-[#7D5A50]">No menu items yet.</p>
          <div v-else class="max-h-64 overflow-y-auto border border-[#EEDFC4] rounded-xl divide-y divide-[#EEDFC4]">
            <label
              v-for="item in filteredMenuItems"
              :key="item.uuid"
              class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#fef8f0]"
            >
              <input
                type="checkbox"
                :checked="form.item_uuids.includes(item.uuid)"
                @change="toggleItem(item.uuid)"
                class="w-4 h-4 rounded accent-[#3B1F0E]"
              />
              <span class="text-sm text-[#3B1F0E]">{{ item.menu_name }}</span>
            </label>
            <p v-if="filteredMenuItems.length === 0" class="px-4 py-3 text-sm text-[#7D5A50]">No items match "{{ itemSearch.trim() }}".</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-8 py-5 border-t border-[#EEDFC4] flex items-center justify-between gap-3 bg-white">
        <button
          v-if="isEditMode"
          @click="confirmDelete"
          class="px-4 py-3 rounded-xl text-sm font-bold text-[#D9534F] hover:bg-[#FDE8E8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D9534F]/40"
        >
          Delete
        </button>
        <span v-else></span>
        <button
          @click="save"
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
