import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { auth, get, message, post, type User } from './api'

type Item = Record<string, unknown> & { id: string; version?: number; title?: string; name?: string; status?: string; code?: string; issue_number?: string }
type Overview = { issues?: { open?: unknown; critical?: unknown }; clients?: { active?: unknown }; follow_ups?: { pending?: unknown; overdue?: unknown }; handoffs?: { pending?: unknown } }
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const label = (x: Item) => x.title || x.name || x.code || x.issue_number || x.id
const permissions = (user: User | undefined, permission: string) => !!user?.permissions.includes(permission)
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0

function State({ query, children }: { query: ReturnType<typeof useQuery<Item[]>>; children: (items: Item[]) => ReactNode }) {
  if (query.isPending) return <p role="status">Loading...</p>
  if (query.isError) return <p role="alert">{message(query.error)}</p>
  return query.data?.length ? <>{children(query.data)}</> : <p>No records.</p>
}
function Login() {
  const nav = useNavigate(); const [error, setError] = useState(''); const mutation = useMutation({ mutationFn: ({ email, password }: { email: string; password: string }) => auth.login(email, password), onSuccess: () => nav('/dashboard') })
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const data = new FormData(e.currentTarget); setError(''); mutation.mutate({ email: String(data.get('email')), password: String(data.get('password')) }, { onError: e => setError(message(e)) }) }
  return <main className="login"><form onSubmit={submit} className="card"><p className="eyebrow">ClientOps</p><h1>Sign in</h1><label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Password<input name="password" type="password" required minLength={8} autoComplete="current-password" /></label>{error && <p role="alert">{error}</p>}<button disabled={mutation.isPending}>{mutation.isPending ? 'Signing in...' : 'Sign in'}</button></form></main>
}
function Shell() {
  const nav = useNavigate(); const me = useQuery({ queryKey: ['me'], queryFn: auth.me }); const logout = useMutation({ mutationFn: auth.logout, onSuccess: () => { client.clear(); nav('/login') } })
  if (me.isPending) return <main><p role="status">Loading session...</p></main>
  if (me.isError) return <Navigate to="/login" replace />
  return <div className="app-shell"><header className="app-header"><NavLink className="brand" to="/dashboard">ClientOps</NavLink><nav aria-label="Main navigation">{['dashboard', 'clients', 'issues', 'releases', 'handoffs', 'follow-ups'].map(x => <NavLink key={x} to={`/${x}`}>{x.replace('-', ' ')}</NavLink>)}</nav><div className="account"><span>{me.data.name}</span><button onClick={() => logout.mutate()} disabled={logout.isPending}>Sign out</button></div></header><main><Outlet context={me.data} /></main></div>
}
function Dashboard() {
  const query = useQuery<Overview>({ queryKey: ['dashboard', 'overview'], queryFn: () => get('/dashboard/overview') })
  if (query.isPending) return <section className="dashboard"><p role="status">Loading dashboard...</p></section>
  if (query.isError) return <section className="dashboard"><h1>Dashboard</h1><p role="alert">{message(query.error)}</p></section>
  const overview = query.data || {}
  const metrics = [
    ['Open issues', number(overview.issues?.open), '/issues', 'Issues not closed or cancelled'],
    ['Critical issues', number(overview.issues?.critical), '/issues', 'Open issues requiring attention'],
    ['Active clients', number(overview.clients?.active), '/clients', 'Clients in active service'],
    ['Pending handoffs', number(overview.handoffs?.pending), '/handoffs', 'Release impacts awaiting operations'],
    ['Pending follow-ups', number(overview.follow_ups?.pending), '/follow-ups', 'Client actions still open'],
    ['Overdue follow-ups', number(overview.follow_ups?.overdue), '/follow-ups', 'Follow-ups past their due date'],
  ]
  return <section className="dashboard"><div className="dashboard-heading"><p className="eyebrow">Operational overview</p><h1>Keep delivery visible.</h1><p>Track work from client report through operational completion.</p></div><div className="metric-grid">{metrics.map(([label, value, to, detail]) => <NavLink key={label} className="metric-card" to={to as string}><span>{label}</span><strong>{value}</strong><small>{detail}</small></NavLink>)}</div></section>
}
function List({ path, title, create, render }: { path: string; title: string; create?: ReactNode; render?: (x: Item) => ReactNode }) {
  const q = useQuery<Item[]>({ queryKey: [path], queryFn: () => get(path) }); return <section><div className="title"><h1>{title}</h1>{create}</div><State query={q}>{items => <ul className="records">{items.map(x => <li key={x.id}>{render?.(x) || <><strong>{label(x)}</strong><small>{x.status || ''}</small></>}</li>)}</ul>}</State></section>
}
function Create({ path, fields, done }: { path: string; fields: { name: string; label: string; type?: string; options?: string[] }[]; done?: () => void }) {
  const cache = useQueryClient(); const [error, setError] = useState(''); const mutation = useMutation({ mutationFn: (data: Record<string, unknown>) => post(path, data), onSuccess: () => { cache.invalidateQueries({ queryKey: [path] }); done?.() } })
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const form = new FormData(e.currentTarget); const data = Object.fromEntries(form); setError(''); mutation.mutate(data, { onError: e => setError(message(e)) }) }
  return <form onSubmit={submit} className="card create">{fields.map(f => <label key={f.name}>{f.label}{f.options ? <select name={f.name} required><option value="">Select</option>{f.options.map(o => <option key={o}>{o}</option>)}</select> : <input name={f.name} type={f.type || 'text'} required />}</label>)}{error && <p role="alert">{error}</p>}<button disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Create'}</button></form>
}
function Clients() { const [open, setOpen] = useState(false); return <><List path="/clients" title="Clients" create={<button onClick={() => setOpen(!open)}>New client</button>} render={x => <><strong>{label(x)}</strong><small>{String(x.type || '')} {String(x.status || '')}</small></>} />{open && <Create path="/clients" done={() => setOpen(false)} fields={[{ name: 'code', label: 'Code' }, { name: 'name', label: 'Name' }, { name: 'type', label: 'Type', options: ['ELEMENTARY', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'VOCATIONAL', 'OTHER'] }]} />}</> }
function Issues() { const [open, setOpen] = useState(false); return <><List path="/issues" title="Issues" create={<button onClick={() => setOpen(!open)}>New issue</button>} render={x => <NavLink to={`/issues/${x.id}`}><strong>{label(x)}</strong><small>{String(x.status || '')} {String(x.severity || '')}</small></NavLink>} />{open && <Create path="/issues" done={() => setOpen(false)} fields={[{ name: 'client_id', label: 'Client ID' }, { name: 'title', label: 'Title' }, { name: 'description', label: 'Description' }, { name: 'severity', label: 'Severity', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }]} />}</> }
const actions: Record<string, string> = { REPORTED: 'triage', TRIAGED: 'start-investigation', INVESTIGATING: 'start-development', IN_DEVELOPMENT: 'mark-qa', QA: 'mark-released', RELEASED: 'start-follow-up', FOLLOW_UP: 'close' }
function IssueDetail() { const { id = '' } = useParams(); const cache = useQueryClient(); const q = useQuery<Item>({ queryKey: ['issue', id], queryFn: () => get(`/issues/${id}`) }); const action = useMutation({ mutationFn: (name: string) => post(`/issues/${id}/${name}`, { version: q.data?.version }), onSuccess: () => cache.invalidateQueries({ queryKey: ['issue', id] }) }); if (q.isPending) return <p role="status">Loading...</p>; if (q.isError || !q.data) return <p role="alert">{message(q.error)}</p>; const next = actions[String(q.data.status)]; return <section><h1>{label(q.data)}</h1><dl>{Object.entries(q.data).filter(([k]) => ['status', 'severity', 'description', 'version'].includes(k)).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl>{next && <button disabled={action.isPending} onClick={() => action.mutate(next)}>{action.isPending ? 'Updating...' : next.replaceAll('-', ' ')}</button>}{action.isError && <p role="alert">{message(action.error)}</p>}</section> }
function Releases() { const [open, setOpen] = useState(false); return <><List path="/releases" title="Releases" create={<button onClick={() => setOpen(!open)}>New release</button>} />{open && <Create path="/releases" done={() => setOpen(false)} fields={[{ name: 'version', label: 'Version' }, { name: 'title', label: 'Title' }, { name: 'summary', label: 'Summary' }]} />}</> }
function Operations({ followUps = false }: { followUps?: boolean }) { const path = followUps ? '/follow-ups' : '/handoffs'; return <List path={path} title={followUps ? 'Follow-ups' : 'Handoffs'} render={x => <><strong>{label(x)}</strong><small>{String(x.status || '')}</small></>} /> }
export default function App() { return <QueryClientProvider client={client}><Routes><Route path="/login" element={<Login />} /><Route element={<Shell />}><Route path="/dashboard" element={<Dashboard />} /><Route path="/clients" element={<Clients />} /><Route path="/issues" element={<Issues />} /><Route path="/issues/:id" element={<IssueDetail />} /><Route path="/releases" element={<Releases />} /><Route path="/handoffs" element={<Operations />} /><Route path="/follow-ups" element={<Operations followUps />} /></Route><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></QueryClientProvider> }
