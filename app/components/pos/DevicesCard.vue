<!-- app/components/pos/DevicesCard.vue -->
<!-- The POS registers set up for one branch. Shown on the owner's Branch Details and the manager's Cafe Management. -->
<script setup lang="ts">
import type { PlanLock } from '~/utils/planLock'
import type { BranchPosDevice } from '~/services/PosService'

const props = defineProps<{
  branchUuid: string
  scope: 'owner' | 'manager'
  branchName?: string
}>()

const posService = usePosService()

const devices = ref<BranchPosDevice[]>([])
const loading = ref(true)
const error = ref('')
// The cafe's plan lacks the POS system, or its subscription has expired.
const planLock = ref<PlanLock | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  planLock.value = null
  try {
    const res = await posService.listBranchDevices(props.scope, props.branchUuid)
    devices.value = res.devices ?? []
  } catch (e: any) {
    planLock.value = planLockFromError(e)
    if (!planLock.value) error.value = 'The registers could not be loaded.'
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

const isQrModalOpen = ref(false)

// ── Remove a register from the dashboard (lost/broken/retired device) ──
const removing = ref<BranchPosDevice | null>(null)
const removeBusy = ref(false)
const removeError = ref('')
const notice = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | null = null

function askRemove(device: BranchPosDevice) {
  removeError.value = ''
  removing.value = device
}

function closeRemove() {
  if (!removeBusy.value) removing.value = null
}

async function confirmRemove() {
  const device = removing.value
  if (!device || removeBusy.value) return
  removeBusy.value = true
  removeError.value = ''
  try {
    const res = await posService.removeBranchDevice(props.scope, props.branchUuid, device.uuid)
    if (!res.success) {
      removeError.value = res.message || 'The register could not be removed.'
      return
    }
    devices.value = devices.value.filter(d => d.uuid !== device.uuid)
    removing.value = null
    notice.value = res.message || `Register "${device.name}" removed.`
    if (noticeTimer) clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => { notice.value = '' }, 5000)
  } catch (e: any) {
    removeError.value = e?.data?.message || 'The register could not be removed. Please try again.'
  } finally {
    removeBusy.value = false
  }
}

onBeforeUnmount(() => { if (noticeTimer) clearTimeout(noticeTimer) })
</script>

<template>
  <section class="bg-white border border-[#EDD8CC] rounded-2xl p-6 shadow-sm flex flex-col gap-4" aria-labelledby="pos-registers-heading">
    <!-- Header: same heading treatment as Branch Information / BIR Document -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="pos-registers-heading" class="text-lg sm:text-xl font-bold text-[#3D2B24] flex items-center gap-2">
          <Icon name="heroicons:computer-desktop" class="size-6 text-[#A96746]" />
          POS Registers
        </h2>
        <span v-if="!loading && devices.length" class="text-sm font-medium text-[#9E7060] tabular-nums">
          {{ devices.length }} {{ devices.length === 1 ? 'register' : 'registers' }}<template v-if="inUseCount"> · <span class="text-emerald-700">{{ inUseCount }} in use</span></template>
        </span>
      </div>
      <div v-if="!loading && !planLock" class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 border border-[#EDD8CC] bg-white rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-[#7D5A50] hover:bg-[#FFF8EA] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          :title="scope === 'owner' ? 'Generate & Print POS QR Code' : 'View & Print POS QR Code'"
          @click="isQrModalOpen = true"
        >
          <Icon name="heroicons:qr-code" class="size-4" />
          {{ scope === 'owner' ? 'Generate POS QR' : 'View POS QR' }}
        </button>
        <CommonA2HSButton variant="card" label="Install POS App" data-walkthrough="pos-install-btn" />
        <button
          type="button"
          class="size-[38px] inline-flex items-center justify-center border border-[#EDD8CC] bg-white rounded-[10px] text-[#7D5A50] hover:bg-[#FFF8EA] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
          aria-label="Refresh registers"
          title="Refresh"
          @click="load"
        >
          <Icon name="heroicons:arrow-path-20-solid" class="size-4" :class="loading ? 'animate-spin' : ''" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Success note after removing a register -->
    <p
      v-if="notice"
      role="status"
      class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] font-medium text-emerald-800"
    >
      <Icon name="heroicons:check-circle" class="size-4 shrink-0 text-emerald-600" />
      <span class="flex-1">{{ notice }}</span>
      <button type="button" class="text-emerald-700 hover:text-emerald-900 cursor-pointer" aria-label="Dismiss" @click="notice = ''">
        <Icon name="heroicons:x-mark" class="size-4" />
      </button>
    </p>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" aria-hidden="true">
      <div v-for="i in 2" :key="i" class="border border-[#EDD8CC] rounded-xl p-4 flex flex-col gap-3.5">
        <div class="flex items-center gap-3">
          <span class="skeleton w-12 h-12 rounded-[10px] shrink-0" />
          <span class="flex-1 space-y-2"><span class="skeleton block h-3.5 w-1/2 rounded" /><span class="skeleton block h-4 w-14 rounded-full" /></span>
        </div>
        <div class="grid grid-cols-2 gap-3 border-t border-[#EDD8CC] pt-3">
          <span class="space-y-1.5"><span class="skeleton block h-2.5 w-14 rounded" /><span class="skeleton block h-3.5 w-16 rounded" /></span>
          <span class="space-y-1.5"><span class="skeleton block h-2.5 w-12 rounded" /><span class="skeleton block h-3.5 w-20 rounded" /></span>
        </div>
      </div>
    </div>

    <!-- The cafe's plan lacks the POS system, or its subscription has expired -->
    <SubscriptionLockedState
      v-else-if="planLock"
      :lock="planLock"
      :audience="scope === 'manager' ? 'staff' : 'owner'"
      description="Ring up orders on registers at this branch."
      compact
    />

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
        class="border rounded-xl p-4 flex flex-col gap-3.5 transition-colors"
        :class="device.active_staff ? 'border-emerald-200 bg-emerald-50/30' : 'border-[#EDD8CC] bg-white'"
      >
        <!-- Top: tile, name + status, remove -->
        <div class="flex items-center gap-3">
          <div class="bg-[#FFF0D1] rounded-[10px] w-12 h-12 flex items-center justify-center shrink-0">
            <Icon name="heroicons:computer-desktop" class="size-6 text-[#7D5A50]" />
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-[#3D2B24] truncate" :title="device.name">{{ device.name }}</p>
            <span
              class="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              :class="device.active_staff ? 'bg-emerald-100 text-emerald-800' : 'bg-[#F4ECE1] text-[#7D5A50]'"
            >
              <span class="size-1.5 rounded-full" :class="device.active_staff ? 'bg-emerald-500' : 'bg-[#B4846C]'" aria-hidden="true" />
              {{ device.active_staff ? 'In use' : 'Locked' }}
            </span>
          </div>

          <button
            type="button"
            class="size-9 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-[#EDD8CC] bg-white text-[#9E7060] hover:text-[#9E4F47] hover:border-[#E5C5C0] hover:bg-[#F3DFDC]/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E4F47]"
            :aria-label="`Remove register ${device.name}`"
            title="Remove register"
            @click="askRemove(device)"
          >
            <Icon name="heroicons:trash" class="size-4" />
          </button>
        </div>

        <!-- Who is on it now -->
        <div
          v-if="device.active_staff"
          class="flex items-center gap-2.5 rounded-[10px] border border-emerald-200 bg-white px-3 py-2"
        >
          <span class="size-7 shrink-0 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center">
            {{ device.active_staff.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() }}
          </span>
          <p class="min-w-0 text-[13px] leading-snug text-[#3D2B24]">
            <span class="font-semibold">{{ device.active_staff.name }}</span>
            <span class="text-[#9E7060]"> signed in<template v-if="device.active_since"> since {{ formatTime(device.active_since) }}</template></span>
          </p>
        </div>

        <!-- Details, same label style as the cards above -->
        <dl class="grid grid-cols-2 gap-3 border-t border-[#EDD8CC] pt-3">
          <div class="min-w-0">
            <dt class="text-[11px] font-bold text-[#9E7060] uppercase tracking-wider">Last used</dt>
            <dd class="mt-0.5 text-[13px] font-medium text-[#3D2B24]">{{ device.last_used_at ? timeAgo(device.last_used_at) : 'Not used yet' }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="text-[11px] font-bold text-[#9E7060] uppercase tracking-wider">Added</dt>
            <dd class="mt-0.5 text-[13px] font-medium text-[#3D2B24] truncate" :title="device.registered_by ? `by ${device.registered_by}` : undefined">
              {{ formatDate(device.created_at) || '—' }}
            </dd>
            <dd v-if="device.registered_by" class="text-[11.5px] text-[#9E7060] truncate">by {{ device.registered_by }}</dd>
          </div>
        </dl>
      </li>
    </ul>

    <!-- Empty -->
    <div v-else class="rounded-xl bg-[#FFF8EA] border border-dashed border-[#EDD8CC] px-5 py-8 text-center">
      <Icon name="heroicons:computer-desktop" class="mx-auto w-7 h-7 text-[#C2A592]" />
      <p class="mt-2 text-[15px] font-semibold text-[#3D2B24]">No registers set up yet</p>
      <p class="mt-1 text-sm text-[#9E7060]">Open the setup page on the device you want to use as this branch's register.</p>
      <div class="mt-3 flex flex-wrap items-center justify-center gap-2">
        <NuxtLink
          to="/pos/setup"
          class="inline-flex items-center gap-1.5 border border-[#EDD8CC] bg-white rounded-[10px] px-4 py-2 text-[13px] font-semibold text-[#7D5A50] hover:bg-[#FFF0D1] transition-colors"
        >
          <Icon name="heroicons:plus-20-solid" class="w-4 h-4" aria-hidden="true" />
          Set up a register
        </NuxtLink>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 border border-[#EDD8CC] bg-white rounded-[10px] px-4 py-2 text-[13px] font-semibold text-[#7D5A50] hover:bg-[#FFF0D1] transition-colors"
          @click="isQrModalOpen = true"
        >
          <Icon name="heroicons:qr-code" class="w-4 h-4 text-[#7D5A50]" />
          {{ scope === 'owner' ? 'Generate QR Code' : 'View QR Code' }}
        </button>
      </div>
    </div>

    <!-- POS QR Modal (Generator for Owner, View for Manager, PDF Print for Both) -->
    <PosQrModal
      :show="isQrModalOpen"
      :scope="props.scope"
      :branch-uuid="props.branchUuid"
      :branch-name="props.branchName"
      @close="isQrModalOpen = false"
    />

    <!-- Remove register confirmation -->
    <CommonDialogShell
      :open="!!removing"
      tone="danger"
      icon="heroicons:trash"
      :title="`Remove ${removing?.name ?? 'this register'}?`"
      message="This device is signed out of the register right away. Someone will need to set it up again before it can take orders. Past sales stay in your records."
      :busy="removeBusy"
      @close="closeRemove"
    >
      <div class="space-y-2.5">
        <p
          v-if="removing?.active_staff"
          class="flex items-start gap-2 rounded-xl border border-[#E5C5C0] bg-[#F3DFDC]/60 px-3.5 py-2.5 text-[12.5px] leading-snug text-[#7A3B34]"
        >
          <Icon name="heroicons:exclamation-triangle" class="mt-px size-4 shrink-0 text-[#9E4F47]" />
          <span><strong class="font-semibold">{{ removing.active_staff.name }}</strong> is signed in on this register now. Removing it ends their session.</span>
        </p>
        <p v-if="removeError" role="alert" class="rounded-xl border border-[#E5C5C0] bg-[#F3DFDC]/60 px-3.5 py-2.5 text-xs font-semibold text-[#9E4F47]">
          {{ removeError }}
        </p>
      </div>

      <template #actions>
        <button
          type="button"
          data-autofocus
          :disabled="removeBusy"
          class="whitespace-nowrap rounded-[10px] px-4 py-[11px] text-[13px] font-semibold bg-transparent text-[#5E4A42] border border-[#DED4CA] hover:bg-[#F1E9DE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] transition-colors disabled:opacity-50"
          @click="closeRemove"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="removeBusy"
          class="whitespace-nowrap rounded-[10px] px-4 py-[11px] text-[13px] font-semibold text-white bg-[#9E4F47] hover:bg-[#8A423B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#9E4F47] transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
          @click="confirmRemove"
        >
          <Icon v-if="removeBusy" name="heroicons:arrow-path" class="size-4 animate-spin" />
          {{ removeBusy ? 'Removing...' : 'Remove register' }}
        </button>
      </template>
    </CommonDialogShell>
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
