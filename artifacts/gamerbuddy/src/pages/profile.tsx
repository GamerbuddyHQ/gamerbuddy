import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  useUserProfile, useUpdateProfile, useShopItems, usePurchaseItem,
  useMyQuestEntries, useAddQuestEntry, useDeleteQuestEntry, useVerifyId,
  useMyStreamingAccounts, useConnectStreaming, useDisconnectStreaming,
  useProfileVotes,
  STREAMING_PLATFORM_META,
  type ShopItem, type QuestEntry,
} from "@/lib/bids-api";
import { VerifiedBadge } from "@/components/verified-badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  User, Mail, Phone, Calendar, ShieldCheck, ShieldAlert, Clock,
  Star, Trophy, Swords, Edit3, Check, X, Palette, Tag,
  Sparkles, Lock, CheckCircle2, Plus, Trash2, Gamepad2,
  Zap, Target, ChevronDown, ChevronUp, Users,
} from "lucide-react";
import { TrustMeter, ReputationBadges, computeBadges } from "@/components/reputation-badges";
import { StreamingAccountsDisplay } from "@/components/streaming-accounts-display";

/* ── GAMER RULES CARD ───────────────────────────────────────── */
const GAMER_RULES = [
  {
    n: 1,
    title: "Be Friendly and Positive at All Times",
    body: "Use respectful, encouraging, and positive language. No toxicity, rage, sarcasm, or negative comments.",
    icon: "😊",
  },
  {
    n: 2,
    title: "Respect the Hirer's Objectives",
    body: "Always follow the exact objectives and instructions in the request. Do not skip or change them without the hirer's permission.",
    icon: "🎯",
  },
  {
    n: 3,
    title: "Never Ask for Account Passwords",
    body: "Never ask the hirer to share their Steam, Epic, PlayStation, Xbox, Nintendo, or any account password. This is strictly forbidden and will result in instant ban.",
    icon: "🔒",
    highlight: true,
  },
  {
    n: 4,
    title: "Maintain Professional Behavior",
    body: "No rude backseat gaming, no sharing personal information, no advertising other services, and no trying to move the session or payment off-platform.",
    icon: "🤝",
  },
  {
    n: 5,
    title: "Complete the Session Honestly",
    body: "Play for the agreed time and try your best to meet the objectives. Communicate honestly if you cannot deliver.",
    icon: "✅",
  },
  {
    n: 6,
    title: "Respect the Hirer's Comfort",
    body: "Make the hirer feel safe and comfortable. Adjust your playstyle if they ask for a more chill or slower pace.",
    icon: "🛡️",
  },
  {
    n: 7,
    title: "Ask About Voice Chat",
    body: "Always ask the hirer first if they want you to join Discord or use in-game VoIP. Do not assume or force voice chat. Respect their preference.",
    icon: "🎙️",
  },
  {
    n: 8,
    title: "Understand the 10% Platform Fee",
    body: "Gamerbuddy deducts a 10% platform fee from every completed Quest/Job. You keep 90% of your agreed price. This is clearly shown before every payment release. Do not try to move payments off-platform to avoid this fee — it results in an instant ban.",
    icon: "💸",
  },
];

function GamerRulesCard() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-amber-500/25 bg-card/40 overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-500/5 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white">Gamer Code of Conduct</div>
            <div className="text-xs text-muted-foreground mt-0.5">Rules for gamers who want to get hired</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70 hidden sm:block">
            {open ? "Collapse" : "Read Rules"}
          </span>
          {open
            ? <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground leading-relaxed pt-4">
            If you want to get hired on Gamerbuddy, you must strictly follow these rules. They keep the platform safe, friendly, and professional for everyone.
          </p>

          <div className="space-y-3">
            {GAMER_RULES.map((rule) => (
              <div
                key={rule.n}
                className={`flex gap-3 p-3 rounded-xl ${rule.highlight
                  ? "bg-red-500/8 border border-red-500/20"
                  : "bg-background/40 border border-border/40"}`}
              >
                <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${rule.highlight
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-primary/15 text-primary border border-primary/25"}`}
                  >
                    {rule.n}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-[13px]">{rule.icon}</span>
                    <span className={`text-xs font-bold ${rule.highlight ? "text-red-300" : "text-white"}`}>
                      {rule.title}
                    </span>
                    {rule.highlight && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-500/15 border border-red-500/25 px-1.5 py-0.5 rounded">
                        Instant Ban
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{rule.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Warning footer */}
          <div className="flex gap-3 p-3.5 rounded-xl bg-red-500/6 border border-red-500/25">
            <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-red-300 mb-0.5">Important Warning</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Breaking any of these rules will result in{" "}
                <span className="text-red-300 font-semibold">immediate account suspension</span>{" "}
                and loss of Trust Factor and earnings. We take this seriously to protect all users.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── STREAMING ACCOUNTS SECTION ─────────────────────────────── */
const PLATFORM_ORDER = ["twitch", "youtube", "kick", "facebook", "tiktok"] as const;

/* Official SVG logo paths (Simple Icons, 24×24 viewBox) */
const PLATFORM_SVG: Record<string, React.ReactNode> = {
  twitch: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  kick: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M3.392 2h4.386v7.731L13.875 2H19l-7.135 9.29L19.847 22H14.46l-6.682-9.384V22H3.392V2z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
};

function StreamingAccountsSection() {
  const { data: accounts = [], isLoading } = useMyStreamingAccounts();
  const connect = useConnectStreaming();
  const disconnect = useDisconnectStreaming();
  const { toast } = useToast();

  const [connecting, setConnecting] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState("");

  const connectedMap = Object.fromEntries(accounts.map((a) => [a.platform, a.username]));
  const connectedCount = accounts.length;

  async function handleConnect(platform: string) {
    const handle = inputVal.trim().replace(/^@/, "");
    if (!handle) return;
    try {
      await connect.mutateAsync({ platform, username: handle });
      toast({ title: `${STREAMING_PLATFORM_META[platform].label} connected!`, description: `@${handle}` });
      setConnecting(null);
      setInputVal("");
    } catch {
      toast({ title: "Failed to connect", description: "Please try again.", variant: "destructive" });
    }
  }

  async function handleDisconnect(platform: string) {
    try {
      await disconnect.mutateAsync(platform);
      toast({ title: `${STREAMING_PLATFORM_META[platform].label} disconnected` });
    } catch {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    }
  }

  return (
    <div
      id="streaming-management"
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(168,85,247,0.2)", background: "rgba(10,8,20,0.6)" }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Zap className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-extrabold text-white uppercase tracking-widest">Streaming Channels</span>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            Link your channels — they'll appear on your profile and bid cards
          </p>
        </div>
        {connectedCount > 0 && (
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span
              className="text-[11px] font-black px-3 py-1 rounded-full"
              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}
            >
              {connectedCount} / {PLATFORM_ORDER.length} Live
            </span>
          </div>
        )}
      </div>

      {/* ── Connected quick-links strip ─────────────────── */}
      {connectedCount > 0 && (
        <div className="px-5 py-3 flex flex-wrap gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
          {accounts.map((a) => {
            const meta = STREAMING_PLATFORM_META[a.platform];
            if (!meta) return null;
            return (
              <a
                key={a.platform}
                href={meta.urlTemplate.replace("{username}", a.username)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full text-[11px] font-bold transition-all hover:brightness-125 hover:scale-105"
                style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}
              >
                <span className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }}>
                  {PLATFORM_SVG[a.platform]}
                </span>
                <span>{meta.label}</span>
                <span className="opacity-60 font-mono text-[10px]">@{a.username}</span>
              </a>
            );
          })}
        </div>
      )}

      {/* ── Platform cards ──────────────────────────────── */}
      <div className="p-4 space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[72px] rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : (
          PLATFORM_ORDER.map((platform) => {
            const meta = STREAMING_PLATFORM_META[platform];
            const username = connectedMap[platform];
            const isConnected = !!username;
            const isThisConnecting = connecting === platform;

            return (
              <div key={platform}>
                <div
                  className="rounded-2xl overflow-hidden transition-all duration-200"
                  style={{
                    border: isConnected
                      ? `1px solid ${meta.border}`
                      : isThisConnecting
                        ? "1px solid rgba(255,255,255,0.12)"
                        : "1px solid rgba(255,255,255,0.06)",
                    background: isConnected
                      ? `linear-gradient(135deg, ${meta.bg}, rgba(0,0,0,0.4))`
                      : "rgba(255,255,255,0.03)",
                    boxShadow: isConnected ? `0 0 20px -8px ${meta.color}60` : "none",
                  }}
                >
                  <div className="flex items-center gap-0">
                    {/* Icon panel */}
                    <div
                      className="w-16 h-16 shrink-0 flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: isConnected
                          ? `linear-gradient(135deg, ${meta.color}30, ${meta.color}10)`
                          : "rgba(255,255,255,0.04)",
                        borderRight: `1px solid ${isConnected ? meta.border : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      {/* Glow blob behind icon */}
                      {isConnected && (
                        <div
                          className="absolute inset-0 opacity-30"
                          style={{ background: `radial-gradient(circle at center, ${meta.color}80 0%, transparent 70%)` }}
                        />
                      )}
                      <div
                        className="relative w-7 h-7"
                        style={{ color: isConnected ? meta.color : "rgba(255,255,255,0.2)" }}
                      >
                        {PLATFORM_SVG[platform]}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 px-4 py-3">
                      <div
                        className="text-sm font-extrabold leading-tight"
                        style={{ color: isConnected ? meta.color : "rgba(255,255,255,0.65)" }}
                      >
                        {meta.label}
                      </div>
                      {isConnected ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                            style={{ background: "#4ade80" }}
                          />
                          <a
                            href={meta.urlTemplate.replace("{username}", username)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono font-semibold hover:underline truncate"
                            style={{ color: "#86efac" }}
                          >
                            @{username}
                          </a>
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground/40 mt-0.5">
                          {isThisConnecting ? "Enter your username below ↓" : "Not connected"}
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="pr-3 shrink-0">
                      {isConnected ? (
                        <button
                          onClick={() => handleDisconnect(platform)}
                          disabled={disconnect.isPending}
                          className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-xl transition-all hover:bg-red-500/15 hover:text-red-300 disabled:opacity-40"
                          style={{ color: "rgba(248,113,113,0.6)", border: "1px solid rgba(248,113,113,0.18)" }}
                        >
                          {disconnect.isPending ? "···" : "Remove"}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setConnecting(isThisConnecting ? null : platform);
                            setInputVal("");
                          }}
                          className="text-[11px] font-extrabold uppercase tracking-wide px-3.5 py-1.5 rounded-xl transition-all hover:brightness-110 active:scale-95"
                          style={{
                            background: isThisConnecting
                              ? "rgba(255,255,255,0.06)"
                              : `linear-gradient(135deg, ${meta.color}25, ${meta.color}10)`,
                            border: `1px solid ${isThisConnecting ? "rgba(255,255,255,0.12)" : meta.border}`,
                            color: isThisConnecting ? "rgba(255,255,255,0.5)" : meta.color,
                          }}
                        >
                          {isThisConnecting ? "✕ Cancel" : "Connect"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline connect input — slides below the card */}
                {isThisConnecting && (
                  <div
                    className="mt-1 rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{
                      background: `linear-gradient(135deg, ${meta.color}10, rgba(0,0,0,0.3))`,
                      border: `1px solid ${meta.border}`,
                    }}
                  >
                    <div
                      className="w-6 h-6 shrink-0 flex items-center justify-center rounded-lg"
                      style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}
                    >
                      <div className="w-3.5 h-3.5">{PLATFORM_SVG[platform]}</div>
                    </div>
                    <span className="text-sm font-bold shrink-0" style={{ color: meta.color }}>@</span>
                    <input
                      type="text"
                      placeholder={`your ${meta.label} username`}
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleConnect(platform)}
                      maxLength={64}
                      autoFocus
                      className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-muted-foreground/40 focus:outline-none font-mono"
                    />
                    <button
                      onClick={() => handleConnect(platform)}
                      disabled={!inputVal.trim() || connect.isPending}
                      className="shrink-0 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest text-white disabled:opacity-30 transition-all hover:brightness-110 active:scale-95"
                      style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}bb)` }}
                    >
                      {connect.isPending ? "···" : "Save"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const BG_STYLES: Record<string, string> = {
  "bg-neon-purple":  "from-purple-900 via-violet-800 to-purple-950",
  "bg-cyber-blue":   "from-cyan-900 via-blue-800 to-cyan-950",
  "bg-fire-red":     "from-red-900 via-orange-800 to-red-950",
  "bg-matrix-green": "from-green-950 via-emerald-900 to-green-950",
  "bg-gold-rush":    "from-yellow-900 via-amber-800 to-yellow-950",
  "bg-arctic":       "from-sky-900 via-blue-800 to-indigo-950",
  "bg-void":         "from-neutral-950 via-zinc-900 to-black",
};

const BG_ACCENT: Record<string, string> = {
  "bg-neon-purple":  "rgba(168,85,247,0.6)",
  "bg-cyber-blue":   "rgba(6,182,212,0.6)",
  "bg-fire-red":     "rgba(239,68,68,0.6)",
  "bg-matrix-green": "rgba(34,197,94,0.6)",
  "bg-gold-rush":    "rgba(234,179,8,0.6)",
  "bg-arctic":       "rgba(56,189,248,0.6)",
  "bg-void":         "rgba(255,255,255,0.15)",
};

const RANK_BADGES = [
  { min: 0,    label: "Recruit",  emoji: "🪖", color: "text-muted-foreground border-border bg-background/60" },
  { min: 100,  label: "Veteran",  emoji: "⚔️", color: "text-green-400 border-green-500/40 bg-green-500/10" },
  { min: 500,  label: "Elite",    emoji: "💎", color: "text-primary border-primary/40 bg-primary/10" },
  { min: 1000, label: "Legend",   emoji: "🌟", color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10" },
  { min: 5000, label: "Champion", emoji: "👑", color: "text-secondary border-secondary/40 bg-secondary/10" },
];

const POPULAR_GAMES = [
  "Apex Legends", "Valorant", "Fortnite", "Call of Duty", "League of Legends",
  "Dota 2", "CS2", "Minecraft", "Overwatch 2", "Rocket League", "FIFA",
  "Rainbow Six Siege", "PUBG", "Elden Ring", "World of Warcraft",
];

const HELP_TYPE_SUGGESTIONS = [
  "Expert carry", "Rank boosting", "Teaching beginners", "Chill co-op partner",
  "PvP coaching", "Raid & dungeon runs", "Storyline completion", "Speed running",
  "Achievement hunting", "Pro duo queue",
];

const PLAYSTYLE_OPTIONS = [
  "Competitive", "Chill & laid-back", "Supportive", "Strategic", "Patient",
  "Aggressive", "Team-oriented", "Friendly", "Solo-carry", "Communicative",
];

const GAME_COLORS = [
  "border-primary/40 bg-primary/5",
  "border-secondary/40 bg-secondary/5",
  "border-green-500/40 bg-green-500/5",
  "border-amber-500/40 bg-amber-500/5",
  "border-pink-500/40 bg-pink-500/5",
  "border-indigo-500/40 bg-indigo-500/5",
];


function ScoreBadge({ rating }: { rating: number }) {
  const color =
    rating >= 9 ? "bg-emerald-400 text-black" :
    rating >= 7 ? "bg-green-500 text-black" :
    rating >= 5 ? "bg-yellow-400 text-black" :
    rating >= 3 ? "bg-orange-500 text-white" :
    "bg-red-500 text-white";
  return <span className={`text-xs font-black px-2 py-0.5 rounded ${color}`}>{rating}/10</span>;
}

function QuestEntryCard({ entry, onDelete, colorClass }: { entry: QuestEntry; onDelete: () => void; colorClass: string }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-all ${colorClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-background/60 border border-border/50 flex items-center justify-center shrink-0">
            <Gamepad2 className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-white text-sm truncate">{entry.gameName}</div>
            <div className="text-[10px] text-muted-foreground/70 uppercase tracking-widest font-semibold">Game</div>
          </div>
        </div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="shrink-0 text-muted-foreground hover:text-red-400 transition-colors p-1 rounded">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-red-400 font-semibold">Remove?</span>
            <button onClick={onDelete} className="text-red-400 hover:text-red-300 transition-colors p-1"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={() => setConfirming(false)} className="text-muted-foreground hover:text-white transition-colors p-1"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Target className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
          <div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5">What I Offer</div>
            <div className="text-xs font-semibold text-white">{entry.helpType}</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5">Playstyle</div>
            <div className="text-xs font-semibold text-white">{entry.playstyle}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddQuestForm({ onCancel }: { onCancel: () => void }) {
  const [gameName, setGameName] = useState("");
  const [helpType, setHelpType] = useState("");
  const [playstyle, setPlaystyle] = useState("");
  const [showGameSuggestions, setShowGameSuggestions] = useState(false);
  const addEntry = useAddQuestEntry();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || !helpType.trim() || !playstyle.trim()) return;
    addEntry.mutate(
      { gameName: gameName.trim(), helpType: helpType.trim(), playstyle: playstyle.trim() },
      {
        onSuccess: () => {
          toast({ title: "Game added to your Quest!" });
          onCancel();
        },
        onError: (err: any) => toast({ title: "Failed", description: err?.error || "Error", variant: "destructive" }),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4"
      style={{ boxShadow: "0 0 24px rgba(168,85,247,0.06) inset" }}>
      <div className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
        <Plus className="h-3.5 w-3.5" /> Add Game to Quest
      </div>

      {/* Game Name */}
      <div className="space-y-1.5 relative">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Game Name *</Label>
        <Input
          value={gameName}
          onChange={(e) => { setGameName(e.target.value); setShowGameSuggestions(e.target.value.length > 0); }}
          onFocus={() => setShowGameSuggestions(true)}
          onBlur={() => setTimeout(() => setShowGameSuggestions(false), 200)}
          placeholder="e.g. Apex Legends"
          className="bg-background/60 text-sm"
          maxLength={60}
          required
        />
        {showGameSuggestions && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-border bg-card shadow-xl max-h-44 overflow-y-auto">
            {POPULAR_GAMES.filter((g) => g.toLowerCase().includes(gameName.toLowerCase()) && g.toLowerCase() !== gameName.toLowerCase()).slice(0, 8).map((g) => (
              <button key={g} type="button" onMouseDown={() => { setGameName(g); setShowGameSuggestions(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors text-foreground/80">
                {g}
              </button>
            ))}
            {POPULAR_GAMES.filter((g) => g.toLowerCase().includes(gameName.toLowerCase()) && g.toLowerCase() !== gameName.toLowerCase()).length === 0 && gameName && (
              <div className="px-3 py-2 text-sm text-muted-foreground italic">Press enter to use "{gameName}"</div>
            )}
          </div>
        )}
        {/* Popular chips */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {POPULAR_GAMES.slice(0, 6).map((g) => (
            <button key={g} type="button" onClick={() => setGameName(g)}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all ${gameName === g ? "bg-primary/20 border-primary/50 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-white"}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Help Type */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">What Can You Help With? *</Label>
        <Input
          value={helpType}
          onChange={(e) => setHelpType(e.target.value)}
          placeholder='e.g. "Expert carry for raids"'
          className="bg-background/60 text-sm"
          maxLength={100}
          required
        />
        <div className="flex flex-wrap gap-1.5">
          {HELP_TYPE_SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setHelpType(s)}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all ${helpType === s ? "bg-secondary/20 border-secondary/50 text-secondary" : "border-border/50 text-muted-foreground hover:border-secondary/30 hover:text-white"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Playstyle */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your Playstyle *</Label>
        <div className="flex flex-wrap gap-1.5">
          {PLAYSTYLE_OPTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setPlaystyle(s)}
              className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold transition-all ${playstyle === s ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "border-border/50 text-muted-foreground hover:border-amber-500/30 hover:text-white"}`}>
              {s}
            </button>
          ))}
        </div>
        {playstyle && (
          <div className="text-xs text-muted-foreground">Selected: <span className="text-amber-400 font-semibold">{playstyle}</span></div>
        )}
      </div>

      <div className="flex gap-2.5 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="text-xs font-bold uppercase">
          <X className="h-3.5 w-3.5 mr-1" /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!gameName.trim() || !helpType.trim() || !playstyle.trim() || addEntry.isPending}
          className="bg-primary hover:bg-primary/90 text-xs font-bold uppercase flex-1 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
          {addEntry.isPending ? (
            <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />Adding…</span>
          ) : (
            <><Plus className="h-3.5 w-3.5 mr-1" /> Add Game</>
          )}
        </Button>
      </div>
    </form>
  );
}

function QuestSection() {
  const { data: entries = [], isLoading } = useMyQuestEntries();
  const deleteEntry = useDeleteQuestEntry();
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteEntry.mutate(id, {
      onSuccess: () => toast({ title: "Game removed from Quest" }),
      onError: (err: any) => toast({ title: "Failed", description: err?.error, variant: "destructive" }),
    });
  };

  return (
    <Card className="border-border bg-card/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" />
            My Quest
            <span className="text-[10px] font-normal text-muted-foreground/60 normal-case tracking-normal">
              — games you offer to play for hire
            </span>
          </CardTitle>
          {!adding && entries.length < 10 && (
            <Button size="sm" onClick={() => setAdding(true)}
              className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white text-xs font-bold uppercase h-7 px-3">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Game
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">
          List the games you're available to play and what kind of help you can provide. This shows on your public profile and on your bids.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && <AddQuestForm onCancel={() => setAdding(false)} />}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : entries.length === 0 && !adding ? (
          <div className="text-center py-10 border-2 border-dashed border-border/40 rounded-xl bg-background/20">
            <Gamepad2 className="h-9 w-9 mx-auto mb-3 text-muted-foreground/25" />
            <div className="text-sm font-bold text-muted-foreground/60">No games in your Quest yet</div>
            <div className="text-xs text-muted-foreground/40 mt-1">Add the games you play to start getting hired.</div>
            <Button size="sm" onClick={() => setAdding(true)} className="mt-4 bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white text-xs font-bold uppercase">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Your First Game
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entries.map((entry, idx) => (
              <QuestEntryCard
                key={entry.id}
                entry={entry}
                colorClass={GAME_COLORS[idx % GAME_COLORS.length]}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </div>
        )}

        {entries.length >= 10 && (
          <p className="text-xs text-muted-foreground/50 text-center">Maximum 10 games reached.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ShopSection({
  profile,
  currentUserId,
}: {
  profile: ReturnType<typeof useUserProfile>["data"];
  currentUserId: number;
}) {
  const { data: shopItems = [] } = useShopItems();
  const purchase = usePurchaseItem();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [tab, setTab] = useState<"background" | "title">("background");

  const purchased = new Set(profile?.purchasedItems ?? []);
  const equipped = {
    background: profile?.profileBackground ?? null,
    title: profile?.profileTitle ?? null,
  };

  const backgrounds = shopItems.filter((i) => i.type === "background");
  const titles = shopItems.filter((i) => i.type === "title");
  const points = profile?.points ?? 0;

  const handlePurchase = (item: ShopItem) => {
    purchase.mutate(item.id, {
      onSuccess: (data) => {
        toast({ title: `${item.label} unlocked!`, description: `Spent ${item.cost} pts · ${data.newPoints} pts remaining` });
      },
      onError: (err: any) => toast({ title: "Purchase failed", description: err?.error || "Error", variant: "destructive" }),
    });
  };

  const handleEquip = (item: ShopItem) => {
    const field = item.type === "background" ? "profileBackground" : "profileTitle";
    const alreadyEquipped = equipped[item.type] === item.id;
    updateProfile.mutate(
      { [field]: alreadyEquipped ? null : item.id },
      {
        onSuccess: () => toast({ title: alreadyEquipped ? "Unequipped" : `${item.label} equipped!` }),
        onError: (err: any) => toast({ title: "Error", description: err?.error, variant: "destructive" }),
      }
    );
  };

  const items = tab === "background" ? backgrounds : titles;

  return (
    <Card className="border-border bg-card/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            Points Shop
          </CardTitle>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-black text-primary">{points}</span>
            <span className="text-xs text-muted-foreground">pts available</span>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {(["background", "title"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                tab === t ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-border/80"
              }`}
            >
              {t === "background" ? <Palette className="h-3.5 w-3.5" /> : <Tag className="h-3.5 w-3.5" />}
              {t === "background" ? "Backgrounds" : "Titles"}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => {
            const owned = purchased.has(item.id);
            const equippedNow = equipped[item.type] === item.id;
            const canAfford = points >= item.cost;
            const bgGrad = item.type === "background" ? BG_STYLES[item.id] : null;

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3 space-y-2 transition-all ${
                  equippedNow
                    ? "border-primary/60 bg-primary/10 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                    : "border-border bg-background/40 hover:border-border/80"
                }`}
              >
                {bgGrad && (
                  <div className={`h-12 rounded-lg bg-gradient-to-r ${bgGrad} border border-white/10`} />
                )}
                {item.type === "title" && (
                  <div className="h-12 rounded-lg border border-border bg-background/60 flex items-center justify-center">
                    <span className="text-sm font-black text-white uppercase tracking-widest">{item.label}</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-white">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-yellow-400">
                    <Trophy className="h-3.5 w-3.5" />
                    {item.cost}
                  </div>
                </div>
                <div className="flex gap-2">
                  {owned ? (
                    <Button
                      size="sm"
                      className={`flex-1 text-xs font-bold uppercase ${
                        equippedNow
                          ? "bg-primary text-white hover:bg-primary/80"
                          : "bg-background border border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                      }`}
                      onClick={() => handleEquip(item)}
                      disabled={updateProfile.isPending}
                    >
                      {equippedNow ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Equipped</> : "Equip"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className={`flex-1 text-xs font-bold uppercase ${
                        canAfford
                          ? "bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500 hover:text-black"
                          : "bg-background border border-border text-muted-foreground cursor-not-allowed opacity-50"
                      }`}
                      onClick={() => canAfford && handlePurchase(item)}
                      disabled={!canAfford || purchase.isPending}
                    >
                      {canAfford ? <><Trophy className="h-3.5 w-3.5 mr-1" /> Buy · {item.cost} pts</> : <><Lock className="h-3.5 w-3.5 mr-1" /> {item.cost} pts</>}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function VerificationSection({ idVerified }: { idVerified: boolean }) {
  const verifyId = useVerifyId();
  const { toast } = useToast();

  const handleVerify = () => {
    verifyId.mutate(null, {
      onSuccess: () => toast({ title: "Identity Verified!", description: "Your Verified badge is now active on your profile." }),
      onError: (err: any) => toast({ title: "Verification Failed", description: err?.error || "Please try again.", variant: "destructive" }),
    });
  };

  if (idVerified) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5"
        style={{ boxShadow: "0 0 20px rgba(52,211,153,0.08)" }}>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0"
              style={{ boxShadow: "0 0 16px rgba(52,211,153,0.25)" }}>
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-sm font-extrabold text-white uppercase tracking-wide">Identity Verified</span>
                <VerifiedBadge idVerified={true} variant="compact" />
              </div>
              <p className="text-xs text-emerald-300/70 leading-relaxed">
                Your Verified badge is now active on your profile, bids, and request listings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/25 bg-card/60 overflow-hidden">
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #f59e0b, #a855f7, #22d3ee)" }} />
      <CardContent className="pt-5 pb-5 space-y-4">
        {/* Top row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white mb-0.5">Verification In Progress</div>
              <p className="text-xs text-muted-foreground/70">
                Earn the <span className="text-emerald-400 font-semibold">Verified</span> badge — trusted by more hirers, more bids accepted.
              </p>
            </div>
          </div>
          <Button
            onClick={handleVerify}
            disabled={verifyId.isPending}
            size="sm"
            className="shrink-0 font-bold text-xs uppercase tracking-wide"
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#fff",
              border: "none",
              boxShadow: "0 0 14px rgba(16,185,129,0.35)",
            }}
          >
            {verifyId.isPending ? (
              <><div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin mr-1.5" />Verifying…</>
            ) : (
              <><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Submit for Review</>
            )}
          </Button>
        </div>
        {/* Timeline info */}
        <div
          className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
          style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.18)" }}
        >
          <Clock className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="text-[11px] font-semibold text-white">Verification helps keep Gamerbuddy safe</span>
            <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
              It usually takes 7–15 days. You can browse and bid freely in the meantime — posting requests and hiring unlock once you're verified.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: profile, isLoading } = useUserProfile(user?.id ?? null);
  const { data: myVotes } = useProfileVotes(user?.id ?? null);
  const updateProfile = useUpdateProfile();

  const [editingBio, setEditingBio] = useState(false);
  const [draftBio, setDraftBio] = useState("");

  if (!user) return null;
  if (isLoading) return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );

  const points = profile?.points ?? user.points ?? 0;
  const trustFactor = Math.min(100, profile?.trustFactor ?? 50);
  const repBadges = computeBadges({
    trustFactor,
    idVerified: user.idVerified,
    sessionsAsGamerCount: profile?.sessionsAsGamerCount ?? 0,
    sessionsAsHirerCount: profile?.sessionsAsHirerCount ?? 0,
    beginnerFriendly: profile?.beginnerFriendly ?? false,
  });
  const bgId = profile?.profileBackground;
  const titleId = profile?.profileTitle;
  const bgGrad = bgId ? (BG_STYLES[bgId] ?? "from-primary/20 to-secondary/10") : "from-primary/15 via-secondary/10 to-background";
  const bgAccent = bgId ? (BG_ACCENT[bgId] ?? "rgba(168,85,247,0.4)") : "rgba(168,85,247,0.4)";

  const currentRank = RANK_BADGES.filter((b) => points >= b.min).pop() ?? RANK_BADGES[0];
  const nextRank = RANK_BADGES.find((b) => points < b.min);

  const titleLabel = titleId
    ? (profile?.purchasedItems?.includes(titleId) ? titleId.replace("title-", "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : null)
    : null;

  const handleSaveBio = () => {
    updateProfile.mutate({ bio: draftBio }, {
      onSuccess: () => {
        toast({ title: "Bio updated!" });
        setEditingBio(false);
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.error || "Error", variant: "destructive" }),
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ── HERO CARD ─────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-border/60">

        {/* Banner */}
        <div
          className={`h-36 sm:h-44 bg-gradient-to-br ${bgGrad} relative`}
          style={{ boxShadow: `inset 0 0 80px ${bgAccent}` }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(255,255,255,0.04),transparent_70%)]" />
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.03) 35px, rgba(255,255,255,0.03) 70px)" }}
          />
          {bgId && (
            <div className="absolute top-3 right-3">
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold border border-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                {bgId.replace("bg-", "").replace(/-/g, " ")}
              </span>
            </div>
          )}
        </div>

        {/* Content panel */}
        <div className="bg-card/80 backdrop-blur-sm px-4 sm:px-6 pb-6 -mt-px">

          {/* ── Avatar + Name/Badges row ── */}
          {/* Mobile: centered column. Desktop: side-by-side aligned at bottom. */}
          <div className="flex flex-col items-center sm:flex-row sm:items-end gap-4 sm:gap-5 -translate-y-10 sm:-translate-y-12 mb-0">

            {/* Avatar with glow ring + verified dot */}
            <div className="relative shrink-0">
              <div
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-card flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${bgAccent.replace("0.6", "0.4")}, rgba(0,0,0,0.85))`,
                  boxShadow: `0 0 0 3px ${bgAccent.replace("0.6", "0.18")}, 0 0 36px ${bgAccent}`,
                }}
              >
                <span className="text-4xl sm:text-5xl font-black text-white uppercase select-none">
                  {user.name.charAt(0)}
                </span>
              </div>
              {user.idVerified && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 h-7 w-7 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center"
                  style={{ boxShadow: "0 0 12px rgba(52,211,153,0.65)" }}
                  title="Identity Verified"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Name + rank + rating + votes */}
            <div className="flex-1 min-w-0 sm:pb-2 sm:translate-y-8 text-center sm:text-left">
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight leading-none">
                  {user.name}
                </h1>
                {titleLabel && (
                  <span className="text-[11px] font-black uppercase tracking-widest text-primary border border-primary/40 bg-primary/10 px-2.5 py-0.5 rounded-full transition-all duration-150 hover:brightness-110">
                    {titleLabel}
                  </span>
                )}
              </div>

              {/* Status pills row */}
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-1.5">
                <VerifiedBadge idVerified={user.idVerified} variant="compact" />
                <span
                  className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-all duration-150 hover:brightness-110 hover:scale-105 cursor-default ${currentRank.color}`}
                >
                  {currentRank.emoji} {currentRank.label}
                </span>
                {profile?.avgRating != null && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-yellow-400 bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/30 transition-all duration-150 hover:brightness-110 hover:scale-105 cursor-default">
                    <Star className="w-3 h-3 fill-yellow-400" />
                    {profile.avgRating.toFixed(1)}/10
                    <span className="text-muted-foreground font-normal text-[10px]">({profile.reviewCount})</span>
                  </span>
                )}
                {((myVotes?.likes ?? 0) > 0) && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/25 transition-all duration-150 hover:brightness-110 hover:scale-105 cursor-default">
                    👍 {myVotes?.likes ?? 0}
                  </span>
                )}
                {((myVotes?.dislikes ?? 0) > 0) && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/25 transition-all duration-150 hover:brightness-110 hover:scale-105 cursor-default">
                    👎 {myVotes?.dislikes ?? 0}
                  </span>
                )}
              </div>

              {/* Reputation badges */}
              {repBadges.length > 0 && (
                <div className="mt-2.5 flex justify-center sm:justify-start">
                  <ReputationBadges badges={repBadges} />
                </div>
              )}
            </div>
          </div>

          {/* ── Trust Factor + Stats ── */}
          <div className="-mt-4 sm:-mt-7 space-y-3 pt-1">
            <TrustMeter value={trustFactor} />

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">

              {/* Points */}
              <div className="relative p-3 sm:p-4 bg-background/50 rounded-2xl border border-border hover:border-yellow-500/40 hover:-translate-y-0.5 transition-all duration-200 text-center space-y-2 overflow-hidden group cursor-default">
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl" />
                <div className="relative flex justify-center">
                  <div className="h-8 w-8 rounded-xl bg-yellow-500/10 border border-yellow-500/25 flex items-center justify-center group-hover:border-yellow-500/50 group-hover:bg-yellow-500/15 transition-colors duration-200">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                  </div>
                </div>
                <div className="relative">
                  <div className="text-xl sm:text-2xl font-black text-yellow-400 leading-none">{points}</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">Points</div>
                  {nextRank && (
                    <div className="text-[9px] text-muted-foreground/50 hidden sm:block mt-0.5">
                      {nextRank.min - points} to {nextRank.label}
                    </div>
                  )}
                </div>
              </div>

              {/* Hired */}
              <div className="relative p-3 sm:p-4 bg-background/50 rounded-2xl border border-border hover:border-secondary/40 hover:-translate-y-0.5 transition-all duration-200 text-center space-y-2 overflow-hidden group cursor-default">
                <div className="absolute inset-0 bg-gradient-to-b from-secondary/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl" />
                <div className="relative flex justify-center">
                  <div className="h-8 w-8 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center justify-center group-hover:border-secondary/50 group-hover:bg-secondary/15 transition-colors duration-200">
                    <Users className="h-4 w-4 text-secondary" />
                  </div>
                </div>
                <div className="relative">
                  <div className="text-xl sm:text-2xl font-black text-secondary leading-none">
                    {profile?.sessionsAsHirer?.length ?? 0}
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">Hired</div>
                </div>
              </div>

              {/* Played */}
              <div className="relative p-3 sm:p-4 bg-background/50 rounded-2xl border border-border hover:border-green-500/40 hover:-translate-y-0.5 transition-all duration-200 text-center space-y-2 overflow-hidden group cursor-default">
                <div className="absolute inset-0 bg-gradient-to-b from-green-500/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl" />
                <div className="relative flex justify-center">
                  <div className="h-8 w-8 rounded-xl bg-green-500/10 border border-green-500/25 flex items-center justify-center group-hover:border-green-500/50 group-hover:bg-green-500/15 transition-colors duration-200">
                    <Gamepad2 className="h-4 w-4 text-green-400" />
                  </div>
                </div>
                <div className="relative">
                  <div className="text-xl sm:text-2xl font-black text-green-400 leading-none">
                    {profile?.sessionsAsGamer?.length ?? 0}
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">Played</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── STREAMING ACCOUNTS DISPLAY ── */}
      <StreamingAccountsDisplay
        accounts={profile?.streamingAccounts ?? []}
        onConnect={() =>
          document.getElementById("streaming-management")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      {/* ── VERIFICATION CARD ── */}
      <VerificationSection idVerified={user.idVerified} />

      {/* ── BIO / ABOUT ME ── */}
      <div
        className="rounded-2xl overflow-hidden border"
        style={{
          borderColor: editingBio ? "rgba(168,85,247,0.35)" : "rgba(255,255,255,0.07)",
          background: "rgba(8,6,18,0.65)",
          boxShadow: editingBio ? "0 0 0 1px rgba(168,85,247,0.12), 0 4px 24px rgba(168,85,247,0.08)" : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            background: editingBio ? "rgba(168,85,247,0.07)" : "rgba(255,255,255,0.02)",
            transition: "background 0.2s",
          }}
        >
          <div className="flex items-center gap-2.5">
            <User
              className="h-4 w-4"
              style={{ color: editingBio ? "#a855f7" : "rgba(255,255,255,0.4)" }}
            />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/70">
              About Me
            </span>
            {profile?.bio && !editingBio && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(168,85,247,0.12)",
                  border: "1px solid rgba(168,85,247,0.25)",
                  color: "#c084fc",
                }}
              >
                {profile.bio.length}/300
              </span>
            )}
          </div>
          {!editingBio ? (
            <button
              onClick={() => { setDraftBio(profile?.bio ?? ""); setEditingBio(true); }}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-150 hover:brightness-110 hover:scale-[1.02]"
              style={{
                background: "rgba(168,85,247,0.10)",
                border: "1px solid rgba(168,85,247,0.25)",
                color: "#c084fc",
              }}
            >
              <Edit3 className="h-3 w-3" />
              {profile?.bio ? "Edit" : "Add Bio"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold tabular-nums"
                style={{ color: draftBio.length >= 280 ? "#f87171" : draftBio.length >= 250 ? "#fbbf24" : "rgba(255,255,255,0.35)" }}
              >
                {draftBio.length}/300
              </span>
              <button
                onClick={() => setEditingBio(false)}
                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all duration-150 hover:brightness-110"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <X className="h-3 w-3" /> Cancel
              </button>
              <button
                onClick={handleSaveBio}
                disabled={updateProfile.isPending}
                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-150 hover:brightness-110 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(168,85,247,0.12))",
                  border: "1px solid rgba(168,85,247,0.45)",
                  color: "#c084fc",
                }}
              >
                <Check className="h-3 w-3" />
                {updateProfile.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {editingBio ? (
            <Textarea
              value={draftBio}
              onChange={(e) => setDraftBio(e.target.value)}
              placeholder="Write a short bio about yourself, your playstyle, favorite games, or what kind of sessions you enjoy..."
              className="resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm text-white/80 placeholder:text-white/25 leading-relaxed w-full min-h-[100px]"
              maxLength={300}
              autoFocus
            />
          ) : profile?.bio ? (
            <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center mb-1"
                style={{
                  background: "rgba(168,85,247,0.08)",
                  border: "1px dashed rgba(168,85,247,0.25)",
                }}
              >
                <User className="h-4 w-4 text-primary/40" />
              </div>
              <p className="text-sm text-white/25 italic">No bio added yet.</p>
              <p className="text-[11px] text-white/15">
                Tell others about your playstyle and favourite games.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MY QUEST */}
      <QuestSection />

      {/* CONNECTED STREAMING PLATFORMS */}
      <StreamingAccountsSection />

      {/* GAMER CODE OF CONDUCT */}
      <GamerRulesCard />

      {/* BADGE SHOWCASE */}
      <Card className="border-border bg-card/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" /> Badge Showcase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {RANK_BADGES.map((badge) => {
              const earned = points >= badge.min;
              return (
                <div
                  key={badge.label}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    earned ? badge.color : "border-border/30 bg-background/30 text-muted-foreground/30 grayscale"
                  }`}
                >
                  <span className="text-2xl">{badge.emoji}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{badge.label}</span>
                  {earned ? <span className="text-[9px] text-muted-foreground">Earned</span> : <span className="text-[9px] text-muted-foreground">{badge.min} pts</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SESSION HISTORY */}
      {((profile?.sessionsAsHirer?.length ?? 0) + (profile?.sessionsAsGamer?.length ?? 0)) > 0 && (
        <Card className="border-border bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" /> Session History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {profile?.sessionsAsHirer?.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-secondary border border-secondary/30 bg-secondary/10 px-2 py-0.5 rounded font-bold shrink-0">Hired</span>
                  <span className="text-sm font-semibold text-white truncate">{s.gameName}</span>
                  {s.platform && <span className="text-xs text-muted-foreground hidden sm:block">{s.platform}</span>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{format(new Date(s.createdAt), "MMM d, yyyy")}</span>
              </div>
            ))}
            {profile?.sessionsAsGamer?.map((s) => (
              <div key={s.requestId} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-green-400 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded font-bold shrink-0">Played</span>
                  <span className="text-sm font-semibold text-white truncate">{s.gameName ?? "—"}</span>
                  {s.platform && <span className="text-xs text-muted-foreground hidden sm:block">{s.platform}</span>}
                </div>
                {s.createdAt && <span className="text-xs text-muted-foreground shrink-0">{format(new Date(s.createdAt), "MMM d, yyyy")}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* REVIEWS */}
      {(profile?.reviews?.length ?? 0) > 0 && (
        <Card className="border-border bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" /> Reviews Received
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {profile?.reviews?.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-background/50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-white">{r.reviewerName}</span>
                  </div>
                  <ScoreBadge rating={r.rating} />
                </div>
                {r.comment && <p className="text-sm text-foreground/75 leading-relaxed pl-9 border-l-2 border-border/40">{r.comment}</p>}
                <div className="text-xs text-muted-foreground pl-9">{format(new Date(r.createdAt), "MMM d, yyyy")}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ACCOUNT INFO */}
      <Card className="border-border bg-card/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" /> Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-background/50 rounded-lg border border-border space-y-1">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </div>
            <div className="font-mono text-sm truncate">{user.email}</div>
          </div>
          <div className="p-3 bg-background/50 rounded-lg border border-border space-y-1">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone
            </div>
            <div className="font-mono text-sm">{user.phone}</div>
          </div>
          <div className="p-3 bg-background/50 rounded-lg border border-border md:col-span-2 space-y-1">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Member Since
            </div>
            <div className="font-mono text-sm">{format(new Date(user.createdAt), "MMMM do, yyyy")}</div>
          </div>
        </CardContent>
      </Card>

      {/* POINTS SHOP */}
      {profile && <ShopSection profile={profile} currentUserId={user.id} />}
    </div>
  );
}
