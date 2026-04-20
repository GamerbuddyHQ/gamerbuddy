import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { COUNTRY_MAP, GENDER_MAP } from "@/lib/geo-options";
import { CountryCombobox, GenderSelect } from "@/components/country-combobox";
import {
  useUserProfile, useUpdateProfile, useShopItems, usePurchaseItem,
  useMyQuestEntries, useAddQuestEntry, useDeleteQuestEntry, useVerifyId,
  useMyStreamingAccounts, useConnectStreaming, useDisconnectStreaming,
  useMyGamingAccounts, useConnectGaming, useDisconnectGaming,
  useProfileVotes,
  useConfirmProfilePhoto, useDeleteProfilePhoto,
  useConfirmGalleryPhoto, useDeleteGalleryPhoto,
  requestPhotoUploadUrl, uploadFileToPut, computeFileHash,
  STREAMING_PLATFORM_META, GAMING_PLATFORM_META,
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
  Zap, Target, ChevronDown, ChevronUp, Users, Globe, UserRound,
  Camera, ImagePlus, AlertTriangle,
} from "lucide-react";
import { TrustMeter, ReputationBadges, computeBadges } from "@/components/reputation-badges";
import { StreamingAccountsDisplay } from "@/components/streaming-accounts-display";

/* ── PROFILE COMPLETION HELPERS ────────────────────────────── */
function computeProfileCompletion(profile: any): {
  score: number;
  items: Array<{ label: string; pts: number; done: boolean; section: string; icon: string }>;
} {
  const items = [
    { label: "Write your bio",             pts: 30, done: !!(profile?.bio?.trim()),                                         section: "bio",       icon: "✍️" },
    { label: "Set your region / country",  pts: 15, done: !!(profile?.country && profile.country !== "any"),                section: "basics",    icon: "🌍" },
    { label: "Set your gender",            pts: 15, done: !!(profile?.gender && profile.gender !== "any"),                  section: "basics",    icon: "👤" },
    { label: "Connect a gaming account",   pts: 40, done: (profile?.gamingAccounts?.length ?? 0) > 0,                    section: "gaming",    icon: "🎮" },
    { label: "Connect a streaming channel", pts: 20, done: (profile?.streamingAccounts?.length ?? 0) > 0,                  section: "streaming", icon: "📡" },
  ];
  const score = items.filter((i) => i.done).reduce((a, i) => a + i.pts, 0);
  return { score, items };
}

/* ── POST-VERIFICATION MODAL ────────────────────────────────── */

const BIO_TEMPLATES: { archetype: string; emoji: string; color: string; border: string; text: string }[] = [
  {
    archetype: "Competitive Carry",
    emoji: "🏆",
    color: "rgba(250,204,21,0.12)",
    border: "rgba(250,204,21,0.35)",
    text: "Competitive player focused on ranked improvement. I specialize in FPS and battle royale — reliable, communicative, and always playing to win. Patient with newer players and clean track record.",
  },
  {
    archetype: "Chill Co-op",
    emoji: "🤝",
    color: "rgba(34,211,238,0.10)",
    border: "rgba(34,211,238,0.35)",
    text: "Chill gamer happy to help at your own pace. I play mostly RPGs, adventure, and co-op titles — no pressure, good vibes, and solid teamwork. Always on time and easy to communicate with.",
  },
  {
    archetype: "Pro Speedrunner",
    emoji: "⚡",
    color: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.35)",
    text: "Pro-level player across multiple titles with a fast, efficient playstyle. I'll carry you to your goals quickly and share tips along the way. Results-oriented and always prepared.",
  },
  {
    archetype: "Versatile All-Rounder",
    emoji: "🎮",
    color: "rgba(52,211,153,0.10)",
    border: "rgba(52,211,153,0.35)",
    text: "Multi-genre gamer comfortable with ranked, co-op, and casual sessions. Friendly, communicative, and adaptable to any playstyle or objective. Let's get that W together!",
  },
];

const COMPLETION_BENEFITS: Record<string, string> = {
  "Write your bio":            "Hirers read this before accepting bids",
  "Set your region / country": "Appears on every bid you place",
  "Set your gender":           "Enables gender-preference matching",
  "Connect a gaming account":  "Proves you're a real, active gamer",
};

function PostVerificationModal({
  profile,
  onClose,
  onComplete,
}: {
  profile: any;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { score, items } = computeProfileCompletion(profile);
  const incomplete = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);
  const needsBio = incomplete.some((i) => i.section === "bio");

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.97)", backdropFilter: "blur(24px)" }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          border: "2px solid rgba(52,211,153,0.4)",
          boxShadow: "0 0 140px rgba(52,211,153,0.10), 0 0 60px rgba(168,85,247,0.08), 0 40px 100px rgba(0,0,0,0.98)",
          background: "hsl(var(--card))",
          maxHeight: "92dvh",
        }}
      >
        {/* ── HERO HEADER (gradient panel) ─────────────────── */}
        <div
          className="relative px-6 pt-7 pb-6 text-center shrink-0 overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(52,211,153,0.18) 0%, rgba(168,85,247,0.12) 50%, rgba(34,211,238,0.08) 100%)",
            borderBottom: "1px solid rgba(52,211,153,0.15)",
          }}
        >
          {/* Decorative background icons */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
            <span className="absolute top-3 left-4 text-2xl opacity-10">🎮</span>
            <span className="absolute top-2 right-6 text-xl opacity-10">⚡</span>
            <span className="absolute bottom-3 left-8 text-xl opacity-8">🏆</span>
            <span className="absolute bottom-2 right-5 text-2xl opacity-10">🎯</span>
            <span className="absolute top-5 left-1/2 -translate-x-1/2 text-6xl opacity-[0.04]">🎮</span>
          </div>

          {/* Verified badge */}
          <div className="relative inline-flex flex-col items-center gap-3 mx-auto">
            <div
              className="h-20 w-20 rounded-full flex items-center justify-center border-2 border-emerald-400/60 bg-emerald-500/15 relative"
              style={{ boxShadow: "0 0 0 8px rgba(52,211,153,0.07), 0 0 60px rgba(52,211,153,0.2)" }}
            >
              <ShieldCheck className="h-10 w-10 text-emerald-400" />
              {/* Pulse ring */}
              <div
                className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-ping"
                style={{ animationDuration: "2.5s" }}
              />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span
                  className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full"
                  style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.4)" }}
                >
                  ✅ Account Verified
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-foreground leading-tight">
                Welcome to the Squad! 🎉
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-sm mx-auto">
                You can now <strong className="text-emerald-400">bid</strong>, <strong className="text-primary">hire</strong>, and access everything on Gamerbuddy. Now let's make your profile <em>unforgettable</em>.
              </p>
            </div>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ──────────────────────────────── */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          <div className="p-5 sm:p-6 space-y-5">

            {/* ── PROGRESS BAR ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black uppercase tracking-widest text-foreground/70 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Profile Power
                </span>
                <span className="font-black text-primary">{score}/100%</span>
              </div>
              <div className="h-3 rounded-full bg-background/60 overflow-hidden border border-border/30">
                <div
                  className="h-full rounded-full transition-all duration-700 relative"
                  style={{
                    width: `${Math.max(score, 3)}%`,
                    background: score >= 80
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : "linear-gradient(90deg, #7c3aed, #a855f7, #22d3ee)",
                  }}
                >
                  {/* Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
                <span>{score < 80 ? `${80 - score}% away from Trust Badge 🛡️` : "🏆 Trust Badge unlocked!"}</span>
                <span>{done.length}/{items.length} steps done</span>
              </div>
            </div>

            {/* ── COMPLETION STEPS ── */}
            {incomplete.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  What to fill in next
                </div>
                <div className="space-y-2">
                  {incomplete.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-xl border px-3.5 py-3"
                      style={{ borderColor: "rgba(168,85,247,0.2)", background: "rgba(168,85,247,0.05)" }}
                    >
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-foreground">{item.label}</div>
                        <div className="text-[10px] text-muted-foreground/60 leading-snug">
                          {COMPLETION_BENEFITS[item.label] ?? "Improves your profile"}
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.35)" }}
                      >
                        +{item.pts}%
                      </span>
                    </div>
                  ))}
                  {done.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 opacity-50"
                      style={{ borderColor: "rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.03)" }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <div className="text-xs font-semibold text-muted-foreground line-through">{item.label}</div>
                      <span className="ml-auto text-[10px] font-bold text-emerald-400/70">✓ Done</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── BIO QUICK-FILL TEMPLATES (only if bio is missing) ── */}
            {needsBio && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    ✍️ Bio Quick-Start — tap to copy
                  </div>
                  <div
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)" }}
                  >
                    Edit after pasting
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {BIO_TEMPLATES.map((t, idx) => (
                    <button
                      key={t.archetype}
                      type="button"
                      onClick={() => handleCopy(t.text, idx)}
                      className="text-left rounded-xl border px-3.5 py-3 transition-all active:scale-[0.98] group"
                      style={{
                        background: copiedIdx === idx ? "rgba(52,211,153,0.10)" : t.color,
                        borderColor: copiedIdx === idx ? "rgba(52,211,153,0.5)" : t.border,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{t.emoji}</span>
                          <span className="text-[11px] font-black uppercase tracking-wide text-foreground/80">
                            {t.archetype}
                          </span>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 transition-all"
                          style={
                            copiedIdx === idx
                              ? { background: "rgba(52,211,153,0.2)", color: "#34d399", border: "1px solid rgba(52,211,153,0.4)" }
                              : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }
                          }
                        >
                          {copiedIdx === idx ? "✓ Copied!" : "Copy"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                        {t.text}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/40 text-center leading-snug">
                  Copy a template → go to your bio section → paste and personalise it
                </p>
              </div>
            )}

            {/* ── ALL DONE STATE ── */}
            {incomplete.length === 0 && (
              <div
                className="rounded-2xl p-5 text-center space-y-2"
                style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.3)" }}
              >
                <div className="text-3xl">🏆</div>
                <div className="text-base font-extrabold text-emerald-400 uppercase tracking-wide">Profile Complete!</div>
                <p className="text-xs text-muted-foreground">
                  You're all set — hirers will immediately see a complete, trusted profile when reviewing your bids.
                </p>
              </div>
            )}

          </div>
        </div>

        {/* ── STICKY FOOTER CTAs ───────────────────────────── */}
        <div
          className="shrink-0 px-5 pb-6 pt-3 space-y-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "hsl(var(--card))" }}
        >
          {incomplete.length > 0 && (
            <Button
              onClick={onComplete}
              className="w-full font-black uppercase tracking-wider text-sm text-white"
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%)",
                boxShadow: "0 0 24px rgba(168,85,247,0.35)",
                padding: "14px",
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Complete My Profile Now
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full font-semibold text-muted-foreground/60 hover:text-muted-foreground text-sm"
            style={{ padding: "10px" }}
          >
            {incomplete.length === 0 ? "🎮 Let's Play — Close" : "I'll finish it later"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── PROFILE COMPLETION BANNER ──────────────────────────────── */
const PROFILE_BANNER_KEY = "gb_profile_banner_v2";

function ProfileCompletionBanner({ profile }: { profile: any }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(PROFILE_BANNER_KEY) === "1");
  const { score, items } = computeProfileCompletion(profile);
  const incomplete = items.filter((i) => !i.done);

  if (dismissed || score >= 80) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: "1px solid rgba(168,85,247,0.35)",
        background: "linear-gradient(135deg, rgba(168,85,247,0.07), rgba(34,211,238,0.04))",
        boxShadow: "0 0 30px rgba(168,85,247,0.07)",
      }}
    >
      <div className="h-1 bg-gradient-to-r from-violet-600 via-purple-400 to-cyan-500" />
      <div className="px-5 py-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5"
              style={{ boxShadow: "0 0 12px rgba(168,85,247,0.2)" }}
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-foreground uppercase tracking-wide">
                  Finish Your Profile Setup
                </span>
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(168,85,247,0.2)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.4)" }}
                >
                  {score}% done
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Help other players know you're a reliable squad member — a full profile gets{" "}
                <strong className="text-foreground">more bids and better matches</strong>!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { localStorage.setItem(PROFILE_BANNER_KEY, "1"); setDismissed(true); }}
            className="text-muted-foreground/40 hover:text-muted-foreground shrink-0 mt-0.5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-background/50 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${score}%`, background: "linear-gradient(90deg, #a855f7, #7c3aed)" }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground/50 text-right">
            {score}/80% to unlock Trust badge
          </div>
        </div>

        {/* Incomplete items as chips */}
        <div className="flex flex-wrap gap-1.5">
          {incomplete.map((item) => (
            <span
              key={item.label}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
              style={{
                background: "rgba(168,85,247,0.08)",
                borderColor: "rgba(168,85,247,0.25)",
                color: "rgba(192,132,252,0.9)",
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              <span className="opacity-50">+{item.pts}%</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

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
    body: "Gamerbuddy deducts a 10% platform fee from every completed Quest/Job. You keep 90% of your agreed price. This is clearly shown before every payment release.",
    icon: "💸",
  },
  {
    n: 9,
    title: "Keep All Payments Through Gamerbuddy",
    body: "For everyone's protection, we encourage all transactions to happen through Gamerbuddy's escrow system. Staying on the platform is the safest and most secure option for both hirers and gamers — and it's the simplest way too.",
    icon: "🔐",
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
            <div className="text-sm font-bold text-foreground">Gamer Code of Conduct</div>
            <div className="text-xs text-muted-foreground mt-0.5">Rules for gamers who want to get hired</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70 hidden sm:block">
            {open ? "Collapse" : "Read Rules"}
          </span>
          {open
            ? <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />}
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
                    <span className={`text-xs font-bold ${rule.highlight ? "text-red-300" : "text-foreground"}`}>
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

/* ── GAMING ACCOUNTS SECTION ────────────────────────────────── */
const GAMING_PLATFORM_ORDER = ["steam", "epic", "psn", "xbox", "switch"] as const;

const GAMING_PLATFORM_SVG: Record<string, React.ReactNode> = {
  steam: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.52 4.524-4.52 2.495 0 4.522 2.027 4.522 4.52 0 2.494-2.028 4.519-4.522 4.519h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.662 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z" />
    </svg>
  ),
  epic: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M3 2v20l9-4.5L21 22V2H3zm2 2h14v14.764l-7-3.5-7 3.5V4z" />
    </svg>
  ),
  psn: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M8.985 2.596v17.548l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.181.76.814.76 1.505v5.601c2.556 1.191 4.51-.128 4.51-3.844 0-3.682-1.249-5.423-4.8-6.56-1.095-.33-3.067-.745-5.179-.804M0 18.719c2.886.998 5.817 1.583 8.22 1.744l.003-2.431-6.473-2.096V12.16l6.473 2.005V11.7L2.15 9.747v-3.45L8.22 8.267V5.945C5.237 5.48 2.07 5.015 0 5.787v12.932zm14.655-3.793c-1.696.094-3.475-.202-4.757-.69l-.016 2.466c1.24.506 3.462.733 5.22.608 2.306-.16 4.103-1.086 4.103-3.855 0-2.872-2.16-3.437-4.496-4.066-1.299-.328-1.711-.627-1.711-1.254 0-.635.46-1.062 1.605-1.061 1.177.001 2.368.364 3.517.735l.016-2.415c-.949-.38-2.266-.735-3.555-.74-2.32-.01-4.35.981-4.35 3.67 0 2.594 1.793 3.266 3.963 3.866 1.404.378 2.27.7 2.27 1.488.001.737-.619 1.189-1.814 1.248" />
    </svg>
  ),
  xbox: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M4.102 7.512a9.78 9.78 0 0 1 1.81-2.223s-1.119-1.27-2.694-.344a9.818 9.818 0 0 0-1.6 8.134C2.503 10.762 3.171 8.967 4.102 7.512zm15.798 0c.93 1.455 1.6 3.25 2.482 5.567a9.818 9.818 0 0 0-1.6-8.134c-1.575-.926-2.694.344-2.694.344a9.78 9.78 0 0 1 1.81 2.223zM12 3.993S9.872 2.05 7.227 3.71C7.227 3.71 9.03 4.46 12 7.9c2.97-3.44 4.773-4.19 4.773-4.19C14.128 2.05 12 3.993 12 3.993zM3.804 15.31C5.15 18.608 8.327 21 12 21s6.85-2.392 8.196-5.69C18.658 12.086 15.397 8.4 12 5.14c-3.396 3.26-6.657 6.946-8.196 10.17z" />
    </svg>
  ),
  switch: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M14.176 0H9.824A9.536 9.536 0 0 0 .288 9.537v4.926A9.536 9.536 0 0 0 9.824 24h4.352A9.536 9.536 0 0 0 23.712 14.463V9.537A9.536 9.536 0 0 0 14.176 0zm-4.352 21.408a6.946 6.946 0 0 1-6.936-6.945V9.537a6.946 6.946 0 0 1 6.936-6.945h.697v18.816zm5.353-9.024a1.536 1.536 0 1 1 0-3.073 1.536 1.536 0 0 1 0 3.073zm0-5.76a4.224 4.224 0 1 0 0 8.448 4.224 4.224 0 0 0 0-8.448z" />
    </svg>
  ),
};

function GamingAccountsSection() {
  const { data: accounts = [], isLoading } = useMyGamingAccounts();
  const connect = useConnectGaming();
  const disconnect = useDisconnectGaming();
  const { toast } = useToast();

  const [connecting, setConnecting] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState("");

  const connectedMap = Object.fromEntries(accounts.map((a) => [a.platform, a.username]));
  const connectedCount = accounts.length;

  async function handleConnect(platform: string) {
    const handle = inputVal.trim();
    if (!handle) return;
    try {
      await connect.mutateAsync({ platform, username: handle });
      toast({ title: `${GAMING_PLATFORM_META[platform].label} linked!`, description: handle });
      setConnecting(null);
      setInputVal("");
    } catch (err: any) {
      const msg = err?.error || err?.message || "Please try again.";
      toast({ title: "Failed to link", description: msg, variant: "destructive" });
    }
  }

  async function handleDisconnect(platform: string) {
    try {
      await disconnect.mutateAsync(platform);
      toast({ title: `${GAMING_PLATFORM_META[platform].label} unlinked` });
    } catch {
      toast({ title: "Failed to unlink", variant: "destructive" });
    }
  }

  return (
    <div
      id="gaming-management"
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(34,211,238,0.2)", background: "rgba(10,8,20,0.6)" }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Gamepad2 className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-extrabold text-foreground uppercase tracking-widest">Gaming Accounts</span>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            Connect at least one account to post requests or place bids — reviewed within 24 hours
          </p>
        </div>
        {connectedCount > 0 && (
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span
              className="text-[11px] font-black px-3 py-1 rounded-full"
              style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee" }}
            >
              {connectedCount} / {GAMING_PLATFORM_ORDER.length} Linked
            </span>
          </div>
        )}
      </div>

      {/* Connected quick-links strip */}
      {connectedCount > 0 && (
        <div className="px-5 py-3 flex flex-wrap gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
          {accounts.map((a) => {
            const meta = GAMING_PLATFORM_META[a.platform];
            if (!meta) return null;
            const url = meta.profileUrl?.replace("{username}", a.username);
            const el = (
              <span className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full text-[11px] font-bold"
                style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: "#e2e8f0" }}>
                <span className="w-3.5 h-3.5 shrink-0" style={{ color: "#22d3ee" }}>{GAMING_PLATFORM_SVG[a.platform]}</span>
                <span style={{ color: "#22d3ee" }}>{meta.label}</span>
                <span className="opacity-60 font-mono text-[10px]">{a.username}</span>
              </span>
            );
            return url
              ? <a key={a.platform} href={url} target="_blank" rel="noopener noreferrer" className="hover:brightness-125 hover:scale-105 transition-all">{el}</a>
              : <div key={a.platform}>{el}</div>;
          })}
        </div>
      )}

      {/* Platform cards */}
      <div className="p-4 space-y-2.5">
        {connectedCount === 0 && !isLoading && (
          <div
            className="rounded-xl border px-4 py-3 mb-2 flex items-start gap-2.5"
            style={{ borderColor: "rgba(234,179,8,0.3)", background: "rgba(234,179,8,0.06)" }}
          >
            <span className="text-amber-400 mt-0.5 shrink-0">⚠️</span>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              <strong className="text-amber-300">Link an account to unlock posting & bidding.</strong> Connect Steam, Epic, PSN, Xbox, or Nintendo Switch below. We'll review within <strong className="text-amber-300">24 hours</strong>. Keep your profile Public during review so we can confirm real gaming activity.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[72px] rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : (
          GAMING_PLATFORM_ORDER.map((platform) => {
            const meta = GAMING_PLATFORM_META[platform];
            const username = connectedMap[platform];
            const isConnected = !!username;
            const isThisConnecting = connecting === platform;

            return (
              <div key={platform}>
                <div
                  className="rounded-2xl overflow-hidden transition-all duration-200"
                  style={{
                    border: isConnected
                      ? "1px solid rgba(34,211,238,0.35)"
                      : isThisConnecting
                        ? "1px solid rgba(255,255,255,0.12)"
                        : "1px solid rgba(255,255,255,0.06)",
                    background: isConnected
                      ? "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(0,0,0,0.4))"
                      : "rgba(255,255,255,0.03)",
                    boxShadow: isConnected ? "0 0 20px -8px rgba(34,211,238,0.4)" : "none",
                  }}
                >
                  <div className="flex items-center gap-0">
                    {/* Icon panel */}
                    <div
                      className="w-16 h-16 shrink-0 flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: isConnected ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.04)",
                        borderRight: `1px solid ${isConnected ? "rgba(34,211,238,0.25)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      <div
                        className="relative w-7 h-7"
                        style={{ color: isConnected ? "#22d3ee" : "rgba(255,255,255,0.2)" }}
                      >
                        {GAMING_PLATFORM_SVG[platform]}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 px-4 py-3">
                      <div
                        className="text-sm font-extrabold leading-tight"
                        style={{ color: isConnected ? "#22d3ee" : "rgba(255,255,255,0.65)" }}
                      >
                        {meta.label}
                      </div>
                      {isConnected ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: "#4ade80" }} />
                          <span className="text-[11px] font-mono font-semibold text-green-300 truncate">
                            {username}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground/40 mt-0.5">
                          {isThisConnecting ? "Enter your username/ID below ↓" : "Not linked"}
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
                          onClick={() => { setConnecting(isThisConnecting ? null : platform); setInputVal(""); }}
                          className="text-[11px] font-extrabold uppercase tracking-wide px-3.5 py-1.5 rounded-xl transition-all hover:brightness-110 active:scale-95"
                          style={{
                            background: isThisConnecting ? "rgba(255,255,255,0.06)" : "rgba(34,211,238,0.15)",
                            border: "1px solid rgba(34,211,238,0.3)",
                            color: "#22d3ee",
                          }}
                        >
                          {isThisConnecting ? "Cancel" : "Link"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Input expansion */}
                  {isThisConnecting && (
                    <div
                      className="px-4 pb-3 pt-0 border-t"
                      style={{ borderColor: "rgba(34,211,238,0.12)", background: "rgba(34,211,238,0.04)" }}
                    >
                      <p className="text-[10px] text-cyan-300/50 mt-2 mb-1.5">
                        {platform === "steam" && "Enter your Steam username or custom URL ID (e.g. gabe_newell)"}
                        {platform === "epic" && "Enter your Epic Games display name"}
                        {platform === "psn" && "Enter your PlayStation Network ID (PSN ID)"}
                        {platform === "xbox" && "Enter your Xbox Gamertag"}
                        {platform === "switch" && "Enter your Nintendo Switch Friend Code or display name"}
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={
                            platform === "psn" ? "PSN ID" :
                            platform === "switch" ? "Friend Code or Name" :
                            platform === "xbox" ? "Gamertag" :
                            "Username"
                          }
                          value={inputVal}
                          onChange={(e) => setInputVal(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleConnect(platform)}
                          maxLength={64}
                          className="flex-1 h-9 px-3 text-sm rounded-xl border bg-background/60 focus:outline-none focus:border-cyan-400/50 text-foreground placeholder:text-muted-foreground/40"
                          style={{ borderColor: "rgba(34,211,238,0.25)" }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleConnect(platform)}
                          disabled={!inputVal.trim() || connect.isPending}
                          className="h-9 px-4 text-xs font-bold rounded-xl transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
                          style={{ background: "rgba(34,211,238,0.2)", border: "1px solid rgba(34,211,238,0.4)", color: "#22d3ee" }}
                        >
                          {connect.isPending ? "···" : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
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
            <span className="text-sm font-extrabold text-foreground uppercase tracking-widest">Streaming Channels</span>
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
                    <span className="text-sm font-black text-foreground uppercase tracking-widest">{item.label}</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-foreground">{item.label}</div>
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

function VerificationSection({ idVerified, gamingAccountCount, onJustVerified }: { idVerified: boolean; gamingAccountCount: number; onJustVerified?: () => void }) {
  const verifyId = useVerifyId();
  const { toast } = useToast();

  const handleVerify = () => {
    verifyId.mutate(null, {
      onSuccess: () => {
        toast({ title: "🎉 Review Requested!", description: "We'll check your gaming account within 24 hours. Keep it Public during review!" });
        onJustVerified?.();
      },
      onError: (err: any) => toast({ title: "Request Failed", description: err?.error || "Please try again.", variant: "destructive" }),
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
                <span className="text-sm font-extrabold text-foreground uppercase tracking-wide">Gaming Account Verified</span>
                <VerifiedBadge idVerified={true} variant="compact" />
              </div>
              <p className="text-xs text-emerald-300/70 leading-relaxed">
                Your green Verified badge is active on your profile and all your bids — hirers trust you more.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (gamingAccountCount === 0) {
    return (
      <Card className="border-muted/40 bg-card/60 overflow-hidden">
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #a855f7, #22d3ee)" }} />
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
              <Gamepad2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground mb-0.5">Link a Gaming Account to Start</div>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Connect at least one account (Steam, Epic, PSN, Xbox, or Nintendo Switch) above. We review within <span className="text-foreground font-semibold">24 hours</span> and award your Verified badge once confirmed.
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
              <div className="text-sm font-bold text-foreground mb-0.5">Gaming Account Under Review</div>
              <p className="text-xs text-muted-foreground/70">
                You can <span className="text-emerald-400 font-semibold">post requests and place bids now</span> — your Verified badge appears once we confirm your account.
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
              <><div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin mr-1.5" />Requesting…</>
            ) : (
              <><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Request Review</>
            )}
          </Button>
        </div>
        {/* 24h + keep public tip */}
        <div
          className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
          style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.18)" }}
        >
          <Clock className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="text-[11px] font-semibold text-foreground">Review takes up to 24 hours</span>
            <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
              For faster verification, keep your linked gaming profile <span className="text-primary/90 font-semibold">Public</span> during review so we can confirm real gaming activity. You can make it private again once verified.
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
  const [, setLocation] = useLocation();
  const { data: profile, isLoading } = useUserProfile(user?.id ?? null);
  const { data: myVotes } = useProfileVotes(user?.id ?? null);
  const updateProfile = useUpdateProfile();

  const [editingBio, setEditingBio] = useState(false);
  const [draftBio, setDraftBio] = useState("");
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [confirmDeleteGallery, setConfirmDeleteGallery] = useState<number | null>(null);
  const [confirmDeleteAvatar, setConfirmDeleteAvatar] = useState(false);

  const confirmProfilePhoto = useConfirmProfilePhoto();
  const deleteProfilePhoto = useDeleteProfilePhoto();
  const confirmGalleryPhoto = useConfirmGalleryPhoto();
  const deleteGalleryPhoto = useDeleteGalleryPhoto();

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast({ title: "Images only", variant: "destructive" }); return; }
    if (file.size > 8 * 1024 * 1024) { toast({ title: "Max 8 MB per photo", variant: "destructive" }); return; }
    setAvatarUploading(true);
    try {
      const fileHash = await computeFileHash(file);
      const { uploadURL, objectPath } = await requestPhotoUploadUrl("profile", file, fileHash);
      await uploadFileToPut(uploadURL, file);
      await confirmProfilePhoto.mutateAsync({ objectPath, fileHash });
      toast({ title: "Profile photo updated!", description: "It will be reviewed by our team shortly." });
    } catch (e: any) {
      if (e?.error === "duplicate") {
        toast({ title: "Duplicate photo detected", description: "This photo has already been uploaded. Please use a unique, original photo of yourself.", variant: "destructive" });
      } else {
        toast({ title: "Upload failed", description: e?.message || e?.error || "Please try again.", variant: "destructive" });
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleGalleryUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast({ title: "Images only", variant: "destructive" }); return; }
    if (file.size > 8 * 1024 * 1024) { toast({ title: "Max 8 MB per photo", variant: "destructive" }); return; }
    setGalleryUploading(true);
    try {
      const fileHash = await computeFileHash(file);
      const { uploadURL, objectPath } = await requestPhotoUploadUrl("gallery", file, fileHash);
      await uploadFileToPut(uploadURL, file);
      await confirmGalleryPhoto.mutateAsync({ objectPath, fileHash });
      toast({ title: "Gallery photo added!", description: "It will be reviewed by our team shortly." });
    } catch (e: any) {
      if (e?.error === "duplicate") {
        toast({ title: "Duplicate photo detected", description: "This photo has already been uploaded. Please upload a unique solo photo of yourself.", variant: "destructive" });
      } else {
        toast({ title: "Upload failed", description: e?.message || e?.error || "Please try again.", variant: "destructive" });
      }
    } finally {
      setGalleryUploading(false);
    }
  };

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

  const handleJustVerified = () => setShowSetupModal(true);

  const scrollToSection = (section: string) => {
    const id =
      section === "bio"       ? "profile-bio-section"
      : section === "quest"   ? "profile-quest-section"
      : section === "gaming"  ? "profile-gaming-section"
      : section === "streaming" ? "profile-streaming-section"
      : "profile-basics-section";
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ── POST-VERIFICATION MODAL ── */}
      {showSetupModal && (
        <PostVerificationModal
          profile={profile}
          onClose={() => setShowSetupModal(false)}
          onComplete={() => {
            setShowSetupModal(false);
            const { items } = computeProfileCompletion(profile);
            const first = items.find((i) => !i.done);
            if (first) scrollToSection(first.section);
          }}
        />
      )}

      {/* ── PROFILE COMPLETION BANNER (verified users only) ── */}
      {user.idVerified && profile && <ProfileCompletionBanner profile={profile} />}

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

            {/* Avatar with glow ring + upload overlay + verified dot */}
            <div className="relative shrink-0 group/avatar">
              {/* Hidden file input */}
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ""; }}
              />

              {/* Avatar circle — clickable to upload */}
              <button
                type="button"
                onClick={() => document.getElementById("avatar-file-input")?.click()}
                disabled={avatarUploading}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-card flex items-center justify-center overflow-hidden transition-all duration-200 relative"
                title="Click to change profile photo"
                style={{
                  background: profile?.profilePhotoUrl
                    ? "transparent"
                    : `linear-gradient(135deg, ${bgAccent.replace("0.6", "0.4")}, rgba(0,0,0,0.85))`,
                  boxShadow: `0 0 0 3px ${bgAccent.replace("0.6", "0.18")}, 0 0 36px ${bgAccent}`,
                }}
              >
                {profile?.profilePhotoUrl ? (
                  <img
                    src={`/api/storage${profile.profilePhotoUrl}`}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <span className="text-4xl sm:text-5xl font-black text-white uppercase select-none">
                    {user.name.charAt(0)}
                  </span>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/55 transition-all duration-200 flex items-center justify-center rounded-full">
                  {avatarUploading ? (
                    <div className="opacity-100 h-6 w-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200" />
                  )}
                </div>
              </button>

              {/* Delete avatar button — only if photo set */}
              {profile?.profilePhotoUrl && !avatarUploading && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAvatar(true)}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 border border-card flex items-center justify-center hover:bg-red-500 transition-colors z-10"
                  title="Remove photo"
                >
                  <X className="h-2.5 w-2.5 text-white" />
                </button>
              )}

              {/* Verified badge */}
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

            {/* Delete avatar confirmation */}
            {confirmDeleteAvatar && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                      <Trash2 className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-sm">Remove profile photo?</div>
                      <p className="text-xs text-muted-foreground">Your initial letter will be shown instead.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmDeleteAvatar(false)}>Cancel</Button>
                    <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-500 text-white border-none"
                      disabled={deleteProfilePhoto.isPending}
                      onClick={() => {
                        deleteProfilePhoto.mutate(undefined, {
                          onSuccess: () => { toast({ title: "Photo removed" }); setConfirmDeleteAvatar(false); },
                          onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
                        });
                      }}
                    >
                      {deleteProfilePhoto.isPending ? "Removing…" : "Remove"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
                {/* Likes/dislikes hidden in Phase 1 */}
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
      <VerificationSection
        idVerified={user.idVerified}
        gamingAccountCount={profile?.gamingAccounts?.length ?? 0}
        onJustVerified={handleJustVerified}
      />

      {/* Quest — Phase 3 Coming Soon */}
      <div
        className="rounded-2xl border p-5 flex items-center gap-4"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div
          className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center border"
          style={{ background: "rgba(168,85,247,0.10)", borderColor: "rgba(168,85,247,0.25)" }}
        >
          <span className="text-lg">🗺️</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">My Quest</span>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{
                background: "rgba(168,85,247,0.10)",
                borderColor: "rgba(168,85,247,0.30)",
                color: "#c084fc",
              }}
            >
              Phase 3 · Coming Soon
            </span>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Complete gaming challenges and earn bonus points. Unlocks in a future phase.
          </p>
        </div>
      </div>

      {/* ── BIO / ABOUT ME ── */}
      <span id="profile-bio-section" className="scroll-mt-24" />
      {(() => {
        const charPct = Math.min(100, (draftBio.length / 300) * 100);
        const counterColor =
          draftBio.length >= 280 ? "#f87171" :
          draftBio.length >= 240 ? "#fbbf24" :
          "#a855f7";
        return (
          <div
            className="rounded-2xl overflow-hidden border"
            style={{
              borderColor: editingBio ? "rgba(168,85,247,0.40)" : "rgba(255,255,255,0.07)",
              background: "rgba(8,6,18,0.65)",
              boxShadow: editingBio
                ? "0 0 0 1px rgba(168,85,247,0.14), 0 6px 28px rgba(168,85,247,0.10)"
                : "none",
              transition: "border-color 0.25s, box-shadow 0.25s",
            }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b"
              style={{
                borderColor: "rgba(255,255,255,0.06)",
                background: editingBio ? "rgba(168,85,247,0.07)" : "rgba(255,255,255,0.02)",
                transition: "background 0.25s",
              }}
            >
              {/* Left: icon + label */}
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: editingBio ? "#a855f7" : "rgba(168,85,247,0.55)" }}
                />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/65 truncate">
                  About Me
                </span>
                {/* Char badge — only in view mode when bio exists */}
                {profile?.bio && !editingBio && (
                  <span
                    className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(168,85,247,0.12)",
                      border: "1px solid rgba(168,85,247,0.24)",
                      color: "#c084fc",
                    }}
                  >
                    {profile.bio.length}/300
                  </span>
                )}
              </div>

              {/* Right: actions */}
              {!editingBio ? (
                <button
                  onClick={() => { setDraftBio(profile?.bio ?? ""); setEditingBio(true); }}
                  className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-150 hover:brightness-110 hover:scale-[1.02]"
                  style={{
                    background: "rgba(168,85,247,0.10)",
                    border: "1px solid rgba(168,85,247,0.28)",
                    color: "#c084fc",
                  }}
                >
                  <Edit3 className="h-3 w-3" />
                  <span>{profile?.bio ? "Edit" : "Add Bio"}</span>
                </button>
              ) : (
                <div className="shrink-0 flex items-center gap-1.5">
                  {/* Cancel */}
                  <button
                    onClick={() => setEditingBio(false)}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all duration-150 hover:brightness-110"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "rgba(255,255,255,0.45)",
                    }}
                    title="Cancel"
                  >
                    <X className="h-3 w-3" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                  {/* Save */}
                  <button
                    onClick={handleSaveBio}
                    disabled={updateProfile.isPending}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-150 hover:brightness-110 disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.28), rgba(168,85,247,0.14))",
                      border: "1px solid rgba(168,85,247,0.48)",
                      color: "#c084fc",
                    }}
                    title="Save bio"
                  >
                    <Check className="h-3 w-3" />
                    <span className="hidden sm:inline">
                      {updateProfile.isPending ? "Saving…" : "Save"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* ── Body ── */}
            <div className="px-4 sm:px-5 py-5">
              {editingBio ? (
                <div className="space-y-3">
                  <Textarea
                    value={draftBio}
                    onChange={(e) => setDraftBio(e.target.value)}
                    placeholder="Write a short bio about yourself, your playstyle, favorite games, or what kind of sessions you enjoy..."
                    className="resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-[15px] text-white/85 placeholder:text-white/20 leading-[1.75] w-full min-h-[120px]"
                    maxLength={300}
                    autoFocus
                  />

                  {/* Character progress bar */}
                  <div className="space-y-1.5">
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-150"
                        style={{
                          width: `${charPct}%`,
                          background: `linear-gradient(90deg, #a855f7, ${counterColor})`,
                          boxShadow: `0 0 6px ${counterColor}60`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] transition-colors duration-150"
                        style={{
                          color:
                            draftBio.length >= 280 ? "#f87171" :
                            draftBio.length >= 240 ? "#fbbf24" :
                            "rgba(255,255,255,0.28)",
                        }}
                      >
                        {draftBio.length === 0
                          ? "Start typing…"
                          : draftBio.length >= 280
                          ? "Almost at the limit!"
                          : draftBio.length >= 240
                          ? "Getting close — wrap it up"
                          : draftBio.length < 80
                          ? "Keep going — give a bit more detail"
                          : draftBio.length < 180
                          ? "Looking good!"
                          : "Great bio!"}
                      </span>
                      <span
                        className="text-[11px] font-black tabular-nums transition-colors duration-150"
                        style={{ color: counterColor }}
                      >
                        {draftBio.length}
                        <span className="font-normal text-white/30">/300</span>
                      </span>
                    </div>
                  </div>

                  {/* Tips row */}
                  <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.22)" }}>
                    💡 Tip: mention your <span style={{ color: "rgba(255,255,255,0.4)" }}>timezone</span>, preferred{" "}
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>game genres</span>, and playtimes to attract hirers who are a great fit.
                  </p>
                </div>
              ) : profile?.bio ? (
                /* ── Bio display ── */
                <div
                  className="rounded-xl px-4 py-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(168,85,247,0.04) 0%, rgba(168,85,247,0.01) 100%)",
                    borderLeft: "3px solid rgba(168,85,247,0.35)",
                  }}
                >
                  <p
                    className="whitespace-pre-wrap"
                    style={{
                      fontSize: "15px",
                      lineHeight: "1.9",
                      color: "rgba(255,255,255,0.82)",
                      letterSpacing: "0.012em",
                    }}
                  >
                    {profile.bio}
                  </p>
                </div>
              ) : (
                /* ── Empty state ── */
                <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))",
                      border: "1.5px dashed rgba(168,85,247,0.30)",
                    }}
                  >
                    <Edit3 className="h-5 w-5" style={{ color: "#a855f7", opacity: 0.7 }} />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
                      Your story starts here
                    </p>
                    <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.22)" }}>
                      Share your gaming style, go-to games, and what makes you a great teammate. Hirers love knowing who they're playing with!
                    </p>
                  </div>
                  <button
                    onClick={() => { setDraftBio(""); setEditingBio(true); }}
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all duration-150 hover:brightness-110 hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(168,85,247,0.08))",
                      border: "1px solid rgba(168,85,247,0.32)",
                      color: "#c084fc",
                    }}
                  >
                    <Edit3 className="h-3 w-3" />
                    Write your bio
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── PHOTO GALLERY ── */}
      {(() => {
        const galleryCount = profile?.galleryPhotoUrls?.length ?? 0;
        const meetsMinimum = galleryCount >= 2;
        return (
          <div
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: meetsMinimum ? "rgba(255,255,255,0.07)" : "rgba(245,158,11,0.25)", background: "rgba(8,6,18,0.65)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <Camera className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(168,85,247,0.55)" }} />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/65">Additional Photos</span>
                {/* Minimum progress indicator */}
                <div className="flex items-center gap-1 ml-1">
                  {[0, 1].map((slot) => (
                    <div
                      key={slot}
                      className="h-1.5 w-4 rounded-full transition-colors duration-300"
                      style={{ background: galleryCount > slot ? "#22c55e" : "rgba(245,158,11,0.40)" }}
                    />
                  ))}
                  {[2, 3].map((slot) => (
                    <div
                      key={slot}
                      className="h-1.5 w-4 rounded-full transition-colors duration-300"
                      style={{ background: galleryCount > slot ? "#a855f7" : "rgba(255,255,255,0.10)" }}
                    />
                  ))}
                  <span className={`text-[9px] font-bold ml-1 ${meetsMinimum ? "text-green-400" : "text-amber-400"}`}>
                    {galleryCount}/4 {!meetsMinimum && `(min 2)`}
                  </span>
                </div>
              </div>
              {galleryCount < 4 && (
                <label
                  className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 hover:brightness-110 hover:scale-[1.02]"
                  style={{
                    background: galleryUploading ? "rgba(100,100,100,0.10)" : "rgba(168,85,247,0.10)",
                    border: "1px solid rgba(168,85,247,0.28)",
                    color: galleryUploading ? "#888" : "#c084fc",
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={galleryUploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGalleryUpload(f); e.target.value = ""; }}
                  />
                  {galleryUploading ? (
                    <><div className="h-3 w-3 rounded-full border border-white/20 border-t-white/70 animate-spin" />Uploading…</>
                  ) : (
                    <><ImagePlus className="h-3 w-3" />Add Photo</>
                  )}
                </label>
              )}
            </div>

            {/* Minimum requirement notice */}
            {!meetsMinimum && (
              <div
                className="flex items-start gap-2 px-4 sm:px-5 py-2.5 border-b"
                style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.18)" }}
              >
                <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-300/80 leading-relaxed font-medium">
                  <span className="font-bold text-amber-300">Minimum 2 additional photos required.</span> Please upload real, unique solo photos of yourself. Group photos and duplicate images are not allowed.
                </p>
              </div>
            )}

            {/* Anti-AI / fake photo warning — always visible */}
            <div
              className="flex items-start gap-2 px-4 sm:px-5 py-2.5 border-b"
              style={{ background: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.12)" }}
            >
              <AlertTriangle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-300/75 leading-relaxed">
                <span className="font-bold text-red-300/90">All photos must be real photos of yourself.</span> AI-generated, heavily edited, fake, or duplicate images are strictly prohibited. Using fake or duplicate photos may result in <span className="font-semibold">account suspension.</span>
              </p>
            </div>

            {/* Gallery grid */}
            <div className="p-4 sm:p-5">
              {galleryCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(168,85,247,0.04))",
                      border: "1.5px dashed rgba(245,158,11,0.35)",
                    }}
                  >
                    <Camera className="h-5 w-5 text-amber-400/60" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <p className="text-sm font-bold text-amber-400/70">2 photos required</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.25)" }}>
                      Upload a minimum of 2 solo photos of yourself (max 4). Solo photos only — no group shots. No duplicates.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(profile?.galleryPhotoUrls ?? []).map((url, i) => (
                    <div key={i} className="relative group/gphoto aspect-square rounded-xl overflow-hidden"
                      style={{ border: "1px solid rgba(168,85,247,0.20)", background: "rgba(0,0,0,0.4)" }}
                    >
                      <img
                        src={`/api/storage${url}`}
                        alt={`Gallery ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Needs review badge */}
                      <div
                        className="absolute top-1.5 left-1.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(245,158,11,0.85)", color: "#fff" }}
                      >
                        Under Review
                      </div>
                      {/* Delete overlay */}
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteGallery(i)}
                        className="absolute inset-0 bg-black/0 hover:bg-black/55 transition-all duration-200 flex items-center justify-center opacity-0 group-hover/gphoto:opacity-100"
                      >
                        <div className="h-8 w-8 rounded-full bg-red-600/90 flex items-center justify-center">
                          <Trash2 className="h-4 w-4 text-white" />
                        </div>
                      </button>
                    </div>
                  ))}
                  {/* Add more slot — if under 4 */}
                  {galleryCount < 4 && (
                    <label
                      className="aspect-square rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-150 hover:brightness-125"
                      style={{
                        border: `1.5px dashed ${galleryCount < 2 ? "rgba(245,158,11,0.40)" : "rgba(168,85,247,0.28)"}`,
                        background: galleryCount < 2 ? "rgba(245,158,11,0.04)" : "rgba(168,85,247,0.04)",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={galleryUploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGalleryUpload(f); e.target.value = ""; }}
                      />
                      {galleryUploading ? (
                        <div className="h-4 w-4 rounded-full border border-white/20 border-t-white/70 animate-spin" />
                      ) : (
                        <>
                          <ImagePlus className="h-5 w-5" style={{ color: galleryCount < 2 ? "rgba(245,158,11,0.55)" : "rgba(168,85,247,0.5)" }} />
                          <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: galleryCount < 2 ? "rgba(245,158,11,0.55)" : "rgba(168,85,247,0.5)" }}>
                            {galleryCount < 2 ? "Required" : "Add"}
                          </span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Gallery delete confirmation modal */}
      {confirmDeleteGallery !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <div className="font-bold text-foreground text-sm">Remove this gallery photo?</div>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmDeleteGallery(null)}>Cancel</Button>
              <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-500 text-white border-none"
                disabled={deleteGalleryPhoto.isPending}
                onClick={() => {
                  const idx = confirmDeleteGallery;
                  deleteGalleryPhoto.mutate(idx, {
                    onSuccess: () => { toast({ title: "Photo removed" }); setConfirmDeleteGallery(null); },
                    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
                  });
                }}
              >
                {deleteGalleryPhoto.isPending ? "Removing…" : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOCATION & IDENTITY ── */}
      <span id="profile-basics-section" className="scroll-mt-24" />
      <div
        className="rounded-2xl overflow-hidden border"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(8,6,18,0.65)" }}
      >
        <div
          className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(168,85,247,0.55)" }} />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/65">Location &amp; Identity</span>
          <span className="text-[9px] text-muted-foreground/40 ml-1">(shown on your profile &amp; bids)</span>
        </div>
        <div className="px-4 sm:px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Globe className="h-3 w-3 text-amber-400" /> Your Nation
            </label>
            <CountryCombobox
              value={profile?.country ?? "any"}
              onValueChange={(val) =>
                updateProfile.mutate(
                  { country: val === "any" ? null : val },
                  {
                    onSuccess: () => toast({ title: "Country updated!" }),
                    onError: (err: any) => toast({ title: "Failed", description: err?.error || "Error", variant: "destructive" }),
                  }
                )
              }
            />
            {profile?.country && profile.country !== "any" && (
              <p className="text-[10px] text-muted-foreground/50">
                Currently: {COUNTRY_MAP[profile.country]?.flag} {COUNTRY_MAP[profile.country]?.label}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <UserRound className="h-3 w-3 text-pink-400" /> Your Gender
            </label>
            <GenderSelect
              value={profile?.gender ?? "any"}
              onValueChange={(val) =>
                updateProfile.mutate(
                  { gender: val === "any" ? null : val },
                  {
                    onSuccess: () => toast({ title: "Gender updated!" }),
                    onError: (err: any) => toast({ title: "Failed", description: err?.error || "Error", variant: "destructive" }),
                  }
                )
              }
            />
            {profile?.gender && profile.gender !== "any" && (
              <p className="text-[10px] text-muted-foreground/50">
                Currently: {GENDER_MAP[profile.gender]?.icon} {GENDER_MAP[profile.gender]?.label}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CONNECTED GAMING ACCOUNTS */}
      <span id="profile-gaming-section" className="scroll-mt-24" />
      <GamingAccountsSection />

      {/* CONNECTED STREAMING PLATFORMS */}
      <span id="profile-streaming-section" className="scroll-mt-24" />
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
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /> Reviews Received
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {profile?.avgRating != null && (
                  <span className="flex items-center gap-1 text-xs font-black text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/30">
                    <Star className="w-3 h-3 fill-yellow-400" />
                    {profile.avgRating.toFixed(1)}/10
                    <span className="text-muted-foreground font-normal">({profile.reviewCount} review{profile.reviewCount !== 1 ? "s" : ""})</span>
                  </span>
                )}
                {(profile as any)?.wouldPlayAgainPercent != null && (
                  <span
                    className="flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border"
                    style={
                      (profile as any).wouldPlayAgainPercent >= 75
                        ? { color: "#4ade80", background: "rgba(74,222,128,0.1)", borderColor: "rgba(74,222,128,0.3)" }
                        : (profile as any).wouldPlayAgainPercent >= 50
                        ? { color: "#facc15", background: "rgba(250,204,21,0.1)", borderColor: "rgba(250,204,21,0.3)" }
                        : { color: "#f87171", background: "rgba(248,113,113,0.1)", borderColor: "rgba(248,113,113,0.3)" }
                    }
                  >
                    👍 {(profile as any).wouldPlayAgainPercent}% would play again
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {profile?.reviews?.map((r) => {
              const wpaColors: Record<string, { color: string; icon: string; label: string }> = {
                yes:   { color: "#4ade80", icon: "👍", label: "Would play again" },
                maybe: { color: "#facc15", icon: "🤔", label: "Maybe again" },
                no:    { color: "#f87171", icon: "👎", label: "Wouldn't play again" },
              };
              const wpa = r.wouldPlayAgain ? wpaColors[r.wouldPlayAgain] : null;
              return (
                <div key={r.id} className="rounded-xl border border-border bg-background/50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{r.reviewerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {wpa && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ color: wpa.color, background: `${wpa.color}18`, border: `1px solid ${wpa.color}44` }}>
                          <span>{wpa.icon}</span>
                          <span>{wpa.label}</span>
                        </span>
                      )}
                      <ScoreBadge rating={r.rating} />
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-foreground/75 leading-relaxed pl-9 border-l-2 border-border/40">{r.comment}</p>}
                  <div className="text-xs text-muted-foreground pl-9">{format(new Date(r.createdAt), "MMM d, yyyy")}</div>
                </div>
              );
            })}
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
