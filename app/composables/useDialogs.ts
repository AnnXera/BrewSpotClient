import { ref } from 'vue'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  isDestructive?: boolean
  onConfirm: () => void | Promise<void>
}

// State for the common ConfirmModal / AlertModal pair, replacing window.confirm and window.alert.
export function useDialogs() {
  const confirmDialog = ref({
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDestructive: false,
    onConfirm: (() => {}) as () => void | Promise<void>,
  })

  const alertDialog = ref({ show: false, title: '', message: '' })

  function askConfirm(options: ConfirmOptions) {
    confirmDialog.value = {
      show: true,
      confirmText: 'Confirm',
      isDestructive: false,
      ...options,
    }
  }

  function runConfirm() {
    const handler = confirmDialog.value.onConfirm
    confirmDialog.value.show = false
    handler()
  }

  function showAlert(title: string, message: string) {
    alertDialog.value = { show: true, title, message }
  }

  return { confirmDialog, alertDialog, askConfirm, runConfirm, showAlert }
}
