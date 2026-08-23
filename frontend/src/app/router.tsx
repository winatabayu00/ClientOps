import { Route, Routes } from "react-router-dom";
import { Login, Shell } from "./layout";
import { Forbidden, NotFound, RequirePermission } from "./guards";
import { Dashboard } from "../features/dashboard";
import { Clients, ClientDetail } from "../features/clients";
import { Issues, IssueDetail } from "../features/issues";
import { FeatureRequests, FeatureRequestDetail } from "../features/feature-requests";
import { Releases, ReleaseDetail } from "../features/releases";
import { Handoffs, HandoffDetail } from "../features/handoffs";
import { FollowUps } from "../features/follow-ups";
import { Documentation, DocumentationDetail } from "../features/documentation";
import { Notifications } from "../features/notifications";
import {
  AuditLogs,
  Management,
  RoleManagementDetail,
  RolesManagement,
  Sessions,
  UserManagementDetail,
  UsersManagement,
} from "../features/management";

export function Router() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Shell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/issues/:id" element={<IssueDetail />} />
        <Route path="/feature-requests" element={<FeatureRequests />} />
        <Route path="/feature-requests/:id" element={<FeatureRequestDetail />} />
        <Route path="/releases" element={<Releases />} />
        <Route path="/releases/:id" element={<ReleaseDetail />} />
        <Route path="/handoffs" element={<Handoffs />} />
        <Route path="/handoffs/:id" element={<HandoffDetail />} />
        <Route path="/follow-ups" element={<FollowUps />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/documentation/:id" element={<DocumentationDetail />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/management" element={<Management />} />
        <Route
          path="/management/audit-logs"
          element={
            <RequirePermission permission="audit.read">
              <AuditLogs />
            </RequirePermission>
          }
        />
        <Route path="/management/sessions" element={<Sessions />} />
        <Route
          path="/management/users"
          element={
            <RequirePermission permission="user.manage">
              <UsersManagement />
            </RequirePermission>
          }
        />
        <Route
          path="/management/users/:id"
          element={
            <RequirePermission permission="user.manage">
              <UserManagementDetail />
            </RequirePermission>
          }
        />
        <Route
          path="/management/roles"
          element={
            <RequirePermission permission="role.manage">
              <RolesManagement />
            </RequirePermission>
          }
        />
        <Route
          path="/management/roles/:id"
          element={
            <RequirePermission permission="role.manage">
              <RoleManagementDetail />
            </RequirePermission>
          }
        />
        <Route path="/forbidden" element={<Forbidden />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
