<script setup lang="ts">
import { useId } from 'vue'

// One white section on the Analytics page: heading, optional note, optional controls on the right.
defineProps<{
  title: string
  note?: string
}>()

const headingId = useId()
</script>

<template>
  <section
    class="flex min-w-0 flex-col rounded-[22px] border border-[#EEDFC4] bg-white p-5 shadow-[0_1px_2px_rgba(59,31,14,0.04)] sm:p-6"
    :aria-labelledby="headingId"
  >
    <header class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div class="min-w-0">
        <h2 :id="headingId" class="font-display text-[17px] font-semibold text-[#3B1F0E]">{{ title }}</h2>
        <p v-if="note" class="mt-1 text-[13px] text-[#8B6656]">{{ note }}</p>
      </div>
      <slot name="actions" />
    </header>
    <div class="mt-5 flex min-w-0 flex-1 flex-col">
      <slot />
    </div>
  </section>
</template>
