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
    await menuService.updateCategoryBranch(props.categoryUuid, branch.branch_uuid, { is_available: next })
    branch.has_override = true
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
  <aside class="bg-white border border-[#F2E0D4] rounded-2xl px-[22px] py-[18px] flex flex-col gap-4 w-full lg:w-[249px] shrink-0 self-start">
    <h2 class="font-display font-bold text-xl text-[#3D2B24]">Branches</h2>

    <div v-if="isLoading" class="flex justify-center py-4">
      <Icon name="heroicons:arrow-path" class="w-5 h-5 text-[#7D5A50] animate-spin" />
    </div>

    <p v-else-if="branches.length === 0" class="text-sm text-[#B4846C]">No branches found.</p>

    <ul v-else class="flex flex-col gap-1.5">
      <li
        v-for="branch in branches"
        :key="branch.branch_uuid"
        class="flex items-center justify-between gap-3"
      >
        <span
          :class="[
            'text-base truncate',
            branch.is_available ? 'font-semibold text-[#7D5A50]' : 'font-normal text-[#D2D5DA]'
          ]"
        >
          {{ branch.branch_name }}
        </span>

        <button
          type="button"
          role="switch"
          :aria-checked="branch.is_available"
          :aria-label="`Toggle ${branch.branch_name}`"
          :disabled="pending.has(branch.branch_uuid)"
          @click="toggleBranch(branch)"
          :class="[
            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 disabled:cursor-wait',
            branch.is_available ? 'bg-[#7D5A50]' : 'bg-[#D2D5DA]'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              branch.is_available ? 'translate-x-[18px]' : 'translate-x-0.5'
            ]"
          />
        </button>
      </li>
    </ul>
  </aside>
</template>
