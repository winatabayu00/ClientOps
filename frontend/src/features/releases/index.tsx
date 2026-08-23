import { useState, type FormEvent } from "react";
import { NavLink, useOutletContext, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, getPage, message, post, type User } from "../../api";
import { label, permissions } from "../../lib/utils";
import { toast } from "../../components/ui/toast";
import { ConfirmDialog } from "../../components/ui/dialog";
import type { Client, Issue, Item, Release } from "../../lib/types";

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

export function Releases() {
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
        <form className="card create" aria-label="Create release" onSubmit={submit}>
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

export function ReleaseDetail() {
  const { id = "" } = useParams();
  const user = useOutletContext<User>();
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const detail = useQuery<ReleaseDetail>({
    queryKey: ["release", id],
    queryFn: () => get(`/releases/${id}`),
  });
  const clients = useQuery<Client[]>({
    queryKey: ["clients", "release-selector"],
    queryFn: () => get("/clients?limit=100"),
  });
  const issues = useQuery<Issue[]>({
    queryKey: ["issues", "release-selector"],
    queryFn: () =>
      getPage<Issue[]>("/issues?limit=100&sort=reported_at&order=desc").then(
        (page) => page.data,
      ),
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
    onSuccess: () => {
      setConfirming(false);
      toast.success("Release published.");
      refresh();
    },
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
    const f = new FormData(e.currentTarget);
    item.mutate({
      ...Object.fromEntries(f),
      issue_ids: Array.from(f.getAll("issue_ids"), String),
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
              <button onClick={() => setConfirming(true)}>
                Publish release
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
            <form aria-label="Add release item" onSubmit={addItem}>
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
              <label>
                Related issues
                <select name="issue_ids" multiple>
                  {issues.data?.map((issue) => (
                    <option key={issue.id} value={issue.id}>
                      {issue.issue_number} · {issue.title}
                    </option>
                  ))}
                </select>
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
            <form aria-label="Add client impact" onSubmit={addImpact}>
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
      <ConfirmDialog
        title={`Publish ${release.version}?`}
        message={
          <>
            This will mark the release as published, generate client impacts,
            and create operational handoffs for affected clients.
          </>
        }
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => publish.mutate()}
        confirmLabel="Publish release"
        pending={publish.isPending}
      />
    </section>
  );
}
