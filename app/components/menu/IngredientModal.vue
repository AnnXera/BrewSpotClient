<!-- app/components/menu/IngredientModal.vue -->
<!-- Add or edit an ingredient: rename, change unit (only while unused), retire/restore. -->
<script setup lang="ts">
import { INGREDIENT_UNITS } from '~/utils/constants'
import type { Ingredient, IngredientPayload } from '~/services/MenuService'
import ConfirmModal from '~/components/common/ConfirmModal.vue'

const props = defineProps<{
  show: boolean
  ingredient: Ingredient | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', message: string): void
}>()

const menuService = useMenuService()

const form = ref({ name: '', unit: INGREDIENT_UNITS[0] })
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

// Recipe amounts are stored in the ingredient's unit, so it's fixed while in use.
const unitLocked = computed(() => (props.ingredient?.used_in ?? 0) > 0)

watch(() => props.show, (open) => {
  if (!open) return
  errors.value = {}
  form.value = props.ingredient
    ? { name: props.ingredient.name, unit: props.ingredient.unit }
    : { name: '', unit: INGREDIENT_UNITS[0] }
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

  save(unitLocked.value ? { name: form.value.name } : { name: form.value.name, unit: form.value.unit })
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
  <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')"></div>

    <div class="relative bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between px-8 py-5 border-b border-[#EEDFC4]">
        <h2 class="text-3xl font-display font-bold text-[#3B1F0E]">
          {{ isEditMode ? 'Edit Ingredient' : 'Add Ingredient' }}
        </h2>
        <button
          type="button"
          class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F5F5] text-[#7D5A50] hover:bg-[#EEDFC4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/40"
          title="Close Modal"
          @click="emit('close')"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <form class="flex-1 overflow-y-auto p-8 space-y-5" @submit.prevent="submit">
        <div
          v-if="errors.general"
          class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
        >
          {{ errors.general }}
        </div>

        <div v-if="ingredient && !ingredient.is_active" class="p-3 rounded-xl bg-[#FDF8F3] border border-[#EEDFC4] text-[#7D5A50] text-sm">
          This ingredient is retired, so it doesn't show when adding recipes.
        </div>

        <div>
          <label class="block text-sm font-bold text-[#B4846C] uppercase tracking-wider mb-2">Ingredient Name</label>
          <input
            v-model="form.name"
            type="text"
            maxlength="100"
            placeholder="e.g. Oat Milk"
            :class="[
              'w-full bg-[#fef8f0] border text-[#3B1F0E] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent',
              errors.name ? 'border-red-500 focus:ring-red-500' : 'border-[#EEDFC4] focus:ring-[#B4846C]'
            ]"
          />
          <p v-if="errors.name" class="text-red-500 text-xs font-bold mt-1 ml-1">{{ errors.name }}</p>
          <p v-else-if="isEditMode && ingredient?.used_in" class="text-[#9E7060] text-xs mt-1 ml-1">
            Renaming updates every recipe that uses it.
          </p>
        </div>

        <div>
          <label class="block text-sm font-bold text-[#B4846C] uppercase tracking-wider mb-2">Unit</label>
          <div class="relative">
            <select
              v-model="form.unit"
              :disabled="unitLocked"
              :class="[
                'w-full bg-[#fef8f0] border text-[#3B1F0E] rounded-xl pl-4 pr-10 py-3 appearance-none focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed',
                errors.unit ? 'border-red-500 focus:ring-red-500' : 'border-[#EEDFC4] focus:ring-[#B4846C]'
              ]"
            >
              <option v-for="unit in INGREDIENT_UNITS" :key="unit" :value="unit">{{ unit }}</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#B4846C]">
              <Icon name="heroicons:chevron-down" class="w-5 h-5" />
            </div>
          </div>
          <p v-if="errors.unit" class="text-red-500 text-xs font-bold mt-1 ml-1">{{ errors.unit }}</p>
          <p v-else-if="unitLocked" class="text-[#9E7060] text-xs mt-1 ml-1">
            Used in {{ ingredient!.used_in }} {{ ingredient!.used_in === 1 ? 'item' : 'items' }}, so the unit can't change.
            Remove it from those recipes first.
          </p>
        </div>

        <!-- Hidden submit so Enter in the name field saves -->
        <button type="submit" class="hidden" />
      </form>

      <!-- Footer -->
      <div class="px-8 py-5 border-t border-[#EEDFC4] flex items-center gap-3 bg-white">
        <button
          v-if="ingredient"
          type="button"
          :disabled="isSubmitting"
          class="px-4 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
          :class="ingredient.is_active ? 'text-[#D9534F] hover:bg-[#FDE8E8]' : 'text-emerald-700 hover:bg-emerald-50'"
          @click="toggleActive"
        >
          {{ ingredient.is_active ? 'Retire' : 'Restore' }}
        </button>

        <div class="flex-1" />

        <button
          type="button"
          :disabled="isSubmitting"
          class="bg-[#3B1F0E] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#2A160A] transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3B1F0E]/40 focus-visible:ring-offset-2"
          @click="submit"
        >
          <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
          {{ isSubmitting ? 'Saving...' : 'Confirm' }}
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
