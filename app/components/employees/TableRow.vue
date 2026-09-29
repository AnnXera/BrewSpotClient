<!-- app/components/employees/TableRow.vue -->
<script setup lang="ts">
import type { StaffMember } from '~/services/StaffService'

defineProps<{
  member: StaffMember
  index: number
}>()

const emit = defineEmits<{
  view: [member: StaffMember]
}>()
</script>

<template>
  <tr class="border-b border-[#EDD8CC] last:border-b-0 hover:bg-[#FFFAF0] transition-colors">
    <td class="px-5 py-3.5">
      <div class="flex items-center gap-3">
        <CommonAvatar :firstname="member.firstname" :lastname="member.lastname" :index="index" :size="43" />
        <div class="min-w-0">
          <p class="font-sans font-semibold text-sm text-[#3D2B24] tracking-[0.1px] break-words">
            {{ member.firstname }} {{ member.lastname }}
          </p>
          <EmployeesFlags :member="member" />
        </div>
      </div>
    </td>

    <td class="px-5 py-3.5 font-sans font-medium text-sm text-[#3D2B24] tracking-[0.1px] leading-[16.5px]">
      <p>{{ member.phone_number || '—' }}</p>
      <p class="break-all">{{ member.email }}</p>
    </td>

    <td class="px-5 py-3.5 font-sans font-medium text-sm text-[#3D2B24] tracking-[0.1px]">
      {{ member.role }}
    </td>

    <td class="px-5 py-3.5">
      <StatusBadge v-if="member.assignment" :status="member.assignment.employment_status" />
    </td>

    <td class="px-5 py-3.5 text-right">
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] border-[1.5px] border-[#7D5A50] font-display font-semibold text-sm text-[#7D5A50] whitespace-nowrap hover:bg-[#FFF8EA] transition-colors focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
        @click="emit('view', member)"
      >
        View Details
        <Icon name="heroicons:arrow-right" class="w-4 h-4" />
      </button>
    </td>
  </tr>
</template>
