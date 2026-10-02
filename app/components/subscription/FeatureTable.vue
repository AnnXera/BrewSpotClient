<!-- components/subscription/FeatureTable.vue -->
<script setup lang="ts">
import type { FeatureItem } from '~/services/SubscriptionService'

defineProps<{
  features: FeatureItem[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [feature: FeatureItem]
  delete: [feature: FeatureItem]
}>()
</script>

<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden shadow-sm">
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead>
          <tr class="bg-[#FBF2E1] border-b border-[#F3E7D2]">
            <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Feature Name</th>
            <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Key Identifier</th>
            <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3">Description</th>
            <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3 text-center">Status</th>
            <th class="font-sans text-xs font-semibold tracking-wide text-[#3B1F0E]/50 uppercase px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#F3E7D2]">
          <tr v-for="feat in features" :key="feat.uuid" class="hover:bg-[#FFFDF9] transition-colors">
            <td class="px-6 py-4 font-display text-[15px] font-bold text-[#3B1F0E]">
              {{ feat.name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <code class="px-2 py-1 rounded bg-[#FBF2E1] text-xs font-mono text-[#3B1F0E] border border-[#EDD8CC]">{{ feat.key }}</code>
            </td>
            <td class="px-6 py-4 font-sans text-xs text-[#9E7060] max-w-md">
              {{ feat.description || '—' }}
            </td>
            <td class="px-6 py-4 text-center whitespace-nowrap">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full font-display font-semibold text-xs"
                :class="feat.is_active ? 'bg-[#D4EDDA] text-[#28A745]' : 'bg-[#FDE8E8] text-[#DC3545]'"
              >
                {{ feat.is_active ? 'Active' : 'Disabled' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right whitespace-nowrap">
              <div class="inline-flex items-center gap-1 justify-end">
                <button
                  type="button"
                  class="p-2 rounded-lg text-[#7D5A50] hover:bg-[#F3E7D2] transition-colors"
                  title="Edit Feature"
                  @click="emit('edit', feat)"
                >
                  <Icon name="heroicons:pencil-square" class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="p-2 rounded-lg text-[#D9534F] hover:bg-red-50 transition-colors"
                  title="Delete Feature"
                  @click="emit('delete', feat)"
                >
                  <Icon name="heroicons:trash" class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="features.length === 0 && !loading">
            <td colspan="5" class="py-10 text-center font-sans text-sm text-[#3B1F0E]/50">
              No features in the catalog yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
