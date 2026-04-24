import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  Trophy, Shield, Users, Clock, Loader2, AlertTriangle,
  Swords, Crown, ArrowRight, MapPin, UserCheck, Zap,
  CheckCircle2, XCircle, Star, Play, CalendarDays, Plus,
  Bell, Eye, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { COUNTRY_MAP, REGION_MAP } from "@/lib/geo-options";
import { useToast } from "@/hooks/use-toast";

const BASE = "/api";

/* ── Types ── */
type TournamentType = "h2h" | "squad" | "ffa";
type TournamentStatus = "open" | "ongoing" | "completed" | "cancelled";

type Registration = {
  userId: number;
  userName: string;
  status: string;
  placement: number | null;
  prizeWon: number | null;
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
  netPrize: number;
  status: TournamentStatus;
  country: string;
  region: string;
  genderPreference: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  slotsLeft: number;
  registrations: Registration[];
};

type MyTournamentsData = {
  hosted: Tournament[];
  joined: { tournament: Tournament; registration: { status: string; joinedAt: string } }[];
};

/* ── Config ── */
const TYPE_ICON: Record<TournamentType, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  h2h: Swords, squad: Users, ffa: Crown,
};
const TYPE_COLOR: Record<TournamentType, string> = {
  h2h: "#f87171", squad: "#ACB5FF", ffa: "#fbbf24",
};
const TYPE_LABEL: Record<TournamentType, string> = {
  h2h: "Head-to-Head", squad: "Squad", ffa: "Free-for-All",
};

const STATUS_CFG: Record<TournamentStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  open:      { label: "Open",      color: "#4ade80", bg: "rgba(34,197,94,0.12)",    border: "rgba(34,197,94,0.30)",    dot: "#4ade80" },
  ongoing:   { label: "Live",      color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.35)",   dot: "#fbbf24" },
  completed: { label: "Completed", color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.25)",  dot: "#94a3b8" },
  cancelled: { label: "Cancelled", color: "#f87171", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.25)",    dot: "#f87171" },
};

const REG_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; Icon: React.FC<{ className?: string }> }> = {
  pending:    { label: "Awaiting Approval", color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.28)", Icon: Clock      },
  registered: { label: "Approved",          color: "#4ade80", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.28)",  Icon: CheckCircle2 },
  rejected:   { label: "Rejected",          color: "#f87171", bg: "rgba(239,68,68,0.09)",  border: "rgba(239,68,68,0.25)",  Icon: XCircle      },
  winner:     { label: "Winner",            color: "#fbbf24", bg: "rgba(251,191,36,0.14)", border: "rgba(251,191,36,0.40)", Icon: Trophy       },
};

/* ── StatusPill ── */
function StatusPill({ status }: { status: TournamentStatus }) {
  const cfg = STATUS_CFG[status];
  const pulse = status === "ongoing";
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <span className={`h-1.5 w-1.5 rounded-full inline-block shrink-0 ${pulse ? "animate-pulse" : ""}`}
        style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

/* ── RegStatusPill ── */
function RegStatusPill({ status }: { status: string }) {
  const cfg = REG_STATUS_CFG[status] ?? {
    label: status, color: "#94a3b8", bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.22)", Icon: Shield,
  };
  const { Icon } = cfg;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <Icon className="h-2.5 w-2.5 shrink-0" />
      {cfg.label}
    </span>
  );
}

/* ── Section header between status groups ── */
function GroupHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-2">
      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
        {label}
      </span>
      <span className="h-px flex-1" style={{ background: `${color}30` }} />
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
        {count}
      </span>
    </div>
  );
}

/* ── Hosted Tournament Card ── */
function HostedCard({ tournament }: { tournament: Tournament }) {
  const TIcon = TYPE_ICON[tournament.tournamentType];
  const color = TYPE_COLOR[tournament.tournamentType];
  const pendingCount = tournament.registrations.filter((r) => r.status === "pending").length;
  const approvedCount = tournament.registrations.filter((r) => r.status === "registered" || r.status === "winner").length;
  const winnerCount = tournament.registrations.filter((r) => r.status === "winner").length;
  const pct = Math.min(100, (approvedCount / tournament.maxPlayers) * 100);
  const scfg = STATUS_CFG[tournament.status];

  return (
    <div className="group flex flex-col gap-0 hover:bg-white/[0.018] transition-colors duration-150">
      {/* Top accent */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg,transparent,${color}60,transparent)` }} />

      <div className="flex items-start gap-3.5 p-4 sm:p-5">
        {/* Icon */}
        <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${color}12`, border: `1.5px solid ${color}35` }}>
          <TIcon className="h-5 w-5" style={{ color }} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title + status */}
          <div className="flex items-start gap-2 flex-wrap">
            <Link href={`/tournaments/${tournament.id}`}
              className="text-[15px] font-bold text-white leading-tight hover:text-primary transition-colors truncate max-w-[220px] sm:max-w-none">
              {tournament.title}
            </Link>
            <StatusPill status={tournament.status} />
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse"
                style={{ background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.40)", color: "#fbbf24" }}>
                <Bell className="h-2.5 w-2.5" /> {pendingCount} request{pendingCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Game + type */}
          <p className="text-[11px] text-muted-foreground/55">
            {tournament.gameName} · {tournament.platform} · <span style={{ color: `${color}bb` }}>{TYPE_LABEL[tournament.tournamentType]}</span>
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-extrabold text-yellow-400">${tournament.prizePool.toLocaleString()}</span>
            <span className="text-[11px] text-muted-foreground/45 flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span className="font-semibold text-white/60">{approvedCount}</span>
              <span>/ {tournament.maxPlayers}</span>
            </span>
            {tournament.country !== "any" && COUNTRY_MAP[tournament.country] && (
              <span className="text-[10px] font-semibold text-amber-400/70 flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" /> {COUNTRY_MAP[tournament.country].flag}
              </span>
            )}
            {tournament.region !== "any" && tournament.region && (
              <span className="text-[10px] text-muted-foreground/40">{REGION_MAP[tournament.region]?.label ?? tournament.region}</span>
            )}
            <span className="text-[10px] text-muted-foreground/30">
              {formatDistanceToNow(new Date(tournament.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Player progress bar */}
          {tournament.status !== "cancelled" && (
            <div className="space-y-1">
              <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color}99,${color})` }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {tournament.status === "open" && (
              <>
                {pendingCount > 0 ? (
                  <Button asChild size="sm" className="h-7 text-[11px] font-bold px-3"
                    style={{ background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.40)", color: "#fbbf24" }}>
                    <Link href={`/tournaments/${tournament.id}`}>
                      <Bell className="h-3 w-3 mr-1" /> Review Requests
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline" className="h-7 text-[11px] font-semibold px-3 border-white/10 text-white/60 hover:text-white">
                    <Link href={`/tournaments/${tournament.id}`}>
                      <Eye className="h-3 w-3 mr-1" /> Manage
                    </Link>
                  </Button>
                )}
                <span className="text-[10px] text-muted-foreground/35">
                  {tournament.slotsLeft > 0 ? `${tournament.slotsLeft} slot${tournament.slotsLeft !== 1 ? "s" : ""} left` : "Full"}
                </span>
              </>
            )}
            {tournament.status === "ongoing" && (
              <Button asChild size="sm" className="h-7 text-[11px] font-bold px-3"
                style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.2),rgba(251,191,36,0.1))", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24" }}>
                <Link href={`/tournaments/${tournament.id}`}>
                  <Play className="h-3 w-3 mr-1" /> Manage Live
                </Link>
              </Button>
            )}
            {tournament.status === "completed" && (
              <>
                <Button asChild size="sm" variant="outline" className="h-7 text-[11px] font-semibold px-3 border-white/10 text-white/55 hover:text-white">
                  <Link href={`/tournaments/${tournament.id}`}>
                    <Star className="h-3 w-3 mr-1" /> View Results
                  </Link>
                </Button>
                {winnerCount > 0 && (
                  <span className="text-[10px] font-semibold text-yellow-400/70">
                    {winnerCount} winner{winnerCount !== 1 ? "s" : ""} crowned
                  </span>
                )}
              </>
            )}
            {tournament.status === "cancelled" && (
              <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Tournament cancelled
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Joined Tournament Card ── */
function JoinedCard({ tournament, registration }: { tournament: Tournament; registration: { status: string; joinedAt: string } }) {
  const TIcon = TYPE_ICON[tournament.tournamentType];
  const color = TYPE_COLOR[tournament.tournamentType];
  const regStatus = registration.status;
  const scfg = STATUS_CFG[tournament.status];

  const myReg = tournament.registrations.find((r) => r.status === regStatus && r.prizeWon != null);
  const prizeWon = tournament.registrations.find((r) => r.status === "winner")?.prizeWon ?? null;

  return (
    <div className="group flex flex-col hover:bg-white/[0.018] transition-colors duration-150">
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg,transparent,${color}50,transparent)` }} />

      <div className="flex items-start gap-3.5 p-4 sm:p-5">
        {/* Icon */}
        <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${color}12`, border: `1.5px solid ${color}35` }}>
          <TIcon className="h-5 w-5" style={{ color }} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title + status */}
          <div className="flex items-start gap-2 flex-wrap">
            <Link href={`/tournaments/${tournament.id}`}
              className="text-[15px] font-bold text-white leading-tight hover:text-primary transition-colors truncate max-w-[200px] sm:max-w-none">
              {tournament.title}
            </Link>
            <StatusPill status={tournament.status} />
            <RegStatusPill status={regStatus} />
          </div>

          {/* Game + host */}
          <p className="text-[11px] text-muted-foreground/55">
            {tournament.gameName} · hosted by <span className="text-white/60 font-semibold">{tournament.hostName}</span>
          </p>

          {/* Stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-extrabold text-yellow-400">${tournament.prizePool.toLocaleString()} pool</span>
            {regStatus === "winner" && prizeWon != null && (
              <span className="text-[11px] font-black text-green-400">+${prizeWon.toFixed(2)} won</span>
            )}
            <span className="text-[10px] text-muted-foreground/30">
              Applied {formatDistanceToNow(new Date(registration.joinedAt), { addSuffix: true })}
            </span>
          </div>

          {/* Contextual message */}
          {(regStatus === "pending" || regStatus === "rejected") && (
            <div className="flex items-center gap-1.5 text-[10px]"
              style={{ color: regStatus === "pending" ? "#fbbf24cc" : "#f87171bb" }}>
              {regStatus === "pending" ? (
                <><Clock className="h-3 w-3 shrink-0" /> The host will review your request</>
              ) : (
                <><XCircle className="h-3 w-3 shrink-0" /> Your request wasn't approved for this one</>
              )}
            </div>
          )}
          {regStatus === "registered" && tournament.status === "open" && (
            <div className="flex items-center gap-1.5 text-[10px] text-green-400/80">
              <CheckCircle2 className="h-3 w-3 shrink-0" /> You're in — wait for the host to start
            </div>
          )}
          {regStatus === "registered" && tournament.status === "ongoing" && (
            <div className="flex items-center gap-1.5 text-[10px] text-yellow-400/80">
              <Zap className="h-3 w-3 shrink-0 animate-pulse" /> Tournament is live — compete now!
            </div>
          )}
          {regStatus === "winner" && (
            <div className="flex items-center gap-1.5 text-[10px] text-yellow-400/90 font-bold">
              <Trophy className="h-3 w-3 shrink-0" /> You won this tournament!
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <Button asChild size="sm" variant="outline"
              className="h-7 text-[11px] font-semibold px-3 border-white/10 text-white/55 hover:text-white hover:border-white/20">
              <Link href={`/tournaments/${tournament.id}`}>
                <Eye className="h-3 w-3 mr-1" />
                {tournament.status === "ongoing" ? "View Live" : "View Details"}
              </Link>
            </Button>
            {regStatus === "registered" && tournament.status === "ongoing" && (
              <Button asChild size="sm" className="h-7 text-[11px] font-bold px-3"
                style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.25),rgba(251,191,36,0.12))", border: "1px solid rgba(251,191,36,0.40)", color: "#fbbf24" }}>
                <Link href={`/tournaments/${tournament.id}`}>
                  <Play className="h-3 w-3 mr-1" /> Join Now
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Status group order ── */
const STATUS_ORDER: TournamentStatus[] = ["ongoing", "open", "completed", "cancelled"];

const GROUP_CFG: Record<TournamentStatus, { label: string; color: string }> = {
  ongoing:   { label: "Live Now",   color: "#fbbf24" },
  open:      { label: "Accepting Players", color: "#4ade80" },
  completed: { label: "Completed",  color: "#64748b" },
  cancelled: { label: "Cancelled",  color: "#f87171" },
};

/* ── Empty state ── */
function EmptyState({ tab }: { tab: "hosted" | "joined" }) {
  return (
    <div className="py-14 flex flex-col items-center gap-4 text-center">
      <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(172,181,255,0.08)", border: "1.5px solid rgba(172,181,255,0.18)" }}>
        {tab === "hosted" ? <Trophy className="h-7 w-7 text-yellow-400/40" /> : <UserCheck className="h-7 w-7 text-primary/40" />}
      </div>
      <div>
        <p className="text-[15px] font-bold text-white/50">
          {tab === "hosted" ? "No tournaments hosted yet" : "No tournaments joined yet"}
        </p>
        <p className="text-[12px] text-muted-foreground/35 mt-1">
          {tab === "hosted"
            ? "Host a tournament, set a prize pool, and crown a champion."
            : "Browse open tournaments and request to join one that matches your profile."}
        </p>
      </div>
      <Button asChild size="sm" className="font-bold text-xs px-5 h-8"
        style={tab === "hosted"
          ? { background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#000" }
          : { background: "linear-gradient(135deg,#ACB5FF,#8090cc)", color: "#fff" }}>
        <Link href="/tournaments">
          {tab === "hosted" ? <><Plus className="h-3.5 w-3.5 mr-1.5" /> Host a Tournament</> : <><Zap className="h-3.5 w-3.5 mr-1.5" /> Browse Tournaments</>}
        </Link>
      </Button>
    </div>
  );
}

/* ── Main Page ── */
export default function MyTournamentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"hosted" | "joined">("hosted");

  const { data, isLoading, isError } = useQuery<MyTournamentsData>({
    queryKey: ["my-tournaments"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/tournaments/my`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load your tournaments");
      return r.json();
    },
    enabled: !!user,
    refetchInterval: 20_000,
  });

  const hostedCount = data?.hosted.length ?? 0;
  const joinedCount = data?.joined.length ?? 0;

  /* Group by status */
  const groupHosted = (list: Tournament[]) => {
    const groups: Partial<Record<TournamentStatus, Tournament[]>> = {};
    for (const t of list) {
      if (!groups[t.status]) groups[t.status] = [];
      groups[t.status]!.push(t);
    }
    return groups;
  };

  const groupJoined = (list: MyTournamentsData["joined"]) => {
    const groups: Partial<Record<TournamentStatus, typeof list>> = {};
    for (const item of list) {
      const s = item.tournament.status;
      if (!groups[s]) groups[s] = [];
      groups[s]!.push(item);
    }
    return groups;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 55% 25% at 50% 0%,rgba(172,181,255,0.07) 0%,transparent 55%)" }} />

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <h1 className="text-[22px] font-black text-white tracking-tight">My Tournaments</h1>
          </div>
          <p className="text-[12px] text-muted-foreground/45">Track your hosted and joined events</p>
        </div>
        <Button asChild size="sm" className="font-bold text-xs h-8 px-4"
          style={{ background: "linear-gradient(135deg,rgba(172,181,255,0.20),rgba(172,181,255,0.10))", border: "1px solid rgba(172,181,255,0.35)", color: "#ACB5FF" }}>
          <Link href="/tournaments"><Zap className="h-3.5 w-3.5 mr-1.5" /> Browse All</Link>
        </Button>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {(["hosted", "joined"] as const).map((t) => {
          const active = tab === t;
          const count = t === "hosted" ? hostedCount : joinedCount;
          const Icon = t === "hosted" ? Shield : UserCheck;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-200"
              style={active ? {
                background: "linear-gradient(135deg,rgba(172,181,255,0.22),rgba(172,181,255,0.10))",
                border: "1px solid rgba(172,181,255,0.40)",
                color: "#ACB5FF",
                boxShadow: "0 0 20px rgba(172,181,255,0.12)",
              } : {
                background: "transparent",
                border: "1px solid transparent",
                color: "rgba(255,255,255,0.38)",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="capitalize">{t}</span>
              {!isLoading && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full ml-0.5"
                  style={active ? {
                    background: "rgba(172,181,255,0.30)",
                    border: "1px solid rgba(172,181,255,0.40)",
                    color: "#d8b4fe",
                  } : {
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "rgba(255,255,255,0.35)",
                  }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary/40" />
          <span className="text-[13px] text-muted-foreground/40">Loading your tournaments…</span>
        </div>
      ) : isError ? (
        <div className="py-14 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-red-400/30 mx-auto" />
          <p className="text-[13px] text-muted-foreground/50">Something went wrong. Please try again.</p>
        </div>
      ) : tab === "hosted" ? (
        /* ── Hosted tab ── */
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(8,4,18,0.94)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 8px 40px rgba(0,0,0,0.45)" }}>
          {!data?.hosted.length ? (
            <EmptyState tab="hosted" />
          ) : (() => {
            const groups = groupHosted(data.hosted);
            return (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {STATUS_ORDER.map((status) => {
                  const group = groups[status];
                  if (!group?.length) return null;
                  const gcfg = GROUP_CFG[status];
                  return (
                    <div key={status}>
                      <GroupHeader label={gcfg.label} count={group.length} color={gcfg.color} />
                      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        {group.map((t) => <HostedCard key={t.id} tournament={t} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : (
        /* ── Joined tab ── */
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(8,4,18,0.94)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 8px 40px rgba(0,0,0,0.45)" }}>
          {!data?.joined.length ? (
            <EmptyState tab="joined" />
          ) : (() => {
            const groups = groupJoined(data.joined);
            return (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {STATUS_ORDER.map((status) => {
                  const group = groups[status];
                  if (!group?.length) return null;
                  const gcfg = GROUP_CFG[status];
                  return (
                    <div key={status}>
                      <GroupHeader label={gcfg.label} count={group.length} color={gcfg.color} />
                      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        {group.map(({ tournament, registration }) => (
                          <JoinedCard key={tournament.id} tournament={tournament} registration={registration} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Stat footer ── */}
      {!isLoading && !isError && data && (
        <div className="flex items-center justify-center gap-6 py-1">
          {[
            { label: "Hosted", value: hostedCount, color: "#ACB5FF" },
            { label: "Joined", value: joinedCount, color: "#8EC1DE" },
            {
              label: "Wins",
              value: data.joined.filter(({ registration }) => registration.status === "winner").length,
              color: "#fbbf24",
            },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-0.5">
              <span className="text-[18px] font-black" style={{ color: stat.color }}>{stat.value}</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/35">{stat.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
