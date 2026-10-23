<!-- app/components/manager/ManagerReservationsCard.vue -->
<script setup lang="ts">
import type { ManagerDashboardStats, ManagerReservationItem } from '~/services/ManagerDashboardService'
import { formatCount } from '~/utils/dashboardFormat'

defineProps<{
  reservations: ManagerDashboardStats['reservations'] | null
  loading: boolean
}>()

function formatReservationTime(startIso: string, endIso: string) {
  if (!startIso) return ''
  const start = new Date(startIso)
  const isToday = new Date().toDateString() === start.toDateString()
  const datePrefix = isToday ? 'Today' : start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const endTime = endIso ? new Date(endIso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
  return `${datePrefix}, ${startTime}${endTime ? ` – ${endTime}` : ''}`
}

function formatBookedAt(iso: string | null) {
  if (!iso) return ''
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Booked just now'
  if (mins < 60) return `Booked ${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `Booked ${hours}h ago`
  return `Booked ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function statusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'seated':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'completed':
      return 'bg-teal-50 text-teal-700 border-teal-200'
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'cancelled':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}
</script>

<template>
  <section class="flex flex-col gap-4 rounded-[22px] border border-[#EEDFC4] bg-white p-5 shadow-[0_1px_2px_rgba(59,31,14,0.04)] sm:p-6" aria-labelledby="reservations-heading">
    <!-- Header -->
    <header class="flex items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h2 id="reservations-heading" class="font-display text-[18px] font-bold text-[#3B1F0E]">
            Table Reservations
          </h2>
          <span v-if="reservations?.summary?.today_count" class="rounded-full bg-[#3B1F0E] px-2 py-0.5 text-[11px] font-bold text-[#FFF0D1] tabular-nums">
            {{ reservations.summary.today_count }} today
          </span>
        </div>
        <p class="mt-0.5 text-[13px] text-[#8B6656]">
          Latest bookings for today onward, newest first
        </p>
      </div>

      <NuxtLink
        to="/manager/floor-plan"
        class="inline-flex shrink-0 items-center gap-1 rounded font-display text-[13px] font-semibold text-[#7D5A50] underline decoration-[#7D5A50]/30 underline-offset-4 hover:decoration-[#7D5A50] active:scale-[0.97] transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
      >
        Floor Plan
        <Icon name="heroicons:arrow-up-right-20-solid" class="h-3.5 w-3.5" />
      </NuxtLink>
    </header>

    <!-- Status pill counters -->
    <div v-if="!loading && reservations?.summary" class="flex flex-wrap gap-2 text-xs">
      <div class="flex items-center gap-1.5 rounded-lg border border-[#F0DFD5] bg-[#FDF8F5] px-2.5 py-1 text-[#6E4F42]">
        <span class="h-2 w-2 rounded-full bg-emerald-500" />
        <span>Confirmed: <strong class="text-[#3B1F0E]">{{ reservations.summary.confirmed_count }}</strong></span>
      </div>
      <div class="flex items-center gap-1.5 rounded-lg border border-[#F0DFD5] bg-[#FDF8F5] px-2.5 py-1 text-[#6E4F42]">
        <span class="h-2 w-2 rounded-full bg-amber-500" />
        <span>Pending: <strong class="text-[#3B1F0E]">{{ reservations.summary.pending_count }}</strong></span>
      </div>
      <div class="flex items-center gap-1.5 rounded-lg border border-[#F0DFD5] bg-[#FDF8F5] px-2.5 py-1 text-[#6E4F42]">
        <span class="h-2 w-2 rounded-full bg-blue-500" />
        <span>Seated: <strong class="text-[#3B1F0E]">{{ reservations.summary.seated_count }}</strong></span>
      </div>
      <div class="flex items-center gap-1.5 rounded-lg border border-[#F0DFD5] bg-[#FDF8F5] px-2.5 py-1 text-[#6E4F42]">
        <span class="h-2 w-2 rounded-full bg-teal-500" />
        <span>Completed: <strong class="text-[#3B1F0E]">{{ reservations.summary.completed_count }}</strong></span>
      </div>
    </div>

    <!-- Reservations List -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="flex items-center justify-between border-b border-[#F6ECDD] pb-3">
        <div class="space-y-1.5 flex-1">
          <div class="skeleton h-4 w-1/3 rounded" />
          <div class="skeleton h-3 w-1/4 rounded" />
        </div>
        <div class="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>

    <div v-else-if="reservations?.upcoming?.length" class="divide-y divide-[#F6ECDD]">
      <div
        v-for="(res, idx) in reservations.upcoming"
        :key="res.uuid"
        class="animate-row-enter flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
        :style="{ '--row-delay': `${idx * 60}ms` }"
      >
        <!-- Guest Details -->
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span class="min-w-0 max-w-full truncate font-display text-[14px] font-bold text-[#3B1F0E]">
              {{ res.customer_name }}
            </span>
            <span class="inline-flex shrink-0 items-center gap-1 rounded bg-[#F6ECDD] px-1.5 py-0.5 text-[11px] font-semibold text-[#7D5A50]">
              <Icon name="heroicons:users" class="h-3 w-3" aria-hidden="true" />
              {{ res.party_size }} {{ res.party_size === 1 ? 'guest' : 'guests' }}
            </span>
            <span v-if="res.table_name" class="shrink-0 text-xs font-medium text-[#8B6656]">
              {{ res.table_name }}
            </span>
          </div>

          <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8B6656]">
            <span class="inline-flex items-center gap-1 font-medium text-[#5B3E32]">
              <Icon name="heroicons:clock" class="h-3.5 w-3.5 text-[#A88879]" />
              {{ formatReservationTime(res.reservation_date, res.reservation_end) }}
            </span>
            <span v-if="res.customer_phone" class="inline-flex items-center gap-1">
              <Icon name="heroicons:phone" class="h-3 w-3 text-[#A88879]" />
              {{ res.customer_phone }}
            </span>
            <span v-if="res.notes" class="max-w-[240px] truncate italic text-[#8B6656]" :title="res.notes">
              "{{ res.notes }}"
            </span>
          </div>
        </div>

        <!-- Booked time + Status Badge -->
        <div class="flex shrink-0 items-center gap-2.5 self-start sm:self-center">
          <span v-if="res.created_at" class="text-[11px] text-[#8B6656] tabular-nums" :title="new Date(res.created_at).toLocaleString('en-US')">
            {{ formatBookedAt(res.created_at) }}
          </span>
          <span
            :class="['px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border', statusBadgeClass(res.status)]"
          >
            {{ res.status }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="animate-row-enter rounded-2xl bg-[#FDF8F3] px-5 py-8 text-center">
      <Icon name="heroicons:calendar" class="mx-auto h-7 w-7 text-[#C2A592]" />
      <p class="mt-2 font-display font-semibold text-[#3B1F0E]">No reservations scheduled</p>
      <p class="mt-1 text-[13px] text-[#8B6656]">New customer bookings for this branch will appear here.</p>
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
