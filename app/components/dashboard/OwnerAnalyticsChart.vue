<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  chartData: {
    type: Array as () => Array<{ month: string, revenue: number }>,
    default: () => []
  }
})

const maxRevenue = computed(() => {
  if (!props.chartData.length) return 100000
  return Math.max(...props.chartData.map(d => d.revenue), 10000)
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

const activeIndex = ref<number | null>(null)
</script>

<template>
  <div class="bg-white border border-[#EEDFC4] p-6 rounded-2xl shadow-sm flex flex-col h-full">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
      <div>
        <h3 class="font-display font-semibold text-[#3B1F0E] flex items-center gap-2">
          <Icon name="heroicons:chart-bar" class="w-5 h-5 text-emerald-600" />
          Revenue Analytics
        </h3>
        <p class="text-xs text-[#8B6656] mt-1">Monthly earnings overview</p>
      </div>
      
      <div class="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-100 flex items-center gap-1 w-max">
        <Icon name="heroicons:arrow-trending-up" class="w-4 h-4" />
        +12.5% this month
      </div>
    </div>
    
    <div class="flex-1 relative flex items-end h-[240px] mt-4 pt-4" v-if="!loading">
      <!-- Y-Axis Labels -->
      <div class="absolute left-0 top-4 bottom-8 w-12 sm:w-16 flex flex-col justify-between text-right pr-2">
        <span class="text-[10px] sm:text-xs text-gray-400 font-mono">{{ formatCurrency(maxRevenue) }}</span>
        <span class="text-[10px] sm:text-xs text-gray-400 font-mono">{{ formatCurrency(maxRevenue * 0.66) }}</span>
        <span class="text-[10px] sm:text-xs text-gray-400 font-mono">{{ formatCurrency(maxRevenue * 0.33) }}</span>
        <span class="text-[10px] sm:text-xs text-gray-400 font-mono">{{ formatCurrency(0) }}</span>
      </div>

      <!-- Grid lines -->
      <div class="absolute left-12 sm:left-16 right-0 top-4 bottom-8 flex flex-col justify-between pointer-events-none">
        <div class="border-b border-dashed border-gray-200 h-0 w-full"></div>
        <div class="border-b border-dashed border-gray-200 h-0 w-full"></div>
        <div class="border-b border-dashed border-gray-200 h-0 w-full"></div>
        <div class="border-b border-solid border-gray-300 h-0 w-full"></div>
      </div>

      <!-- Bars -->
      <div class="relative z-10 flex items-end justify-around w-full h-full pb-8 ml-12 sm:ml-16 pr-2 sm:pr-4">
        <div 
          v-for="(item, index) in chartData" 
          :key="item.month"
          class="relative flex flex-col justify-end items-center group w-full max-w-[30px] sm:max-w-[48px] h-full"
          @mouseenter="activeIndex = index"
          @mouseleave="activeIndex = null"
        >
          <!-- Tooltip -->
          <div 
            class="absolute -top-10 bg-[#3B1F0E] text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 pointer-events-none z-20 shadow-lg flex items-center justify-center"
            :class="activeIndex === index ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'"
          >
            {{ formatCurrency(item.revenue) }}
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#3B1F0E]"></div>
          </div>
          
          <!-- Bar -->
          <div 
            class="w-full bg-[#EEDFC4] rounded-t-md transition-all duration-300 relative overflow-hidden cursor-pointer"
            :class="[activeIndex === index ? 'bg-[#7D5A50] shadow-md scale-y-105 origin-bottom' : 'group-hover:bg-[#C8A996]']"
            :style="{ height: `${(item.revenue / maxRevenue) * 100}%` }"
          >
             <div class="absolute bottom-0 w-full bg-gradient-to-t from-black/20 to-transparent h-1/2 opacity-50"></div>
          </div>
          
          <!-- X Axis Label -->
          <span class="absolute -bottom-6 text-[10px] sm:text-xs font-bold text-[#8B6656]" :class="activeIndex === index ? 'text-[#3B1F0E]' : ''">{{ item.month }}</span>
        </div>
      </div>
    </div>
    
    <div v-else class="flex-1 flex items-center justify-center h-[240px]">
      <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-[#7D5A50]" />
    </div>
  </div>
</template>
