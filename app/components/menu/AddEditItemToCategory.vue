<script setup lang="ts">
import { ref, watch, toRef, computed } from 'vue'
import { useMenuItemSort } from '~/composables/useMenuItemSort'
import MenuToolbar from '~/components/menu/MenuToolbar.vue'
import CategoryMoveWarning from '~/components/menu/CategoryMoveWarning.vue'
import { useCategoryMoves } from '~/composables/useCategoryMoves'

const props = defineProps<{
  show: boolean
  category: any | null
  items: any[] // all items in the cafe to pick from
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', selectedItemUuids: string[]): void
  (e: 'add-item'): void
}>()

const selectedItems = ref<string[]>([])
const { searchQuery, sortBy, sortOptions, filteredAndSortedItems: filteredItems } = useMenuItemSort(toRef(props, 'items'))
const isSubmitting = ref(false)

const { otherCategoryName, movedItems } = useCategoryMoves(
  toRef(props, 'items'),
  selectedItems,
  computed(() => props.category?.uuid),
)

watch(() => props.show, (newVal) => {
  if (newVal) {
    searchQuery.value = ''
    sortBy.value = 'name-asc'
    if (props.category) {
      selectedItems.value = props.items
        .filter(i => i.category_uuid === props.category.uuid)
        .map(i => i.uuid)
    } else {
      selectedItems.value = []
    }
  }
})

watch(() => props.items, (newItems, oldItems) => {
  if (props.show && props.category && oldItems) {
    // Find newly added items
    const addedItems = newItems.filter(item => !oldItems.some(old => old.uuid === item.uuid))
    addedItems.forEach(item => {
      if (item.category_uuid === props.category.uuid && !selectedItems.value.includes(item.uuid)) {
        selectedItems.value.push(item.uuid)
      }
    })
  }
})

const toggleItem = (uuid: string) => {
  const index = selectedItems.value.indexOf(uuid)
  if (index === -1) {
    selectedItems.value.push(uuid)
  } else {
    selectedItems.value.splice(index, 1)
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

const confirmSelection = () => {
  emit('confirm', selectedItems.value)
}
</script>

<template>
  <!-- Stays in the page (z-50) so the "New Item" modal (z-[60]) opens on top of it -->
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200"
      @click="emit('close')"
      aria-hidden="true"
    ></div>

    <!-- Dialog: header and footer stay put, only the body scrolls -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-items-title"
      class="relative bg-white rounded-3xl w-full max-w-[820px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col shadow-[0_24px_50px_-12px_rgba(59,31,14,0.22)] border border-[#EEDFC4] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="flex items-center justify-between gap-4 px-6 md:px-8 pt-5 pb-4 border-b border-[#EEDFC4] bg-[#FDFBF7] shrink-0">
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="w-10 h-10 rounded-2xl bg-[#FAF4ED] border border-[#EEDFC4] text-[#7D5A50] flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="heroicons:squares-plus" class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h2 id="assign-items-title" class="text-xl font-display font-extrabold text-[#3B1F0E] truncate">
              Add Items to {{ category?.name || 'Category' }}
            </h2>
            <p class="text-xs text-[#8A6E64] mt-0.5">
              Select the menu items that belong in this category. Items from another category will be moved here.
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="emit('close')"
          aria-label="Close modal"
          class="w-9 h-9 rounded-xl bg-white border border-[#EEDFC4] text-[#7D5A50] hover:bg-[#FAF4ED] hover:text-[#3B1F0E] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-4">
        <div class="rounded-2xl border border-[#EADCC7] bg-[#FCFBF8] p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div class="flex items-center justify-between gap-3">
            <div class="text-[11px] font-extrabold tracking-wider text-[#7D5A50] uppercase flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#7D5A50]"></span>
              <span>Menu Items</span>
            </div>
            <span class="text-xs font-bold text-[#8A6E64]">
              {{ selectedItems.length }} selected
            </span>
          </div>

          <MenuToolbar
            v-model="searchQuery"
            v-model:sortValue="sortBy"
            searchPlaceholder="Search Item"
            addButtonLabel="+ New Item"
            :sortOptions="sortOptions"
            white
            @add="emit('add-item')"
          />

          <!-- Items Grid -->
          <div v-if="filteredItems.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <button
              v-for="item in filteredItems"
              :key="item.uuid"
              type="button"
              :aria-pressed="selectedItems.includes(item.uuid)"
              @click="toggleItem(item.uuid)"
              :class="[
                'bg-white rounded-2xl border flex flex-col text-left transition-all cursor-pointer p-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40',
                selectedItems.includes(item.uuid) ? 'border-[#3B1F0E] ring-1 ring-[#3B1F0E] shadow-sm' : 'border-[#EADCC7] hover:border-[#D8C7B5] hover:shadow-md'
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
                  :class="selectedItems.includes(item.uuid) ? 'bg-[#3B1F0E] border-[#3B1F0E] text-white' : 'bg-white border-[#EEDFC4] text-transparent'"
                >
                  <Icon v-if="selectedItems.includes(item.uuid)" name="heroicons:check" class="w-3.5 h-3.5" />
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
          @click="confirmSelection"
          :disabled="isSubmitting"
          class="px-6 py-2 rounded-xl bg-[#3B1F0E] hover:bg-[#2A150A] text-[#FFF8EA] text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
        >
          <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <span>{{ isSubmitting ? 'Saving...' : 'Save Items' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
