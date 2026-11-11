<!-- app/components/common/FirstTimeWalkthrough.vue -->
<script setup lang="ts">
import { unref } from 'vue'
import { useFirstTimeWalkthrough, type SetupMission, type DashboardFeature } from '~/composables/useFirstTimeWalkthrough'

const {
  isGuideModalOpen,
  activeTab,
  isEligible,
  isFirstTimeOwner,
  isOwner,
  isManager,
  isCashier,
  role,
  missions,
  completedMissionIds,
  dashboardFeatures,
  totalMissions,
  completedMissionsCount,
  remainingMissionsCount,
  missionsProgressPercent,
  isAllMissionsCompleted,
  isMissionGuideActive,
  activeMissionIndex,
  activeStepIndex,
  currentActiveMission,
  currentActiveStep,
  totalStepsInActiveMission,
  isLastStepOfMission,
  isFirstStepOfMission,
  isLastMission,
  isFirstMission,
  nextMissionObject,
  isCompanionMinimized,
  missionCelebration,
  isGrandFinaleOpen,
  toggleMission,
  resetProgress,
  dismissGuide,
  openGuide,
  startMission,
  startFullTour,
  nextStep,
  prevStep,
  goToStep,
  finishAllMissions,
  exitMissionGuide,
  syncRouteToActiveStep,
} = useFirstTimeWalkthrough()

const route = useRoute()
const router = useRouter()
const featureSearch = ref('')
const expandedMissionId = ref<string | null>(null)
const expandedFeatureId = ref<string | null>(null)

const isOwnerRoute = computed(() => {
  if (isOwner.value) return route.path.startsWith('/owner')
  if (isManager.value) return route.path.startsWith('/manager')
  return route.path.startsWith('/owner') || route.path.startsWith('/manager')
})

// ── Blocked Interaction Notice during Walkthrough Tour ─────────────────────
const showBlockedNotice = ref(false)
let blockedNoticeTimer: ReturnType<typeof setTimeout> | null = null

function handleBlockedClick() {
  showBlockedNotice.value = true
  if (blockedNoticeTimer) clearTimeout(blockedNoticeTimer)
  blockedNoticeTimer = setTimeout(() => {
    showBlockedNotice.value = false
  }, 3200)
}

// ── Target Element & Popover Positioning State ──────────────────────────────
const targetRect = ref<{
  top: number
  left: number
  width: number
  height: number
  bottom: number
  right: number
} | null>(null)

const isTargetFound = ref(false)
const popoverPlacement = ref<'top' | 'bottom'>('bottom')
const arrowOffsetLeft = ref(30)
const popoverStyle = ref<Record<string, string>>({})
const popoverEl = ref<HTMLElement | null>(null)

function isSidebarOrNavElement(element: HTMLElement): boolean {
  // Never target elements inside the sidebar navigation, bell, tour mode button, or walkthrough modal itself
  return Boolean(
    element.closest('aside.md\\:flex') ||
    element.closest('aside[class*="bg-[#7D5A50]"]') ||
    element.closest('.bell-button') ||
    element.closest('.first-time-walkthrough') ||
    element.closest('header.navbar') ||
    (element.tagName === 'IMG' && (element.getAttribute('alt') === 'Brewspot' || element.classList.contains('min-w-0')))
  )
}

function findTargetElement(selector?: string): HTMLElement | null {
  if (!selector) return null

  const selectors = selector.split(',').map(s => s.trim()).filter(Boolean)
  const mainEl = document.querySelector('main')

  // Phase 1: Search strictly inside <main> first (where all page workspace, cards, forms, tables reside)
  if (mainEl) {
    for (const s of selectors) {
      try {
        const hasTextMatch = s.match(/^([a-z0-9_-]+):has-text\("([^"]+)"\)$/i)
        if (hasTextMatch && hasTextMatch[1] && hasTextMatch[2]) {
          const tag = hasTextMatch[1]
          const text = hasTextMatch[2].toLowerCase()
          const candidates = Array.from(mainEl.querySelectorAll(tag)) as HTMLElement[]
          const match = candidates.find(c => (c.textContent?.toLowerCase() ?? '').includes(text) && !isSidebarOrNavElement(c))
          if (match && (match.offsetWidth > 0 || match.offsetHeight > 0)) {
            return match
          }
          continue
        }

        const found = mainEl.querySelector(s) as HTMLElement | null
        if (found && (found.offsetWidth > 0 || found.offsetHeight > 0 || found.getClientRects().length > 0)) {
          if (!isSidebarOrNavElement(found)) {
            return found
          }
        }
      } catch {
        // ignore invalid selector syntax
      }
    }
  }

  // Phase 2: If not found in <main>, check document (e.g. modals, dialogs), but strictly reject sidebar/nav elements
  for (const s of selectors) {
    try {
      const hasTextMatch = s.match(/^([a-z0-9_-]+):has-text\("([^"]+)"\)$/i)
      if (hasTextMatch && hasTextMatch[1] && hasTextMatch[2]) {
        const tag = hasTextMatch[1]
        const text = hasTextMatch[2].toLowerCase()
        const candidates = Array.from(document.querySelectorAll(tag)) as HTMLElement[]
        const match = candidates.find(c => (c.textContent?.toLowerCase() ?? '').includes(text) && !isSidebarOrNavElement(c))
        if (match && (match.offsetWidth > 0 || match.offsetHeight > 0)) {
          return match
        }
        continue
      }

      const found = document.querySelector(s) as HTMLElement | null
      if (found && (found.offsetWidth > 0 || found.offsetHeight > 0 || found.getClientRects().length > 0)) {
        if (!isSidebarOrNavElement(found)) {
          return found
        }
      }
    } catch {
      // ignore invalid selector
    }
  }

  return null
}

function updateTargetPosition() {
  if (!isMissionGuideActive.value || isCompanionMinimized.value || !currentActiveStep.value) {
    targetRect.value = null
    isTargetFound.value = false
    return
  }

  const selector = currentActiveStep.value.targetSelector
  if (!selector) {
    targetRect.value = null
    isTargetFound.value = false
    setDefaultCenteredPosition()
    return
  }

  const el = findTargetElement(selector)

  if (!el) {
    targetRect.value = null
    isTargetFound.value = false
    setDefaultCenteredPosition()
    return
  }

  const rect = el.getBoundingClientRect()
  targetRect.value = {
    top: Math.round(rect.top),
    left: Math.round(rect.left),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    bottom: Math.round(rect.bottom),
    right: Math.round(rect.right),
  }
  isTargetFound.value = true

  // Compact Popover Dimensions (lessen width to prevent crowding and horizontal overflow)
  const popoverWidth = Math.min(310, window.innerWidth - 24)
  const targetCenterX = Math.round(rect.left + rect.width / 2)

  // Clamp popover horizontally to viewport with 12px margin
  const margin = 12
  let left = Math.round(targetCenterX - popoverWidth / 2)
  left = Math.max(margin, Math.min(window.innerWidth - popoverWidth - margin, left))

  // Arrow position relative to popover card (points directly to target center)
  arrowOffsetLeft.value = Math.max(16, Math.min(popoverWidth - 16, targetCenterX - left))

  // Vertical placement: use the rendered popover height (text wraps taller on narrow screens)
  const popoverEstimatedHeight = popoverEl.value?.offsetHeight || 240
  const verticalGap = 12
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top

  let top: number
  if (spaceBelow >= popoverEstimatedHeight + verticalGap || spaceBelow >= spaceAbove) {
    popoverPlacement.value = 'bottom'
    top = Math.round(rect.bottom + verticalGap)
  } else {
    popoverPlacement.value = 'top'
    top = Math.round(rect.top - popoverEstimatedHeight - verticalGap)
  }

  // Safe viewport clamping: popover is NEVER pushed offscreen
  const maxTop = Math.max(16, window.innerHeight - popoverEstimatedHeight - 16)
  top = Math.max(16, Math.min(maxTop, top))

  popoverStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${popoverWidth}px`,
    transform: 'none',
  }
}

function setDefaultCenteredPosition() {
  const popoverWidth = Math.min(310, window.innerWidth - 24)
  popoverPlacement.value = 'bottom'
  arrowOffsetLeft.value = popoverWidth / 2
  popoverStyle.value = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: `${popoverWidth}px`,
  }
}

function focusAndHighlightTarget() {
  nextTick(() => {
    let attempts = 0
    const tryFind = () => {
      if (!isMissionGuideActive.value) return
      const selector = currentActiveStep.value?.targetSelector
      if (!selector) {
        updateTargetPosition()
        return
      }

      const el = findTargetElement(selector)

      if (el) {
        const r = el.getBoundingClientRect()
        const isVisible = r.top >= 60 && r.bottom <= window.innerHeight - 60 && r.left >= 0 && r.right <= window.innerWidth
        if (!isVisible) {
          // Center the target so the popover has room above or below without covering it
          el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
        }
        updateTargetPosition()
        requestAnimationFrame(updateTargetPosition)
        setTimeout(updateTargetPosition, 80)
        setTimeout(updateTargetPosition, 200)
      } else if (attempts < 80) {
        // Up to ~8s: some targets (e.g. POS Registers card) render only after the page fetches its data
        attempts++
        setTimeout(tryFind, 100)
      } else {
        updateTargetPosition()
      }
    }
    tryFind()
  })
}

// Watchers & Lifecycle
// Steps can live on a different page than their mission (e.g. a branch details page)
watch([isMissionGuideActive, activeMissionIndex, activeStepIndex], () => {
  syncRouteToActiveStep()
})

watch([isMissionGuideActive, activeMissionIndex, activeStepIndex, isCompanionMinimized], () => {
  if (isMissionGuideActive.value && !isCompanionMinimized.value) {
    focusAndHighlightTarget()
  } else {
    targetRect.value = null
    isTargetFound.value = false
  }
})

watch(() => route.path, () => {
  if (isMissionGuideActive.value && !isCompanionMinimized.value) {
    focusAndHighlightTarget()
  }
})

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateTargetPosition)
    window.addEventListener('scroll', updateTargetPosition, true)
  }
  if (isMissionGuideActive.value) {
    focusAndHighlightTarget()
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateTargetPosition)
    window.removeEventListener('scroll', updateTargetPosition, true)
  }
})

const filteredFeatures = computed(() => {
  const list = unref(dashboardFeatures) || []
  if (!featureSearch.value.trim()) return list
  const q = featureSearch.value.toLowerCase()
  return list.filter(f =>
    f.name.toLowerCase().includes(q) ||
    f.summary.toLowerCase().includes(q) ||
    f.details.toLowerCase().includes(q) ||
    f.location.toLowerCase().includes(q)
  )
})

function toggleExpandMission(id: string) {
  expandedMissionId.value = expandedMissionId.value === id ? null : id
}

function toggleExpandFeature(id: string) {
  expandedFeatureId.value = expandedFeatureId.value === id ? null : id
}

function handleGrandFinaleFinish() {
  isGrandFinaleOpen.value = false
  if (isManager.value) {
    router.push('/manager/dashboard')
  } else if (isCashier.value) {
    router.push('/pos')
  } else {
    router.push('/owner/dashboard')
  }
}

function handleReplayTour() {
  resetProgress()
  startFullTour()
}
</script>

<template>
  <Teleport to="body">

    <!-- ================= 1. TRANSITION CELEBRATION TOAST ================= -->
    <Transition
      enter-active-class="transition duration-500 ease-out"
      leave-active-class="transition duration-300 ease-in"
      enter-from-class="opacity-0 -translate-y-8 scale-90"
      leave-to-class="opacity-0 -translate-y-4 scale-95"
    >
      <div
        v-if="missionCelebration && missionCelebration.show"
        class="fixed top-6 inset-x-0 z-[120] flex justify-center pointer-events-none px-4"
      >
        <div class="pointer-events-auto bg-[#3D2B24] text-[#FFF0D1] border-2 border-[#B4846C] shadow-2xl rounded-2xl px-6 py-3.5 flex items-center gap-3.5 max-w-md">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center shrink-0">
            <Icon name="heroicons:sparkles" class="w-6 h-6 animate-pulse" />
          </div>
          <div class="min-w-0">
            <h4 class="font-display text-sm font-bold text-white">
              {{ missionCelebration.title }}
            </h4>
            <p class="text-xs text-[#EDD8CC] truncate">
              {{ missionCelebration.subtitle }}
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ================= 2. SPOTLIGHT CUTOUT & ANCHORED BUTTON POPOVER ================= -->
    <div
      v-if="isMissionGuideActive && isEligible && isOwnerRoute && currentActiveMission && currentActiveStep && !isCompanionMinimized"
      class="fixed inset-0 z-[100] select-none pointer-events-none"
    >
      <!-- Dark Mask with Cutout Box around the active target button -->
      <div
        v-if="isTargetFound && targetRect"
        class="absolute rounded-2xl pointer-events-auto cursor-not-allowed group transition-opacity duration-150"
        :style="{
          top: `${targetRect.top - 5}px`,
          left: `${targetRect.left - 5}px`,
          width: `${targetRect.width + 10}px`,
          height: `${targetRect.height + 10}px`,
          boxShadow: '0 0 0 9999px rgba(38, 21, 13, 0.72)',
        }"
        @click.stop.prevent="handleBlockedClick"
        :title="'Interactive buttons are locked during demo. Finish or exit the tour to click this button.'"
      >
        <!-- Click shield directly over the highlighted target element -->
        <div class="absolute inset-0 bg-transparent cursor-not-allowed z-10" />

        <!-- Warm Espresso Ring without white shine -->
        <div class="w-full h-full rounded-2xl border-2 border-[#7D5A50] ring-2 ring-[#7D5A50]/20 relative">
          <!-- Small Lock Pill Indicator -->
          <div class="absolute -top-2.5 right-2 px-2.5 py-0.5 rounded-full bg-[#3D2B24] text-[#F5EBE1] text-[9px] font-bold shadow-md flex items-center gap-1 opacity-95 pointer-events-none">
            <Icon name="heroicons:lock-closed" class="w-2.5 h-2.5 text-amber-400" />
            <span>Tour Mode</span>
          </div>
        </div>
      </div>

      <!-- General Dimmer Backdrop (if target not found on DOM yet) -->
      <div
        v-else
        class="absolute inset-0 bg-[#1F110B]/70 backdrop-blur-xs pointer-events-auto"
        @click.stop.prevent="handleBlockedClick"
      />

      <!-- Floating Notice Toast when user attempts to click a blocked button -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        leave-active-class="transition duration-150 ease-in"
        enter-from-class="opacity-0 -translate-y-4 scale-95"
        leave-to-class="opacity-0 -translate-y-2 scale-95"
      >
        <div
          v-if="showBlockedNotice"
          class="fixed top-20 inset-x-0 z-[140] flex justify-center pointer-events-none px-4"
        >
          <div class="pointer-events-auto bg-[#3D2B24] text-[#F5EBE1] shadow-2xl rounded-2xl p-4 flex flex-col gap-2.5 max-w-md border border-[#7D5A50]">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Icon name="heroicons:lock-closed" class="w-5 h-5" />
              </div>
              <div class="min-w-0 flex-1">
                <h5 class="text-xs font-bold text-white">
                  Buttons locked during walkthrough demo
                </h5>
                <p class="text-[11px] text-[#D8C7B8] leading-tight mt-0.5">
                  Click <strong class="text-amber-300">"Next Step →"</strong> on the tour balloon to continue, or exit the tour to use all buttons freely.
                </p>
              </div>
              <button
                type="button"
                class="text-white/60 hover:text-white p-1"
                @click="showBlockedNotice = false"
              >
                <Icon name="heroicons:x-mark" class="w-4 h-4" />
              </button>
            </div>
            <div class="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
              <button
                type="button"
                class="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white font-medium text-[11px] transition-all"
                @click="exitMissionGuide(); showBlockedNotice = false"
              >
                Exit Tour
              </button>
              <button
                type="button"
                class="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-95 text-[#3D2B24] font-bold text-[11px] transition-all"
                @click="nextStep(); showBlockedNotice = false"
              >
                Next Step →
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Anchored Popover Balloon -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        leave-active-class="transition duration-150 ease-in"
        enter-from-class="opacity-0 scale-95 translate-y-2"
        leave-to-class="opacity-0 scale-95 translate-y-2"
      >
        <div
          ref="popoverEl"
          class="fixed pointer-events-auto z-[110] font-sans transition-all duration-200"
          :style="popoverStyle"
          @click.stop
        >
          <!-- Pointing Arrow (if target element is found) -->
          <div
            v-if="isTargetFound && popoverPlacement === 'bottom'"
            class="absolute -top-1.5 w-3.5 h-3.5 bg-[#FAF5EE] border-t-2 border-l-2 border-[#7D5A50] rotate-45 transform z-10"
            :style="{ left: `${arrowOffsetLeft - 7}px` }"
          />
          <div
            v-else-if="isTargetFound && popoverPlacement === 'top'"
            class="absolute -bottom-1.5 w-3.5 h-3.5 bg-[#FAF5EE] border-b-2 border-r-2 border-[#7D5A50] rotate-45 transform z-10"
            :style="{ left: `${arrowOffsetLeft - 7}px` }"
          />

          <!-- Popover Card Content: Slim, compact, and non-overlapping -->
          <div class="relative bg-[#FFFDF9] rounded-2xl shadow-[0_16px_40px_-8px_rgba(38,21,13,0.3)] border-2 border-[#7D5A50] overflow-hidden flex flex-col">
            <!-- Popover Header -->
            <div class="px-3.5 py-2.5 bg-[#FAF5EE] border-b border-[#7D5A50]/20 flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="px-2 py-0.5 rounded-full bg-[#7D5A50] text-[#FFF0D1] text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                  Step {{ activeStepIndex + 1 }}/{{ totalStepsInActiveMission }}
                </span>
                <span class="text-[11px] font-bold text-[#7D5A50] truncate">
                  {{ currentActiveMission.title.replace(/^\d+\.\s*/, '') }}
                </span>
              </div>

              <!-- Window Controls: Minimize, Close -->
              <div class="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  class="w-5 h-5 rounded-md flex items-center justify-center text-[#8B6656] hover:bg-[#3D2B24]/[0.06] hover:text-[#3D2B24] active:scale-95 transition-all"
                  @click="isCompanionMinimized = true"
                  title="Minimize"
                >
                  <Icon name="heroicons:minus" class="w-3 h-3" />
                </button>
                <button
                  type="button"
                  class="w-5 h-5 rounded-md flex items-center justify-center text-[#8B6656] hover:bg-[#3D2B24]/[0.06] hover:text-[#3D2B24] active:scale-95 transition-all"
                  @click="exitMissionGuide"
                  title="Exit walkthrough"
                >
                  <Icon name="heroicons:x-mark" class="w-3 h-3" />
                </button>
              </div>
            </div>

            <!-- Popover Body: Button Name & Explanation -->
            <div class="p-3.5 space-y-2.5">
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded-lg bg-[#7D5A50] text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">
                  {{ activeStepIndex + 1 }}
                </div>
                <h3 class="font-display text-xs font-bold text-[#3D2B24] leading-tight truncate">
                  {{ currentActiveStep.title }}
                </h3>
              </div>

              <!-- Compact Instruction Explanation -->
              <div class="bg-[#F8F4EE] rounded-xl p-3">
                <p class="text-xs text-[#3D2B24] leading-relaxed font-medium">
                  {{ currentActiveStep.instruction }}
                </p>
              </div>

              <!-- Compact Pro Tip -->
              <div class="p-2.5 rounded-lg bg-[#FFF6E5] text-[11px] text-amber-900 flex items-start gap-1.5">
                <Icon name="heroicons:light-bulb" class="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span class="leading-tight">
                  <strong class="font-bold text-[#3D2B24]">Tip:</strong> {{ currentActiveStep.proTip }}
                </span>
              </div>
            </div>

            <!-- Popover Footer: Back, Step Indicators, Next Step -->
            <div class="px-3.5 py-2.5 bg-[#FAF5EE] border-t border-[#3D2B24]/[0.06] flex items-center justify-between gap-2">
              <!-- Back button -->
              <button
                v-if="!(isFirstMission && isFirstStepOfMission)"
                type="button"
                class="px-2.5 py-1 rounded-lg bg-[#3D2B24]/[0.06] hover:bg-[#3D2B24]/[0.12] active:scale-95 text-[11px] font-bold text-[#7D5A50] transition-all"
                @click="prevStep"
              >
                ← Back
              </button>
              <div v-else />

              <!-- Step dots -->
              <div class="flex items-center gap-1">
                <button
                  v-for="(st, idx) in currentActiveMission.detailedSteps"
                  :key="idx"
                  type="button"
                  class="h-1.5 rounded-full transition-all"
                  :class="idx === activeStepIndex ? 'bg-[#7D5A50] w-3.5' : idx < activeStepIndex ? 'bg-emerald-500 w-1.5' : 'bg-[#EADAC5] w-1.5'"
                  @click="goToStep(idx)"
                  :title="`Go to Step ${idx + 1}`"
                />
              </div>

              <!-- Next Step Button (advances to next button or next mission!) -->
              <button
                v-if="!isLastStepOfMission"
                type="button"
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7D5A50] hover:bg-[#684940] active:scale-95 text-white font-bold text-[11px] shadow-sm transition-all"
                :class="showBlockedNotice ? 'ring-2 ring-amber-400 ring-offset-1 animate-pulse' : ''"
                @click="nextStep"
              >
                <span>Next Step →</span>
              </button>
              <button
                v-else-if="!isLastMission"
                type="button"
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7D5A50] hover:bg-[#684940] active:scale-95 text-white font-bold text-[11px] shadow-sm transition-all"
                :class="showBlockedNotice ? 'ring-2 ring-amber-400 ring-offset-1 animate-pulse' : ''"
                @click="nextStep"
              >
                <span>Next Mission</span>
              </button>
              <button
                v-else
                type="button"
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] shadow-sm transition-all"
                :class="showBlockedNotice ? 'ring-2 ring-emerald-400 ring-offset-1 animate-pulse' : ''"
                @click="nextStep"
              >
                <span>Finish Setup</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ================= 3. MINIMIZED FLOATING PILL ================= -->
    <div
      v-if="isMissionGuideActive && isEligible && isCompanionMinimized && currentActiveStep"
      class="fixed bottom-6 right-6 z-[100]"
    >
      <button
        type="button"
        class="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#3D2B24] hover:bg-[#2A1D18] active:scale-95 text-[#F5EBE1] shadow-2xl text-xs font-bold transition-all group"
        @click="isCompanionMinimized = false"
        title="Resume button walkthrough"
      >
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        <Icon name="heroicons:academic-cap" class="w-4 h-4 text-[#F5EBE1]" />
        <span>{{ currentActiveStep.title }} (Step {{ activeStepIndex + 1 }}/{{ totalStepsInActiveMission }})</span>
        <Icon name="heroicons:chevron-up" class="w-4 h-4 text-[#F5EBE1]/80 group-hover:translate-y-[-2px] transition-transform" />
      </button>
    </div>

    <!-- ================= 4. GRAND FINALE CELEBRATION MODAL ================= -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      leave-active-class="transition duration-200 ease-in"
      enter-from-class="opacity-0 scale-95"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isGrandFinaleOpen && isEligible && isOwnerRoute"
        class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#1F110B]/70 backdrop-blur-sm"
      >
        <div class="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-center space-y-5 font-sans">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
            <Icon name="heroicons:trophy" class="w-8 h-8" />
          </div>

          <div class="space-y-1.5">
            <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-[#3D2B24]">
              All {{ totalMissions }} Setup Tasks Completed!
            </h2>
            <p class="text-sm text-[#7D5A50] max-w-md mx-auto">
              {{ isManager
                ? 'Your manager walkthrough is complete! Your branch operations, floor plan, servings limits, and reservations are ready to manage.'
                : 'Your setup is complete! Your catalog, operational controls, and register terminals are fully operational.' }}
            </p>
          </div>

          <div class="bg-[#F8F4EE] rounded-2xl p-4 text-left grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div v-for="m in missions" :key="m.id" class="flex items-center gap-2 text-emerald-800 font-semibold">
              <Icon name="heroicons:check-badge" class="w-4 h-4 text-emerald-600 shrink-0" />
              <span class="truncate">{{ m.title.replace(/^\d+\.\s*/, '') }}</span>
            </div>
          </div>

          <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              class="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#7D5A50] hover:bg-[#684940] active:scale-95 text-white font-bold text-sm shadow-md transition-all"
              @click="handleGrandFinaleFinish"
            >
              <span v-if="isManager">Go to Manager Dashboard</span>
              <span v-else>Go to Owner Dashboard</span>
            </button>
            <button
              type="button"
              class="w-full sm:w-auto px-4 py-3 rounded-xl bg-[#3D2B24]/[0.06] hover:bg-[#3D2B24]/[0.12] active:scale-95 text-xs font-bold text-[#7D5A50] transition-all"
              @click="isGrandFinaleOpen = false; openGuide('missions')"
            >
              Revisit Mission Hub
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ================= 5. FULL HUB MODAL (6 MISSIONS & DASHBOARD BUTTONS) ================= -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      leave-active-class="transition duration-150 ease-in"
      enter-from-class="opacity-0 scale-95"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isGuideModalOpen && !isMissionGuideActive && isEligible && isOwnerRoute"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#1F110B]/70 backdrop-blur-sm"
        @click.self="dismissGuide"
      >
        <div
          class="relative w-full max-w-3xl max-h-[90vh] bg-[#FAF7F2] border-2 border-[#7D5A50] rounded-3xl shadow-[0_24px_64px_-12px_rgba(38,21,13,0.35)] overflow-hidden flex flex-col font-sans"
        >
          <!-- 1. Header with #7D5A50 (rgb 125, 90, 80) -->
          <div class="px-6 pt-6 pb-4 bg-[#7D5A50] text-[#FFF0D1] shrink-0 relative">
            <div class="absolute top-5 right-5 flex items-center gap-2">
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 text-xs text-[#FFF0D1] font-semibold flex items-center gap-1 transition-all"
                @click="resetProgress"
                title="Reset mission progress"
              >
                <Icon name="heroicons:arrow-path" class="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                class="w-8 h-8 rounded-full flex items-center justify-center text-[#FFF0D1]/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                @click="dismissGuide"
                title="Close guide"
              >
                <Icon name="heroicons:x-mark" class="w-5 h-5" />
              </button>
            </div>

            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/15 text-[#FFF0D1] flex items-center justify-center shrink-0">
                <Icon name="heroicons:academic-cap" class="w-5 h-5 text-[#FFF0D1]" />
              </div>
              <div class="min-w-0 flex-1 pr-8">
                <div class="flex items-center gap-2">
                  <h2 class="font-display text-lg sm:text-xl font-bold tracking-tight text-[#FFF0D1]">
                    BrewSpot Onboarding & Dashboard Guide
                  </h2>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-[#FFF0D1] uppercase tracking-wider">
                    {{ role }}
                  </span>
                </div>
                <p class="text-xs text-[#FFF0D1]/80 mt-0.5">
                  {{ isManager ? 'Master daily branch operations, dining floor plan, servings limits, and reservations.' : 'Learn every button with step-by-step on-screen popover walkthroughs.' }}
                </p>
              </div>
            </div>

            <!-- Tab Switcher (6 Missions vs Dashboard Buttons) -->
            <div class="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-[#FFF0D1]/20">
              <div class="flex items-center gap-1 p-1 rounded-xl bg-black/20">
                <button
                  type="button"
                  class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
                  :class="activeTab === 'missions' ? 'bg-[#FFF0D1] text-[#7D5A50] shadow-sm' : 'text-[#FFF0D1]/80 hover:text-white'"
                  @click="activeTab = 'missions'"
                >
                  <Icon name="heroicons:check-circle" class="w-4 h-4" />
                  <span>Setup Missions ({{ completedMissionsCount }}/{{ totalMissions }})</span>
                </button>

                <button
                  type="button"
                  class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
                  :class="activeTab === 'features' ? 'bg-[#FFF0D1] text-[#7D5A50] shadow-sm' : 'text-[#FFF0D1]/80 hover:text-white'"
                  @click="activeTab = 'features'"
                >
                  <Icon name="heroicons:squares-2x2" class="w-4 h-4" />
                  <span>Dashboard Buttons & Features ({{ dashboardFeatures.length }})</span>
                </button>
              </div>

              <!-- Skip text button -->
              <button
                type="button"
                class="text-xs font-medium text-[#FFF0D1]/70 hover:text-white active:scale-95 transition-all hidden sm:block"
                @click="dismissGuide"
              >
                Skip Tour
              </button>
            </div>
          </div>

          <!-- ================= TAB 1: 6 SETUP MISSIONS ================= -->
          <div v-if="activeTab === 'missions'" class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <!-- Hero Card: Start Continuous Guided Walkthrough -->
            <div class="bg-[#F2ECE4] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded-full bg-[#7D5A50]/10 text-[#7D5A50] text-[10px] font-bold uppercase tracking-wider">
                    Interactive Button Tour
                  </span>
                  <span class="text-xs text-[#7D5A50]">Highlights every button on screen</span>
                </div>
                <h3 class="font-display text-base sm:text-lg font-bold text-[#3D2B24]">
                  {{ isManager ? 'Start Manager Operations Walkthrough' : 'Start Button-by-Button System Walkthrough' }}
                </h3>
                <p class="text-xs text-[#6B5349] max-w-lg leading-relaxed">
                  {{ isManager 
                    ? 'BrewSpot guides you through branch daily operations—from sales monitoring and operating hours to dining floor plans, table reservations, and daily servings limits.' 
                    : 'BrewSpot highlights each button on your screen with an anchored explanation, guiding you step-by-step from category setup to your first live sale.' }}
                </p>
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7D5A50] hover:bg-[#684940] active:scale-95 text-white font-bold text-xs shadow-sm transition-all shrink-0"
                @click="isAllMissionsCompleted ? handleReplayTour() : startFullTour()"
              >
                <Icon name="heroicons:play" class="w-4 h-4 text-white" />
                <span>{{ isAllMissionsCompleted ? 'Replay Full Tour' : completedMissionsCount > 0 ? 'Resume Button Tour' : 'Start Button Tour' }}</span>
              </button>
            </div>

            <!-- Progress Overview Bar -->
            <div class="bg-white rounded-2xl p-4 shadow-xs">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold uppercase tracking-wider text-[#7D5A50]">
                  Overall Mission Progress
                </span>
                <span class="text-xs font-bold text-[#3D2B24] tabular-nums">
                  {{ completedMissionsCount }} of {{ totalMissions }} Completed ({{ missionsProgressPercent }}%)
                </span>
              </div>
              <div class="h-2 w-full bg-[#EADAC5]/50 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500 ease-out"
                  :class="isAllMissionsCompleted ? 'bg-emerald-600' : 'bg-[#7D5A50]'"
                  :style="{ width: `${missionsProgressPercent}%` }"
                />
              </div>
            </div>

            <!-- List of the 6 Missions -->
            <div class="space-y-3">
              <div
                v-for="mission in missions"
                :key="mission.id"
                class="rounded-2xl transition-all duration-200"
                :class="[
                  completedMissionIds.includes(mission.id)
                    ? 'bg-[#FBF8F4] border border-[#7D5A50]/20 shadow-xs opacity-90'
                    : 'bg-white border border-[#7D5A50]/25 shadow-[0_1px_3px_rgba(61,43,36,0.05)] hover:border-[#7D5A50] hover:shadow-[0_8px_24px_rgba(61,43,36,0.07)]'
                ]"
              >
                <div class="p-4 sm:p-5 flex items-start gap-3.5">
                  <!-- Checkbox -->
                  <button
                    type="button"
                    class="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all active:scale-90 shrink-0"
                    :class="[
                      completedMissionIds.includes(mission.id)
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-[#3D2B24]/[0.07] hover:bg-[#3D2B24]/[0.14] text-transparent'
                    ]"
                    @click="toggleMission(mission.id)"
                    :title="completedMissionIds.includes(mission.id) ? 'Mark as incomplete' : 'Mark as done'"
                  >
                    <Icon name="heroicons:check" class="w-4 h-4" />
                  </button>

                  <!-- Mission Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        :class="[
                          mission.priority === 'Essential'
                            ? 'bg-amber-500/10 text-amber-800'
                            : 'bg-[#7D5A50]/10 text-[#7D5A50]'
                        ]"
                      >
                        {{ mission.badge }}
                      </span>
                      <span
                        v-if="completedMissionIds.includes(mission.id)"
                        class="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 ml-auto"
                      >
                        <Icon name="heroicons:check-badge" class="w-3.5 h-3.5" />
                        Completed
                      </span>
                    </div>

                    <h4
                      class="font-display text-base font-bold text-[#3D2B24]"
                      :class="{ 'line-through text-[#9E7060]': completedMissionIds.includes(mission.id) }"
                    >
                      {{ mission.title }}
                    </h4>
                    <p class="text-xs text-[#7D5A50] mt-0.5">
                      {{ mission.subtitle }}
                    </p>

                    <!-- Expandable Step Details & Pro Tip -->
                    <div v-if="expandedMissionId === mission.id" class="mt-3.5 pt-3 border-t border-[#3D2B24]/[0.06] space-y-3">
                      <p class="text-xs text-[#4A3830] leading-relaxed">
                        {{ mission.description }}
                      </p>

                      <div class="bg-[#F8F4EE] rounded-xl p-3.5 space-y-1.5">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-[#7D5A50]">
                          Buttons taught in this mission (Click any to highlight directly):
                        </p>
                        <ul class="space-y-1.5">
                          <li
                            v-for="(s, idx) in mission.detailedSteps"
                            :key="idx"
                            class="flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer group active:scale-[0.99]"
                            @click="startMission(mission, idx)"
                          >
                            <div class="flex items-start gap-2 text-xs text-[#3D2B24]">
                              <span class="w-5 h-5 rounded-md bg-[#7D5A50] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {{ idx + 1 }}
                              </span>
                              <div>
                                <strong class="font-bold block">{{ s.title }}</strong>
                                <span class="text-[11px] text-[#7D5A50]">{{ s.targetHint }}</span>
                              </div>
                            </div>
                            <span class="text-[10px] font-bold text-[#7D5A50] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-0.5">
                              Highlight button <Icon name="heroicons:play" class="w-3 h-3" />
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div class="p-3 rounded-xl bg-[#FFF6E5] text-xs text-amber-900 flex items-start gap-2">
                        <Icon name="heroicons:light-bulb" class="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <span><strong>Pro Tip:</strong> {{ mission.proTip }}</span>
                      </div>
                    </div>

                    <!-- Mission Actions -->
                    <div class="mt-3.5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        class="text-xs font-semibold text-[#7D5A50] hover:text-[#3D2B24] active:scale-95 flex items-center gap-1 transition-all"
                        @click="toggleExpandMission(mission.id)"
                      >
                        <span>{{ expandedMissionId === mission.id ? 'Hide buttons' : 'View buttons in this mission' }}</span>
                        <Icon
                          name="heroicons:chevron-down"
                          class="w-3.5 h-3.5 transition-transform"
                          :class="{ 'rotate-180': expandedMissionId === mission.id }"
                        />
                      </button>

                      <!-- Start Mission & Launch Button-by-Button Popover Tour -->
                      <button
                        type="button"
                        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7D5A50] hover:bg-[#684940] active:scale-95 text-white text-xs font-bold shadow-xs transition-all"
                        @click="startMission(mission, 0)"
                      >
                        <span>Start Button Tour</span>
                        <Icon name="heroicons:arrow-right" class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= TAB 2: DETAILED DASHBOARD BUTTONS & FEATURES ================= -->
          <div v-else class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <!-- Search & Filter bar -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div class="relative flex-1">
                <Icon name="heroicons:magnifying-glass" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B6656]/60" />
                <input
                  v-model="featureSearch"
                  type="text"
                  placeholder="Search any dashboard button, chart, or feature..."
                  class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white shadow-xs text-xs font-medium text-[#3D2B24] placeholder-[#8B6656]/60 focus:outline-none focus:ring-2 focus:ring-[#7D5A50]/40"
                />
              </div>
              <span class="text-xs font-medium text-[#7D5A50] shrink-0">
                Showing {{ filteredFeatures.length }} features
              </span>
            </div>

            <!-- Feature Cards List -->
            <div class="space-y-3">
              <div
                v-for="feature in filteredFeatures"
                :key="feature.id"
                class="bg-white border border-[#7D5A50]/25 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(61,43,36,0.05)] hover:border-[#7D5A50] hover:shadow-[0_8px_24px_rgba(61,43,36,0.07)] transition-all duration-200"
              >
                <div class="flex items-start gap-3.5">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="feature.color">
                    <Icon :name="feature.icon" class="w-5 h-5" />
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <span class="font-display text-sm sm:text-base font-bold text-[#3D2B24]">
                        {{ feature.name }}
                      </span>
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F8F4EE] text-[#7D5A50] inline-flex items-center gap-1">
                        <Icon name="heroicons:map-pin" class="w-3 h-3" />
                        {{ feature.location }}
                      </span>
                    </div>

                    <p class="text-xs text-[#4A3830] leading-relaxed">
                      {{ feature.summary }}
                    </p>

                    <!-- Expanded Detailed Explanation -->
                    <div v-if="expandedFeatureId === feature.id" class="mt-3 pt-3 border-t border-[#3D2B24]/[0.06] space-y-2.5">
                      <div>
                        <p class="text-[10px] font-bold uppercase tracking-wider text-[#7D5A50] mb-0.5">
                          How it functions & what it calculates:
                        </p>
                        <p class="text-xs text-[#5C453C] leading-relaxed">
                          {{ feature.details }}
                        </p>
                      </div>

                      <div class="p-3 rounded-xl bg-[#FFF6E5] text-xs text-amber-900 flex items-start gap-2">
                        <Icon name="heroicons:light-bulb" class="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <span><strong>How to use it:</strong> {{ feature.tips }}</span>
                      </div>
                    </div>

                    <!-- Toggle Details Button -->
                    <div class="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        class="text-xs font-semibold text-[#7D5A50] hover:text-[#3D2B24] active:scale-95 flex items-center gap-1 transition-all"
                        @click="toggleExpandFeature(feature.id)"
                      >
                        <span>{{ expandedFeatureId === feature.id ? 'Show less' : 'Read in-depth explanation' }}</span>
                        <Icon
                          name="heroicons:chevron-down"
                          class="w-3.5 h-3.5 transition-transform"
                          :class="{ 'rotate-180': expandedFeatureId === feature.id }"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="px-6 py-4 bg-[#FAF5EE] border-t border-[#3D2B24]/[0.06] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B6656] hover:text-[#3D2B24] active:scale-95 transition-all"
              @click="resetProgress"
            >
              <Icon name="heroicons:arrow-path" class="w-3.5 h-3.5" />
              <span>Reset {{ totalMissions }} Missions</span>
            </button>

            <button
              type="button"
              class="px-5 py-2.5 rounded-xl bg-[#3D2B24] hover:bg-[#2A1D18] active:scale-95 text-white font-bold text-xs transition-all shadow-xs"
              @click="dismissGuide"
            >
              Close Guide
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
