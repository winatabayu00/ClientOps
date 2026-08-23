import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

export type Envelope<T> = { success: boolean; data: T; message: string; meta?: { page: number; limit: number; total: number; total_pages: number } }
export type User = { id: string; name: string; email: string; roles: string[]; permissions: string[] }

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1', withCredentials: true })
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
  refresh ??= api.post('/auth/refresh').then(() => undefined).finally(() => { refresh = null })
  await refresh
  return api(request)
})

export const message = (error: unknown) => (axios.isAxiosError(error) ? (error.response?.data as { message?: string })?.message : null) || 'Request failed'
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
