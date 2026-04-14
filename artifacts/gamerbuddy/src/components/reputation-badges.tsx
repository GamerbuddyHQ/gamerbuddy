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

export function TrustChip({ value }: { value: number }) {
  const capped = Math.min(100, Math.max(0, value));
  const color =
    capped >= 80 ? "#4ade80" : capped >= 65 ? "#fbbf24" : capped >= 45 ? "#f97316" : "#f87171";
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-black tabular-nums rounded-full px-1.5 py-0.5"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}40`,
        color,
      }}
      title={`Trust Factor: ${capped}/100`}
    >
      <ShieldCheck className="h-2.5 w-2.5" />
      {capped}/100
    </span>
  );
}

export function TrustMeter({ value }: { value: number }) {
  const capped = Math.min(100, Math.max(0, value));
  const pct = capped;
  const color =
    pct >= 80 ? "from-green-500 to-emerald-400" :
    pct >= 60 ? "from-yellow-500 to-amber-400" :
    pct >= 40 ? "from-orange-500 to-amber-500" :
    "from-red-500 to-rose-400";
  const label =
    pct >= 85 ? "Excellent" : pct >= 70 ? "Good" : pct >= 50 ? "Neutral" : pct >= 30 ? "Poor" : "Risky";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Trust Factor
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="font-black text-white text-sm">
            {capped}
            <span className="text-muted-foreground font-normal text-xs">/100</span>
          </span>
        </div>
      </div>
      <div className="h-3 rounded-full bg-background border border-border/60 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700 shadow-sm`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/50">
        <span>Risky</span><span>Neutral</span><span>Excellent</span>
      </div>
    </div>
  );
}
