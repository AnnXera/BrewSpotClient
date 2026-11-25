<!-- app/components/menu/IngredientModal.vue -->
<!-- Add or edit an ingredient: rename, change unit, retire/restore. -->
<script setup lang="ts">
import { INGREDIENT_UNITS, INGREDIENT_UNIT_OPTIONS } from '~/utils/constants'
import type { Ingredient, IngredientPayload } from '~/services/MenuService'
import ConfirmModal from '~/components/common/ConfirmModal.vue'
import DropdownList from '~/components/common/DropdownList.vue'

const props = defineProps<{
  show: boolean
  ingredient: Ingredient | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', message: string): void
}>()

const menuService = useMenuService()

// INGREDIENT_UNITS is a non-empty literal list; the fallback only satisfies strict indexing.
const DEFAULT_UNIT = INGREDIENT_UNITS[0] ?? ''

const form = ref({ name: '', unit: DEFAULT_UNIT })
const errors = ref<{ name?: string; unit?: string; general?: string }>({})
const isSubmitting = ref(false)

const confirmModal = ref({
  show: false,
  title: '',
  message: '',
  confirmText: '',
  isDestructive: false,
  onConfirm: () => {}
})

const isEditMode = computed(() => !!props.ingredient)

// Recipe amounts are stored in the ingredient's unit and are not converted,
// so warn when changing the unit of an ingredient that recipes already use.
const unitChangedWhileUsed = computed(() =>
  !!props.ingredient && props.ingredient.used_in > 0 && form.value.unit !== props.ingredient.unit
)

watch(() => props.show, (open) => {
  if (!open) return
  errors.value = {}
  form.value = props.ingredient
    ? { name: props.ingredient.name, unit: props.ingredient.unit }
    : { name: '', unit: DEFAULT_UNIT }
})

function applyServerErrors(error: any) {
  const serverErrors = error?.data?.errors as Record<string, string[]> | undefined
  errors.value = {
    name: serverErrors?.name?.[0],
    unit: serverErrors?.unit?.[0],
    general: serverErrors ? undefined : (error?.data?.message ?? 'Something went wrong. Please try again.'),
  }
}

async function save(payload: IngredientPayload) {
  isSubmitting.value = true
  try {
    const res = props.ingredient
      ? await menuService.updateIngredient(props.ingredient.uuid, payload)
      : await menuService.createIngredient(payload)
    emit('saved', res.message)
    emit('close')
  } catch (error) {
    applyServerErrors(error)
  } finally {
    isSubmitting.value = false
  }
}

function submit() {
  errors.value = {}
  if (!form.value.name.trim()) {
    errors.value.name = 'Ingredient name is required.'
    return
  }

  save({ name: form.value.name, unit: form.value.unit })
}

function toggleActive() {
  if (!props.ingredient) return

  const retiring = props.ingredient.is_active
  if (retiring && props.ingredient.used_in > 0) {
    const items = props.ingredient.used_in === 1 ? '1 menu item' : `${props.ingredient.used_in} menu items`
    
    confirmModal.value = {
      show: true,
      title: 'Retire Ingredient?',
      message: `${props.ingredient.name} is used in ${items}. Those recipes keep it, but it won't show when adding new recipes. Retire it?`,
      confirmText: 'Retire',
      isDestructive: true,
      onConfirm: () => {
        confirmModal.value.show = false
        save({ is_active: !retiring })
      }
    }
    return
  }

  save({ is_active: !retiring })
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200"
      @click="emit('close')"
      aria-hidden="true"
    ></div>

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ingredient-modal-title"
      class="relative bg-white rounded-3xl w-full max-w-[560px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="flex items-center justify-between gap-4 px-6 md:px-8 pt-5 pb-4 border-b border-[#EEDFC4] bg-[#FDFBF7] shrink-0">
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="w-10 h-10 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="heroicons:beaker" class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h2 id="ingredient-modal-title" class="text-xl font-display font-extrabold text-[#3B1F0E] truncate">
              {{ isEditMode ? 'Edit Ingredient' : 'Add New Ingredient' }}
            </h2>
            <p class="text-xs text-[#8A6E64] mt-0.5">
              {{ isEditMode ? 'Rename it, change its unit, or retire it from new recipes.' : 'Add a raw ingredient and the unit recipes measure it in.' }}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close modal"
          class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3B1F0E] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          @click="emit('close')"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <form class="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-4 space-y-3.5" @submit.prevent="submit">
        <div
          v-if="errors.general"
          role="alert"
          class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2"
        >
          <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 shrink-0 mt-px" />
          <span>{{ errors.general }}</span>
        </div>

        <div v-if="ingredient && !ingredient.is_active" class="p-3 rounded-xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] text-xs flex items-start gap-2">
          <Icon name="heroicons:archive-box" class="w-4 h-4 shrink-0 mt-px" />
          <span>This ingredient is retired, so it doesn't show when adding recipes.</span>
        </div>

        <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
            <span>Ingredient Details</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3.5">
            <!-- Name -->
            <label class="block min-w-0">
              <span class="block text-xs font-bold text-[#3B1F0E] mb-1">Ingredient Name <span class="text-red-500">*</span></span>
              <input
                v-model="form.name"
                type="text"
                maxlength="100"
                placeholder="e.g. Oat Milk"
                class="w-full h-11 px-3.5 rounded-xl border bg-white text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                :class="errors.name ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
              />
            </label>

            <!-- Unit -->
            <div class="min-w-0">
              <span class="block text-xs font-bold text-[#3B1F0E] mb-1">Unit <span class="text-red-500">*</span></span>
              <DropdownList
                v-model="form.unit"
                :options="INGREDIENT_UNIT_OPTIONS"
                :invalid="!!errors.unit"
                size="sm"
                card
                aria-label="Unit"
              />
            </div>
          </div>

          <!-- Field messages sit under the row so the two inputs stay aligned -->
          <p v-if="errors.name" class="text-xs text-red-600 font-semibold flex items-center gap-1">
            <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
            <span>{{ errors.name }}</span>
          </p>
          <p v-if="errors.unit" class="text-xs text-red-600 font-semibold flex items-center gap-1">
            <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
            <span>{{ errors.unit }}</span>
          </p>
          <p v-if="!errors.name && isEditMode && ingredient?.used_in" class="text-[11px] text-[#8A6E64]">
            Renaming updates every recipe that uses it.
          </p>
          <div v-if="!errors.unit && unitChangedWhileUsed" class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
            <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 shrink-0 mt-px text-amber-600" />
            <span>
              Used in {{ ingredient!.used_in }} {{ ingredient!.used_in === 1 ? 'item' : 'items' }}. Recipe amounts stay the same number
              but will now read as {{ form.unit }}, so review those recipes after saving.
            </span>
          </div>
        </div>

        <!-- Hidden submit so Enter in the name field saves -->
        <button type="submit" class="hidden" />
      </form>

      <!-- Footer: Cancel (and Retire/Restore) on the left, the main action on the right -->
      <div class="flex items-center justify-between gap-3 px-6 md:px-8 py-3.5 border-t border-[#EEDFC4] bg-[#FAF8F5] rounded-b-3xl shrink-0">
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            v-if="ingredient"
            type="button"
            :disabled="isSubmitting"
            class="px-4 py-2 rounded-xl border bg-white text-xs sm:text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2"
            :class="ingredient.is_active
              ? 'border-red-200 text-red-600 hover:bg-red-50 focus-visible:ring-red-300'
              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 focus-visible:ring-emerald-300'"
            @click="toggleActive"
          >
            <Icon :name="ingredient.is_active ? 'heroicons:archive-box-arrow-down' : 'heroicons:arrow-uturn-left'" class="w-4 h-4" />
            <span>{{ ingredient.is_active ? 'Retire' : 'Restore' }}</span>
          </button>
        </div>

        <button
          type="button"
          :disabled="isSubmitting"
          class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
          @click="submit"
        >
          <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <span>{{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Ingredient' }}</span>
        </button>
      </div>
    </div>

    <ConfirmModal
      :show="confirmModal.show"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :confirmText="confirmModal.confirmText"
      :isDestructive="confirmModal.isDestructive"
      @close="confirmModal.show = false"
      @confirm="confirmModal.onConfirm"
    />
  </div>
</template>
