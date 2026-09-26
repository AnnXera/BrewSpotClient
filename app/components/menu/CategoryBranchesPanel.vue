<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'

const props = defineProps<{
  categoryUuid: string
}>()

interface BranchStatus {
  branch_uuid: string
  branch_name: string
  is_available: boolean
  has_override: boolean
}

const menuService = useMenuService()

const branches = ref<BranchStatus[]>([])
const isLoading = ref(true)
const pending = ref<Set<string>>(new Set())

const activeCount = computed(() => branches.value.filter(b => b.is_available).length)

async function fetchBranches() {
  isLoading.value = true
  try {
    const res = await menuService.getCategoryBranchesStatus(props.categoryUuid)
    branches.value = res.branches || []
  } catch (error) {
    console.error('Failed to fetch category branches', error)
    branches.value = []
  } finally {
    isLoading.value = false
  }
}

async function toggleBranch(branch: BranchStatus) {
  if (pending.value.has(branch.branch_uuid)) return

  const next = !branch.is_available
  branch.is_available = next
  pending.value.add(branch.branch_uuid)

  try {
    const res = await menuService.updateCategoryBranch(props.categoryUuid, branch.branch_uuid, { is_available: next })
    branch.has_override = res.branch.has_override
  } catch (error) {
    console.error('Failed to update branch availability', error)
    branch.is_available = !next
    alert('Failed to update branch availability. Please try again.')
  } finally {
    pending.value.delete(branch.branch_uuid)
  }
}

watch(() => props.categoryUuid, fetchBranches, { immediate: true })
</script>

<template>
  <aside class="w-full lg:w-64 shrink-0 self-start order-first lg:order-none lg:sticky lg:top-6 bg-white rounded-2xl border border-[#EEDFC4] shadow-sm overflow-hidden">
    <header class="px-5 py-4 border-b border-[#EEDFC4]">
      <div class="flex items-baseline justify-between gap-2">
        <h2 class="font-display font-bold text-lg text-[#3D2B24]">Branches</h2>
        <span v-if="!isLoading && branches.length > 0" class="text-xs font-semibold text-[#B4846C] whitespace-nowrap">
          {{ activeCount }} of {{ branches.length }} active
        </span>
      </div>
      <p class="text-xs text-[#B4846C] mt-1">Choose where this category is shown.</p>
    </header>

    <div v-if="isLoading" class="flex justify-center py-6">
      <Icon name="heroicons:arrow-path" class="w-5 h-5 text-[#7D5A50] animate-spin" />
    </div>

    <p v-else-if="branches.length === 0" class="px-5 py-6 text-sm text-[#B4846C]">No branches found.</p>

    <ul v-else class="divide-y divide-[#F6EBDD]">
      <li v-for="branch in branches" :key="branch.branch_uuid">
        <button
          type="button"
          role="switch"
          :aria-checked="branch.is_available"
          :aria-label="`Toggle ${branch.branch_name}`"
          :disabled="pending.has(branch.branch_uuid)"
          @click="toggleBranch(branch)"
          class="w-full flex flex-col gap-1 px-5 py-3 text-left hover:bg-[#FBF2E1] transition-colors disabled:cursor-wait"
        >
          <span
            :class="[
              'block break-words text-sm',
              branch.is_available ? 'font-semibold text-[#3D2B24]' : 'font-normal text-[#B4846C]'
            ]"
          >
            {{ branch.branch_name }}
          </span>

          <span class="flex items-center justify-between gap-3">
            <span class="text-[11px] text-[#B4846C]">
              {{ branch.is_available ? 'Visible' : 'Hidden' }}
            </span>

            <span
              aria-hidden="true"
              :class="[
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                branch.is_available ? 'bg-[#7D5A50]' : 'bg-[#E5D5C3]',
                pending.has(branch.branch_uuid) ? 'opacity-60' : ''
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                  branch.is_available ? 'translate-x-[18px]' : 'translate-x-0.5'
                ]"
              />
            </span>
          </span>
        </button>
      </li>
    </ul>
  </aside>
</template>
