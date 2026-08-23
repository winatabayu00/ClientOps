import { useState, type FormEvent } from "react";
import { Navigate, NavLink, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { auth, del, get, getPage, message, patch, post, put, type Envelope, type Session, type User } from "../../api";
import { permissions } from "../../lib/utils";
import { Pagination } from "../../components/ui/pagination";
import { EmptyState } from "../../components/ui/state";

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
type AuditLog = {
  id: string;
  actor_name?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  created_at: string;
  before_data?: unknown;
  after_data?: unknown;
  request_id?: string;
};

export function Management() {
  const user = useOutletContext<User>();
  if (permissions(user, "user.manage")) return <Navigate to="/management/users" replace />;
  if (permissions(user, "role.manage")) return <Navigate to="/management/roles" replace />;
  if (permissions(user, "audit.read")) return <Navigate to="/management/audit-logs" replace />;
  return <Navigate to="/management/sessions" replace />;
}

export function AuditLogs() {
  const user = useOutletContext<User>();
  const [params, setParams] = useSearchParams();
  const query = useQuery<Envelope<AuditLog[]>>({
    queryKey: ["audit-logs", params.toString()],
    queryFn: () => getPage(`/audit-logs?${params}`),
    enabled: permissions(user, "audit.read"),
  });
  if (!permissions(user, "audit.read"))
    return <Navigate to="/management" replace />;
  return (
    <section>
      <div className="title">
        <h1>Audit logs</h1>
      </div>
      <form
        className="client-filters"
        onSubmit={(e) => {
          e.preventDefault();
          const next = new URLSearchParams();
          new FormData(e.currentTarget).forEach((v, k) => {
            if (v) next.set(k, String(v));
          });
          setParams(next);
        }}
      >
        <label>
          Action
          <input name="action" defaultValue={params.get("action") || ""} />
        </label>
        <label>
          Resource
          <input
            name="resource_type"
            defaultValue={params.get("resource_type") || ""}
          />
        </label>
        <button>Apply filters</button>
      </form>
      {query.isPending ? (
        <p role="status">Loading audit logs...</p>
      ) : query.isError ? (
        <p role="alert">{message(query.error)}</p>
      ) : query.data?.data.length ? (
        <ul className="records">
          {query.data.data.map((x) => (
            <li key={x.id}>
              <strong>{x.action}</strong>
              <small>
                {x.resource_type} {x.resource_id || ""} by {x.actor_name || "System"}{" "}
                at {new Date(x.created_at).toLocaleString()}
              </small>
              <details>
                <summary>Details</summary>
                <pre>
                  {JSON.stringify(
                    {
                      before: x.before_data,
                      after: x.after_data,
                      request_id: x.request_id,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p>No audit logs.</p>
      )}
    </section>
  );
}

export function Sessions() {
  const cache = useQueryClient();
  const query = useQuery<Session[]>({ queryKey: ["sessions"], queryFn: auth.sessions });
  const revoke = useMutation({
    mutationFn: auth.revokeSession,
    onSuccess: () => cache.invalidateQueries({ queryKey: ["sessions"] }),
  });
  return (
    <section>
      <div className="title">
        <h1>My sessions</h1>
      </div>
      {query.isPending ? (
        <p role="status">Loading sessions...</p>
      ) : query.isError ? (
        <p role="alert">{message(query.error)}</p>
      ) : query.data?.length ? (
        <ul className="records">
          {query.data.map((s) => (
            <li key={s.id}>
              <strong>
                {s.user_agent || "Unknown device"}
                {s.current ? " (current)" : ""}
              </strong>
              <small>
                {s.ip_address || "Unknown IP"} · Last used{" "}
                {new Date(s.last_used_at).toLocaleString()}
              </small>
              <button
                onClick={() => {
                  if (confirm("Revoke this session?")) revoke.mutate(s.id);
                }}
                disabled={revoke.isPending}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No active sessions.</p>
      )}
    </section>
  );
}

export function UsersManagement() {
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
        <EmptyState title="No users match these filters" />
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
      <Pagination
        page={page}
        totalPages={users.data?.meta?.total_pages || 1}
        total={users.data?.meta?.total}
        onPage={(p) => {
          const n = new URLSearchParams(params);
          n.set("page", String(p));
          setParams(n);
        }}
      />
    </section>
  );
}

export function UserManagementDetail() {
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
  const sessions = useQuery<Session[]>({
    queryKey: ["user-sessions", id],
    queryFn: () => get(`/users/${id}/sessions`),
    enabled: permissions(user, "user.manage"),
  });
  const revokeSession = useMutation({
    mutationFn: (sessionID: string) => del(`/users/${id}/sessions/${sessionID}`),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["user-sessions", id] }),
  });
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
          {sessions.isPending ? (
            <p>Loading sessions...</p>
          ) : sessions.isError ? (
            <p role="alert">{message(sessions.error)}</p>
          ) : sessions.data?.length ? (
            <ul className="records">
              {sessions.data.map((session) => (
                <li key={session.id}>
                  <strong>{session.user_agent || "Unknown device"}</strong>
                  <small>
                    {session.ip_address || "Unknown IP"} ·{" "}
                    {new Date(session.last_used_at).toLocaleString()}
                  </small>
                  <button
                    onClick={() => {
                      if (confirm("Revoke this session?"))
                        revokeSession.mutate(session.id);
                    }}
                    disabled={revokeSession.isPending}
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No active sessions.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function RolesManagement() {
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
              <span>{r.permissions?.length || 0} permissions</span>
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

export function RoleManagementDetail() {
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
          {role.permissions?.length ? (
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
