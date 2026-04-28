import React from "react";
import { CheckCircle2, Crown, Shield, Smile, ShieldCheck, Camera, Gamepad2, MapPin, User, Mail, Phone, FileText, ChevronRight } from "lucide-react";

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
    text: "#A1FF4F",
    bg: "linear-gradient(135deg,rgba(161,255,79,0.22) 0%,rgba(161,255,79,0.08) 100%)",
    border: "rgba(161,255,79,0.50)",
    glow: "0 0 14px rgba(161,255,79,0.30),0 0 4px rgba(161,255,79,0.18),inset 0 1px 0 rgba(255,255,255,0.06)",
    glowCompact: "0 0 8px rgba(161,255,79,0.25)",
    iconGlow: "drop-shadow(0 0 4px rgba(161,255,79,0.70))",
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
      <span className="shrink-0 flex items-center" style={{ filter: b.colors.iconGlow }}>
        <b.Icon className="h-3 w-3" />
      </span>
      {b.label}
    </span>
  );
}

/* ─── Trust Card System ──────────────────────────────────────────── */

export type TrustCardTier = {
  id: "grey" | "yellow" | "blue" | "gold";
  label: string;
  tagline: string;
  min: number;
  max: number;
  color: string;
  bg: string;
  border: string;
  glow: string;
};

export const TRUST_CARD_TIERS: TrustCardTier[] = [
  {
    id: "grey",
    label: "Grey Card",
    tagline: "New — proceed with caution",
    min: 0,
    max: 25,
    color: "#9ca3af",
    bg: "linear-gradient(135deg, rgba(156,163,175,0.14) 0%, rgba(107,114,128,0.07) 100%)",
    border: "rgba(156,163,175,0.38)",
    glow: "0 0 8px rgba(156,163,175,0.18)",
  },
  {
    id: "yellow",
    label: "Yellow Card",
    tagline: "Building trust",
    min: 26,
    max: 50,
    color: "#fbbf24",
    bg: "linear-gradient(135deg, rgba(251,191,36,0.16) 0%, rgba(234,179,8,0.07) 100%)",
    border: "rgba(251,191,36,0.42)",
    glow: "0 0 10px rgba(251,191,36,0.25)",
  },
  {
    id: "blue",
    label: "Blue Card",
    tagline: "Trusted member",
    min: 51,
    max: 75,
    color: "#60a5fa",
    bg: "linear-gradient(135deg, rgba(96,165,250,0.16) 0%, rgba(59,130,246,0.07) 100%)",
    border: "rgba(96,165,250,0.42)",
    glow: "0 0 10px rgba(96,165,250,0.25)",
  },
  {
    id: "gold",
    label: "Gold Card",
    tagline: "Elite veteran",
    min: 76,
    max: 100,
    color: "#f59e0b",
    bg: "linear-gradient(135deg, rgba(245,158,11,0.20) 0%, rgba(217,119,6,0.09) 100%)",
    border: "rgba(245,158,11,0.50)",
    glow: "0 0 14px rgba(245,158,11,0.30), 0 0 4px rgba(251,191,36,0.18)",
  },
];

export function getTrustCard(trustFactor: number): TrustCardTier {
  const tf = Math.min(100, Math.max(0, trustFactor));
  return TRUST_CARD_TIERS.find((t) => tf >= t.min && tf <= t.max) ?? TRUST_CARD_TIERS[0];
}

export function TrustCardBadge({
  trustFactor,
  compact = false,
}: {
  trustFactor: number;
  compact?: boolean;
}) {
  const tf = Math.min(100, Math.max(0, trustFactor));
  const card = getTrustCard(tf);

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest rounded-full px-1.5 py-0.5 shrink-0 select-none"
        style={{
          background: card.bg,
          border: `1px solid ${card.border}`,
          color: card.color,
          boxShadow: card.glow,
        }}
        title={`${card.label} · ${card.tagline} · Trust Factor: ${tf}/100`}
      >
        <span style={{ filter: `drop-shadow(0 0 2px ${card.color}80)`, fontSize: "8px" }}>♦</span>
        {card.id.charAt(0).toUpperCase() + card.id.slice(1)}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 shrink-0 select-none"
      style={{
        background: card.bg,
        border: `1px solid ${card.border}`,
        color: card.color,
        boxShadow: card.glow,
      }}
      title={`${card.label} · ${card.tagline} · Trust Factor: ${tf}/100`}
    >
      <span style={{ filter: `drop-shadow(0 0 3px ${card.color}90)` }}>♦</span>
      {card.label}
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

      {/* Trust Card tier row */}
      <div className="flex items-center gap-2">
        <TrustCardBadge trustFactor={capped} />
        <span className="text-[10px] text-white/35 font-medium">
          {getTrustCard(capped).tagline}
        </span>
      </div>

      {/* Bar track */}
      <div className="relative h-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tfGradient(capped)} transition-all duration-700 relative overflow-hidden`}
          style={{ width: `${capped}%`, boxShadow: `0 0 10px ${color}60, 0 0 4px ${color}40` }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
              animation: "shimmer 2.5s ease-in-out infinite",
              backgroundSize: "200% 100%",
            }}
          />
        </div>
        {/* Tier boundary ticks at 25, 50, 75 */}
        {[25, 50, 75].map((pct) => (
          <div
            key={pct}
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${pct}%`, background: "rgba(255,255,255,0.15)" }}
          />
        ))}
      </div>

      {/* Tier labels */}
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>
        <span style={{ color: "#9ca3af80" }}>Grey</span>
        <span style={{ color: "#fbbf2480" }}>Yellow</span>
        <span style={{ color: "#60a5fa80" }}>Blue</span>
        <span style={{ color: "#f59e0b80" }}>Gold</span>
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

/* ─── Profile Completion Bar ─────────────────────────────────────── */

export type ProfileCompletionField = {
  id: string;
  label: string;
  done: boolean;
  Icon: React.ComponentType<{ className?: string }>;
  action?: string;
  actionLabel?: string;
};

export function computeProfileCompletion({
  hasProfilePhoto,
  hasBio,
  hasCountry,
  hasGender,
  hasGamingAccount,
  emailVerified,
  phoneVerified,
}: {
  hasProfilePhoto: boolean;
  hasBio: boolean;
  hasCountry: boolean;
  hasGender: boolean;
  hasGamingAccount: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
}): { pct: number; fields: ProfileCompletionField[]; nextCard: TrustCardTier | null } {
  const fields: ProfileCompletionField[] = [
    { id: "photo",   label: "Profile photo",       done: hasProfilePhoto,   Icon: Camera,    action: "#profile-basics-section", actionLabel: "Add photo" },
    { id: "bio",     label: "Bio",                  done: hasBio,            Icon: FileText,  action: "#profile-bio-section",    actionLabel: "Write bio" },
    { id: "gaming",  label: "Gaming account linked",done: hasGamingAccount,  Icon: Gamepad2,  action: "#profile-gaming-section", actionLabel: "Link account" },
    { id: "email",   label: "Email verified",       done: emailVerified,     Icon: Mail,      action: "#profile-basics-section", actionLabel: "Verify email" },
    { id: "phone",   label: "Phone verified",       done: phoneVerified,     Icon: Phone,     action: "#profile-basics-section", actionLabel: "Verify phone" },
    { id: "country", label: "Country set",          done: hasCountry,        Icon: MapPin,    action: "#profile-basics-section", actionLabel: "Set country" },
    { id: "gender",  label: "Gender set",           done: hasGender,         Icon: User,      action: "#profile-basics-section", actionLabel: "Set gender" },
  ];

  const doneCount = fields.filter((f) => f.done).length;
  const pct = Math.round((doneCount / fields.length) * 100);

  return { pct, fields, nextCard: null };
}

export function ProfileCompletionBar({
  hasProfilePhoto,
  hasBio,
  hasCountry,
  hasGender,
  hasGamingAccount,
  emailVerified,
  phoneVerified,
  trustFactor,
  onScrollTo,
}: {
  hasProfilePhoto: boolean;
  hasBio: boolean;
  hasCountry: boolean;
  hasGender: boolean;
  hasGamingAccount: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  trustFactor: number;
  onScrollTo?: (sectionId: string) => void;
}) {
  const { pct, fields } = computeProfileCompletion({
    hasProfilePhoto, hasBio, hasCountry, hasGender, hasGamingAccount, emailVerified, phoneVerified,
  });

  const card = getTrustCard(trustFactor);
  const incompleteFields = fields.filter((f) => !f.done);

  const nextTierIndex = TRUST_CARD_TIERS.findIndex((t) => t.id === card.id);
  const nextTier = TRUST_CARD_TIERS[nextTierIndex + 1] ?? null;

  const barColor =
    pct >= 85 ? "#f59e0b" :
    pct >= 57 ? "#60a5fa" :
    pct >= 28 ? "#fbbf24" :
    "#9ca3af";

  return (
    <div
      className="rounded-2xl px-4 py-4 space-y-3"
      style={{
        background: `linear-gradient(135deg, ${barColor}06 0%, rgba(0,0,0,0.25) 100%)`,
        border: `1px solid ${barColor}20`,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>
          Profile Completion
        </span>
        <div className="flex items-center gap-2">
          <TrustCardBadge trustFactor={trustFactor} />
          <span className="font-black text-white text-lg leading-none tabular-nums">
            {pct}
            <span className="text-white/35 font-normal text-xs">%</span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="relative h-3 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
            boxShadow: `0 0 8px ${barColor}60`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.20) 50%, transparent 100%)",
              animation: "shimmer 2.5s ease-in-out infinite",
              backgroundSize: "200% 100%",
            }}
          />
        </div>
      </div>

      {/* Next card nudge */}
      {nextTier && (
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          Complete your profile to earn a higher Trust Factor and level up to{" "}
          <span style={{ color: nextTier.color, fontWeight: 800 }}>{nextTier.label}</span>.
        </p>
      )}

      {/* Incomplete fields */}
      {incompleteFields.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {incompleteFields.map((f) => (
            <button
              key={f.id}
              className="w-full flex items-center gap-2 text-left group"
              onClick={() => {
                if (f.action && onScrollTo) {
                  const id = f.action.replace("#", "");
                  onScrollTo(id);
                }
              }}
            >
              <div
                className="h-5 w-5 rounded-full border flex items-center justify-center shrink-0"
                style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
              >
                <f.Icon className="h-2.5 w-2.5" style={{ color: "rgba(255,255,255,0.30)" }} />
              </div>
              <span className="flex-1 text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                {f.label}
              </span>
              <span
                className="text-[10px] font-bold group-hover:underline flex items-center gap-0.5 transition-colors"
                style={{ color: barColor }}
              >
                {f.actionLabel}
                <ChevronRight className="h-2.5 w-2.5" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* All done */}
      {incompleteFields.length === 0 && (
        <p className="text-[10px] font-bold" style={{ color: "#4ade80" }}>
          ✓ Profile fully complete — great work!
        </p>
      )}
    </div>
  );
}
