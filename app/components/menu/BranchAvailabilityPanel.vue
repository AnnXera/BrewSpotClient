<script setup lang="ts">
export interface BranchStatus {
  branch_uuid: string
  branch_name: string
  is_available: boolean
  has_override: boolean
}

export interface BranchAvailabilitySource {
  // Cafe-wide default; branches only store an override when they differ from it.
  defaultAvailable: boolean | null
  name: string
  branches: BranchStatus[]
}

const props = withDefaults(defineProps<{
  // Changing it reloads the panel.
  sourceKey: string
  // Noun used in copy, e.g. "category" or "item".
  subject: string
  load: () => Promise<BranchAvailabilitySource>
  update: (branchUuid: string, next: boolean) => Promise<Pick<BranchStatus, 'is_available' | 'has_override'>>
  // sidebar: sticky, collapses below lg. card: always expanded.
  variant?: 'sidebar' | 'card'
}>(), {
  variant: 'sidebar',
})

const isCard = computed(() => props.variant === 'card')

const FILTER_THRESHOLD = 8
// Bulk changes run a few requests at a time to stay under the API rate limit.
const BULK_CONCURRENCY = 4

const branches = ref<BranchStatus[]>([])
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const pending = ref<Set<string>>(new Set())
const rowErrors = ref<Record<string, string>>({})
const bulkError = ref<string | null>(null)
// Polite screen-reader announcement for completed changes.
const announcement = ref('')
const isBulkPending = ref(false)
const sourceDefault = ref<boolean | null>(null)
const sourceName = ref('')
let fetchToken = 0
const confirming = ref<'hide-all' | 'reset' | null>(null)
const filterQuery = ref('')
// Below lg the panel collapses to a summary row; at lg it is always expanded via CSS.
const isExpanded = ref(false)
const controlsId = useId()
const listRegionId = useId()

const activeCount = computed(() => branches.value.filter(b => b.is_available).length)
const allVisible = computed(() => activeCount.value === branches.value.length)
const noneVisible = computed(() => activeCount.value === 0)
const showFilter = computed(() => branches.value.length > FILTER_THRESHOLD)
const exceptionCount = computed(() => branches.value.filter(b => b.has_override).length)
const defaultLabel = computed(() => sourceDefault.value ? 'Shown' : 'Hidden')
const showBody = computed(() => isCard.value || isExpanded.value)

function branchCountLabel(n: number) {
  return n === 1 ? '1 branch' : `${n} branches`
}

const visibleBranches = computed(() => {
  const q = filterQuery.value.trim().toLowerCase()
  if (!q) return branches.value
  return branches.value.filter(b => b.branch_name.toLowerCase().includes(q))
})

// Turns a $fetch error into a short, actionable reason.
function describeError(error: any): string {
  const status = error?.response?.status ?? error?.status
  if (!status) return 'Check your connection and try again.'
  if (status === 429) return 'Too many changes at once. Wait a moment and try again.'
  if (status >= 500) return 'The server had a problem. Try again in a moment.'
  return error?.data?.message || 'Please try again.'
}

async function fetchBranches() {
  const token = ++fetchToken
  isLoading.value = true
  loadError.value = null
  try {
    const res = await props.load()
    if (token !== fetchToken) return
    branches.value = res.branches
    sourceDefault.value = res.defaultAvailable
    sourceName.value = res.name
  } catch (error) {
    if (token !== fetchToken) return
    console.error(`Failed to fetch ${props.subject} branches`, error)
    branches.value = []
    sourceDefault.value = null
    loadError.value = describeError(error)
  } finally {
    if (token === fetchToken) isLoading.value = false
  }
}

// Optimistically applies the new state, reverting it if the request fails.
async function applyAvailability(branch: BranchStatus, next: boolean) {
  const previous = branch.is_available
  branch.is_available = next
  pending.value.add(branch.branch_uuid)
  delete rowErrors.value[branch.branch_uuid]

  try {
    const res = await props.update(branch.branch_uuid, next)
    branch.is_available = Boolean(res.is_available)
    branch.has_override = res.has_override
  } catch (error) {
    branch.is_available = previous
    rowErrors.value[branch.branch_uuid] = describeError(error)
    throw error
  } finally {
    pending.value.delete(branch.branch_uuid)
  }
}

function describeChange(next: boolean, where: string) {
  const subject = sourceName.value || props.subject.charAt(0).toUpperCase() + props.subject.slice(1)
  return `${subject} ${next ? 'shown' : 'hidden'} at ${where}.`
}

async function toggleBranch(branch: BranchStatus) {
  if (isBulkPending.value || pending.value.has(branch.branch_uuid)) return

  bulkError.value = null
  const next = !branch.is_available
  try {
    await applyAvailability(branch, next)
    announcement.value = describeChange(next, branch.branch_name)
  } catch (error) {
    console.error('Failed to update branch availability', error)
    announcement.value = `Couldn't update ${branch.branch_name}. ${rowErrors.value[branch.branch_uuid] ?? ''}`
  }
}

async function runWithConcurrency<T>(items: T[], limit: number, task: (item: T) => Promise<unknown>) {
  let failed = 0
  let index = 0
  const worker = async () => {
    while (index < items.length) {
      const item = items[index++]!
      try {
        await task(item)
      } catch {
        failed++
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return failed
}

async function applyToBranches(targets: BranchStatus[], next: boolean) {
  confirming.value = null
  bulkError.value = null
  targets = targets.filter(b => !pending.value.has(b.branch_uuid))
  if (targets.length === 0) return

  isBulkPending.value = true
  const failed = await runWithConcurrency(targets, BULK_CONCURRENCY, b => applyAvailability(b, next))
  isBulkPending.value = false

  if (failed > 0) {
    console.error(`Failed to update ${failed} of ${targets.length} branches`)
    bulkError.value = `${failed} of ${branchCountLabel(targets.length)} couldn't be updated and were switched back. They're marked below.`
    announcement.value = bulkError.value
  } else {
    announcement.value = describeChange(next, branchCountLabel(targets.length))
  }
}

function setAllAvailability(next: boolean) {
  return applyToBranches(branches.value.filter(b => b.is_available !== next), next)
}

// Matching the default removes a branch's override on the server.
function resetToDefault() {
  if (sourceDefault.value === null) return
  return applyToBranches(branches.value.filter(b => b.has_override), sourceDefault.value)
}

watch(() => props.sourceKey, () => {
  filterQuery.value = ''
  confirming.value = null
  rowErrors.value = {}
  bulkError.value = null
  fetchBranches()
}, { immediate: true })
</script>

<template>
  <aside
    :class="[
      'flex flex-col bg-white rounded-2xl border border-[#EEDFC4] shadow-sm overflow-hidden',
      isCard ? 'w-full' : 'w-full lg:w-64 shrink-0 self-start order-first lg:order-none lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]'
    ]"
  >
    <header
      :class="[
        'shrink-0 border-[#EEDFC4]',
        showBody ? 'border-b' : 'lg:border-b'
      ]"
    >
      <!-- Below lg: summary row that expands the panel -->
      <h2 v-if="!isCard" class="lg:hidden">
        <button
          type="button"
          :aria-expanded="isExpanded"
          :aria-controls="`${controlsId} ${listRegionId}`"
          @click="isExpanded = !isExpanded"
          :class="[
            'w-full min-h-14 flex items-center justify-between gap-3 px-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7D5A50]',
            isExpanded ? 'pt-4 pb-1' : 'py-4'
          ]"
        >
          <span class="font-display font-bold text-lg text-[#3B1F0E]">Branches</span>
          <span class="flex items-center gap-2">
            <span v-if="loadError" class="text-xs font-semibold text-red-700 whitespace-nowrap">Couldn't load</span>
            <span v-else-if="!isLoading && branches.length > 0 && !isExpanded" class="text-xs font-semibold text-[#7D5A50] whitespace-nowrap tabular-nums">
              {{ activeCount }} of {{ branches.length }} shown
            </span>
            <Icon
              name="heroicons:chevron-down"
              :class="['w-5 h-5 text-[#7D5A50] transition-transform', isExpanded ? 'rotate-180' : '']"
            />
          </span>
        </button>
      </h2>

      <!-- lg and up (always for card): static heading -->
      <div :class="[isCard ? 'flex' : 'hidden lg:flex', 'items-baseline justify-between gap-2 px-5 pt-4']">
        <h2 class="font-display font-bold text-lg text-[#3B1F0E]">Branches</h2>
        <button
          type="button"
          :disabled="isLoading || exceptionCount === 0 || isBulkPending || confirming !== null"
          @click="confirming = 'reset'"
          class="text-sm font-semibold text-[#3B1F0E] rounded-sm hover:text-[#7D5A50] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] disabled:text-[#B4846C] disabled:cursor-not-allowed"
        >
          Reset all
        </button>
      </div>

      <div :id="controlsId" :class="[showBody ? 'block' : 'hidden lg:block', 'px-5 pb-3 lg:pt-1']">
        <p v-if="sourceDefault === null || isLoading || branches.length === 0" class="text-xs text-[#7D5A50]">Choose where this {{ subject }} is shown.</p>
        <div v-else class="flex items-baseline justify-between gap-2">
          <p class="text-xs font-semibold text-[#7D5A50] tabular-nums">
            {{ activeCount }} of {{ branches.length }} shown
          </p>
          <!-- Below lg the sidebar's heading (with "Reset all") is replaced by the summary row -->
          <button
            v-if="!isCard"
            type="button"
            :disabled="exceptionCount === 0 || isBulkPending || confirming !== null"
            @click="confirming = 'reset'"
            class="lg:hidden text-sm font-semibold text-[#3B1F0E] rounded-sm hover:text-[#7D5A50] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] disabled:text-[#B4846C] disabled:cursor-not-allowed"
          >
            Reset all
          </button>
        </div>

        <!-- Bulk actions -->
        <div v-if="!isLoading && (branches.length > 1 || confirming)" class="mt-3">
          <div v-if="confirming" class="flex flex-col gap-2" role="group" aria-label="Confirm change">
            <p class="text-xs font-semibold text-[#3B1F0E]">
              <template v-if="confirming === 'hide-all'">Hide this {{ subject }} at all {{ branchCountLabel(branches.length) }}?</template>
              <template v-else>Set {{ branchCountLabel(exceptionCount) }} back to {{ defaultLabel }}?</template>
            </p>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="confirming === 'hide-all' ? setAllAvailability(false) : resetToDefault()"
                class="h-11 lg:h-8 rounded-lg bg-[#7D5A50] text-xs font-semibold text-[#FDF8F3] hover:bg-[#6A4B42] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#7D5A50]"
              >
                {{ confirming === 'hide-all' ? 'Hide all' : 'Reset' }}
              </button>
              <button
                type="button"
                @click="confirming = null"
                class="h-11 lg:h-8 rounded-lg border border-[#EEDFC4] bg-[#FDF8F3] text-xs font-semibold text-[#7D5A50] hover:bg-[#F5EAD4] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
              >
                Cancel
              </button>
            </div>
          </div>

          <div v-else class="grid grid-cols-2 gap-2">
            <button
              type="button"
              :disabled="allVisible || isBulkPending"
              @click="setAllAvailability(true)"
              class="h-11 lg:h-8 rounded-lg border border-[#EEDFC4] bg-[#FDF8F3] text-xs font-semibold text-[#7D5A50] hover:bg-[#F5EAD4] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] disabled:opacity-50 disabled:hover:bg-[#FDF8F3] disabled:cursor-not-allowed"
            >
              Show all
            </button>
            <button
              type="button"
              :disabled="noneVisible || isBulkPending"
              @click="confirming = 'hide-all'"
              class="h-11 lg:h-8 rounded-lg border border-[#EEDFC4] bg-[#FDF8F3] text-xs font-semibold text-[#7D5A50] hover:bg-[#F5EAD4] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50] disabled:opacity-50 disabled:hover:bg-[#FDF8F3] disabled:cursor-not-allowed"
            >
              Hide all
            </button>
          </div>
        </div>

        <div
          v-if="bulkError"
          role="alert"
          class="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          <Icon name="heroicons:exclamation-triangle" class="mt-px w-4 h-4 shrink-0" aria-hidden="true" />
          <p class="min-w-0 flex-1">{{ bulkError }}</p>
          <button
            type="button"
            @click="bulkError = null"
            class="-m-1 p-1 shrink-0 rounded outline-none hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-700"
          >
            <span class="sr-only">Dismiss</span>
            <Icon name="heroicons:x-mark" class="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>

    <div :id="listRegionId" :class="[showBody ? 'flex' : 'hidden lg:flex', 'min-h-0 flex-1 flex-col']">
      <!-- Filter -->
      <div v-if="!isLoading && showFilter" class="shrink-0 px-3 py-2.5 border-b border-[#F6EBDD]">
        <label class="relative block">
          <span class="sr-only">Filter branches</span>
          <Icon name="heroicons:magnifying-glass" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B4846C]" />
          <input
            v-model="filterQuery"
            type="search"
            placeholder="Filter branches"
            class="w-full h-11 lg:h-8 rounded-lg border border-[#EEDFC4] bg-[#FDF8F3] pl-8 pr-2.5 text-base lg:text-sm text-[#3B1F0E] placeholder-[#7D5A50] caret-[#7D5A50] outline-none focus:border-[#7D5A50] focus:ring-1 focus:ring-[#7D5A50] transition-shadow"
          >
        </label>
      </div>

      <!-- Loading: placeholder rows shaped like the real list -->
      <ul v-if="isLoading" aria-busy="true" class="divide-y divide-[#F6EBDD]">
        <li class="sr-only">Loading branches</li>
        <li v-for="n in 4" :key="n" aria-hidden="true" class="flex min-h-11 items-center justify-between gap-3 px-5 py-2.5">
          <span class="h-3 rounded bg-[#F6EBDD] motion-safe:animate-pulse" :style="{ width: `${[62, 48, 70, 54][n - 1]}%` }" />
          <span class="h-5 w-9 shrink-0 rounded-full bg-[#F6EBDD] motion-safe:animate-pulse" />
        </li>
      </ul>

      <div v-else-if="loadError" role="alert" class="px-5 py-6">
        <p class="text-sm font-semibold text-[#3B1F0E]">Couldn't load branches.</p>
        <p class="mt-1 text-xs text-[#7D5A50]">{{ loadError }}</p>
        <button
          type="button"
          @click="fetchBranches"
          class="mt-3 inline-flex h-11 lg:h-8 items-center gap-1.5 rounded-lg border border-[#EEDFC4] bg-[#FDF8F3] px-3 text-xs font-semibold text-[#7D5A50] hover:bg-[#F5EAD4] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
        >
          <Icon name="heroicons:arrow-path" class="w-4 h-4" aria-hidden="true" />
          Try again
        </button>
      </div>

      <div v-else-if="branches.length === 0" class="px-5 py-6">
        <p class="text-sm font-semibold text-[#3B1F0E]">No branches yet.</p>
        <p class="mt-1 text-xs text-[#7D5A50]">
          Add a branch in
          <NuxtLink to="/owner/cafes" class="font-semibold underline underline-offset-2 decoration-[#EEDFC4] hover:decoration-[#7D5A50] rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]">Cafe Management</NuxtLink>
          to control where this {{ subject }} is shown.
        </p>
      </div>

      <div v-else-if="visibleBranches.length === 0" class="px-5 py-6">
        <p class="text-sm text-[#7D5A50] [overflow-wrap:anywhere]">No branches match "{{ filterQuery.trim() }}".</p>
        <button
          type="button"
          @click="filterQuery = ''"
          class="mt-2 text-xs font-semibold text-[#7D5A50] underline underline-offset-2 decoration-[#EEDFC4] hover:decoration-[#7D5A50] rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
        >
          Clear filter
        </button>
      </div>

      <ul
        v-else
        :aria-busy="isBulkPending"
        class="min-h-0 flex-1 max-h-[60vh] lg:max-h-none overflow-y-auto overscroll-contain divide-y divide-[#F6EBDD] [scrollbar-width:thin] [scrollbar-color:#E5D5C3_transparent]"
      >
        <li v-for="branch in visibleBranches" :key="branch.branch_uuid">
          <button
            type="button"
            role="switch"
            :aria-checked="branch.is_available"
            :aria-disabled="pending.has(branch.branch_uuid) || isBulkPending"
            :aria-describedby="rowErrors[branch.branch_uuid] ? `${listRegionId}-err-${branch.branch_uuid}` : undefined"
            @click="toggleBranch(branch)"
            class="w-full min-h-11 flex items-center justify-between gap-3 px-5 py-2.5 text-left [@media(hover:hover)]:hover:bg-[#FBF2E1] active:bg-[#FBF2E1] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7D5A50] aria-disabled:cursor-wait"
          >
            <span class="min-w-0 text-[16px] [overflow-wrap:anywhere]">
              <span :class="branch.is_available ? 'font-medium text-[#3B1F0E]' : 'font-medium text-[#7D5A50]'">
                {{ branch.branch_name }}
              </span>
              <span
                v-if="rowErrors[branch.branch_uuid]"
                :id="`${listRegionId}-err-${branch.branch_uuid}`"
                class="mt-0.5 block text-[11px] font-medium leading-4 text-red-700"
              >
                Couldn't save. {{ rowErrors[branch.branch_uuid] }}
              </span>
            </span>

            <span
              aria-hidden="true"
              :class="[
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
                branch.is_available ? 'border-[#7D5A50] bg-[#7D5A50]' : 'border-[#B4846C] bg-white',
                pending.has(branch.branch_uuid) ? 'opacity-70' : ''
              ]"
            >
              <!-- Off: smaller filled knob so the state reads without relying on the track color -->
              <span
                :class="[
                  'inline-flex items-center justify-center rounded-full transition-[transform,width,height,background-color]',
                  branch.is_available
                    ? 'h-4 w-4 translate-x-[17px] bg-white shadow-sm'
                    : 'h-3.5 w-3.5 translate-x-[2px] bg-[#B4846C]'
                ]"
              >
                <Icon
                  v-if="pending.has(branch.branch_uuid)"
                  name="heroicons:arrow-path"
                  :class="['w-3 h-3 motion-safe:animate-spin', branch.is_available ? 'text-[#7D5A50]' : 'text-white']"
                />
              </span>
            </span>
          </button>
        </li>
      </ul>
    </div>

    <p role="status" aria-live="polite" class="sr-only">{{ announcement }}</p>
  </aside>
</template>
