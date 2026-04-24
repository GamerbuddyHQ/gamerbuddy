import React, { useState, useEffect } from "react";
import { ShieldAlert, X, ChevronDown, ChevronUp, Lock, Video, UserX, ShieldCheck } from "lucide-react";

type Variant = "full" | "compact";

interface SafetyBannerProps {
  variant?: Variant;
  showSelfHire?: boolean;
  storageKey?: string;
}

const WARNINGS = [
  {
    icon: Lock,
    title: "Never share account passwords",
    body: "Do not give anyone your Steam, Epic Games, PlayStation, Xbox, or any other game account password — not even your session partner.",
  },
  {
    icon: ShieldCheck,
    title: "Keep all payments through Player4Hire",
    body: "We suggest completing all hires and payments through the Player4Hire platform. Using our built-in escrow system is the safest and simplest option for everyone — it protects both hirers and gamers.",
  },
  {
    icon: Video,
    title: "Session recording is your responsibility",
    body: "Player4Hire does not record gameplay sessions. If you want a record of the session, enable recording on your own device before starting.",
  },
  {
    icon: UserX,
    title: "You cannot hire yourself",
    body: "Requests are for hiring other gamers. You will not be able to bid on your own requests — the system enforces this automatically.",
  },
];

const SELF_HIRE_WARNING = {
  icon: UserX,
  title: "You cannot hire yourself",
  body: "You cannot bid on your own requests. Other gamers can bid on your missions.",
};

export function SafetyBanner({ variant = "full", showSelfHire = true, storageKey = "gb_safety_dismissed" }: SafetyBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  const warnings = showSelfHire
    ? WARNINGS
    : WARNINGS.filter((w) => w.title !== SELF_HIRE_WARNING.title);

  if (variant === "compact") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
        <span className="text-amber-300/90 flex-1">
          <strong className="text-amber-300">Safety reminder:</strong>{" "}
          Never share account passwords, and keep all payments through Player4Hire's secure escrow — it's the safest and simplest choice for everyone.
        </span>
        <button onClick={handleDismiss} className="text-amber-400/50 hover:text-amber-400 transition-colors shrink-0 mt-0.5">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
        <span className="text-sm text-amber-300 font-semibold flex-1">
          Platform Safety — Please Read
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-amber-400/60 hover:text-amber-400 transition-colors text-xs flex items-center gap-1 font-medium"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Less</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Details</>
          )}
        </button>
        <button onClick={handleDismiss} className="text-amber-400/50 hover:text-amber-400 transition-colors ml-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Collapsed summary */}
      {!expanded && (
        <div className="px-4 pb-3 text-xs text-amber-300/70 border-t border-amber-500/20 pt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-amber-400/70" /> Never share account passwords</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-amber-400/70" /> Keep payments through Player4Hire</span>
          <span className="flex items-center gap-1.5"><Video className="h-3 w-3 text-amber-400/70" /> Recording is your responsibility</span>
          {showSelfHire && <span className="flex items-center gap-1.5"><UserX className="h-3 w-3 text-amber-400/70" /> You cannot hire yourself</span>}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-amber-500/20 px-4 py-4 space-y-4">
          {warnings.map((w) => (
            <div key={w.title} className="flex gap-3">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <w.icon className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-amber-300">{w.title}</div>
                <div className="text-xs text-amber-300/65 mt-0.5 leading-relaxed">{w.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
