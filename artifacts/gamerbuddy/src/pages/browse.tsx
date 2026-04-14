import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  useBrowseRequests, usePlaceBid,
  type GameRequest,
} from "@/lib/bids-api";
import { countryLabel, COUNTRY_MAP, GENDER_MAP } from "@/lib/geo-options";
import { CountryCombobox, GenderSelect } from "@/components/country-combobox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import {
  Search, Swords, Monitor, Layers, Gavel, ArrowRight,
  ChevronDown, ChevronUp, DollarSign, MessageSquare,
  CheckCircle2, AlertCircle, User, Clock, TrendingDown, TrendingUp,
  Zap, ExternalLink, LogIn, Trophy, Shield, Star,
  Flame, Target, Users, X, SlidersHorizontal, Tv, Sparkles,
  ArrowDownUp, ArrowUp, ArrowDown, Globe, UserRound, ShieldAlert,
} from "lucide-react";
import { SafetyBanner } from "@/components/safety-banner";
import { useToast } from "@/hooks/use-toast";
import { VerifiedBadge } from "@/components/verified-badge";
import { ReportButton } from "@/components/report-modal";

/* ── SKILL CONFIG ────────────────────────────────────────────────────────── */
const SKILL_CONFIG: Record<string, { border: string; text: string; bg: string; glow: string; bar: string }> = {
  Beginner:     { border: "border-green-500/40",  text: "text-green-400",  bg: "bg-green-500/10",  glow: "rgba(34,197,94,0.15)",   bar: "#22c55e" },
  Intermediate: { border: "border-yellow-500/40", text: "text-yellow-400", bg: "bg-yellow-500/10", glow: "rgba(234,179,8,0.15)",    bar: "#eab308" },
  Expert:       { border: "border-primary/40",    text: "text-primary",    bg: "bg-primary/10",    glow: "rgba(168,85,247,0.2)",    bar: "#a855f7" },
  Chill:        { border: "border-cyan-500/40",   text: "text-cyan-400",   bg: "bg-cyan-500/10",   glow: "rgba(34,211,238,0.15)",   bar: "#22d3ee" },
};
const DEFAULT_SKILL = { border: "border-primary/30", text: "text-primary", bg: "bg-primary/10", glow: "rgba(168,85,247,0.15)", bar: "#a855f7" };

const PLATFORMS = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Steam Deck", "iOS", "Android"];
const SKILLS = ["Beginner", "Intermediate", "Expert", "Chill"];

const PLATFORM_ICON: Record<string, string> = {
  PC: "🖥️", PlayStation: "🎮", Xbox: "🟩", "Nintendo Switch": "🕹️",
  "Steam Deck": "🎲", iOS: "📱", Android: "🤖",
};

/* ── CONDUCT REMINDER ───────────────────────────────────────────────────── */
const BID_CONDUCT_HIGHLIGHTS = [
  { icon: "😊", text: "Be friendly and positive — no toxicity or negativity" },
  { icon: "🔒", text: "Never ask for account passwords — instant ban if you do" },
  { icon: "✅", text: "Complete the session honestly and meet the agreed objectives" },
];

function BidConductReminder() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 gap-3 hover:bg-amber-500/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] font-semibold text-amber-300/90">
            By bidding, you agree to follow the Gamer Code of Conduct
          </span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-amber-400/60 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-amber-400/60 shrink-0" />}
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 space-y-2 border-t border-amber-500/15">
          <div className="space-y-1.5 pt-2.5">
            {BID_CONDUCT_HIGHLIGHTS.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <span className="text-xs shrink-0">{r.icon}</span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-red-500/8 border border-red-500/20 px-2.5 py-2 mt-1">
            <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-300/80 leading-relaxed">
              Breaking any rule may result in <span className="font-semibold text-red-300">immediate account suspension</span> and loss of earnings. Full rules on your Profile page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SKELETON ────────────────────────────────────────────────────────────── */
function RequestCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/25 bg-card/30 overflow-hidden animate-pulse">
      <div className="h-[2px] w-full bg-primary/10" />
      <div className="flex">
        <div className="w-[3px] shrink-0 bg-primary/15" />
        <div className="flex-1 px-6 py-7 md:px-8 md:py-8">
          <div className="flex items-start gap-6">
            {/* Avatar placeholder */}
            <Skeleton className="hidden sm:block w-16 h-16 rounded-2xl shrink-0" />
            {/* Content */}
            <div className="flex-1 space-y-4 min-w-0">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-lg" />
                <Skeleton className="h-6 w-28 rounded-lg" />
              </div>
            </div>
            {/* CTA placeholder */}
            <div className="shrink-0 sm:min-w-[156px] space-y-3 hidden sm:flex sm:flex-col">
              <Skeleton className="h-13 w-full rounded-xl" style={{ height: 52 }} />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── QUICK BID PANEL ─────────────────────────────────────────────────────── */
type BidFormState = "idle" | "submitting" | "success" | "error";

function QuickBidPanel({ req, onClose }: { req: GameRequest; onClose: () => void }) {
  const { user } = useAuth();
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [, setLocation] = useLocation();
  const [state, setState] = useState<BidFormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const placeBid = usePlaceBid();

  if (!user) {
    return (
      <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 flex flex-col sm:flex-row items-center gap-4">
        <LogIn className="h-8 w-8 text-amber-400 shrink-0" />
        <div className="flex-1 text-center sm:text-left">
          <div className="font-bold text-amber-300 text-sm">Log in to place a bid</div>
          <div className="text-xs text-muted-foreground mt-0.5">Create a free account to start earning.</div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setLocation("/login")} className="text-xs">Log In</Button>
          <Button size="sm" onClick={() => setLocation("/signup")} className="bg-primary text-xs">Sign Up</Button>
        </div>
      </div>
    );
  }

  if (!user.idVerified) {
    return (
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/6 p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="font-bold text-amber-300 text-sm">Almost verified — hang tight! 🎮</div>
          <div className="text-xs text-muted-foreground mt-0.5">Verification is almost complete! Once you're verified (usually 7–15 days), you'll be able to place bids and join epic sessions.</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setLocation("/profile")} className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10 shrink-0">
          Check Status
        </Button>
      </div>
    );
  }

  if (user.id === req.userId) {
    return (
      <div className="mt-4 rounded-xl border border-border/40 bg-background/30 p-4 text-sm text-muted-foreground text-center">
        This is your own request — manage it from <Link href="/my-requests" className="text-primary hover:underline">My Requests</Link>.
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/5 p-6 flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-400" strokeWidth={1.5} />
        </div>
        <div>
          <div className="font-extrabold text-green-400 text-lg">Bid Placed!</div>
          <div className="text-xs text-muted-foreground mt-1">The hirer will review your pitch and may accept your bid.</div>
        </div>
        <div className="flex gap-2 mt-1">
          <Button size="sm" variant="outline" className="text-xs" onClick={onClose}>Back to Browse</Button>
          <Button size="sm" className="bg-primary text-xs" onClick={() => setLocation(`/requests/${req.id}`)}>
            View Request <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  const priceNum = parseFloat(price);
  const priceValid = !isNaN(priceNum) && priceNum >= 1 && priceNum <= 9999;
  const messageValid = message.trim().length >= 10;
  const canSubmit = priceValid && messageValid && state !== "submitting";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setState("submitting");
    setErrorMsg("");
    try {
      await placeBid.mutateAsync({ requestId: req.id, price: priceNum, message: message.trim() });
      setState("success");
    } catch (err: any) {
      const msg: string = err?.error || err?.message || "";
      if (msg.toLowerCase().includes("already placed a bid")) {
        setState("error"); setErrorMsg("already_bid");
      } else {
        setState("error"); setErrorMsg(msg || "Failed to place bid. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-5 space-y-4"
      style={{ boxShadow: "0 0 24px rgba(168,85,247,0.07) inset" }}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
        <Gavel className="h-3.5 w-3.5" /> Place Your Bid
      </div>

      {req.lowestBid && (
        <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-500/5 border border-cyan-500/20 rounded-lg px-3 py-2">
          <TrendingDown className="h-3.5 w-3.5 shrink-0" />
          Lowest current bid: <span className="font-bold text-white ml-1">${req.lowestBid.toFixed(2)}</span>
          <span className="text-muted-foreground ml-1">— bid lower to stand out</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your Price (USD) *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number" min="1" max="9999" step="0.01" placeholder="e.g. 15.00"
              value={price}
              onChange={(e) => { setPrice(e.target.value); if (state === "error") setState("idle"); }}
              className={`pl-9 bg-background/60 font-mono text-sm ${price && !priceValid ? "border-red-500/50" : price && priceValid ? "border-green-500/40" : ""}`}
              required
            />
          </div>
          {price && !priceValid && <p className="text-[10px] text-red-400">Enter a price between $1 and $9,999</p>}
          {price && priceValid && (
            <p className="text-[10px] text-muted-foreground">
              You earn <span className="text-green-400 font-bold">${(priceNum * 0.9).toFixed(2)}</span> after 10% platform fee
            </p>
          )}
        </div>
        <div className="space-y-1.5 flex flex-col justify-end">
          <div className="rounded-xl border border-border/40 bg-background/30 p-3 text-xs space-y-1.5">
            <div className="font-bold text-white text-[11px] flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-amber-400" /> Tips to win this bid
            </div>
            <ul className="text-muted-foreground space-y-0.5 text-[10px]">
              <li>• Mention your rank / experience</li>
              <li>• Keep your price competitive</li>
              <li>• Show enthusiasm for the game</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Your Pitch * <span className="normal-case tracking-normal text-muted-foreground/60">(min 10 chars)</span>
        </Label>
        <Textarea
          placeholder="Introduce yourself — rank, experience, play style, availability…"
          value={message}
          onChange={(e) => { setMessage(e.target.value); if (state === "error") setState("idle"); }}
          className={`bg-background/60 text-sm min-h-[90px] resize-none ${message && !messageValid ? "border-red-500/50" : message && messageValid ? "border-green-500/40" : ""}`}
          required
        />
        <div className="flex justify-between items-center">
          {message && !messageValid && <p className="text-[10px] text-red-400">Pitch too short — tell them more about yourself</p>}
          <div className="ml-auto text-[10px] text-muted-foreground/50">{message.length} chars</div>
        </div>
      </div>

      {state === "error" && errorMsg === "already_bid" && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0" />
          <div className="flex-1">
            <div className="font-bold text-cyan-400 text-sm">You already bid on this request</div>
            <div className="text-xs text-muted-foreground mt-0.5">Track your bid status from the full request page.</div>
          </div>
          <Button size="sm" variant="outline" className="text-xs border-cyan-500/40 text-cyan-400 shrink-0" onClick={() => setLocation(`/requests/${req.id}`)}>
            View Bid <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </div>
      )}
      {state === "error" && errorMsg !== "already_bid" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {errorMsg}
        </div>
      )}

      <BidConductReminder />

      <div className="flex flex-wrap gap-2.5 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-10">Cancel</Button>
        <Button
          type="submit" size="sm" disabled={!canSubmit}
          className="bg-primary hover:bg-primary/90 flex-1 min-w-[140px] font-bold uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 h-10"
        >
          {state === "submitting" ? (
            <span className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Submitting…
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Gavel className="h-3.5 w-3.5" />
              Submit Bid {price && priceValid ? `· $${priceNum.toFixed(2)}` : ""}
            </span>
          )}
        </Button>
        <Button
          type="button" size="sm" variant="outline"
          className="text-xs border-primary/30 text-primary hover:bg-primary hover:text-white h-10"
          onClick={() => setLocation(`/requests/${req.id}`)}
        >
          Full Details <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </form>
  );
}

/* ── GAME AVATAR ─────────────────────────────────────────────────────────── */
function GameAvatar({ name, bar }: { name: string; bar: string }) {
  const letter = name.trim()[0]?.toUpperCase() ?? "G";
  return (
    <div
      className="w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-2xl flex items-center justify-center text-2xl font-black select-none"
      style={{
        background: `linear-gradient(135deg, ${bar}22 0%, ${bar}44 100%)`,
        border: `1.5px solid ${bar}55`,
        color: bar,
        textShadow: `0 0 12px ${bar}`,
      }}
    >
      {letter}
    </div>
  );
}

/* ── REQUEST CARD ────────────────────────────────────────────────────────── */
function RequestCard({ req }: { req: GameRequest }) {
  const [expanded, setExpanded] = useState(false);
  const [, setLocation] = useLocation();

  const skill = SKILL_CONFIG[req.skillLevel] ?? DEFAULT_SKILL;
  const isZeroBids = req.bidCount === 0;
  const hasContextTags = req.isBulkHiring
    || (req.preferredCountry && req.preferredCountry !== "any")
    || (req.preferredGender && req.preferredGender !== "any")
    || isZeroBids;

  return (
    <div
      className={`group rounded-2xl border overflow-hidden transition-[transform,border-color,box-shadow] duration-[280ms] will-change-transform ${
        expanded
          ? "border-primary/50 shadow-[0_8px_48px_rgba(168,85,247,0.22)] translate-y-0"
          : "border-border/35 hover:border-primary/40 hover:-translate-y-[3px] hover:shadow-[0_10px_44px_rgba(168,85,247,0.18)]"
      }`}
      style={{
        background: expanded
          ? `linear-gradient(145deg, ${skill.bar}0e 0%, rgba(0,0,0,0.72) 100%)`
          : `linear-gradient(145deg, rgba(255,255,255,0.022) 0%, rgba(0,0,0,0.52) 100%)`,
        transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }}
    >
      {/* Top skill-color accent line */}
      <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${skill.bar} 35%, ${skill.bar} 65%, transparent 100%)` }} />

      <div className="flex">
        {/* Left skill bar */}
        <div className="w-[3px] shrink-0" style={{ background: `linear-gradient(180deg, ${skill.bar} 0%, ${skill.bar}28 100%)` }} />

        {/* Card body */}
        <div className="flex-1 px-4 py-5 sm:px-6 sm:py-7 md:px-8 md:py-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">

            {/* Game avatar — desktop only */}
            <div className="hidden sm:block shrink-0">
              <GameAvatar name={req.gameName} bar={skill.bar} />
            </div>

            {/* ── Center column ── */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Row 1: Badges — on mobile, avatar sits inline with badges */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Mobile-only avatar (small) */}
                <div
                  className="sm:hidden w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 select-none"
                  style={{
                    background: `linear-gradient(135deg, ${skill.bar}22 0%, ${skill.bar}44 100%)`,
                    border: `1.5px solid ${skill.bar}55`,
                    color: skill.bar,
                  }}
                >
                  {req.gameName.trim()[0]?.toUpperCase() ?? "G"}
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs border border-border/40 rounded-full px-3 py-1 font-semibold text-muted-foreground/70 bg-white/[0.025]">
                  <span className="text-sm leading-none">{PLATFORM_ICON[req.platform] ?? "🎮"}</span>
                  {req.platform}
                </span>
                <span className={`inline-flex items-center text-xs border rounded-full px-3 py-1 font-bold tracking-wide ${skill.border} ${skill.text} ${skill.bg}`}>
                  {req.skillLevel}
                </span>
              </div>

              {/* Row 2: Game title + poster */}
              <div>
                <h3
                  className="text-[1.5rem] sm:text-[1.65rem] md:text-[1.9rem] font-black text-white cursor-pointer tracking-tight transition-colors duration-200 group-hover:text-primary/90"
                  style={{ letterSpacing: "-0.035em", lineHeight: 1.15 }}
                  onClick={() => setLocation(`/requests/${req.id}`)}
                >
                  {req.gameName}
                </h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="text-primary/90 font-bold">{req.userName}</span>
                    <VerifiedBadge idVerified={req.userIdVerified ?? false} variant="icon" />
                    <ReportButton userId={req.userId} userName={req.userName} variant="icon" />
                  </span>
                  <span className="text-muted-foreground/20 text-xs select-none">·</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/40">
                    <Clock className="h-3 w-3 shrink-0" />
                    {format(new Date(req.createdAt), "MMM d")}
                  </span>
                </div>
              </div>

              {/* Row 3: Objectives */}
              <p
                className="text-[0.875rem] text-foreground/60 leading-[1.75] line-clamp-2 pl-3.5"
                style={{ borderLeft: `2px solid ${skill.bar}50` }}
              >
                {req.objectives}
              </p>

              {/* Row 4: Context tags (only when relevant) */}
              {hasContextTags && (
                <div className="flex flex-wrap items-center gap-2">
                  {req.isBulkHiring && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/10 border border-purple-500/25 text-purple-300/90 rounded-full px-2.5 py-1 font-bold uppercase tracking-wider">
                      <Users className="h-2.5 w-2.5" /> Bulk · {req.bulkGamersNeeded} slots
                    </span>
                  )}
                  {req.preferredCountry && req.preferredCountry !== "any" && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/8 border border-amber-500/20 text-amber-300/80 rounded-full px-2.5 py-1 font-semibold">
                      {COUNTRY_MAP[req.preferredCountry]?.flag} {COUNTRY_MAP[req.preferredCountry]?.label ?? req.preferredCountry}
                    </span>
                  )}
                  {req.preferredGender && req.preferredGender !== "any" && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-pink-500/8 border border-pink-500/18 text-pink-300/80 rounded-full px-2.5 py-1 font-semibold">
                      {GENDER_MAP[req.preferredGender]?.label ?? req.preferredGender}
                    </span>
                  )}
                  {isZeroBids && !req.isBulkHiring && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 border border-green-500/25 text-green-400/90 rounded-full px-2.5 py-1 font-bold uppercase tracking-wider">
                      <Flame className="h-2.5 w-2.5" /> First bid!
                    </span>
                  )}
                </div>
              )}

              {/* Row 5: Bid stats (compact pills) */}
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
                  style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}
                >
                  <Gavel className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                  <span className="font-semibold text-white/70">
                    {isZeroBids ? "No bids yet" : `${req.bidCount} bid${req.bidCount === 1 ? "" : "s"}`}
                  </span>
                  {isZeroBids && <span className="text-muted-foreground/35">— be first!</span>}
                </div>
                {req.isBulkHiring && (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
                    style={{ borderColor: "rgba(168,85,247,0.18)", background: "rgba(168,85,247,0.05)" }}
                  >
                    <Users className="h-3 w-3 text-purple-400/55 shrink-0" />
                    <span className="text-purple-300/75">
                      <span className="font-bold">{req.acceptedBidsCount}</span>
                      <span className="text-purple-400/40">/{req.bulkGamersNeeded}</span>
                      <span className="ml-1">filled</span>
                    </span>
                    {(req.bulkGamersNeeded ?? 0) - (req.acceptedBidsCount ?? 0) > 0 && (
                      <span className="text-[11px] text-emerald-400/85 font-bold">
                        · {(req.bulkGamersNeeded ?? 0) - (req.acceptedBidsCount ?? 0)} left
                      </span>
                    )}
                  </div>
                )}
                {req.lowestBid && (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
                    style={{ borderColor: "rgba(34,211,238,0.14)", background: "rgba(34,211,238,0.03)" }}
                  >
                    <TrendingDown className="h-3 w-3 text-cyan-400/55 shrink-0" />
                    <span className="text-muted-foreground/55">
                      Lowest <span className="font-bold text-white/70">${req.lowestBid.toFixed(2)}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right CTA column ── */}
            <div className="flex flex-col items-stretch gap-3 shrink-0 sm:min-w-[156px]">
              {/* PLACE BID */}
              <div className="relative">
                {!expanded && (
                  <div
                    className="absolute -inset-[4px] rounded-[16px] opacity-50"
                    style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", filter: "blur(10px)" }}
                  />
                )}
                <button
                  onClick={() => setExpanded(!expanded)}
                  className={`relative w-full flex items-center justify-center gap-2 rounded-xl font-black text-sm px-5 py-4 transition-all duration-200 uppercase tracking-widest whitespace-nowrap ${
                    expanded
                      ? "bg-primary/10 text-primary border border-primary/35"
                      : "text-white border border-primary/50"
                  }`}
                  style={
                    !expanded
                      ? { background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)", boxShadow: "0 0 28px rgba(168,85,247,0.52), inset 0 1px 0 rgba(255,255,255,0.12)" }
                      : {}
                  }
                >
                  <Gavel className="h-4 w-4 shrink-0" />
                  {expanded ? "Cancel" : "Place Bid"}
                  {expanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                </button>
              </div>

              {/* Full Details */}
              <button
                onClick={() => setLocation(`/requests/${req.id}`)}
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/55 hover:text-primary/90 transition-colors font-semibold whitespace-nowrap px-3 py-2.5 rounded-xl border border-border/25 hover:border-primary/22 hover:bg-primary/5"
              >
                Full Details <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>
          </div>

          {/* Inline bid panel */}
          {expanded && <QuickBidPanel req={req} onClose={() => setExpanded(false)} />}
        </div>
      </div>
    </div>
  );
}

/* ── EMPTY STATE ─────────────────────────────────────────────────────────── */
function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  const [, setLocation] = useLocation();
  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl border border-dashed border-border/50 p-12 text-center"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.04) 0%, transparent 70%)" }}
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <Swords className="h-9 w-9 text-primary/40" />
        </div>
        <h3 className="text-xl font-extrabold uppercase tracking-wide text-muted-foreground/60 mb-2">
          {hasFilters ? "No Matching Requests" : "No Open Requests Yet"}
        </h3>
        <p className="text-sm text-muted-foreground/50 max-w-sm mx-auto">
          {hasFilters
            ? "Try different keywords or clear your filters to see all requests."
            : "Be the first! Post a request and get bids from skilled gamers within minutes."}
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          {hasFilters && (
            <Button variant="outline" size="sm" className="text-xs" onClick={onClear}>Clear Filters</Button>
          )}
          <Button size="sm" className="bg-primary text-white text-xs shadow-[0_0_16px_rgba(168,85,247,0.3)]" onClick={() => setLocation("/post-request")}>
            Post a Request
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── FILLER SECTION ──────────────────────────────────────────────────────── */
function FillerSection() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const steps = [
    { num: "01", icon: <Search className="h-6 w-6" />, color: "#a855f7", title: "Browse Missions", desc: "Find game requests that match your skills, platform, and schedule. Use filters to zero in fast." },
    { num: "02", icon: <Gavel className="h-6 w-6" />, color: "#22d3ee", title: "Place Your Bid", desc: "Set your price and pitch yourself directly — no middlemen, no agency cuts." },
    { num: "03", icon: <Trophy className="h-6 w-6" />, color: "#facc15", title: "Play & Get Paid", desc: "Complete the session, collect your review, and withdraw earnings straight to your account." },
  ];

  return (
    <div className="space-y-6 pt-4">
      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px" style={{ background: "rgba(168,85,247,0.12)" }} />
        <span className="text-[10px] text-muted-foreground/30 uppercase tracking-[0.22em] font-black">How it works</span>
        <div className="flex-1 h-px" style={{ background: "rgba(168,85,247,0.12)" }} />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border p-6 flex flex-col gap-4"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.018) 0%, rgba(0,0,0,0.45) 100%)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: `${s.color}18`, border: `1px solid ${s.color}35`, color: s.color }}
              >
                {s.icon}
              </div>
              <span
                className="font-black tabular-nums leading-none"
                style={{ fontSize: 28, color: `${s.color}20`, letterSpacing: "-0.04em" }}
              >
                {s.num}
              </span>
            </div>
            <div>
              <div className="text-sm font-extrabold text-white tracking-tight mb-1.5">{s.title}</div>
              <div className="text-xs text-muted-foreground/55 leading-relaxed">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA banner */}
      <div
        className="rounded-2xl border p-6 sm:p-7 flex flex-col sm:flex-row items-center gap-5 justify-between"
        style={{
          background: "linear-gradient(145deg, rgba(168,85,247,0.07) 0%, rgba(0,0,0,0.4) 100%)",
          borderColor: "rgba(168,85,247,0.18)",
        }}
      >
        <div className="text-center sm:text-left">
          <div className="font-extrabold text-white text-lg tracking-tight">Need a skilled teammate?</div>
          <div className="text-sm text-muted-foreground/60 mt-1">Post your game request and get bids from verified gamers within minutes.</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!user && (
            <Button variant="outline" size="sm" onClick={() => setLocation("/login")} className="text-xs border-primary/30 text-primary/80">
              Log In
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setLocation(user ? "/post-request" : "/signup")}
            className="bg-primary text-white font-bold uppercase tracking-wider text-xs px-5 shadow-[0_0_22px_rgba(168,85,247,0.35)] hover:shadow-[0_0_32px_rgba(168,85,247,0.5)] transition-shadow"
          >
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            {user ? "Post a Request" : "Get Started Free"}
          </Button>
        </div>
      </div>

      {/* Trust strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2.5 pb-2">
        {[
          { icon: <Shield className="h-3.5 w-3.5" style={{ color: "#4ade80" }} />, text: "Verified gamers only" },
          { icon: <Star className="h-3.5 w-3.5" style={{ color: "#facc15" }} />, text: "Rated after every session" },
          { icon: <Users className="h-3.5 w-3.5 text-primary" />, text: "2,450+ gamers registered" },
          { icon: <Target className="h-3.5 w-3.5" style={{ color: "#22d3ee" }} />, text: "Escrow-secured payments" },
        ].map((t) => (
          <div key={t.text} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 font-medium">
            {t.icon} {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sort / filter types ─────────────────────────────────────────────────── */
type BrowseSortKey =
  | "newest" | "bid_low" | "bid_high"
  | "trust_high" | "rating_high"
  | "fewest_bids" | "most_bids";

const SORT_OPTIONS: { value: BrowseSortKey; label: string; Icon: React.ElementType }[] = [
  { value: "newest",      label: "Newest",        Icon: Clock },
  { value: "bid_low",     label: "Bid ↓ Low",     Icon: TrendingDown },
  { value: "bid_high",    label: "Bid ↑ High",    Icon: TrendingUp },
  { value: "trust_high",  label: "Trust High",    Icon: Shield },
  { value: "rating_high", label: "Rating High",   Icon: Star },
  { value: "fewest_bids", label: "Fewest Bids",   Icon: ArrowDown },
  { value: "most_bids",   label: "Most Bids",     Icon: ArrowUp },
];

const LEVEL_OPTIONS = [
  { value: "all",          label: "All Levels",        dot: "rgba(255,255,255,0.25)" },
  { value: "Beginner",     label: "Beginner-Friendly", dot: "#22c55e" },
  { value: "Intermediate", label: "Decent",            dot: "#eab308" },
  { value: "Expert",       label: "Best / Expert",     dot: "#a855f7" },
  { value: "Chill",        label: "Chill",             dot: "#22d3ee" },
];

/* ── MAIN PAGE ───────────────────────────────────────────────────────────── */
export default function Browse() {
  const [search, setSearch]                   = useState("");
  const [platform, setPlatform]               = useState("all");
  const [sort, setSort]                       = useState<BrowseSortKey>("newest");
  const [levelFilter, setLevelFilter]         = useState("all");
  const [verifiedPosterOnly, setVerifiedPosterOnly] = useState(false);
  const [bulkOnly, setBulkOnly]               = useState(false);
  const [noBidsOnly, setNoBidsOnly]           = useState(false);
  const [hasStreamingFilter, setHasStreamingFilter] = useState(false);
  const [hasQuestFilter, setHasQuestFilter]   = useState(false);
  const [countryFilter, setCountryFilter]     = useState("any");
  const [genderFilter, setGenderFilter]       = useState("any");

  const { data: allRequests, isLoading, isError } = useBrowseRequests({ status: "open" });

  /* ── Client-side filter + sort ── */
  const requests = allRequests
    ?.filter((r) => {
      if (search.trim() && !(
        r.gameName.toLowerCase().includes(search.toLowerCase()) ||
        r.objectives.toLowerCase().includes(search.toLowerCase()) ||
        r.userName.toLowerCase().includes(search.toLowerCase())
      )) return false;
      if (platform !== "all" && r.platform !== platform) return false;
      if (levelFilter !== "all" && r.skillLevel !== levelFilter) return false;
      if (verifiedPosterOnly && !r.userIdVerified) return false;
      if (bulkOnly && !r.isBulkHiring) return false;
      if (noBidsOnly && r.bidCount > 0) return false;
      if (hasStreamingFilter && !r.hasStreamingBidder) return false;
      if (hasQuestFilter && !r.hasQuestBidder) return false;
      if (countryFilter !== "any" && r.preferredCountry !== "any" && r.preferredCountry !== countryFilter) return false;
      if (genderFilter !== "any" && r.preferredGender !== "any" && r.preferredGender !== genderFilter) return false;
      return true;
    })
    ?.sort((a, b) => {
      switch (sort) {
        case "bid_low": {
          const aB = a.lowestBid ?? Infinity; const bB = b.lowestBid ?? Infinity;
          return aB - bB;
        }
        case "bid_high": {
          const aB = a.lowestBid ?? -Infinity; const bB = b.lowestBid ?? -Infinity;
          return bB - aB;
        }
        case "trust_high":  return (b.avgBidderTrustFactor ?? 0) - (a.avgBidderTrustFactor ?? 0);
        case "rating_high": return (b.avgBidderRating ?? 0) - (a.avgBidderRating ?? 0);
        case "fewest_bids": return a.bidCount - b.bidCount;
        case "most_bids":   return b.bidCount - a.bidCount;
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  /* ── Active tags ── */
  type FilterTag = { id: string; label: string; onRemove: () => void; rgb: string; Icon: React.ElementType };
  const activeTags: FilterTag[] = [];
  if (search.trim())           activeTags.push({ id: "search",    label: `"${search.slice(0,20)}${search.length>20?"…":""}"`,                                                              onRemove: () => setSearch(""),                rgb: "255,255,255", Icon: Search       });
  if (platform !== "all")      activeTags.push({ id: "platform",  label: platform,                                                                                                           onRemove: () => setPlatform("all"),           rgb: "34,211,238",  Icon: Monitor      });
  if (sort !== "newest")       activeTags.push({ id: "sort",      label: SORT_OPTIONS.find(o=>o.value===sort)?.label ?? sort,                                                                onRemove: () => setSort("newest"),            rgb: "168,85,247",  Icon: ArrowDownUp  });
  if (levelFilter !== "all")   activeTags.push({ id: "level",     label: LEVEL_OPTIONS.find(o=>o.value===levelFilter)?.label ?? levelFilter,                                                 onRemove: () => setLevelFilter("all"),        rgb: "96,165,250",  Icon: Layers       });
  if (verifiedPosterOnly)      activeTags.push({ id: "verified",  label: "Verified Poster",                                                                                                  onRemove: () => setVerifiedPosterOnly(false), rgb: "34,197,94",   Icon: Shield       });
  if (bulkOnly)                activeTags.push({ id: "bulk",      label: "Bulk Hiring",                                                                                                      onRemove: () => setBulkOnly(false),           rgb: "168,85,247",  Icon: Users        });
  if (noBidsOnly)              activeTags.push({ id: "nobids",    label: "Easy Wins",                                                                                                        onRemove: () => setNoBidsOnly(false),         rgb: "34,211,238",  Icon: Flame        });
  if (hasStreamingFilter)      activeTags.push({ id: "streaming", label: "Has Streaming",                                                                                                    onRemove: () => setHasStreamingFilter(false), rgb: "145,70,255",  Icon: Tv           });
  if (hasQuestFilter)          activeTags.push({ id: "quest",     label: "Quest Bids",                                                                                                       onRemove: () => setHasQuestFilter(false),     rgb: "251,191,36",  Icon: Sparkles     });
  if (countryFilter !== "any") activeTags.push({ id: "country",   label: `${COUNTRY_MAP[countryFilter]?.flag ?? "🌍"} ${COUNTRY_MAP[countryFilter]?.label ?? countryFilter}`,              onRemove: () => setCountryFilter("any"),      rgb: "252,211,77",  Icon: Globe        });
  if (genderFilter !== "any")  activeTags.push({ id: "gender",    label: `${GENDER_MAP[genderFilter]?.icon ?? ""} ${GENDER_MAP[genderFilter]?.label ?? genderFilter}`.trim(),              onRemove: () => setGenderFilter("any"),       rgb: "236,72,153",  Icon: UserRound    });

  const hasFilters = activeTags.length > 0;
  const clearFilters = () => {
    setSearch(""); setPlatform("all"); setSort("newest"); setLevelFilter("all");
    setVerifiedPosterOnly(false); setBulkOnly(false); setNoBidsOnly(false);
    setHasStreamingFilter(false); setHasQuestFilter(false);
    setCountryFilter("any"); setGenderFilter("any");
  };
  const filterKey = `${sort}|${levelFilter}|${platform}|${+verifiedPosterOnly}|${+bulkOnly}|${+noBidsOnly}|${+hasStreamingFilter}|${+hasQuestFilter}|${countryFilter}|${genderFilter}|${search}`;
  const showFiller = !isLoading && !isError && requests && requests.length > 0 && requests.length <= 3;

  return (
    <div className="space-y-6 relative">
      {/* Subtle background glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-30"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 70% 10%, rgba(168,85,247,0.08) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 20% 80%, rgba(34,211,238,0.04) 0%, transparent 50%)",
        }}
      />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 border border-primary/25 rounded-full px-2.5 py-1">
              Live Marketplace
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight text-white leading-none" style={{ letterSpacing: "-0.02em" }}>
            <span className="inline-flex items-center gap-3">
              <Swords className="h-9 w-9 md:h-11 md:w-11 text-primary shrink-0" />
              Browse Requests
            </span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Find open missions and place your bid — no page reload needed.
          </p>
        </div>

        {/* Live counter */}
        {!isLoading && requests !== undefined && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <div
              key={requests.length}
              className="flex items-center gap-2.5 rounded-xl border border-primary/30 px-4 py-2.5"
              style={{
                background: "linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(0,0,0,0.3) 100%)",
                animation: "count-up 0.18s ease-out both",
              }}
            >
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
              <span className="text-sm font-extrabold text-white tabular-nums">{requests.length}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                {requests.length === 1 ? "Request" : "Requests"}
              </span>
            </div>
          </div>
        )}
      </div>

      <SafetyBanner showSelfHire={false} storageKey="gb_safety_browse" />

      {/* ── Filter panel ── */}
      <div
        className="rounded-2xl border overflow-hidden filter-panel-animate sm:sticky sm:top-16 sm:z-40"
        style={{
          borderColor: hasFilters ? "rgba(168,85,247,0.40)" : "rgba(255,255,255,0.08)",
          background: "rgba(7,5,16,0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: hasFilters
            ? "0 6px 32px rgba(0,0,0,0.60), 0 0 0 1px rgba(168,85,247,0.10)"
            : "0 4px 24px rgba(0,0,0,0.50)",
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}
      >
        {/* ── Panel header ── */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            background: hasFilters ? "rgba(168,85,247,0.07)" : "rgba(255,255,255,0.025)",
            transition: "background 0.3s",
          }}
        >
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-4 w-4" style={{ color: hasFilters ? "#a855f7" : "rgba(255,255,255,0.35)" }} />
            <span className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>
              Sort &amp; Filter
            </span>
            {hasFilters && (
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "rgba(168,85,247,0.25)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.40)" }}
              >
                {activeTags.length} active
              </span>
            )}
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider rounded-lg px-3.5 py-2 transition-all duration-200 hover:brightness-115 active:scale-95"
              style={{
                background: "linear-gradient(135deg,rgba(239,68,68,0.18) 0%,rgba(239,68,68,0.08) 100%)",
                border: "1px solid rgba(239,68,68,0.40)",
                color: "#f87171",
                boxShadow: "0 0 12px rgba(239,68,68,0.12)",
              }}
            >
              <X className="h-3.5 w-3.5" /> Clear All
            </button>
          )}
        </div>

        {/* ── Search + platform row ── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.12)" }}
        >
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search game, objectives, or player…"
              className="pl-10 h-10 bg-background/50 border-border/50 text-sm placeholder:text-muted-foreground/40 focus:border-primary/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-10 bg-background/50 border-border/50 text-sm">
              <Monitor className="h-4 w-4 mr-2 text-muted-foreground/60 shrink-0" />
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{PLATFORM_ICON[p]} {p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* ── Sort row ── */}
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.15)" }}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest shrink-0 sm:w-16 text-muted-foreground/35">
            Sort by
          </span>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map(({ value, label, Icon }) => {
              const active = sort === value;
              return (
                <button
                  key={value}
                  onClick={() => setSort(value)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95"
                  style={active ? {
                    background: "rgba(168,85,247,0.20)",
                    border: "1px solid rgba(168,85,247,0.50)",
                    color: "#c084fc",
                    boxShadow: "0 0 14px rgba(168,85,247,0.20)",
                  } : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  {active ? <CheckCircle2 className="h-3 w-3 shrink-0 text-purple-400" /> : <Icon className="h-3 w-3 shrink-0 opacity-45" />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Experience level row ── */}
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.10)" }}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest shrink-0 sm:w-16 text-muted-foreground/35">
            Level
          </span>
          <div className="flex flex-wrap gap-2">
            {LEVEL_OPTIONS.map(({ value, label, dot }) => {
              const active = levelFilter === value;
              return (
                <button
                  key={value}
                  onClick={() => setLevelFilter(value)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95"
                  style={active ? {
                    background: "rgba(96,165,250,0.18)",
                    border: "1px solid rgba(96,165,250,0.48)",
                    color: "#93c5fd",
                    boxShadow: "0 0 14px rgba(96,165,250,0.18)",
                  } : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "rgba(255,255,255,0.50)",
                  }}
                >
                  {active
                    ? <CheckCircle2 className="h-3 w-3 shrink-0 text-blue-300" />
                    : <div className="h-2 w-2 rounded-full shrink-0" style={{ background: dot }} />
                  }
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Nation + Gender row ── */}
        {(() => {
          const nationActive = countryFilter !== "any";
          const genderActive = genderFilter !== "any";
          const geoActive = nationActive || genderActive;
          return (
            <div
              className="flex flex-col sm:flex-row sm:items-start gap-3 px-5 py-4 border-b transition-colors duration-200"
              style={{
                borderColor: "rgba(255,255,255,0.05)",
                background: geoActive ? "rgba(251,191,36,0.04)" : "rgba(0,0,0,0.12)",
              }}
            >
              <div className="sm:shrink-0 sm:w-16 sm:pt-1 flex items-center gap-1.5">
                <span
                  className="text-[10px] font-extrabold uppercase tracking-widest"
                  style={{ color: geoActive ? "rgba(251,191,36,0.75)" : "rgba(255,255,255,0.30)" }}
                >
                  Match
                </span>
                {geoActive && (
                  <span
                    className="text-[8px] font-black px-1 py-0.5 rounded-full"
                    style={{ background: "rgba(251,191,36,0.20)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.35)" }}
                  >
                    {[nationActive, genderActive].filter(Boolean).length}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
                <div className="space-y-1.5">
                  <span
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: nationActive ? "rgba(251,191,36,0.70)" : "rgba(255,255,255,0.30)" }}
                  >
                    <Globe className="h-3 w-3" /> Nation
                    {nationActive && (
                      <button
                        onClick={() => setCountryFilter("any")}
                        className="ml-auto"
                        title="Clear nation filter"
                      >
                        <X className="h-2.5 w-2.5 text-amber-400/60 hover:text-amber-400 transition-colors" />
                      </button>
                    )}
                  </span>
                  <CountryCombobox value={countryFilter} onValueChange={setCountryFilter} />
                </div>
                <div className="space-y-1.5">
                  <span
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: genderActive ? "rgba(236,72,153,0.70)" : "rgba(255,255,255,0.30)" }}
                  >
                    <UserRound className="h-3 w-3" /> Gender
                    {genderActive && (
                      <button
                        onClick={() => setGenderFilter("any")}
                        className="ml-auto"
                        title="Clear gender filter"
                      >
                        <X className="h-2.5 w-2.5 text-pink-400/60 hover:text-pink-400 transition-colors" />
                      </button>
                    )}
                  </span>
                  <GenderSelect value={genderFilter} onValueChange={setGenderFilter} />
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Toggle filters row ── */}
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4"
          style={{ background: "rgba(0,0,0,0.10)" }}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest shrink-0 sm:w-16 text-muted-foreground/35">
            Only
          </span>
          <div className="flex flex-wrap gap-2">
            {([
              { label: "Verified Poster", Icon: Shield,   on: verifiedPosterOnly, set: () => setVerifiedPosterOnly(v => !v), activeStyle: { bg: "rgba(34,197,94,0.18)",   border: "rgba(34,197,94,0.50)",   color: "#4ade80",   glow: "rgba(34,197,94,0.16)"   } },
              { label: "Bulk Hiring",     Icon: Users,    on: bulkOnly,           set: () => setBulkOnly(v => !v),           activeStyle: { bg: "rgba(168,85,247,0.18)", border: "rgba(168,85,247,0.50)", color: "#c084fc",   glow: "rgba(168,85,247,0.16)" } },
              { label: "Easy Wins",       Icon: Flame,    on: noBidsOnly,         set: () => setNoBidsOnly(v => !v),         activeStyle: { bg: "rgba(34,211,238,0.15)", border: "rgba(34,211,238,0.45)", color: "#22d3ee",   glow: "rgba(34,211,238,0.14)" } },
              { label: "Has Streaming",   Icon: Tv,       on: hasStreamingFilter, set: () => setHasStreamingFilter(v => !v), activeStyle: { bg: "rgba(145,70,255,0.18)", border: "rgba(145,70,255,0.50)", color: "#c084fc",   glow: "rgba(145,70,255,0.16)" } },
              { label: "Quest Bids",      Icon: Sparkles, on: hasQuestFilter,     set: () => setHasQuestFilter(v => !v),     activeStyle: { bg: "rgba(251,191,36,0.16)", border: "rgba(251,191,36,0.45)", color: "#fbbf24",   glow: "rgba(251,191,36,0.14)" } },
            ] as const).map(({ label, Icon, on, set, activeStyle }) => (
              <button
                key={label}
                onClick={set}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95"
                style={on ? {
                  background: activeStyle.bg,
                  border: `1px solid ${activeStyle.border}`,
                  color: activeStyle.color,
                  boxShadow: `0 0 14px ${activeStyle.glow}`,
                } : {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {on
                  ? <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: activeStyle.color }} />
                  : <Icon className="h-3 w-3 shrink-0 opacity-45" />
                }
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Active tags ── */}
        {hasFilters && (
          <div
            className="border-t"
            style={{
              borderColor: "rgba(168,85,247,0.18)",
              background: "linear-gradient(180deg,rgba(168,85,247,0.06) 0%,rgba(168,85,247,0.02) 100%)",
            }}
          >
            {/* Section header: label + count + result summary */}
            <div className="flex items-center gap-2 px-5 pt-3.5 pb-2.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              <span
                className="text-[10px] font-extrabold uppercase tracking-[0.14em] shrink-0"
                style={{ color: "rgba(168,85,247,0.75)" }}
              >
                Active Filters
              </span>
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: "rgba(168,85,247,0.22)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.38)" }}
              >
                {activeTags.length}
              </span>
              {/* Divider line */}
              <span className="flex-1 h-px mx-1" style={{ background: "rgba(168,85,247,0.12)" }} />
              {/* Result count */}
              <span className="text-[10px] font-semibold shrink-0 tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>
                {requests?.length === allRequests?.length
                  ? `${allRequests?.length ?? 0} open`
                  : (
                    <>
                      <span style={{ color: "rgba(168,85,247,0.80)" }}>{requests?.length ?? 0}</span>
                      <span style={{ color: "rgba(255,255,255,0.25)" }}> / {allRequests?.length ?? 0} match</span>
                    </>
                  )}
              </span>
            </div>

            {/* Tag chips */}
            <div className="flex flex-wrap gap-2 px-5 pb-4">
              {activeTags.map((tag, idx) => (
                <button
                  key={tag.id}
                  onClick={tag.onRemove}
                  title={`Remove: ${tag.label}`}
                  className="filter-tag-animate group flex items-center gap-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 hover:brightness-115 active:scale-95 overflow-hidden"
                  style={{
                    background: `rgba(${tag.rgb},0.10)`,
                    border: `1px solid rgba(${tag.rgb},0.35)`,
                    color: `rgb(${tag.rgb})`,
                    animationDelay: `${idx * 40}ms`,
                  }}
                >
                  {/* Icon segment */}
                  <span
                    className="flex items-center justify-center h-full px-2 py-1.5 shrink-0"
                    style={{ background: `rgba(${tag.rgb},0.14)`, borderRight: `1px solid rgba(${tag.rgb},0.20)` }}
                  >
                    <tag.Icon className="h-3 w-3" />
                  </span>
                  {/* Label */}
                  <span className="py-1.5 max-w-[130px] truncate leading-none">{tag.label}</span>
                  {/* Remove button */}
                  <span
                    className="flex items-center justify-center h-5 w-5 rounded-full mr-1.5 transition-colors shrink-0 group-hover:bg-red-500/25"
                    style={{ background: `rgba(${tag.rgb},0.08)` }}
                  >
                    <X className="h-2.5 w-2.5 group-hover:text-red-400 transition-colors" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="space-y-5">
          {[1, 2, 3].map((i) => <RequestCardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-10 text-center flex flex-col items-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-400/60" />
          <div>
            <p className="font-bold text-red-400">Failed to load requests</p>
            <p className="text-sm text-muted-foreground mt-1">Check your connection and try refreshing.</p>
          </div>
        </div>
      ) : !requests || requests.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
      ) : (
        <div key={filterKey} className="bid-list-animate space-y-5">
          {requests.map((req) => <RequestCard key={req.id} req={req} />)}
        </div>
      )}

      {/* ── Filler section (shows when ≤3 requests to remove dead space) ── */}
      {showFiller && <FillerSection />}
    </div>
  );
}
