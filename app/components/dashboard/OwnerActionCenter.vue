<script setup lang="ts">
import { ref } from 'vue'

interface ActionItem {
  id: string
  title: string
  description: string
  type: 'alert' | 'warning' | 'info'
  icon: string
  actionText: string
  actionLink: string
}

const actionItems = ref<ActionItem[]>([
  {
    id: '1',
    title: 'Low Stock Alert: Espresso Beans',
    description: 'Downtown Branch is running critically low on House Blend Espresso Beans (estimated < 2 days remaining).',
    type: 'alert',
    icon: 'heroicons:exclamation-triangle',
    actionText: 'Order Inventory',
    actionLink: '/owner/cafes'
  },
  {
    id: '2',
    title: 'Pending Staff Approvals',
    description: 'There are 3 new staff members awaiting your approval to access the POS system.',
    type: 'warning',
    icon: 'heroicons:user-group',
    actionText: 'Review Staff',
    actionLink: '/owner/cafes'
  },
  {
    id: '3',
    title: 'Subscription Renewing Soon',
    description: 'Your Premium Business Plan will automatically renew in 5 days.',
    type: 'info',
    icon: 'heroicons:credit-card',
    actionText: 'Manage Billing',
    actionLink: '/owner/subscription'
  }
])

const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function getTypeClasses(type: string) {
  switch (type) {
    case 'alert':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        iconBg: 'bg-red-100',
        iconText: 'text-red-600',
        button: 'bg-red-600 hover:bg-red-700 text-white'
      }
    case 'warning':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100',
        iconText: 'text-amber-600',
        button: 'bg-amber-600 hover:bg-amber-700 text-white'
      }
    case 'info':
    default:
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700 text-white'
      }
  }
}
</script>

<template>
  <div class="bg-white border border-[#EEDFC4] rounded-2xl shadow-sm overflow-hidden flex flex-col">
    <div class="p-5 border-b border-[#EEDFC4] flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Icon name="heroicons:bell-alert" class="w-5 h-5" />
        </div>
        <div>
          <h3 class="font-display font-semibold text-[#3B1F0E]">Action Center</h3>
          <p class="text-xs text-[#8B6656] mt-0.5">Tasks requiring your attention</p>
        </div>
      </div>
      <span class="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
        {{ actionItems.length }} Pending
      </span>
    </div>

    <div class="p-4 flex flex-col gap-3">
      <div v-if="actionItems.length === 0" class="py-8 text-center text-[#8B6656]">
        <Icon name="heroicons:check-circle" class="w-8 h-8 mx-auto mb-2 text-emerald-500" />
        <p class="font-medium text-[#3B1F0E]">You're all caught up!</p>
        <p class="text-sm">No pending actions required.</p>
      </div>

      <div 
        v-else
        v-for="item in actionItems" 
        :key="item.id"
        class="border rounded-xl overflow-hidden transition-all duration-300"
        :class="[getTypeClasses(item.type).border, expandedId === item.id ? 'shadow-md ' + getTypeClasses(item.type).bg : 'bg-white hover:shadow-sm']"
      >
        <!-- Header Collapsed View -->
        <button 
          @click="toggleExpand(item.id)"
          class="w-full text-left px-4 py-3 flex items-center justify-between transition-colors focus:outline-none"
          :class="expandedId === item.id ? '' : 'hover:bg-gray-50'"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" :class="getTypeClasses(item.type).iconBg">
              <Icon :name="item.icon" class="w-5 h-5" :class="getTypeClasses(item.type).iconText" />
            </div>
            <div>
              <h4 class="text-sm font-semibold text-[#3B1F0E]">{{ item.title }}</h4>
              <p class="text-xs text-[#8B6656] mt-0.5 truncate max-w-[200px] sm:max-w-sm" v-if="expandedId !== item.id">
                {{ item.description }}
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <Icon 
              name="heroicons:chevron-down" 
              class="w-5 h-5 transition-transform duration-300 text-gray-400"
              :class="expandedId === item.id ? 'rotate-180' : ''" 
            />
          </div>
        </button>
        
        <!-- Expanded Details -->
        <div 
          class="grid overflow-hidden transition-all duration-300 ease-in-out"
          :class="expandedId === item.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
        >
          <div class="min-h-0">
            <div class="px-4 pb-4 pt-1 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end">
              <p class="text-sm font-medium flex-1" :class="getTypeClasses(item.type).text">
                {{ item.description }}
              </p>
              
              <NuxtLink 
                :to="item.actionLink" 
                class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm w-full sm:w-auto mt-2 sm:mt-0"
                :class="getTypeClasses(item.type).button"
              >
                {{ item.actionText }}
                <Icon name="heroicons:arrow-right" class="w-3.5 h-3.5" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
