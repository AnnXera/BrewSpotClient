<script setup lang="ts">
// Shared action button for admin dashboard cards: one shape, two surfaces.
// "light" sits on white cards, "dark" sits on the espresso totals banner.
withDefaults(defineProps<{
  to: string
  variant?: 'light' | 'dark'
  icon?: string
}>(), {
  variant: 'light',
  icon: 'heroicons:arrow-up-right-20-solid',
})
</script>

<template>
  <NuxtLink
    :to="to"
    class="card-action inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 font-sans text-[13px] font-semibold active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-160 ease-out focus-visible:outline-none focus-visible:ring-2"
    :class="variant === 'dark'
      ? 'border border-[#FFF0D1]/15 bg-[#FFF0D1]/[0.06] text-[#FFF0D1] hover:bg-[#FFF0D1]/[0.14] hover:border-[#FFF0D1]/30 focus-visible:ring-[#FFF0D1]/60'
      : 'border border-[#EEDFC4] bg-white text-[#7D5A50] shadow-xs hover:bg-[#FDF8F3] hover:border-[#D9C4B8] hover:text-[#3B1F0E] focus-visible:ring-[#B4846C]/40'"
  >
    <slot />
    <Icon :name="icon" class="h-3.5 w-3.5" aria-hidden="true" />
  </NuxtLink>
</template>
