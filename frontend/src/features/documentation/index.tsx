import { useState, type FormEvent } from "react";
import { NavLink, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, getPage, message, patch, post, type Envelope, type User } from "../../api";
import { permissions } from "../../lib/utils";
import type { FeatureRequest, Item, Release } from "../../lib/types";

type Document = Item & {
  title: string;
  summary: string;
  content: string;
  author_id: string;
  last_reviewed_at?: string;
};

export function Documentation() {
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

export function DocumentationDetail() {
  const { id = "" } = useParams();
  const user = useOutletContext<User>();
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkingFeature, setLinkingFeature] = useState(false);
  const q = useQuery<Document>({
    queryKey: ["documentation", id],
    queryFn: () => get(`/documentation/${id}`),
  });
  const releases = useQuery<Release[]>({
    queryKey: ["releases", "documentation-selector"],
    queryFn: () => get("/releases"),
    enabled: linking,
  });
  const featureRequests = useQuery<Envelope<FeatureRequest[]>>({
    queryKey: ["feature-requests", "documentation-selector"],
    queryFn: () => getPage("/feature-requests?limit=100"),
    enabled: linkingFeature,
  });
  const refresh = () => {
    cache.invalidateQueries({ queryKey: ["documentation", id] });
    cache.invalidateQueries({ queryKey: ["documentation"] });
  };
  const edit = useMutation({
    mutationFn: (d: Record<string, unknown>) => patch(`/documentation/${id}`, d),
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
  const linkFeature = useMutation({
    mutationFn: (d: Record<string, unknown>) =>
      post(`/documentation/${id}/feature-requests`, d),
    onSuccess: () => {
      setLinkingFeature(false);
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
  if (d.status !== "ARCHIVED") actions.push(["archive", "documentation.archive"]);
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
          {d.status !== "ARCHIVED" &&
            permissions(user, "documentation.update") && (
              <button onClick={() => setLinkingFeature(!linkingFeature)}>
                Link feature request
              </button>
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
      {linkingFeature && (
        <form
          className="card create"
          onSubmit={(e) => {
            e.preventDefault();
            linkFeature.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <label>
            Feature request
            <select name="feature_request_id" required defaultValue="">
              <option value="" disabled>
                Select feature request
              </option>
              {featureRequests.data?.data.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.request_number} · {x.title}
                </option>
              ))}
            </select>
          </label>
          <button disabled={linkFeature.isPending}>Link feature request</button>
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
