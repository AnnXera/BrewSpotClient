<script setup lang="ts">
const props = defineProps<{
  items: { uuid: string; menu_name?: string; category_name?: string | null }[]
}>()

const summary = computed(() =>
  props.items
    .map(item => `${item.menu_name} (from ${item.category_name || 'another category'})`)
    .join(', '),
)
</script>

<template>
  <div
    v-if="items.length > 0"
    role="status"
    class="flex items-start gap-2 min-w-0 rounded-xl border border-[#F0D9A8] bg-[#FFF6E0] px-3 py-2 text-xs text-[#7D5A50]"
  >
    <Icon name="heroicons:exclamation-triangle" class="mt-px w-4 h-4 shrink-0 text-[#B7791F]" aria-hidden="true" />
    <p class="min-w-0">
      <span class="font-semibold text-[#3B1F0E]">
        {{ items.length === 1 ? '1 item' : `${items.length} items` }} will be moved from other categories:
      </span>
      {{ summary }}
    </p>
  </div>
</template>
