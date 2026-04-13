import React from "react";
import { Clock } from "lucide-react";

type VerifiedBadgeVariant = "full" | "icon" | "compact";

interface VerifiedBadgeProps {
  idVerified: boolean;
  pending?: boolean;
  variant?: VerifiedBadgeVariant;
  className?: string;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7.25" fill="url(#vb-grad)" stroke="rgba(52,211,153,0.35)" strokeWidth="0.5" />
      <path
        d="M4.5 8.25L6.75 10.5L11.5 5.75"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="vb-grad" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function CheckIconLg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="9.25" fill="url(#vb-grad-lg)" stroke="rgba(52,211,153,0.4)" strokeWidth="0.5" />
      <path
        d="M5.5 10.5L8.5 13.5L14.5 7"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="vb-grad-lg" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
    </svg>
  );
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
          className={`inline-flex items-center justify-center shrink-0 ${className}`}
          style={{ filter: "drop-shadow(0 0 5px rgba(16,185,129,0.7))" }}
        >
          <CheckIcon className="h-4 w-4" />
        </span>
      );
    }

    if (variant === "compact") {
      return (
        <span
          title="Verified Identity"
          className={`inline-flex items-center gap-1 shrink-0 ${className}`}
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.12) 100%)",
            border: "1px solid rgba(52,211,153,0.45)",
            borderRadius: "999px",
            padding: "2px 7px 2px 5px",
            boxShadow: "0 0 10px rgba(16,185,129,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <CheckIcon className="h-3 w-3 shrink-0" />
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#34d399",
              lineHeight: 1,
            }}
          >
            Verified
          </span>
        </span>
      );
    }

    return (
      <span
        title="Verified Identity"
        className={`inline-flex items-center gap-1.5 shrink-0 relative overflow-hidden ${className}`}
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.14) 100%)",
          border: "1px solid rgba(52,211,153,0.5)",
          borderRadius: "999px",
          padding: "4px 12px 4px 8px",
          boxShadow: "0 0 14px rgba(16,185,129,0.22), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        <CheckIconLg className="h-4 w-4 shrink-0" />
        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            background: "linear-gradient(90deg, #34d399 0%, #6ee7b7 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1,
          }}
        >
          Verified
        </span>
        {/* shimmer overlay */}
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)",
            animation: "shimmer 3s ease-in-out infinite",
          }}
        />
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
          className={`inline-flex items-center gap-1 shrink-0 ${className}`}
          style={{
            background: "rgba(245,158,11,0.10)",
            border: "1px solid rgba(245,158,11,0.35)",
            borderRadius: "999px",
            padding: "2px 7px 2px 5px",
          }}
        >
          <Clock className="h-3 w-3 shrink-0 text-amber-400" />
          <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fbbf24", lineHeight: 1 }}>
            Pending
          </span>
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 shrink-0 ${className}`}
        style={{
          background: "rgba(245,158,11,0.10)",
          border: "1px solid rgba(245,158,11,0.35)",
          borderRadius: "999px",
          padding: "4px 12px 4px 8px",
        }}
      >
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "#fbbf24" }}>
          Verification Pending
        </span>
      </span>
    );
  }

  return null;
}
