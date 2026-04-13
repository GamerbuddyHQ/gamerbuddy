import React from "react";
import { ShieldCheck, Clock } from "lucide-react";

type VerifiedBadgeVariant = "full" | "icon" | "compact";

interface VerifiedBadgeProps {
  idVerified: boolean;
  pending?: boolean;
  variant?: VerifiedBadgeVariant;
  className?: string;
}

export function VerifiedBadge({
  idVerified,
  pending = false,
  variant = "full",
  className = "",
}: VerifiedBadgeProps) {
  if (idVerified) {
    if (variant === "icon") {
      return (
        <span
          title="Verified Identity"
          className={`inline-flex items-center justify-center text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)] ${className}`}
        >
          <ShieldCheck className="h-4 w-4 fill-emerald-500/20" />
        </span>
      );
    }

    if (variant === "compact") {
      return (
        <span
          title="Verified Identity"
          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 rounded-full ${className}`}
          style={{ boxShadow: "0 0 8px rgba(52,211,153,0.2)" }}
        >
          <ShieldCheck className="h-3 w-3 shrink-0 fill-emerald-500/20" />
          Verified
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 rounded-full ${className}`}
        style={{ boxShadow: "0 0 12px rgba(52,211,153,0.25)" }}
      >
        <ShieldCheck className="h-3.5 w-3.5 fill-emerald-500/20" />
        Verified
      </span>
    );
  }

  if (pending) {
    if (variant === "icon") {
      return (
        <span title="Verification Pending" className={`inline-flex items-center justify-center text-amber-400 ${className}`}>
          <Clock className="h-4 w-4" />
        </span>
      );
    }

    if (variant === "compact") {
      return (
        <span
          title="Verification Pending"
          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 rounded-full ${className}`}
        >
          <Clock className="h-3 w-3 shrink-0" />
          Pending
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 rounded-full ${className}`}
      >
        <Clock className="h-3.5 w-3.5" />
        Verification Pending
      </span>
    );
  }

  return null;
}
