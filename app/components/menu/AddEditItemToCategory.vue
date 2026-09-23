<script setup lang="ts">
import { ref, watch, computed } from 'vue'

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
const searchQuery = ref('')
const isSubmitting = ref(false)

watch(() => props.show, (newVal) => {
  if (newVal) {
    searchQuery.value = ''
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

const filteredItems = computed(() => {
  let list = props.items || []
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(i => 
      (i.menu_name || '').toLowerCase().includes(q)
    )
  }
  return list
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
  const apiUrl = config.public.apiBaseUrl
  return `${apiUrl.replace('/api', '')}/storage/${path}`
}

const confirmSelection = () => {
  emit('confirm', selectedItems.value)
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Overlay -->
    <div 
      class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      @click="emit('close')"
    ></div>

    <!-- Modal Content -->
    <div class="relative bg-white rounded-3xl w-full max-w-[806px] h-[85vh] overflow-hidden flex flex-col shadow-2xl">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-8 py-5 border-b border-[#EEDFC4]">
        <h2 class="text-3xl font-display font-bold text-[#3B1F0E]">
          Add Items - {{ category?.name || 'Category' }}
        </h2>
        <button 
          @click="emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F5F5] text-[#7D5A50] hover:bg-[#EEDFC4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/40"
          title="Close Modal"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-8 flex flex-col gap-8">
        
        <!-- Search Toolbar -->
        <div class="flex items-center justify-between gap-4">
          <div class="relative flex-1 max-w-2xl">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Icon name="heroicons:magnifying-glass" class="w-5 h-5 text-[#B4846C]/60" />
            </div>
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Search Item"
              class="w-full bg-[#fef8f0] border border-[#EEDFC4] text-[#3B1F0E] rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#B4846C] focus:border-transparent transition-shadow"
            />
          </div>
          <div class="flex items-center gap-3">
            <button class="flex items-center gap-2 text-[#7D5A50] hover:text-[#3B1F0E] px-4 py-3 rounded-xl border border-[#EEDFC4] hover:bg-[#fef8f0] transition-colors bg-[#fef8f0]">
              <Icon name="heroicons:bars-3-bottom-left" class="w-5 h-5" />
              <span class="font-bold text-sm">Sort by</span>
            </button>
            <button @click="emit('add-item')" class="flex items-center gap-2 bg-[#7D5A50] hover:bg-[#5C4033] text-white px-5 py-3 rounded-xl font-bold transition-colors">
              <Icon name="heroicons:plus" class="w-5 h-5" />
              <span class="font-bold text-sm">Add Item</span>
            </button>
          </div>
        </div>

        <!-- Items Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pb-6">
          <div 
            v-for="item in filteredItems" 
            :key="item.uuid"
            @click="toggleItem(item.uuid)"
            :class="[
              'bg-white rounded-2xl border flex flex-col group transition-all cursor-pointer p-3 h-[300px]',
              selectedItems.includes(item.uuid) ? 'border-[#3B1F0E] ring-1 ring-[#3B1F0E] shadow-sm' : 'border-[#EEDFC4] hover:shadow-md'
            ]"
          >
            <!-- Image Area with Selection Checkbox -->
            <div class="h-[140px] w-full bg-[#FBF2E1] relative shrink-0 rounded-xl overflow-hidden mb-[9px]">
              <img 
                v-if="item.picture" 
                :src="getImageUrl(item.picture) || ''" 
                :alt="item.menu_name"
                class="w-full h-full object-cover"
                @error="$event.target.style.display = 'none'"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-[#B4846C]/30">
                <Icon name="heroicons:photo" class="w-12 h-12" />
              </div>
              
              <!-- Checkbox -->
              <div 
                class="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-colors border-2"
                :class="selectedItems.includes(item.uuid) ? 'bg-[#7D5A50] border-[#7D5A50] text-white' : 'bg-white border-[#EEDFC4] text-transparent'"
              >
                <Icon name="heroicons:check" class="w-4 h-4" v-if="selectedItems.includes(item.uuid)" />
              </div>
            </div>

            <!-- Content Area -->
            <div class="flex flex-col flex-1 px-1">
              <div class="flex items-start justify-between gap-2 mb-1">
                <h3 class="font-display font-bold text-[16px] text-[#3B1F0E] truncate">
                  {{ item.menu_name }}
                </h3>
                <span v-if="item.base_price" class="font-display font-bold text-[16px] text-[#3B1F0E] whitespace-nowrap">
                  ₱{{ Number(item.base_price).toFixed(2) }}
                </span>
              </div>
              
              <p class="font-sans text-xs text-[#B4846C] leading-snug line-clamp-3 mb-4">
                {{ item.description || 'No description provided' }}
              </p>

              <div class="flex-1"></div>

              <p class="font-sans text-xs text-[#757575]/70 leading-snug line-clamp-2 mt-auto">
                <template v-if="item.recipes_preview">
                  {{ item.recipes_preview }}
                  <span v-if="item.recipes_remaining_count > 0" class="inline-flex items-center justify-center bg-[#EDEDED] text-[#757575]/70 text-[8px] font-bold px-[5px] py-[2.5px] rounded-full ml-1 align-middle">+{{ item.recipes_remaining_count }}</span>
                </template>
                <template v-else>
                  No recipes added
                </template>
              </p>
            </div>
          </div>
        </div>
        
        <div v-if="filteredItems.length === 0" class="flex flex-col items-center justify-center py-12 text-[#B4846C]">
          <Icon name="heroicons:magnifying-glass" class="w-12 h-12 mb-4 opacity-50" />
          <p class="font-bold">No items match your search.</p>
        </div>

      </div>

      <!-- Footer -->
      <div class="px-8 py-5 border-t border-[#EEDFC4] flex justify-end bg-white">
        <button 
          @click="confirmSelection"
          :disabled="isSubmitting"
          class="bg-[#3B1F0E] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#2A160A] transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3B1F0E]/40"
        >
          <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
          {{ isSubmitting ? 'Confirming...' : 'Confirm' }}
        </button>
      </div>

    </div>
  </div>
</template>
