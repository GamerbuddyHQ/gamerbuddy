import React from "react";
import { ShieldCheck, Star, Handshake, Heart } from "lucide-react";

export type ReputationBadge = {
  id: string;
  label: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  text: string;
  glow: string;
};

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
    badges.push({
      id: "verified",
      label: "Verified",
      icon: <ShieldCheck className="h-3 w-3" />,
      bg: "rgba(34,197,94,0.12)",
      border: "rgba(34,197,94,0.35)",
      text: "#4ade80",
      glow: "rgba(34,197,94,0.18)",
    });
  }

  if (tf >= 85 && sessionsAsGamerCount >= 10) {
    badges.push({
      id: "top-gamer",
      label: "Top Gamer",
      icon: <Star className="h-3 w-3" />,
      bg: "rgba(234,179,8,0.12)",
      border: "rgba(234,179,8,0.35)",
      text: "#fbbf24",
      glow: "rgba(234,179,8,0.18)",
    });
  }

  if (tf >= 70 && totalSessions >= 5 && !badges.find((b) => b.id === "top-gamer")) {
    badges.push({
      id: "reliable",
      label: "Reliable Partner",
      icon: <Handshake className="h-3 w-3" />,
      bg: "rgba(59,130,246,0.12)",
      border: "rgba(59,130,246,0.35)",
      text: "#60a5fa",
      glow: "rgba(59,130,246,0.18)",
    });
  }

  if (beginnerFriendly) {
    badges.push({
      id: "beginner-friendly",
      label: "Beginner-Friendly",
      icon: <Heart className="h-3 w-3" />,
      bg: "rgba(168,85,247,0.12)",
      border: "rgba(168,85,247,0.35)",
      text: "#c084fc",
      glow: "rgba(168,85,247,0.18)",
    });
  }

  return badges;
}

export function ReputationBadges({
  badges,
  compact = false,
}: {
  badges: ReputationBadge[];
  compact?: boolean;
}) {
  if (badges.length === 0) return null;
  return (
    <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      {badges.map((b) => (
        <span
          key={b.id}
          title={b.label}
          className={`inline-flex items-center gap-1 font-bold uppercase tracking-widest rounded-full ${
            compact ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2.5 py-1"
          }`}
          style={{
            background: b.bg,
            border: `1px solid ${b.border}`,
            color: b.text,
            boxShadow: compact ? "none" : `0 0 10px ${b.glow}`,
          }}
        >
          {b.icon}
          {b.label}
        </span>
      ))}
    </div>
  );
}

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
      style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
      title={`Trust Factor: ${capped}/100 — ${tfLabel(capped)}`}
    >
      <ShieldCheck className="h-2.5 w-2.5" />
      {capped}
    </span>
  );
}

export function TrustMeter({ value }: { value: number }) {
  const capped = Math.min(100, Math.max(0, value));
  const label = tfLabel(capped);
  const color = tfColor(capped);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Trust Factor
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color }}>{label}</span>
          <span className="font-black text-white text-sm">
            {capped}
            <span className="text-muted-foreground font-normal text-xs">/100</span>
          </span>
        </div>
      </div>
      <div className="h-3 rounded-full bg-background border border-border/60 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tfGradient(capped)} transition-all duration-700 shadow-sm`}
          style={{ width: `${capped}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/40">
        <span>Risky &lt;35</span>
        <span>Fair 45–64</span>
        <span>Excellent 80+</span>
      </div>
      <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
        Earned from <span className="text-muted-foreground">rating quality</span> (60 pts),
        {" "}<span className="text-muted-foreground">session experience</span> (30 pts) and
        {" "}<span className="text-muted-foreground">review volume</span> (10 pts).
      </p>
    </div>
  );
}
