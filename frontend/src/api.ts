import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toast } from './components/ui/toast'

export type Envelope<T> = { success: boolean; data: T; message: string; meta?: { page: number; limit: number; total: number; total_pages: number } }
export type User = { id: string; name: string; email: string; roles: string[]; permissions: string[] }
export type APIError = { code?: string; details?: unknown; request_id?: string; message?: string }

export const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const api = axios.create({ baseURL: apiBase, withCredentials: true })
let refresh: Promise<void> | null = null

function csrf() { return document.cookie.split('; ').find(v => v.startsWith('clientops_csrf='))?.split('=')[1] }
async function issueCSRF() { await api.get('/auth/csrf') }

api.interceptors.request.use(async config => {
  if (!['get', 'head', 'options'].includes(config.method?.toLowerCase() || '')) {
    if (!csrf()) await issueCSRF()
    config.headers.set('X-CSRF-Token', csrf() || '')
  }
  return config
})

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const request = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
  if (error.response?.status !== 401 || !request || request._retried || request.url?.includes('/auth/')) throw error
  request._retried = true
  refresh ??= api.post('/auth/refresh').then(() => undefined).catch(error => {
    window.dispatchEvent(new Event('clientops:session-expired'))
    throw error
  }).finally(() => { refresh = null })
  await refresh
  return api(request)
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    if (status === 429) {
      const retryAfter = (error.response?.headers as Record<string, string> | undefined)?.['retry-after']
      toast.error(retryAfter ? `Too many requests. Try again in ${retryAfter}s.` : 'Too many requests. Try again shortly.')
    } else if (status === 500) {
      toast.error('Something went wrong. Please try again.')
    } else if (!error.response) {
      toast.error('Network error. Check your connection.')
    }
    throw error
  },
)

export const error = (value: unknown): APIError => axios.isAxiosError(value) ? ((value.response?.data as { error?: APIError })?.error || { message: (value.response?.data as { message?: string })?.message }) : {}
export const fieldErrors = (value: unknown): Record<string, string> => {
  const details = error(value).details as { fields?: Record<string, string[] | string> } | undefined
  const fields = details?.fields
  if (!fields || typeof fields !== 'object') return {}
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]))
}
export const message = (value: unknown) => {
  const detail = error(value)
  return detail.message || ({ PERMISSION_DENIED: 'Permission denied', VALIDATION_ERROR: 'Check the highlighted fields', RATE_LIMIT_EXCEEDED: 'Too many requests. Try again shortly' }[detail.code || '']) || 'Request failed'
}
export const get = <T>(url: string) => api.get<Envelope<T>>(url).then(r => r.data.data)
export const getPage = <T>(url: string) => api.get<Envelope<T>>(url).then(r => r.data)
export const post = <T>(url: string, data?: unknown) => api.post<Envelope<T>>(url, data).then(r => r.data.data)
export const patch = <T>(url: string, data?: unknown) => api.patch<Envelope<T>>(url, data).then(r => r.data.data)
export const put = <T>(url: string, data?: unknown) => api.put<Envelope<T>>(url, data).then(r => r.data.data)
export const del = (url: string) => api.delete(url)
export const upload = <T>(url: string, file: File) => { const data = new FormData(); data.append('file', file); return api.post<Envelope<T>>(url, data).then(r => r.data.data) }
export const auth = {
  me: () => get<User>('/auth/me'),
  login: (email: string, password: string) => post<User>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  sessions: () => get<Session[]>('/auth/sessions'),
  revokeSession: (id: string) => del(`/auth/sessions/${id}`),
}
export type Session = { id: string; user_id?: string; user_agent?: string; ip_address?: string; created_at: string; last_used_at: string; expires_at: string; current: boolean }
export default api
