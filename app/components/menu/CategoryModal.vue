<script setup lang="ts">
import { ref, watch, computed, toRef } from 'vue'
import { useMenuService } from '~/composables/useMenuService'
import { useNavCategories } from '~/composables/useNavCategories'
import { useMenuItemSort } from '~/composables/useMenuItemSort'
import MenuToolbar from '~/components/menu/MenuToolbar.vue'
import CategoryMoveWarning from '~/components/menu/CategoryMoveWarning.vue'
import { useCategoryMoves } from '~/composables/useCategoryMoves'
import { useDialogs } from '~/composables/useDialogs'
import AlertModal from '~/components/common/AlertModal.vue'

const props = defineProps<{
  show: boolean
  category: any | null
  items: any[] // all items in the cafe to pick from
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const menuService = useMenuService()
const { refresh: refreshNavCategories } = useNavCategories() // keeps the sidebar's category list current
const { alertDialog, showAlert } = useDialogs()

const form = ref({
  name: '',
  items: [] as string[],
  picture: null as File | null
})

const picturePreview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const { searchQuery, sortBy, sortOptions, filteredAndSortedItems: filteredItems } = useMenuItemSort(toRef(props, 'items'))
const isSubmitting = ref(false)
const errors = ref({ name: '', picture: '' })

const isEditMode = computed(() => !!props.category)

const { otherCategoryName, movedItems } = useCategoryMoves(
  toRef(props, 'items'),
  computed(() => form.value.items),
  computed(() => props.category?.uuid),
)

watch(() => props.show, (newVal) => {
  if (newVal) {
    errors.value = { name: '', picture: '' }
    searchQuery.value = ''
    sortBy.value = 'name-asc'
    originalPicture.value = null
    cropperFile.value = null
    if (props.category) {
      form.value = {
        name: props.category.name || '',
        items: props.items
          .filter(i => i.category_uuid === props.category.uuid)
          .map(i => i.uuid),
        picture: null
      }
      picturePreview.value = props.category.picture ? getImageUrl(props.category.picture) : null
    } else {
      form.value = {
        name: '',
        items: [],
        picture: null
      }
      picturePreview.value = null
    }
  }
})

const toggleItem = (uuid: string) => {
  const index = form.value.items.indexOf(uuid)
  if (index === -1) {
    form.value.items.push(uuid)
  } else {
    form.value.items.splice(index, 1)
  }
}

const getImageUrl = (path: string | null) => {
  if (!path) return null
  if (path.startsWith('http')) return path
  if (path.startsWith('blob:')) return path
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiBase
  return `${apiUrl.replace('/api', '')}/storage/${path}`
}

// Cropping: a newly picked file opens the cropper; the untouched original is kept so
// "Adjust" always re-crops from full quality instead of cropping the crop.
const originalPicture = ref<File | null>(null)
const cropperFile = ref<File | null>(null)

const setPreview = (file: File) => {
  if (picturePreview.value?.startsWith('blob:')) URL.revokeObjectURL(picturePreview.value)
  picturePreview.value = URL.createObjectURL(file)
}

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = '' // lets the same file be picked again
  if (!file) return
  errors.value.picture = ''
  cropperFile.value = file
}

const applyCrop = (cropped: File) => {
  originalPicture.value = cropperFile.value
  cropperFile.value = null
  form.value.picture = cropped
  setPreview(cropped)
}

const adjustPicture = () => {
  if (originalPicture.value) cropperFile.value = originalPicture.value
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const saveCategory = async () => {
  errors.value = { name: '', picture: '' }
  form.value.name = form.value.name.trim()
  if (!form.value.name) {
    errors.value.name = 'Category name is required.'
    return
  }

  isSubmitting.value = true
  try {
    const formData = new FormData()
    formData.append('name', form.value.name)
    formData.append('items', JSON.stringify(form.value.items))
    if (form.value.picture) {
      formData.append('picture', form.value.picture)
    }

    if (isEditMode.value) {
      formData.append('_method', 'PATCH')
      await menuService.updateMenuCategory(props.category.uuid, formData)
    } else {
      await menuService.createMenuCategory(formData)
    }
    refreshNavCategories()

    emit('saved')
    emit('close')
  } catch (error: any) {
    console.error('Error saving category:', error)
    const fieldErrors = error.data?.errors
    if (fieldErrors?.name || fieldErrors?.picture) {
      errors.value.name = fieldErrors.name?.[0] || ''
      errors.value.picture = fieldErrors.picture?.[0] || ''
    } else if (error.data?.message) {
      showAlert('Save Failed', error.data.message)
    } else {
      showAlert('Save Failed', 'Failed to save category. Please try again.')
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
  <div v-if="show" class="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200"
      @click="emit('close')"
      aria-hidden="true"
    ></div>

    <!-- Dialog: header, toolbar and footer stay put, only the body scrolls -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
      class="relative bg-white rounded-3xl w-full max-w-[820px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="flex items-center justify-between gap-4 px-6 md:px-8 pt-5 pb-4 border-b border-[#EEDFC4] bg-[#FDFBF7] shrink-0">
        <div class="flex items-center gap-3.5">
          <div class="w-10 h-10 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="heroicons:squares-2x2" class="w-5 h-5" />
          </div>
          <div>
            <h2 id="category-modal-title" class="text-xl font-display font-extrabold text-[#3B1F0E]">
              {{ isEditMode ? 'Edit Category' : 'Add New Category' }}
            </h2>
            <p class="text-xs text-[#8A6E64] mt-0.5">
              {{ isEditMode ? 'Rename the category, change its picture, or update which items it holds.' : 'Name the category, add a picture, and choose the menu items it holds.' }}
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="emit('close')"
          aria-label="Close modal"
          class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3B1F0E] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-4 space-y-4">
        <!-- Card 1: Category Details -->
        <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
            <span>Category Details</span>
          </div>

          <div class="flex flex-col sm:flex-row gap-4">
            <!-- Picture -->
            <div class="shrink-0 sm:w-[200px]">
              <span class="block text-xs font-bold text-[#3B1F0E] mb-1">Picture <span class="font-semibold text-[#8A6E64]">(Optional)</span></span>
              <input
                type="file"
                ref="fileInput"
                class="hidden"
                accept="image/jpeg,image/png,image/webp"
                @change="handleImageUpload"
              />
              <button
                type="button"
                @click="triggerFileInput"
                class="relative w-full aspect-[4/3] rounded-2xl overflow-hidden transition-all duration-150 cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                :class="picturePreview
                  ? 'border border-[#D8C7B5] shadow-2xs'
                  : 'border-2 border-dashed border-[#D8C7B5] hover:border-[#3B1F0E] bg-white hover:bg-[#FAF6F0]'"
                :aria-label="picturePreview ? 'Change category picture' : 'Upload category picture'"
              >
                <template v-if="picturePreview">
                  <img :src="picturePreview" alt="Category preview" class="w-full h-full object-cover" />
                  <span class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-bold text-white">
                    <Icon name="heroicons:camera" class="w-4 h-4" />
                    Change picture
                  </span>
                </template>
                <span v-else class="flex flex-col items-center justify-center gap-2 h-full">
                  <span class="w-10 h-10 rounded-xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] group-hover:text-[#3B1F0E] flex items-center justify-center transition-colors">
                    <Icon name="heroicons:photo" class="w-5 h-5" />
                  </span>
                  <span class="text-center">
                    <span class="block text-xs font-bold text-[#3B1F0E] group-hover:underline">Upload Picture</span>
                    <span class="block text-[11px] text-[#8A6E64] mt-0.5">JPG, PNG, or WEBP</span>
                  </span>
                </span>
              </button>
              <!-- Re-open the cropper on the picture picked in this session -->
              <div v-if="originalPicture" class="flex gap-2 mt-2">
                <button
                  type="button"
                  @click="adjustPicture"
                  class="flex-1 h-8 rounded-lg border border-[#D8C7B5] bg-white text-[#5C4037] text-xs font-bold hover:bg-[#FAF4ED] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                >
                  <Icon name="heroicons:scissors" class="w-3.5 h-3.5" />
                  Adjust
                </button>
                <button
                  type="button"
                  @click="triggerFileInput"
                  class="flex-1 h-8 rounded-lg border border-[#D8C7B5] bg-white text-[#5C4037] text-xs font-bold hover:bg-[#FAF4ED] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
                >
                  <Icon name="heroicons:camera" class="w-3.5 h-3.5" />
                  Change
                </button>
              </div>
              <p v-if="errors.picture" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                <span>{{ errors.picture }}</span>
              </p>
            </div>

            <!-- Category Name -->
            <label class="block flex-1 min-w-0">
              <span class="block text-xs font-bold text-[#3B1F0E] mb-1">Category Name <span class="text-red-500">*</span></span>
              <input
                v-model="form.name"
                type="text"
                placeholder="e.g. Coffee, Pastries, Non-Coffee"
                class="w-full h-11 px-3.5 rounded-xl border bg-white text-sm font-semibold text-[#2D201B] placeholder:text-[#A8988B] placeholder:font-normal focus:border-[#3B1F0E] focus:ring-2 focus:ring-[#3B1F0E]/15 outline-none transition-all shadow-2xs"
                :class="errors.name ? 'border-red-400 bg-red-50/30' : 'border-[#D8C7B5]'"
                @input="errors.name = ''"
              />
              <span v-if="errors.name" class="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 shrink-0" />
                <span>{{ errors.name }}</span>
              </span>
            </label>
          </div>
        </div>

        <!-- Card 2: Menu Items -->
        <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div class="flex items-center justify-between gap-3">
            <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              <span>Menu Items</span>
            </div>
            <span class="text-xs font-bold text-[#8A6E64]">
              {{ form.items.length }} selected
            </span>
          </div>

          <MenuToolbar
            v-model="searchQuery"
            v-model:sortValue="sortBy"
            searchPlaceholder="Search Item"
            :sortOptions="sortOptions"
            white
          />

          <!-- Items Grid -->
          <div v-if="filteredItems.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <button
              v-for="item in filteredItems"
              :key="item.uuid"
              type="button"
              :aria-pressed="form.items.includes(item.uuid)"
              @click="toggleItem(item.uuid)"
              :class="[
                'bg-white rounded-2xl border flex flex-col text-left transition-all cursor-pointer p-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40',
                form.items.includes(item.uuid) ? 'border-[#3B1F0E] ring-1 ring-[#3B1F0E] shadow-sm' : 'border-[#EADCC7] hover:border-[#D8C7B5] hover:shadow-md'
              ]"
            >
              <!-- Image with selection check -->
              <div class="h-[120px] w-full bg-[#FBF2E1] relative shrink-0 rounded-xl overflow-hidden mb-2.5">
                <img
                  v-if="item.picture"
                  :src="getImageUrl(item.picture) || ''"
                  :alt="item.menu_name"
                  class="w-full h-full object-cover"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-[#B4846C]/30">
                  <Icon name="heroicons:photo" class="w-10 h-10" />
                </div>

                <!-- Already in another category: selecting it moves it here -->
                <span
                  v-if="otherCategoryName(item)"
                  class="absolute top-2 left-2 max-w-[calc(100%-3rem)] truncate rounded-full bg-white/95 border border-[#EEDFC4] px-2.5 py-1 text-[11px] font-semibold text-[#7D5A50] shadow-sm"
                >
                  In {{ otherCategoryName(item) }}
                </span>

                <span
                  class="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-colors border-2"
                  :class="form.items.includes(item.uuid) ? 'bg-[#3B1F0E] border-[#3B1F0E] text-white' : 'bg-white border-[#EEDFC4] text-transparent'"
                >
                  <Icon v-if="form.items.includes(item.uuid)" name="heroicons:check" class="w-3.5 h-3.5" />
                </span>
              </div>

              <!-- Content -->
              <div class="flex flex-col flex-1 px-1 min-w-0 w-full">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-display font-bold text-sm text-[#3B1F0E] truncate">
                    {{ item.menu_name }}
                  </h3>
                  <span v-if="item.base_price" class="font-display font-bold text-sm text-[#3B1F0E] whitespace-nowrap">
                    ₱{{ Number(item.base_price).toFixed(2) }}
                  </span>
                </div>

                <p class="text-[11px] text-[#8A6E64] leading-snug line-clamp-2 mt-0.5">
                  {{ item.description || 'No description provided' }}
                </p>

                <p class="text-[11px] text-[#A8988B] leading-snug line-clamp-1 mt-2">
                  <template v-if="item.recipes_preview">
                    {{ item.recipes_preview }}
                    <span v-if="item.recipes_remaining_count > 0" class="inline-flex items-center justify-center bg-[#EDEDED] text-[#757575]/70 text-[8px] font-bold px-[5px] py-[2.5px] rounded-full ml-1 align-middle">+{{ item.recipes_remaining_count }}</span>
                  </template>
                  <template v-else>
                    No recipes added
                  </template>
                </p>
              </div>
            </button>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-8 text-[#8A6E64]">
            <Icon name="heroicons:magnifying-glass" class="w-8 h-8 mb-2 opacity-50" />
            <p class="text-xs font-bold">No items match your search.</p>
          </div>
        </div>
      </div>

      <!-- Items moving from other categories -->
      <div v-if="movedItems.length" class="px-6 md:px-8 py-2.5 border-t border-[#EEDFC4] bg-[#FDFBF7] shrink-0">
        <CategoryMoveWarning :items="movedItems" />
      </div>

      <!-- Footer: Cancel on the left, the main action on the right -->
      <div class="flex items-center justify-between px-6 md:px-8 py-3.5 border-t border-[#EEDFC4] bg-[#FAF8F5] rounded-b-3xl shrink-0">
        <button
          type="button"
          @click="emit('close')"
          class="px-5 py-2 rounded-xl border border-[#D8C7B5] bg-white text-[#5C4037] text-xs sm:text-sm font-bold hover:bg-[#FAF4ED] active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
        >
          Cancel
        </button>

        <button
          type="button"
          @click="saveCategory"
          :disabled="isSubmitting"
          class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
        >
          <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <span>{{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Category' }}</span>
        </button>
      </div>
    </div>

    <CommonImageCropper
      :show="!!cropperFile"
      :file="cropperFile"
      :aspect="4 / 3"
      title="Adjust Category Picture"
      @cancel="cropperFile = null"
      @apply="applyCrop"
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
