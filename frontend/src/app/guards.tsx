import { Navigate, NavLink, Outlet, useOutletContext } from "react-router-dom";
import type { ReactNode } from "react";
import type { User } from "../api";

export function RequirePermission({
  permission,
  any = false,
  children,
}: {
  permission: string | string[];
  any?: boolean;
  children: ReactNode;
}) {
  const user = useOutletContext<User>();
  const needed = Array.isArray(permission) ? permission : [permission];
  const ok = any
    ? needed.some((p) => user.permissions.includes(p))
    : needed.every((p) => user.permissions.includes(p));
  if (!ok) return <Forbidden />;
  return <>{children}</>;
}

export function Forbidden() {
  return (
    <section className="state-page">
      <p className="eyebrow">403</p>
      <h1>Permission required</h1>
      <p>You don't have permission to access this page.</p>
      <NavLink to="/dashboard">Back to dashboard</NavLink>
    </section>
  );
}

export function NotFound() {
  return (
    <section className="state-page">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The resource may have been removed or the URL is incorrect.</p>
      <NavLink to="/dashboard">Back to dashboard</NavLink>
    </section>
  );
}
