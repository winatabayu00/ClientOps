import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  auth,
  del,
  get,
  getPage,
  message,
  patch,
  post,
  put,
	  upload,
  type Envelope,
  type Session,
  type User,
} from "./api";

type Item = Record<string, unknown> & {
  id: string;
  version?: number;
  title?: string;
  name?: string;
  status?: string;
  code?: string;
  issue_number?: string;
};
type Overview = {
  issues?: { open?: unknown; critical?: unknown };
  clients?: { active?: unknown };
  follow_ups?: { pending?: unknown; overdue?: unknown };
  handoffs?: { pending?: unknown };
};
type Notification = { id: string; title: string; message: string; read_at: string | null; created_at: string; entity_type?: string; entity_id?: string };
type Attachment = { id: string; filename: string; content_type: string; size_bytes: number; created_at: string };
const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
const apiBase = import.meta.env.VITE_API_URL || "/api/v1";
const label = (x: Item) =>
  x.title || x.name || x.code || x.issue_number || x.id;
const permissions = (user: User | undefined, permission: string) =>
  !!user?.permissions.includes(permission);
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

function State({
  query,
  children,
}: {
  query: ReturnType<typeof useQuery<Item[]>>;
  children: (items: Item[]) => ReactNode;
}) {
  if (query.isPending) return <p role="status">Loading...</p>;
  if (query.isError) return <p role="alert">{message(query.error)}</p>;
  return query.data?.length ? <>{children(query.data)}</> : <p>No records.</p>;
}
function Login() {
  const nav = useNavigate();
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      auth.login(email, password),
    onSuccess: () => nav("/dashboard"),
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError("");
    mutation.mutate(
      {
        email: String(data.get("email")),
        password: String(data.get("password")),
      },
      { onError: (e) => setError(message(e)) },
    );
  }
  return (
    <main className="login">
      <form onSubmit={submit} className="card">
        <p className="eyebrow">ClientOps</p>
        <h1>Sign in</h1>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button disabled={mutation.isPending}>
          {mutation.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
function Shell() {
  const nav = useNavigate();
  useEffect(() => {
    const expired = () => { client.clear(); nav("/login", { replace: true }); };
    window.addEventListener("clientops:session-expired", expired);
    return () => window.removeEventListener("clientops:session-expired", expired);
  }, [nav]);
  const me = useQuery({ queryKey: ["me"], queryFn: auth.me });
  const logout = useMutation({
    mutationFn: auth.logout,
    onSuccess: () => {
      client.clear();
      nav("/login");
    },
  });
  const unread = useQuery<{ count: number }>({ queryKey: ["notifications", "unread-count"], queryFn: () => get("/notifications/unread-count") });
  if (me.isPending)
    return (
      <main>
        <p role="status">Loading session...</p>
      </main>
    );
  if (me.isError) return <Navigate to="/login" replace />;
  const links: [string, string, string[]][] = [
    ["dashboard", "dashboard", []],
    ["clients", "clients", ["client.read"]],
    ["issues", "issues", ["issue.read"]],
    ["feature requests", "feature-requests", ["feature_request.read"]],
    ["releases", "releases", ["release.read"]],
    ["handoffs", "handoffs", ["handoff.read", "issue.follow_up"]],
    ["follow ups", "follow-ups", ["client_followup.read", "issue.follow_up"]],
    ["documentation", "documentation", ["documentation.read"]],
    ["management", "management", ["user.manage", "role.manage", "audit.read"]],
  ];
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="brand" to="/dashboard">
          ClientOps
        </NavLink>
        <nav aria-label="Main navigation">
          {links
            .filter(
              ([, , needed]) =>
                !needed.length || needed.some((p) => permissions(me.data, p)),
            )
            .map(([label, path]) => (
              <NavLink key={path} to={`/${path}`}>
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="account">
          <NavLink to="/notifications" aria-label="Notifications">Bell{unread.data?.count ? ` (${unread.data.count})` : ""}</NavLink>
          <span>{me.data.name}</span>
          <button onClick={() => logout.mutate()} disabled={logout.isPending}>
            Sign out
          </button>
        </div>
      </header>
      <main>
        <Outlet context={me.data} />
      </main>
    </div>
  );
}
function Notifications() {
  const queryClient = useQueryClient();
  const query = useQuery<Notification[]>({ queryKey: ["notifications"], queryFn: () => get<Notification[]>("/notifications") });
  const markRead = useMutation({ mutationFn: (id: string) => post(`/notifications/${id}/read`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const markAll = useMutation({ mutationFn: () => post("/notifications/read-all"), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  if (query.isPending) return <section><p role="status">Loading notifications...</p></section>;
  if (query.isError) return <section><h1>Notifications</h1><p role="alert">{message(query.error)}</p></section>;
  return <section><div className="title"><h1>Notifications</h1><button onClick={() => markAll.mutate()} disabled={markAll.isPending}>Mark all read</button></div>{query.data?.length ? <ul className="records">{query.data.map((n) => <li key={n.id}><strong>{n.title}</strong><small>{n.message}</small>{!n.read_at && <button onClick={() => markRead.mutate(n.id)} disabled={markRead.isPending}>Mark read</button>}</li>)}</ul> : <p>No notifications.</p>}</section>;
}
function Dashboard() {
  const query = useQuery<Overview>({
    queryKey: ["dashboard", "overview"],
    queryFn: () => get("/dashboard/overview"),
  });
  if (query.isPending)
    return (
      <section className="dashboard">
        <p role="status">Loading dashboard...</p>
      </section>
    );
  if (query.isError)
    return (
      <section className="dashboard">
        <h1>Dashboard</h1>
        <p role="alert">{message(query.error)}</p>
      </section>
    );
  const overview = query.data || {};
  const metrics = [
    [
      "Open issues",
      number(overview.issues?.open),
      "/issues",
      "Issues not closed or cancelled",
    ],
    [
      "Critical issues",
      number(overview.issues?.critical),
      "/issues",
      "Open issues requiring attention",
    ],
    [
      "Active clients",
      number(overview.clients?.active),
      "/clients",
      "Clients in active service",
    ],
    [
      "Pending handoffs",
      number(overview.handoffs?.pending),
      "/handoffs",
      "Release impacts awaiting operations",
    ],
    [
      "Pending follow-ups",
      number(overview.follow_ups?.pending),
      "/follow-ups",
      "Client actions still open",
    ],
    [
      "Overdue follow-ups",
      number(overview.follow_ups?.overdue),
      "/follow-ups",
      "Follow-ups past their due date",
    ],
  ];
  return (
    <section className="dashboard">
      <div className="dashboard-heading">
        <p className="eyebrow">Operational overview</p>
        <h1>Keep delivery visible.</h1>
        <p>Track work from client report through operational completion.</p>
      </div>
      <div className="metric-grid">
        {metrics.map(([label, value, to, detail]) => (
          <NavLink key={label} className="metric-card" to={to as string}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </NavLink>
        ))}
      </div>
    </section>
  );
}
function List({
  path,
  title,
  create,
  render,
}: {
  path: string;
  title: string;
  create?: ReactNode;
  render?: (x: Item) => ReactNode;
}) {
  const q = useQuery<Item[]>({ queryKey: [path], queryFn: () => get(path) });
  return (
    <section>
      <div className="title">
        <h1>{title}</h1>
        {create}
      </div>
      <State query={q}>
        {(items) => (
          <ul className="records">
            {items.map((x) => (
              <li key={x.id}>
                {render?.(x) || (
                  <>
                    <strong>{label(x)}</strong>
                    <small>{x.status || ""}</small>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </State>
    </section>
  );
}
function Create({
  path,
  fields,
  done,
}: {
  path: string;
  fields: { name: string; label: string; type?: string; options?: string[] }[];
  done?: () => void;
}) {
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => post(path, data),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: [path] });
      done?.();
    },
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form);
    setError("");
    mutation.mutate(data, { onError: (e) => setError(message(e)) });
  }
  return (
    <form onSubmit={submit} className="card create">
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          {f.options ? (
            <select name={f.name} required>
              <option value="">Select</option>
              {f.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input name={f.name} type={f.type || "text"} required />
          )}
        </label>
      ))}
      {error && <p role="alert">{error}</p>}
      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Saving..." : "Create"}
      </button>
    </form>
  );
}
type Client = Item & {
  code?: string;
  type?: string;
  province?: string;
  city?: string;
  address?: string;
	  health?: Health;
};
type Health = { score: number; classification: "HEALTHY" | "ATTENTION" | "AT_RISK"; factors: { code: string; impact: number; description: string }[]; calculated_at: string };
type Page<T> = { data: T[] };
const clientTypes = [
  "ELEMENTARY",
  "JUNIOR_HIGH",
  "SENIOR_HIGH",
  "VOCATIONAL",
  "OTHER",
];
const clientStatuses = ["ACTIVE", "ONBOARDING", "INACTIVE"];
function clientPage(url: string) {
  return get<Client[]>(url).then((data) => ({ data }) as Page<Client>);
}
function Clients() {
  const user = useOutletContext<User>();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const query = useQuery<Page<Client>>({
    queryKey: ["clients", params.toString()],
    queryFn: () => clientPage(`/clients?${params}`),
  });
  const users = useQuery<User[]>({
    queryKey: ["users", "client-owner-selector"],
    queryFn: () => get("/users"),
    enabled: open && permissions(user, "client.assign_owner"),
  });
  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => post("/clients", data),
    onSuccess: () => {
      setOpen(false);
      query.refetch();
    },
  });
  const canCreate = permissions(user, "client.create");
  const page = Number(params.get("page") || 1);
  function filters(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = new URLSearchParams();
    new FormData(e.currentTarget).forEach((value, key) => {
      if (value) next.set(key, String(value));
    });
    next.set("page", "1");
    setParams(next);
  }
  function move(next: number) {
    const p = new URLSearchParams(params);
    p.set("page", String(next));
    setParams(p);
  }
  return (
    <section className="clients-workspace">
      <div className="title">
        <div>
          <p className="eyebrow">Client directory</p>
          <h1>Client workspace</h1>
        </div>
        {canCreate && (
          <button onClick={() => setOpen(!open)}>
            {open ? "Cancel" : "New client"}
          </button>
        )}
      </div>
      <form className="client-filters" onSubmit={filters}>
        <label>
          Search
          <input
            name="search"
            defaultValue={params.get("search") || ""}
            placeholder="Name or code"
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={params.get("status") || ""}>
            <option value="">All statuses</option>
            {clientStatuses.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select name="type" defaultValue={params.get("type") || ""}>
            <option value="">All types</option>
            {clientTypes.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Health
          <select name="health" defaultValue={params.get("health") || ""}>
            <option value="">All health</option>
            <option>HEALTHY</option><option>ATTENTION</option><option>AT_RISK</option>
          </select>
        </label>
        <label>
          Sort
          <select name="sort" defaultValue={params.get("sort") || "name"}>
            <option value="name">Name</option>
            <option value="code">Code</option>
            <option value="created_at">Created</option>
            <option value="updated_at">Updated</option>
          </select>
        </label>
        <label>
          Order
          <select name="order" defaultValue={params.get("order") || "asc"}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
        <button>Apply filters</button>
      </form>
      {open && (
        <form
          className="card create"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <label>
            Code
            <input name="code" required />
          </label>
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Type
            <select name="type" required defaultValue="">
              <option value="" disabled>
                Select
              </option>
              {clientTypes.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue="ONBOARDING">
              {clientStatuses.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Primary owner
            <select
              name="primary_owner_id"
              required
              disabled={users.isPending || users.isError}
              defaultValue=""
            >
              <option value="" disabled>
                {users.isPending ? "Loading users..." : "Select owner"}
              </option>
              {users.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.email})
                </option>
              ))}
            </select>
          </label>
          <button disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create client"}
          </button>
          {create.isError && <p role="alert">{message(create.error)}</p>}
          {users.isError && <p role="alert">{message(users.error)}</p>}
        </form>
      )}
      {query.isPending ? (
        <p role="status">Loading clients...</p>
      ) : query.isError ? (
        <p role="alert">{message(query.error)}</p>
      ) : !query.data?.data.length ? (
        <p>No clients match these filters.</p>
      ) : (
        <div className="client-table" role="list">
          {query.data.data.map((x) => (
            <NavLink role="listitem" key={x.id} to={`/clients/${x.id}`}>
              <span>
                <strong>{x.name}</strong>
                <small>{x.code}</small>
              </span>
              <span>{x.type?.replaceAll("_", " ")}</span>
              <span
                className={`status status-${String(x.status).toLowerCase()}`}
              >
                {x.status}
              </span>
               <span>{x.city || x.province || "Location unavailable"}</span>
						<span className={`health health-${x.health?.classification.toLowerCase()}`}>{x.health ? `${x.health.classification.replaceAll("_", " ")} ${x.health.score}/100` : "Health unavailable"}</span>
            </NavLink>
          ))}
        </div>
      )}
      <div className="pagination">
        <span>Page {page}</span>
        <button disabled={page === 1} onClick={() => move(page - 1)}>
          Previous
        </button>
        <button
          disabled={(query.data?.data.length || 0) < 20}
          onClick={() => move(page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
function ClientDetail() {
  const { id = "" } = useParams();
  const user = useOutletContext<User>();
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");
  const detail = useQuery<Client>({
    queryKey: ["client", id],
    queryFn: () => get(`/clients/${id}`),
  });
  const contacts = useQuery<Item[]>({
    queryKey: ["client", id, "contacts"],
    queryFn: () => get(`/clients/${id}/contacts`),
  });
  const owners = useQuery<Item[]>({
    queryKey: ["client", id, "owners"],
    queryFn: () => get(`/clients/${id}/owners`),
  });
  const timeline = useQuery<Item[]>({
    queryKey: ["client", id, "timeline"],
    queryFn: () => get(`/clients/${id}/timeline`),
  });
	const health = useQuery<Health>({ queryKey: ["client", id, "health"], queryFn: () => get(`/clients/${id}/health`) });
  const users = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => get("/users"),
    enabled: permissions(user, "client.assign_owner"),
  });
  function refresh() {
    cache.invalidateQueries({ queryKey: ["client", id] });
    cache.invalidateQueries({ queryKey: ["clients"] });
  }
  const update = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      patch(`/clients/${id}`, data),
    onSuccess: () => {
      setEditing(false);
      setError("");
      refresh();
    },
    onError: (e) => setError(message(e)),
  });
  const archive = useMutation({
    mutationFn: () =>
      post(`/clients/${id}/archive`, { version: detail.data?.version }),
    onSuccess: () => {
      refresh();
      setArchiving(false);
    },
    onError: (e) => setError(message(e)),
  });
  const contact = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      post(`/clients/${id}/contacts`, data),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["client", id, "contacts"] });
      setError("");
    },
    onError: (e) => setError(message(e)),
  });
  const primary = useMutation({
    mutationFn: (new_owner_id: string) =>
      post(`/clients/${id}/change-primary-owner`, { new_owner_id }),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["client", id, "owners"] });
      refresh();
    },
    onError: (e) => setError(message(e)),
  });
  if (detail.isPending) return <p role="status">Loading client...</p>;
  if (detail.isError || !detail.data)
    return <p role="alert">{message(detail.error)}</p>;
  const client = detail.data;
  const canUpdate = permissions(user, "client.update");
  const canArchive = permissions(user, "client.archive");
  const canOwners = permissions(user, "client.assign_owner");
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    update.mutate({
      ...Object.fromEntries(new FormData(e.currentTarget)),
      version: client.version,
    });
  }
  function addContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    contact.mutate(Object.fromEntries(new FormData(e.currentTarget)));
  }
  return (
    <section className="client-detail">
      <NavLink className="back" to="/clients">
        All clients
      </NavLink>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{client.code}</p>
          <h1>{client.name}</h1>
          <p>
            {client.type?.replaceAll("_", " ")} · {client.status}
          </p>
        </div>
        <div className="detail-actions">
          {canUpdate && (
            <button onClick={() => setEditing(!editing)}>
              {editing ? "Cancel edit" : "Edit client"}
            </button>
          )}
          {canArchive && client.status !== "INACTIVE" && (
            <button className="danger" onClick={() => setArchiving(true)}>
              Archive
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
			{health.isPending ? <p role="status">Calculating health...</p> : health.isError ? <p role="alert">{message(health.error)}</p> : health.data && <section className="health-card" aria-label="Client health"><div><p className="eyebrow">Client health</p><strong>{health.data.score}<small>/100</small></strong><span className={`health health-${health.data.classification.toLowerCase()}`}>{health.data.classification.replaceAll("_", " ")}</span></div><ul>{health.data.factors.length ? health.data.factors.map(f => <li key={f.code}><b>{f.impact}</b> {f.description}</li>) : <li>No current risk factors.</li>}</ul></section>}
      {editing && (
        <form className="card client-edit" onSubmit={save}>
          <label>
            Name
            <input name="name" required defaultValue={client.name} />
          </label>
          <label>
            Type
            <select name="type" defaultValue={client.type}>
              {clientTypes.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={client.status}>
              {clientStatuses.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Province
            <input name="province" defaultValue={client.province} />
          </label>
          <label>
            City
            <input name="city" defaultValue={client.city} />
          </label>
          <label>
            Address
            <input name="address" defaultValue={client.address} />
          </label>
          <button disabled={update.isPending}>
            {update.isPending ? "Saving..." : "Save changes"}
          </button>
        </form>
      )}
      <div className="detail-grid">
        <section className="panel">
          <h2>Client details</h2>
          <dl>
            <div>
              <dt>Location</dt>
              <dd>
                {[client.city, client.province].filter(Boolean).join(", ") ||
                  "Not recorded"}
              </dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{client.address || "Not recorded"}</dd>
            </div>
          </dl>
        </section>
        <section className="panel">
          <h2>Owners</h2>
          {owners.isPending ? (
            <p>Loading...</p>
          ) : owners.data?.length ? (
            <ul className="compact-list">
              {owners.data.map((x) => (
                <li key={x.id}>
                  <strong>{String(x.user_name || x.name || x.user_id)}</strong>
                  <small>{String(x.owner_type)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No owners assigned.</p>
          )}
          {canOwners && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const owner = String(
                  new FormData(e.currentTarget).get("new_owner_id"),
                );
                if (owner) primary.mutate(owner);
              }}
            >
              <label>
                Primary owner
                <select name="new_owner_id" required defaultValue="">
                  <option value="" disabled>
                    Select user
                  </option>
                  {users.data?.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} ({x.email})
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={primary.isPending || users.isPending}>
                {primary.isPending ? "Changing..." : "Change primary owner"}
              </button>
              {users.isError && (
                <p role="alert">Users unavailable: {message(users.error)}</p>
              )}
            </form>
          )}
        </section>
        <section className="panel">
          <h2>Contacts</h2>
          {contacts.isPending ? (
            <p>Loading...</p>
          ) : contacts.data?.length ? (
            <ul className="compact-list">
              {contacts.data.map((x) => (
                <li key={x.id}>
                  <strong>{label(x)}</strong>
                  <small>
                    {[x.position, x.email, x.phone].filter(Boolean).join(" · ")}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No contacts recorded.</p>
          )}
          {canUpdate && (
            <form onSubmit={addContact}>
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Position
                <input name="position" />
              </label>
              <label>
                Email
                <input name="email" type="email" />
              </label>
              <label>
                Phone
                <input name="phone" />
              </label>
              <button disabled={contact.isPending}>
                {contact.isPending ? "Adding..." : "Add contact"}
              </button>
            </form>
          )}
        </section>
        <section className="panel">
          <h2>Timeline</h2>
          {timeline.isPending ? (
            <p>Loading...</p>
          ) : timeline.isError ? (
            <p role="alert">{message(timeline.error)}</p>
          ) : timeline.data?.length ? (
            <ul className="compact-list">
              {timeline.data.map((x) => (
                <li key={x.id}>
                  <strong>{String(x.title || x.type)}</strong>
                  <small>{String(x.occurred_at || "")}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No activity recorded.</p>
          )}
        </section>
      </div>
      {archiving && (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="archive-title"
          >
            <h2 id="archive-title">Archive {client.name}?</h2>
            <p>
              Archived clients leave active service. This action is traceable.
            </p>
            <div>
              <button
                className="danger"
                autoFocus
                disabled={archive.isPending}
                onClick={() => archive.mutate()}
              >
                {archive.isPending ? "Archiving..." : "Archive client"}
              </button>
              <button className="secondary" onClick={() => setArchiving(false)}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
type Issue = Item & {
  client_id: string;
  assignee_id?: string;
  release_id?: string;
  description?: string;
  category?: string;
  resolution_summary?: string;
	work_state?: string;
	sla_status?: string;
	sla_deadline?: string;
};
type History = Item & {
  from_status?: string;
  to_status?: string;
  changed_by?: string;
  reason?: string;
  created_at?: string;
};
type WorkStateHistory = Item & { state?: string; reason?: string; started_at?: string; ended_at?: string };
const severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const workStates = ["ACTIVE", "WAITING_CLIENT", "WAITING_OPS", "WAITING_PRODUCT", "WAITING_ENGINEERING", "WAITING_RELEASE", "BLOCKED"];
const issueStatuses = [
  "REPORTED",
  "TRIAGED",
  "INVESTIGATING",
  "IN_DEVELOPMENT",
  "QA",
  "RELEASED",
  "FOLLOW_UP",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];
function Issues() {
  const user = useOutletContext<User>();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(false);
  const issues = useQuery<Envelope<Issue[]>>({
    queryKey: ["issues", params.toString()],
    queryFn: () => getPage<Issue[]>(`/issues?${params}`),
  });
  const clients = useQuery<Client[]>({
    queryKey: ["clients", "issue-selector"],
    queryFn: () => get("/clients?limit=100"),
  });
  const createIssue = useMutation({
    mutationFn: (data: Record<string, unknown>) => post("/issues", data),
    onSuccess: () => {
      setOpen(false);
      setCreated(true);
      issues.refetch();
    },
  });
  function filters(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = new URLSearchParams();
    new FormData(e.currentTarget).forEach((v, k) => {
      if (v) next.set(k, String(v));
    });
    next.set("page", "1");
    setParams(next);
  }
  function move(page: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    setParams(next);
  }
  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    createIssue.mutate(Object.fromEntries(new FormData(e.currentTarget)));
  }
  return (
    <section className="clients-workspace">
      <div className="title">
        <div>
          <p className="eyebrow">Delivery workspace</p>
          <h1>Issues</h1>
        </div>
        {permissions(user, "issue.create") && (
          <button onClick={() => { setOpen(!open); setCreated(false); }}>
            {open ? "Cancel" : "New issue"}
          </button>
        )}
      </div>
      {created && <p role="status">Issue created.</p>}
      <form className="client-filters" onSubmit={filters}>
        <label>
          Search
          <input
            name="search"
            defaultValue={params.get("search") || ""}
            placeholder="Title or issue number"
          />
        </label>
		<label>
		  Work state
		  <select name="work_state" defaultValue={params.get("work_state") || ""}>
		    <option value="">All work states</option>
		    {workStates.map((x) => <option key={x}>{x}</option>)}
		  </select>
		</label>
		<label>
		  SLA
		  <select name="sla_status" defaultValue={params.get("sla_status") || ""}>
		    <option value="">All SLA states</option><option>BREACHED</option><option>APPROACHING</option><option>ON_TRACK</option><option>MET</option>
		  </select>
		</label>
        <label>
          Status
          <select name="status" defaultValue={params.get("status") || ""}>
            <option value="">All statuses</option>
            {issueStatuses.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Severity
          <select name="severity" defaultValue={params.get("severity") || ""}>
            <option value="">All severities</option>
            {severities.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <button>Apply filters</button>
      </form>
      {open && (
        <form className="card create" onSubmit={create}>
          <label>
            Client
            <select
              name="client_id"
              required
              defaultValue=""
              disabled={clients.isPending || clients.isError}
            >
              <option value="" disabled>
                {clients.isPending ? "Loading clients..." : "Select client"}
              </option>
              {clients.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.code})
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Description
            <textarea name="description" required />
          </label>
          <label>
            Severity
            <select name="severity" defaultValue="MEDIUM">
              {severities.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Category
            <input name="category" />
          </label>
          <button disabled={createIssue.isPending}>{createIssue.isPending ? "Creating..." : "Create issue"}</button>
          {createIssue.isError && <p role="alert">{message(createIssue.error)}</p>}
          {clients.isError && <p role="alert">{message(clients.error)}</p>}
        </form>
      )}
      {issues.isPending ? (
        <p role="status">Loading issues...</p>
      ) : issues.isError ? (
        <p role="alert">{message(issues.error)}</p>
      ) : !issues.data?.data.length ? (
        <p>No issues match these filters.</p>
      ) : (
        <div className="client-table" role="list">
          {issues.data.data.map((x) => (
            <NavLink role="listitem" key={x.id} to={`/issues/${x.id}`}>
              <span>
                <strong>{String(x.title || "")}</strong>
                <small>{String(x.issue_number || "")}</small>
              </span>
              <span>{String(x.status || "")}</span>
              <span className="status">{String(x.severity || "")}</span>
			  <span>{String(x.work_state || "ACTIVE")}</span>
			  <span>{String(x.sla_status || "NOT_SET")}</span>
              <span>{String(x.category || "Uncategorized")}</span>
            </NavLink>
          ))}
        </div>
      )}
      <div className="pagination">
        <span>
          Page {issues.data?.meta?.page || Number(params.get("page") || 1)} of{" "}
          {issues.data?.meta?.total_pages || 1}
        </span>
        <button
          disabled={!issues.data?.meta || issues.data.meta.page <= 1}
          onClick={() => move((issues.data?.meta?.page || 1) - 1)}
        >
          Previous
        </button>
        <button
          disabled={
            !issues.data?.meta ||
            issues.data.meta.page >= issues.data.meta.total_pages
          }
          onClick={() => move((issues.data?.meta?.page || 1) + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
const actionPermissions: Record<string, string> = {
  assign: "issue.assign",
  triage: "issue.triage",
  "start-investigation": "issue.investigate",
  "start-development": "issue.start_development",
  "mark-qa": "issue.mark_qa",
  "qa-failed": "issue.mark_qa",
  "mark-released": "issue.mark_released",
  "start-follow-up": "issue.follow_up",
  close: "issue.close",
  reopen: "issue.reopen",
	"work-state": "issue.manage_work_state",
};
const statusActions: Record<string, string[]> = {
  REPORTED: ["assign", "triage"],
  TRIAGED: ["assign", "start-investigation"],
  INVESTIGATING: ["assign", "start-development"],
  IN_DEVELOPMENT: ["mark-qa"],
  QA: ["qa-failed", "mark-released"],
  RELEASED: ["start-follow-up"],
  FOLLOW_UP: ["close"],
  CLOSED: ["reopen"],
};
function IssueDetail() {
  const { id = "" } = useParams();
  const user = useOutletContext<User>();
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const q = useQuery<Issue>({
    queryKey: ["issue", id],
    queryFn: () => get(`/issues/${id}`),
  });
  const history = useQuery<History[]>({
    queryKey: ["issue", id, "history"],
    queryFn: () => get(`/issues/${id}/history`),
  });
	const workHistory = useQuery<{ states: WorkStateHistory[]; summary: Record<string, number> }>({
		queryKey: ["issue", id, "work-history"], queryFn: () => get(`/issues/${id}/work-history`),
	});
  const attachments = useQuery<Attachment[]>({ queryKey: ["issue", id, "attachments"], queryFn: () => get(`/issues/${id}/attachments`) });
  const clients = useQuery<Client[]>({
    queryKey: ["clients", "issue-selector"],
    queryFn: () => get("/clients?limit=100"),
  });
  const users = useQuery<User[]>({
    queryKey: ["users", "issue-assignees"],
    queryFn: () => get("/users"),
    enabled: permissions(user, "issue.assign"),
  });
  const releases = useQuery<Item[]>({
    queryKey: ["releases", "issue-selector"],
    queryFn: () => get("/releases"),
    enabled: selected === "mark-released",
  });
  function refresh() {
    cache.invalidateQueries({ queryKey: ["issue", id] });
    cache.invalidateQueries({ queryKey: ["issue", id, "history"] });
		cache.invalidateQueries({ queryKey: ["issue", id, "work-history"] });
		cache.invalidateQueries({ queryKey: ["issue", id, "attachments"] });
    cache.invalidateQueries({ queryKey: ["issues"] });
  }
  const update = useMutation({
    mutationFn: (data: Record<string, unknown>) => patch(`/issues/${id}`, data),
    onSuccess: () => {
      setEditing(false);
      setError("");
      refresh();
    },
    onError: (e) => setError(message(e)),
  });
  const action = useMutation({
    mutationFn: ({
      name,
      data,
    }: {
      name: string;
      data: Record<string, unknown>;
    }) => post(`/issues/${id}/${name}`, data),
    onSuccess: () => {
      setSelected("");
      setError("");
      refresh();
    },
    onError: (e) => setError(message(e)),
  });
  const attachment = useMutation({ mutationFn: (file: File) => upload(`/issues/${id}/attachments`, file), onSuccess: refresh, onError: (e) => setError(message(e)) });
  const removeAttachment = useMutation({ mutationFn: (attachmentID: string) => del(`/issues/${id}/attachments/${attachmentID}`), onSuccess: refresh, onError: (e) => setError(message(e)) });
  if (q.isPending) return <p role="status">Loading issue...</p>;
  if (q.isError || !q.data) return <p role="alert">{message(q.error)}</p>;
  const issue = q.data;
  const clientName =
    clients.data?.find((x) => x.id === issue.client_id)?.name ||
    issue.client_id;
  const assignee =
    users.data?.find((x) => x.id === issue.assignee_id)?.name ||
    issue.assignee_id ||
    "Unassigned";
  const release = releases.data?.find((x) => x.id === issue.release_id);
  const actions = (statusActions[issue.status || ""] || []).filter((x) =>
    permissions(user, actionPermissions[x]),
  );
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    update.mutate({
      ...Object.fromEntries(new FormData(e.currentTarget)),
      version: issue.version,
    });
  }
  function submitAction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      (selected === "close" || selected === "reopen") &&
      !window.confirm(
        `${selected === "close" ? "Close" : "Reopen"} this issue?`,
      )
    )
      return;
    const data = Object.fromEntries(new FormData(e.currentTarget));
    action.mutate({
      name: selected,
      data: { ...data, version: issue.version },
    });
  }
  return (
    <section className="client-detail">
      <NavLink className="back" to="/issues">
        All issues
      </NavLink>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{String(issue.issue_number || "")}</p>
          <h1>{String(issue.title || "")}</h1>
          <p>
            {String(issue.status || "")} · {String(issue.severity || "")}
          </p>
        </div>
        {permissions(user, "issue.update") && (
          <div className="detail-actions">
            <button onClick={() => setEditing(!editing)}>
              {editing ? "Cancel edit" : "Edit issue"}
            </button>
          </div>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {editing && (
        <form className="card client-edit" onSubmit={save}>
          <label>
            Title
            <input
              name="title"
              required
              defaultValue={String(issue.title || "")}
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              required
              defaultValue={String(issue.description || "")}
            />
          </label>
          <label>
            Category
            <input
              name="category"
              defaultValue={String(issue.category || "")}
            />
          </label>
          <label>
            Severity
            <select name="severity" defaultValue={String(issue.severity || "")}>
              {severities.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <button disabled={update.isPending}>
            {update.isPending ? "Saving..." : "Save changes"}
          </button>
        </form>
      )}
		<div className="detail-grid">
        <section className="panel">
          <h2>Issue details</h2>
          <dl>
            <div>
              <dt>Client</dt>
              <dd>{clientName}</dd>
            </div>
			<div><dt>Work state</dt><dd>{String(issue.work_state || "ACTIVE")}</dd></div>
			<div><dt>SLA</dt><dd>{String(issue.sla_status || "NOT_SET")}{issue.sla_deadline ? ` · ${new Date(issue.sla_deadline).toLocaleString()}` : ""}</dd></div>
            <div>
              <dt>Assignee</dt>
              <dd>{assignee}</dd>
            </div>
            <div>
              <dt>Release</dt>
              <dd>
                {release ? label(release) : issue.release_id || "Not released"}
              </dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{String(issue.category || "Uncategorized")}</dd>
            </div>
            <div>
              <dt>Resolution</dt>
              <dd>{String(issue.resolution_summary || "None")}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{String(issue.version || "")}</dd>
            </div>
          </dl>
        </section>
		<section className="panel">
		  <h2>Attachments</h2>
		  {permissions(user, "issue.update") && <label>Upload PNG, JPEG, PDF, or text file (10 MB max)<input type="file" accept="image/png,image/jpeg,application/pdf,text/plain" disabled={attachment.isPending} onChange={e => { const file = e.currentTarget.files?.[0]; if (file) attachment.mutate(file); e.currentTarget.value = "" }} /></label>}
		  {attachments.isPending ? <p role="status">Loading attachments...</p> : attachments.isError ? <p role="alert">{message(attachments.error)}</p> : attachments.data?.length ? <ul>{attachments.data.map(x => <li key={x.id}><a href={`${apiBase}/issues/${id}/attachments/${x.id}/download`}>{x.filename}</a> ({Math.ceil(x.size_bytes / 1024)} KB) {permissions(user, "issue.update") && <button onClick={() => window.confirm(`Delete ${x.filename}?`) && removeAttachment.mutate(x.id)} disabled={removeAttachment.isPending}>Delete</button>}</li>)}</ul> : <p>No attachments.</p>}
		</section>
        <section className="panel">
          <h2>Workflow actions</h2>
          {actions.length ? (
            <div className="detail-actions">
              {actions.map((x) => (
                <button
                  key={x}
                  onClick={() => setSelected(selected === x ? "" : x)}
                >
                  {x.replaceAll("-", " ")}
                </button>
              ))}
            </div>
          ) : (
            <p>No permitted actions for this status.</p>
          )}
          {selected && (
            <form onSubmit={submitAction}>
              <h3>{selected.replaceAll("-", " ")}</h3>
              {selected === "assign" && (
                <label>
                  Assignee
                  <select name="assignee_id" required defaultValue="">
                    <option value="" disabled>
                      Select user
                    </option>
                    {users.data?.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {selected === "triage" && (
                <>
                  <label>
                    Category
                    <input
                      name="category"
                      required
                      defaultValue={String(issue.category || "")}
                    />
                  </label>
                  <label>
                    Severity
                    <select
                      name="severity"
                      required
                      defaultValue={String(issue.severity || "MEDIUM")}
                    >
                      {severities.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {selected === "mark-released" && (
                <label>
                  Release
                  <select name="release_id" required defaultValue="">
                    <option value="" disabled>
                      {releases.isPending
                        ? "Loading releases..."
                        : "Select release"}
                    </option>
                    {releases.data?.map((x) => (
                      <option key={x.id} value={x.id}>
                        {label(x)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {["qa-failed", "close", "reopen"].includes(selected) && (
                <label>
                  {selected === "close" ? "Resolution summary" : "Reason"}
                  <textarea
                    name={
                      selected === "close" ? "resolution_summary" : "reason"
                    }
                    required={selected === "reopen"}
                  />
                </label>
              )}
              <button
                disabled={
                  action.isPending ||
                  (selected === "mark-released" && releases.isPending)
                }
              >
                {action.isPending ? "Updating..." : "Confirm action"}
              </button>
            </form>
          )}
          {action.isError && <p role="alert">{message(action.error)}</p>}
        </section>
		<section className="panel">
		  <h2>Work state</h2>
		  {permissions(user, "issue.manage_work_state") && <form onSubmit={(e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); action.mutate({ name: "work-state", data: { ...data, version: issue.version } }); }}>
			<label>State<select name="state" defaultValue={issue.work_state || "ACTIVE"}>{workStates.map((x) => <option key={x}>{x}</option>)}</select></label>
			<label>Reason<textarea name="reason" /></label>
			<button disabled={action.isPending}>{action.isPending ? "Updating..." : "Update work state"}</button>
		  </form>}
		  {workHistory.isPending ? <p>Loading...</p> : workHistory.isError ? <p role="alert">{message(workHistory.error)}</p> : <>
			<p>Active {workHistory.data?.summary.active_minutes || 0}m · Waiting client {workHistory.data?.summary.waiting_client_minutes || 0}m · Blocked {workHistory.data?.summary.blocked_minutes || 0}m</p>
			<ul className="compact-list">{workHistory.data?.states.map((x) => <li key={x.id}><strong>{String(x.state || "")}</strong><small>{String(x.reason || "")} {x.started_at ? `· ${new Date(String(x.started_at)).toLocaleString()}` : ""}</small></li>)}</ul>
		  </>}
		</section>
        <section className="panel">
          <h2>History</h2>
          {history.isPending ? (
            <p>Loading...</p>
          ) : history.isError ? (
            <p role="alert">{message(history.error)}</p>
          ) : history.data?.length ? (
            <ul className="compact-list">
              {history.data.map((x) => (
                <li key={x.id}>
                  <strong>
                    {String(x.from_status || "Created")} to{" "}
                    {String(x.to_status || "")}
                  </strong>
                  <small>
                    {String(x.reason || x.changed_by || "")}{" "}
                    {x.created_at
                      ? `· ${new Date(String(x.created_at)).toLocaleString()}`
                      : ""}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No history recorded.</p>
          )}
        </section>
      </div>
    </section>
  );
}
type Release = Item & { version: string; summary: string; status: string };
type ReleaseDetail = {
  release: Release;
  items: Item[];
  affected_clients: (Item & {
    client_id: string;
    impact_type: string;
    requires_follow_up: boolean;
  })[];
  handoff_summary: Record<string, number>;
};
const releaseItemTypes = ["FEATURE", "BUG_FIX", "IMPROVEMENT", "SECURITY"];
const impactTypes = ["DIRECT", "GENERAL", "OPTIONAL"];
function Releases() {
  const user = useOutletContext<User>();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const cache = useQueryClient();
  const releases = useQuery<Release[]>({
    queryKey: ["releases"],
    queryFn: () => get("/releases"),
  });
  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => post("/releases", data),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["releases"] });
      setOpen(false);
      setError("");
    },
    onError: (e) => setError(message(e)),
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    create.mutate(Object.fromEntries(new FormData(e.currentTarget)));
  }
  return (
    <section className="clients-workspace">
      <div className="title">
        <div>
          <p className="eyebrow">Delivery planning</p>
          <h1>Releases</h1>
        </div>
        {permissions(user, "release.create") && (
          <button onClick={() => setOpen(!open)}>
            {open ? "Cancel" : "New release"}
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {open && (
        <form className="card create" onSubmit={submit}>
          <label>
            Version
            <input name="version" required placeholder="v2.4.1" />
          </label>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Summary
            <textarea name="summary" required />
          </label>
          <button disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create release"}
          </button>
        </form>
      )}
      {releases.isPending ? (
        <p role="status">Loading releases...</p>
      ) : releases.isError ? (
        <p role="alert">{message(releases.error)}</p>
      ) : !releases.data?.length ? (
        <p>No releases.</p>
      ) : (
        <div className="client-table" role="list">
          {releases.data.map((r) => (
            <NavLink role="listitem" key={r.id} to={`/releases/${r.id}`}>
              <span>
                <strong>{r.title}</strong>
                <small>{r.version}</small>
              </span>
              <span>{r.status}</span>
              <span>{r.summary}</span>
            </NavLink>
          ))}
        </div>
      )}
    </section>
  );
}
function ReleaseDetail() {
  const { id = "" } = useParams();
  const user = useOutletContext<User>();
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const detail = useQuery<ReleaseDetail>({
    queryKey: ["release", id],
    queryFn: () => get(`/releases/${id}`),
  });
  const clients = useQuery<Client[]>({
    queryKey: ["clients", "release-selector"],
    queryFn: () => get("/clients?limit=100"),
  });
  function refresh() {
    cache.invalidateQueries({ queryKey: ["release", id] });
    cache.invalidateQueries({ queryKey: ["releases"] });
    cache.invalidateQueries({ queryKey: ["handoffs"] });
  }
  const item = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      post(`/releases/${id}/items`, data),
    onSuccess: refresh,
    onError: (e) => setError(message(e)),
  });
  const impact = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      post(`/releases/${id}/impacts`, data),
    onSuccess: refresh,
    onError: (e) => setError(message(e)),
  });
  const ready = useMutation({
    mutationFn: () => post(`/releases/${id}/ready`),
    onSuccess: refresh,
    onError: (e) => setError(message(e)),
  });
  const publish = useMutation({
    mutationFn: () => post(`/releases/${id}/publish`),
    onSuccess: refresh,
    onError: (e) => setError(message(e)),
  });
  if (detail.isPending) return <p role="status">Loading release...</p>;
  if (detail.isError || !detail.data)
    return <p role="alert">{message(detail.error)}</p>;
  const {
    release,
    items,
    affected_clients: impacts,
    handoff_summary: summary,
  } = detail.data;
  const draft = release.status === "DRAFT";
  function addItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    item.mutate({
      ...Object.fromEntries(new FormData(e.currentTarget)),
      issue_ids: [],
    });
  }
  function addImpact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    impact.mutate({
      clients: [
        {
          client_id: f.get("client_id"),
          impact_type: f.get("impact_type"),
          requires_follow_up: f.get("requires_follow_up") === "on",
        },
      ],
    });
  }
  return (
    <section className="client-detail">
      <NavLink className="back" to="/releases">
        All releases
      </NavLink>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{release.version}</p>
          <h1>{release.title}</h1>
          <p>
            {release.status} · {release.summary}
          </p>
        </div>
        <div className="detail-actions">
          {draft && permissions(user, "release.update") && (
            <button disabled={ready.isPending} onClick={() => ready.mutate()}>
              {ready.isPending ? "Marking ready..." : "Mark ready"}
            </button>
          )}
          {release.status === "READY" &&
            permissions(user, "release.publish") && (
              <button
                onClick={() =>
                  window.confirm(
                    `Publish ${release.version}? This creates operational handoffs for affected clients.`,
                  ) && publish.mutate()
                }
                disabled={publish.isPending}
              >
                {publish.isPending ? "Publishing..." : "Publish release"}
              </button>
            )}
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="detail-grid">
        <section className="panel">
          <h2>Release items</h2>
          {items.length ? (
            <ul className="compact-list">
              {items.map((x) => (
                <li key={x.id}>
                  <strong>{String(x.title)}</strong>
                  <small>
                    {String(x.type)} · {String(x.description)}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No items added.</p>
          )}
          {draft && permissions(user, "release.update") && (
            <form onSubmit={addItem}>
              <label>
                Type
                <select name="type" defaultValue="BUG_FIX">
                  {releaseItemTypes.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Title
                <input name="title" required />
              </label>
              <label>
                Description
                <textarea name="description" required />
              </label>
              <button disabled={item.isPending}>
                {item.isPending ? "Adding..." : "Add item"}
              </button>
            </form>
          )}
        </section>
        <section className="panel">
          <h2>Client impacts</h2>
          {impacts.length ? (
            <ul className="compact-list">
              {impacts.map((x) => (
                <li key={x.client_id}>
                  <strong>
                    {clients.data?.find((c) => c.id === x.client_id)?.name ||
                      x.client_id}
                  </strong>
                  <small>
                    {x.impact_type} · Follow-up{" "}
                    {x.requires_follow_up ? "required" : "not required"}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No affected clients selected.</p>
          )}
          {draft && permissions(user, "release.manage_impact") && (
            <form onSubmit={addImpact}>
              <label>
                Client
                <select
                  name="client_id"
                  required
                  defaultValue=""
                  disabled={clients.isPending}
                >
                  <option value="" disabled>
                    Select client
                  </option>
                  {clients.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Impact type
                <select name="impact_type" defaultValue="DIRECT">
                  {impactTypes.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                <input name="requires_follow_up" type="checkbox" /> Follow-up
                required
              </label>
              <button disabled={impact.isPending || clients.isPending}>
                {impact.isPending ? "Saving..." : "Add impact"}
              </button>
            </form>
          )}
        </section>
        <section className="panel">
          <h2>Operational handoffs</h2>
          {Object.keys(summary).length ? (
            <dl>
              {Object.entries(summary).map(([status, count]) => (
                <div key={status}>
                  <dt>{status}</dt>
                  <dd>{count}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>Handoffs appear after publication.</p>
          )}
        </section>
      </div>
    </section>
  );
}
type FeatureRequest = Item & {
  request_number: string;
  problem_statement: string;
  expected_outcome: string;
  priority?: string;
  demand_count?: number;
  oldest_request_at?: string;
  rejection_reason?: string;
};
type FeatureDetail = {
  feature_request: FeatureRequest;
  requesting_clients: (Item & {
    client_id: string;
    client_name: string;
    client_context?: string;
  })[];
  demand: { client_count: number; oldest_request_at?: string };
};
const featureStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "PLANNED",
  "IN_DEVELOPMENT",
  "RELEASED",
  "DELIVERED",
  "DUPLICATE",
];
const featureActions: Record<string, [string, string][]> = {
  SUBMITTED: [["start-review", "feature_request.review"]],
  UNDER_REVIEW: [
    ["accept", "feature_request.review"],
    ["reject", "feature_request.review"],
    ["mark-duplicate", "feature_request.merge"],
  ],
  ACCEPTED: [["mark-planned", "feature_request.prioritize"]],
  PLANNED: [["start-development", "feature_request.update"]],
  IN_DEVELOPMENT: [["mark-released", "feature_request.update"]],
  RELEASED: [["mark-delivered", "feature_request.close"]],
};
function FeatureRequests() {
  const user = useOutletContext<User>();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const cache = useQueryClient();
  const q = useQuery<Envelope<FeatureRequest[]>>({
    queryKey: ["feature-requests", params.toString()],
    queryFn: () => getPage(`/feature-requests?${params}`),
  });
  const clients = useQuery<Client[]>({
    queryKey: ["clients", "feature-selector"],
    queryFn: () => get("/clients?limit=100"),
  });
  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => post("/feature-requests", d),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["feature-requests"] });
      setOpen(false);
    },
  });
  function filters(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = new URLSearchParams();
    new FormData(e.currentTarget).forEach((v, k) => {
      if (v) n.set(k, String(v));
    });
    n.set("page", "1");
    setParams(n);
  }
  function move(p: number) {
    const n = new URLSearchParams(params);
    n.set("page", String(p));
    setParams(n);
  }
  return (
    <section className="clients-workspace">
      <div className="title">
        <h1>Feature requests</h1>
        {permissions(user, "feature_request.create") && (
          <button onClick={() => setOpen(!open)}>
            {open ? "Cancel" : "New request"}
          </button>
        )}
      </div>
      <form className="client-filters" onSubmit={filters}>
        <label>
          Search
          <input name="search" defaultValue={params.get("search") || ""} />
        </label>
        <label>
          Status
          <select name="status" defaultValue={params.get("status") || ""}>
            <option value="">All statuses</option>
            {featureStatuses.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Client
          <select name="client_id" defaultValue={params.get("client_id") || ""}>
            <option value="">All clients</option>
            {clients.data?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <button>Apply filters</button>
      </form>
      {open && (
        <form
          className="card create"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <label>
            Client
            <select name="client_id" required defaultValue="">
              <option value="" disabled>
                Select client
              </option>
              {clients.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Problem statement
            <textarea name="problem_statement" required />
          </label>
          <label>
            Expected outcome
            <textarea name="expected_outcome" required />
          </label>
          <button disabled={create.isPending}>Create request</button>
        </form>
      )}
      {q.isPending ? (
        <p role="status">Loading feature requests...</p>
      ) : q.isError ? (
        <p role="alert">{message(q.error)}</p>
      ) : !q.data?.data.length ? (
        <p>No feature requests match these filters.</p>
      ) : (
        <div className="client-table" role="list">
          {q.data.data.map((x) => (
            <NavLink
              role="listitem"
              key={x.id}
              to={`/feature-requests/${x.id}`}
            >
              <span>
                <strong>{x.title}</strong>
                <small>{x.request_number}</small>
              </span>
              <span>{x.status}</span>
              <span>{x.demand_count || 0} clients</span>
            </NavLink>
          ))}
        </div>
      )}
      <div className="pagination">
        <button
          disabled={!q.data?.meta || q.data.meta.page <= 1}
          onClick={() => move((q.data?.meta?.page || 1) - 1)}
        >
          Previous
        </button>
        <button
          disabled={
            !q.data?.meta || q.data.meta.page >= q.data.meta.total_pages
          }
          onClick={() => move((q.data?.meta?.page || 1) + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
function FeatureRequestDetail() {
  const { id = "" } = useParams();
  const user = useOutletContext<User>();
  const cache = useQueryClient();
  const [actionName, setActionName] = useState("");
  const [adding, setAdding] = useState(false);
  const q = useQuery<FeatureDetail>({
    queryKey: ["feature-request", id],
    queryFn: () => get(`/feature-requests/${id}`),
  });
  const clients = useQuery<Client[]>({
    queryKey: ["clients", "feature-selector"],
    queryFn: () => get("/clients?limit=100"),
  });
  const originals = useQuery<Envelope<FeatureRequest[]>>({
    queryKey: ["feature-requests", "original-selector"],
    queryFn: () => getPage("/feature-requests?limit=100"),
    enabled: actionName === "mark-duplicate",
  });
  const refresh = () => {
    cache.invalidateQueries({ queryKey: ["feature-request", id] });
    cache.invalidateQueries({ queryKey: ["feature-requests"] });
  };
  const add = useMutation({
    mutationFn: (d: Record<string, unknown>) =>
      post(`/feature-requests/${id}/add-client`, d),
    onSuccess: () => {
      setAdding(false);
      refresh();
    },
  });
  const action = useMutation({
    mutationFn: (d: Record<string, unknown>) =>
      post(`/feature-requests/${id}/${actionName}`, d),
    onSuccess: () => {
      setActionName("");
      refresh();
    },
  });
  if (q.isPending) return <p role="status">Loading feature request...</p>;
  if (q.isError || !q.data) return <p role="alert">{message(q.error)}</p>;
  const f = q.data.feature_request;
  const requested = new Set(q.data.requesting_clients.map((x) => x.client_id));
  const actions = (featureActions[f.status || ""] || []).filter(([, p]) =>
    permissions(user, p),
  );
  return (
    <section className="client-detail">
      <NavLink className="back" to="/feature-requests">
        All feature requests
      </NavLink>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{f.request_number}</p>
          <h1>{f.title}</h1>
          <p>
            {f.status} · {q.data.demand.client_count} clients
          </p>
        </div>
        <div className="detail-actions">
          {permissions(user, "feature_request.create") && (
            <button onClick={() => setAdding(!adding)}>
              Add client demand
            </button>
          )}
          {actions.map(([n]) => (
            <button key={n} onClick={() => setActionName(n)}>
              {n.replaceAll("-", " ")}
            </button>
          ))}
        </div>
      </div>
      {adding && (
        <form
          className="card create"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <label>
            Client
            <select name="client_id" required defaultValue="">
              <option value="" disabled>
                Select client
              </option>
              {clients.data
                ?.filter((x) => !requested.has(x.id))
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Client context
            <textarea name="client_context" />
          </label>
          <button disabled={add.isPending}>Add demand</button>
        </form>
      )}
      {actionName && (
        <form
          className="card create"
          onSubmit={(e) => {
            e.preventDefault();
            action.mutate({
              ...Object.fromEntries(new FormData(e.currentTarget)),
              version: f.version,
            });
          }}
        >
          <h2>{actionName.replaceAll("-", " ")}</h2>
          {actionName === "reject" && (
            <label>
              Reason
              <textarea name="reason" required />
            </label>
          )}
          {actionName === "mark-duplicate" && (
            <label>
              Original request
              <select name="original_request_id" required defaultValue="">
                <option value="" disabled>
                  Select request
                </option>
                {originals.data?.data
                  .filter((x) => x.id !== id)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.request_number} · {x.title}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <button disabled={action.isPending}>Confirm action</button>
        </form>
      )}
      <div className="detail-grid">
        <section className="panel">
          <h2>Demand</h2>
          <p>
            {q.data.demand.oldest_request_at || "Oldest request unavailable"}
          </p>
          <p>Version {f.version}</p>
        </section>
        <section className="panel">
          <h2>Problem</h2>
          <p>{f.problem_statement}</p>
          <h3>Expected outcome</h3>
          <p>{f.expected_outcome}</p>
        </section>
        <section className="panel">
          <h2>Requesting clients</h2>
          <ul className="compact-list">
            {q.data.requesting_clients.map((x) => (
              <li key={x.client_id}>
                <strong>{x.client_name}</strong>
                <small>{x.client_context || "No context provided"}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
type Document = Item & {
  title: string;
  summary: string;
  content: string;
  author_id: string;
  last_reviewed_at?: string;
};
function Documentation() {
  const user = useOutletContext<User>();
  const [open, setOpen] = useState(false);
  const cache = useQueryClient();
  const q = useQuery<Document[]>({
    queryKey: ["documentation"],
    queryFn: () => get("/documentation"),
  });
  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => post("/documentation", d),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["documentation"] });
      setOpen(false);
    },
  });
  return (
    <section className="clients-workspace">
      <div className="title">
        <h1>Documentation</h1>
        {permissions(user, "documentation.create") && (
          <button onClick={() => setOpen(!open)}>
            {open ? "Cancel" : "New document"}
          </button>
        )}
      </div>
      {open && (
        <form
          className="card create"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Summary
            <textarea name="summary" required />
          </label>
          <label>
            Content
            <textarea name="content" required />
          </label>
          <button disabled={create.isPending}>Create draft</button>
        </form>
      )}
      {q.isPending ? (
        <p role="status">Loading documentation...</p>
      ) : q.isError ? (
        <p role="alert">{message(q.error)}</p>
      ) : !q.data?.length ? (
        <p>No documentation yet.</p>
      ) : (
        <div className="client-table" role="list">
          {q.data.map((x) => (
            <NavLink role="listitem" key={x.id} to={`/documentation/${x.id}`}>
              <span>
                <strong>{x.title}</strong>
                <small>{x.summary}</small>
              </span>
              <span>{x.status}</span>
              <span>v{x.version}</span>
            </NavLink>
          ))}
        </div>
      )}
    </section>
  );
}
function DocumentationDetail() {
  const { id = "" } = useParams();
  const user = useOutletContext<User>();
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [linking, setLinking] = useState(false);
  const q = useQuery<Document>({
    queryKey: ["documentation", id],
    queryFn: () => get(`/documentation/${id}`),
  });
  const releases = useQuery<Release[]>({
    queryKey: ["releases", "documentation-selector"],
    queryFn: () => get("/releases"),
    enabled: linking,
  });
  const refresh = () => {
    cache.invalidateQueries({ queryKey: ["documentation", id] });
    cache.invalidateQueries({ queryKey: ["documentation"] });
  };
  const edit = useMutation({
    mutationFn: (d: Record<string, unknown>) =>
      patch(`/documentation/${id}`, d),
    onSuccess: () => {
      setEditing(false);
      refresh();
    },
  });
  const lifecycle = useMutation({
    mutationFn: (a: string) =>
      post(`/documentation/${id}/${a}`, { version: q.data?.version }),
    onSuccess: refresh,
  });
  const link = useMutation({
    mutationFn: (d: Record<string, unknown>) =>
      post(`/documentation/${id}/releases`, d),
    onSuccess: () => {
      setLinking(false);
      refresh();
    },
  });
  if (q.isPending) return <p role="status">Loading documentation...</p>;
  if (q.isError || !q.data) return <p role="alert">{message(q.error)}</p>;
  const d = q.data;
  const actions: [string, string][] =
    d.status === "DRAFT"
      ? [["submit-review", "documentation.review"]]
      : d.status === "IN_REVIEW"
        ? [["publish", "documentation.publish"]]
        : [];
  if (d.status !== "ARCHIVED")
    actions.push(["archive", "documentation.archive"]);
  return (
    <section className="client-detail">
      <NavLink className="back" to="/documentation">
        All documentation
      </NavLink>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">v{d.version}</p>
          <h1>{d.title}</h1>
          <p>
            {d.status} · {d.summary}
          </p>
        </div>
        <div className="detail-actions">
          {d.status === "DRAFT" &&
            permissions(user, "documentation.update") && (
              <button onClick={() => setEditing(!editing)}>Edit draft</button>
            )}
          {d.status !== "ARCHIVED" &&
            permissions(user, "documentation.update") && (
              <button onClick={() => setLinking(!linking)}>Link release</button>
            )}
          {actions
            .filter(([, p]) => permissions(user, p))
            .map(([a]) => (
              <button
                key={a}
                className={a === "archive" ? "danger" : ""}
                disabled={lifecycle.isPending}
                onClick={() =>
                  window.confirm(`${a.replaceAll("-", " ")} this document?`) &&
                  lifecycle.mutate(a)
                }
              >
                {a.replaceAll("-", " ")}
              </button>
            ))}
        </div>
      </div>
      {editing && (
        <form
          className="card create"
          onSubmit={(e) => {
            e.preventDefault();
            edit.mutate({
              ...Object.fromEntries(new FormData(e.currentTarget)),
              version: d.version,
            });
          }}
        >
          <label>
            Title
            <input name="title" required defaultValue={d.title} />
          </label>
          <label>
            Summary
            <textarea name="summary" required defaultValue={d.summary} />
          </label>
          <label>
            Content
            <textarea name="content" required defaultValue={d.content} />
          </label>
          <button disabled={edit.isPending}>Save draft</button>
        </form>
      )}
      {linking && (
        <form
          className="card create"
          onSubmit={(e) => {
            e.preventDefault();
            link.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <label>
            Release
            <select name="release_id" required defaultValue="">
              <option value="" disabled>
                Select release
              </option>
              {releases.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.version} · {x.title}
                </option>
              ))}
            </select>
          </label>
          <button disabled={link.isPending}>Link release</button>
        </form>
      )}
      <section className="panel">
        <h2>Content</h2>
        <p>{d.content}</p>
        <p>Author: {d.author_id}</p>
        <p>Last reviewed: {d.last_reviewed_at || "Not reviewed"}</p>
      </section>
    </section>
  );
}
function Handoffs() {
  const user = useOutletContext<User>();
  const [params, setParams] = useSearchParams();
  const handoffs = useQuery<Item[]>({
    queryKey: ["handoffs", params.toString()],
    queryFn: () => get(`/handoffs?${params}`),
  });
  const clients = useQuery<Client[]>({
    queryKey: ["clients", "handoff-selector"],
    queryFn: () => get("/clients?limit=100"),
  });
  function filters(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = new URLSearchParams();
    new FormData(e.currentTarget).forEach((v, k) => {
      if (v) next.set(k, String(v));
    });
    setParams(next);
  }
  return (
    <section className="clients-workspace">
      <div className="title">
        <div>
          <p className="eyebrow">Operations queue</p>
          <h1>Handoffs</h1>
        </div>
      </div>
      <form className="client-filters" onSubmit={filters}>
        <label>
          Client
          <select name="client_id" defaultValue={params.get("client_id") || ""}>
            <option value="">All clients</option>
            {clients.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={params.get("status") || ""}>
            <option value="">All statuses</option>
            {[
              "PENDING",
              "ACKNOWLEDGED",
              "FOLLOW_UP_REQUIRED",
              "FOLLOWED_UP",
              "COMPLETED",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <button>Apply filters</button>
      </form>
      {handoffs.isPending ? (
        <p role="status">Loading handoffs...</p>
      ) : handoffs.isError ? (
        <p role="alert">{message(handoffs.error)}</p>
      ) : !handoffs.data?.length ? (
        <p>No handoffs match these filters.</p>
      ) : (
        <div className="client-table" role="list">
          {handoffs.data.map((h) => (
            <NavLink role="listitem" key={h.id} to={`/handoffs/${h.id}`}>
              <span>
                <strong>
                  {clients.data?.find((c) => c.id === h.client_id)?.name ||
                    String(h.client_id)}
                </strong>
                <small>{String(h.release_id)}</small>
              </span>
              <span>{String(h.status)}</span>
              <span>
                {h.requires_follow_up ? "Follow-up required" : "No follow-up"}
              </span>
            </NavLink>
          ))}
        </div>
      )}
    </section>
  );
}
function HandoffDetail() {
  const { id = "" } = useParams();
  const user = useOutletContext<User>();
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const handoff = useQuery<Item>({
    queryKey: ["handoff", id],
    queryFn: () => get(`/handoffs/${id}`),
  });
  const clients = useQuery<Client[]>({
    queryKey: ["clients", "handoff-detail"],
    queryFn: () => get("/clients?limit=100"),
  });
  const releases = useQuery<Release[]>({
    queryKey: ["releases"],
    queryFn: () => get("/releases"),
  });
  function refresh() {
    cache.invalidateQueries({ queryKey: ["handoff", id] });
    cache.invalidateQueries({ queryKey: ["handoffs"] });
  }
  const action = useMutation({
    mutationFn: (name: string) => post(`/handoffs/${id}/${name}`),
    onSuccess: refresh,
    onError: (e) => setError(message(e)),
  });
  if (handoff.isPending) return <p role="status">Loading handoff...</p>;
  if (handoff.isError || !handoff.data)
    return <p role="alert">{message(handoff.error)}</p>;
  const h = handoff.data;
  const canAct = permissions(user, "issue.follow_up");
  return (
    <section className="client-detail">
      <NavLink className="back" to="/handoffs">
        All handoffs
      </NavLink>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Operational handoff</p>
          <h1>
            {clients.data?.find((c) => c.id === h.client_id)?.name ||
              String(h.client_id)}
          </h1>
          <p>{String(h.status)}</p>
        </div>
        <div className="detail-actions">
          {h.status === "PENDING" && canAct && (
            <button
              onClick={() =>
                window.confirm("Acknowledge this handoff?") &&
                action.mutate("acknowledge")
              }
              disabled={action.isPending}
            >
              Acknowledge
            </button>
          )}
          {["ACKNOWLEDGED", "FOLLOWED_UP"].includes(String(h.status)) &&
            canAct && (
              <button
                onClick={() =>
                  window.confirm(
                    "Complete this handoff? Required documentation and follow-up must already be complete.",
                  ) && action.mutate("complete")
                }
                disabled={action.isPending}
              >
                Complete handoff
              </button>
            )}
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="detail-grid">
        <section className="panel">
          <h2>Requirements</h2>
          <dl>
            <div>
              <dt>Release</dt>
              <dd>
                {releases.data?.find((r) => r.id === h.release_id)?.version ||
                  String(h.release_id)}
              </dd>
            </div>
            <div>
              <dt>Follow-up</dt>
              <dd>
                {h.requires_follow_up
                  ? "Required before completion"
                  : "Not required"}
              </dd>
            </div>
            <div>
              <dt>Documentation</dt>
              <dd>
                Published documentation linked to this release is required
                before completion.
              </dd>
            </div>
            <div>
              <dt>Operations owner</dt>
              <dd>{String(h.ops_owner_id)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </section>
  );
}
function FollowUps() {
  const user = useOutletContext<User>();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const cache = useQueryClient();
  const followUps = useQuery<Item[]>({
    queryKey: ["follow-ups", params.toString()],
    queryFn: () => get(`/follow-ups?${params}`),
  });
  const clients = useQuery<Client[]>({
    queryKey: ["clients", "follow-up-selector"],
    queryFn: () => get("/clients?limit=100"),
  });
  const handoffs = useQuery<Item[]>({
    queryKey: ["handoffs", "follow-up-selector"],
    queryFn: () => get("/handoffs"),
  });
  const users = useQuery<User[]>({
    queryKey: ["users", "follow-up-owner"],
    queryFn: () => get("/users"),
    enabled: permissions(user, "client_followup.create"),
  });
  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => post("/follow-ups", data),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["follow-ups"] });
      setOpen(false);
      setError("");
    },
    onError: (e) => setError(message(e)),
  });
  const action = useMutation({
    mutationFn: ({
      id,
      name,
      data,
    }: {
      id: string;
      name: string;
      data?: Record<string, unknown>;
    }) => post(`/follow-ups/${id}/${name}`, data),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["follow-ups"] }),
    onError: (e) => setError(message(e)),
  });
  function filters(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = new URLSearchParams();
    new FormData(e.currentTarget).forEach((v, k) => {
      if (v) next.set(k, String(v));
    });
    setParams(next);
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({
      ...Object.fromEntries(f),
      handoff_id: f.get("handoff_id") || null,
      due_at: new Date(String(f.get("due_at"))).toISOString(),
    });
  }
  return (
    <section className="clients-workspace">
      <div className="title">
        <div>
          <p className="eyebrow">Client delivery</p>
          <h1>Follow-ups</h1>
        </div>
        {permissions(user, "client_followup.create") && (
          <button onClick={() => setOpen(!open)}>
            {open ? "Cancel" : "New follow-up"}
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      <form className="client-filters" onSubmit={filters}>
        <label>
          Client
          <select name="client_id" defaultValue={params.get("client_id") || ""}>
            <option value="">All clients</option>
            {clients.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={params.get("status") || ""}>
            <option value="">All statuses</option>
            {["OPEN", "IN_PROGRESS", "COMPLETED"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <button>Apply filters</button>
      </form>
      {open && (
        <form className="card create" onSubmit={submit}>
          <label>
            Client
            <select name="client_id" required defaultValue="">
              <option value="" disabled>
                Select client
              </option>
              {clients.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Handoff
            <select name="handoff_id" defaultValue="">
              <option value="">None</option>
              {handoffs.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {String(h.id)} · {String(h.status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Owner
            <select name="owner_id" required defaultValue="">
              <option value="" disabled>
                Select owner
              </option>
              {users.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <input name="type" required defaultValue="ISSUE_RESOLUTION" />
          </label>
          <label>
            Reason
            <textarea name="reason" required />
          </label>
          <label>
            Due at
            <input name="due_at" type="datetime-local" required />
          </label>
          <button disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create follow-up"}
          </button>
        </form>
      )}
      {followUps.isPending ? (
        <p role="status">Loading follow-ups...</p>
      ) : followUps.isError ? (
        <p role="alert">{message(followUps.error)}</p>
      ) : !followUps.data?.length ? (
        <p>No follow-ups match these filters.</p>
      ) : (
        <div className="client-table" role="list">
          {followUps.data.map((f) => (
            <div role="listitem" key={f.id}>
              <span>
                <strong>
                  {clients.data?.find((c) => c.id === f.client_id)?.name ||
                    String(f.client_id)}
                </strong>
                <small>{String(f.reason)}</small>
              </span>
              <span>{String(f.status)}</span>
              <span>{String(f.due_at || "")}</span>
              <span className="detail-actions">
                {f.status === "OPEN" &&
                  permissions(user, "client_followup.create") && (
                    <button
                      onClick={() => action.mutate({ id: f.id, name: "start" })}
                      disabled={action.isPending}
                    >
                      Start
                    </button>
                  )}
                {f.status === "IN_PROGRESS" &&
                  permissions(user, "client_followup.complete") && (
                    <button
                      onClick={() => {
                        const result = window.prompt("Completion result");
                        if (result)
                          action.mutate({
                            id: f.id,
                            name: "complete",
                            data: { result },
                          });
                      }}
                      disabled={action.isPending}
                    >
                      Complete
                    </button>
                  )}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
type ManagedRole = {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
};
type ManagedUser = {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  roles: ManagedRole[];
};
type Permission = { id: string; code: string; description?: string };
function Management() {
  const user = useOutletContext<User>();
  if (!permissions(user, "user.manage") && !permissions(user, "role.manage") && !permissions(user, "audit.read"))
    return <Navigate to="/dashboard" replace />;
  return (
    <section>
      <div className="title">
        <h1>Management</h1>
      </div>
      <div className="detail-actions">
        {permissions(user, "user.manage") && (
          <NavLink to="/management/users">Users</NavLink>
        )}
        {permissions(user, "role.manage") && (
          <NavLink to="/management/roles">Roles</NavLink>
        )}
        {permissions(user, "audit.read") && <NavLink to="/management/audit-logs">Audit logs</NavLink>}
        <NavLink to="/management/sessions">My sessions</NavLink>
      </div>
    </section>
  );
}
type AuditLog = { id: string; actor_name?: string; action: string; resource_type: string; resource_id?: string; created_at: string; before_data?: unknown; after_data?: unknown; request_id?: string };
function AuditLogs() {
  const user = useOutletContext<User>(); const [params, setParams] = useSearchParams(); const query = useQuery<Envelope<AuditLog[]>>({ queryKey:["audit-logs", params.toString()], queryFn:()=>getPage(`/audit-logs?${params}`), enabled:permissions(user,"audit.read") });
  if (!permissions(user,"audit.read")) return <Navigate to="/management" replace />;
  return <section><div className="title"><h1>Audit logs</h1></div><form className="client-filters" onSubmit={e=>{e.preventDefault(); const next=new URLSearchParams(); new FormData(e.currentTarget).forEach((v,k)=>{if(v)next.set(k,String(v))}); setParams(next)}}><label>Action<input name="action" defaultValue={params.get("action")||""}/></label><label>Resource<input name="resource_type" defaultValue={params.get("resource_type")||""}/></label><button>Apply filters</button></form>{query.isPending?<p role="status">Loading audit logs...</p>:query.isError?<p role="alert">{message(query.error)}</p>:query.data?.data.length?<ul className="records">{query.data.data.map(x=><li key={x.id}><strong>{x.action}</strong><small>{x.resource_type} {x.resource_id||""} by {x.actor_name||"System"} at {new Date(x.created_at).toLocaleString()}</small><details><summary>Details</summary><pre>{JSON.stringify({before:x.before_data,after:x.after_data,request_id:x.request_id},null,2)}</pre></details></li>)}</ul>:<p>No audit logs.</p>}</section>;
}
function Sessions() {
  const cache=useQueryClient(); const query=useQuery<Session[]>({queryKey:["sessions"],queryFn:auth.sessions}); const revoke=useMutation({mutationFn:auth.revokeSession,onSuccess:()=>cache.invalidateQueries({queryKey:["sessions"]})});
  return <section><div className="title"><h1>My sessions</h1></div>{query.isPending?<p role="status">Loading sessions...</p>:query.isError?<p role="alert">{message(query.error)}</p>:query.data?.length?<ul className="records">{query.data.map(s=><li key={s.id}><strong>{s.user_agent||"Unknown device"}{s.current?" (current)":""}</strong><small>{s.ip_address||"Unknown IP"} · Last used {new Date(s.last_used_at).toLocaleString()}</small><button onClick={()=>{if(confirm("Revoke this session?")) revoke.mutate(s.id)}} disabled={revoke.isPending}>Revoke</button></li>)}</ul>:<p>No active sessions.</p>}</section>;
}
function UsersManagement() {
  const user = useOutletContext<User>();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const cache = useQueryClient();
  const users = useQuery<Envelope<ManagedUser[]>>({
    queryKey: ["management-users", params.toString()],
    queryFn: () => getPage(`/users?${params}`),
    enabled: permissions(user, "user.manage"),
  });
  const roles = useQuery<ManagedRole[]>({
    queryKey: ["roles"],
    queryFn: () => get("/roles"),
    enabled: permissions(user, "user.manage"),
  });
  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => post("/users", d),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["management-users"] });
      setOpen(false);
    },
  });
  if (!permissions(user, "user.manage"))
    return <Navigate to="/management" replace />;
  function filters(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = new URLSearchParams();
    new FormData(e.currentTarget).forEach((v, k) => {
      if (v) next.set(k, String(v));
    });
    next.set("page", "1");
    setParams(next);
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({
      name: f.get("name"),
      email: f.get("email"),
      password: f.get("password"),
      role_ids: f.getAll("role_ids"),
    });
  }
  const page = users.data?.meta?.page || Number(params.get("page") || 1);
  return (
    <section className="clients-workspace">
      <div className="title">
        <div>
          <p className="eyebrow">Access control</p>
          <h1>Users</h1>
        </div>
        <button onClick={() => setOpen(!open)}>
          {open ? "Cancel" : "New user"}
        </button>
      </div>
      <form className="client-filters" onSubmit={filters}>
        <label>
          Search
          <input name="search" defaultValue={params.get("search") || ""} />
        </label>
        <label>
          Status
          <select name="status" defaultValue={params.get("status") || ""}>
            <option value="">All statuses</option>
            <option>ACTIVE</option>
            <option>INACTIVE</option>
          </select>
        </label>
        <label>
          Role
          <select name="role" defaultValue={params.get("role") || ""}>
            <option value="">All roles</option>
            {roles.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button>Apply filters</button>
      </form>
      {open && (
        <form className="card create" onSubmit={submit}>
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" minLength={12} required />
          </label>
          <fieldset>
            <legend>Roles</legend>
            {roles.data?.map((r) => (
              <label key={r.id}>
                <input name="role_ids" type="checkbox" value={r.id} /> {r.name}
              </label>
            ))}
          </fieldset>
          <button disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create user"}
          </button>
          {create.isError && <p role="alert">{message(create.error)}</p>}
        </form>
      )}
      {users.isPending ? (
        <p role="status">Loading users...</p>
      ) : users.isError ? (
        <p role="alert">{message(users.error)}</p>
      ) : !users.data?.data.length ? (
        <p>No users match these filters.</p>
      ) : (
        <div className="client-table" role="list">
          {users.data.data.map((u) => (
            <NavLink
              role="listitem"
              key={u.id}
              to={`/management/users/${u.id}`}
            >
              <span>
                <strong>{u.name}</strong>
                <small>{u.email}</small>
              </span>
              <span>{u.roles.map((r) => r.name).join(", ") || "No roles"}</span>
              <span className="status">
                {u.is_active ? "ACTIVE" : "INACTIVE"}
              </span>
            </NavLink>
          ))}
        </div>
      )}
      <div className="pagination">
        <span>
          Page {page} of {users.data?.meta?.total_pages || 1}
        </span>
        <button
          disabled={page <= 1}
          onClick={() => {
            const n = new URLSearchParams(params);
            n.set("page", String(page - 1));
            setParams(n);
          }}
        >
          Previous
        </button>
        <button
          disabled={!users.data?.meta || page >= users.data.meta.total_pages}
          onClick={() => {
            const n = new URLSearchParams(params);
            n.set("page", String(page + 1));
            setParams(n);
          }}
        >
          Next
        </button>
      </div>
    </section>
  );
}
function UserManagementDetail() {
  const { id = "" } = useParams();
  const user = useOutletContext<User>();
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const q = useQuery<ManagedUser>({
    queryKey: ["management-user", id],
    queryFn: () => get(`/users/${id}`),
    enabled: permissions(user, "user.manage"),
  });
  const roles = useQuery<ManagedRole[]>({
    queryKey: ["roles"],
    queryFn: () => get("/roles"),
    enabled: permissions(user, "user.manage"),
  });
  const update = useMutation({
    mutationFn: (d: Record<string, unknown>) => patch(`/users/${id}`, d),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["management-user", id] });
      cache.invalidateQueries({ queryKey: ["management-users"] });
      setError("");
    },
    onError: (e) => setError(message(e)),
  });
  const setRoles = useMutation({
    mutationFn: (role_ids: string[]) => put(`/users/${id}/roles`, { role_ids }),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["management-user", id] });
      cache.invalidateQueries({ queryKey: ["management-users"] });
      setError("");
    },
    onError: (e) => setError(message(e)),
  });
  const sessions = useQuery<Session[]>({ queryKey: ["user-sessions", id], queryFn: () => get(`/users/${id}/sessions`), enabled: permissions(user, "user.manage") });
  const revokeSession = useMutation({ mutationFn: (sessionID: string) => del(`/users/${id}/sessions/${sessionID}`), onSuccess: () => cache.invalidateQueries({ queryKey: ["user-sessions", id] }) });
  if (!permissions(user, "user.manage"))
    return <Navigate to="/management" replace />;
  if (q.isPending) return <p role="status">Loading user...</p>;
  if (q.isError || !q.data) return <p role="alert">{message(q.error)}</p>;
  const u = q.data;
  return (
    <section className="client-detail">
      <NavLink className="back" to="/management/users">
        All users
      </NavLink>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{u.email}</p>
          <h1>{u.name}</h1>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="detail-grid">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            update.mutate({ name: f.get("name"), status: f.get("status") });
          }}
        >
          <h2>User details</h2>
          <label>
            Name
            <input name="name" defaultValue={u.name} required />
          </label>
          <label>
            Status
            <select
              name="status"
              defaultValue={u.is_active ? "ACTIVE" : "INACTIVE"}
            >
              <option>ACTIVE</option>
              <option>INACTIVE</option>
            </select>
          </label>
          <button disabled={update.isPending}>
            {update.isPending ? "Saving..." : "Save details"}
          </button>
        </form>
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            setRoles.mutate(
              new FormData(e.currentTarget).getAll("role_ids").map(String),
            );
          }}
        >
          <h2>Roles</h2>
          {roles.data?.map((r) => (
            <label key={r.id}>
              <input
                name="role_ids"
                type="checkbox"
                value={r.id}
                defaultChecked={u.roles.some((x) => x.id === r.id)}
              />{" "}
              {r.name}
            </label>
          ))}
          <button disabled={setRoles.isPending}>
            {setRoles.isPending ? "Saving..." : "Save roles"}
          </button>
        </form>
        <div className="panel">
          <h2>Sessions</h2>
          {sessions.isPending ? <p>Loading sessions...</p> : sessions.isError ? <p role="alert">{message(sessions.error)}</p> : sessions.data?.length ? <ul className="records">{sessions.data.map((session) => <li key={session.id}><strong>{session.user_agent || "Unknown device"}</strong><small>{session.ip_address || "Unknown IP"} · {new Date(session.last_used_at).toLocaleString()}</small><button onClick={() => { if (confirm("Revoke this session?")) revokeSession.mutate(session.id) }} disabled={revokeSession.isPending}>Revoke</button></li>)}</ul> : <p>No active sessions.</p>}
        </div>
      </div>
    </section>
  );
}
function RolesManagement() {
  const user = useOutletContext<User>();
  const [open, setOpen] = useState(false);
  const cache = useQueryClient();
  const roles = useQuery<ManagedRole[]>({
    queryKey: ["roles"],
    queryFn: () => get("/roles"),
    enabled: permissions(user, "role.manage"),
  });
  const permissionsList = useQuery<Permission[]>({
    queryKey: ["permissions"],
    queryFn: () => get("/permissions"),
    enabled: open && permissions(user, "role.manage"),
  });
  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => post("/roles", d),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["roles"] });
      setOpen(false);
    },
  });
  if (!permissions(user, "role.manage"))
    return <Navigate to="/management" replace />;
  return (
    <section className="clients-workspace">
      <div className="title">
        <div>
          <p className="eyebrow">Access control</p>
          <h1>Roles</h1>
        </div>
        <button onClick={() => setOpen(!open)}>
          {open ? "Cancel" : "New role"}
        </button>
      </div>
      {open && (
        <RoleForm
          permissions={permissionsList.data}
          pending={create.isPending}
          error={create.isError ? message(create.error) : ""}
          submit={(d) => create.mutate(d)}
          action="Create role"
        />
      )}
      {roles.isPending ? (
        <p role="status">Loading roles...</p>
      ) : roles.isError ? (
        <p role="alert">{message(roles.error)}</p>
      ) : !roles.data?.length ? (
        <p>No roles.</p>
      ) : (
        <div className="client-table" role="list">
          {roles.data.map((r) => (
            <NavLink
              role="listitem"
              key={r.id}
              to={`/management/roles/${r.id}`}
            >
              <span>
                <strong>{r.name}</strong>
                <small>{r.description || "No description"}</small>
              </span>
              <span>{r.permissions.length} permissions</span>
            </NavLink>
          ))}
        </div>
      )}
    </section>
  );
}
function RoleForm({
  permissions,
  selected = [],
  pending,
  error,
  submit,
  action,
  role,
}: {
  permissions?: Permission[];
  selected?: string[];
  pending: boolean;
  error: string;
  submit: (d: Record<string, unknown>) => void;
  action: string;
  role?: ManagedRole;
}) {
  return (
    <form
      className="card create"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        submit({
          name: f.get("name"),
          description: f.get("description") || null,
          permission_ids: f.getAll("permission_ids"),
        });
      }}
    >
      <label>
        Name
        <input
          name="name"
          required
          pattern="[A-Z][A-Z0-9_]{1,99}"
          defaultValue={role?.name}
        />
      </label>
      <label>
        Description
        <textarea name="description" defaultValue={role?.description} />
      </label>
      <fieldset>
        <legend>Permissions</legend>
        {permissions?.map((p) => (
          <label key={p.id}>
            <input
              name="permission_ids"
              type="checkbox"
              value={p.id}
              defaultChecked={selected.includes(p.id)}
            />{" "}
            {p.code}
            {p.description ? ` - ${p.description}` : ""}
          </label>
        ))}
      </fieldset>
      <button disabled={pending}>{pending ? "Saving..." : action}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
function RoleManagementDetail() {
  const { id = "" } = useParams();
  const user = useOutletContext<User>();
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const q = useQuery<ManagedRole>({
    queryKey: ["role", id],
    queryFn: () => get(`/roles/${id}`),
    enabled: permissions(user, "role.manage"),
  });
  const all = useQuery<Permission[]>({
    queryKey: ["permissions"],
    queryFn: () => get("/permissions"),
    enabled: permissions(user, "role.manage"),
  });
  const update = useMutation({
    mutationFn: (d: Record<string, unknown>) => patch(`/roles/${id}`, d),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["role", id] });
      cache.invalidateQueries({ queryKey: ["roles"] });
      setEditing(false);
    },
  });
  const remove = useMutation({
    mutationFn: () => del(`/roles/${id}`),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["roles"] }),
  });
  const nav = useNavigate();
  if (!permissions(user, "role.manage"))
    return <Navigate to="/management" replace />;
  if (q.isPending) return <p role="status">Loading role...</p>;
  if (q.isError || !q.data) return <p role="alert">{message(q.error)}</p>;
  const role = q.data;
  return (
    <section className="client-detail">
      <NavLink className="back" to="/management/roles">
        All roles
      </NavLink>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Access control</p>
          <h1>{role.name}</h1>
          <p>{role.description || "No description"}</p>
        </div>
        <div className="detail-actions">
          <button onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit role"}
          </button>
          <button
            className="danger"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Delete ${role.name}? This cannot be undone.`))
                remove.mutate(undefined, {
                  onSuccess: () => nav("/management/roles"),
                });
            }}
          >
            Delete role
          </button>
        </div>
      </div>
      {editing ? (
        <RoleForm
          role={role}
          selected={role.permissions.map((p) => p.id)}
          permissions={all.data}
          pending={update.isPending}
          error={update.isError ? message(update.error) : ""}
          submit={(d) => update.mutate(d)}
          action="Save role"
        />
      ) : (
        <section className="panel">
          <h2>Permissions</h2>
          {role.permissions.length ? (
            <ul className="compact-list">
              {role.permissions.map((p) => (
                <li key={p.id}>
                  <strong>{p.code}</strong>
                  <small>{p.description || ""}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No permissions assigned.</p>
          )}
        </section>
      )}
    </section>
  );
}
export default function App() {
  return (
    <QueryClientProvider client={client}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/issues/:id" element={<IssueDetail />} />
          <Route path="/feature-requests" element={<FeatureRequests />} />
          <Route
            path="/feature-requests/:id"
            element={<FeatureRequestDetail />}
          />
          <Route path="/releases" element={<Releases />} />
          <Route path="/releases/:id" element={<ReleaseDetail />} />
          <Route path="/handoffs" element={<Handoffs />} />
          <Route path="/handoffs/:id" element={<HandoffDetail />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/documentation/:id" element={<DocumentationDetail />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/management" element={<Management />} />
          <Route path="/management/audit-logs" element={<AuditLogs />} />
          <Route path="/management/sessions" element={<Sessions />} />
          <Route path="/management/users" element={<UsersManagement />} />
          <Route
            path="/management/users/:id"
            element={<UserManagementDetail />}
          />
          <Route path="/management/roles" element={<RolesManagement />} />
          <Route
            path="/management/roles/:id"
            element={<RoleManagementDetail />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </QueryClientProvider>
  );
}
