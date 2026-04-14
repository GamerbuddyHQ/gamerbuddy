import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  Trophy, Swords, Users, Crown, Plus, X, Zap, ChevronDown, ChevronUp,
  Gamepad2, Loader2, DollarSign, Info, AlertTriangle, CheckCircle2,
  Flame, Clock, Filter, Star, Shield, Lock, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

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
  entryFee: number;
  rules: string;
  prizeDistribution: { first: number; second: number; third: number; custom: boolean };
  status: TournamentStatus;
  platformFee: number;
  netPrize: number;
  winnersData: { userId: number; placement: number; prizeWon: number; userName: string }[] | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  slotsLeft: number;
  registrations: Registration[];
};

/* ── Config ── */
const TYPE_CONFIG: Record<TournamentType, { label: string; desc: string; icon: React.FC<{ className?: string }>; color: string; maxPlayers: number }> = {
  h2h:   { label: "Head-to-Head", desc: "1v1 duel — winner takes all",       icon: Swords,  color: "#f87171", maxPlayers: 2  },
  squad: { label: "Squad Battle",  desc: "4-player team clash",                icon: Users,   color: "#a855f7", maxPlayers: 4  },
  ffa:   { label: "Free-for-All",  desc: "Up to 16-player battle royale",      icon: Crown,   color: "#fbbf24", maxPlayers: 16 },
};

const STATUS_CONFIG: Record<TournamentStatus, { label: string; color: string; bg: string; border: string }> = {
  open:      { label: "Open",      color: "#4ade80", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.35)"   },
  ongoing:   { label: "Ongoing",   color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.40)"  },
  completed: { label: "Completed", color: "#94a3b8", bg: "rgba(148,163,184,0.10)",border: "rgba(148,163,184,0.28)" },
  cancelled: { label: "Cancelled", color: "#f87171", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.28)"   },
};

const DIST_PRESETS = [
  { key: "winner",  label: "Winner Takes All", first: 100, second: 0,  third: 0  },
  { key: "top2",    label: "Top 2 Split",       first: 70,  second: 30, third: 0  },
  { key: "top3",    label: "Top 3 Split",       first: 60,  second: 30, third: 10 },
  { key: "custom",  label: "Custom",            first: 0,   second: 0,  third: 0  },
];

const PLATFORMS = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile", "Cross-Platform"];

/* ── API helpers ── */
const fetchTournaments = async (): Promise<Tournament[]> => {
  const r = await fetch(`${BASE}/tournaments`, { credentials: "include" });
  if (!r.ok) throw new Error("Failed to load tournaments");
  return r.json();
};

/* ── Reusable Avatar ── */
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const letter = name?.charAt(0).toUpperCase() ?? "?";
  const hue = (name?.charCodeAt(0) ?? 0) * 47 % 360;
  return (
    <div
      className="rounded-full flex items-center justify-center font-extrabold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${hue},60%,40%)` }}
    >
      {letter}
    </div>
  );
}

/* ── Prize pool display ── */
function PrizeTag({ amount, size = "md" }: { amount: number; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "text-2xl px-4 py-2" : size === "md" ? "text-base px-3 py-1.5" : "text-sm px-2.5 py-1";
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-black rounded-xl ${cls}`}
      style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.20),rgba(251,191,36,0.10))", border: "1px solid rgba(251,191,36,0.50)", color: "#fbbf24", boxShadow: "0 0 16px rgba(251,191,36,0.18)" }}
    >
      <Trophy className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
      ${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
    </span>
  );
}

/* ── Status pill ── */
function StatusPill({ status }: { status: TournamentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

/* ── Tournament card ── */
function TournamentCard({ tournament, currentUserId }: { tournament: Tournament; currentUserId?: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const tcfg = TYPE_CONFIG[tournament.tournamentType];
  const TypeIcon = tcfg.icon;

  const isHost = currentUserId === tournament.hostId;
  const isRegistered = tournament.registrations.some((r) => r.userId === currentUserId);
  const pct = Math.min(100, (tournament.currentPlayers / tournament.maxPlayers) * 100);

  const joinMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/tournaments/${tournament.id}/join`, { method: "POST", credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to join");
      return data;
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["tournaments"] }); toast({ title: data.message }); },
    onError: (e: Error) => toast({ title: "Cannot join", description: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/tournaments/${tournament.id}`, { method: "DELETE", credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to cancel");
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tournaments"] }); toast({ title: "Tournament cancelled — funds refunded" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const netPrize = tournament.netPrize;
  const dist = tournament.prizeDistribution;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-200 hover:border-white/[0.12]"
      style={{
        background: "rgba(10,5,20,0.94)",
        borderColor: tournament.status === "open" ? "rgba(168,85,247,0.30)" : "rgba(255,255,255,0.07)",
        boxShadow: tournament.status === "open" ? "0 0 30px rgba(168,85,247,0.08), 0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.4)",
        borderLeft: `3px solid ${tcfg.color}55`,
      }}
    >
      {/* ── Prize header bar ── */}
      <div
        className="px-5 py-3 flex items-center justify-between gap-3"
        style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.07) 0%,rgba(0,0,0,0.3) 100%)", borderBottom: "1px solid rgba(251,191,36,0.12)" }}
      >
        <PrizeTag amount={tournament.prizePool} />
        <div className="flex items-center gap-2">
          <StatusPill status={tournament.status} />
          {tournament.entryFee > 0 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.35)", color: "#c084fc" }}
            >
              ${tournament.entryFee} entry
            </span>
          )}
          {tournament.entryFee === 0 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.28)", color: "#4ade80" }}
            >
              Free Entry
            </span>
          )}
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Type icon */}
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `${tcfg.color}18`, border: `1px solid ${tcfg.color}45` }}
          >
            <TypeIcon className="h-6 w-6" style={{ color: tcfg.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[16px] font-extrabold text-white leading-tight">{tournament.title}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[12px] font-semibold text-primary/80">{tournament.gameName}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-[11px] text-muted-foreground/55 flex items-center gap-1">
                    <Gamepad2 className="h-3 w-3" />{tournament.platform}
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-[11px] font-semibold" style={{ color: tcfg.color }}>{tcfg.label}</span>
                </div>
              </div>
            </div>

            {/* Slots progress bar */}
            <div className="mt-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground/50 font-medium">Players</span>
                <span className="text-[11px] font-bold text-white/70">{tournament.currentPlayers} / {tournament.maxPlayers}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 100
                      ? "linear-gradient(90deg,#f87171,#ef4444)"
                      : pct > 60
                      ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                      : "linear-gradient(90deg,#a855f7,#7c3aed)",
                  }}
                />
              </div>
              {tournament.status === "open" && tournament.slotsLeft > 0 && (
                <p className="text-[10px] text-muted-foreground/40 mt-1">
                  {tournament.slotsLeft} slot{tournament.slotsLeft !== 1 ? "s" : ""} remaining
                </p>
              )}
            </div>

            {/* Prize distribution */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {dist.first > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1" style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.28)", color: "#fbbf24" }}>
                  <Crown className="h-2.5 w-2.5" />1st — ${(netPrize * dist.first / 100).toFixed(0)}
                </span>
              )}
              {dist.second > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: "rgba(148,163,184,0.10)", border: "1px solid rgba(148,163,184,0.25)", color: "#94a3b8" }}>
                  2nd — ${(netPrize * dist.second / 100).toFixed(0)}
                </span>
              )}
              {dist.third > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: "rgba(180,83,9,0.10)", border: "1px solid rgba(180,83,9,0.28)", color: "#c2813a" }}>
                  3rd — ${(netPrize * dist.third / 100).toFixed(0)}
                </span>
              )}
              <span className="text-[9px] text-muted-foreground/35">
                (after 10% platform fee)
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Avatar name={tournament.hostName} size={18} />
                <span className="text-[11px] text-muted-foreground/55">by <span className="font-semibold text-white/65">{tournament.hostName}</span></span>
              </div>
              <span className="text-[10px] text-muted-foreground/35">
                {formatDistanceToNow(new Date(tournament.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* ── Action row ── */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {tournament.status === "open" && !isHost && !isRegistered && currentUserId && (
            <Button
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="font-bold"
              style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 0 16px rgba(168,85,247,0.28)" }}
            >
              {joinMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Joining…</>
                : <><Zap className="h-4 w-4 mr-1.5" />Join Tournament{tournament.entryFee > 0 ? ` — $${tournament.entryFee}` : " (Free)"}</>
              }
            </Button>
          )}

          {isRegistered && (
            <span className="text-[12px] font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.30)", color: "#4ade80" }}>
              <CheckCircle2 className="h-4 w-4" /> You're In!
            </span>
          )}

          {isHost && tournament.status !== "completed" && tournament.status !== "cancelled" && (
            <Link href={`/tournaments/${tournament.id}/manage`}>
              <Button variant="outline" size="sm" className="font-semibold border-primary/40 text-primary hover:bg-primary/10">
                <Shield className="h-3.5 w-3.5 mr-1.5" /> Manage
              </Button>
            </Link>
          )}

          {isHost && tournament.status === "open" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="font-semibold border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              {cancelMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5 mr-1" />}
              Cancel
            </Button>
          )}

          {!currentUserId && tournament.status === "open" && (
            <Link href="/login">
              <Button variant="outline" className="font-semibold border-primary/40 text-primary hover:bg-primary/10">
                Log in to join
              </Button>
            </Link>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold transition-all duration-150 active:scale-95 rounded-lg px-2.5 py-1"
            style={expanded
              ? { background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.30)", color: "#c084fc" }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }
            }
          >
            <Users className="h-3.5 w-3.5" />
            <span>Details</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div
          className="border-t px-5 py-4 space-y-4"
          style={{ borderColor: "rgba(168,85,247,0.12)", background: "rgba(0,0,0,0.25)" }}
        >
          {/* Rules */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1.5">Rules / Objectives</p>
            <p className="text-[13px] text-muted-foreground/70 leading-relaxed whitespace-pre-wrap">{tournament.rules}</p>
          </div>

          {/* Participants */}
          {tournament.registrations.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">
                Participants ({tournament.registrations.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {tournament.registrations.map((r) => (
                  <div
                    key={r.userId}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                    style={r.placement === 1
                      ? { background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.60)" }
                    }
                  >
                    {r.placement === 1 && <Crown className="h-3 w-3" />}
                    {r.placement === 2 && <Star className="h-3 w-3" />}
                    <Avatar name={r.userName} size={16} />
                    {r.userName}
                    {r.prizeWon != null && r.prizeWon > 0 && (
                      <span className="text-[10px] text-emerald-400 font-bold">+${r.prizeWon.toFixed(2)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Winners */}
          {tournament.winnersData && tournament.winnersData.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.20)" }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400/60 mb-3">
                Tournament Results
              </p>
              <div className="space-y-2">
                {tournament.winnersData.sort((a, b) => a.placement - b.placement).map((w) => (
                  <div key={w.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px]">{w.placement === 1 ? "🥇" : w.placement === 2 ? "🥈" : "🥉"}</span>
                      <span className="text-[12px] font-bold text-white/80">{w.userName}</span>
                    </div>
                    <span className="text-[12px] font-extrabold text-yellow-400">+${w.prizeWon.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
  const [entryFee, setEntryFee] = useState("0");
  const [rules, setRules] = useState("");
  const [distPreset, setDistPreset] = useState("winner");
  const [customFirst, setCustomFirst] = useState(60);
  const [customSecond, setCustomSecond] = useState(30);
  const [customThird, setCustomThird] = useState(10);

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
          maxPlayers, prizePool: prize, entryFee: parseFloat(entryFee) || 0,
          rules, prizeDistribution: JSON.stringify(dist),
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

  const canSubmit = title.trim() && gameName.trim() && rules.trim() && prize >= 100 && prize <= 10000 && Math.abs(distTotal - 100) <= 0.5 && !createMutation.isPending;

  const typeMax = TYPE_MAX_PLAYERS[tournamentType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border"
        style={{
          background: "rgba(8,4,18,0.98)",
          borderColor: "rgba(168,85,247,0.40)",
          boxShadow: "0 0 60px rgba(168,85,247,0.20), 0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: "rgba(8,4,18,0.98)", borderColor: "rgba(168,85,247,0.20)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.30),rgba(168,85,247,0.12))", border: "1px solid rgba(168,85,247,0.50)" }}
            >
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-[16px] font-extrabold text-white">Host a Tournament</h2>
              <p className="text-[11px] text-muted-foreground/50">Create your own tournament and crown the champion!</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center border border-border/50 text-muted-foreground hover:text-white hover:border-border transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* ── Basic Info ── */}
          <section>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-3">Basic Info</label>
            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tournament title (e.g. Weekend Valorant Showdown)"
                maxLength={80}
                className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60 transition-all"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Game name"
                  maxLength={60}
                  className="rounded-xl px-3.5 py-2.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60 transition-all"
                />
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="rounded-xl px-3.5 py-2.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground focus:border-primary/60 transition-all"
                >
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* ── Tournament Type ── */}
          <section>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-3">Tournament Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(["h2h", "squad", "ffa"] as TournamentType[]).map((type) => {
                const cfg = TYPE_CONFIG[type];
                const TypeIcon = cfg.icon;
                const active = tournamentType === type;
                return (
                  <button
                    key={type}
                    onClick={() => { setTournamentType(type); setMaxPlayers(type === "ffa" ? 8 : cfg.maxPlayers); }}
                    className="flex flex-col items-center gap-2 rounded-xl py-4 px-3 transition-all duration-150 active:scale-95"
                    style={active ? {
                      background: `${cfg.color}18`,
                      border: `1.5px solid ${cfg.color}55`,
                      boxShadow: `0 0 16px ${cfg.color}18`,
                    } : {
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
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
          {tournamentType === "ffa" && (
            <section>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-2">
                Number of Players (FFA: 2–16)
              </label>
              <input
                type="number"
                min={2} max={16}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Math.max(2, Math.min(16, parseInt(e.target.value) || 2)))}
                className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground focus:border-primary/60 transition-all"
              />
            </section>
          )}

          {tournamentType !== "ffa" && (
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12px]"
              style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.20)", color: "rgba(168,85,247,0.80)" }}
            >
              <Info className="h-3.5 w-3.5 shrink-0" />
              {tournamentType === "h2h" ? "Head-to-Head is exactly 2 players." : "Squad Battle is exactly 4 players."}
            </div>
          )}

          {/* ── Prize Pool ── */}
          <section>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-2">Prize Pool ($100 – $10,000)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 font-bold">$</span>
              <input
                type="number"
                min={100} max={10000}
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                placeholder="500"
                className="w-full rounded-xl pl-7 pr-3.5 py-2.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground focus:border-primary/60 transition-all"
              />
            </div>
            {prize >= 100 && (
              <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground/50">
                <span>Platform fee (10%): <span className="text-red-400/70 font-semibold">−${platformFeeEst.toFixed(2)}</span></span>
                <span className="text-muted-foreground/30">·</span>
                <span>Net prize pool: <span className="text-emerald-400/80 font-bold">${netPrizeEst.toFixed(2)}</span></span>
              </div>
            )}
          </section>

          {/* ── Entry Fee ── */}
          <section>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-2">Entry Fee per Player (0 = free)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 font-bold">$</span>
              <input
                type="number"
                min={0}
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl pl-7 pr-3.5 py-2.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground focus:border-primary/60 transition-all"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-1.5">Entry fees are added to the prize pool when distributed.</p>
          </section>

          {/* ── Prize Distribution ── */}
          <section>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-2">Prize Distribution</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {DIST_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setDistPreset(p.key)}
                  className="py-2 px-3 rounded-lg text-[11px] font-bold transition-all duration-150 active:scale-95"
                  style={distPreset === p.key ? {
                    background: "rgba(168,85,247,0.20)",
                    border: "1px solid rgba(168,85,247,0.50)",
                    color: "#c084fc",
                  } : {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.40)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {distPreset === "custom" ? (
              <div className="space-y-2">
                {[
                  { label: "🥇 1st Place %", val: customFirst, set: setCustomFirst },
                  { label: "🥈 2nd Place %", val: customSecond, set: setCustomSecond },
                  { label: "🥉 3rd Place %", val: customThird, set: setCustomThird },
                ].map(({ label, val, set }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-[12px] w-28 shrink-0 text-muted-foreground/60">{label}</span>
                    <input
                      type="number"
                      min={0} max={100}
                      value={val}
                      onChange={(e) => set(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="flex-1 rounded-lg px-3 py-1.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground focus:border-primary/60 transition-all"
                    />
                    <span className="text-[12px] text-muted-foreground/50 w-4">%</span>
                  </div>
                ))}
                <div className={`text-[11px] font-bold ${Math.abs(distTotal - 100) > 0.5 ? "text-red-400" : "text-emerald-400"}`}>
                  Total: {distTotal}% {Math.abs(distTotal - 100) > 0.5 ? "(must equal 100%)" : "✓"}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {dist.first > 0 && <span className="text-[11px] font-bold px-2.5 py-1 rounded-md" style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.28)", color: "#fbbf24" }}>🥇 {dist.first}%</span>}
                {dist.second > 0 && <span className="text-[11px] font-bold px-2.5 py-1 rounded-md" style={{ background: "rgba(148,163,184,0.10)", border: "1px solid rgba(148,163,184,0.25)", color: "#94a3b8" }}>🥈 {dist.second}%</span>}
                {dist.third > 0 && <span className="text-[11px] font-bold px-2.5 py-1 rounded-md" style={{ background: "rgba(180,83,9,0.10)", border: "1px solid rgba(180,83,9,0.28)", color: "#c2813a" }}>🥉 {dist.third}%</span>}
              </div>
            )}
          </section>

          {/* ── Rules ── */}
          <section>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-2">Rules / Objectives</label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Describe the rules, format, how winners are determined, and any special conditions…"
              rows={4}
              maxLength={1500}
              className="w-full rounded-xl px-3.5 py-2.5 text-[13px] resize-none outline-none bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60 transition-all"
            />
            <div className="flex justify-end mt-1">
              <span className="text-[10px] text-muted-foreground/30">{rules.length}/1500</span>
            </div>
          </section>

          {/* ── Wallet notice ── */}
          <div
            className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-[12px]"
            style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.22)", color: "rgba(251,191,36,0.75)" }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              The prize pool of <strong>${prize > 0 ? prize.toFixed(2) : "—"}</strong> will be immediately deducted from your Hiring Wallet and held in escrow. You can cancel to get a full refund before the tournament fills up.
            </span>
          </div>

          {/* ── Submit ── */}
          <Button
            className="w-full font-extrabold text-[14px] py-3 h-auto"
            disabled={!canSubmit}
            onClick={() => createMutation.mutate()}
            style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 0 24px rgba(168,85,247,0.35)" }}
          >
            {createMutation.isPending
              ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Creating Tournament…</>
              : <><Trophy className="h-5 w-5 mr-2" />Host This Tournament — Lock in ${prize > 0 ? prize.toFixed(0) : "0"} Prize Pool</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Filter bar ── */
type FilterStatus = "all" | TournamentStatus;

/* ── Main Page ── */
export default function TournamentsPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  const { data: tournaments = [], isLoading, isError } = useQuery({
    queryKey: ["tournaments"],
    queryFn: fetchTournaments,
    refetchInterval: 15_000,
  });

  const filtered = tournaments.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.gameName.toLowerCase().includes(q) || t.hostName.toLowerCase().includes(q);
    }
    return true;
  });

  const openCount = tournaments.filter((t) => t.status === "open").length;
  const ongoingCount = tournaments.filter((t) => t.status === "ongoing").length;

  const FILTERS: { value: FilterStatus; label: string; count?: number }[] = [
    { value: "all",       label: "All",       count: tournaments.length },
    { value: "open",      label: "Open",      count: openCount },
    { value: "ongoing",   label: "Live",       count: ongoingCount },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Bg glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%,rgba(251,191,36,0.06) 0%,transparent 60%)" }}
      />

      {/* ── Hero header ── */}
      <div
        className="rounded-3xl p-6 sm:p-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg,rgba(168,85,247,0.12) 0%,rgba(251,191,36,0.08) 50%,rgba(0,0,0,0.5) 100%)",
          border: "1px solid rgba(168,85,247,0.25)",
          boxShadow: "0 0 50px rgba(168,85,247,0.10)",
        }}
      >
        {/* Trophy bg watermark */}
        <Trophy className="absolute -right-4 -top-4 h-32 w-32 text-yellow-400/05" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full"
                style={{ background: "rgba(251,191,36,0.14)", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24" }}
              >
                Tournaments
              </span>
              {ongoingCount > 0 && (
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse"
                  style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.45)", color: "#f87171" }}
                >
                  {ongoingCount} Live
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none" style={{ letterSpacing: "-0.02em" }}>
              <span className="text-yellow-400">TOURNAMENTS</span>
            </h1>
            <p className="text-muted-foreground/70 mt-2 text-sm leading-relaxed max-w-xs">
              Create your own tournament and crown the champion. Compete for real prize pools.
            </p>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" /> {openCount} open now
              </span>
              <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> Prize pools from $100
              </span>
              <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> 10% platform fee
              </span>
            </div>
          </div>

          <div className="shrink-0">
            {user ? (
              <Button
                onClick={() => setShowForm(true)}
                className="font-extrabold whitespace-nowrap"
                style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#000", boxShadow: "0 0 20px rgba(251,191,36,0.35)" }}
              >
                <Trophy className="h-4 w-4 mr-1.5" /> Host Tournament
              </Button>
            ) : (
              <Button asChild variant="outline" className="font-bold border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 whitespace-nowrap">
                <Link href="/login">Log in to host</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by game, title, or host…"
          className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] outline-none bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60 transition-all"
        />
        <div
          className="flex items-center p-1 gap-1 rounded-xl shrink-0"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {FILTERS.map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all duration-150 active:scale-95 whitespace-nowrap"
              style={filter === value ? {
                background: "linear-gradient(135deg,rgba(168,85,247,0.28),rgba(168,85,247,0.18))",
                border: "1px solid rgba(168,85,247,0.55)",
                color: "#c084fc",
              } : {
                color: "rgba(255,255,255,0.40)",
                border: "1px solid transparent",
              }}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span
                  className="text-[9px] font-black px-1 rounded-full"
                  style={filter === value
                    ? { background: "rgba(168,85,247,0.35)", color: "#e9d5ff" }
                    : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }
                  }
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Feed ── */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/20 h-48 animate-pulse" style={{ background: "rgba(255,255,255,0.02)" }} />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-500/25 p-10 text-center" style={{ background: "rgba(239,68,68,0.05)" }}>
          <p className="text-red-400 font-bold">Failed to load tournaments</p>
          <p className="text-sm text-muted-foreground/50 mt-1">Check your connection and try refreshing.</p>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div
          className="rounded-2xl border p-12 flex flex-col items-center gap-4 text-center"
          style={{ borderColor: "rgba(251,191,36,0.15)", background: "rgba(251,191,36,0.03)" }}
        >
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.28)" }}>
            <Trophy className="h-8 w-8 text-yellow-400/60" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white/70">
              {search ? "No tournaments match your search" : filter === "all" ? "No tournaments yet" : `No ${filter} tournaments`}
            </p>
            <p className="text-[12px] text-muted-foreground/45 mt-1">
              {filter === "all" && !search ? "Be the first to host one and crown the champion!" : "Try a different filter or search."}
            </p>
          </div>
          {user && filter === "all" && !search && (
            <Button
              onClick={() => setShowForm(true)}
              style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#000" }}
              className="font-bold"
            >
              <Trophy className="h-4 w-4 mr-1.5" /> Host the First Tournament
            </Button>
          )}
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((t) => (
            <TournamentCard key={t.id} tournament={t} currentUserId={user?.id} />
          ))}
        </div>
      )}

      {/* ── Create form modal ── */}
      {showForm && (
        <CreateTournamentForm
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

const TYPE_MAX_PLAYERS: Record<TournamentType, number> = { h2h: 2, squad: 4, ffa: 16 };
