<!-- components/ConfirmDialog.vue -->
<script setup lang="ts">
interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

withDefaults(defineProps<Props>(), {
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#3B1F0E]/40 backdrop-blur-sm"
      @click.self="emit('cancel')"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 class="font-display text-lg font-semibold text-[#3B1F0E]">{{ title }}</h2>
        <p class="font-sans text-sm text-[#3B1F0E]/70 mt-2">{{ message }}</p>

        <div class="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            class="rounded-lg px-4 py-2 font-sans text-sm font-medium text-[#3B1F0E]/70 hover:bg-[#F3E7D2] transition-colors"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="rounded-lg px-4 py-2 font-sans text-sm font-semibold transition-colors"
            :class="danger
              ? 'bg-[#D9534F] text-white hover:bg-[#C24541]'
              : 'bg-[#3B1F0E] text-[#FDF3E7] hover:bg-[#2C1609]'"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>