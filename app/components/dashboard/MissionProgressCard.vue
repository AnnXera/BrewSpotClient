<!-- app/components/dashboard/MissionProgressCard.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useFirstTimeWalkthrough, type SetupMission } from '~/composables/useFirstTimeWalkthrough'

const {
  isEligible,
  isManager,
  missions,
  completedMissionIds,
  totalMissions,
  completedMissionsCount,
  missionsProgressPercent,
  isAllMissionsCompleted,
  openGuide,
  startMission,
} = useFirstTimeWalkthrough()

const nextIncompleteMission = computed<SetupMission | null>(() => {
  return missions.value.find(m => !completedMissionIds.value.includes(m.id)) || missions.value[0] || null
})
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
    leave-active-class="transition-all duration-200 ease-in"
    enter-from-class="opacity-0 -translate-y-2 scale-[0.99]"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 -translate-y-2 scale-[0.98]"
  >
    <section
      v-if="isEligible && totalMissions > 0 && !isAllMissionsCompleted"
      aria-label="Setup missions progress"
      class="rounded-[18px] bg-[#FFFDF9] border border-[#EDD8CC] shadow-[0_2px_10px_-3px_rgba(58,41,35,0.06)] overflow-hidden font-sans"
    >
      <div class="px-5 py-4 space-y-3">
        <!-- Top Row: Title, Tabular Progress, and Crisp Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="flex size-9 items-center justify-center rounded-[12px] bg-[#F6EBDD] text-[#7D5A50] shrink-0">
              <Icon name="heroicons:academic-cap" class="size-[18px]" />
            </span>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-display text-[15px] font-bold text-[#3D2B24] tracking-[-0.01em]">
                  {{ isManager ? 'Branch Setup & Operations Guide' : 'Cafe Setup Missions' }}
                </h2>
                <span class="inline-flex items-center gap-1 rounded-full bg-[#F6EBDD] px-2 py-0.5 text-[11px] font-semibold text-[#7D5A50] tabular-nums">
                  {{ completedMissionsCount }}/{{ totalMissions }} Completed · {{ missionsProgressPercent }}%
                </span>
              </div>

              <p v-if="nextIncompleteMission" class="text-[12px] text-[#6B5A52] truncate mt-0.5">
                Up next: <strong class="font-semibold text-[#3D2B24]">{{ nextIncompleteMission.title }}</strong> — {{ nextIncompleteMission.subtitle }}
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              class="rounded-[10px] px-3.5 py-2 text-[12px] font-semibold border border-[#EDD8CC] bg-white text-[#3D2B24] hover:bg-[#F6EBDD] active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer"
              @click="openGuide('missions')"
            >
              Mission Hub
            </button>

            <button
              v-if="nextIncompleteMission"
              type="button"
              class="rounded-[10px] px-3.5 py-2 text-[12px] font-semibold bg-[#3A2923] text-white hover:bg-[#2C1E19] active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer inline-flex items-center gap-1.5"
              @click="startMission(nextIncompleteMission, 0)"
            >
              <span>{{ completedMissionsCount > 0 ? 'Continue Mission' : 'Start Mission 1' }}</span>
              <Icon name="heroicons:arrow-right-16-solid" class="size-3.5" />
            </button>
          </div>
        </div>

        <!-- Single Continuous Smooth Progress Bar Only -->
        <div class="h-2 w-full rounded-full bg-[#F2E8DC] overflow-hidden">
          <div
            class="h-full rounded-full bg-[#7D5A50] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            :style="{ width: `${Math.max(missionsProgressPercent, completedMissionsCount > 0 ? 6 : 2)}%` }"
          />
        </div>
      </div>
    </section>
  </Transition>
</template>
