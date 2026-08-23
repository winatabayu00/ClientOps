import type { ReactNode } from "react";

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusTone(status)}>{status.replaceAll("_", " ")}</Badge>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const tone =
    severity === "CRITICAL"
      ? "danger"
      : severity === "HIGH"
        ? "warning"
        : severity === "MEDIUM"
          ? "info"
          : "neutral";
  return <Badge tone={tone}>{severity}</Badge>;
}

export function HealthBadge({
  classification,
  score,
}: {
  classification: string;
  score: number;
}) {
  const tone =
    classification === "HEALTHY"
      ? "success"
      : classification === "ATTENTION"
        ? "warning"
        : "danger";
  return (
    <Badge tone={tone}>
      {classification.replaceAll("_", " ")} {score}/100
    </Badge>
  );
}

function statusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (["CLOSED", "RELEASED", "DELIVERED", "COMPLETED", "PUBLISHED", "ACTIVE"].includes(status))
    return "success";
  if (["FOLLOW_UP", "QA", "IN_REVIEW", "READY", "ONBOARDING"].includes(status))
    return "warning";
  if (["CANCELLED", "REJECTED", "INACTIVE", "ARCHIVED", "BREACHED"].includes(status))
    return "danger";
  if (["IN_DEVELOPMENT", "INVESTIGATING", "TRIAGED", "REPORTED", "PENDING"].includes(status))
    return "info";
  return "neutral";
}
