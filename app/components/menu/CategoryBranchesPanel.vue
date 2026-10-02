<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import BranchAvailabilityPanel from '~/components/menu/BranchAvailabilityPanel.vue'

const props = defineProps<{
  categoryUuid: string
}>()

const menuService = useMenuService()

async function load() {
  const res = await menuService.getCategoryBranchesStatus(props.categoryUuid)
  return {
    defaultAvailable: res.category ? Boolean(res.category.is_available) : null,
    name: res.category?.name || '',
    branches: res.branches || [],
  }
}

async function update(branchUuid: string, next: boolean) {
  const res = await menuService.updateCategoryBranch(props.categoryUuid, branchUuid, { is_available: next })
  return res.branch
}
</script>

<template>
  <BranchAvailabilityPanel
    :source-key="categoryUuid"
    subject="category"
    :load="load"
    :update="update"
  />
</template>
