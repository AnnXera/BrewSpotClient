// app/composables/useFloorPlanDialog.ts
// One dialog at a time for the floor plan editor. `open` resolves with the id of the action
// the user picked ('dismiss' for Escape, the scrim or the close button, 'item:<id>' for a "Show" on a listed item).
export type DialogTone = 'warn' | 'danger' | 'info'

export interface DialogAction {
  id: string
  label: string
  variant: 'primary' | 'danger' | 'quiet'
}

export interface DialogItem {
  id: string
  label: string
  detail: string
}

export interface DialogSpec {
  tone: DialogTone
  icon: string
  title: string
  message: string
  items?: DialogItem[]
  actions: DialogAction[]
  focus?: string // action id that gets focus first; the first action otherwise
}

export function useFloorPlanDialog() {
  const spec = ref<DialogSpec | null>(null)
  let settle: ((id: string) => void) | null = null

  function open(next: DialogSpec): Promise<string> {
    settle?.('dismiss') // a newer dialog replaces an unanswered one
    spec.value = next
    return new Promise((resolve) => {
      settle = resolve
    })
  }

  function close(id: string) {
    const done = settle
    settle = null
    spec.value = null
    done?.(id)
  }

  return { spec, open, close }
}
