import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";

export function Button({
  variant = "primary",
  pending = false,
  pendingLabel,
  className = "",
  children,
  type = "button",
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  pending?: boolean;
  pendingLabel?: string;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      className={`${variantClass(variant)} ${className}`}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      {pending ? (pendingLabel ?? "Saving...") : children}
    </button>
  );
}

function variantClass(variant: Variant) {
  return variant === "danger" ? "danger" : variant === "secondary" ? "secondary" : "";
}
