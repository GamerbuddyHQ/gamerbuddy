import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import {
  Trophy, Swords, Users, Crown, ArrowLeft, Gamepad2, Loader2,
  AlertTriangle, CheckCircle2, Shield, Lock, Globe, Clock,
  Star, X, ChevronRight, Zap, Flame,
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
  winnersData: { userId: number; placement: number; prizeWon: number; userName: string }[] | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  slotsLeft: number;
  registrations: Registration[];
};

/* ── Config ── */
const TYPE_CONFIG: Record<TournamentType, { label: string; desc: string; icon: React.FC<{ className?: string }>; color: string }> = {
  h2h:   { label: "Head-to-Head", desc: "1v1 bracket",        icon: Swords, color: "#f87171" },
  squad: { label: "Squad Battle",  desc: "Team-based clash",   icon: Users,  color: "#a855f7" },
  ffa:   { label: "Free-for-All",  desc: "Battle royale",      icon: Crown,  color: "#fbbf24" },
};

const STATUS_CONFIG: Record<TournamentStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  open:      { label: "Open for Registration", color: "#4ade80", bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.35)",    dot: "#4ade80" },
  ongoing:   { label: "In Progress",           color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.40)",   dot: "#fbbf24" },
  completed: { label: "Completed",             color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.28)",  dot: "#94a3b8" },
  cancelled: { label: "Cancelled",             color: "#f87171", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.28)",    dot: "#f87171" },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ── Helpers ── */
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

function PlacementEmoji({ p }: { p: number | null }) {
  if (p === 1) return <span className="text-base">🥇</span>;
  if (p === 2) return <span className="text-base">🥈</span>;
  if (p === 3) return <span className="text-base">🥉</span>;
  return null;
}

function DistBar({ first, second, third, net }: { first: number; second: number; third: number; net: number }) {
  const rest = Math.max(0, 100 - first - second - third);
  const fmt = (pct: number) => net > 0 ? `$${Math.round(net * pct / 100).toLocaleString()}` : `${pct}%`;
  return (
    <div className="space-y-2">
      <div className="flex h-6 rounded-xl overflow-hidden w-full gap-px">
        {first > 0 && (
          <div className="flex items-center justify-center text-[10px] font-extrabold text-black/80 transition-all"
            style={{ width: `${first}%`, background: "linear-gradient(90deg,#fbbf24,#f59e0b)" }}>
            {first > 10 ? "🥇" : ""}
          </div>
        )}
        {second > 0 && (
          <div className="flex items-center justify-center text-[10px] font-extrabold text-black/70 transition-all"
            style={{ width: `${second}%`, background: "linear-gradient(90deg,#94a3b8,#64748b)" }}>
            {second > 10 ? "🥈" : ""}
          </div>
        )}
        {third > 0 && (
          <div className="flex items-center justify-center text-[10px] font-extrabold text-black/70 transition-all"
            style={{ width: `${third}%`, background: "linear-gradient(90deg,#c2813a,#a16207)" }}>
            {third > 10 ? "🥉" : ""}
          </div>
        )}
        {rest > 0 && (
          <div style={{ width: `${rest}%`, background: "rgba(255,255,255,0.05)" }} />
        )}
      </div>
      <div className="flex gap-4 flex-wrap">
        {first > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">🥇</span>
            <div>
              <p className="text-[13px] font-extrabold" style={{ color: "#fbbf24" }}>{fmt(first)}</p>
              <p className="text-[10px] text-muted-foreground/40">{first}% of net</p>
            </div>
          </div>
        )}
        {second > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">🥈</span>
            <div>
              <p className="text-[13px] font-extrabold" style={{ color: "#94a3b8" }}>{fmt(second)}</p>
              <p className="text-[10px] text-muted-foreground/40">{second}% of net</p>
            </div>
          </div>
        )}
        {third > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">🥉</span>
            <div>
              <p className="text-[13px] font-extrabold" style={{ color: "#c2813a" }}>{fmt(third)}</p>
              <p className="text-[10px] text-muted-foreground/40">{third}% of net</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Declare Winners Modal ── */
function DeclareWinnersModal({
  tournament,
  onClose,
  onDone,
}: {
  tournament: Tournament;
  onClose: () => void;
  onDone: (result: { netPool: number; winners: { userName: string; placement: number; prizeWon: number }[] }) => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [placements, setPlacements] = useState<Record<number, number>>({});

  /* ── Math ── */
  const dist = tournament.prizeDistribution;
  const maxPlacements = [dist.first > 0 ? 1 : 0, dist.second > 0 ? 2 : 0, dist.third > 0 ? 3 : 0].filter(Boolean);

  const prizePool   = tournament.prizePool;
  const entryFees   = round2(tournament.registrations.reduce((s, r) => s + (r.entryFeePaid ?? 0), 0));
  const totalPool   = round2(prizePool + entryFees);
  const platformFee = round2(totalPool * 0.1);
  const netPool     = round2(totalPool - platformFee);

  const prizeByPlace: Record<number, number> = {
    1: round2(netPool * dist.first  / 100),
    2: round2(netPool * dist.second / 100),
    3: round2(netPool * dist.third  / 100),
  };

  const placementColors: Record<number, string>  = { 1: "#fbbf24", 2: "#94a3b8", 3: "#c2813a" };
  const placementEmojis: Record<number, string>  = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const placementLabels: Record<number, string>  = { 1: "1st Place", 2: "2nd Place", 3: "3rd Place" };
  const placementPercent: Record<number, number> = { 1: dist.first, 2: dist.second, 3: dist.third };

  const assignPlacement = (userId: number, placement: number) => {
    setPlacements((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (next[Number(k)] === placement) delete next[Number(k)]; });
      if (next[userId] === placement) { delete next[userId]; } else { next[userId] = placement; }
      return next;
    });
  };

  const readyWinners = Object.entries(placements).map(([uid, placement]) => ({
    userId: Number(uid), placement,
  }));
  const canSubmit = readyWinners.length > 0 && readyWinners.length === maxPlacements.length;

  const assignedPreviews = readyWinners
    .map((w) => {
      const reg = tournament.registrations.find((r) => r.userId === w.userId);
      return { ...w, userName: reg?.userName ?? "Unknown", prize: prizeByPlace[w.placement] ?? 0 };
    })
    .sort((a, b) => a.placement - b.placement);

  const declareMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/tournaments/${tournament.id}/declare-winners`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ winners: readyWinners }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to declare winners");
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tournament", tournament.id] });
      qc.invalidateQueries({ queryKey: ["tournaments"] });
      onDone({ netPool: data.netPool, winners: data.winners });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const participants = tournament.registrations;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border"
        style={{
          background: "rgba(8,4,18,0.98)",
          borderColor: "rgba(168,85,247,0.40)",
          boxShadow: "0 0 60px rgba(168,85,247,0.20), 0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b"
          style={{ background: "rgba(8,4,18,0.98)", borderColor: "rgba(168,85,247,0.20)" }}
        >
          <div>
            <h2 className="text-[15px] font-extrabold text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              Declare Winners & Distribute Prizes
            </h2>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              Review the full calculation, then assign placements to distribute automatically
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center border border-border/50 text-muted-foreground hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* ── Section 1: Math breakdown ── */}
          <div
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="px-4 py-2.5 border-b"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                Prize Pool Calculation
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {/* Prize pool */}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-muted-foreground/65">Prize pool (escrowed)</span>
                <span className="text-[14px] font-bold text-white/85">${prizePool.toFixed(2)}</span>
              </div>
              {/* Entry fees */}
              {entryFees > 0 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] text-muted-foreground/65">
                    Entry fees ({participants.length} × ${tournament.entryFee.toFixed(2)})
                  </span>
                  <span className="text-[14px] font-bold text-emerald-400">+${entryFees.toFixed(2)}</span>
                </div>
              )}
              {/* Total pool */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <span className="text-[13px] font-semibold text-white/70">Total pool</span>
                <span className="text-[14px] font-extrabold text-white">${totalPool.toFixed(2)}</span>
              </div>
              {/* Platform fee */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-[13px] text-muted-foreground/65">Platform fee</span>
                  <span
                    className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
                  >
                    10%
                  </span>
                </div>
                <span className="text-[14px] font-bold text-red-400">−${platformFee.toFixed(2)}</span>
              </div>
              {/* Net pool — highlighted */}
              <div
                className="flex items-center justify-between px-4 py-4"
                style={{ background: "linear-gradient(90deg,rgba(34,197,94,0.07),rgba(34,197,94,0.03))" }}
              >
                <div>
                  <p className="text-[13px] font-extrabold text-emerald-400">Net prize pool</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">distributed to winners</p>
                </div>
                <span className="text-[22px] font-black text-emerald-400">${netPool.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* ── Section 2: Distribution breakdown per placement ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">
              Distribution per Placement
            </p>
            {/* Visual bar */}
            <div className="flex h-5 rounded-xl overflow-hidden w-full gap-px mb-3">
              {maxPlacements.map((place) => (
                <div
                  key={place}
                  className="flex items-center justify-center text-[9px] font-extrabold text-black/80 transition-all"
                  style={{
                    width: `${placementPercent[place]}%`,
                    background: place === 1
                      ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                      : place === 2
                      ? "linear-gradient(90deg,#94a3b8,#64748b)"
                      : "linear-gradient(90deg,#c2813a,#a16207)",
                  }}
                >
                  {placementPercent[place] > 12 ? placementEmojis[place] : ""}
                </div>
              ))}
            </div>
            {/* Cards */}
            <div className={`grid gap-2 ${maxPlacements.length === 1 ? "grid-cols-1" : maxPlacements.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {maxPlacements.map((place) => (
                <div
                  key={place}
                  className="rounded-xl p-3.5 space-y-1"
                  style={{
                    background: `${placementColors[place]}10`,
                    border: `1px solid ${placementColors[place]}35`,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{placementEmojis[place]}</span>
                    <span className="text-[10px] font-bold" style={{ color: placementColors[place] }}>
                      {placementLabels[place]}
                    </span>
                  </div>
                  <p className="text-[19px] font-black leading-none" style={{ color: placementColors[place] }}>
                    ${prizeByPlace[place].toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px]" style={{ color: `${placementColors[place]}90` }}>
                    {placementPercent[place]}% of ${netPool.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 3: Assign placements ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2.5">
              Assign Placements — {participants.length} Participant{participants.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {participants.map((p) => {
                const assigned = placements[p.userId];
                const prize = assigned ? prizeByPlace[assigned] : null;
                return (
                  <div
                    key={p.userId}
                    className="flex items-center gap-3 rounded-xl p-3 transition-all duration-150"
                    style={assigned ? {
                      background: `${placementColors[assigned]}0D`,
                      border: `1px solid ${placementColors[assigned]}40`,
                    } : {
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Avatar name={p.userName} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white/85 truncate">{p.userName}</p>
                      {assigned && prize != null ? (
                        <p className="text-[11px] font-extrabold mt-0.5" style={{ color: placementColors[assigned] }}>
                          {placementEmojis[assigned]} {placementLabels[assigned]} · +${prize.toFixed(2)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/35 mt-0.5">no placement assigned</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {maxPlacements.map((place) => {
                        const isAssigned = placements[p.userId] === place;
                        const takenByOther = Object.entries(placements).some(
                          ([uid, pl]) => pl === place && Number(uid) !== p.userId,
                        );
                        return (
                          <button
                            key={place}
                            onClick={() => assignPlacement(p.userId, place)}
                            disabled={takenByOther}
                            title={takenByOther ? "Already assigned" : `Assign ${placementLabels[place]}`}
                            className="w-9 h-9 rounded-lg text-[17px] transition-all duration-120 active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed"
                            style={isAssigned ? {
                              background: `${placementColors[place]}30`,
                              border: `2px solid ${placementColors[place]}80`,
                              boxShadow: `0 0 10px ${placementColors[place]}28`,
                            } : {
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.10)",
                            }}
                          >
                            {placementEmojis[place]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress hint */}
            {readyWinners.length < maxPlacements.length && (
              <p className="text-[11px] text-muted-foreground/40 text-center mt-2.5">
                {maxPlacements.length - readyWinners.length} placement{maxPlacements.length - readyWinners.length !== 1 ? "s" : ""} remaining before you can confirm
              </p>
            )}
          </div>

          {/* ── Section 4: Confirmation summary (shown when ready) ── */}
          {canSubmit && (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                background: "linear-gradient(135deg,rgba(34,197,94,0.08),rgba(34,197,94,0.03))",
                borderColor: "rgba(34,197,94,0.35)",
              }}
            >
              <div
                className="px-4 py-2.5 border-b flex items-center gap-2"
                style={{ borderColor: "rgba(34,197,94,0.20)", background: "rgba(34,197,94,0.06)" }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">
                  Ready to distribute — confirm payouts
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(34,197,94,0.12)" }}>
                {assignedPreviews.map((w) => (
                  <div key={w.userId} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl">{placementEmojis[w.placement]}</span>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-white/90">{w.userName}</p>
                      <p className="text-[10px] text-muted-foreground/45">{placementLabels[w.placement]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-extrabold text-emerald-400">+${w.prize.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground/35">to Earnings Wallet</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(34,197,94,0.04)" }}>
                  <span className="text-[12px] font-bold text-emerald-400/70">Total distributed</span>
                  <span className="text-[15px] font-extrabold text-emerald-400">
                    ${assignedPreviews.reduce((s, w) => s + w.prize, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Submit ── */}
          <Button
            className="w-full font-extrabold text-[14px] py-3.5 h-auto"
            disabled={!canSubmit || declareMutation.isPending}
            onClick={() => declareMutation.mutate()}
            style={canSubmit ? {
              background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
              color: "#000",
              boxShadow: "0 0 24px rgba(251,191,36,0.30)",
            } : {
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.30)",
            }}
          >
            {declareMutation.isPending
              ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Distributing Prizes…</>
              : canSubmit
              ? <><Trophy className="h-5 w-5 mr-2" />Confirm & Distribute ${netPool.toFixed(2)}</>
              : <>Assign all placements to continue</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Prize Distribution Success Banner ── */
function PrizeSuccessBanner({
  netPool,
  winners,
  onDismiss,
}: {
  netPool: number;
  winners: { userName: string; placement: number; prizeWon: number }[];
  onDismiss: () => void;
}) {
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden mb-6"
      style={{
        background: "linear-gradient(135deg,rgba(34,197,94,0.14),rgba(34,197,94,0.06))",
        border: "1.5px solid rgba(34,197,94,0.45)",
        boxShadow: "0 0 40px rgba(34,197,94,0.12)",
      }}
    >
      <button onClick={onDismiss} className="absolute top-3 right-3 text-emerald-400/50 hover:text-emerald-400 transition-colors">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(34,197,94,0.20)", border: "1px solid rgba(34,197,94,0.40)" }}
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-extrabold text-emerald-400">Prizes have been automatically distributed!</p>
          <p className="text-[12px] text-emerald-400/70 mt-0.5">
            ${netPool.toFixed(2)} net prize pool sent directly to winners' Earnings Wallets.
          </p>
          <div className="flex gap-4 flex-wrap mt-3">
            {winners
              .sort((a, b) => a.placement - b.placement)
              .map((w) => {
                const emoji = w.placement === 1 ? "🥇" : w.placement === 2 ? "🥈" : "🥉";
                return (
                  <div key={w.placement} className="flex items-center gap-1.5">
                    <span>{emoji}</span>
                    <span className="text-[12px] font-bold text-white/80">{w.userName}</span>
                    <span className="text-[12px] font-extrabold text-emerald-400">+${w.prizeWon.toFixed(2)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Detail Page ── */
export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showDeclare, setShowDeclare] = useState(false);
  const [prizeResult, setPrizeResult] = useState<{ netPool: number; winners: { userName: string; placement: number; prizeWon: number }[] } | null>(null);

  const { data: tournament, isLoading, isError } = useQuery<Tournament>({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const r = await fetch(`${BASE}/tournaments/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error("Tournament not found");
      return r.json();
    },
    enabled: !isNaN(id) && id > 0,
    refetchInterval: 10_000,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/tournaments/${id}/join`, { method: "POST", credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to join");
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tournament", id] });
      qc.invalidateQueries({ queryKey: ["tournaments"] });
      toast({ title: data.message });
    },
    onError: (e: Error) => toast({ title: "Cannot join", description: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/tournaments/${id}`, { method: "DELETE", credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to cancel");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tournament", id] });
      qc.invalidateQueries({ queryKey: ["tournaments"] });
      toast({ title: "Tournament cancelled — funds refunded to your Hiring Wallet" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-white/[0.04]" />
        <div className="h-56 rounded-3xl bg-white/[0.03] border border-border/10" />
        <div className="h-40 rounded-2xl bg-white/[0.02] border border-border/10" />
        <div className="h-64 rounded-2xl bg-white/[0.02] border border-border/10" />
      </div>
    );
  }

  if (isError || !tournament) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Trophy className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" strokeWidth={1} />
        <p className="text-[16px] font-bold text-white/60">Tournament not found</p>
        <p className="text-sm text-muted-foreground/40 mt-1">It may have been removed or the link is incorrect.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/tournaments">← Back to Tournaments</Link>
        </Button>
      </div>
    );
  }

  const tcfg = TYPE_CONFIG[tournament.tournamentType];
  const scfg = STATUS_CONFIG[tournament.status];
  const TypeIcon = tcfg.icon;
  const pct = Math.min(100, (tournament.currentPlayers / tournament.maxPlayers) * 100);
  const isHost = user?.id === tournament.hostId;
  const isRegistered = tournament.registrations.some((r) => r.userId === user?.id);
  const isFull = tournament.currentPlayers >= tournament.maxPlayers;
  const dist = tournament.prizeDistribution;

  const canJoin = !isHost && !isRegistered && user && tournament.status === "open" && !isFull;
  const canDeclare = isHost && (tournament.status === "ongoing" || tournament.status === "open") && tournament.registrations.length > 0;
  const canCancel = isHost && tournament.status !== "completed" && tournament.status !== "cancelled";

  const winners = tournament.winnersData ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 50% 30% at 50% 0%,rgba(168,85,247,0.08) 0%,transparent 60%)" }}
      />

      {/* Back link */}
      <Link href="/tournaments" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground/50 hover:text-white/70 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Tournaments
      </Link>

      {/* Prize distributed success banner */}
      {prizeResult && (
        <PrizeSuccessBanner
          netPool={prizeResult.netPool}
          winners={prizeResult.winners}
          onDismiss={() => setPrizeResult(null)}
        />
      )}

      {/* ── Hero header ── */}
      <div
        className="rounded-3xl overflow-hidden border"
        style={{
          background: "rgba(10,5,20,0.95)",
          borderColor: tournament.status === "open" ? "rgba(168,85,247,0.30)" : "rgba(255,255,255,0.08)",
          boxShadow: tournament.status === "open" ? "0 0 50px rgba(168,85,247,0.10)" : "0 8px 40px rgba(0,0,0,0.5)",
          borderLeft: `4px solid ${tcfg.color}`,
        }}
      >
        {/* Prize header bar */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3 flex-wrap"
          style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.09),rgba(0,0,0,0.3))", borderBottom: "1px solid rgba(251,191,36,0.14)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-2xl flex items-center justify-center"
              style={{ background: `${tcfg.color}18`, border: `1.5px solid ${tcfg.color}55` }}
            >
              <TypeIcon className="h-6 w-6" style={{ color: tcfg.color }} />
            </div>
            <div>
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-full"
                style={{ background: scfg.bg, border: `1px solid ${scfg.border}`, color: scfg.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: scfg.dot }} />
                {scfg.label}
                {tournament.status === "ongoing" && <Flame className="h-3 w-3 animate-pulse" />}
              </span>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: tcfg.color }}>{tcfg.label}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] text-muted-foreground/40 uppercase tracking-widest">Prize Pool</p>
            <p className="text-3xl font-black text-yellow-400 leading-none">
              ${tournament.prizePool.toLocaleString()}
            </p>
            {tournament.entryFee > 0 && (
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">${tournament.entryFee} entry fee</p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <h1 className="text-[22px] sm:text-[26px] font-black text-white leading-tight">{tournament.title}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[13px] font-bold text-primary/80">{tournament.gameName}</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[12px] text-muted-foreground/55 flex items-center gap-1">
                <Gamepad2 className="h-3.5 w-3.5" />{tournament.platform}
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[11px] text-muted-foreground/50">
                Hosted by <span className="text-white/65 font-semibold">{tournament.hostName}</span>
              </span>
              <span className="text-[10px] text-muted-foreground/35">
                · {formatDistanceToNow(new Date(tournament.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Net Prize",     value: `$${tournament.netPrize.toFixed(2)}`,  color: "#4ade80" },
              { label: "Platform Fee",  value: `$${tournament.platformFee.toFixed(2)}`,color: "#f87171" },
              { label: "Entry Fee",     value: tournament.entryFee > 0 ? `$${tournament.entryFee}` : "Free", color: "#c084fc" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl px-3.5 py-3 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">{label}</p>
                <p className="text-[15px] font-extrabold mt-0.5" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Slots progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-muted-foreground/60 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Players
              </span>
              <span className="text-[14px] font-extrabold" style={{ color: pct >= 100 ? "#f87171" : pct > 60 ? "#fbbf24" : "#a855f7" }}>
                {tournament.currentPlayers} / {tournament.maxPlayers}
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
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
            <div className="flex items-center justify-between mt-1.5">
              {tournament.status === "open" && tournament.slotsLeft > 0 ? (
                <p className="text-[11px] text-muted-foreground/45">{tournament.slotsLeft} slot{tournament.slotsLeft !== 1 ? "s" : ""} remaining</p>
              ) : isFull ? (
                <p className="text-[11px] font-bold text-red-400/70">All slots filled</p>
              ) : <span />}
              {tournament.startedAt && (
                <p className="text-[10px] text-muted-foreground/35">
                  Started {formatDistanceToNow(new Date(tournament.startedAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-2 flex-wrap">
            {canJoin && (
              <Button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                className="flex-1 font-extrabold text-[14px] py-3 h-auto"
                style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 0 24px rgba(168,85,247,0.35)" }}
              >
                {joinMutation.isPending
                  ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Joining…</>
                  : <><Zap className="h-5 w-5 mr-2" />Join Tournament{tournament.entryFee > 0 ? ` — $${tournament.entryFee} entry` : " — Free"}</>
                }
              </Button>
            )}

            {!user && tournament.status === "open" && (
              <Button asChild className="flex-1 font-bold py-3 h-auto" style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}>
                <Link href="/login">Log in to Join</Link>
              </Button>
            )}

            {isRegistered && tournament.status !== "completed" && (
              <div
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold"
                style={{ background: "rgba(34,197,94,0.10)", border: "1.5px solid rgba(34,197,94,0.30)", color: "#4ade80" }}
              >
                <CheckCircle2 className="h-4 w-4" /> You're Registered
              </div>
            )}

            {isFull && !isRegistered && !isHost && tournament.status === "open" && (
              <div
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.28)", color: "#f87171" }}
              >
                <Lock className="h-4 w-4" /> Tournament Full
              </div>
            )}

            {canDeclare && (
              <Button
                onClick={() => setShowDeclare(true)}
                className="font-bold"
                style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#000" }}
              >
                <Crown className="h-4 w-4 mr-1.5" /> Declare Winners
              </Button>
            )}

            {canCancel && (
              <Button
                variant="outline"
                onClick={() => { if (confirm("Cancel this tournament and refund all funds?")) cancelMutation.mutate(); }}
                disabled={cancelMutation.isPending}
                className="text-red-400 border-red-500/30 hover:bg-red-500/10 font-semibold"
              >
                {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Prize Distribution ── */}
      <div
        className="rounded-2xl p-5 border"
        style={{ background: "rgba(10,5,20,0.90)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-4">Prize Distribution</p>
        <DistBar first={dist.first} second={dist.second} third={dist.third} net={tournament.netPrize} />
      </div>

      {/* ── Winners (completed) ── */}
      {tournament.status === "completed" && winners.length > 0 && (
        <div
          className="rounded-2xl p-5 border relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg,rgba(251,191,36,0.08),rgba(10,5,20,0.95))",
            borderColor: "rgba(251,191,36,0.30)",
            boxShadow: "0 0 40px rgba(251,191,36,0.08)",
          }}
        >
          <Trophy className="absolute -right-4 -bottom-4 h-28 w-28 text-yellow-400/04" />
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400/60 mb-4">Champions</p>
          <div className="space-y-3">
            {[...winners].sort((a, b) => a.placement - b.placement).map((w) => (
              <div key={w.placement} className="flex items-center gap-3">
                <span className="text-2xl">
                  {w.placement === 1 ? "🥇" : w.placement === 2 ? "🥈" : "🥉"}
                </span>
                <Avatar name={w.userName} size={36} />
                <div className="flex-1">
                  <p className="text-[14px] font-bold text-white">{w.userName}</p>
                  <p className="text-[11px] text-muted-foreground/50">
                    {w.placement === 1 ? "1st" : w.placement === 2 ? "2nd" : "3rd"} Place
                  </p>
                </div>
                <span className="text-[16px] font-extrabold text-yellow-400">
                  +${w.prizeWon.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          {tournament.completedAt && (
            <p className="text-[10px] text-muted-foreground/35 mt-4">
              Completed {format(new Date(tournament.completedAt), "PPP")}
            </p>
          )}
        </div>
      )}

      {/* ── Rules ── */}
      <div
        className="rounded-2xl p-5 border"
        style={{ background: "rgba(10,5,20,0.90)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">Rules & Objectives</p>
        <p className="text-[13px] text-muted-foreground/75 whitespace-pre-wrap leading-relaxed">{tournament.rules}</p>
      </div>

      {/* ── Participants ── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "rgba(10,5,20,0.90)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
            <Users className="h-3.5 w-3.5" /> Participants
          </p>
          <span className="text-[12px] font-bold text-white/50">
            {tournament.currentPlayers}/{tournament.maxPlayers}
          </span>
        </div>

        {tournament.registrations.length === 0 ? (
          <div className="py-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground/40">No participants yet — be the first to join!</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {tournament.registrations.map((reg, idx) => {
              const winnerData = winners.find((w) => w.userId === reg.userId);
              return (
                <div key={reg.userId} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.015] transition-colors">
                  <span className="text-[11px] text-muted-foreground/30 w-5 text-right">{idx + 1}</span>
                  <Avatar name={reg.userName} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-white/85 truncate">{reg.userName}</span>
                      {winnerData && <PlacementEmoji p={winnerData.placement} />}
                    </div>
                    <p className="text-[10px] text-muted-foreground/35">
                      Joined {formatDistanceToNow(new Date(reg.joinedAt), { addSuffix: true })}
                    </p>
                  </div>
                  {winnerData && winnerData.prizeWon > 0 && (
                    <span className="text-[13px] font-extrabold text-yellow-400">
                      +${winnerData.prizeWon.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Declare Winners Modal ── */}
      {showDeclare && (
        <DeclareWinnersModal
          tournament={tournament}
          onClose={() => setShowDeclare(false)}
          onDone={(result) => { setShowDeclare(false); setPrizeResult(result); }}
        />
      )}
    </div>
  );
}
