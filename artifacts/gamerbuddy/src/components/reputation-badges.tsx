import React from "react";
import { CheckCircle2, Crown, Shield, Smile, ShieldCheck } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────── */

type BadgeColors = {
  text: string;
  bg: string;
  border: string;
  glow: string;
  glowCompact: string;
  iconGlow: string;
};

export type ReputationBadge = {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  colors: BadgeColors;
};

/* ─── Badge palette ──────────────────────────────────────────────── */

const BADGE_PALETTE: Record<string, BadgeColors> = {
  verified: {
    text: "#4ade80",
    bg: "linear-gradient(135deg,rgba(34,197,94,0.22) 0%,rgba(16,185,129,0.10) 100%)",
    border: "rgba(74,222,128,0.50)",
    glow: "0 0 14px rgba(34,197,94,0.32),0 0 4px rgba(74,222,128,0.18),inset 0 1px 0 rgba(255,255,255,0.06)",
    glowCompact: "0 0 8px rgba(34,197,94,0.28)",
    iconGlow: "drop-shadow(0 0 4px rgba(74,222,128,0.70))",
  },
  "top-gamer": {
    text: "#fbbf24",
    bg: "linear-gradient(135deg,rgba(234,179,8,0.26) 0%,rgba(251,191,36,0.10) 100%)",
    border: "rgba(251,191,36,0.60)",
    glow: "0 0 18px rgba(234,179,8,0.40),0 0 6px rgba(251,191,36,0.28),inset 0 1px 0 rgba(255,255,255,0.10)",
    glowCompact: "0 0 10px rgba(234,179,8,0.35)",
    iconGlow: "drop-shadow(0 0 5px rgba(251,191,36,0.80))",
  },
  reliable: {
    text: "#60a5fa",
    bg: "linear-gradient(135deg,rgba(59,130,246,0.20) 0%,rgba(96,165,250,0.08) 100%)",
    border: "rgba(96,165,250,0.50)",
    glow: "0 0 14px rgba(59,130,246,0.30),0 0 4px rgba(96,165,250,0.18),inset 0 1px 0 rgba(255,255,255,0.06)",
    glowCompact: "0 0 8px rgba(59,130,246,0.25)",
    iconGlow: "drop-shadow(0 0 4px rgba(96,165,250,0.70))",
  },
  "beginner-friendly": {
    text: "#00D4FF",
    bg: "linear-gradient(135deg,rgba(0,212,255,0.22) 0%,rgba(0,212,255,0.08) 100%)",
    border: "rgba(0,212,255,0.50)",
    glow: "0 0 14px rgba(0,212,255,0.30),0 0 4px rgba(0,212,255,0.18),inset 0 1px 0 rgba(255,255,255,0.06)",
    glowCompact: "0 0 8px rgba(0,212,255,0.25)",
    iconGlow: "drop-shadow(0 0 4px rgba(0,212,255,0.70))",
  },
};

/* ─── Badge computation ──────────────────────────────────────────── */

export function computeBadges({
  trustFactor,
  idVerified,
  sessionsAsGamerCount,
  sessionsAsHirerCount,
  beginnerFriendly,
}: {
  trustFactor: number;
  idVerified: boolean;
  sessionsAsGamerCount: number;
  sessionsAsHirerCount: number;
  beginnerFriendly: boolean;
}): ReputationBadge[] {
  const tf = Math.min(100, Math.max(0, trustFactor));
  const totalSessions = sessionsAsGamerCount + sessionsAsHirerCount;
  const badges: ReputationBadge[] = [];

  if (idVerified) {
    badges.push({ id: "verified", label: "Verified", Icon: CheckCircle2, colors: BADGE_PALETTE.verified });
  }

  if (tf >= 85 && sessionsAsGamerCount >= 10) {
    badges.push({ id: "top-gamer", label: "Top Gamer", Icon: Crown, colors: BADGE_PALETTE["top-gamer"] });
  }

  if (tf >= 70 && totalSessions >= 5 && !badges.find((b) => b.id === "top-gamer")) {
    badges.push({ id: "reliable", label: "Reliable Partner", Icon: Shield, colors: BADGE_PALETTE.reliable });
  }

  if (beginnerFriendly) {
    badges.push({ id: "beginner-friendly", label: "Beginner-Friendly", Icon: Smile, colors: BADGE_PALETTE["beginner-friendly"] });
  }

  return badges;
}

/* ─── ReputationBadges component ─────────────────────────────────── */

export function ReputationBadges({
  badges,
  compact = false,
}: {
  badges: ReputationBadge[];
  compact?: boolean;
}) {
  if (badges.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {badges.map((b) => (
          <span
            key={b.id}
            title={b.label}
            className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest rounded-full px-2 py-0.5"
            style={{
              background: b.colors.bg,
              border: `1px solid ${b.colors.border}`,
              color: b.colors.text,
              boxShadow: b.colors.glowCompact,
            }}
          >
            <b.Icon
              className="h-2.5 w-2.5 shrink-0"
              style={{ filter: b.colors.iconGlow }}
            />
            {b.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <PremiumBadge key={b.id} badge={b} />
      ))}
    </div>
  );
}

function PremiumBadge({ badge: b }: { badge: ReputationBadge }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-black uppercase tracking-widest text-[10px] select-none"
      style={{
        background: b.colors.bg,
        border: `1px solid ${b.colors.border}`,
        color: b.colors.text,
        boxShadow: b.colors.glow,
        letterSpacing: "0.08em",
      }}
    >
      {/* Icon with individual glow */}
      <span className="shrink-0 flex items-center" style={{ filter: b.colors.iconGlow }}>
        <b.Icon className="h-3 w-3" />
      </span>
      {b.label}
    </span>
  );
}

/* ─── TrustChip ──────────────────────────────────────────────────── */

function tfColor(v: number): string {
  return v >= 75 ? "#4ade80" : v >= 55 ? "#fbbf24" : v >= 35 ? "#f97316" : "#f87171";
}
function tfLabel(v: number): string {
  return v >= 80 ? "Excellent" : v >= 65 ? "Good" : v >= 45 ? "Fair" : v >= 30 ? "Poor" : "Risky";
}
function tfGradient(v: number): string {
  return v >= 75
    ? "from-green-500 to-emerald-400"
    : v >= 55
    ? "from-yellow-500 to-amber-400"
    : v >= 35
    ? "from-orange-500 to-amber-500"
    : "from-red-500 to-rose-400";
}

export function TrustChip({ value }: { value: number }) {
  const capped = Math.min(100, Math.max(0, value));
  const color = tfColor(capped);
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-black tabular-nums rounded-full px-1.5 py-0.5"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}40`,
        color,
        boxShadow: `0 0 6px ${color}25`,
      }}
      title={`Trust Factor: ${capped}/100 — ${tfLabel(capped)}`}
    >
      <ShieldCheck className="h-2.5 w-2.5" />
      {capped}
    </span>
  );
}

/* ─── TrustMeter ─────────────────────────────────────────────────── */

export function TrustMeter({ value }: { value: number }) {
  const capped = Math.min(100, Math.max(0, value));
  const label = tfLabel(capped);
  const color = tfColor(capped);

  return (
    <div
      className="rounded-2xl px-4 py-3.5 space-y-3"
      style={{
        background: `linear-gradient(135deg, ${color}08, rgba(0,0,0,0.3))`,
        border: `1px solid ${color}20`,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span
          className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          <ShieldCheck className="h-4 w-4" style={{ color, filter: `drop-shadow(0 0 4px ${color}80)` }} />
          Trust Factor
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: `${color}18`,
              border: `1px solid ${color}35`,
              color,
            }}
          >
            {label}
          </span>
          <span className="font-black text-white text-lg leading-none tabular-nums">
            {capped}
            <span className="text-white/35 font-normal text-xs">/100</span>
          </span>
        </div>
      </div>

      {/* Bar track */}
      <div className="relative h-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Fill */}
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tfGradient(capped)} transition-all duration-700 relative overflow-hidden`}
          style={{ width: `${capped}%`, boxShadow: `0 0 10px ${color}60, 0 0 4px ${color}40` }}
        >
          {/* Shimmer sweep */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
              animation: "shimmer 2.5s ease-in-out infinite",
              backgroundSize: "200% 100%",
            }}
          />
        </div>
        {/* Tick marks at 35, 55, 75 */}
        {[35, 55, 75].map((pct) => (
          <div
            key={pct}
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${pct}%`, background: "rgba(255,255,255,0.12)" }}
          />
        ))}
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>
        <span>Risky</span>
        <span>Fair</span>
        <span>Good</span>
        <span>Excellent</span>
      </div>

      {/* Footnote */}
      <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.28)" }}>
        Weighted from <span style={{ color: "rgba(255,255,255,0.5)" }}>rating quality</span>,{" "}
        <span style={{ color: "rgba(255,255,255,0.5)" }}>session history</span> &amp;{" "}
        <span style={{ color: "rgba(255,255,255,0.5)" }}>community reviews</span>.
      </p>
    </div>
  );
}
