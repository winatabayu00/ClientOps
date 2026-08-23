import { useState, type FormEvent } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, message, post, type User } from "../../api";
import { permissions } from "../../lib/utils";
import { toast } from "../../components/ui/toast";
import { Dialog } from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/field";
import type { Client, Item } from "../../lib/types";

export function FollowUps() {
  const user = useOutletContext<User>();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [result, setResult] = useState("");
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
      toast.success("Follow-up created.");
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
    onSuccess: (_d, vars) => {
      cache.invalidateQueries({ queryKey: ["follow-ups"] });
      if (vars.name === "complete") {
        setCompleteId(null);
        setResult("");
        toast.success("Follow-up completed.");
      } else {
        toast.success("Follow-up started.");
      }
    },
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
        <form className="card create" aria-label="Create follow-up" onSubmit={submit}>
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
                    <button onClick={() => setCompleteId(f.id)}>
                      Complete
                    </button>
                  )}
              </span>
            </div>
          ))}
        </div>
      )}
      <Dialog
        title="Complete follow-up"
        open={completeId !== null}
        onClose={() => setCompleteId(null)}
        onConfirm={() => {
          if (completeId && result.trim())
            action.mutate({
              id: completeId,
              name: "complete",
              data: { result: result.trim() },
            });
        }}
        confirmLabel="Complete"
        pending={action.isPending}
      >
        <label>
          Follow-up result
          <Textarea
            value={result}
            onChange={(e) => setResult(e.currentTarget.value)}
            placeholder="Client confirmed issue resolved..."
          />
        </label>
      </Dialog>
    </section>
  );
}
