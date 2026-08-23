import { useEffect, type ReactNode } from "react";
import { Button } from "./button";

export function Dialog({
  title,
  children,
  open,
  onClose,
  danger = false,
  confirmLabel = "Confirm",
  pending = false,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  danger?: boolean;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`dialog-title-${title.replace(/\W+/g, "-")}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={`dialog-title-${title.replace(/\W+/g, "-")}`}>{title}</h2>
        <div>{children}</div>
        <div className="dialog-actions">
          {onConfirm && (
            <Button
              variant={danger ? "danger" : "primary"}
              onClick={onConfirm}
              pending={pending}
            >
              {confirmLabel}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} autoFocus>
            Cancel
          </Button>
        </div>
      </section>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  open,
  onClose,
  onConfirm,
  confirmLabel,
  danger = false,
  pending = false,
}: {
  title: string;
  message: ReactNode;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  danger?: boolean;
  pending?: boolean;
}) {
  return (
    <Dialog
      title={title}
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={confirmLabel}
      danger={danger}
      pending={pending}
    >
      {message}
    </Dialog>
  );
}
