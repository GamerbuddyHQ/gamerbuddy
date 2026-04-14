import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  Trophy, Shield, Users, Clock, CheckCircle2, X, Loader2,
  AlertTriangle, Swords, Crown, ArrowRight, MapPin, UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { COUNTRY_MAP, REGION_MAP, GENDER_MAP } from "@/lib/geo-options";

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
const TYPE_ICON: Record<TournamentType, React.FC<{ className?: string }>> = { h2h: Swords, squad: Users, ffa: Crown };
const TYPE_COLOR: Record<TournamentType, string> = { h2h: "#f87171", squad: "#a855f7", ffa: "#fbbf24" };
const TYPE_LABEL: Record<TournamentType, string> = { h2h: "Head-to-Head", squad: "Squad", ffa: "Free-for-All" };

const STATUS_CFG: Record<TournamentStatus, { label: string; color: string; bg: string; border: string }> = {
  open:      { label: "Open",      color: "#4ade80", bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.30)"   },
  ongoing:   { label: "Ongoing",   color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)"  },
  completed: { label: "Completed", color: "#94a3b8", bg: "rgba(148,163,184,0.10)",border: "rgba(148,163,184,0.25)" },
  cancelled: { label: "Cancelled", color: "#f87171", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.25)"   },
};

const REG_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:    { label: "Pending Approval", color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.28)" },
  registered: { label: "Approved",         color: "#4ade80", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.28)"  },
  rejected:   { label: "Rejected",         color: "#f87171", bg: "rgba(239,68,68,0.09)",  border: "rgba(239,68,68,0.25)"  },
  winner:     { label: "Winner 🏆",        color: "#fbbf24", bg: "rgba(251,191,36,0.14)", border: "rgba(251,191,36,0.40)" },
};

/* ── Helpers ── */
function StatusPill({ status }: { status: TournamentStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function RegStatusPill({ status }: { status: string }) {
  const cfg = REG_STATUS_CFG[status] ?? { label: status, color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.22)" };
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function TournamentRow({ tournament, trailing }: { tournament: Tournament; trailing?: React.ReactNode }) {
  const TIcon = TYPE_ICON[tournament.tournamentType];
  const color = TYPE_COLOR[tournament.tournamentType];
  const pendingCount = tournament.registrations.filter((r) => r.status === "pending").length;
  const approvedCount = tournament.registrations.filter((r) => r.status === "registered" || r.status === "winner").length;

  return (
    <div className="flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors">
      {/* Icon */}
      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}15`, border: `1.5px solid ${color}40` }}>
        <TIcon className="h-4.5 w-4.5" style={{ color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/tournaments/${tournament.id}`} className="text-[14px] font-bold text-white/90 hover:text-primary truncate transition-colors">
            {tournament.title}
          </Link>
          <StatusPill status={tournament.status} />
        </div>
        <p className="text-[11px] text-muted-foreground/50 mt-0.5">
          {tournament.gameName} · {tournament.platform} · {TYPE_LABEL[tournament.tournamentType]}
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-yellow-400">${tournament.prizePool.toLocaleString()} pool</span>
          <span className="text-[11px] text-muted-foreground/40 flex items-center gap-1">
            <Users className="h-3 w-3" />{approvedCount}/{tournament.maxPlayers} approved
          </span>
          {pendingCount > 0 && (
            <span className="text-[11px] font-bold" style={{ color: "#fbbf24" }}>
              <Clock className="h-3 w-3 inline mr-0.5" />{pendingCount} pending
            </span>
          )}
          {/* Requirements */}
          {tournament.country !== "any" && (
            <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: "#fbbf24" }}>
              <MapPin className="h-2.5 w-2.5" />{COUNTRY_MAP[tournament.country]?.flag} {COUNTRY_MAP[tournament.country]?.label ?? tournament.country}
            </span>
          )}
          {tournament.region !== "any" && (
            <span className="text-[10px] font-semibold text-green-400/80">🌐 {REGION_MAP[tournament.region]?.label ?? tournament.region}</span>
          )}
          <span className="text-[10px] text-muted-foreground/30">{formatDistanceToNow(new Date(tournament.createdAt), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Trailing */}
      <div className="shrink-0 flex flex-col items-end gap-2">
        {trailing}
        <Link href={`/tournaments/${tournament.id}`}
          className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary font-semibold transition-colors">
          Manage <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function MyTournamentsPage() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery<MyTournamentsData>({
    queryKey: ["my-tournaments"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/tournaments/my`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load your tournaments");
      return r.json();
    },
    enabled: !!user,
    refetchInterval: 15_000,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 60% 30% at 50% 0%,rgba(168,85,247,0.07) 0%,transparent 60%)" }} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <h1 className="text-2xl font-black text-white tracking-tight">My Tournaments</h1>
          </div>
          <p className="text-[13px] text-muted-foreground/50">Tournaments you've hosted and joined</p>
        </div>
        <Button asChild variant="outline" size="sm" className="font-semibold border-primary/40 text-primary/80 hover:bg-primary/10">
          <Link href="/tournaments">Browse All</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
          <span className="text-muted-foreground/50 text-sm">Loading your tournaments…</span>
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <AlertTriangle className="h-8 w-8 text-red-400/40 mx-auto mb-2" />
          <p className="text-muted-foreground/60">Failed to load. Please try again.</p>
        </div>
      ) : (
        <>
          {/* ── Tournaments I Hosted ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary/70" />
              <h2 className="text-[13px] font-black uppercase tracking-widest text-muted-foreground/50">
                Tournaments I Hosted
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.28)", color: "#c084fc" }}>
                {data?.hosted.length ?? 0}
              </span>
            </div>

            <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(10,5,20,0.92)", borderColor: "rgba(255,255,255,0.08)" }}>
              {!data?.hosted.length ? (
                <div className="py-12 text-center space-y-3">
                  <Trophy className="h-12 w-12 text-muted-foreground/15 mx-auto" />
                  <div>
                    <p className="text-white/50 font-semibold">No tournaments hosted yet</p>
                    <p className="text-muted-foreground/40 text-sm mt-1">Create your first tournament and crown a champion</p>
                  </div>
                  <Button asChild size="sm" className="font-bold mt-2" style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#000" }}>
                    <Link href="/tournaments">Host a Tournament</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {data.hosted.map((t) => {
                    const pendingCount = t.registrations.filter((r) => r.status === "pending").length;
                    return (
                      <TournamentRow key={t.id} tournament={t} trailing={
                        pendingCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse"
                            style={{ background: "rgba(251,191,36,0.20)", border: "1px solid rgba(251,191,36,0.45)", color: "#fbbf24" }}>
                            <Clock className="h-2.5 w-2.5" /> {pendingCount} Request{pendingCount !== 1 ? "s" : ""}
                          </span>
                        ) : undefined
                      } />
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ── Tournaments I Joined ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="h-4 w-4 text-secondary/70" />
              <h2 className="text-[13px] font-black uppercase tracking-widest text-muted-foreground/50">
                Tournaments I Joined
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.28)", color: "#4ade80" }}>
                {data?.joined.length ?? 0}
              </span>
            </div>

            <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(10,5,20,0.92)", borderColor: "rgba(255,255,255,0.08)" }}>
              {!data?.joined.length ? (
                <div className="py-12 text-center space-y-3">
                  <UserCheck className="h-12 w-12 text-muted-foreground/15 mx-auto" />
                  <div>
                    <p className="text-white/50 font-semibold">Not joined any tournament yet</p>
                    <p className="text-muted-foreground/40 text-sm mt-1">Browse tournaments matching your profile and request to join</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="font-bold mt-2 border-primary/40 text-primary/80 hover:bg-primary/10">
                    <Link href="/tournaments">Browse Tournaments</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {data.joined.map(({ tournament: t, registration }) => (
                    <div key={t.id} className="flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors">
                      {/* Type icon */}
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${TYPE_COLOR[t.tournamentType]}15`, border: `1.5px solid ${TYPE_COLOR[t.tournamentType]}40` }}>
                        {React.createElement(TYPE_ICON[t.tournamentType], { className: "h-4 w-4", style: { color: TYPE_COLOR[t.tournamentType] } })}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/tournaments/${t.id}`} className="text-[14px] font-bold text-white/90 hover:text-primary truncate transition-colors">
                            {t.title}
                          </Link>
                          <StatusPill status={t.status} />
                        </div>
                        <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                          {t.gameName} · hosted by <span className="text-white/55 font-semibold">{t.hostName}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-yellow-400">${t.prizePool.toLocaleString()} pool</span>
                          {/* My registration status */}
                          <RegStatusPill status={registration.status} />
                          {registration.status === "winner" && (
                            <span className="text-[11px] font-bold text-yellow-400">
                              {t.registrations.find((r) => r.userId === undefined)?.prizeWon != null
                                ? `+$${t.registrations.find((r) => r.status === "winner")?.prizeWon?.toFixed(2)}` : ""}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground/30">{formatDistanceToNow(new Date(registration.joinedAt), { addSuffix: true })}</span>
                        </div>
                      </div>

                      {/* View link */}
                      <Link href={`/tournaments/${t.id}`}
                        className="shrink-0 flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary font-semibold transition-colors">
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
