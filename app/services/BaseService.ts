//app/services/BaseService.ts
import type { $Fetch } from 'nitropack'

export abstract class BaseService {
    constructor(protected readonly client: $Fetch) { }

    protected get<T = any>(url: string, params?: Record<string, any>) {
        return this.client<T>(url, { method: 'GET', params })
    }

    protected post<T = any>(url: string, body?: Record<string, any> | FormData) {
        return this.client<T>(url, { method: 'POST', body })
    }

    protected patch<T = any>(url: string, body?: Record<string, any>) {
        return this.client<T>(url, { method: 'PATCH', body })
    }

    protected delete<T = any>(url: string) {
        return this.client<T>(url, { method: 'DELETE' })
    }
}