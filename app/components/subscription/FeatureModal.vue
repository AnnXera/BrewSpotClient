<!-- components/subscription/FeatureModal.vue -->
<script setup lang="ts">
import type { FeatureItem } from '~/services/SubscriptionService'

const props = defineProps<{
  open: boolean
  feature: FeatureItem | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const subService = useSubscriptionService()

const isSaving = ref(false)
const errorMessage = ref('')
const form = ref({
  key: '',
  name: '',
  description: '',
  is_active: true,
})

watch(
  () => props.feature,
  (newFeature) => {
    errorMessage.value = ''
    if (newFeature) {
      form.value = {
        key: newFeature.key,
        name: newFeature.name,
        description: newFeature.description || '',
        is_active: newFeature.is_active,
      }
    } else {
      form.value = {
        key: '',
        name: '',
        description: '',
        is_active: true,
      }
    }
  },
  { immediate: true }
)

async function save() {
  if (!form.value.name.trim()) {
    errorMessage.value = 'Please enter a display name.'
    return
  }
  if (!props.feature && !form.value.key.trim()) {
    errorMessage.value = 'Please enter a unique key identifier.'
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    if (props.feature) {
      const res = await subService.updateFeature(props.feature.uuid, {
        name: form.value.name,
        description: form.value.description,
        is_active: form.value.is_active,
      })
      if (!res.success) {
        errorMessage.value = res.message || 'Failed to update feature.'
        return
      }
    } else {
      const res = await subService.createFeature({
        key: form.value.key.trim().toLowerCase().replace(/\s+/g, '_'),
        name: form.value.name,
        description: form.value.description,
        is_active: form.value.is_active,
      })
      if (!res.success) {
        errorMessage.value = res.message || 'Failed to create feature.'
        return
      }
    }

    emit('saved')
    emit('close')
  } catch (err: any) {
    errorMessage.value = err?.data?.message || err?.message || 'Error saving feature.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#3B1F0E]/40 backdrop-blur-sm p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Scrollable Content -->
        <div class="flex-1 min-h-0 overflow-y-auto p-6">
          <!-- Top Category & Close Header -->
          <div class="flex items-center justify-between mb-[24px]">
            <p class="font-display text-[14px] leading-[16.5px] tracking-[0.77%] font-semibold text-[#9E7060] uppercase">
              {{ feature ? 'Edit System Feature' : 'New System Feature' }}
            </p>

            <button type="button" class="cursor-pointer text-[#9E7060] hover:text-[#3B1F0E] transition-colors" @click="emit('close')">
              <Icon name="heroicons:x-mark" class="w-6 h-6" />
            </button>
          </div>

          <!-- Top Banner & Feature Information -->
          <div class="flex items-center gap-3 pb-[24px] mb-[24px] border-b border-[#B4846C]">
            <div class="w-14 h-14 rounded-2xl bg-[#FFF8EA] border border-[#EDD8CC] flex items-center justify-center text-[#7D5A50] shrink-0">
              <Icon name="heroicons:sparkles" class="w-7 h-7" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <p class="font-display text-[24px] font-bold text-[#3D2B24] truncate">
                  {{ form.name || 'Untitled Feature' }}
                </p>

                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full font-display font-semibold text-xs whitespace-nowrap shrink-0"
                  :class="form.is_active ? 'bg-[#D4EDDA] text-[#28A745]' : 'bg-[#FDE8E8] text-[#DC3545]'"
                >
                  {{ form.is_active ? 'Active' : 'Disabled' }}
                </span>
              </div>

              <p class="font-display text-[12px] text-[#9E7060]">
                {{ form.key ? `Key: ${form.key}` : 'Catalog Item' }}
              </p>
            </div>
          </div>

          <!-- Error Alert -->
          <div v-if="errorMessage" class="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-sans text-xs">
            {{ errorMessage }}
          </div>

          <form id="subscriptionFeatureModalForm" @submit.prevent="save" class="space-y-4">
            <h3 class="font-display text-[18px] font-bold text-[#3D2B24] mb-[16px]">
              Feature Information
            </h3>

            <!-- Key Identifier -->
            <div>
              <label class="block font-sans text-xs font-semibold uppercase tracking-wide text-[#3B1F0E]/70 mb-1">
                Key Identifier *
              </label>
              <input
                v-model="form.key"
                type="text"
                :disabled="Boolean(feature)"
                required
                placeholder="e.g. staff_management"
                class="w-full rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] px-4 py-2.5 font-mono text-xs text-[#3B1F0E] placeholder:text-[#B4846C] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30 disabled:bg-gray-100 disabled:opacity-60"
              />
              <span class="font-sans text-[11px] text-[#9E7060] mt-1 block">
                Lowercase letters, numbers, and underscores only.
              </span>
            </div>

            <!-- Display Name -->
            <div>
              <label class="block font-sans text-xs font-semibold uppercase tracking-wide text-[#3B1F0E]/70 mb-1">
                Display Name *
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                placeholder="e.g. Staff Management"
                class="w-full rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] px-4 py-2.5 font-sans text-sm text-[#3B1F0E] placeholder:text-[#B4846C] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30"
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block font-sans text-xs font-semibold uppercase tracking-wide text-[#3B1F0E]/70 mb-1">
                Description
              </label>
              <textarea
                v-model="form.description"
                rows="3"
                placeholder="Describe what capabilities this unlocks for cafe owners..."
                class="w-full rounded-xl border border-[#EDD8CC] bg-[#FFF8EA] px-4 py-2.5 font-sans text-sm text-[#3B1F0E] placeholder:text-[#B4846C] focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/30 resize-none"
              />
            </div>

            <!-- Is Active -->
            <div class="flex items-center gap-2 pt-1">
              <input
                id="modal_feat_is_active"
                v-model="form.is_active"
                type="checkbox"
                class="w-4 h-4 rounded text-[#7D5A50] focus:ring-[#7D5A50] border-gray-300"
              />
              <label for="modal_feat_is_active" class="font-sans text-xs font-medium text-[#3B1F0E] cursor-pointer">
                Feature is active in platform catalog
              </label>
            </div>
          </form>
        </div>

        <!-- Modal Actions (Matching ApprovalDetailsModal Footer) -->
        <div class="flex items-center justify-end gap-3 border-t border-[#F3E7D2] p-6 bg-white shrink-0">
          <button
            type="button"
            class="rounded-lg px-4 py-2 font-sans text-sm font-medium text-[#3B1F0E]/70 hover:bg-[#F3E7D2] transition-colors"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="subscriptionFeatureModalForm"
            :disabled="isSaving"
            class="rounded-lg px-5 py-2 font-sans text-sm font-semibold bg-[#7D5A50] text-[#FDF3E7] hover:bg-[#684940] transition-colors disabled:opacity-50 shadow-sm"
          >
            <span v-if="isSaving">Saving...</span>
            <span v-else>{{ feature ? 'Update Feature' : 'Save Feature' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
