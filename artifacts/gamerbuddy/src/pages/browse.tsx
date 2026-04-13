import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  useBrowseRequests, usePlaceBid,
  type GameRequest,
} from "@/lib/bids-api";
import { Card, CardContent } from "@/components/ui/card";
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
  CheckCircle2, AlertCircle, User, Clock, TrendingDown,
  Zap, ExternalLink, LogIn,
} from "lucide-react";
import { SafetyBanner } from "@/components/safety-banner";
import { useToast } from "@/hooks/use-toast";
import { VerifiedBadge } from "@/components/verified-badge";

/* ── COMPACT CONDUCT REMINDER (shown in bid form) ─────────────── */
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
        className="w-full flex items-center justify-between px-3.5 py-2.5 gap-3 hover:bg-amber-500/8 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] font-semibold text-amber-300/90">
            By bidding, you agree to follow the Gamer Code of Conduct
          </span>
        </div>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-amber-400/60 shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 text-amber-400/60 shrink-0" />}
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
              Breaking any rule may result in <span className="font-semibold text-red-300">immediate account suspension</span> and loss of earnings. Full rules are on your Profile page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const PLATFORMS = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Steam Deck", "iOS", "Android"];
const SKILLS = ["Beginner", "Intermediate", "Expert", "Chill"];

const PLATFORM_ICON: Record<string, string> = {
  PC: "🖥️", PlayStation: "🎮", Xbox: "🟩", "Nintendo Switch": "🕹️",
  "Steam Deck": "🎲", iOS: "📱", Android: "🤖",
};

const SKILL_COLOR: Record<string, string> = {
  Beginner: "border-green-500/40 text-green-400 bg-green-500/10",
  Intermediate: "border-yellow-500/40 text-yellow-400 bg-yellow-500/10",
  Expert: "border-primary/40 text-primary bg-primary/10",
  Chill: "border-secondary/40 text-secondary bg-secondary/10",
};

function RequestCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/30 bg-card/40 p-5 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

type BidFormState = "idle" | "submitting" | "success" | "error";

function QuickBidPanel({ req, onClose }: { req: GameRequest; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [, setLocation] = useLocation();
  const [state, setState] = useState<BidFormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const placeBid = usePlaceBid();

  if (!user) {
    return (
      <div className="mt-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 flex flex-col sm:flex-row items-center gap-4">
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

  if (user.id === req.userId) {
    return (
      <div className="mt-2 rounded-xl border border-border/40 bg-background/30 p-4 text-sm text-muted-foreground text-center">
        This is your own request — you can manage it from <Link href="/my-requests" className="text-primary hover:underline">My Requests</Link>.
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="mt-2 rounded-xl border border-green-500/30 bg-green-500/5 p-5 flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-400" strokeWidth={1.5} />
        <div>
          <div className="font-extrabold text-green-400 text-base">Bid Placed!</div>
          <div className="text-xs text-muted-foreground mt-1">
            The hirer will review your pitch and may accept your bid.
          </div>
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
        setState("error");
        setErrorMsg("already_bid");
      } else {
        setState("error");
        setErrorMsg(msg || "Failed to place bid. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}
      className="mt-2 rounded-xl border border-primary/25 bg-primary/5 p-5 space-y-4"
      style={{ boxShadow: "0 0 24px rgba(168,85,247,0.07) inset" }}>

      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
        <Gavel className="h-3.5 w-3.5" /> Place Your Bid
      </div>

      {/* Bid hints */}
      {req.lowestBid && (
        <div className="flex items-center gap-2 text-xs text-secondary bg-secondary/5 border border-secondary/20 rounded-lg px-3 py-2">
          <TrendingDown className="h-3.5 w-3.5 shrink-0" />
          Lowest current bid: <span className="font-bold text-white ml-1">${req.lowestBid.toFixed(2)}</span>
          <span className="text-muted-foreground ml-1">— bid lower to stand out</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Price */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Your Price (USD) *
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              min="1"
              max="9999"
              step="0.01"
              placeholder="e.g. 15.00"
              value={price}
              onChange={(e) => { setPrice(e.target.value); if (state === "error") setState("idle"); }}
              className={`pl-9 bg-background/60 font-mono text-sm ${price && !priceValid ? "border-red-500/50" : price && priceValid ? "border-green-500/40" : ""}`}
              required
            />
          </div>
          {price && !priceValid && (
            <p className="text-[10px] text-red-400">Enter a price between $1 and $9,999</p>
          )}
          {price && priceValid && (
            <p className="text-[10px] text-muted-foreground">
              You earn <span className="text-green-400 font-bold">${(priceNum * 0.9).toFixed(2)}</span> after 10% platform fee
            </p>
          )}
        </div>

        {/* Quick tip */}
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

      {/* Message */}
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
          {message && !messageValid && (
            <p className="text-[10px] text-red-400">Pitch too short — tell them more about yourself</p>
          )}
          <div className="ml-auto text-[10px] text-muted-foreground/50">{message.length} chars</div>
        </div>
      </div>

      {/* Error */}
      {state === "error" && errorMsg === "already_bid" && (
        <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
          <div className="flex-1">
            <div className="font-bold text-secondary text-sm">You already bid on this request</div>
            <div className="text-xs text-muted-foreground mt-0.5">Track your bid status from the full request page.</div>
          </div>
          <Button size="sm" variant="outline" className="text-xs border-secondary/40 text-secondary hover:bg-secondary hover:text-black shrink-0"
            onClick={() => setLocation(`/requests/${req.id}`)}>
            View Bid <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </div>
      )}
      {state === "error" && errorMsg !== "already_bid" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Conduct reminder */}
      <BidConductReminder />

      {/* Actions */}
      <div className="flex flex-wrap gap-2.5 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-10">
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!canSubmit}
          className="bg-primary hover:bg-primary/90 flex-1 min-w-[120px] font-bold uppercase tracking-wider text-xs shadow-[0_0_16px_rgba(168,85,247,0.25)] disabled:opacity-50 disabled:cursor-not-allowed h-10"
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
          type="button"
          size="sm"
          variant="outline"
          className="text-xs border-secondary/40 text-secondary hover:bg-secondary hover:text-black h-10"
          onClick={() => setLocation(`/requests/${req.id}`)}
        >
          Full Details <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </form>
  );
}

function RequestCard({ req }: { req: GameRequest }) {
  const [expanded, setExpanded] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${expanded ? "border-primary/40 bg-card/80 shadow-[0_0_24px_rgba(168,85,247,0.08)]" : "border-border/50 bg-card/40 hover:bg-card/70 hover:border-primary/25"}`}
    >
      {/* Top accent bar on expand */}
      {expanded && <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />}

      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Left: main info */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* Hirer + game */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="text-primary font-semibold">{req.userName}</span>
                  <VerifiedBadge idVerified={req.userIdVerified ?? false} variant="icon" />
                </span>
                <span className="text-muted-foreground/30 text-xs">·</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(req.createdAt), "MMM d")}
                </span>
              </div>
              <h3
                className="text-xl font-extrabold text-white mt-1 cursor-pointer hover:text-primary transition-colors leading-tight"
                onClick={() => setLocation(`/requests/${req.id}`)}
              >
                {req.gameName}
              </h3>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs border border-border/60 rounded-full px-2.5 py-0.5 font-semibold text-muted-foreground bg-background/60">
                {PLATFORM_ICON[req.platform] ?? "🎮"} {req.platform}
              </span>
              <span className={`text-xs border rounded-full px-2.5 py-0.5 font-semibold ${SKILL_COLOR[req.skillLevel] ?? "text-muted-foreground border-border"}`}>
                {req.skillLevel}
              </span>
            </div>

            {/* Objectives */}
            <p className="text-sm text-foreground/70 leading-relaxed border-l-2 border-primary/30 pl-3 line-clamp-2">
              {req.objectives}
            </p>

            {/* Bid stats row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Gavel className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-white">
                  {req.bidCount === 0 ? "No bids yet" : `${req.bidCount} bid${req.bidCount === 1 ? "" : "s"}`}
                </span>
                {req.bidCount === 0 && (
                  <span className="text-[9px] bg-green-500/15 border border-green-500/25 text-green-400 rounded-full px-1.5 py-0.5 font-bold uppercase tracking-wider">
                    First bid!
                  </span>
                )}
              </div>
              {req.lowestBid && (
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-secondary" />
                  <span className="text-xs text-muted-foreground">
                    Lowest bid: <span className="font-bold text-white">${req.lowestBid.toFixed(2)}</span>
                  </span>
                </div>
              )}
              {req.bidCount === 0 && (
                <span className="text-xs text-muted-foreground/60">— be the first!</span>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setExpanded(!expanded)}
              className={`flex items-center gap-1.5 rounded-lg border font-bold uppercase text-xs px-3.5 py-2.5 sm:py-2 transition-all ${
                expanded
                  ? "bg-primary text-white border-primary shadow-[0_0_16px_rgba(168,85,247,0.3)]"
                  : "bg-primary/10 border-primary/40 text-primary hover:bg-primary hover:text-white hover:shadow-[0_0_12px_rgba(168,85,247,0.25)]"
              }`}
            >
              <Gavel className="h-3.5 w-3.5" />
              {expanded ? "Cancel" : "Place Bid"}
              {expanded ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
            </button>
            <button
              onClick={() => setLocation(`/requests/${req.id}`)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary transition-colors font-semibold whitespace-nowrap"
            >
              Full Details <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Inline bid panel */}
        {expanded && (
          <QuickBidPanel req={req} onClose={() => setExpanded(false)} />
        )}
      </div>
    </div>
  );
}

export default function Browse() {
  const [platform, setPlatform] = useState("all");
  const [skillLevel, setSkillLevel] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "fewest_bids" | "most_bids">("newest");

  const { data: allRequests, isLoading, isError } = useBrowseRequests({
    ...(platform !== "all" && { platform }),
    ...(skillLevel !== "all" && { skillLevel }),
    status: "open",
  });

  const requests = allRequests
    ?.filter((r) =>
      search.trim() === "" ||
      r.gameName.toLowerCase().includes(search.toLowerCase()) ||
      r.objectives.toLowerCase().includes(search.toLowerCase()) ||
      r.userName.toLowerCase().includes(search.toLowerCase())
    )
    ?.sort((a, b) => {
      if (sort === "fewest_bids") return a.bidCount - b.bidCount;
      if (sort === "most_bids") return b.bidCount - a.bidCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white flex items-center gap-3 drop-shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            <Swords className="h-7 w-7 text-primary" />
            Browse Requests
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Find open missions and place your bid directly — no page reload needed.
          </p>
        </div>
        {requests && (
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold shrink-0">
            {requests.length} {requests.length === 1 ? "request" : "requests"} open
          </span>
        )}
      </div>

      <SafetyBanner showSelfHire={false} storageKey="gb_safety_browse" />

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-border bg-card/30">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search game, objectives, or player…"
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Platform */}
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="bg-background border-border">
            <Monitor className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>{PLATFORM_ICON[p]} {p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Skill */}
        <Select value={skillLevel} onValueChange={setSkillLevel}>
          <SelectTrigger className="bg-background border-border">
            <Layers className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Skill Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skill Levels</SelectItem>
            {SKILLS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Sort bar */}
      {!isLoading && requests && requests.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground font-semibold uppercase tracking-widest">Sort:</span>
          {([
            { value: "newest", label: "Newest" },
            { value: "fewest_bids", label: "Fewest Bids" },
            { value: "most_bids", label: "Most Bids" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`px-3 py-2 rounded-lg border font-semibold transition-all ${
                sort === opt.value
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-border hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <RequestCardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <div className="text-center p-8 text-destructive flex flex-col items-center gap-3">
          <AlertCircle className="h-8 w-8" />
          <p className="font-semibold">Failed to load requests.</p>
          <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
        </div>
      ) : !requests || requests.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-xl bg-card/10">
          <Swords className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
          <h3 className="text-lg font-bold uppercase tracking-wide text-muted-foreground/60">No Open Requests</h3>
          <p className="text-sm text-muted-foreground/50 mt-1 max-w-xs mx-auto">
            {search ? "No requests match your search. Try different keywords." : "Check back soon or clear your filters."}
          </p>
          {(platform !== "all" || skillLevel !== "all" || search) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => { setPlatform("all"); setSkillLevel("all"); setSearch(""); }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => <RequestCard key={req.id} req={req} />)}
        </div>
      )}
    </div>
  );
}
