"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  pendingLabel,
  className = "primaryButton",
  icon,
  iconSize = 16,
  ariaLabel
}: {
  children?: ReactNode;
  pendingLabel?: string;
  className?: string;
  icon?: ReactNode;
  iconSize?: number;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending} aria-label={ariaLabel}>
      {pending ? <Loader2 size={iconSize} className="spinIcon" /> : icon}
      {pending ? (pendingLabel ?? (children ? "Memproses..." : null)) : children}
    </button>
  );
}
