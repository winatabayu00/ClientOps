import { useState, type FormEvent } from "react";
import { NavLink, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, getPage, message, post, type Envelope, type User } from "../../api";
import { permissions } from "../../lib/utils";
import { toast } from "../../components/ui/toast";
import { StatusBadge } from "../../components/ui/badge";
import { Pagination } from "../../components/ui/pagination";
import { EmptyState } from "../../components/ui/state";
import type { Client, FeatureRequest, Item } from "../../lib/types";

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

export function FeatureRequests() {
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
      toast.success("Feature request created.");
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
          aria-label="Create feature request"
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
        <EmptyState
          title="No feature requests match these filters"
          hint="Try changing your filters or create a new request."
        />
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
              <StatusBadge status={x.status || ""} />
              <span>{x.demand_count || 0} clients</span>
            </NavLink>
          ))}
        </div>
      )}
      <Pagination
        page={q.data?.meta?.page || 1}
        totalPages={q.data?.meta?.total_pages || 1}
        total={q.data?.meta?.total}
        onPage={move}
      />
    </section>
  );
}

export function FeatureRequestDetail() {
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
            <button onClick={() => setAdding(!adding)}>Add client demand</button>
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
