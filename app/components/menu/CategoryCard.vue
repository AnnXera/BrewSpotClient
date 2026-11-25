<script setup lang="ts">
import defaultImage from '~/assets/images/default-placeholder.png' // Need to ensure a fallback exists or just use a colored div

const props = defineProps<{
  category: {
    id?: number | string
    uuid?: string
    name: string
    description?: string
    image_url?: string
    picture?: string | null
    items_preview?: string | null
    remaining_count?: number
  }
}>()

defineEmits<{
  (e: 'edit', id: string | number): void
  (e: 'delete', id: string | number): void
  (e: 'click', id: string | number): void
}>()

const getImageUrl = () => {
  if (props.category.picture) {
    return props.category.picture
  }
  return null
}
</script>

<template>
  <div
    role="link"
    tabindex="0"
    :aria-label="`Open ${category.name}`"
    class="bg-white rounded-2xl border border-[#EEDFC4] hover:border-[#D8C7B5] flex flex-col group hover:shadow-md transition-all cursor-pointer p-3 pb-5 outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
    @click="$emit('click', category.uuid || category.id || '')"
    @keydown.enter.self.prevent="$emit('click', category.uuid || category.id || '')"
  >
    <!-- Image Area -->
    <!-- 4:3 to match the category picture cropper, so the card shows exactly the cropped frame -->
    <div class="aspect-[4/3] w-full bg-[#FBF2E1] relative shrink-0 rounded-xl overflow-hidden mb-4">
      <img 
        v-if="category.picture" 
        :src="getImageUrl() || ''" 
        :alt="category.name"
        class="w-full h-full object-cover"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <!-- Fallback pattern if no image -->
      <div v-else class="w-full h-full flex items-center justify-center text-[#B4846C]/30">
        <Icon name="heroicons:photo" class="w-12 h-12" />
      </div>

      <!-- Delete Button (floating) -->
      <button 
        v-if="category.uuid !== 'uncategorized' && category.id !== 'uncategorized'"
        type="button"
        @click.stop="$emit('delete', category.uuid || category.id || '')"
        @keydown.enter.stop
        class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 border border-red-200 text-red-600 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-red-50 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        :aria-label="`Delete ${category.name}`"
        title="Delete Category"
      >
        <Icon name="heroicons:trash" class="w-4 h-4" />
      </button>
    </div>

    <!-- Content Area -->
    <div class="flex flex-col flex-1 px-1">
      <h3 class="font-display font-bold text-lg text-[#3B1F0E] mb-1">
        {{ category.name }}
      </h3>
      
      <p class="font-sans text-xs text-[#8A6E64] leading-snug line-clamp-2">
        <template v-if="category.items_preview">
          {{ category.items_preview }}
          <span v-if="(category.remaining_count ?? 0) > 0" class="inline-flex items-center justify-center bg-[#F5F5F5] text-[#7D5A50] text-[10px] font-bold px-1.5 py-0.5 rounded ml-1">+{{ category.remaining_count }}</span>
        </template>
        <template v-else>
          {{ category.description || 'No items available in this category.' }}
        </template>
      </p>
    </div>
  </div>
</template>
