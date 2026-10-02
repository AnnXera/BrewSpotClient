<!-- app/components/employees/MobileCard.vue -->
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
  <div class="p-4 border-b border-[#EDD8CC] last:border-b-0 sm:p-5">
    <!-- Avatar, name, position, status -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0">
        <CommonAvatar :firstname="member.firstname" :lastname="member.lastname" :index="index" :size="40" />
        <div class="min-w-0">
          <p class="font-sans font-semibold text-sm text-[#3D2B24] break-words">
            {{ member.firstname }} {{ member.lastname }}
          </p>
          <p class="font-sans text-xs text-[#9E7060] mt-0.5">{{ member.role }}</p>
          <EmployeesFlags :member="member" />
        </div>
      </div>
      <StatusBadge v-if="member.assignment" :status="member.assignment.employment_status" />
    </div>

    <div class="h-px bg-[#F3E7D2] my-3.5" />

    <!-- Contacts -->
    <div class="grid grid-cols-2 gap-4">
      <div class="min-w-0">
        <p class="font-sans text-[11px] font-bold uppercase tracking-wider text-[#9E7060]">Phone</p>
        <p class="font-sans text-xs font-medium text-[#3D2B24] mt-0.5 truncate">{{ member.phone_number || '—' }}</p>
      </div>
      <div class="min-w-0">
        <p class="font-sans text-[11px] font-bold uppercase tracking-wider text-[#9E7060]">Email</p>
        <p class="font-sans text-xs font-medium text-[#3D2B24] mt-0.5 truncate">{{ member.email }}</p>
      </div>
    </div>

    <button
      type="button"
      class="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] border-[1.5px] border-[#7D5A50] font-display font-semibold text-sm text-[#7D5A50] hover:bg-[#FFF8EA] transition-colors focus:outline-none focus:ring-2 focus:ring-[#B4846C]/40"
      @click="emit('view', member)"
    >
      View Details
      <Icon name="heroicons:arrow-right" class="w-4 h-4" />
    </button>
  </div>
</template>
