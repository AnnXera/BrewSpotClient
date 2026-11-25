<!-- app/components/employees/TableRow.vue -->
<!-- Same row design as the admin Owner Management table (owner-management/TableRow.vue). -->
<script setup lang="ts">
import { computed } from 'vue'
import type { StaffMember } from '~/services/StaffService'

const props = defineProps<{
  member: StaffMember
  index: number
}>()

const emit = defineEmits<{
  view: [member: StaffMember]
}>()

const fullName = computed(() => `${props.member.firstname} ${props.member.lastname}`.trim())

const statusMeta = computed(() => {
  const s = props.member.assignment?.employment_status?.toLowerCase() || ''
  if (s === 'active') {
    return { label: 'Active', badgeClass: 'bg-[#E8F7EE] text-[#28A745] border border-[#C3ECD3]', dotClass: 'bg-[#28A745] animate-pulse' }
  }
  if (s === 'suspended' || s === 'terminated') {
    return {
      label: s === 'suspended' ? 'Suspended' : 'Terminated',
      badgeClass: 'bg-[#FDE8E8] text-[#DC3545] border border-[#F8B4B4]',
      dotClass: 'bg-[#DC3545]',
    }
  }
  return {
    label: s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Inactive',
    badgeClass: 'bg-[#F0E3CE] text-[#8B6656] border border-[#E4D1B8]',
    dotClass: 'bg-[#8B6656]',
  }
})

const roleIcon = computed(() => (props.member.role || '').toLowerCase() === 'manager' ? 'heroicons:briefcase' : 'heroicons:calculator')
</script>

<template>
  <!-- The whole row opens the employee, like a Cafe Management branch row -->
  <tr
    class="border-b border-[#F3E7D2] last:border-b-0 hover:bg-[#FAF4ED]/70 transition-colors duration-150 ease-out cursor-pointer group"
    @click="emit('view', member)"
  >
    <!-- Employee name & avatar -->
    <td class="px-6 py-4">
      <div class="flex items-center gap-3">
        <CommonAvatar
          :firstname="member.firstname"
          :lastname="member.lastname"
          :index="index"
          :size="38"
          class="ring-2 ring-white shadow-xs shrink-0"
        />
        <div class="flex flex-col min-w-0">
          <span class="font-sans text-sm font-bold text-[#3D2B24] leading-snug group-hover:text-[#8B5A3C] transition-colors break-words">
            {{ fullName || '—' }}
          </span>
          <span class="font-sans text-[11px] text-[#9E7060] font-medium leading-tight">
            {{ member.role || 'Employee' }}
          </span>
          <EmployeesFlags :member="member" />
        </div>
      </div>
    </td>

    <!-- Contacts (phone & email) -->
    <td class="px-6 py-4">
      <div class="flex flex-col gap-0.5">
        <div class="flex items-center gap-1.5 font-sans text-xs font-semibold text-[#3D2B24]">
          <Icon name="heroicons:phone" class="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
          <span>{{ member.phone_number || '—' }}</span>
        </div>
        <div class="flex items-center gap-1.5 font-sans text-xs text-[#7D5A50]">
          <Icon name="heroicons:envelope" class="w-3.5 h-3.5 text-[#B4846C]/70 shrink-0" />
          <span class="truncate max-w-[220px]" :title="member.email">{{ member.email }}</span>
        </div>
      </div>
    </td>

    <!-- Position -->
    <td class="px-6 py-4">
      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF4ED] border border-[#F3E7D2] text-xs font-semibold text-[#5C3A28]">
        <Icon :name="roleIcon" class="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
        <span>{{ member.role || '—' }}</span>
      </div>
    </td>

    <!-- Status -->
    <td class="px-6 py-4">
      <span
        v-if="member.assignment"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
        :class="statusMeta.badgeClass"
      >
        <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="statusMeta.dotClass" />
        {{ statusMeta.label }}
      </span>
    </td>

    <!-- Actions -->

    <!-- Same chevron and spacing from the edge as the Cafe Management branch list -->
    <td class="w-px px-6 py-4 text-right">
      <button
        type="button"
        class="inline-flex items-center justify-center w-9 h-9 rounded-xl text-[#B4846C] transition-colors group-hover:text-[#7D5A50] [@media(hover:hover)]:hover:bg-[#F3E7D2] outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]/40"
        :title="`View ${fullName}`"
        :aria-label="`View details for ${fullName}`"
        @click.stop="emit('view', member)"
      >
        <Icon name="heroicons:chevron-right" class="w-5 h-5" />
      </button>
    </td>
  </tr>
</template>
