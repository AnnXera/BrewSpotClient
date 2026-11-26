<script setup lang="ts">
defineProps<{
  totalTransactions: number
  totalRevenue: number
  registeredSubscribers: number
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 sm:gap-4 md:gap-5 md:mb-8">
    <!-- Card 1: Total Transactions -->
    <div
      class="bg-white border border-[#EEDFC4] rounded-2xl p-4 sm:p-5 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out hover:shadow-md hover:border-[#D9C4B8] hover:-translate-y-0.5 cursor-default flex flex-col justify-between"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="font-sans text-[11px] font-bold uppercase tracking-wider text-[#9E7060]">
          Total Transactions
        </span>
        <div class="w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 bg-[#FAF4ED] text-[#7D5A50] border-[#EEDFC4] shadow-2xs">
          <Icon name="heroicons:receipt-percent" class="w-4 h-4 text-[#7D5A50]" />
        </div>
      </div>
      <div class="my-2">
        <p class="font-display text-3xl sm:text-4xl font-black tracking-tight leading-none text-[#3D2B24] tabular-nums">
          {{ totalTransactions.toLocaleString() }}
        </p>
      </div>
      <div class="flex items-center gap-1.5 pt-2 border-t border-[#F7EFE6]">
        <span class="w-1.5 h-1.5 rounded-full shrink-0 bg-[#B4846C]" />
        <span class="font-sans text-xs text-[#7D5A50]/80 truncate">
          Processed transactions
        </span>
      </div>
    </div>

    <!-- Card 2: Total Revenue -->
    <div
      class="bg-white border border-[#EEDFC4] rounded-2xl p-4 sm:p-5 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out hover:shadow-md hover:border-[#D9C4B8] hover:-translate-y-0.5 cursor-default flex flex-col justify-between"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="font-sans text-[11px] font-bold uppercase tracking-wider text-[#9E7060]">
          Total Revenue
        </span>
        <div class="w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 bg-[#FAF4ED] text-[#7D5A50] border-[#EEDFC4] shadow-2xs">
          <Icon name="heroicons:banknotes" class="w-4 h-4 text-[#7D5A50]" />
        </div>
      </div>
      <div class="my-2">
        <p class="font-display text-3xl sm:text-4xl font-black tracking-tight leading-none text-[#3D2B24] tabular-nums">
          ₱{{ totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </p>
      </div>
      <div class="flex items-center gap-1.5 pt-2 border-t border-[#F7EFE6]">
        <span class="w-1.5 h-1.5 rounded-full shrink-0 bg-[#B4846C]" />
        <span class="font-sans text-xs text-[#7D5A50]/80 truncate">
          Lifetime gross revenue
        </span>
      </div>
    </div>

    <!-- Card 3: Registered Subscribers -->
    <div
      class="bg-white border border-[#EEDFC4] rounded-2xl p-4 sm:p-5 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out hover:shadow-md hover:border-[#D9C4B8] hover:-translate-y-0.5 cursor-default flex flex-col justify-between"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="font-sans text-[11px] font-bold uppercase tracking-wider text-[#9E7060]">
          Registered Subscribers
        </span>
        <div class="w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 bg-[#FAF4ED] text-[#7D5A50] border-[#EEDFC4] shadow-2xs">
          <Icon name="heroicons:user-group" class="w-4 h-4 text-[#7D5A50]" />
        </div>
      </div>
      <div class="my-2">
        <p class="font-display text-3xl sm:text-4xl font-black tracking-tight leading-none text-[#3D2B24] tabular-nums">
          {{ registeredSubscribers.toLocaleString() }}
        </p>
      </div>
      <div class="flex items-center gap-1.5 pt-2 border-t border-[#F7EFE6]">
        <span class="w-1.5 h-1.5 rounded-full shrink-0 bg-[#B4846C]" />
        <span class="font-sans text-xs text-[#7D5A50]/80 truncate">
          Active billing accounts
        </span>
      </div>
    </div>
  </div>
</template>
