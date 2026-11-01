<!-- app/components/common/A2HSButton.vue -->
<script setup lang="ts">
import A2HSModal from '~/components/common/A2HSModal.vue'

const props = withDefaults(
  defineProps<{
    variant?: 'sidebar' | 'card' | 'badge' | 'setup'
    label?: string
  }>(),
  {
    variant: 'sidebar',
    label: 'Install POS (A2HS)',
  }
)

const { isInstalled, promptInstall } = useA2HS()
</script>

<template>
  <div>
    <!-- Sidebar Variant (for NavBar desktop sidebar and mobile drawer) -->
    <button
      v-if="variant === 'sidebar'"
      type="button"
      class="h-11 rounded-xl flex items-center transition-colors w-full px-3 py-2.5 gap-[9px] text-left group bg-[#8B6656]/50 hover:bg-[#8B6656] text-[#FFF0D1] border border-[#B4846C]/40"
      @click="promptInstall"
      :title="isInstalled ? 'POS is installed. Click to open /pos' : 'Add BrewSpot POS to home screen or desktop'"
    >
      <div class="w-6 h-6 rounded-lg bg-[#FFF0D1]/20 flex items-center justify-center shrink-0">
        <Icon
          :name="isInstalled ? 'heroicons:check-badge' : 'heroicons:arrow-down-tray'"
          class="w-4 h-4 text-[#FFF0D1]"
        />
      </div>
      <div class="flex flex-col min-w-0 flex-1">
        <span class="font-display text-sm font-semibold text-[#FFF0D1] truncate">
          {{ isInstalled ? 'POS Installed' : label }}
        </span>
        <span class="font-sans text-[11px] text-[#FFF0D1]/70 truncate">
          {{ isInstalled ? 'Opens /pos' : '1-tap access to /pos' }}
        </span>
      </div>
      <Icon
        name="heroicons:chevron-right"
        class="w-4 h-4 text-[#FFF0D1]/60 group-hover:translate-x-0.5 transition-transform shrink-0"
      />
    </button>

    <!-- Card Variant (for DevicesCard in Cafe Management / Owner & Manager) -->
    <button
      v-else-if="variant === 'card'"
      type="button"
      class="inline-flex items-center gap-1.5 border border-[#B4846C] bg-[#FFF8EA] hover:bg-[#FFF0D1] text-[#7D5A50] font-semibold text-[13px] rounded-[10px] px-3.5 py-2 transition-colors shadow-sm"
      @click="promptInstall"
    >
      <Icon :name="isInstalled ? 'heroicons:check-circle' : 'heroicons:arrow-down-tray'" class="w-4 h-4 text-[#7D5A50]" />
      <span>{{ isInstalled ? 'POS App Ready' : label }}</span>
    </button>

    <!-- Setup Screen Variant (for /pos/setup) -->
    <button
      v-else-if="variant === 'setup'"
      type="button"
      class="w-full bg-[#FFF0D1] hover:bg-[#FFE3B3] text-[#7D5A50] border border-[#B4846C]/60 font-bold rounded-xl py-3 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
      @click="promptInstall"
    >
      <Icon name="heroicons:arrow-down-tray" class="w-5 h-5 text-[#7D5A50]" />
      <span>{{ isInstalled ? 'BrewSpot POS Installed' : 'Install POS to Home Screen (A2HS)' }}</span>
    </button>

    <!-- Badge / Minimal Variant -->
    <button
      v-else
      type="button"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7D5A50] text-[#FFF0D1] hover:bg-[#684940] text-xs font-semibold transition-colors"
      @click="promptInstall"
    >
      <Icon name="heroicons:arrow-down-tray" class="w-3.5 h-3.5" />
      <span>{{ label }}</span>
    </button>

    <!-- Render instructions modal -->
    <A2HSModal />
  </div>
</template>
