<!-- app/components/common/WalkthroughVisual.vue -->
<script setup lang="ts">
defineProps<{
  type: string
}>()
</script>

<template>
  <div class="relative w-full h-44 sm:h-48 rounded-2xl bg-gradient-to-br from-[#FDF3E7] to-[#F5E6D3] border border-[#EADAC5] p-3 flex items-center justify-center overflow-hidden shadow-inner select-none">
    
    <!-- Background subtle floating particles -->
    <div class="absolute inset-0 pointer-events-none opacity-40">
      <div class="particle p1" />
      <div class="particle p2" />
      <div class="particle p3" />
    </div>

    <!-- 1. DASHBOARD ANIMATION -->
    <div v-if="type === 'dashboard'" class="w-full max-w-xs flex flex-col gap-2">
      <div class="bg-white rounded-xl p-2.5 border border-[#EDD8CC] shadow-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="relative flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span class="text-xs font-bold text-[#3D2B24]">Today's Sales</span>
        </div>
        <span class="text-sm font-extrabold text-[#7D5A50] tabular-nums">₱ 18,450.00</span>
      </div>

      <div class="bg-white/80 rounded-xl p-2 border border-[#EDD8CC] shadow-xs flex items-end justify-between h-16 gap-2 px-4">
        <div class="chart-bar b1" />
        <div class="chart-bar b2" />
        <div class="chart-bar b3" />
        <div class="chart-bar b4" />
        <div class="chart-bar b5" />
        <div class="chart-bar b6" />
        <div class="chart-bar b7" />
      </div>
    </div>

    <!-- 2. CAFES & BRANCHES ANIMATION -->
    <div v-else-if="type === 'cafes'" class="w-full max-w-xs flex flex-col gap-2">
      <div class="bg-white rounded-xl p-2.5 border border-[#EDD8CC] shadow-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-[#FFF0D1] text-[#7D5A50] flex items-center justify-center font-bold text-xs">
            <Icon name="heroicons:building-storefront" class="w-4 h-4" />
          </div>
          <div>
            <p class="text-xs font-bold text-[#3D2B24]">Brew Haven - Main Branch</p>
            <p class="text-[10px] text-gray-500">8:00 AM - 10:00 PM</p>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
          Open Now
        </span>
      </div>
      <div class="bg-white/70 rounded-lg p-2 text-center text-[11px] font-semibold text-[#7D5A50] border border-[#EDD8CC]">
        🏪 Multi-branch hours & counter terminal management
      </div>
    </div>

    <!-- 3. MENU & PRICING ANIMATION -->
    <div v-else-if="type === 'menu'" class="relative flex items-center justify-center gap-3">
      <div class="w-24 bg-white rounded-xl border border-[#EDD8CC] p-2.5 shadow-xs flex flex-col items-center gap-1 animate-tilt-left">
        <div class="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
          <Icon name="heroicons:fire" class="w-5 h-5 animate-pulse" />
        </div>
        <span class="text-[11px] font-bold text-[#3D2B24]">Hot Coffee</span>
        <span class="px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 text-[10px] font-bold border border-orange-200">
          ₱ 120.00
        </span>
      </div>

      <div class="w-6 h-6 rounded-full bg-[#7D5A50] text-[#FFF0D1] flex items-center justify-center text-[9px] font-black">
        &
      </div>

      <div class="w-24 bg-white rounded-xl border border-[#EDD8CC] p-2.5 shadow-xs flex flex-col items-center gap-1 animate-tilt-right">
        <div class="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
          <Icon name="ph:cube" class="w-5 h-5 animate-spin-slow" />
        </div>
        <span class="text-[11px] font-bold text-[#3D2B24]">Iced Coffee</span>
        <span class="px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200">
          ₱ 135.00
        </span>
      </div>
    </div>

    <!-- 4. INVENTORY ANIMATION -->
    <div v-else-if="type === 'inventory'" class="w-full max-w-xs flex flex-col gap-2">
      <div class="bg-white rounded-xl p-2 border border-[#EDD8CC] shadow-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm">☕</span>
          <span class="text-xs font-bold text-[#3D2B24]">Arabica Beans</span>
        </div>
        <span class="text-xs font-bold text-red-600 tabular-nums animate-pulse">- 18 g</span>
      </div>
      <div class="bg-white rounded-xl p-2 border border-[#EDD8CC] shadow-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm">🥛</span>
          <span class="text-xs font-bold text-[#3D2B24]">Whole Dairy</span>
        </div>
        <span class="text-xs font-bold text-red-600 tabular-nums animate-pulse">- 150 ml</span>
      </div>
      <div class="text-[10px] font-semibold text-center text-[#7D5A50] bg-[#FFF0D1] rounded py-1">
        ⚡ Stock auto-deducts on POS sales
      </div>
    </div>

    <!-- 5. ANALYTICS ANIMATION -->
    <div v-else-if="type === 'analytics'" class="w-full max-w-xs flex flex-col gap-2">
      <div class="bg-white rounded-xl p-2.5 border border-[#EDD8CC] shadow-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon name="heroicons:arrow-trending-up" class="w-5 h-5 text-emerald-600" />
          <span class="text-xs font-bold text-[#3D2B24]">Top Item: Caramel Macchiato</span>
        </div>
        <span class="text-xs font-extrabold text-emerald-700">+34%</span>
      </div>
      <div class="bg-white/80 rounded-lg p-2 flex justify-around text-center text-[10px] font-bold text-[#7D5A50]">
        <div><p class="text-xs text-[#3D2B24]">142</p><p class="text-gray-400">Cups Sold</p></div>
        <div><p class="text-xs text-[#3D2B24]">2:00 PM</p><p class="text-gray-400">Peak Hour</p></div>
        <div><p class="text-xs text-[#3D2B24]">₱ 19.8k</p><p class="text-gray-400">Net Profit</p></div>
      </div>
    </div>

    <!-- 6. SUBSCRIPTION ANIMATION -->
    <div v-else-if="type === 'subscription'" class="w-full max-w-xs bg-white rounded-xl border border-[#EDD8CC] p-3 shadow-xs space-y-2">
      <div class="flex items-center justify-between border-b border-gray-100 pb-1">
        <span class="text-xs font-bold text-[#7D5A50]">Pro Plan Subscription</span>
        <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Active</span>
      </div>
      <div class="flex items-center justify-between text-xs text-[#3D2B24]">
        <span>Branches: 3 of 5 used</span>
        <span>Registers: 4 of 6 used</span>
      </div>
    </div>

    <!-- 7. POS SETUP ANIMATION -->
    <div v-else-if="type === 'pos-setup'" class="relative flex flex-col items-center">
      <div class="w-48 bg-[#3D2B24] rounded-xl p-2 shadow-lg border border-[#7D5A50]">
        <div class="bg-white rounded-lg p-2 text-center flex flex-col items-center gap-1.5">
          <img src="/icons/icon.svg" alt="POS" class="w-6 h-6 rounded-md" />
          <span class="text-[10px] font-bold text-[#7D5A50]">BrewSpot POS Terminal</span>
          <span class="px-2 py-0.5 rounded-full bg-[#FFF0D1] text-[#7D5A50] text-[9px] font-bold border border-[#EDD8CC]">
            Install POS to Home Screen (A2HS)
          </span>
        </div>
      </div>
    </div>

    <!-- 8. STAFF & PIN ANIMATION -->
    <div v-else-if="type === 'staff'" class="w-full max-w-xs flex flex-col gap-2">
      <div class="bg-white rounded-xl p-2 border border-[#EDD8CC] shadow-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-[#7D5A50] text-[#FFF0D1] flex items-center justify-center font-bold text-[10px]">
            JD
          </div>
          <div>
            <p class="text-xs font-bold text-[#3D2B24]">Juan Dela Cruz</p>
            <p class="text-[9px] text-gray-500">Cashier · Active</p>
          </div>
        </div>
        <span class="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">6-Digit PIN Ready</span>
      </div>
      <div class="bg-[#FFF8EA] rounded-lg p-2 flex items-center justify-center gap-2">
        <span class="pin-dot pd1" />
        <span class="pin-dot pd2" />
        <span class="pin-dot pd3" />
        <span class="pin-dot pd4" />
        <span class="pin-dot pd5" />
        <span class="pin-dot pd6" />
      </div>
    </div>

    <!-- 9. FLOOR PLAN ANIMATION -->
    <div v-else-if="type === 'floorplan'" class="w-full max-w-xs h-28 bg-white rounded-xl border border-[#EDD8CC] p-2 flex items-center justify-around shadow-xs">
      <div class="flex flex-col items-center gap-1">
        <div class="w-10 h-10 rounded-xl bg-[#7D5A50] text-white flex items-center justify-center font-bold text-[10px] shadow-xs animate-pulse">
          T-01
        </div>
        <span class="text-[9px] font-bold text-[#7D5A50]">Occupied (4p)</span>
      </div>
      <div class="flex flex-col items-center gap-1">
        <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
          T-02
        </div>
        <span class="text-[9px] font-bold text-emerald-700">Available (2p)</span>
      </div>
      <div class="flex flex-col items-center gap-1">
        <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
          T-03
        </div>
        <span class="text-[9px] font-bold text-amber-700">Reserved (6p)</span>
      </div>
    </div>

    <!-- 10. RESERVATIONS ANIMATION -->
    <div v-else-if="type === 'reservations'" class="w-full max-w-xs bg-white rounded-xl border border-[#EDD8CC] p-2.5 shadow-xs space-y-1.5">
      <div class="flex items-center justify-between border-b border-gray-100 pb-1">
        <span class="text-xs font-bold text-[#3D2B24]">Maria Santos</span>
        <span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Confirmed</span>
      </div>
      <div class="flex items-center justify-between text-[11px] text-[#8B6656]">
        <span>Table 3 · 4 Guests</span>
        <span class="font-bold text-[#3D2B24]">7:30 PM Tonight</span>
      </div>
    </div>

    <!-- 11. SPOILAGE ANIMATION -->
    <div v-else-if="type === 'spoilage'" class="w-full max-w-xs bg-white rounded-xl border border-[#EDD8CC] p-2.5 shadow-xs space-y-1.5">
      <div class="flex items-center justify-between border-b border-gray-100 pb-1">
        <span class="text-xs font-bold text-[#3D2B24]">Pastry Spoilage Log</span>
        <span class="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">Logged</span>
      </div>
      <p class="text-[11px] text-gray-600">2x Butter Croissants · Reason: Expired</p>
    </div>

    <!-- 12. POS LOCK SCREEN ANIMATION -->
    <div v-else-if="type === 'pos-lock'" class="w-full max-w-xs bg-white rounded-xl border border-[#EDD8CC] p-3 shadow-xs flex flex-col items-center gap-2">
      <div class="w-10 h-10 rounded-full bg-[#7D5A50] text-[#FFF0D1] flex items-center justify-center font-bold text-sm">
        <Icon name="heroicons:lock-closed" class="w-5 h-5" />
      </div>
      <p class="text-xs font-bold text-[#3D2B24]">Tap Name & Enter PIN</p>
      <div class="flex gap-2">
        <span class="w-2 h-2 rounded-full bg-[#7D5A50]" />
        <span class="w-2 h-2 rounded-full bg-[#7D5A50]" />
        <span class="w-2 h-2 rounded-full bg-[#7D5A50]" />
        <span class="w-2 h-2 rounded-full bg-[#EDD8CC]" />
        <span class="w-2 h-2 rounded-full bg-[#EDD8CC]" />
        <span class="w-2 h-2 rounded-full bg-[#EDD8CC]" />
      </div>
    </div>

    <!-- 13. POS CHECKOUT ANIMATION -->
    <div v-else-if="type === 'pos-checkout'" class="w-full max-w-xs bg-white rounded-xl border border-[#EDD8CC] p-3 shadow-xs space-y-2">
      <div class="flex justify-between items-center border-b border-gray-100 pb-1">
        <span class="text-xs font-bold text-[#3D2B24]">Payment: Cash</span>
        <span class="text-xs font-extrabold text-[#7D5A50]">₱ 270.00</span>
      </div>
      <div class="flex justify-between items-center text-[11px] text-gray-500">
        <span>Tendered: ₱ 300.00</span>
        <span class="font-bold text-emerald-700">Change: ₱ 30.00</span>
      </div>
    </div>

    <!-- DEFAULT / COMPLETE ANIMATION -->
    <div v-else class="relative flex flex-col items-center justify-center">
      <div class="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center shadow-md animate-bounce-subtle">
        <Icon name="heroicons:trophy" class="w-8 h-8 text-amber-600" />
      </div>
      <span class="mt-2 text-xs font-bold text-[#7D5A50]">BrewSpot Ready</span>
    </div>

  </div>
</template>

<style scoped>
@keyframes barGrow {
  0%, 100% { height: 25%; }
  50% { height: 90%; }
}
.chart-bar {
  width: 10px;
  background: #7D5A50;
  border-radius: 4px;
  animation: barGrow 2.4s infinite ease-in-out;
}
.b1 { height: 35%; animation-delay: 0.1s; }
.b2 { height: 55%; animation-delay: 0.3s; }
.b3 { height: 40%; animation-delay: 0.5s; }
.b4 { height: 85%; animation-delay: 0.2s; background: #B4846C; }
.b5 { height: 65%; animation-delay: 0.6s; }
.b6 { height: 95%; animation-delay: 0.4s; background: #3D2B24; }
.b7 { height: 50%; animation-delay: 0.7s; }

.animate-tilt-left {
  animation: tiltLeft 3s infinite ease-in-out alternate;
}
.animate-tilt-right {
  animation: tiltRight 3s infinite ease-in-out alternate;
}
@keyframes tiltLeft {
  from { transform: translateY(0); }
  to { transform: translateY(-4px); }
}
@keyframes tiltRight {
  from { transform: translateY(-4px); }
  to { transform: translateY(0); }
}

.animate-bounce-subtle {
  animation: bounceSubtle 2.5s infinite ease-in-out;
}
@keyframes bounceSubtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.pin-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #7D5A50;
  animation: pulseDot 1.4s infinite ease-in-out;
}
.pd1 { animation-delay: 0.1s; }
.pd2 { animation-delay: 0.25s; }
.pd3 { animation-delay: 0.4s; }
.pd4 { animation-delay: 0.55s; }
.pd5 { animation-delay: 0.7s; }
.pd6 { animation-delay: 0.85s; }

@keyframes pulseDot {
  0%, 100% { transform: scale(0.8); opacity: 0.4; }
  50% { transform: scale(1.3); opacity: 1; background: #3D2B24; }
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #B4846C;
  border-radius: 9999px;
  opacity: 0.3;
}
.p1 { top: 20%; left: 15%; }
.p2 { top: 70%; right: 20%; }
.p3 { top: 40%; right: 10%; }
</style>
