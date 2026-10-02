//app/composables/useSetupPasswordDraft.ts
// Holds a manager's chosen password in memory between the password page and
// the PIN page, so both are sent in one request. Never persisted: a refresh
// on the PIN page sends them back to re-enter the password.
export interface SetupPasswordDraft {
    uuid: string
    password: string
    passwordConfirmation: string
}

export function useSetupPasswordDraft() {
    return useState<SetupPasswordDraft | null>('setup-password-draft', () => null)
}
