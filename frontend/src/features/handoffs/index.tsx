import { useState, type FormEvent } from "react";
import { NavLink, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, message, post, type User } from "../../api";
import { permissions } from "../../lib/utils";
import type { Client, Item, Release } from "../../lib/types";

export function Handoffs() {
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

export function HandoffDetail() {
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
