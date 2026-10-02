<script setup lang="ts">
import type { PropType } from 'vue'

const props = defineProps({
  stats: {
    type: Object as PropType<{ today_revenue: number, today_orders: number, avg_order_value: number, active_customers: number } | null>,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

const displayStats = computed(() => {
  if (!props.stats) return []
  return [
    {
      label: "Today's Revenue",
      value: formatCurrency(props.stats.today_revenue || 0),
      trend: "Today",
      trendUp: true,
      icon: "heroicons:banknotes"
    },
    {
      label: "Today's Orders",
      value: (props.stats.today_orders || 0).toString(),
      trend: "Today",
      trendUp: true,
      icon: "heroicons:shopping-bag"
    },
    {
      label: "Avg Order Value",
      value: formatCurrency(props.stats.avg_order_value || 0),
      trend: "Today",
      trendUp: true,
      icon: "heroicons:calculator"
    },
    {
      label: "Active Customers",
      value: (props.stats.active_customers || 0).toString(),
      trend: "Today",
      trendUp: true,
      icon: "heroicons:users"
    }
  ]
})
</script>

<template>
  <div>
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="bg-white border border-[#EEDFC4] p-4 rounded-xl shadow-sm flex items-center gap-4 animate-pulse">
        <div class="w-12 h-12 rounded-lg bg-gray-200 shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          <div class="h-5 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>
    
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="(stat, index) in displayStats" :key="index" class="bg-white border border-[#EEDFC4] p-4 rounded-xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div class="w-12 h-12 rounded-lg bg-[#FDF3E7] flex items-center justify-center text-[#7D5A50] shrink-0">
          <Icon :name="stat.icon" class="w-6 h-6" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[11px] font-bold text-[#9E7060] uppercase tracking-wide truncate">{{ stat.label }}</p>
          <div class="flex items-end gap-2 mt-1">
            <span class="text-xl font-display font-bold text-[#3B1F0E] truncate">{{ stat.value }}</span>
            <span 
              class="text-[10px] font-bold mb-1 flex items-center gap-0.5"
              :class="stat.trendUp ? 'text-emerald-600' : 'text-red-500'"
            >
              <Icon :name="stat.trendUp ? 'heroicons:arrow-up-right' : 'heroicons:arrow-down-right'" class="w-3 h-3" />
              {{ stat.trend }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
