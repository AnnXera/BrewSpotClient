<script setup lang="ts">
const props = defineProps<{
  item: {
    id?: number | string
    uuid?: string
    name: string
    description?: string
    image_url?: string
    price?: number
    tags?: string[]
    recipes_preview?: string
    recipes_remaining_count?: number
  }
}>()

defineEmits<{
  (e: 'view', id: string | number): void
  (e: 'delete', id: string | number): void
}>()

const getImageUrl = () => {
  if (props.item.picture) {
    return props.item.picture
  }
  return null
}
</script>

<template>
  <div 
    class="bg-white rounded-2xl border border-[#EEDFC4] flex flex-col group hover:shadow-md transition-shadow cursor-pointer p-3 h-[300px]"
    @click="$emit('view', item.uuid || item.id || '')"
  >
    <!-- Image Area -->
    <div class="h-[140px] w-full bg-[#FBF2E1] relative shrink-0 rounded-xl overflow-hidden mb-[9px]">
      <img 
        v-if="item.picture" 
        :src="getImageUrl() || ''" 
        :alt="item.menu_name"
        class="w-full h-full object-cover"
        @error="$event.target.style.display = 'none'"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-[#B4846C]/30">
        <Icon name="heroicons:photo" class="w-12 h-12" />
      </div>
      
      <!-- Delete Button (floating) -->
      <button 
        @click.stop="$emit('delete', item.uuid || item.id || '')"
        class="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#FDE8E8] text-[#D9534F] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete Item"
      >
        <Icon name="heroicons:trash" class="w-4 h-4" />
      </button>
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
</template>
