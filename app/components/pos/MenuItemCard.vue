<!-- app/components/pos/MenuItemCard.vue -->
<!-- One menu item on the POS catalog. Used by the full grid and by the per-category rows on "All Items". -->
<script setup lang="ts">
defineProps<{
  item: any
  categoryName: string
  price: string
}>()

const emit = defineEmits<{ add: [item: any] }>()
</script>

<template>
  <button
    type="button"
    :disabled="item.sold_out"
    class="bg-white rounded-2xl border border-[#EFECE6] p-3 flex flex-col justify-between shadow-[0_3px_14px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_22px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all group text-left cursor-pointer relative select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    @click="emit('add', item)"
  >
    <!-- Circular Image Container (Centered Floating Circle) -->
    <div class="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full overflow-hidden shadow-xs bg-gradient-to-tr from-[#FAF8F5] to-[#EFEAE2] flex items-center justify-center mb-2 relative">
      <img
        v-if="item.picture"
        :src="item.picture"
        :alt="item.menu_name"
        draggable="false"
        class="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-[#FDF8F3] text-[#7B5A50]">
        <Icon name="heroicons:cake" class="w-7 h-7 sm:w-8 sm:h-8 opacity-60 group-hover:scale-110 transition-transform duration-300" />
      </div>
      <div v-if="item.sold_out" class="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
        Sold Out
      </div>
    </div>

    <!-- Text wraps instead of clipping: names and categories are always shown in full. -->
    <div
      class="flex-1 min-w-0 flex flex-col transition-opacity duration-200"
      :class="item.description?.trim() ? 'group-hover:opacity-0 group-focus-visible:opacity-0' : ''"
    >
      <h3 class="font-bold text-xs sm:text-sm text-[#2D201B] leading-snug [overflow-wrap:anywhere]">
        {{ item.menu_name }}
      </h3>

      <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 mt-auto pt-2">
        <span class="min-w-0 text-[11px] text-[#8A6E64] capitalize [overflow-wrap:anywhere]">
          {{ categoryName }}
        </span>
        <span class="ml-auto font-bold text-xs sm:text-sm text-[#2D201B] tabular-nums whitespace-nowrap">
          {{ price }}
        </span>
      </div>

      <p v-if="!item.sold_out" class="text-[10px] text-gray-400 mt-0.5">
        {{ item.available_stock }} left
      </p>
    </div>

    <!-- Description on hover: covers the card text; scrolls inside the card if it is very long. -->
    <div
      v-if="item.description?.trim()"
      class="desc-overlay absolute inset-0 z-10 rounded-2xl bg-white p-3 flex flex-col overflow-y-auto opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
    >
      <p class="font-bold text-xs sm:text-sm text-[#2D201B] leading-snug [overflow-wrap:anywhere]">
        {{ item.menu_name }}
      </p>
      <p class="mt-1.5 text-[11px] sm:text-xs leading-relaxed text-[#A4847A] whitespace-pre-line [overflow-wrap:anywhere]">
        {{ item.description.trim() }}
      </p>
      <p class="mt-auto pt-2 font-bold text-xs sm:text-sm text-[#2D201B] tabular-nums">
        {{ price }}
      </p>
    </div>
  </button>
</template>

<style scoped>
.desc-overlay {
  transition: opacity 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
  scrollbar-width: thin;
  scrollbar-color: #e3cfb4 transparent;
}
@media (prefers-reduced-motion: reduce) {
  .desc-overlay {
    transition: opacity 120ms linear;
    transform: none !important;
  }
}
</style>
