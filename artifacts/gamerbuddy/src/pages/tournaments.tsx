import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  Trophy, Swords, Users, Crown, Plus, X, Zap, ChevronRight,
  Gamepad2, Loader2, AlertTriangle, CheckCircle2,
  Shield, Lock, Globe, HelpCircle, Flame, Sparkles, Clock, MapPin, UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { CountryCombobox, GenderSelect } from "@/components/country-combobox";
import {
  COUNTRIES, GENDERS, REGIONS, COUNTRY_MAP, GENDER_MAP, REGION_MAP,
  COUNTRY_TO_REGION, countryLabel, genderLabel, regionLabel,
} from "@/lib/geo-options";

const BASE = "/api";

/* ── Types ── */
type TournamentType = "h2h" | "squad" | "ffa";
type TournamentStatus = "open" | "ongoing" | "completed" | "cancelled";

type Registration = {
  id?: number;
  userId: number;
  userName: string;
  status: string;
  placement: number | null;
  prizeWon: number | null;
  entryFeePaid?: number;
  joinedAt: string;
};

type Tournament = {
  id: number;
  hostId: number;
  hostName: string;
  title: string;
  gameName: string;
  platform: string;
  tournamentType: TournamentType;
  maxPlayers: number;
  currentPlayers: number;
  prizePool: number;
  entryFee: number;
  rules: string;
  prizeDistribution: { first: number; second: number; third: number; custom: boolean };
  status: TournamentStatus;
  platformFee: number;
  netPrize: number;
  country: string;
  region: string;
  genderPreference: string;
  winnersData: { userId: number; placement: number; prizeWon: number; userName: string }[] | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  slotsLeft: number;
  registrations: Registration[];
};

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 100;
const MIN_PRIZE = 100;
const MAX_PRIZE = 10000;

/* ── Config ── */
const TYPE_CONFIG: Record<TournamentType, { label: string; desc: string; icon: React.FC<{ className?: string }>; color: string; defaultPlayers: number }> = {
  h2h:   { label: "Head-to-Head", desc: "1v1 or small bracket",       icon: Swords,  color: "#f87171", defaultPlayers: 2 },
  squad: { label: "Squad Battle",  desc: "Team-based clash",           icon: Users,   color: "#A1FF4F", defaultPlayers: 4 },
  ffa:   { label: "Free-for-All",  desc: "Multi-player battle royale", icon: Crown,   color: "#fbbf24", defaultPlayers: 8 },
};

const STATUS_CONFIG: Record<TournamentStatus, { label: string; color: string; bg: string; border: string }> = {
  open:      { label: "Open",      color: "#4ade80", bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.35)"   },
  ongoing:   { label: "Ongoing",   color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.40)"  },
  completed: { label: "Completed", color: "#94a3b8", bg: "rgba(148,163,184,0.10)",border: "rgba(148,163,184,0.28)" },
  cancelled: { label: "Cancelled", color: "#f87171", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.28)"   },
};

const DIST_PRESETS = [
  { key: "winner", label: "Winner Takes All", first: 100, second: 0,  third: 0  },
  { key: "top2",   label: "Top 2 Split",      first: 70,  second: 30, third: 0  },
  { key: "top3",   label: "Top 3 Split",      first: 60,  second: 30, third: 10 },
  { key: "custom", label: "Custom",           first: 0,   second: 0,  third: 0  },
];

const PLATFORMS = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile", "Cross-Platform"];

/* ── API helpers ── */
const fetchTournaments = async (): Promise<Tournament[]> => {
  const r = await fetch(`${BASE}/tournaments`, { credentials: "include" });
  if (!r.ok) throw new Error("Failed to load tournaments");
  return r.json();
};

/* ── Tooltip ── */
function Tip({ text, wide }: { text: string; wide?: boolean }) {
  return (
    <span className="relative group inline-flex items-center ml-1.5 align-middle cursor-help">
      <HelpCircle className="h-3 w-3 text-muted-foreground/30 group-hover:text-purple-400/60 transition-colors" />
      <span
        className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-xl text-[11px] font-medium leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[200] text-center ${wide ? "w-64" : "w-48"}`}
        style={{
          background: "rgba(15,8,35,0.98)",
          border: "1px solid rgba(161,255,79,0.35)",
          color: "rgba(255,255,255,0.78)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(161,255,79,0.10)",
        }}
      >
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent" style={{ borderTopColor: "rgba(161,255,79,0.35)" }} />
      </span>
    </span>
  );
}

/* ── Quick-chip row ── */
function ChipRow({ chips, active, onSelect, color = "purple" }: {
  chips: { label: string; value: number | string }[];
  active: number | string;
  onSelect: (v: number | string) => void;
  color?: "purple" | "gold";
}) {
  const activeStyle = color === "gold"
    ? { background: "rgba(251,191,36,0.22)", border: "1px solid rgba(251,191,36,0.55)", color: "#fbbf24" }
    : { background: "rgba(161,255,79,0.22)", border: "1px solid rgba(161,255,79,0.55)", color: "#A1FF4F" };
  const inactiveStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.38)" };
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {chips.map(({ label, value }) => (
        <button key={String(value)} type="button" onClick={() => onSelect(value)}
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-120 active:scale-95"
          style={active === value ? activeStyle : inactiveStyle}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Visual distribution bar ── */
function DistBar({ first, second, third, net }: { first: number; second: number; third: number; net: number }) {
  const rest = Math.max(0, 100 - first - second - third);
  const fmt = (pct: number) => net > 0 ? `$${Math.round(net * pct / 100).toLocaleString()}` : `${pct}%`;
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex h-5 rounded-lg overflow-hidden w-full gap-px">
        {first > 0 && <div className="flex items-center justify-center text-[9px] font-extrabold text-black/80" style={{ width: `${first}%`, background: "linear-gradient(90deg,#fbbf24,#f59e0b)" }}>{first > 8 ? "🥇" : ""}</div>}
        {second > 0 && <div className="flex items-center justify-center text-[9px] font-extrabold text-black/70" style={{ width: `${second}%`, background: "linear-gradient(90deg,#94a3b8,#64748b)" }}>{second > 8 ? "🥈" : ""}</div>}
        {third > 0 && <div className="flex items-center justify-center text-[9px] font-extrabold text-black/70" style={{ width: `${third}%`, background: "linear-gradient(90deg,#c2813a,#a16207)" }}>{third > 8 ? "🥉" : ""}</div>}
        {rest > 0 && <div style={{ width: `${rest}%`, background: "rgba(255,255,255,0.06)" }} />}
      </div>
      <div className="flex gap-3 flex-wrap">
        {first > 0 && <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: "#fbbf24" }}>🥇 {fmt(first)}</span>}
        {second > 0 && <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: "#94a3b8" }}>🥈 {fmt(second)}</span>}
        {third > 0 && <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: "#c2813a" }}>🥉 {fmt(third)}</span>}
        {net > 0 && rest === 0 && <span className="text-[10px] text-muted-foreground/35 ml-auto">after 10% platform fee</span>}
      </div>
    </div>
  );
}

/* ── Avatar ── */
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const letter = name?.charAt(0).toUpperCase() ?? "?";
  const hue = (name?.charCodeAt(0) ?? 0) * 47 % 360;
  return (
    <div className="rounded-full flex items-center justify-center font-extrabold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${hue},60%,40%)` }}>
      {letter}
    </div>
  );
}

/* ── Status pill ── */
function StatusPill({ status }: { status: TournamentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

/* ── Mini dist bar (inside card) ── */
function MiniDistBar({ first, second, third, net }: { first: number; second: number; third: number; net: number }) {
  const fmt = (pct: number) => `$${Math.round(net * pct / 100).toLocaleString()}`;
  return (
    <div className="space-y-1.5">
      <div className="flex h-1.5 rounded-full overflow-hidden w-full gap-px">
        {first  > 0 && <div style={{ width: `${first}%`,  background: "linear-gradient(90deg,#fbbf24,#f59e0b)" }} />}
        {second > 0 && <div style={{ width: `${second}%`, background: "linear-gradient(90deg,#94a3b8,#64748b)" }} />}
        {third  > 0 && <div style={{ width: `${third}%`,  background: "linear-gradient(90deg,#c2813a,#a16207)" }} />}
      </div>
      <div className="flex gap-2.5 flex-wrap">
        {first  > 0 && <span className="text-[10px] font-extrabold" style={{ color: "#fbbf24" }}>🥇 {fmt(first)}</span>}
        {second > 0 && <span className="text-[10px] font-extrabold" style={{ color: "#94a3b8" }}>🥈 {fmt(second)}</span>}
        {third  > 0 && <span className="text-[10px] font-extrabold" style={{ color: "#c2813a" }}>🥉 {fmt(third)}</span>}
        <span className="text-[9px] text-muted-foreground/35 self-center">after 10% fee</span>
      </div>
    </div>
  );
}

/* ── Promoted threshold ── */
const PROMOTED_PRIZE = 1000;

/* ── Eligibility check ── */
type EligibilityResult = { eligible: true } | { eligible: false; reasons: string[] };

function checkEligibility(
  tournament: { country: string; region: string; genderPreference: string },
  user: { country: string | null; gender: string | null } | null,
): EligibilityResult {
  const hasCountryReq = tournament.country !== "any";
  const hasRegionReq  = tournament.region !== "any";
  const hasGenderReq  = tournament.genderPreference !== "any";
  if (!hasCountryReq && !hasRegionReq && !hasGenderReq) return { eligible: true };

  const userCountry = user?.country ?? "";
  const userGender  = user?.gender  ?? "";
  const userRegion  = COUNTRY_TO_REGION[userCountry] ?? "Other";

  const reasons: string[] = [];
  if (hasCountryReq && tournament.country !== userCountry) {
    const flag  = COUNTRY_MAP[tournament.country]?.flag  ?? "";
    const label = COUNTRY_MAP[tournament.country]?.label ?? tournament.country;
    reasons.push(`${flag} ${label}`.trim());
  }
  if (hasRegionReq && tournament.region !== userRegion) {
    reasons.push(REGION_MAP[tournament.region]?.label ?? tournament.region);
  }
  if (hasGenderReq && tournament.genderPreference !== userGender) {
    reasons.push(`${GENDER_MAP[tournament.genderPreference]?.label ?? tournament.genderPreference} players`);
  }
  return reasons.length === 0 ? { eligible: true } : { eligible: false, reasons };
}

/* ── Req badge ── */
function ReqBadge({ country, region, gender }: { country: string; region: string; gender: string }) {
  const hasCountry = country && country !== "any";
  const hasRegion = region && region !== "any";
  const hasGender = gender && gender !== "any";
  if (!hasCountry && !hasRegion && !hasGender) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      {hasCountry && (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
          style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }}>
          <MapPin className="h-2.5 w-2.5" />
          {COUNTRY_MAP[country]?.flag} {COUNTRY_MAP[country]?.label ?? country}
        </span>
      )}
      {hasRegion && (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
          style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" }}>
          🌐 {REGION_MAP[region]?.label ?? region}
        </span>
      )}
      {hasGender && (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
          style={{ background: "rgba(161,255,79,0.10)", border: "1px solid rgba(161,255,79,0.25)", color: "#A1FF4F" }}>
          {GENDER_MAP[gender]?.icon} {GENDER_MAP[gender]?.label ?? gender}
        </span>
      )}
    </div>
  );
}

/* ── Tournament card ── */
type AuthUser = { id: number; country: string | null; gender: string | null } | null | undefined;

function TournamentCard({ tournament, currentUser }: { tournament: Tournament; currentUser?: AuthUser }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tcfg = TYPE_CONFIG[tournament.tournamentType];
  const TypeIcon = tcfg.icon;

  const currentUserId = currentUser?.id;
  const isHost      = currentUserId === tournament.hostId;
  const myReg       = tournament.registrations.find((r) => r.userId === currentUserId);
  const isPending   = myReg?.status === "pending";
  const isApproved  = myReg?.status === "registered" || myReg?.status === "winner";
  const isRejected  = myReg?.status === "rejected";
  const isFull      = tournament.currentPlayers >= tournament.maxPlayers;
  const pct         = Math.min(100, (tournament.currentPlayers / tournament.maxPlayers) * 100);
  const isPromoted  = tournament.prizePool >= PROMOTED_PRIZE;
  const isOngoing   = tournament.status === "ongoing";
  const isOpen      = tournament.status === "open";
  const dist        = tournament.prizeDistribution;

  const eligibility = currentUser && !isHost && !myReg
    ? checkEligibility(tournament, { country: currentUser.country, gender: currentUser.gender })
    : { eligible: true as const };

  const joinMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/tournaments/${tournament.id}/request-join`, { method: "POST", credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to send request");
      return data;
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["tournaments"] }); toast({ title: "Request sent!", description: data.message }); },
    onError: (e: Error) => toast({ title: "Cannot request join", description: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/tournaments/${tournament.id}`, { method: "DELETE", credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to cancel");
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tournaments"] }); toast({ title: "Tournament cancelled — prize pool refunded" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div
      className="group rounded-3xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "rgba(10,5,22,0.96)",
        borderColor: isOpen ? `${tcfg.color}50` : isOngoing ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.07)",
        boxShadow: isOpen
          ? `0 0 0 1px ${tcfg.color}20, 0 8px 32px rgba(0,0,0,0.5), 0 0 40px ${tcfg.color}08`
          : isOngoing
          ? "0 0 0 1px rgba(251,191,36,0.15), 0 8px 32px rgba(0,0,0,0.5)"
          : "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      {/* ── Hero band ── */}
      <Link href={`/tournaments/${tournament.id}`}>
        <div
          className="relative px-5 pt-5 pb-4 cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${tcfg.color}14 0%, rgba(251,191,36,0.06) 50%, transparent 100%)`,
            borderBottom: `1px solid ${tcfg.color}20`,
          }}
        >
          {isPromoted && (
            <div className="absolute top-0 right-0 flex items-center gap-1 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-bl-2xl"
              style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.22),rgba(251,191,36,0.10))", border: "1px solid rgba(251,191,36,0.40)", borderTop: "none", borderRight: "none", color: "#fbbf24" }}>
              <Sparkles className="h-2.5 w-2.5" /> Promoted
            </div>
          )}
          {isOngoing && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-yellow-400/80">Live</span>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: `linear-gradient(135deg, ${tcfg.color}22, ${tcfg.color}0C)`, border: `1.5px solid ${tcfg.color}50`, boxShadow: `0 0 16px ${tcfg.color}18` }}>
              <TypeIcon className="h-5 w-5" style={{ color: tcfg.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] sm:text-[17px] font-extrabold text-white leading-snug group-hover:text-primary/90 transition-colors line-clamp-2">
                {tournament.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: `${tcfg.color}18`, color: tcfg.color, border: `1px solid ${tcfg.color}35` }}>
                  {tcfg.label}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-primary/80" style={{ background: "rgba(161,255,79,0.10)", border: "1px solid rgba(161,255,79,0.22)" }}>
                  {tournament.gameName}
                </span>
                <span className="text-[10px] text-muted-foreground/45 flex items-center gap-1">
                  <Gamepad2 className="h-2.5 w-2.5" />{tournament.platform}
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[22px] sm:text-[24px] font-black text-yellow-400 leading-none">${tournament.prizePool.toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground/40 mt-0.5">prize pool</p>
            </div>
          </div>

          {/* Status + free badge + requirement badges */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <StatusPill status={tournament.status} />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.28)", color: "#4ade80" }}>
              🎁 Free Entry
            </span>
          </div>
          <ReqBadge country={tournament.country} region={tournament.region} gender={tournament.genderPreference} />
        </div>
      </Link>

      {/* ── Body ── */}
      <div className="px-5 py-4 space-y-4">
        {/* Slot bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-muted-foreground/50 font-medium flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              {isOpen && !isFull
                ? <><span className="font-extrabold" style={{ color: pct > 60 ? "#fbbf24" : "#A1FF4F" }}>{tournament.slotsLeft}</span> slots left</>
                : isFull ? <span className="font-bold text-red-400/80">All slots filled</span>
                : "Participants"}
            </span>
            <span className="text-[12px] font-extrabold tabular-nums" style={{ color: pct >= 100 ? "#f87171" : pct > 60 ? "#fbbf24" : "#A1FF4F" }}>
              {tournament.currentPlayers}/{tournament.maxPlayers}
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${pct}%`,
              background: pct >= 100 ? "linear-gradient(90deg,#f87171,#ef4444)" : pct > 75 ? "linear-gradient(90deg,#f97316,#ea580c)" : pct > 40 ? "linear-gradient(90deg,#fbbf24,#f59e0b)" : "linear-gradient(90deg,#A1FF4F,#88cc33)",
            }} />
          </div>
        </div>

        {/* Prize dist mini bar */}
        <MiniDistBar first={dist.first} second={dist.second} third={dist.third} net={tournament.netPrize} />

        {/* Meta row */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/45 flex-wrap">
          <Avatar name={tournament.hostName} size={16} />
          <span>by <span className="font-semibold text-white/55">{tournament.hostName}</span></span>
          <span className="text-muted-foreground/25">·</span>
          <span>{formatDistanceToNow(new Date(tournament.createdAt), { addSuffix: true })}</span>
        </div>

        {/* ── Action row ── */}
        <div className="flex gap-2 flex-wrap pt-0.5">
          {/* Eligibility gate — logged-in, no existing registration, not the host */}
          {isOpen && !isHost && !myReg && currentUserId && (
            eligibility.eligible ? (
              <Button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending || isFull}
                className="flex-1 font-extrabold text-[13px] py-2.5 h-auto"
                style={{ background: "linear-gradient(135deg,#A1FF4F,#88cc33)", boxShadow: "0 0 20px rgba(161,255,79,0.30)" }}
              >
                {joinMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
                  : isFull
                  ? <><Lock className="h-4 w-4 mr-1.5" />Full</>
                  : <><UserCheck className="h-4 w-4 mr-1.5" />Request to Join</>
                }
              </Button>
            ) : (
              <div className="flex-1 rounded-xl py-2 px-3 text-[11px] leading-snug"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>
                <p className="font-extrabold flex items-center gap-1.5 mb-0.5">
                  <Lock className="h-3.5 w-3.5 shrink-0" /> Restricted Tournament
                </p>
                <p className="text-red-400/70 text-[10px]">
                  Requires: {(eligibility as { eligible: false; reasons: string[] }).reasons.join(" · ")}
                </p>
                <p className="text-red-400/50 text-[10px] mt-0.5">Update your profile to qualify.</p>
              </div>
            )
          )}

          {!currentUserId && isOpen && (
            <Button asChild className="flex-1 font-bold py-2.5 h-auto" style={{ background: "linear-gradient(135deg,#A1FF4F,#88cc33)" }}>
              <Link href="/login"><Zap className="h-4 w-4 mr-1.5" />Log in to Join</Link>
            </Button>
          )}

          {isPending && (
            <div className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold"
              style={{ background: "rgba(251,191,36,0.10)", border: "1.5px solid rgba(251,191,36,0.30)", color: "#fbbf24" }}>
              <Clock className="h-4 w-4" /> Request Pending
            </div>
          )}

          {isApproved && (
            <div className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold"
              style={{ background: "rgba(34,197,94,0.10)", border: "1.5px solid rgba(34,197,94,0.30)", color: "#4ade80" }}>
              <CheckCircle2 className="h-4 w-4" /> You're In!
            </div>
          )}

          {isRejected && (
            <div className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold"
              style={{ background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
              <X className="h-4 w-4" /> Request Rejected
            </div>
          )}

          {isHost && (
            <span className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-bold"
              style={{ background: "rgba(161,255,79,0.10)", border: "1px solid rgba(161,255,79,0.28)", color: "#A1FF4F" }}>
              <Shield className="h-3.5 w-3.5" /> Your Tournament
            </span>
          )}

          <Link href={`/tournaments/${tournament.id}`}
            className="flex items-center gap-1 text-[12px] font-bold px-3.5 py-2.5 rounded-xl transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.50)" }}>
            Details <ChevronRight className="h-3.5 w-3.5" />
          </Link>

          {isHost && isOpen && (
            <Button variant="ghost" size="sm"
              onClick={() => { if (confirm("Cancel this tournament and refund the prize pool?")) cancelMutation.mutate(); }}
              disabled={cancelMutation.isPending}
              className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 font-semibold px-2">
              {cancelMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Creation form ── */
function CreateTournamentForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [gameName, setGameName] = useState("");
  const [platform, setPlatform] = useState("PC");
  const [tournamentType, setTournamentType] = useState<TournamentType>("h2h");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [prizePool, setPrizePool] = useState("");
  const [rules, setRules] = useState("");
  const [distPreset, setDistPreset] = useState("winner");
  const [customFirst, setCustomFirst] = useState(60);
  const [customSecond, setCustomSecond] = useState(30);
  const [customThird, setCustomThird] = useState(10);
  const [country, setCountry] = useState("any");
  const [region, setRegion] = useState("any");
  const [genderPreference, setGenderPreference] = useState("any");

  const preset = DIST_PRESETS.find((p) => p.key === distPreset) ?? DIST_PRESETS[0];
  const dist = distPreset === "custom"
    ? { first: customFirst, second: customSecond, third: customThird, custom: true }
    : { first: preset.first, second: preset.second, third: preset.third, custom: false };
  const distTotal = dist.first + dist.second + dist.third;

  const prize = parseFloat(prizePool) || 0;
  const platformFeeEst = Math.round(prize * 0.1 * 100) / 100;
  const netPrizeEst = Math.round((prize - platformFeeEst) * 100) / 100;

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/tournaments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title, gameName, platform, tournamentType,
          maxPlayers, prizePool: prize,
          rules, prizeDistribution: JSON.stringify(dist),
          country, region, genderPreference,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to create tournament");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tournaments"] });
      toast({ title: "Tournament created! Let the games begin! 🏆" });
      onSuccess();
    },
    onError: (e: Error) => toast({ title: "Failed to create", description: e.message, variant: "destructive" }),
  });

  const prizeError = prizePool !== "" && (prize < MIN_PRIZE || prize > MAX_PRIZE)
    ? `Prize pool must be between $${MIN_PRIZE} and $${MAX_PRIZE.toLocaleString()}`
    : null;
  const playersError = maxPlayers < MIN_PLAYERS || maxPlayers > MAX_PLAYERS
    ? `Slots must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}` : null;

  const canSubmit =
    title.trim() !== "" && gameName.trim() !== "" && rules.trim() !== "" &&
    !prizeError && !playersError && prize >= MIN_PRIZE &&
    Math.abs(distTotal - 100) <= 0.5 && !createMutation.isPending;

  const inputCls = "w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60 transition-all";
  const labelCls = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-3";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border"
        style={{ background: "rgba(8,4,18,0.98)", borderColor: "rgba(161,255,79,0.40)", boxShadow: "0 0 60px rgba(161,255,79,0.20), 0 24px 80px rgba(0,0,0,0.8)" }}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: "rgba(8,4,18,0.98)", borderColor: "rgba(161,255,79,0.20)" }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(161,255,79,0.30),rgba(161,255,79,0.12))", border: "1px solid rgba(161,255,79,0.50)" }}>
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-[16px] font-extrabold text-white">Host a Tournament</h2>
              <p className="text-[11px] text-muted-foreground/50">Create your own free-entry tournament — set who can join!</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center border border-border/50 text-muted-foreground hover:text-white hover:border-border transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Free Entry notice ── */}
          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-[12px]"
            style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.22)", color: "rgba(74,222,128,0.80)" }}>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>All Player4Hire tournaments are <strong>completely free to join</strong>. You approve each participant request manually.</span>
          </div>

          {/* ── Basic Info ── */}
          <section>
            <label className={labelCls}>Basic Info</label>
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Tournament title (e.g. Weekend Valorant Showdown)" maxLength={80} className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <input value={gameName} onChange={(e) => setGameName(e.target.value)}
                  placeholder="Game name" maxLength={60}
                  className="rounded-xl px-3.5 py-2.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60 transition-all" />
                <select value={platform} onChange={(e) => setPlatform(e.target.value)}
                  className="rounded-xl px-3.5 py-2.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground focus:border-primary/60 transition-all">
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* ── Tournament Type ── */}
          <section>
            <label className={labelCls}>Tournament Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(["h2h", "squad", "ffa"] as TournamentType[]).map((type) => {
                const cfg = TYPE_CONFIG[type];
                const TypeIcon = cfg.icon;
                const active = tournamentType === type;
                return (
                  <button key={type} onClick={() => { setTournamentType(type); setMaxPlayers(cfg.defaultPlayers); }}
                    className="flex flex-col items-center gap-2 rounded-xl py-4 px-3 transition-all duration-150 active:scale-95"
                    style={active ? { background: `${cfg.color}18`, border: `1.5px solid ${cfg.color}55`, boxShadow: `0 0 16px ${cfg.color}18` }
                      : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <TypeIcon className="h-5 w-5" style={{ color: active ? cfg.color : "rgba(255,255,255,0.35)" }} />
                    <div className="text-center">
                      <p className="text-[11px] font-bold" style={{ color: active ? cfg.color : "rgba(255,255,255,0.50)" }}>{cfg.label}</p>
                      <p className="text-[9px] text-muted-foreground/40 leading-tight mt-0.5">{cfg.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Player Slots ── */}
          <section>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2 flex items-center">
              Number of Slots
              <Tip text={`Min ${MIN_PLAYERS} players, max ${MAX_PLAYERS}. Tournament fills when all approved slots are taken.`} wide />
            </label>
            <input type="number" min={MIN_PLAYERS} max={MAX_PLAYERS} value={maxPlayers}
              onChange={(e) => setMaxPlayers(Math.max(1, Math.min(MAX_PLAYERS + 10, parseInt(e.target.value) || MIN_PLAYERS)))}
              className={`w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none bg-background/60 border text-foreground focus:ring-0 transition-all ${playersError ? "border-red-500/60" : "border-border/60 focus:border-primary/60"}`} />
            <ChipRow chips={[{ label: "2", value: 2 }, { label: "4", value: 4 }, { label: "8", value: 8 }, { label: "16", value: 16 }, { label: "32", value: 32 }, { label: "64", value: 64 }, { label: "100", value: 100 }]}
              active={maxPlayers} onSelect={(v) => setMaxPlayers(Number(v))} />
            {playersError
              ? <p className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 mt-1.5"><AlertTriangle className="h-3 w-3 shrink-0" />{playersError}</p>
              : <p className="text-[10px] text-muted-foreground/35 mt-1.5">Currently <span className="text-white/60 font-semibold">{maxPlayers} player{maxPlayers !== 1 ? "s" : ""}</span></p>}
          </section>

          {/* ── Eligibility Requirements ── */}
          <section>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1 flex items-center">
              Player Eligibility Requirements
              <Tip text="Only gamers whose profile matches all your requirements will be able to see and request to join. This is enforced server-side." wide />
            </label>
            <p className="text-[11px] text-muted-foreground/40 mb-3">
              Only players matching these requirements can join. Set to "Any" for open access.
            </p>
            <div className="space-y-3 p-4 rounded-xl" style={{ background: "rgba(161,255,79,0.04)", border: "1px solid rgba(161,255,79,0.14)" }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/50 mb-1.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Nation / Country
                  </p>
                  <CountryCombobox value={country} onValueChange={setCountry} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/50 mb-1.5 flex items-center gap-1">
                    🌐 Region
                  </p>
                  <select value={region} onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground focus:border-primary/60 transition-all h-9">
                    {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground/50 mb-1.5">Gender Preference</p>
                <GenderSelect value={genderPreference} onValueChange={setGenderPreference} />
              </div>
            </div>
          </section>

          {/* ── Prize Pool ── */}
          <section>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2 flex items-center">
              Prize Pool
              <Tip text="Your prize pool is held in escrow immediately. 10% platform fee deducted when you declare winners. Cancel anytime before tournament fills for a full refund." wide />
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 font-bold text-[13px]">$</span>
              <input type="number" min={MIN_PRIZE} max={MAX_PRIZE} value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)} placeholder="500"
                className={`w-full rounded-xl pl-7 pr-3.5 py-2.5 text-[13px] outline-none bg-background/60 border text-foreground focus:ring-0 transition-all ${prizeError ? "border-red-500/60" : "border-border/60 focus:border-primary/60"}`} />
            </div>
            <ChipRow chips={[{ label: "$100", value: 100 }, { label: "$250", value: 250 }, { label: "$500", value: 500 }, { label: "$1,000", value: 1000 }, { label: "$2,500", value: 2500 }, { label: "$5,000", value: 5000 }, { label: "$10,000", value: 10000 }]}
              active={prize} onSelect={(v) => setPrizePool(String(v))} color="gold" />
            {prizeError
              ? <p className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 mt-1.5"><AlertTriangle className="h-3 w-3 shrink-0" />{prizeError}</p>
              : prize >= MIN_PRIZE
              ? <div className="mt-2.5 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-[11px]" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
                  <span className="text-muted-foreground/50">Platform fee (10%): <span className="text-red-400/80 font-semibold">−${platformFeeEst.toFixed(2)}</span></span>
                  <span className="font-extrabold text-emerald-400 text-[13px]">Net: ${netPrizeEst.toFixed(2)}</span>
                </div>
              : <p className="text-[10px] text-muted-foreground/35 mt-1.5">Min $100 · Max $10,000 USD</p>}
          </section>

          {/* ── Prize Distribution ── */}
          <section>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2 flex items-center">
              Prize Distribution
              <Tip text="How net prizes are split among top finishers. Percentages must add up to 100%." wide />
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIST_PRESETS.map((p) => {
                const active = distPreset === p.key;
                return (
                  <button key={p.key} type="button" onClick={() => setDistPreset(p.key)}
                    className="py-3 px-2 rounded-xl text-center transition-all duration-150 active:scale-95 space-y-1.5"
                    style={active ? { background: "rgba(161,255,79,0.16)", border: "1.5px solid rgba(161,255,79,0.55)" }
                      : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[11px] font-extrabold" style={{ color: active ? "#A1FF4F" : "rgba(255,255,255,0.45)" }}>{p.label}</p>
                    {p.key !== "custom" && (
                      <div className="flex gap-px h-2 rounded-sm overflow-hidden mx-2">
                        {p.first > 0 && <div style={{ width: `${p.first}%`, background: "#fbbf24" }} />}
                        {p.second > 0 && <div style={{ width: `${p.second}%`, background: "#94a3b8" }} />}
                        {p.third > 0 && <div style={{ width: `${p.third}%`, background: "#c2813a" }} />}
                      </div>
                    )}
                    {p.key !== "custom"
                      ? <p className="text-[9px]" style={{ color: active ? "rgba(161,255,79,0.65)" : "rgba(255,255,255,0.22)" }}>
                          {[p.first > 0 && `🥇${p.first}%`, p.second > 0 && `🥈${p.second}%`, p.third > 0 && `🥉${p.third}%`].filter(Boolean).join(" ")}
                        </p>
                      : <p className="text-[9px]" style={{ color: active ? "rgba(161,255,79,0.65)" : "rgba(255,255,255,0.22)" }}>set your own %</p>}
                  </button>
                );
              })}
            </div>
            <DistBar first={dist.first} second={dist.second} third={dist.third} net={netPrizeEst} />
            {distPreset === "custom" && (
              <div className="mt-3 p-4 rounded-xl space-y-3" style={{ background: "rgba(161,255,79,0.05)", border: "1px solid rgba(161,255,79,0.15)" }}>
                {[
                  { emoji: "🥇", label: "1st Place", val: customFirst, set: setCustomFirst, color: "#fbbf24" },
                  { emoji: "🥈", label: "2nd Place", val: customSecond, set: setCustomSecond, color: "#94a3b8" },
                  { emoji: "🥉", label: "3rd Place", val: customThird, set: setCustomThird, color: "#c2813a" },
                ].map(({ emoji, label, val, set, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold" style={{ color }}>{emoji} {label}</span>
                      <div className="flex items-center gap-2">
                        {netPrizeEst > 0 && <span className="text-[11px] font-extrabold" style={{ color }}>${Math.round(netPrizeEst * val / 100).toLocaleString()}</span>}
                        <span className="text-[12px] font-bold text-white/60 w-9 text-right">{val}%</span>
                      </div>
                    </div>
                    <input type="range" min={0} max={100} step={1} value={val} onChange={(e) => set(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ accentColor: color }} />
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <div className="h-1.5 flex-1 rounded-full overflow-hidden mr-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-200" style={{
                      width: `${Math.min(distTotal, 100)}%`,
                      background: Math.abs(distTotal - 100) <= 0.5 ? "linear-gradient(90deg,#4ade80,#22c55e)" : distTotal > 100 ? "linear-gradient(90deg,#f87171,#ef4444)" : "linear-gradient(90deg,#fbbf24,#f59e0b)",
                    }} />
                  </div>
                  <span className={`text-[11px] font-extrabold shrink-0 ${Math.abs(distTotal - 100) <= 0.5 ? "text-emerald-400" : distTotal > 100 ? "text-red-400" : "text-yellow-400"}`}>
                    {distTotal}% {Math.abs(distTotal - 100) <= 0.5 ? "✓" : distTotal > 100 ? "over" : "remaining"}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ── Rules ── */}
          <section>
            <label className={labelCls}>Rules / Objectives</label>
            <textarea value={rules} onChange={(e) => setRules(e.target.value)}
              placeholder="Describe the rules, format, how winners are determined, and any special conditions…"
              rows={4} maxLength={1500}
              className="w-full rounded-xl px-3.5 py-2.5 text-[13px] resize-none outline-none bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60 transition-all" />
            <div className="flex justify-end mt-1"><span className="text-[10px] text-muted-foreground/30">{rules.length}/1500</span></div>
          </section>

          {/* Wallet notice */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-[12px]"
            style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.22)", color: "rgba(251,191,36,0.75)" }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>The prize pool of <strong>${prize > 0 ? prize.toFixed(2) : "—"}</strong> will be immediately deducted from your Hiring Wallet and held in escrow. Cancel to get a full refund before the tournament fills.</span>
          </div>

          {/* Submit */}
          <Button className="w-full font-extrabold text-[14px] py-3 h-auto" disabled={!canSubmit}
            onClick={() => createMutation.mutate()}
            style={{ background: "linear-gradient(135deg,#A1FF4F,#88cc33)", boxShadow: "0 0 24px rgba(161,255,79,0.35)" }}>
            {createMutation.isPending
              ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Creating Tournament…</>
              : <><Trophy className="h-5 w-5 mr-2" />Host This Tournament — Lock in ${prize > 0 ? prize.toFixed(0) : "0"} Prize Pool</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Filter / Sort ── */
type FilterStatus = "all" | TournamentStatus;
type SortKey = "newest" | "prize_desc" | "slots_asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest",     label: "Newest" },
  { value: "prize_desc", label: "Prize ↓" },
  { value: "slots_asc",  label: "Slots Left" },
];

function sortTournaments(list: Tournament[], key: SortKey): Tournament[] {
  return [...list].sort((a, b) => {
    if (key === "prize_desc") return b.prizePool - a.prizePool;
    if (key === "slots_asc") return b.slotsLeft - a.slotsLeft;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/* ── Main Page ── */
export default function TournamentsPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const { data: tournaments = [], isLoading, isError } = useQuery({
    queryKey: ["tournaments"],
    queryFn: fetchTournaments,
    refetchInterval: 15_000,
  });

  const filtered = sortTournaments(
    tournaments.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || t.gameName.toLowerCase().includes(q) || t.hostName.toLowerCase().includes(q);
      }
      return true;
    }),
    sort,
  );

  const openCount    = tournaments.filter((t) => t.status === "open").length;
  const ongoingCount = tournaments.filter((t) => t.status === "ongoing").length;

  const FILTERS: { value: FilterStatus; label: string; count?: number }[] = [
    { value: "all",       label: "All",       count: tournaments.length },
    { value: "open",      label: "Open",      count: openCount },
    { value: "ongoing",   label: "Live",       count: ongoingCount },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%,rgba(251,191,36,0.06) 0%,transparent 60%)" }} />

      {/* Hero header */}
      <div className="rounded-3xl p-6 sm:p-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,rgba(161,255,79,0.12) 0%,rgba(251,191,36,0.08) 50%,rgba(0,0,0,0.5) 100%)", border: "1px solid rgba(161,255,79,0.25)", boxShadow: "0 0 50px rgba(161,255,79,0.10)" }}>
        <Trophy className="absolute -right-4 -top-4 h-32 w-32 text-yellow-400/05" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full"
                style={{ background: "rgba(251,191,36,0.14)", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24" }}>
                Tournaments
              </span>
              {ongoingCount > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse"
                  style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.45)", color: "#f87171" }}>
                  {ongoingCount} Live
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-yellow-400 tracking-tight leading-none" style={{ letterSpacing: "-0.02em" }}>
              TOURNAMENTS
            </h1>
            <p className="text-muted-foreground/70 mt-2 text-sm leading-relaxed max-w-xs">
              Free-entry competitive events with real prize pools. Host sets who qualifies.
            </p>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {openCount} open now</span>
              <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Always free to join</span>
              <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Host approves participants</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {user ? (
              <Button onClick={() => setShowForm(true)} className="font-extrabold whitespace-nowrap"
                style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#000", boxShadow: "0 0 20px rgba(251,191,36,0.35)" }}>
                <Trophy className="h-4 w-4 mr-1.5" /> Host Tournament
              </Button>
            ) : (
              <Button asChild variant="outline" className="font-bold border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 whitespace-nowrap">
                <Link href="/login">Log in to host</Link>
              </Button>
            )}
            {user && (
              <Button asChild variant="outline" size="sm" className="font-semibold whitespace-nowrap border-primary/40 text-primary/80 hover:bg-primary/10">
                <Link href="/my-tournaments">My Tournaments</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by game, title, or host…"
            className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60 transition-all" />
          <div className="flex items-center p-1 gap-1 rounded-xl shrink-0"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {FILTERS.map(({ value, label, count }) => (
              <button key={value} onClick={() => setFilter(value)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all duration-150 active:scale-95 whitespace-nowrap"
                style={filter === value ? { background: "linear-gradient(135deg,rgba(161,255,79,0.28),rgba(161,255,79,0.18))", border: "1px solid rgba(161,255,79,0.55)", color: "#A1FF4F" }
                  : { color: "rgba(255,255,255,0.40)", border: "1px solid transparent" }}>
                {label}
                {count !== undefined && count > 0 && (
                  <span className="text-[9px] font-black px-1 rounded-full"
                    style={filter === value ? { background: "rgba(161,255,79,0.35)", color: "#e9d5ff" } : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground/35 uppercase tracking-widest shrink-0">Sort:</span>
          {SORT_OPTIONS.map((o) => (
            <button key={o.value} onClick={() => setSort(o.value)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={sort === o.value ? { background: "rgba(161,255,79,0.18)", border: "1px solid rgba(161,255,79,0.40)", color: "#A1FF4F" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
          <span className="text-muted-foreground/50 text-sm font-medium">Loading tournaments…</span>
        </div>
      ) : isError ? (
        <div className="text-center py-16">
          <AlertTriangle className="h-10 w-10 mx-auto text-red-400/40 mb-3" />
          <p className="text-muted-foreground/60 font-medium">Failed to load tournaments</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Trophy className="h-14 w-14 mx-auto text-yellow-400/15" />
          <div>
            <p className="text-white/60 font-bold text-lg">No tournaments found</p>
            <p className="text-muted-foreground/45 text-sm mt-1">
              {search ? "Try a different search" : filter !== "all" ? "No tournaments with this status" : user ? "Be the first to host one!" : "Log in to see tournaments matching your profile"}
            </p>
          </div>
          {user && (
            <Button onClick={() => setShowForm(true)} className="mt-4 font-bold"
              style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#000" }}>
              <Trophy className="h-4 w-4 mr-1.5" /> Host First Tournament
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((t) => (
            <TournamentCard key={t.id} tournament={t} currentUser={user} />
          ))}
        </div>
      )}

      {showForm && <CreateTournamentForm onClose={() => setShowForm(false)} onSuccess={() => setShowForm(false)} />}
    </div>
  );
}
