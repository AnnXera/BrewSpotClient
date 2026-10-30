<!-- components/dashboard/OwnerWelcomeModal.vue -->
<!-- Shown once, on an owner's first login: a short welcome and where to start setting up. -->
<script setup lang="ts">
import DialogShell from '~/components/common/DialogShell.vue'

defineProps<{
  open: boolean
  firstname?: string
}>()

const emit = defineEmits<{
  /** Dismissed; `to` is the page the owner chose to start on, if any. */
  close: [to?: string]
}>()

const steps = [
  { icon: 'heroicons:book-open', title: 'Build your menu', text: 'Add categories, items, sizes and add-ons.', to: '/owner/menu-management' },
  { icon: 'heroicons:building-storefront', title: 'Set up your branches', text: 'Opening hours, floor plans, managers and staff.', to: '/owner/cafes' },
  { icon: 'heroicons:chart-bar', title: 'Watch your sales', text: 'This dashboard and Analytics fill in as your POS records sales.', to: '/owner/analytics' },
]
</script>

<template>
  <DialogShell
    :open="open"
    :title="firstname ? `Welcome to Brewspot, ${firstname}!` : 'Welcome to Brewspot!'"
    message="Your cafe account is active. Here's where to start."
    icon="heroicons:sparkles"
    @close="emit('close')"
  >
    <ul class="space-y-2">
      <li v-for="step in steps" :key="step.to">
        <button
          type="button"
          class="group flex w-full items-start gap-3 rounded-[14px] border border-[#EDD8CC] bg-white px-3.5 py-3 text-left hover:border-[#D9C2B4] hover:bg-[#FBF5EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] transition-colors"
          @click="emit('close', step.to)"
        >
          <span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F1E9DE]">
            <Icon :name="step.icon" class="size-[18px] text-[#7D5A50]" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[14px] font-semibold text-[#3D2B24]">{{ step.title }}</span>
            <span class="block text-[13px] leading-[1.45] text-[#6B5A52]">{{ step.text }}</span>
          </span>
          <Icon name="heroicons:chevron-right" class="mt-2.5 size-4 shrink-0 text-[#B49A8C] group-hover:text-[#7D5A50] transition-colors" />
        </button>
      </li>
    </ul>

    <template #actions>
      <button
        type="button"
        data-autofocus
        class="whitespace-nowrap rounded-[10px] px-4 py-[11px] text-[13px] font-semibold text-white bg-[#3A2923] hover:bg-[#2C1E19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] focus-visible:ring-[#3A2923] transition-colors"
        @click="emit('close')"
      >
        Go to my dashboard
      </button>
    </template>
  </DialogShell>
</template>
