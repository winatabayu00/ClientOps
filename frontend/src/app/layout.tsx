import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { auth, get, message } from "../api";
import { queryClient } from "../lib/query-client";
import { permissions } from "../lib/utils";
import { Field, Input } from "../components/ui/field";
import { Button } from "../components/ui/button";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type LoginValues = z.infer<typeof loginSchema>;

export function Login() {
  const nav = useNavigate();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const mutation = useMutation({
    mutationFn: ({ email, password }: LoginValues) =>
      auth.login(email, password),
    onSuccess: () => nav("/dashboard"),
  });
  return (
    <main className="login">
      <form
        className="card"
        onSubmit={handleSubmit(
          (values) => mutation.mutate(values, { onError: (e) => setError(message(e)) }),
        )}
        noValidate
      >
        <p className="eyebrow">ClientOps</p>
        <h1>Sign in</h1>
        <Field label="Email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </Field>
        {error && <p role="alert">{error}</p>}
        <Button type="submit" pending={mutation.isPending} pendingLabel="Signing in...">
          Sign in
        </Button>
      </form>
    </main>
  );
}

export function Shell() {
  const nav = useNavigate();
  useEffect(() => {
    const expired = () => {
      queryClient.clear();
      nav("/login", { replace: true });
    };
    window.addEventListener("clientops:session-expired", expired);
    return () => window.removeEventListener("clientops:session-expired", expired);
  }, [nav]);
  const me = useQuery({ queryKey: ["me"], queryFn: auth.me });
  const logout = useMutation({
    mutationFn: auth.logout,
    onSuccess: () => {
      queryClient.clear();
      nav("/login");
    },
  });
  const unread = useQuery<{ count: number }>({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => get("/notifications/unread-count"),
  });
  if (me.isPending)
    return (
      <main>
        <p role="status">Loading session...</p>
      </main>
    );
  if (me.isError) return <Navigate to="/login" replace />;
  const groups: [string, [string, string, string[]][]][] = [
    ["Workspace", [["dashboard", "dashboard", []]]],
    ["Client delivery", [
      ["clients", "clients", ["client.read"]],
      ["issues", "issues", ["issue.read"]],
      ["feature requests", "feature-requests", ["feature_request.read"]],
    ]],
    ["Release operations", [
      ["releases", "releases", ["release.read"]],
      ["handoffs", "handoffs", ["release.read", "issue.follow_up"]],
      ["follow ups", "follow-ups", ["client_followup.create", "client_followup.complete"]],
    ]],
    ["Knowledge", [["documentation", "documentation", ["documentation.read"]]]],
    ["Administration", [
      ["users", "management/users", ["user.manage"]],
      ["roles", "management/roles", ["role.manage"]],
      ["audit logs", "management/audit-logs", ["audit.read"]],
      ["my sessions", "management/sessions", []],
    ]],
  ];
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <NavLink className="brand" to="/dashboard">
          ClientOps
        </NavLink>
        <nav aria-label="Main navigation">
          {groups.map(([group, links]) => {
            const visible = links.filter(
              ([, , needed]) => !needed.length || needed.some((p) => permissions(me.data, p)),
            );
            if (!visible.length) return null;
            return (
              <details key={group} open>
                <summary>{group}</summary>
                <div>
                  {visible.map(([label, path]) => (
                    <NavLink key={path} to={`/${path}`}>
                      {label}
                    </NavLink>
                  ))}
                </div>
              </details>
            );
          })}
        </nav>
      </aside>
      <section className="app-content">
        <header className="app-header">
          <p>Operational delivery workspace</p>
          <div className="account">
          <NavLink to="/notifications" aria-label="Notifications">
            Bell{unread.data?.count ? ` (${unread.data.count})` : ""}
          </NavLink>
          <span>{me.data.name}</span>
          <button onClick={() => logout.mutate()} disabled={logout.isPending}>
            Sign out
          </button>
          </div>
        </header>
        <main>
          <Outlet context={me.data} />
        </main>
      </section>
    </div>
  );
}
