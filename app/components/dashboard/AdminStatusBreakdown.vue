<script setup lang="ts">
import { computed } from 'vue'
import { formatCount } from '~/utils/dashboardFormat'

const props = defineProps<{
  ownerApprovalStats: {
    pending_approval: number
    approved: number
    rejected: number
  }
  branchApprovalStats: {
    pending_approval: number
    approved: number
    rejected: number
  }
  ownerStats: {
    total_owners: number
    active: number
    suspended: number
    inactive: number
  }
  loading?: boolean
}>()

interface Segment { label: string; value: number; bar: string }
interface Breakdown {
  id: string
  title: string
  subtitle: string
  link: string
  linkLabel: string
  emptyText: string
  segments: Segment[]
}

function approvalSegments(s: { pending_approval: number; approved: number; rejected: number }): Segment[] {
  return [
    { label: 'Approved', value: s.approved || 0, bar: 'bg-emerald-600' },
    { label: 'Pending', value: s.pending_approval || 0, bar: 'bg-amber-500' },
    { label: 'Rejected', value: s.rejected || 0, bar: 'bg-rose-500' },
  ]
}

const accountStatus = computed<Breakdown>(() => ({
  id: 'account-status',
  title: 'Owner account status',
  subtitle: 'Every registered cafe owner account',
  link: '/admin/owners',
  linkLabel: 'Manage owners',
  emptyText: 'No cafe owners have registered yet.',
  segments: [
    { label: 'Active', value: props.ownerStats.active || 0, bar: 'bg-emerald-600' },
    { label: 'Suspended', value: props.ownerStats.suspended || 0, bar: 'bg-amber-500' },
    { label: 'Inactive', value: props.ownerStats.inactive || 0, bar: 'bg-[#B4846C]' },
  ],
}))

const approvalBreakdowns = computed<Breakdown[]>(() => [
  {
    id: 'owner-approvals',
    title: 'Owner applications',
    subtitle: 'Registrations from new cafe owners',
    link: '/admin/approvals?type=owner',
    linkLabel: 'Review',
    emptyText: 'No owner applications yet.',
    segments: approvalSegments(props.ownerApprovalStats),
  },
  {
    id: 'branch-approvals',
    title: 'Branch applications',
    subtitle: 'New branches added by active owners',
    link: '/admin/approvals?type=branch',
    linkLabel: 'Review',
    emptyText: 'No branch applications yet.',
    segments: approvalSegments(props.branchApprovalStats),
  },
])

const total = (b: Breakdown) => b.segments.reduce((sum, s) => sum + s.value, 0)
const pct = (b: Breakdown, s: Segment) => (total(b) ? Math.round((s.value / total(b)) * 100) : 0)
</script>

<template>
  <div class="space-y-6">
    <template v-for="(group, gi) in [[accountStatus], approvalBreakdowns]" :key="gi">
      <div :class="gi === 1 ? 'grid grid-cols-1 gap-6 lg:grid-cols-2' : ''">
        <section
          v-for="b in group"
          :key="b.id"
          class="flex flex-col gap-5 rounded-[22px] border border-[#EEDFC4] bg-white p-5 sm:p-7 shadow-[0_1px_2px_rgba(59,31,14,0.04)]"
          :aria-labelledby="`${b.id}-heading`"
        >
          <header class="flex items-start justify-between gap-4">
            <div>
              <h2 :id="`${b.id}-heading`" class="font-display text-[18px] font-bold text-[#3B1F0E]">{{ b.title }}</h2>
              <p class="mt-1 text-[13px] text-[#8B6656]">
                {{ b.subtitle }}<template v-if="!loading && total(b)"> · <span class="tabular-nums">{{ formatCount(total(b)) }}</span> total</template>
              </p>
            </div>
            <NuxtLink
              :to="b.link"
              class="inline-flex shrink-0 items-center gap-1 rounded font-display text-[13px] font-semibold text-[#7D5A50] underline decoration-[#7D5A50]/30 underline-offset-4 hover:decoration-[#7D5A50] active:scale-[0.97] transition-transform duration-160 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
            >
              {{ b.linkLabel }}
              <Icon name="heroicons:arrow-up-right-20-solid" class="h-3.5 w-3.5" />
            </NuxtLink>
          </header>

          <!-- Split bar -->
          <div v-if="loading" class="skeleton h-2 rounded-full" aria-hidden="true" />
          <div
            v-else
            class="flex h-2 gap-0.5 overflow-hidden rounded-full bg-[#F3E7D2]"
            role="img"
            :aria-label="b.segments.map(s => `${s.label} ${s.value}`).join(', ')"
          >
            <div
              v-for="(s, si) in b.segments.filter(seg => seg.value > 0)"
              :key="s.label"
              class="bar-grow-x h-full first:rounded-l-full last:rounded-r-full"
              :class="s.bar"
              :style="{ width: `${pct(b, s)}%`, '--bar-delay': `${si * 90}ms` }"
            />
          </div>

          <!-- Figures -->
          <dl class="grid grid-cols-3 divide-x divide-[#F3E7D2]">
            <div v-for="s in b.segments" :key="s.label" class="px-4 first:pl-0 last:pr-0">
              <dt class="flex items-center gap-1.5 text-[13px] text-[#8B6656]">
                <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="s.bar" aria-hidden="true" />
                {{ s.label }}
              </dt>
              <dd class="mt-1.5 font-display text-[22px] leading-none font-semibold text-[#3B1F0E] tabular-nums">
                <span v-if="loading" class="skeleton inline-block h-[0.85em] w-8 rounded align-middle" />
                <template v-else>{{ formatCount(s.value) }}</template>
              </dd>
              <dd v-if="!loading && total(b)" class="mt-1 text-[12px] text-[#9E7060] tabular-nums">{{ pct(b, s) }}%</dd>
            </div>
          </dl>

          <p v-if="!loading && !total(b)" class="-mt-1 text-[13px] text-[#9E7060]">{{ b.emptyText }}</p>
        </section>
      </div>
    </template>
  </div>
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

@keyframes barGrowX {
  0% {
    transform: scaleX(0);
    opacity: 0.15;
  }
  100% {
    transform: scaleX(1);
    opacity: 1;
  }
}

.bar-grow-x {
  transform-origin: left;
  animation: barGrowX 850ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--bar-delay, 0ms);
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton, .bar-grow-x {
    animation: none !important;
    transform: none !important;
  }
}
</style>
