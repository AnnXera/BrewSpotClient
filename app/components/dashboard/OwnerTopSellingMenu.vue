<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  topItems: {
    rank: number
    name: string
    category: string
    orders: number
    percentage: number
    revenue: number
  }[]
}>()

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
}
</script>

<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl shadow-sm p-6 overflow-hidden">
    <div class="mb-5">
      <h3 class="font-display text-lg font-bold text-[#3B1F0E]">Top-Selling Menu Items</h3>
      <p class="text-xs text-[#8B6656] mt-1">Top performers sorted by volume and gross contribution</p>
    </div>

    <div class="space-y-0" v-if="topItems && topItems.length > 0">
      <div 
        v-for="(item, index) in topItems" 
        :key="item.rank"
        class="flex items-center justify-between py-4"
        :class="{ 'border-b border-gray-100': index !== topItems.length - 1 }"
      >
        <div class="flex items-center gap-4">
          <span class="text-sm font-bold text-[#8B6656]">#{{ item.rank }}</span>
          <div>
            <h4 class="text-sm font-bold text-[#3D2B24]">{{ item.name }}</h4>
            <p class="text-xs text-[#9E7060] mt-0.5">{{ item.category }}</p>
          </div>
        </div>

        <div class="flex items-center gap-8">
          <div class="flex flex-col items-end gap-1.5 w-32 hidden sm:flex">
            <div class="flex items-center justify-between w-full text-xs font-semibold">
              <span class="text-[#3D2B24]">{{ item.orders }} orders</span>
              <span class="text-[#9E7060]">{{ item.percentage }}%</span>
            </div>
            <div class="w-full bg-[#FFF0D1] h-1.5 rounded-full overflow-hidden">
              <div class="bg-[#7D5A50] h-full rounded-full" :style="{ width: item.percentage + '%' }"></div>
            </div>
          </div>
          <span class="text-sm font-bold text-[#3D2B24] w-24 text-right">{{ formatCurrency(item.revenue) }}</span>
        </div>
      </div>
    </div>
    
    <div v-else class="text-center py-8 text-[#9E7060] text-sm">
      Not enough data to determine top-selling items yet.
    </div>
  </div>
</template>
