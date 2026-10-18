<!-- app/components/manager/ManagerEmployeesCard.vue -->
<script setup lang="ts">
import type { ManagerDashboardStats } from '~/services/ManagerDashboardService'

defineProps<{
  employees: ManagerDashboardStats['employees'] | null
  loading: boolean
}>()

function roleBadgeClass(role: string) {
  switch (role.toLowerCase()) {
    case 'manager':
      return 'bg-[#7D5A50] text-[#FFF0D1]'
    case 'cashier':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    default:
      return 'bg-amber-100 text-amber-800 border border-amber-200'
  }
}

function getInitials(name: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
</script>

<template>
  <section class="flex flex-col gap-4 rounded-[22px] border border-[#EEDFC4] bg-white p-6 shadow-[0_1px_2px_rgba(59,31,14,0.04)]" aria-labelledby="employees-heading">
    <!-- Header -->
    <header class="flex items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h2 id="employees-heading" class="font-display text-[18px] font-bold text-[#3D2B24]">
            Branch Team & Shifts
          </h2>
          <span v-if="employees?.summary?.working_today" class="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[11px] font-bold text-emerald-800 tabular-nums">
            {{ employees.summary.working_today }} on duty today
          </span>
        </div>
        <p class="mt-0.5 text-[13px] text-[#8B6656]">
          Roster coverage, register PIN status, and scheduled shifts
        </p>
      </div>

      <div v-if="employees?.summary" class="hidden sm:flex items-center gap-2 text-xs text-[#8B6656]">
        <span class="inline-flex items-center gap-1">
          <span class="h-2 w-2 rounded-full bg-emerald-500" />
          {{ employees.summary.active }} Active
        </span>
        <span>&middot;</span>
        <span>{{ employees.summary.cashiers }} Cashiers</span>
      </div>
    </header>

    <!-- Employees List -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="flex items-center justify-between border-b border-[#F6ECDD] pb-3">
        <div class="flex items-center gap-3 flex-1">
          <div class="skeleton h-9 w-9 rounded-full shrink-0" />
          <div class="space-y-1.5 flex-1">
            <div class="skeleton h-4 w-1/3 rounded" />
            <div class="skeleton h-3 w-1/4 rounded" />
          </div>
        </div>
        <div class="skeleton h-6 w-24 rounded-full" />
      </div>
    </div>

    <div v-else-if="employees?.list?.length" class="divide-y divide-[#F6ECDD]">
      <div
        v-for="(emp, idx) in employees.list"
        :key="emp.uuid"
        class="animate-row-enter py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-[#FDF8F3]/60 rounded-xl px-2 -mx-2"
        :style="{ '--row-delay': `${idx * 60}ms` }"
      >
        <!-- Identity -->
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="h-9 w-9 rounded-full bg-[#3B1F0E] text-[#FFF0D1] flex items-center justify-center font-display font-bold text-xs shrink-0">
            {{ getInitials(emp.name) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="font-display text-[14px] font-bold text-[#3D2B24] truncate">
                {{ emp.name }}
              </p>
              <span
                :class="['px-2 py-0.2 rounded text-[11px] font-semibold tracking-wide uppercase', roleBadgeClass(emp.role)]"
              >
                {{ emp.role }}
              </span>
              <span
                v-if="emp.is_active"
                class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                title="Active"
              />
            </div>
            <p class="text-xs text-[#8B6656] truncate mt-0.5">
              {{ emp.email }}
            </p>
          </div>
        </div>

        <!-- Today Shift & PIN status -->
        <div class="flex items-center gap-3 sm:justify-end shrink-0 pl-12 sm:pl-0">
          <!-- Today's shift badge -->
          <div
            class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs"
            :class="emp.today_shift === 'Day Off' ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-[#FFF8EA] border-[#EADFD3] text-[#7D5A50] font-medium'"
          >
            <Icon name="heroicons:clock" class="h-3.5 w-3.5 shrink-0" />
            <span>{{ emp.today_shift }}</span>
          </div>

          <!-- PIN badge -->
          <div class="shrink-0">
            <span
              v-if="emp.is_locked"
              class="inline-flex items-center gap-1 rounded bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-[11px] font-semibold"
            >
              <Icon name="heroicons:lock-closed" class="h-3 w-3" />
              Locked
            </span>
            <span
              v-else-if="emp.has_pin"
              class="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold"
              title="Register PIN set"
            >
              <Icon name="heroicons:check" class="h-3 w-3" />
              PIN Set
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold"
              title="No register PIN assigned"
            >
              <Icon name="heroicons:exclamation-triangle" class="h-3 w-3" />
              No PIN
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="animate-row-enter rounded-2xl bg-[#FDF8F3] px-5 py-8 text-center">
      <Icon name="heroicons:user-group" class="mx-auto h-7 w-7 text-[#C2A592]" />
      <p class="mt-2 font-display font-semibold text-[#3B1F0E]">No staff members assigned</p>
      <p class="mt-1 text-[13px] text-[#8B6656]">Employees assigned to this branch will be shown here.</p>
    </div>
  </section>
</template>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, #F6ECDD, #FBF4EA, #F6ECDD);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes rowEnter {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-row-enter {
  animation: rowEnter 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--row-delay, 0ms);
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton, .animate-row-enter {
    animation: none !important;
    transform: none !important;
  }
}
</style>
