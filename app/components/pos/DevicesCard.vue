<!-- app/components/pos/DevicesCard.vue -->
<!-- The POS registers set up for one branch. Shown on the owner's Branch Details and the manager's Cafe Management. -->
<script setup lang="ts">
import type { BranchPosDevice } from '~/services/PosService'

const props = defineProps<{
  branchUuid: string
  scope: 'owner' | 'manager'
}>()

const posService = usePosService()

const devices = ref<BranchPosDevice[]>([])
const loading = ref(true)
const error = ref('')
const planLocked = ref(false) // the cafe's plan doesn't include the POS system

async function load() {
  loading.value = true
  error.value = ''
  planLocked.value = false
  try {
    const res = await posService.listBranchDevices(props.scope, props.branchUuid)
    devices.value = res.devices ?? []
  } catch (e: any) {
    if (e?.data?.required_feature) planLocked.value = true
    else error.value = 'The registers could not be loaded.'
    devices.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.branchUuid, load)
onMounted(load)

const inUseCount = computed(() => devices.value.filter(d => d.active_staff).length)

function timeAgo(iso: string | null) {
  if (!iso) return null
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// "10:55 AM" today, "Oct 19, 10:55 AM" otherwise
function formatTime(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === new Date().toDateString()) return time
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <section class="bg-white border border-[#EDD8CC] rounded-2xl p-6 flex flex-col gap-4" aria-labelledby="pos-registers-heading">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <div class="flex items-baseline gap-2.5">
        <h2 id="pos-registers-heading" class="text-[22px] font-bold text-[#3D2B24]">POS Registers</h2>
        <span v-if="!loading && devices.length" class="text-sm font-medium text-[#9E7060] tabular-nums">
          {{ devices.length }} {{ devices.length === 1 ? 'register' : 'registers' }}<template v-if="inUseCount"> · {{ inUseCount }} in use</template>
        </span>
      </div>
      <button
        v-if="!loading && !planLocked"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg text-[13px] font-semibold text-[#7D5A50] hover:text-[#3D2B24] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
        @click="load"
      >
        <Icon name="heroicons:arrow-path-20-solid" class="w-4 h-4" aria-hidden="true" />
        Refresh
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" aria-hidden="true">
      <div v-for="i in 2" :key="i" class="border border-[#EDD8CC] rounded-xl p-4 flex items-center gap-3">
        <span class="skeleton w-12 h-12 rounded-[10px] shrink-0" />
        <span class="flex-1 space-y-2"><span class="skeleton block h-3.5 w-1/2 rounded" /><span class="skeleton block h-3 w-2/3 rounded" /></span>
      </div>
    </div>

    <!-- Plan doesn't include POS -->
    <div v-else-if="planLocked" class="rounded-xl bg-[#FFF8EA] border border-[#EDD8CC] px-5 py-6 flex flex-col sm:flex-row sm:items-center gap-3">
      <Icon name="heroicons:lock-closed" class="w-6 h-6 text-[#9E7060] shrink-0" />
      <div class="flex-1">
        <p class="text-[15px] font-semibold text-[#3D2B24]">The POS system isn't on the current plan</p>
        <p class="text-sm text-[#9E7060]">
          {{ scope === 'owner' ? 'Upgrade your plan to ring up orders on registers at this branch.' : 'Ask the cafe owner to upgrade their plan to use registers at this branch.' }}
        </p>
      </div>
      <NuxtLink
        v-if="scope === 'owner'"
        to="/owner/subscription"
        class="shrink-0 border border-[#EDD8CC] rounded-[10px] px-4 py-2 text-[13px] font-semibold text-[#7D5A50] hover:bg-[#FFF0D1] transition-colors"
      >
        See plans
      </NuxtLink>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 flex items-center gap-3">
      <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0" />
      <span class="text-sm font-medium">{{ error }}</span>
      <button class="ml-auto text-sm font-bold underline hover:text-red-900" @click="load">Retry</button>
    </div>

    <!-- Registers -->
    <ul v-else-if="devices.length" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      <li
        v-for="device in devices"
        :key="device.uuid"
        class="border border-[#EDD8CC] rounded-xl p-4 flex items-start gap-3"
      >
        <div class="relative bg-[#FFF0D1] rounded-[10px] w-12 h-12 flex items-center justify-center shrink-0">
          <Icon name="heroicons:computer-desktop" class="w-6 h-6 text-[#7D5A50]" />
          <span
            class="absolute -top-1 -right-1 w-3 h-3 rounded-full ring-2 ring-white"
            :class="device.active_staff ? 'bg-emerald-500' : 'bg-[#D9C3A5]'"
            aria-hidden="true"
          />
        </div>

        <div class="flex-1 min-w-0 flex flex-col gap-1">
          <p class="text-[15px] font-semibold text-[#3D2B24] truncate">{{ device.name }}</p>
          <p v-if="device.active_staff" class="text-sm text-emerald-700 break-words">
            {{ device.active_staff.name }} signed in<template v-if="device.active_since"> since {{ formatTime(device.active_since) }}</template>
          </p>
          <p v-else class="text-sm text-[#9E7060]">Locked, no one signed in</p>
          <p class="text-xs text-[#9E7060]">
            {{ device.last_used_at ? `Last used ${timeAgo(device.last_used_at)}` : 'Not used yet' }}
            <template v-if="device.created_at"> · Added {{ formatDate(device.created_at) }}<template v-if="device.registered_by"> by {{ device.registered_by }}</template></template>
          </p>
        </div>
      </li>
    </ul>

    <!-- Empty -->
    <div v-else class="rounded-xl bg-[#FFF8EA] border border-dashed border-[#EDD8CC] px-5 py-8 text-center">
      <Icon name="heroicons:computer-desktop" class="mx-auto w-7 h-7 text-[#C2A592]" />
      <p class="mt-2 text-[15px] font-semibold text-[#3D2B24]">No registers set up yet</p>
      <p class="mt-1 text-sm text-[#9E7060]">Open the setup page on the device you want to use as this branch's register.</p>
      <NuxtLink
        to="/pos/setup"
        class="mt-3 inline-flex items-center gap-1.5 border border-[#EDD8CC] bg-white rounded-[10px] px-4 py-2 text-[13px] font-semibold text-[#7D5A50] hover:bg-[#FFF0D1] transition-colors"
      >
        <Icon name="heroicons:plus-20-solid" class="w-4 h-4" aria-hidden="true" />
        Set up a register
      </NuxtLink>
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

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
</style>
