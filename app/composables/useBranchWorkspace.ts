// app/composables/useBranchWorkspace.ts
// Shared setup for the branch screens a Manager and a Cafe Owner both use (servings,
// reservations, floor plan). The API routes exist under /manager and /owner; the
// signed-in role picks the scope, the sidebar and the branch list. A manager runs the
// branch they are assigned to; an owner picks any of their branches, and the choice is
// kept in a cookie (and the ?branch= query) so it follows them between these screens.
import { useAuthStore } from '~/stores/auth'

export interface WorkspaceBranch {
  uuid: string
  branch_name: string
  address?: string | null
  status?: string
}

const OWNER_BRANCH_LIMIT = 100

export function useBranchWorkspace() {
  const authStore = useAuthStore()
  const route = useRoute()
  const router = useRouter()
  const api = useApi()

  const isOwner = authStore.role === 'Cafe Owner'
  const scope: 'owner' | 'manager' = isOwner ? 'owner' : 'manager'
  const basePath = `/${scope}`
  const links = isOwner ? OWNER_NAV_LINKS : MANAGER_NAV_LINKS
  const lockAudience: 'owner' | 'staff' = isOwner ? 'owner' : 'staff'
  const noBranchMessage = isOwner ? 'Add a branch to your cafe first.' : 'You are not assigned to a branch yet.'

  const branches = ref<WorkspaceBranch[]>([])
  const branchUuid = ref('')
  const remembered = useCookie<string | null>('owner_workspace_branch', { sameSite: 'lax' })

  async function fetchBranches(): Promise<WorkspaceBranch[]> {
    if (!isOwner) {
      const res = await api<{ success: boolean; branches: WorkspaceBranch[] }>('/manager/branches')
      return res.branches
    }
    const res = await api<{ success: boolean; branches: { data: WorkspaceBranch[] } }>('/owner/branches', {
      params: { per_page: OWNER_BRANCH_LIMIT },
    })
    // Active branches first, then by name, so the default pick is one that is running.
    return [...res.branches.data].sort((a, b) =>
      Number(b.status === 'active') - Number(a.status === 'active') || a.branch_name.localeCompare(b.branch_name),
    )
  }

  // Loads the branch list and picks the starting branch. Returns false when there is none.
  async function loadBranches(): Promise<boolean> {
    branches.value = await fetchBranches()
    if (!branches.value.length) return false

    const has = (uuid: unknown) => typeof uuid === 'string' && branches.value.some(b => b.uuid === uuid)
    const wanted = isOwner ? [route.query.branch, remembered.value].find(has) : undefined
    branchUuid.value = (wanted as string | undefined) ?? branches.value[0]!.uuid
    return true
  }

  if (isOwner) {
    watch(branchUuid, (uuid) => {
      if (!uuid) return
      remembered.value = uuid
      // Keep route.path: a name-based replace would resolve the /owner alias back to /manager.
      if (route.query.branch !== uuid) router.replace({ path: route.path, query: { ...route.query, branch: uuid } })
    })
  }

  const branchOptions = computed(() =>
    branches.value.map(b => ({
      value: b.uuid,
      label: b.branch_name,
      hint: b.status && b.status !== 'active' ? b.status.replace(/_/g, ' ') : undefined,
    })),
  )

  const branchName = computed(() => branches.value.find(b => b.uuid === branchUuid.value)?.branch_name ?? '')

  // The branch picker is only shown to owners with more than one branch.
  const showBranchPicker = computed(() => isOwner && branches.value.length > 1)

  return {
    isOwner,
    scope,
    basePath,
    links,
    lockAudience,
    noBranchMessage,
    branches,
    branchUuid,
    branchName,
    branchOptions,
    showBranchPicker,
    loadBranches,
  }
}
