import type { ReactNode } from "react";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <p role="status">{label}</p>;
}

export function ErrorState({
  message,
  requestId,
  onRetry,
}: {
  message: string;
  requestId?: string;
  onRetry?: () => void;
}) {
  return (
    <section className="panel error-state" role="alert">
      <h2>Something went wrong</h2>
      <p>{message}</p>
      {requestId && <small>Request ID: {requestId}</small>}
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <p>
        <strong>{title}</strong>
      </p>
      {hint && <small>{hint}</small>}
      {action}
    </div>
  );
}
