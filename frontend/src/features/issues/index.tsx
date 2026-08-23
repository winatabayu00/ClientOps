import { useState, type FormEvent } from "react";
import { NavLink, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiBase, del, fieldErrors, get, getPage, message, patch, post, upload, type Envelope, type User } from "../../api";
import { label, permissions } from "../../lib/utils";
import { toast } from "../../components/ui/toast";
import { Field, Input, Select, Textarea } from "../../components/ui/field";
import { Button } from "../../components/ui/button";
import { SeverityBadge, StatusBadge } from "../../components/ui/badge";
import { Pagination } from "../../components/ui/pagination";
import { EmptyState } from "../../components/ui/state";
import type { Client, Issue, Item, Release } from "../../lib/types";

type History = Item & {
  from_status?: string;
  to_status?: string;
  changed_by?: string;
  reason?: string;
  created_at?: string;
};
type WorkStateHistory = Item & {
  state?: string;
  reason?: string;
  started_at?: string;
  ended_at?: string;
};
type Attachment = {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

const severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const workStates = ["ACTIVE", "WAITING_CLIENT", "WAITING_OPS", "WAITING_PRODUCT", "WAITING_ENGINEERING", "WAITING_RELEASE", "BLOCKED"];
const issueStatuses = ["REPORTED", "TRIAGED", "INVESTIGATING", "IN_DEVELOPMENT", "QA", "RELEASED", "FOLLOW_UP", "CLOSED", "REOPENED", "CANCELLED"];

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

const issueSchema = z.object({
  client_id: z.string().min(1, "Select a client"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  severity: z.enum(severities as [string, ...string[]]),
  category: z.string().optional(),
});
type IssueValues = z.infer<typeof issueSchema>;

export function Issues() {
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
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    reset,
    formState: { errors },
  } = useForm<IssueValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: { severity: "MEDIUM" },
  });
  const createIssue = useMutation({
    mutationFn: (data: IssueValues) => post("/issues", data),
    onSuccess: () => {
      setOpen(false);
      setCreated(true);
      reset();
      toast.success("Issue created.");
      issues.refetch();
    },
    onError: (e) => {
      const fields = fieldErrors(e);
      Object.entries(fields).forEach(([name, msg]) =>
        setFieldError(name as keyof IssueValues, { message: msg }),
      );
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
    handleSubmit((values) => createIssue.mutate(values))(e);
  }
  return (
    <section className="clients-workspace">
      <div className="title">
        <div>
          <p className="eyebrow">Delivery workspace</p>
          <h1>Issues</h1>
        </div>
        {permissions(user, "issue.create") && (
          <button
            onClick={() => {
              setOpen(!open);
              setCreated(false);
            }}
          >
            {open ? "Cancel" : "New issue"}
          </button>
        )}
      </div>
      {created && <p role="status">Issue created.</p>}
      <form className="client-filters" onSubmit={filters}>
        <label>
          Search
          <input name="search" defaultValue={params.get("search") || ""} placeholder="Title or issue number" />
        </label>
        <label>
          Work state
          <select name="work_state" defaultValue={params.get("work_state") || ""}>
            <option value="">All work states</option>
            {workStates.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          SLA
          <select name="sla_status" defaultValue={params.get("sla_status") || ""}>
            <option value="">All SLA states</option>
            <option>BREACHED</option>
            <option>APPROACHING</option>
            <option>ON_TRACK</option>
            <option>MET</option>
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
        <form className="card create" aria-label="Create issue" onSubmit={create} noValidate>
          <Field label="Client" error={errors.client_id?.message}>
            <Select
              aria-invalid={!!errors.client_id}
              disabled={clients.isPending || clients.isError}
              {...register("client_id")}
            >
              <option value="" disabled>
                {clients.isPending ? "Loading clients..." : "Select client"}
              </option>
              {clients.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title" error={errors.title?.message}>
            <Input aria-invalid={!!errors.title} {...register("title")} />
          </Field>
          <Field label="Description" error={errors.description?.message}>
            <Textarea
              aria-invalid={!!errors.description}
              {...register("description")}
            />
          </Field>
          <Field label="Severity" error={errors.severity?.message}>
            <Select defaultValue="MEDIUM" {...register("severity")}>
              {severities.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Field label="Category">
            <Input {...register("category")} />
          </Field>
          <Button type="submit" pending={createIssue.isPending} pendingLabel="Creating...">
            Create issue
          </Button>
          {createIssue.isError && !Object.keys(errors).length && (
            <p role="alert">{message(createIssue.error)}</p>
          )}
          {clients.isError && <p role="alert">{message(clients.error)}</p>}
        </form>
      )}
      {issues.isPending ? (
        <p role="status">Loading issues...</p>
      ) : issues.isError ? (
        <p role="alert">{message(issues.error)}</p>
      ) : !issues.data?.data?.length ? (
        <EmptyState
          title="No issues match these filters"
          hint="Try changing your filters or create a new issue."
        />
      ) : (
        <div className="client-table" role="list">
          {issues.data.data?.map((x) => (
            <NavLink role="listitem" key={x.id} to={`/issues/${x.id}`}>
              <span>
                <strong>{String(x.title || "")}</strong>
                <small>{String(x.issue_number || "")}</small>
              </span>
              <StatusBadge status={String(x.status || "")} />
              <SeverityBadge severity={String(x.severity || "")} />
              <span>{String(x.work_state || "ACTIVE")}</span>
              <span>{String(x.sla_status || "NOT_SET")}</span>
              <span>{String(x.category || "Uncategorized")}</span>
            </NavLink>
          ))}
        </div>
      )}
      <Pagination
        page={issues.data?.meta?.page || Number(params.get("page") || 1)}
        totalPages={issues.data?.meta?.total_pages || 1}
        total={issues.data?.meta?.total}
        onPage={move}
      />
    </section>
  );
}

export function IssueDetail() {
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
    queryKey: ["issue", id, "work-history"],
    queryFn: () => get(`/issues/${id}/work-history`),
  });
  const attachments = useQuery<Attachment[]>({
    queryKey: ["issue", id, "attachments"],
    queryFn: () => get(`/issues/${id}/attachments`),
  });
  const clients = useQuery<Client[]>({
    queryKey: ["clients", "issue-selector"],
    queryFn: () => get("/clients?limit=100"),
  });
  const users = useQuery<User[]>({
    queryKey: ["users", "issue-assignees"],
    queryFn: () => get("/users"),
    enabled: permissions(user, "issue.assign"),
  });
  const releases = useQuery<Release[]>({
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
  const attachment = useMutation({
    mutationFn: (file: File) => upload(`/issues/${id}/attachments`, file),
    onSuccess: refresh,
    onError: (e) => setError(message(e)),
  });
  const removeAttachment = useMutation({
    mutationFn: (attachmentID: string) =>
      del(`/issues/${id}/attachments/${attachmentID}`),
    onSuccess: refresh,
    onError: (e) => setError(message(e)),
  });
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
            <input name="title" required defaultValue={String(issue.title || "")} />
          </label>
          <label>
            Description
            <textarea name="description" required defaultValue={String(issue.description || "")} />
          </label>
          <label>
            Category
            <input name="category" defaultValue={String(issue.category || "")} />
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
            <div>
              <dt>Work state</dt>
              <dd>{String(issue.work_state || "ACTIVE")}</dd>
            </div>
            <div>
              <dt>SLA</dt>
              <dd>
                {String(issue.sla_status || "NOT_SET")}
                {issue.sla_deadline
                  ? ` · ${new Date(issue.sla_deadline).toLocaleString()}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>Assignee</dt>
              <dd>{assignee}</dd>
            </div>
            <div>
              <dt>Release</dt>
              <dd>{release ? label(release) : issue.release_id || "Not released"}</dd>
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
          {permissions(user, "issue.update") && (
            <label>
              Upload PNG, JPEG, PDF, or text file (10 MB max)
              <input
                type="file"
                accept="image/png,image/jpeg,application/pdf,text/plain"
                disabled={attachment.isPending}
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) attachment.mutate(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          )}
          {attachments.isPending ? (
            <p role="status">Loading attachments...</p>
          ) : attachments.isError ? (
            <p role="alert">{message(attachments.error)}</p>
          ) : attachments.data?.length ? (
            <ul>
              {attachments.data.map((x) => (
                <li key={x.id}>
                  <a href={`${apiBase}/issues/${id}/attachments/${x.id}/download`}>
                    {x.filename}
                  </a>{" "}
                  ({Math.ceil(x.size_bytes / 1024)} KB){" "}
                  {permissions(user, "issue.update") && (
                    <button
                      onClick={() =>
                        window.confirm(`Delete ${x.filename}?`) &&
                        removeAttachment.mutate(x.id)
                      }
                      disabled={removeAttachment.isPending}
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No attachments.</p>
          )}
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
                    <input name="category" required defaultValue={String(issue.category || "")} />
                  </label>
                  <label>
                    Severity
                    <select name="severity" required defaultValue={String(issue.severity || "MEDIUM")}>
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
                      {releases.isPending ? "Loading releases..." : "Select release"}
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
                    name={selected === "close" ? "resolution_summary" : "reason"}
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
          {permissions(user, "issue.manage_work_state") && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget));
                action.mutate({
                  name: "work-state",
                  data: { ...data, version: issue.version },
                });
              }}
            >
              <label>
                State
                <select name="state" defaultValue={issue.work_state || "ACTIVE"}>
                  {workStates.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Reason
                <textarea name="reason" />
              </label>
              <button disabled={action.isPending}>
                {action.isPending ? "Updating..." : "Update work state"}
              </button>
            </form>
          )}
          {workHistory.isPending ? (
            <p>Loading...</p>
          ) : workHistory.isError ? (
            <p role="alert">{message(workHistory.error)}</p>
          ) : (
            <>
              <p>
                Active {workHistory.data?.summary.active_minutes || 0}m · Waiting
                client {workHistory.data?.summary.waiting_client_minutes || 0}m ·
                Blocked {workHistory.data?.summary.blocked_minutes || 0}m
              </p>
              <ul className="compact-list">
                {workHistory.data?.states.map((x) => (
                  <li key={x.id}>
                    <strong>{String(x.state || "")}</strong>
                    <small>
                      {String(x.reason || "")}{" "}
                      {x.started_at
                        ? `· ${new Date(String(x.started_at)).toLocaleString()}`
                        : ""}
                    </small>
                  </li>
                ))}
              </ul>
            </>
          )}
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
