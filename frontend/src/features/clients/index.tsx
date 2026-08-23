import { useState, type FormEvent } from "react";
import { NavLink, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fieldErrors, get, message, patch, post, type User } from "../../api";
import { label, permissions } from "../../lib/utils";
import { toast } from "../../components/ui/toast";
import { Field, Input, Select } from "../../components/ui/field";
import { Button } from "../../components/ui/button";
import { HealthBadge, StatusBadge } from "../../components/ui/badge";
import { EmptyState } from "../../components/ui/state";
import { ConfirmDialog } from "../../components/ui/dialog";
import type { Client, Health, Item } from "../../lib/types";

type Page<T> = { data: T[] };
const clientTypes = ["ELEMENTARY", "JUNIOR_HIGH", "SENIOR_HIGH", "VOCATIONAL", "OTHER"];
const clientStatuses = ["ACTIVE", "ONBOARDING", "INACTIVE"];

const clientSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  type: z.enum(clientTypes as [string, ...string[]]),
  status: z.enum(clientStatuses as [string, ...string[]]),
  primary_owner_id: z.string().min(1, "Select a primary owner"),
});
type ClientValues = z.infer<typeof clientSchema>;

function clientPage(url: string) {
  return get<Client[]>(url).then((data) => ({ data }) as Page<Client>);
}

export function Clients() {
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
  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors },
  } = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { status: "ONBOARDING" },
  });
  const create = useMutation({
    mutationFn: (data: ClientValues) => post("/clients", data),
    onSuccess: () => {
      setOpen(false);
      reset();
      toast.success("Client created.");
      query.refetch();
    },
    onError: (e) => {
      const fields = fieldErrors(e);
      Object.entries(fields).forEach(([name, msg]) =>
        setFieldError(name as keyof ClientValues, { message: msg }),
      );
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
          <input name="search" defaultValue={params.get("search") || ""} placeholder="Name or code" />
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
            <option>HEALTHY</option>
            <option>ATTENTION</option>
            <option>AT_RISK</option>
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
          aria-label="Create client"
          onSubmit={handleSubmit((values) => create.mutate(values))}
          noValidate
        >
          <Field label="Code" error={errors.code?.message}>
            <Input aria-invalid={!!errors.code} {...register("code")} />
          </Field>
          <Field label="Name" error={errors.name?.message}>
            <Input aria-invalid={!!errors.name} {...register("name")} />
          </Field>
          <Field label="Type" error={errors.type?.message}>
            <Select aria-invalid={!!errors.type} {...register("type")}>
              <option value="" disabled>
                Select
              </option>
              {clientTypes.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <Select defaultValue="ONBOARDING" {...register("status")}>
              {clientStatuses.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Field label="Primary owner" error={errors.primary_owner_id?.message}>
            <Select
              aria-invalid={!!errors.primary_owner_id}
              disabled={users.isPending || users.isError}
              {...register("primary_owner_id")}
            >
              <option value="" disabled>
                {users.isPending ? "Loading users..." : "Select owner"}
              </option>
              {users.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.email})
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" pending={create.isPending} pendingLabel="Creating...">
            Create client
          </Button>
          {create.isError && !Object.keys(errors).length && (
            <p role="alert">{message(create.error)}</p>
          )}
          {users.isError && <p role="alert">{message(users.error)}</p>}
        </form>
      )}
      {query.isPending ? (
        <p role="status">Loading clients...</p>
      ) : query.isError ? (
        <p role="alert">{message(query.error)}</p>
      ) : !query.data?.data.length ? (
        <EmptyState
          title="No clients found"
          hint="Try changing your filters or add a new client."
        />
      ) : (
        <div className="client-table" role="list">
          {query.data.data.map((x) => (
            <NavLink role="listitem" key={x.id} to={`/clients/${x.id}`}>
              <span>
                <strong>{x.name}</strong>
                <small>{x.code}</small>
              </span>
              <span>{x.type?.replaceAll("_", " ")}</span>
              <StatusBadge status={String(x.status)} />
              <span>{x.city || x.province || "Location unavailable"}</span>
              {x.health ? (
                <HealthBadge
                  classification={x.health.classification}
                  score={x.health.score}
                />
              ) : (
                <span>Health unavailable</span>
              )}
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

export function ClientDetail() {
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
  const health = useQuery<Health>({
    queryKey: ["client", id, "health"],
    queryFn: () => get(`/clients/${id}/health`),
  });
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
    mutationFn: (data: Record<string, unknown>) => patch(`/clients/${id}`, data),
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
      {health.isPending ? (
        <p role="status">Calculating health...</p>
      ) : health.isError ? (
        <p role="alert">{message(health.error)}</p>
      ) : (
        health.data && (
          <section className="health-card" aria-label="Client health">
            <div>
              <p className="eyebrow">Client health</p>
              <strong>
                {health.data.score}
                <small>/100</small>
              </strong>
              <span className={`health health-${health.data.classification.toLowerCase()}`}>
                {health.data.classification.replaceAll("_", " ")}
              </span>
            </div>
            <ul>
              {health.data.factors.length ? (
                health.data.factors.map((f) => (
                  <li key={f.code}>
                    <b>{f.impact}</b> {f.description}
                  </li>
                ))
              ) : (
                <li>No current risk factors.</li>
              )}
            </ul>
          </section>
        )
      )}
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
      <ConfirmDialog
        title={`Archive ${client.name}?`}
        message="Archived clients leave active service. This action is traceable."
        open={archiving}
        onClose={() => setArchiving(false)}
        onConfirm={() => archive.mutate()}
        confirmLabel="Archive client"
        danger
        pending={archive.isPending}
      />
    </section>
  );
}
