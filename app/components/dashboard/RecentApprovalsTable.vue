<script setup lang="ts">
import type { ApprovalListItem } from '~/services/OwnerManagementService'

// Newest applications waiting for an admin decision; each row opens it on the Approvals page.
const props = defineProps<{
  approvals: ApprovalListItem[]
  loading?: boolean
}>()

function applicantName(item: ApprovalListItem) {
  return item.user ? `${item.user.firstname} ${item.user.lastname}`.trim() : 'Cafe owner'
}

function placeName(item: ApprovalListItem) {
  const cafe = item.cafe?.cafe_name
  const branch = item.branch?.branch_name
  if (cafe && branch && branch !== cafe) return `${cafe} · ${branch}`
  return cafe || branch || 'Cafe'
}

function formatDate(val?: string | null): string {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <section class="flex flex-col gap-4 rounded-[22px] border border-[#EEDFC4] bg-white p-5 sm:p-7 shadow-[0_1px_2px_rgba(59,31,14,0.04)]" aria-labelledby="pending-approvals-heading">
    <header class="flex items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h2 id="pending-approvals-heading" class="font-display text-[18px] font-bold text-[#3B1F0E]">Waiting for review</h2>
          <span v-if="!loading && props.approvals.length" class="rounded-full bg-amber-50 border border-amber-200 px-2 py-px text-[11px] font-semibold text-amber-700 tabular-nums">
            {{ props.approvals.length }}
          </span>
        </div>
        <p class="mt-1 text-[13px] text-[#8B6656]">Newest owner and branch applications</p>
      </div>
      <NuxtLink
        to="/admin/approvals"
        class="inline-flex shrink-0 items-center gap-1 rounded font-display text-[13px] font-semibold text-[#7D5A50] underline decoration-[#7D5A50]/30 underline-offset-4 hover:decoration-[#7D5A50] active:scale-[0.97] transition-transform duration-160 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
      >
        View all
        <Icon name="heroicons:arrow-up-right-20-solid" class="h-3.5 w-3.5" />
      </NuxtLink>
    </header>

    <ul v-if="loading" class="space-y-4 py-1" aria-hidden="true">
      <li v-for="i in 4" :key="i" class="flex items-center gap-3">
        <span class="skeleton h-9 w-9 shrink-0 rounded-full" />
        <span class="flex-1 space-y-2"><span class="skeleton block h-3.5 w-1/2 rounded" /><span class="skeleton block h-3 w-1/3 rounded" /></span>
        <span class="skeleton h-3 w-12 rounded" />
      </li>
    </ul>

    <ul v-else-if="approvals.length" class="-mx-2 flex flex-col">
      <li
        v-for="(item, i) in approvals.slice(0, 5)"
        :key="item.uuid"
        class="animate-row-enter"
        :style="{ '--row-delay': `${i * 60}ms` }"
      >
        <NuxtLink
          :to="`/admin/approvals?uuid=${item.uuid}`"
          class="group flex items-center gap-3 rounded-xl px-2 py-3 transition-all duration-160 ease-out hover:bg-[#FDF8F3] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
        >
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3E7D2] font-display text-[14px] font-semibold text-[#7D5A50]" aria-hidden="true">
            {{ applicantName(item).charAt(0).toUpperCase() }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[14px] font-semibold text-[#3B1F0E]">{{ applicantName(item) }}</span>
            <span class="block truncate text-[13px] text-[#8B6656]">{{ placeName(item) }}</span>
          </span>
          <span class="shrink-0 text-[12px] text-[#9E7060] tabular-nums">{{ formatDate(item.created_at) }}</span>
          <Icon name="heroicons:chevron-right-20-solid" class="h-4 w-4 shrink-0 text-[#C2A592] transition-transform duration-160 ease-out group-hover:translate-x-0.5 group-hover:text-[#7D5A50]" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>

    <div v-else class="animate-row-enter flex-1 rounded-2xl bg-[#FDF8F3] px-5 py-8 text-center">
      <Icon name="heroicons:check-circle" class="mx-auto h-7 w-7 text-[#C2A592]" />
      <p class="mt-2 font-display font-semibold text-[#3B1F0E]">Nothing waiting for review</p>
      <p class="mt-1 text-[13px] text-[#8B6656]">New owner and branch applications will appear here.</p>
    </div>
  </section>
</template>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, #F6ECDD, #FBF4EA, #F6ECDD);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
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
