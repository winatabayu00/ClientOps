import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { Forbidden, NotFound, RequirePermission } from "./guards";
import type { User } from "../api";

const user = (permissions: string[]): User => ({
  id: "u1",
  name: "Test",
  email: "t@example.com",
  roles: [],
  permissions,
});

function Harness({ permissions, children }: { permissions: string[]; children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/x"]}>
      <Routes>
        <Route element={<Outlet context={user(permissions)} />}>
          <Route path="/x" element={children} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("RequirePermission", () => {
  it("renders children when user has the permission", () => {
    render(
      <Harness permissions={["issue.read"]}>
        <RequirePermission permission="issue.read">
          <p>granted</p>
        </RequirePermission>
      </Harness>,
    );
    expect(screen.getByText("granted")).toBeInTheDocument();
  });

  it("renders Forbidden when permission missing", () => {
    render(
      <Harness permissions={[]}>
        <RequirePermission permission="issue.read">
          <p>granted</p>
        </RequirePermission>
      </Harness>,
    );
    expect(screen.queryByText("granted")).not.toBeInTheDocument();
    expect(screen.getByText(/permission to access/i)).toBeInTheDocument();
  });

  it("any mode allows if any permission matches", () => {
    render(
      <Harness permissions={["issue.read"]}>
        <RequirePermission permission={["issue.read", "issue.write"]} any>
          <p>granted</p>
        </RequirePermission>
      </Harness>,
    );
    expect(screen.getByText("granted")).toBeInTheDocument();
  });
});

describe("Forbidden", () => {
  it("renders a 403 message", () => {
    render(
      <MemoryRouter>
        <Forbidden />
      </MemoryRouter>,
    );
    expect(screen.getByText("403")).toBeInTheDocument();
  });
});

describe("NotFound", () => {
  it("renders a 404 message", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByText("404")).toBeInTheDocument();
  });
});
