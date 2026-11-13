<!-- app/components/common/A2HSModal.vue -->
<script setup lang="ts">
const {
  isInstalled,
  isIos,
  canInstallDirectly,
  showInstructionsModal,
  promptInstall,
} = useA2HS()

const showAddressBarTip = ref(false)

function handleA2HSClick() {
  if (canInstallDirectly.value) {
    promptInstall()
  } else {
    showAddressBarTip.value = true
    setTimeout(() => {
      showAddressBarTip.value = false
    }, 7000)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      leave-active-class="transition duration-150 ease-in"
      enter-from-class="opacity-0 scale-95"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showInstructionsModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D201B]/60 backdrop-blur-xs font-sans"
        @click.self="showInstructionsModal = false"
        @keydown.esc.window="showInstructionsModal = false"
      >
        <div
          class="relative w-full max-w-md bg-[#FFFDF9] border border-[#B4846C]/30 rounded-2xl p-6 sm:p-7 shadow-2xl overflow-hidden text-[#3D2B24] max-h-[90vh] overflow-y-auto"
        >
          <!-- Close button -->
          <button
            type="button"
            class="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#7D5A50] hover:bg-[#F5E7D0] transition-colors cursor-pointer"
            @click="showInstructionsModal = false"
            title="Close"
          >
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>

          <!-- App Icon & Header -->
          <div class="flex flex-col items-center text-center">
            <div class="w-16 h-16 rounded-2xl bg-[#FFF0D1] border border-[#B4846C]/30 shadow-xs flex items-center justify-center p-2 mb-3">
              <img src="/icons/icon.svg" alt="BrewSpot POS" class="w-12 h-12 object-contain" />
            </div>
            <h3 class="font-display text-xl font-bold text-[#3D2B24]">
              Install BrewSpot POS
            </h3>
            <p class="font-sans text-xs sm:text-sm text-[#8B6656] mt-1 max-w-xs">
              Add the POS terminal to your device's home screen for instant 1-tap access.
            </p>
          </div>

          <!-- Divider -->
          <div class="h-px bg-[#B4846C]/20 my-4" />

          <!-- State 1: Already Installed -->
          <div v-if="isInstalled" class="bg-[#F0F7EE] border border-[#86BC84]/40 rounded-xl p-4 text-center mb-3">
            <Icon name="heroicons:check-circle" class="w-8 h-8 text-[#3B7A38] mx-auto mb-1" />
            <p class="text-sm font-semibold text-[#2D5A2B]">App Icon Already Installed!</p>
            <p class="text-xs text-[#3B7A38] mt-1">
              BrewSpot POS is installed on this device. You can launch it anytime directly from your desktop or home screen.
            </p>
            <NuxtLink
              to="/pos"
              class="mt-3 inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#7D5A50] hover:bg-[#684940] text-white font-semibold text-sm transition-colors shadow-xs"
              @click="showInstructionsModal = false"
            >
              <Icon name="heroicons:arrow-top-right-on-square" class="w-4 h-4" />
              Open POS Register (/pos)
            </NuxtLink>
          </div>

          <!-- Main A2HS Install Action -->
          <div class="space-y-3.5">
            <!-- Option 1: Native A2HS Button -->
            <div>
              <button
                type="button"
                class="w-full py-3.5 px-4 rounded-xl bg-[#7D5A50] hover:bg-[#684940] text-white font-bold text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                @click="handleA2HSClick"
              >
                <Icon name="heroicons:arrow-down-tray" class="w-5 h-5 text-[#FFF0D1]" />
                <span>Add POS to Home Screen (A2HS)</span>
              </button>
            </div>

            <!-- Address Bar Visual Tip (when native prompt is deferred by browser) -->
            <Transition
              enter-active-class="transition duration-200 ease-out"
              leave-active-class="transition duration-150 ease-in"
              enter-from-class="opacity-0 -translate-y-1"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div v-if="showAddressBarTip" class="p-3 bg-[#FFF0D1] border border-[#B4846C]/40 rounded-xl text-xs text-[#7D5A50] flex items-start gap-2">
                <Icon name="heroicons:sparkles" class="w-4 h-4 text-[#7D5A50] shrink-0 mt-0.5" />
                <div>
                  <p class="font-semibold">Install directly via browser:</p>
                  <p class="text-[11px] text-[#8B6656] mt-0.5">
                    Look at the right side of your address bar for the <strong>Install</strong> icon (<span class="font-mono">⊕</span> or desktop icon), or click browser menu <strong>⋮ &rarr; Install BrewSpot POS</strong>!
                  </p>
                </div>
              </div>
            </Transition>

            <!-- iOS Safari Instructions -->
            <div v-if="isIos" class="bg-[#FFF8EA] border border-[#B4846C]/20 rounded-xl p-3.5 space-y-2">
              <p class="text-xs font-bold text-[#7D5A50] uppercase tracking-wider">
                How to add on iPad / iPhone (Safari):
              </p>
              <ol class="space-y-2 text-xs text-[#3D2B24]">
                <li class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-[#FFF0D1] text-[#7D5A50] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Tap the <strong class="text-[#7D5A50]">Share</strong> button <Icon name="heroicons:share" class="inline w-3.5 h-3.5 text-[#7D5A50]" /> in Safari's toolbar.</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-[#FFF0D1] text-[#7D5A50] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Select <strong class="text-[#7D5A50]">Add to Home Screen</strong> <Icon name="heroicons:plus-circle" class="inline w-3.5 h-3.5 text-[#7D5A50]" />.</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-[#FFF0D1] text-[#7D5A50] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Tap <strong class="text-[#7D5A50]">Add</strong>. The icon will appear on your home screen!</span>
                </li>
              </ol>
            </div>

            <!-- Desktop Chrome / Brave / Edge Instructions -->
            <div v-else class="bg-[#FFF8EA] border border-[#B4846C]/20 rounded-xl p-3.5 space-y-2">
              <p class="text-xs font-bold text-[#7D5A50] uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="heroicons:information-circle" class="w-3.5 h-3.5 text-[#7D5A50]" />
                <span>How to Install via Browser Menu:</span>
              </p>
              <div class="space-y-2 text-xs text-[#3D2B24]">
                <div class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-[#FFF0D1] text-[#7D5A50] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Click your browser menu <strong class="text-[#7D5A50]">⋮</strong> in the top-right corner.</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-[#FFF0D1] text-[#7D5A50] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Click <strong class="text-[#7D5A50]">"Install BrewSpot POS"</strong> (or hover <strong>"Save and share"</strong> &rarr; click <strong>"Install page as app"</strong>).</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-[#FFF0D1] text-[#7D5A50] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Confirm <strong>Install</strong>. A standalone app icon will be created on your desktop.</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Footer Link -->
          <div class="mt-4 pt-3 border-t border-[#B4846C]/20 flex items-center justify-between text-xs">
            <span class="text-[#8B6656]">Target route: <code class="font-mono text-[#7D5A50] font-semibold">/pos</code></span>
            <NuxtLink
              to="/pos"
              class="font-semibold text-[#7D5A50] hover:text-[#523A33] hover:underline flex items-center gap-1 transition-colors"
              @click="showInstructionsModal = false"
            >
              <span>Go to /pos now</span>
              <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
