<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useMenuService } from '~/composables/useMenuService'
import { INGREDIENT_UNITS } from '~/utils/constants'

const props = defineProps<{
  show: boolean
  item: any | null
  categories: any[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const menuService = useMenuService()

const form = ref({
  menu_name: '',
  category_uuid: '',
  base_price: '',
  description: '',
  recipes: [] as { ingredient_name: string; quantity: string; unit: string }[]
})

const fileInput = ref<HTMLInputElement | null>(null)
const picturePreview = ref<string | null>(null)
const pictureFile = ref<File | null>(null)
const isSubmitting = ref(false)

const isEditMode = computed(() => !!props.item)

watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.item) {
      form.value = {
        menu_name: props.item.menu_name || '',
        category_uuid: props.item.category_uuid || 'uncategorized',
        base_price: props.item.base_price || '',
        description: props.item.description || '',
        recipes: props.item.recipes?.length 
          ? props.item.recipes.map((r: any) => ({
              ingredient_name: r.ingredient_name,
              quantity: r.quantity,
              unit: r.unit
            })) 
          : [{ ingredient_name: '', quantity: '', unit: INGREDIENT_UNITS[0] }]
      }
      picturePreview.value = props.item.picture || null
    } else {
      form.value = {
        menu_name: '',
        category_uuid: 'uncategorized',
        base_price: '',
        description: '',
        recipes: [{ ingredient_name: '', quantity: '', unit: INGREDIENT_UNITS[0] }]
      }
      picturePreview.value = null
    }
    pictureFile.value = null
  }
})

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

const addIngredient = () => {
  form.value.recipes.push({ ingredient_name: '', quantity: '', unit: INGREDIENT_UNITS[0] })
}

const removeIngredient = (index: number) => {
  form.value.recipes.splice(index, 1)
  if (form.value.recipes.length === 0) {
    addIngredient() // always keep one empty row
  }
}

const saveItem = async () => {
  if (!form.value.menu_name || !form.value.base_price) {
    alert('Item name and price are required.')
    return
  }

  isSubmitting.value = true
  try {
    const formData = new FormData()
    formData.append('menu_name', form.value.menu_name)
    formData.append('base_price', form.value.base_price.toString())
    
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

    formData.append('recipes', JSON.stringify(form.value.recipes))

    if (isEditMode.value) {
      formData.append('_method', 'PATCH')
      await menuService.updateMenuItem(props.item.uuid, formData)
    } else {
      await menuService.createMenuItem(formData)
    }

    emit('saved')
    emit('close')
  } catch (error) {
    console.error('Error saving item:', error)
    alert('Failed to save item. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Overlay -->
    <div 
      class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      @click="$emit('close')"
    ></div>

    <!-- Modal Content -->
    <div class="relative bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-8 py-5 border-b border-[#EEDFC4]">
        <h2 class="text-3xl font-display font-bold text-[#3B1F0E]">
          {{ isEditMode ? 'Edit Item' : 'Add Item' }}
        </h2>
        <button 
          @click="$emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F5F5] text-[#7D5A50] hover:bg-[#EEDFC4] transition-colors"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Body (Scrollable) -->
      <div class="flex-1 overflow-y-auto p-8 space-y-8">
        
        <!-- Top Section: Image & Basic Info -->
        <div class="flex flex-col md:flex-row gap-8">
          
          <!-- Image Upload -->
          <div class="w-full md:w-1/3 flex flex-col gap-2">
            <div 
              class="relative w-full aspect-[4/3] rounded-2xl bg-[#FBF2E1] border-2 border-dashed border-[#EEDFC4] overflow-hidden group cursor-pointer"
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
              <div class="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow hover:bg-gray-50 transition-colors">
                <Icon name="heroicons:pencil" class="w-4 h-4 text-[#7D5A50]" />
              </div>

              <!-- Hover overlay -->
              <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span class="bg-white/90 text-[#3B1F0E] px-3 py-1 rounded-lg text-sm font-bold shadow-sm">Change Image</span>
              </div>
            </div>
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
                  class="w-full bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#B4846C] focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-5">
              <div class="flex-1">
                <label class="block text-sm font-bold text-[#B4846C] uppercase tracking-wider mb-2">Category</label>
                <div class="relative">
                  <select 
                    v-model="form.category_uuid"
                    class="w-full bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl pl-4 pr-10 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#B4846C] focus:border-transparent transition-shadow"
                  >
                    <option value="uncategorized">Uncategorized</option>
                    <option v-for="cat in categories" :key="cat.uuid" :value="cat.uuid">
                      {{ cat.name }}
                    </option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#B4846C]">
                    <Icon name="heroicons:chevron-down" class="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div class="flex-1">
                <label class="block text-sm font-bold text-[#B4846C] uppercase tracking-wider mb-2">Price</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon name="heroicons:banknotes" class="w-5 h-5 text-[#B4846C]/60" />
                  </div>
                  <input 
                    v-model="form.base_price"
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    class="w-full bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#B4846C] focus:border-transparent transition-shadow"
                  />
                </div>
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

        <hr class="border-[#EEDFC4]" />

        <!-- Recipe Section -->
        <div>
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-display font-bold text-[#3B1F0E]">Recipe</h3>
            <button 
              @click="addIngredient"
              class="flex items-center gap-2 bg-[#7D5A50] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#6A4B42] transition-colors shadow-sm"
            >
              <Icon name="heroicons:plus" class="w-5 h-5" />
              Add Ingredient
            </button>
          </div>

          <!-- Recipe Table Headers (visible on md+) -->
          <div class="hidden md:grid grid-cols-[2fr_1fr_1fr_auto] gap-4 mb-2 px-1">
            <span class="text-sm font-bold text-[#B4846C] uppercase tracking-wider">Ingredient</span>
            <span class="text-sm font-bold text-[#B4846C] uppercase tracking-wider">Amount</span>
            <span class="text-sm font-bold text-[#B4846C] uppercase tracking-wider">Unit</span>
            <span class="w-10"></span> <!-- spacer for delete button -->
          </div>

          <!-- Recipe Rows -->
          <div class="space-y-4">
            <div 
              v-for="(recipe, index) in form.recipes" 
              :key="index"
              class="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-start md:items-center bg-white md:bg-transparent p-4 md:p-0 rounded-xl border border-[#EEDFC4] md:border-none"
            >
              <!-- Ingredient Name -->
              <div class="w-full">
                <label class="block md:hidden text-xs font-bold text-[#B4846C] uppercase mb-1">Ingredient</label>
                <input 
                  v-model="recipe.ingredient_name"
                  type="text" 
                  placeholder="e.g. Coffee"
                  class="w-full bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#B4846C] focus:border-transparent"
                />
              </div>

              <!-- Amount -->
              <div class="w-full">
                <label class="block md:hidden text-xs font-bold text-[#B4846C] uppercase mb-1">Amount</label>
                <input 
                  v-model="recipe.quantity"
                  type="number" 
                  step="0.1"
                  placeholder="e.g. 2"
                  class="w-full bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#B4846C] focus:border-transparent"
                />
              </div>

              <!-- Unit -->
              <div class="w-full relative">
                <label class="block md:hidden text-xs font-bold text-[#B4846C] uppercase mb-1">Unit</label>
                <div class="relative">
                  <select 
                    v-model="recipe.unit"
                    class="w-full bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl pl-4 pr-10 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#B4846C] focus:border-transparent"
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
                  class="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FDE8E8] text-[#D9534F] hover:bg-[#FCD6D6] transition-colors"
                  title="Remove Ingredient"
                >
                  <Icon name="heroicons:trash" class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="px-8 py-5 border-t border-[#EEDFC4] flex justify-end bg-white">
        <button 
          @click="saveItem"
          :disabled="isSubmitting"
          class="bg-[#3B1F0E] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#2A160A] transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
          {{ isSubmitting ? 'Saving...' : 'Confirm' }}
        </button>
      </div>

    </div>
  </div>
</template>
