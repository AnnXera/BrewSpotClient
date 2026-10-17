//app/composables/usePosDeviceToken.ts
// Persistent cookie so a registered register survives browser restarts.
// Without maxAge it would be a session cookie and the device would need setup again every day.
export function usePosDeviceToken() {
    return useCookie<string | null>('pos_device_token', {
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: !import.meta.dev,
    })
}
