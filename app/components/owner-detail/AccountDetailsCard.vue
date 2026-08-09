<!--components/owner-detail/AccountDetailsCard.vue-->
<template>
  <div class="bg-white border border-[#EDD8CC] rounded-2xl p-6">
    <div class="flex items-center justify-between mb-[20px]">
      <h2 class="font-display text-[18px] font-bold text-[#3D2B24]">Account Details</h2>
      <StatusBadge :status="owner.status" />
    </div>

    <div class="flex items-center gap-[16px] pb-[20px] mb-[20px] border-b-[1px] border-[#F3E7D2]">
      <div class="w-[49px] h-[49px] rounded-full bg-[#7D5A50] flex items-center justify-center shrink-0">
        <span class="font-display text-[20px] font-semibold text-[#FFF0D1]">
          {{ initials(owner.firstname, owner.lastname) }}
        </span>
      </div>
      <div>
        <p class="font-display text-[20px] font-semibold text-[#3B1F0E]">{{ owner.firstname }} {{ owner.lastname }}</p>
        <p class="font-display text-[14px] text-[#9E7060]">ID: {{ displayId }}</p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 text-[14px] tracking-[0.1px] font-display">
      <div>
        <p class="font-bold text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-1">Email Address</p>
        <p class="font-medium text-[#3B1F0E]">{{ owner.email }}</p>
      </div>
      <div>
        <p class="font-bold text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-1">Phone Contact</p>
        <p class="font-medium text-[#3B1F0E]">{{ owner.phone_number ?? '—' }}</p>
      </div>
      <div>
        <p class="font-bold text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-1">Member Since</p>
        <p class="font-medium text-[#3B1F0E]">{{ formatDate(owner.created_at) }}</p>
      </div>
      <div>
        <p class="font-bold text-[11px] text-[#9E7060] uppercase tracking-[0.77%] mb-1">Total Cafe Branches</p>
        <p class="font-medium text-[#3B1F0E]">{{ branchCount }} Branches</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Owner {
  uuid: string
  firstname: string
  lastname: string
  email: string
  phone_number: string | null
  status: string
  created_at: string | null
}

const props = defineProps<{
  owner: Owner
  branchCount: number
}>()

function initials(firstname?: string, lastname?: string) {
  return `${firstname?.[0] ?? ''}${lastname?.[0] ?? ''}`.toUpperCase() || '?'
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

const displayId = computed(() => {
  if (!props.owner?.created_at) return '—'
  const year = new Date(props.owner.created_at).getFullYear()
  const idPart = String(props.owner.uuid ?? '').slice(0, 3).toUpperCase()
  return `BRW-${year}-${idPart}`
})
</script>