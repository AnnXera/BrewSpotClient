<!-- app/components/owner-management/StatCard.vue -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    value: number | string | null | undefined
    label: string
    icon?: string
    // Tint for the icon chip only. The number itself always uses one colour so the cards stay consistent.
    accent?: string
  }>(),
  {
    icon: 'heroicons:users',
    accent: '#7D5A50',
  }
)
</script>

<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl p-4 shadow-[0_1px_2px_rgba(61,43,36,0.04)] cursor-default flex items-center gap-3.5
              sm:p-5">
    <span
      class="flex size-10 shrink-0 items-center justify-center rounded-[12px]"
      :style="{ backgroundColor: `${accent}1A`, color: accent }"
      aria-hidden="true"
    >
      <Icon :name="icon" class="size-5" />
    </span>
    <div class="min-w-0">
      <p class="font-display text-[28px] leading-none font-extrabold tracking-tight text-[#3D2B24] sm:text-[32px]">
        {{ value ?? '—' }}
      </p>
      <p class="font-sans text-[13px] text-[#3B1F0E]/60 mt-1.5 truncate">
        {{ label }}
      </p>
    </div>
  </div>
</template>
