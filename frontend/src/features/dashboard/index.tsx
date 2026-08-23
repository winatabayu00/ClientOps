import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get, message } from "../../api";
import { number } from "../../lib/utils";

type Overview = {
  issues?: { open?: unknown; critical?: unknown };
  clients?: { active?: unknown };
  follow_ups?: { pending?: unknown; overdue?: unknown };
  handoffs?: { pending?: unknown };
  sla?: { breached?: unknown };
  status_distribution?: { name: string; count: unknown }[];
  waiting_breakdown?: { name: string; seconds: unknown }[];
  top_feature_demand?: { id: string; title: string; demand: unknown }[];
  client_health?: { name: string; count: unknown }[];
};

export function Dashboard() {
  const query = useQuery<Overview>({
    queryKey: ["dashboard", "overview"],
    queryFn: () => get("/dashboard/overview"),
  });
  if (query.isPending)
    return (
      <section className="dashboard">
        <p role="status">Loading dashboard...</p>
      </section>
    );
  if (query.isError)
    return (
      <section className="dashboard">
        <h1>Dashboard</h1>
        <p role="alert">{message(query.error)}</p>
      </section>
    );
  const overview = query.data || {};
  const metrics = [
    ["Open issues", number(overview.issues?.open), "/issues", "Issues not closed or cancelled"],
    ["Critical issues", number(overview.issues?.critical), "/issues", "Open issues requiring attention"],
    ["SLA breached", number(overview.sla?.breached), "/issues?sla_status=BREACHED", "Open issues beyond active SLA"],
    ["Active clients", number(overview.clients?.active), "/clients", "Clients in active service"],
    ["Pending handoffs", number(overview.handoffs?.pending), "/handoffs", "Release impacts awaiting operations"],
    ["Pending follow-ups", number(overview.follow_ups?.pending), "/follow-ups", "Client actions still open"],
    ["Overdue follow-ups", number(overview.follow_ups?.overdue), "/follow-ups", "Follow-ups past their due date"],
  ];
  return (
    <section className="dashboard">
      <div className="dashboard-heading">
        <p className="eyebrow">Operational overview</p>
        <h1>Keep delivery visible.</h1>
        <p>Track work from client report through operational completion.</p>
      </div>
      <div className="metric-grid">
        {metrics.map(([label, value, to, detail]) => (
          <NavLink key={label} className="metric-card" to={to as string}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </NavLink>
        ))}
      </div>
      <div className="detail-grid">
        <section className="panel">
          <h2>Status distribution</h2>
          {overview.status_distribution?.length ? (
            <ul className="compact-list">
              {overview.status_distribution.map((x) => (
                <li key={x.name}>
                  <NavLink to={`/issues?status=${x.name}`}>
                    {x.name}: {number(x.count)}
                  </NavLink>
                </li>
              ))}
            </ul>
          ) : (
            <p>No issues.</p>
          )}
        </section>
        <section className="panel">
          <h2>Waiting time</h2>
          {overview.waiting_breakdown?.length ? (
            <ul className="compact-list">
              {overview.waiting_breakdown.map((x) => (
                <li key={x.name}>
                  <NavLink to={`/issues?work_state=${x.name}`}>
                    {x.name}: {Math.round(number(x.seconds) / 3600)}h
                  </NavLink>
                </li>
              ))}
            </ul>
          ) : (
            <p>No waiting work.</p>
          )}
        </section>
        <section className="panel">
          <h2>Top feature demand</h2>
          {overview.top_feature_demand?.length ? (
            <ul className="compact-list">
              {overview.top_feature_demand.map((x) => (
                <li key={x.id}>
                  <NavLink to={`/feature-requests/${x.id}`}>
                    {x.title}: {number(x.demand)} clients
                  </NavLink>
                </li>
              ))}
            </ul>
          ) : (
            <p>No feature demand.</p>
          )}
        </section>
        <section className="panel">
          <h2>Client health</h2>
          {overview.client_health?.length ? (
            <ul className="compact-list">
              {overview.client_health.map((x) => (
                <li key={x.name}>
                  {x.name}: {number(x.count)} active clients
                </li>
              ))}
            </ul>
          ) : (
            <p>No active clients.</p>
          )}
        </section>
      </div>
    </section>
  );
}
