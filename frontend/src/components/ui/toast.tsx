import { useEffect, useSyncExternalStore } from "react";

export type ToastKind = "success" | "error" | "info";
export type ToastItem = { id: number; kind: ToastKind; message: string };

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(kind: ToastKind, message: string) {
  const item = { id: nextId++, kind, message };
  toasts = [...toasts, item];
  listeners.forEach((l) => l());
  setTimeout(() => dismiss(item.id), 5000);
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  listeners.forEach((l) => l());
}

export const toast = {
  success: (m: string) => emit("success", m),
  error: (m: string) => emit("error", m),
  info: (m: string) => emit("info", m),
  dismiss,
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => toasts);
  return (
    <div className="toaster" aria-live="polite" role="status">
      {list.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span>{t.message}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
