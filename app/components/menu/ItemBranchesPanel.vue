<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import BranchAvailabilityPanel from '~/components/menu/BranchAvailabilityPanel.vue'

const props = defineProps<{
  itemUuid: string
}>()

const menuService = useMenuService()

async function load() {
  const res = await menuService.getItemBranchesStatus(props.itemUuid)
  return {
    defaultAvailable: res.item ? Boolean(res.item.is_available) : null,
    name: res.item?.name || '',
    branches: res.branches || [],
  }
}

async function update(branchUuid: string, next: boolean) {
  const res = await menuService.updateItemBranch(props.itemUuid, branchUuid, { is_available: next })
  return res.branch
}
</script>

<template>
  <BranchAvailabilityPanel
    :source-key="itemUuid"
    subject="item"
    variant="card"
    :load="load"
    :update="update"
  />
</template>
