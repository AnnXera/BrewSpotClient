<!-- app/components/employees/Flags.vue -->
<!-- Small status hints under an employee's name so problems are visible without opening each person. -->
<script setup lang="ts">
import type { StaffMember } from '~/services/StaffService'

const props = defineProps<{
  member: StaffMember
}>()

const isTerminated = computed(() => props.member.assignment?.employment_status === 'terminated')

const chips = computed(() => {
  if (isTerminated.value) return []

  const list: { label: string; tone: 'warn' | 'danger'; title: string }[] = []

  if (props.member.account_status === 'pending_setup') {
    list.push({ label: 'Invite pending', tone: 'warn', title: 'Has not set a dashboard password yet' })
  }
  if (props.member.pin_locked) {
    list.push({ label: 'PIN locked', tone: 'danger', title: 'Too many wrong PIN attempts — reset the PIN to unlock' })
  } else if (props.member.pin_must_change) {
    list.push({ label: 'Temporary PIN', tone: 'warn', title: 'Must choose a new PIN the first time they use it' })
  } else if (!props.member.pin_set && props.member.role !== 'Staff') {
    list.push({ label: 'No PIN', tone: 'warn', title: 'Cannot sign in on the register until a PIN is set' })
  }

  return list
})

const otherBranches = computed(() =>
  isTerminated.value
    ? ''
    : props.member.other_branches.map(b => b.branch_name).filter(Boolean).join(', '),
)
</script>

<template>
  <div v-if="chips.length || otherBranches" class="flex flex-wrap items-center gap-1.5 mt-1">
    <span
      v-for="chip in chips"
      :key="chip.label"
      :title="chip.title"
      class="inline-flex items-center rounded-full px-2 py-0.5 font-display font-semibold text-[11px] leading-4"
      :class="chip.tone === 'danger' ? 'bg-[#FDE8E8] text-[#DC3545]' : 'bg-[#FFF0D1] text-[#B4846C]'"
    >
      {{ chip.label }}
    </span>
    <span v-if="otherBranches" class="font-sans text-[11px] text-[#9E7060] truncate max-w-[220px]" :title="`Also at: ${otherBranches}`">
      Also at: {{ otherBranches }}
    </span>
  </div>
</template>
