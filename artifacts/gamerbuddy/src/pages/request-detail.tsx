import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { CopyId } from "@/components/copy-id";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  useRequest,
  useRequestBids,
  usePlaceBid,
  useAcceptBid,
  useStartSession,
  useCompleteRequest,
  useLockBulkSession,
  useBidMessages,
  useSendMessage,
  useRequestReviews,
  useSubmitReview,
  useSendGift,
  useReportUser,
  useUserProfile,
  useMyGamingAccounts,
  STREAMING_PLATFORM_META,
  GAMING_PLATFORM_META,
  type Bid,
  type ChatMessage,
} from "@/lib/bids-api";
import { COUNTRY_MAP, GENDER_MAP } from "@/lib/geo-options";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  ArrowLeft, Swords, Monitor, Layers, Gavel, MessageSquare,
  CheckCircle2, Send, Star, Trophy, AlertTriangle, User, Gift,
  Flag, X, MessageCircle, Gamepad2, Target, Zap, ChevronDown, ChevronUp,
  Phone, PhoneOff, Volume2, ShieldCheck, Users, Lock, RefreshCw,
  SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Tv, Sparkles, ShieldAlert,
} from "lucide-react";
import { SafetyBanner } from "@/components/safety-banner";
import { VerifiedBadge } from "@/components/verified-badge";
import { TrustChip, ReputationBadges, computeBadges } from "@/components/reputation-badges";

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

const REPORT_REASONS = [
  "Off-platform payment request",
  "Toxicity / harassment",
  "Account sharing / fraud",
  "No-show / abandoned session",
  "Inappropriate content",
  "Other",
];

const SCORE_LABELS: Record<number, string> = {
  1: "Terrible", 2: "Very Bad", 3: "Bad", 4: "Below Average", 5: "Average",
  6: "Good", 7: "Very Good", 8: "Great", 9: "Excellent", 10: "Perfect",
};
const SCORE_COLOR: Record<number, string> = {
  1: "bg-red-600", 2: "bg-red-500", 3: "bg-orange-500", 4: "bg-orange-400",
  5: "bg-yellow-500", 6: "bg-yellow-400", 7: "bg-lime-500", 8: "bg-green-500",
  9: "bg-green-400", 10: "bg-emerald-400",
};

function ScoreRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className={`w-9 h-9 rounded-lg font-black text-sm transition-all duration-100 border
              ${n <= active
                ? `${SCORE_COLOR[n] ?? "bg-green-500"} border-transparent text-black scale-110 shadow-lg`
                : "border-border bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-white"
              }`}
          >
            {n}
          </button>
        ))}
      </div>
      {active > 0 && (
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${SCORE_COLOR[active]} text-black`}>
            {active}/10
          </span>
          <span className="text-xs text-muted-foreground">{SCORE_LABELS[active]}</span>
        </div>
      )}
    </div>
  );
}

function ChatPanel({
  bidId,
  currentUserId,
  discordUsername,
}: {
  bidId: number;
  currentUserId: number;
  discordUsername?: string | null;
}) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  // Messages are polled every 10 s via refetchInterval in useBidMessages
  const { data: allMessages = [], isLoading } = useBidMessages(bidId);
  const send = useSendMessage();
  const { toast } = useToast();

  const jitsiUrl = `https://meet.jit.si/gamerbuddy-bid-${bidId}`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    send.mutate({ bidId, content }, {
      onError: (err: any) =>
        toast({ title: "Failed to send", description: err?.error || "Error", variant: "destructive" }),
    });
  };

  return (
    <div className="flex flex-col border border-secondary/30 rounded-2xl overflow-hidden bg-background/60 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border/60 bg-card/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-secondary" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Private Chat</span>
          <div className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-cyan-500/25 text-cyan-400/70 bg-cyan-500/5">
            <RefreshCw className="h-2.5 w-2.5" />
            Refreshes every 10s
          </div>
        </div>
        {/* Voice Chat */}
        <a
          href={jitsiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition-all"
          title={discordUsername ? `Discord: ${discordUsername}` : "Start Voice Chat"}
        >
          <Volume2 className="h-3.5 w-3.5" />
          Voice Chat
        </a>
      </div>

      {/* Discord hint if available */}
      {discordUsername && (
        <div className="px-4 py-1.5 border-b border-border/40 bg-indigo-500/5 flex items-center gap-2">
          <MessageCircle className="h-3 w-3 text-indigo-400" />
          <span className="text-[11px] text-indigo-300">Discord: <strong>{discordUsername}</strong></span>
          <span className="text-[10px] text-muted-foreground/40 ml-1">· or use the Voice Chat button above</span>
        </div>
      )}

      {/* Prominent Discord + safety instructions */}
      <div className="border-b border-indigo-500/20 bg-indigo-500/[0.06] px-4 py-3 space-y-2">
        <div className="flex items-start gap-2">
          <MessageCircle className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-indigo-200/80 leading-snug">
            <strong className="text-indigo-300">Exchange your Discord username here</strong> so you can coordinate the session. We recommend using Discord for voice communication during gameplay.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300/75 leading-snug">
            <strong className="text-amber-300">Never share</strong> your Steam, Epic Games, PSN, or any account passwords with anyone.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Lock className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-green-300/70 leading-snug">
            Stay within Gamerbuddy until payment is released after both reviews are submitted.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[220px] max-h-72">
        {isLoading ? (
          <div className="space-y-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <Skeleton className={`h-10 rounded-xl ${i % 2 === 0 ? "w-40" : "w-52"}`} />
              </div>
            ))}
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground/15" />
            <div className="text-xs text-muted-foreground/50 leading-relaxed">
              Start the conversation — share your Discord username so you can coordinate voice chat during the session.
            </div>
          </div>
        ) : (
          allMessages.map((msg: ChatMessage) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                  isMe
                    ? "bg-primary text-white rounded-br-none shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                    : "bg-card border border-border/60 text-foreground rounded-bl-none"
                }`}>
                  {!isMe && <div className="text-[11px] font-bold text-secondary mb-0.5">{msg.senderName}</div>}
                  <p className="leading-snug break-words">{msg.content}</p>
                  <div className="text-[10px] opacity-50 mt-1 text-right">{format(new Date(msg.createdAt), "h:mm a")}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/60 p-2 flex gap-2 bg-card/50">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="bg-background/80 text-sm h-9 border-border/50 focus:border-primary/50"
          maxLength={1000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        <Button
          size="sm"
          className="h-9 px-3 bg-primary hover:bg-primary/90 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
          onClick={handleSend}
          disabled={!draft.trim() || send.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ReportModal({ reportedUserId, reportedName, onClose }: { reportedUserId: number; reportedName: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const report = useReportUser();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!reason) return;
    report.mutate({ reportedUserId, reason, description: description.trim() || undefined }, {
      onSuccess: () => {
        toast({ title: "Report submitted", description: "Our team will review it shortly." });
        onClose();
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.error || "Error", variant: "destructive" }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive font-bold">
            <Flag className="h-5 w-5" />
            Report {reportedName}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Reason *</label>
          <div className="space-y-1.5">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                  reason === r
                    ? "border-destructive/60 bg-destructive/10 text-destructive"
                    : "border-border bg-background/50 text-muted-foreground hover:border-destructive/40 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Additional details (optional)</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened…"
            className="resize-none h-20 bg-background text-sm"
            maxLength={500}
          />
        </div>
        <Button
          className="w-full bg-destructive/20 border border-destructive/40 text-destructive hover:bg-destructive hover:text-white font-bold uppercase"
          onClick={handleSubmit}
          disabled={!reason || report.isPending}
        >
          <Flag className="h-4 w-4 mr-2" />
          {report.isPending ? "Submitting…" : "Submit Report"}
        </Button>
      </div>
    </div>
  );
}

function AcceptModal({
  bid,
  requestId,
  isBulkMode,
  currentGroupTotal,
  onClose,
}: {
  bid: Bid;
  requestId: number;
  isBulkMode?: boolean;
  currentGroupTotal?: number;
  onClose: () => void;
}) {
  const [discord, setDiscord] = useState("");
  const acceptBid = useAcceptBid();
  const { toast } = useToast();

  const newGroupTotal = Math.round(((currentGroupTotal ?? 0) + bid.price) * 100) / 100;

  const handleAccept = () => {
    acceptBid.mutate({ requestId, bidId: bid.id, discordUsername: discord.trim() || undefined }, {
      onSuccess: (data: any) => {
        toast({
          title: isBulkMode ? "Slot Reserved!" : "Bid Accepted!",
          description: isBulkMode
            ? data?.message ?? "Slot reserved. Payment will be collected when you lock the roster."
            : "Funds moved to escrow. Session is now in progress.",
        });
        onClose();
      },
      onError: (err: any) => toast({ title: "Error", description: err?.error || "Failed", variant: "destructive" }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 font-bold ${isBulkMode ? "text-purple-400" : "text-green-400"}`}>
            {isBulkMode ? <Users className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            {isBulkMode ? `Reserve Slot — ${bid.bidderName}` : `Accept Bid from ${bid.bidderName}`}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {isBulkMode ? (
          /* ── Bulk mode: deferred payment breakdown ── */
          <div className="space-y-3">
            {/* No-charge-now banner */}
            <div className="flex items-center gap-2.5 rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 py-2.5">
              <div className="h-7 w-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <div>
                <div className="text-xs font-black text-purple-300 uppercase tracking-wide">No Charge Now</div>
                <div className="text-[10px] text-purple-300/60">Your wallet is only debited when you lock the full roster.</div>
              </div>
            </div>

            {/* Per-gamer cost breakdown */}
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">This Gamer's Contribution to Group</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Session Amount</span>
                <span className="font-black text-white">${bid.price.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-black bg-amber-500/15 border border-amber-500/25 text-amber-300">10%</span>
                  Platform Fee
                </span>
                <span className="font-bold text-amber-400">${(bid.price * 0.1).toFixed(2)}</span>
              </div>
              <div className="h-px bg-white/6" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Gamer Receives</span>
                <span className="text-xl font-black text-green-400">${(bid.price * 0.9).toFixed(2)}</span>
              </div>
            </div>

            {/* Running group total arrow */}
            <div className="rounded-xl border border-purple-500/25 bg-purple-500/6 p-4 space-y-2.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Group Total Preview</div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-1 rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Before</div>
                  <div className="font-black text-white tabular-nums">${(currentGroupTotal ?? 0).toFixed(2)}</div>
                </div>
                <div className="text-purple-400 font-black text-lg">→</div>
                <div className="flex-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-center">
                  <div className="text-[10px] text-purple-400/70 mb-0.5">After This Gamer</div>
                  <div className="font-black text-purple-300 tabular-nums text-lg">${newGroupTotal.toFixed(2)}</div>
                </div>
              </div>
              {/* Mini breakdown at-lock */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5">
                  <span className="text-muted-foreground">Fee (10%)</span>
                  <span className="font-black text-amber-300">${(newGroupTotal * 0.1).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/5 px-2.5 py-1.5">
                  <span className="text-muted-foreground">To Gamers (90%)</span>
                  <span className="font-black text-green-400">${(newGroupTotal * 0.9).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Single-hire mode: standard escrow breakdown ── */
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-3">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
              Payment Breakdown
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Session Amount</span>
                <span className="font-bold text-white">${bid.price.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="text-amber-400 font-bold text-xs">10%</span> Platform Fee
                </span>
                <span className="font-bold text-amber-400">−${(bid.price * 0.1).toFixed(2)}</span>
              </div>
              <div className="h-px bg-green-500/20" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-white">Gamer Receives</span>
                <span className="text-xl font-black text-green-400">${(bid.price * 0.9).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/8 border border-amber-500/20 px-2.5 py-2 text-[11px] text-amber-300/80">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              10% platform fee is deducted at completion. Funds are held in escrow until the session is approved.
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            <MessageCircle className="inline h-3.5 w-3.5 mr-1" />
            Your Discord username (optional)
          </label>
          <Input
            value={discord}
            onChange={(e) => setDiscord(e.target.value)}
            placeholder="e.g. GamerBuddy#1234"
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">Share your Discord to coordinate session details like timing and voice chat. All payments stay safely inside Gamerbuddy's escrow — never share account passwords.</p>
        </div>

        <Button
          className={`w-full font-bold uppercase py-5 ${
            isBulkMode
              ? "bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500 hover:text-white"
              : "bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500 hover:text-white"
          }`}
          onClick={handleAccept}
          disabled={acceptBid.isPending}
        >
          {isBulkMode ? <Users className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
          {acceptBid.isPending
            ? "Processing…"
            : isBulkMode
              ? "Reserve Slot"
              : "Confirm & Lock Escrow"}
        </Button>
      </div>
    </div>
  );
}

function BidderQuestSummary({ bidderId, gameName }: { bidderId: number; gameName: string }) {
  const { data: profile } = useUserProfile(bidderId);
  const [expanded, setExpanded] = useState(false);
  const entries = profile?.questEntries ?? [];

  if (!profile) return null;
  if (entries.length === 0) return null;

  const relevantFirst = [...entries].sort((a, b) =>
    a.gameName.toLowerCase().includes(gameName.toLowerCase()) ? -1 :
    b.gameName.toLowerCase().includes(gameName.toLowerCase()) ? 1 : 0
  );
  const shown = expanded ? relevantFirst : relevantFirst.slice(0, 2);

  return (
    <div className="rounded-xl border border-border/40 bg-background/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          <Gamepad2 className="h-3 w-3 text-primary" />
          Quest — Games This Gamer Offers
        </div>
        {entries.length > 2 && (
          <button onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-primary hover:text-white transition-colors flex items-center gap-0.5 font-semibold">
            {expanded ? <><ChevronUp className="h-3 w-3" />Less</> : <><ChevronDown className="h-3 w-3" />{entries.length - 2} more</>}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {shown.map((entry) => (
          <div key={entry.id}
            className={`rounded-lg border px-3 py-2 space-y-1.5 transition-all ${entry.gameName.toLowerCase().includes(gameName.toLowerCase()) ? "border-primary/30 bg-primary/5" : "border-border/40 bg-background/30"}`}>
            <div className="flex items-center gap-1.5">
              <Gamepad2 className="h-3 w-3 text-primary shrink-0" />
              <span className="font-bold text-white text-xs truncate">{entry.gameName}</span>
              {entry.gameName.toLowerCase().includes(gameName.toLowerCase()) && (
                <span className="text-[8px] bg-primary/20 text-primary border border-primary/30 rounded-full px-1.5 py-0.5 font-bold uppercase tracking-wider shrink-0">Match</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="h-2.5 w-2.5 text-secondary shrink-0" />
              <span className="text-[10px] text-foreground/70">{entry.helpType}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-2.5 w-2.5 text-amber-400 shrink-0" />
              <span className="text-[10px] text-amber-400/80 font-semibold">{entry.playstyle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── BIDDER STREAMING BADGES ─────────────────────────────────── */
function BidderStreamingBadges({ bidderId, compact = false }: { bidderId: number; compact?: boolean }) {
  const { data: profile } = useUserProfile(bidderId);
  const accounts = profile?.streamingAccounts ?? [];
  if (accounts.length === 0) return null;

  if (compact) {
    return (
      <>
        {accounts.map((sa) => {
          const meta = STREAMING_PLATFORM_META[sa.platform];
          if (!meta) return null;
          return (
            <a
              key={sa.platform}
              href={meta.urlTemplate.replace("{username}", sa.username)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all hover:brightness-110"
              style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}
              title={`${meta.label}: @${sa.username}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="leading-none">{meta.emoji}</span>
              <span className="hidden sm:inline">{meta.label.split(" ")[0]}</span>
            </a>
          );
        })}
      </>
    );
  }

  return (
    <div className="rounded-xl border border-border/30 bg-background/20 p-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1">
        <span>📡</span> Live Streaming Channels
      </div>
      <div className="flex flex-wrap gap-1.5">
        {accounts.map((sa) => {
          const meta = STREAMING_PLATFORM_META[sa.platform];
          if (!meta) return null;
          return (
            <a
              key={sa.platform}
              href={meta.urlTemplate.replace("{username}", sa.username)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:brightness-110 hover:scale-[1.03]"
              style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}
            >
              <span className="text-sm leading-none">{meta.emoji}</span>
              <span>{meta.label}</span>
              <span className="opacity-70 font-mono">@{sa.username}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function BidderGamingBadges({
  accounts,
  compact = false,
}: {
  accounts?: { platform: string; username: string }[];
  compact?: boolean;
}) {
  if (!accounts || accounts.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[9px] font-semibold text-muted-foreground/50 shrink-0">Connected Accounts:</span>
        {accounts.map((ga) => {
          const meta = GAMING_PLATFORM_META[ga.platform];
          if (!meta) return null;
          const url = meta.profileUrl?.replace("{username}", ga.username);
          const Tag = url ? "a" : "span";
          const linkProps = url
            ? { href: url, target: "_blank", rel: "noopener noreferrer", onClick: (e: React.MouseEvent) => e.stopPropagation() }
            : {};
          return (
            <Tag
              key={ga.platform}
              {...linkProps}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all hover:brightness-110"
              style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}
              title={`${meta.label}: ${ga.username}`}
            >
              <span className="hidden sm:inline">{meta.shortLabel}</span>
              <span className="opacity-75 text-[9px]">✓</span>
            </Tag>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/30 bg-background/20 p-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1">
        <span>🎮</span> Connected Gaming Accounts
      </div>
      <div className="flex flex-wrap gap-1.5">
        {accounts.map((ga) => {
          const meta = GAMING_PLATFORM_META[ga.platform];
          if (!meta) return null;
          const url = meta.profileUrl?.replace("{username}", ga.username);
          const Tag = url ? "a" : "span";
          const linkProps = url
            ? { href: url, target: "_blank", rel: "noopener noreferrer" }
            : {};
          return (
            <Tag
              key={ga.platform}
              {...linkProps}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:brightness-110 hover:scale-[1.03]"
              style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}
            >
              <span className="text-sm leading-none">{meta.emoji}</span>
              <span>{meta.label}</span>
              <span className="opacity-55 font-mono text-[10px]">{ga.username}</span>
              <span className="text-emerald-400 text-[10px] font-extrabold">✓</span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}

function BulkProgressCard({
  acceptedBidsCount,
  bulkSlotsNeeded,
  acceptedBids,
  pendingBids,
}: {
  acceptedBidsCount: number;
  bulkSlotsNeeded: number;
  acceptedBids: Bid[];
  pendingBids: Bid[];
}) {
  const pct = Math.min(100, (acceptedBidsCount / Math.max(bulkSlotsNeeded, 1)) * 100);
  const remaining = bulkSlotsNeeded - acceptedBidsCount;
  const isFull = acceptedBidsCount >= bulkSlotsNeeded;
  const isEmpty = acceptedBidsCount === 0;

  const groupTotal = Math.round(acceptedBids.reduce((s, b) => s + b.price, 0) * 100) / 100;
  const platformFee = Math.round(groupTotal * 10) / 100;
  const gamersReceive = Math.round(groupTotal * 90) / 100;

  const avgPendingBid = pendingBids.length > 0
    ? pendingBids.reduce((s, b) => s + b.price, 0) / pendingBids.length
    : 0;
  const estimatedTotal = remaining > 0 && avgPendingBid > 0
    ? Math.round((groupTotal + remaining * avgPendingBid) * 100) / 100
    : 0;

  // Phase label
  const phase = isFull
    ? { label: "Roster Full — Ready to Lock", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" }
    : isEmpty
    ? { label: "Recruiting Gamers", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" }
    : pct >= 50
    ? { label: "Almost There!", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" }
    : { label: "In Progress", color: "text-purple-300", bg: "bg-purple-500/8 border-purple-500/25" };

  // Bar color shifts by fill %
  const barGradient = isFull
    ? "linear-gradient(90deg, #16a34a 0%, #22c55e 60%, #4ade80 100%)"
    : pct >= 50
    ? "linear-gradient(90deg, #7c3aed 0%, #a855f7 40%, #22d3ee 100%)"
    : "linear-gradient(90deg, #7c3aed 0%, #a855f7 70%, #c084fc 100%)";

  const barGlow = isFull
    ? "0 0 20px rgba(34,197,94,0.55), 0 0 50px rgba(34,197,94,0.15)"
    : pct >= 50
    ? "0 0 20px rgba(168,85,247,0.5), 0 0 40px rgba(34,211,238,0.18)"
    : "0 0 16px rgba(168,85,247,0.55), 0 0 40px rgba(168,85,247,0.12)";

  // Use segmented blocks when ≤ 30 slots, otherwise smooth bar with ticks
  const useSegments = bulkSlotsNeeded <= 30;

  return (
    <div
      className="rounded-2xl border border-purple-500/30 p-5 space-y-5"
      style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.14) 0%, rgba(10,0,20,0.55) 100%)" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-purple-400 uppercase tracking-widest">Roster Progress</div>
            <div className={`text-[10px] font-bold ${phase.color} uppercase tracking-wide`}>{phase.label}</div>
          </div>
        </div>

        {/* Big slot counter */}
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-4xl font-black tabular-nums"
            style={{ color: isFull ? "#4ade80" : pct >= 50 ? "#22d3ee" : "#c084fc" }}
          >
            {acceptedBidsCount}
          </span>
          <span className="text-2xl font-black text-white/20">/</span>
          <span className="text-4xl font-black text-white tabular-nums">{bulkSlotsNeeded}</span>
          <div className="flex flex-col ml-1">
            <span className="text-[10px] text-muted-foreground leading-none">slots</span>
            <span className="text-[10px] text-muted-foreground leading-none">filled</span>
          </div>
        </div>
      </div>

      {/* Progress bar section */}
      {useSegments ? (
        /* Segmented blocks — 1 block per slot */
        <div className="space-y-1.5">
          <div className="flex gap-[3px] flex-wrap">
            {Array.from({ length: bulkSlotsNeeded }).map((_, i) => {
              const filled = i < acceptedBidsCount;
              return (
                <div
                  key={i}
                  className="h-4 rounded-sm transition-all duration-500 flex-1 min-w-[6px]"
                  style={{
                    background: filled
                      ? isFull
                        ? "linear-gradient(180deg, #4ade80, #16a34a)"
                        : i / bulkSlotsNeeded >= 0.5
                        ? "linear-gradient(180deg, #22d3ee, #a855f7)"
                        : "linear-gradient(180deg, #c084fc, #7c3aed)"
                      : "rgba(255,255,255,0.05)",
                    boxShadow: filled ? (isFull ? "0 0 6px rgba(74,222,128,0.5)" : "0 0 6px rgba(168,85,247,0.4)") : "none",
                    border: filled ? "none" : "1px solid rgba(255,255,255,0.05)",
                  }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground/50 font-bold tabular-nums px-0.5">
            <span>0</span>
            {bulkSlotsNeeded > 6 && <span>{Math.round(bulkSlotsNeeded / 2)}</span>}
            <span>{bulkSlotsNeeded}</span>
          </div>
        </div>
      ) : (
        /* Smooth gradient bar with milestone ticks */
        <div className="space-y-1.5">
          <div className="relative h-5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            {/* Fill */}
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: barGradient,
                boxShadow: pct > 0 ? barGlow : "none",
              }}
            />
            {/* Shimmer on leading edge */}
            {pct > 0 && pct < 98 && (
              <div
                className="absolute top-0 bottom-0 w-6 pointer-events-none"
                style={{
                  left: `calc(${pct}% - 12px)`,
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
            )}
            {/* Percentage label inside bar */}
            {pct > 8 && (
              <div
                className="absolute inset-0 flex items-center justify-start text-[11px] font-black text-white/90 pl-3 tabular-nums pointer-events-none"
              >
                {Math.round(pct)}%
              </div>
            )}
            {/* Milestone tick marks */}
            {[25, 50, 75].map((m) => (
              <div
                key={m}
                className="absolute top-0 bottom-0 w-px bg-white/10 pointer-events-none"
                style={{ left: `${m}%` }}
              />
            ))}
          </div>
          {/* Milestone labels */}
          <div className="relative text-[9px] text-muted-foreground/40 font-bold">
            <span className="absolute" style={{ left: "0%" }}>0</span>
            <span className="absolute -translate-x-1/2" style={{ left: "25%" }}>{Math.round(bulkSlotsNeeded * 0.25)}</span>
            <span className="absolute -translate-x-1/2" style={{ left: "50%" }}>{Math.round(bulkSlotsNeeded * 0.5)}</span>
            <span className="absolute -translate-x-1/2" style={{ left: "75%" }}>{Math.round(bulkSlotsNeeded * 0.75)}</span>
            <span className="absolute -translate-x-full" style={{ left: "100%" }}>{bulkSlotsNeeded}</span>
          </div>
          {/* Spacer for label row */}
          <div className="h-3" />
        </div>
      )}

      {/* Payment breakdown grid */}
      {groupTotal > 0 ? (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl border border-purple-500/25 bg-purple-500/8 px-3 py-2.5 flex flex-col gap-0.5">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Session Amount</span>
            <span className="font-black text-purple-300 text-base tabular-nums">${groupTotal.toFixed(2)}</span>
            <span className="text-[9px] text-muted-foreground/50">at lock</span>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 px-3 py-2.5 flex flex-col gap-0.5">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Platform Fee</span>
            <span className="font-black text-amber-300 text-base tabular-nums">${platformFee.toFixed(2)}</span>
            <span className="text-[9px] text-muted-foreground/50">10%</span>
          </div>
          <div className="rounded-xl border border-green-500/25 bg-green-500/6 px-3 py-2.5 flex flex-col gap-0.5">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Gamers Receive</span>
            <span className="font-black text-green-400 text-base tabular-nums">${gamersReceive.toFixed(2)}</span>
            <span className="text-[9px] text-muted-foreground/50">90%</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/6 bg-white/3 px-4 py-3 flex items-center gap-3 text-xs">
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-purple-400/50" />
          </div>
          <div>
            <div className="text-white/40 font-bold">Awaiting first reservation</div>
            <div className="text-muted-foreground/50 text-[10px] mt-0.5">Accept bids below to fill slots. Payment is collected only when you lock the roster.</div>
          </div>
        </div>
      )}

      {/* Bottom row: remaining + estimated + deferred note */}
      <div className="flex flex-wrap gap-2 items-center text-xs">
        {!isFull && (
          <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${phase.bg}`}>
            <span className="text-muted-foreground">Remaining</span>
            <span className={`font-black ${phase.color} tabular-nums`}>{remaining} slot{remaining !== 1 ? "s" : ""}</span>
          </div>
        )}
        {estimatedTotal > 0 && !isFull && (
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/6 px-3 py-1.5">
            <span className="text-muted-foreground">Est. total at lock</span>
            <span className="font-black text-amber-300 tabular-nums">~${estimatedTotal.toFixed(2)}</span>
          </div>
        )}
        {isFull && (
          <div className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/8 px-3 py-1.5">
            <CheckCircle2 className="h-3 w-3 text-green-400" />
            <span className="font-black text-green-400">Roster Full — Lock to begin!</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-lg border border-purple-500/15 bg-purple-500/5 px-3 py-1.5 ml-auto">
          <span className="text-[10px] text-purple-300/50 font-medium">Min 3 · Max 100 gamers</span>
        </div>
      </div>

      {/* Deferred payment note */}
      {!isFull && groupTotal > 0 && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/6 px-3 py-2 text-[11px] text-purple-300/70 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-purple-400 shrink-0" />
          Slots reserved at <strong className="text-purple-300">no charge</strong>. Your wallet is debited only when you lock the full roster.
        </div>
      )}
    </div>
  );
}

function BulkSelectionBar({
  count,
  totalCost,
  remainingSlots,
  isPending,
  onAccept,
  onClear,
}: {
  count: number;
  totalCost: number;
  remainingSlots: number;
  isPending: boolean;
  onAccept: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  const wouldExceed = count > remainingSlots;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
      <div
        className="flex items-center gap-3 md:gap-5 rounded-2xl border border-purple-500/50 px-4 md:px-7 py-3 md:py-4 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4 duration-300 flex-wrap justify-center md:justify-start"
        style={{
          background: "linear-gradient(135deg, rgba(76,0,130,0.97) 0%, rgba(12,0,26,0.98) 100%)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 0 50px rgba(168,85,247,0.3), 0 25px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Left: gamer count + cost breakdown */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-7 w-7 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <span className="font-black text-white tabular-nums">{count}</span>
            <span className="text-purple-300/80">gamer{count !== 1 ? "s" : ""} selected</span>
          </div>
          <div className="h-4 w-px bg-purple-500/30 hidden md:block" />
          {/* Cost breakdown strip */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1">
              <span className="text-muted-foreground">Total at lock</span>
              <span className="font-black text-purple-300 tabular-nums">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/8 px-2.5 py-1">
              <span className="text-amber-300 font-bold">10%</span>
              <span className="text-muted-foreground">fee</span>
              <span className="font-black text-amber-300 tabular-nums">${(totalCost * 0.1).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/8 px-2.5 py-1">
              <span className="text-muted-foreground">Gamers get</span>
              <span className="font-black text-green-400 tabular-nums">${(totalCost * 0.9).toFixed(2)}</span>
            </div>
          </div>
          {wouldExceed && (
            <span className="text-amber-400 text-xs font-bold flex items-center gap-1 ml-1">
              <AlertTriangle className="h-3 w-3" /> exceeds slots
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="text-purple-400/50 hover:text-purple-300 text-xs h-8 px-3"
            onClick={onClear}
            disabled={isPending}
          >
            Clear
          </Button>
          <Button
            size="sm"
            className="text-white font-black uppercase text-xs h-8 px-5"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
              boxShadow: "0 0 20px rgba(168,85,247,0.5)",
            }}
            onClick={onAccept}
            disabled={isPending || wouldExceed}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Reserving…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Reserve {count} Slot{count !== 1 ? "s" : ""}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BidCard({
  bid,
  isHirer,
  requestStatus,
  currentUserId,
  requestId,
  gameName,
  isBulkMode,
  currentGroupTotal,
  isSelected,
  onToggleSelect,
  preferredCountry,
  preferredGender,
}: {
  bid: Bid;
  isHirer: boolean;
  requestStatus: string;
  currentUserId: number;
  requestId: number;
  gameName: string;
  isBulkMode?: boolean;
  currentGroupTotal?: number;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  preferredCountry?: string | null;
  preferredGender?: string | null;
}) {
  // Auto-open the chat when the bid is already accepted (active session)
  const [chatOpen, setChatOpen] = useState(bid.status === "accepted");
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const { toast } = useToast();

  const isMe = bid.bidderId === currentUserId;
  const isAccepted = bid.status === "accepted";
  const isRejected = bid.status === "rejected";
  const canChat = (isHirer || isMe) && (isAccepted || isMe);
  const showCheckbox = isBulkMode && isHirer && bid.status === "pending" && !!onToggleSelect;

  /* ── Preference match logic ── */
  const hasNationPref = !!preferredCountry && preferredCountry !== "any";
  const hasGenderPref = !!preferredGender  && preferredGender  !== "any";
  const hasAnyPref    = hasNationPref || hasGenderPref;
  const matchesNation = !hasNationPref || bid.bidderCountry === preferredCountry;
  const matchesGender = !hasGenderPref || bid.bidderGender  === preferredGender;
  const fullyMatches  = hasAnyPref && matchesNation && matchesGender;
  const partialMatch  = hasAnyPref && !fullyMatches && (matchesNation || matchesGender);
  /* Perfect dual match: hirer has BOTH prefs set and this bidder satisfies BOTH */
  const dualPrefMatch = hasNationPref && hasGenderPref && matchesNation && matchesGender;

  return (
    <>
      {showAcceptModal && (
        <AcceptModal
          bid={bid}
          requestId={requestId}
          isBulkMode={isBulkMode}
          currentGroupTotal={currentGroupTotal}
          onClose={() => setShowAcceptModal(false)}
        />
      )}
      {showReport && (
        <ReportModal reportedUserId={bid.bidderId} reportedName={bid.bidderName} onClose={() => setShowReport(false)} />
      )}

      <div
        className={`group rounded-2xl border overflow-hidden transition-all duration-300 ${
          isAccepted                  ? "border-green-500/45 shadow-[0_0_28px_rgba(34,197,94,0.10)]" :
          isRejected                  ? "border-border/25 opacity-45" :
          isSelected                  ? "border-purple-500/65 shadow-[0_0_32px_rgba(168,85,247,0.18)]" :
          dualPrefMatch && isHirer    ? "border-emerald-400/70 shadow-[0_0_44px_rgba(16,185,129,0.28)]" :
          fullyMatches  && isHirer    ? "border-emerald-500/50 shadow-[0_0_28px_rgba(16,185,129,0.12)]" :
          partialMatch  && isHirer    ? "border-amber-500/35" :
          isMe                        ? "border-secondary/40" :
          "border-border/60 hover:border-primary/30 hover:shadow-[0_0_24px_rgba(168,85,247,0.08)]"
        }`}
        style={{
          background: isAccepted        ? "linear-gradient(135deg,rgba(34,197,94,0.05) 0%,rgba(0,0,0,0.55) 100%)" :
                      isSelected        ? "linear-gradient(135deg,rgba(168,85,247,0.07) 0%,rgba(0,0,0,0.55) 100%)" :
                      dualPrefMatch && isHirer ? "linear-gradient(135deg,rgba(16,185,129,0.11) 0%,rgba(5,150,105,0.04) 60%,rgba(0,0,0,0.55) 100%)" :
                      fullyMatches && isHirer  ? "linear-gradient(135deg,rgba(16,185,129,0.06) 0%,rgba(0,0,0,0.55) 100%)" :
                      isMe            ? "linear-gradient(135deg,rgba(6,182,212,0.05) 0%,rgba(0,0,0,0.55) 100%)" :
                                        "linear-gradient(135deg,rgba(255,255,255,0.025) 0%,rgba(0,0,0,0.50) 100%)",
        }}
      >
        {/* ── Top accent line ── */}
        <div
          className="h-[2px] w-full"
          style={{
            background: isAccepted
              ? "linear-gradient(90deg,transparent 0%,#22c55e 40%,#22c55e 60%,transparent 100%)"
              : dualPrefMatch && isHirer
              ? "linear-gradient(90deg,transparent 0%,#34d399 20%,#10b981 50%,#34d399 80%,transparent 100%)"
              : fullyMatches && isHirer
              ? "linear-gradient(90deg,transparent 0%,#10b981 40%,#10b981 60%,transparent 100%)"
              : isMe
              ? "linear-gradient(90deg,transparent 0%,#22d3ee 40%,#22d3ee 60%,transparent 100%)"
              : "linear-gradient(90deg,transparent 0%,#a855f7 40%,#a855f7 60%,transparent 100%)",
            opacity: isRejected ? 0.2 : dualPrefMatch && isHirer ? 1 : 0.7,
          }}
        />

        <div className="p-5 space-y-4">
          {/* ── Header row: avatar + info + price ── */}
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Bulk select checkbox */}
            {showCheckbox && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleSelect!(); }}
                className={`h-5 w-5 rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center transition-all mt-3 ${
                  isSelected
                    ? "bg-purple-500 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                    : "bg-transparent border-white/20 hover:border-purple-400/60"
                }`}
              >
                {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
              </button>
            )}

            {/* Avatar — shows profile photo if available, falls back to initial */}
            <div
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl shrink-0 flex items-center justify-center text-base sm:text-lg font-black select-none overflow-hidden"
              style={{
                background: isAccepted ? "rgba(34,197,94,0.15)" : isMe ? "rgba(34,211,238,0.15)" : "rgba(168,85,247,0.15)",
                border: `1.5px solid ${isAccepted ? "rgba(34,197,94,0.35)" : isMe ? "rgba(34,211,238,0.35)" : "rgba(168,85,247,0.35)"}`,
                color: isAccepted ? "#4ade80" : isMe ? "#22d3ee" : "#c084fc",
              }}
            >
              {bid.bidderProfilePhotoUrl ? (
                <img
                  src={`/api/storage${bid.bidderProfilePhotoUrl}`}
                  alt={bid.bidderName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.dataset.initial = "true";
                  }}
                />
              ) : (
                bid.bidderName.trim()[0]?.toUpperCase() ?? "G"
              )}
            </div>

            {/* Name + badges block */}
            <div className="flex-1 min-w-0 space-y-1">
              {/* Row 1: Name + verified */}
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/users/${bid.bidderId}`} className="font-extrabold text-white text-base leading-none hover:text-primary transition-colors">
                  {bid.bidderName}
                </Link>
                <VerifiedBadge
                  idVerified={bid.bidderIdVerified ?? false}
                  underReview={!(bid.bidderIdVerified ?? false) && (bid.bidderGamingAccounts?.length ?? 0) > 0}
                  variant="compact"
                />
                {isMe && <span className="text-xs text-secondary font-semibold">(You)</span>}
                {isAccepted && bid.discordUsername && (
                  <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />{bid.discordUsername}
                  </span>
                )}
              </div>

              {/* Row 2: Trust + reputation + compact streaming */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <TrustChip value={bid.bidderTrustFactor ?? 50} />
                <ReputationBadges
                  compact
                  badges={computeBadges({
                    trustFactor: bid.bidderTrustFactor ?? 50,
                    idVerified: bid.bidderIdVerified ?? false,
                    sessionsAsGamerCount: bid.bidderSessionsAsGamerCount ?? 0,
                    sessionsAsHirerCount: 0,
                    beginnerFriendly: false,
                  }).filter((b) => b.id !== "verified")}
                />
                <BidderStreamingBadges bidderId={bid.bidderId} compact />
              </div>

              {/* Row 2b: Connected gaming accounts with label */}
              <BidderGamingBadges accounts={bid.bidderGamingAccounts} compact />

              {/* Row 3: Geo pills + timestamp */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {bid.bidderCountry && bid.bidderCountry !== "any" && COUNTRY_MAP[bid.bidderCountry] && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5"
                    style={{
                      background: "rgba(251,191,36,0.09)",
                      border: "1px solid rgba(251,191,36,0.22)",
                      color: "rgba(251,191,36,0.85)",
                    }}
                  >
                    <span className="text-[12px] leading-none">{COUNTRY_MAP[bid.bidderCountry].flag}</span>
                    <span>{COUNTRY_MAP[bid.bidderCountry].label}</span>
                  </span>
                )}
                {bid.bidderGender && bid.bidderGender !== "any" && GENDER_MAP[bid.bidderGender] && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5"
                    style={{
                      background: "rgba(236,72,153,0.09)",
                      border: "1px solid rgba(236,72,153,0.22)",
                      color: "rgba(236,72,153,0.80)",
                    }}
                  >
                    <span className="text-[12px] leading-none">{GENDER_MAP[bid.bidderGender].icon}</span>
                    <span>{GENDER_MAP[bid.bidderGender].label}</span>
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground/45 ml-auto tabular-nums">
                  {format(new Date(bid.createdAt), "MMM d, h:mm a")}
                </span>
              </div>
            </div>

            {/* Price + status + match badge — right column */}
            <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
              <div
                className="text-xl sm:text-2xl font-black tabular-nums leading-none"
                style={{
                  color: isAccepted ? "#4ade80" : "#ffffff",
                  textShadow: isAccepted ? "0 0 16px rgba(34,197,94,0.4)" : "0 0 16px rgba(255,255,255,0.1)",
                }}
              >
                ${bid.price.toFixed(2)}
              </div>
              <div
                className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                style={
                  isAccepted ? { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.40)", color: "#4ade80" } :
                  isRejected ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)" } :
                               { background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24" }
                }
              >
                {bid.status}
              </div>

              {/* ── Match badge — top-right, compact ── */}
              {isHirer && hasAnyPref && (dualPrefMatch || fullyMatches || partialMatch) && (
                <div className="flex flex-col items-end gap-1 mt-0.5">
                  {/* Main label chip */}
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap ${
                      dualPrefMatch ? "match-perfect" :
                      fullyMatches  ? "matches-glow"  : ""
                    }`}
                    style={
                      dualPrefMatch
                        ? {
                            background: "linear-gradient(135deg,rgba(16,185,129,0.24) 0%,rgba(52,211,153,0.14) 100%)",
                            border: "1px solid rgba(52,211,153,0.60)",
                            color: "#34d399",
                          }
                        : fullyMatches
                        ? {
                            background: "rgba(16,185,129,0.14)",
                            border: "1px solid rgba(16,185,129,0.42)",
                            color: "#10b981",
                          }
                        : {
                            background: "rgba(245,158,11,0.10)",
                            border: "1px solid rgba(245,158,11,0.30)",
                            color: "#f59e0b",
                          }
                    }
                  >
                    {dualPrefMatch ? (
                      <span className="text-[12px] leading-none shrink-0">✦</span>
                    ) : fullyMatches ? (
                      <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                    ) : (
                      <Sparkles className="h-2.5 w-2.5 shrink-0" />
                    )}
                    <span>
                      {dualPrefMatch ? "Perfect Match" : fullyMatches ? "Matches Prefs" : "Partial Match"}
                    </span>
                  </div>
                  {/* Criterion pills */}
                  {(hasNationPref || hasGenderPref) && (
                    <div className="flex items-center gap-1">
                      {hasNationPref && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5"
                          style={
                            matchesNation
                              ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.32)", color: "#34d399" }
                              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.28)" }
                          }
                        >
                          <span>{matchesNation ? "✓" : "✗"}</span>
                          <span>{COUNTRY_MAP[preferredCountry!]?.flag ?? "🌍"}</span>
                        </span>
                      )}
                      {hasGenderPref && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5"
                          style={
                            matchesGender
                              ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.32)", color: "#34d399" }
                              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.28)" }
                          }
                        >
                          <span>{matchesGender ? "✓" : "✗"}</span>
                          <span>{GENDER_MAP[preferredGender!]?.icon ?? "?"}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Pitch / message ── */}
          <div
            className="rounded-xl px-4 py-3"
            style={{
              borderLeft: "3px solid rgba(168,85,247,0.35)",
              background: "linear-gradient(135deg,rgba(168,85,247,0.04) 0%,rgba(0,0,0,0.15) 100%)",
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.78)" }}>
              {bid.message}
            </p>
          </div>

          {/* ── Gaming Accounts + Streaming + Quest ── */}
          <BidderGamingBadges accounts={bid.bidderGamingAccounts} />
          <BidderStreamingBadges bidderId={bid.bidderId} />
          {!isMe && <BidderQuestSummary bidderId={bid.bidderId} gameName={gameName} />}

          {/* ── Bio quote ── */}
          {bid.bidderBio && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                borderLeft: "3px solid rgba(168,85,247,0.40)",
                background: "linear-gradient(135deg,rgba(168,85,247,0.05) 0%,rgba(6,182,212,0.02) 100%)",
              }}
            >
              <div className="px-4 py-3 space-y-1.5">
                <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "rgba(168,85,247,0.65)" }}>
                  About this gamer
                </span>
                <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.70)", fontStyle: "italic" }}>
                  &ldquo;{bid.bidderBio.length > 90
                    ? bid.bidderBio.slice(0, 90).trimEnd() + "…"
                    : bid.bidderBio}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex gap-2.5 flex-wrap pt-1">
            {isHirer && bid.status === "pending" && requestStatus === "open" && (
              <div className="relative">
                <div
                  className="absolute -inset-[2px] rounded-xl opacity-50"
                  style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", filter: "blur(6px)" }}
                />
                <Button
                  size="sm"
                  className="relative bg-green-500 hover:bg-green-400 text-white font-extrabold uppercase tracking-wider text-xs px-5 h-9 shadow-[0_0_20px_rgba(34,197,94,0.40)] border-0"
                  onClick={() => setShowAcceptModal(true)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Accept Bid
                </Button>
              </div>
            )}
            {canChat && (
              <Button
                size="sm"
                variant="outline"
                className={`text-xs font-bold uppercase tracking-wider border-secondary/40 text-secondary hover:bg-secondary/15 h-9 ${chatOpen ? "bg-secondary/10" : ""}`}
                onClick={() => setChatOpen((v) => !v)}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                {chatOpen ? "Hide Chat" : "Open Chat"}
              </Button>
            )}
            {!isMe && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-bold uppercase tracking-wider border-destructive/25 text-destructive/50 hover:border-destructive/55 hover:text-destructive hover:bg-destructive/8 h-9 ml-auto"
                onClick={() => setShowReport(true)}
              >
                <Flag className="h-3 w-3 mr-1.5" />
                Report
              </Button>
            )}
          </div>

          {chatOpen && canChat && (
            <ChatPanel bidId={bid.id} currentUserId={currentUserId} discordUsername={bid.discordUsername} />
          )}
        </div>
      </div>
    </>
  );
}

function GiftPanel({ requestId }: { requestId: number }) {
  const [amount, setAmount] = useState("");
  const gift = useSendGift();
  const { toast } = useToast();

  const handleGift = () => {
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    gift.mutate({ requestId, amount: n }, {
      onSuccess: (d: any) => {
        toast({ title: "Gift sent!", description: d?.message });
        setAmount("");
      },
      onError: (err: any) => toast({ title: "Error", description: err?.error || "Failed", variant: "destructive" }),
    });
  };

  return (
    <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
        <Gift className="h-4 w-4" />
        Send a Tip / Gift
      </div>
      <p className="text-xs text-muted-foreground">Enjoyed the session? Send an optional tip directly from your Hiring Wallet.</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">$</span>
          <Input
            type="number"
            min={1}
            step={0.5}
            placeholder="0.00"
            className="pl-8 bg-background"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button
          className="bg-pink-500/20 border border-pink-500/40 text-pink-400 hover:bg-pink-500 hover:text-white font-bold uppercase"
          onClick={handleGift}
          disabled={!amount || gift.isPending}
        >
          <Gift className="h-4 w-4 mr-1.5" />
          {gift.isPending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}

const WPA_OPTIONS: { value: "yes" | "no" | "maybe"; label: string; icon: string; activeColor: string; activeBg: string; activeBorder: string }[] = [
  { value: "yes",   label: "Yes!",   icon: "👍", activeColor: "#4ade80", activeBg: "rgba(74,222,128,0.15)", activeBorder: "rgba(74,222,128,0.5)" },
  { value: "maybe", label: "Maybe",  icon: "🤔", activeColor: "#facc15", activeBg: "rgba(250,204,21,0.15)", activeBorder: "rgba(250,204,21,0.5)" },
  { value: "no",    label: "No",     icon: "👎", activeColor: "#f87171", activeBg: "rgba(248,113,113,0.15)", activeBorder: "rgba(248,113,113,0.5)" },
];

const REVIEW_CHIPS: { id: string; emoji: string; label: string; text: string }[] = [
  { id: "comm_great",   emoji: "💬", label: "Great comms",      text: "Great communication throughout." },
  { id: "skill_high",   emoji: "🎮", label: "Highly skilled",   text: "Very skilled player." },
  { id: "friendly",     emoji: "🤝", label: "Friendly",         text: "Friendly and easy to play with." },
  { id: "fun",          emoji: "🔥", label: "Super fun!",       text: "The session was super fun!" },
  { id: "on_time",      emoji: "⚡", label: "Punctual",         text: "Was on time and ready to go." },
  { id: "as_described", emoji: "✅", label: "As described",     text: "Exactly as described in their profile." },
  { id: "recommend",    emoji: "💯", label: "Recommend",        text: "I'd recommend them to anyone." },
  { id: "pro",          emoji: "🚀", label: "Pro level",        text: "Plays at a seriously pro level." },
  { id: "comm_poor",    emoji: "🔇", label: "Poor comms",       text: "Communication could be improved." },
  { id: "toxic",        emoji: "⚠️", label: "Rude/Toxic",       text: "Behavior was not acceptable at times." },
  { id: "skill_low",    emoji: "📉", label: "Below described",  text: "Skill wasn't quite as described." },
];

function ReviewChips({ comment, onToggle }: { comment: string; onToggle: (chip: { id: string; text: string }) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        Quick tags — tap to add to your review
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REVIEW_CHIPS.map((chip) => {
          const active = comment.includes(chip.text);
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onToggle(chip)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all select-none"
              style={active
                ? { background: "rgba(168,85,247,0.2)", borderColor: "rgba(168,85,247,0.6)", color: "#c084fc" }
                : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }
              }
            >
              <span>{chip.emoji}</span>
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WouldPlayAgainToggle({ value, onChange }: { value: string | null; onChange: (v: "yes" | "no" | "maybe") => void }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Would you play with them again?
        <span className="ml-1 text-muted-foreground/40 font-normal normal-case tracking-normal">(optional)</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {WPA_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-xs font-bold transition-all"
              style={active
                ? { borderColor: opt.activeBorder, background: opt.activeBg, color: opt.activeColor, boxShadow: `0 0 12px ${opt.activeBorder}` }
                : { borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.35)" }}
            >
              <span className="text-xl">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReviewPanel({ requestId, currentUserId, awaitingReviews }: { requestId: number; currentUserId: number; awaitingReviews?: boolean }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [wouldPlayAgain, setWouldPlayAgain] = useState<"yes" | "no" | "maybe" | null>(null);
  const { data: reviews = [], refetch } = useRequestReviews(requestId);
  const submit = useSubmitReview();
  const { toast } = useToast();

  const myReview = reviews.find((r) => r.reviewerId === currentUserId);

  const toggleChip = (chip: { id: string; text: string }) => {
    if (comment.includes(chip.text)) {
      setComment(comment.replace(chip.text, "").replace(/\s{2,}/g, " ").trim());
    } else {
      setComment((prev) => prev ? prev.trim() + " " + chip.text : chip.text);
    }
  };

  if (myReview) {
    const color = SCORE_COLOR[myReview.rating] ?? "bg-green-500";
    const label = SCORE_LABELS[myReview.rating] ?? "";
    const wpaOpt = WPA_OPTIONS.find((o) => o.value === myReview.wouldPlayAgain);
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
            <Star className="h-4 w-4 fill-yellow-400" />
            Your Review — Submitted
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-black px-2.5 py-1 rounded ${color} text-black`}>{myReview.rating}/10</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        </div>
        {wpaOpt && (
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: wpaOpt.activeColor }}>
            <span>{wpaOpt.icon}</span><span>Would play again: {wpaOpt.label}</span>
          </div>
        )}
        {myReview.comment && <p className="text-sm text-foreground/80 leading-relaxed border-l-2 border-yellow-500/30 pl-3">{myReview.comment}</p>}
        <div className="flex items-center gap-1.5 text-xs pt-1">
          {awaitingReviews
            ? <><div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /><span className="text-amber-400">Waiting for the other player to submit their review…</span></>
            : <><Trophy className="h-3.5 w-3.5 text-yellow-400" /><span className="text-yellow-400">+50 points awarded — session fully complete!</span></>
          }
        </div>
      </div>
    );
  }

  const canSubmit = rating > 0 && comment.trim().length >= 10;

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-yellow-500/40"
      style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.05), rgba(168,85,247,0.04))", boxShadow: "0 0 28px rgba(234,179,8,0.10)" }}>
      <div className="h-1 bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-600 animate-pulse" />
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-400 font-black text-sm uppercase tracking-wide">
            <Star className="h-4 w-4 fill-yellow-400" />⚡ Review Required
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-yellow-400/70">
            <Trophy className="h-3.5 w-3.5" />+50 pts when both review
          </div>
        </div>

        <ScoreRating value={rating} onChange={setRating} />

        <ReviewChips comment={comment} onToggle={toggleChip} />

        <div className="space-y-1">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was the session? Communication, skill level, behavior, fun factor…"
            className="resize-none h-24 bg-background/60 text-sm border-border/50"
            maxLength={500}
          />
          <div className="text-[11px] text-muted-foreground/50 text-right">
            <span className={comment.trim().length > 0 && comment.trim().length < 10 ? "text-destructive font-bold" : ""}>
              {comment.trim().length}/500{comment.trim().length < 10 && comment.trim().length > 0 ? ` — ${10 - comment.trim().length} more needed` : ""}
            </span>
          </div>
        </div>

        <WouldPlayAgainToggle value={wouldPlayAgain} onChange={setWouldPlayAgain} />

        <Button
          className="w-full font-black uppercase tracking-wider text-sm py-5 disabled:opacity-40"
          style={canSubmit ? { background: "linear-gradient(135deg, #eab308, #f59e0b)", color: "#000" } : undefined}
          variant={canSubmit ? "default" : "outline"}
          onClick={() => {
            if (!rating) { toast({ title: "Pick a score first", description: "Tap a number 1–10.", variant: "destructive" }); return; }
            if (comment.trim().length < 10) { toast({ title: "Comment too short", description: "At least 10 characters required.", variant: "destructive" }); return; }
            submit.mutate({ requestId, rating, comment: comment.trim(), wouldPlayAgain: wouldPlayAgain ?? undefined }, {
              onSuccess: (data: any) => {
                if (data?.bothReviewed) {
                  toast({ title: "🎉 +50 Points Earned!", description: "Both reviews in — session fully complete!", duration: 7000 });
                } else {
                  toast({ title: "✅ Review Submitted!", description: "Waiting for the other player to review…", duration: 7000 });
                }
                refetch();
              },
              onError: (err: any) => toast({ title: "Error", description: err?.error || "Failed", variant: "destructive" }),
            });
          }}
          disabled={!canSubmit || submit.isPending}
        >
          {submit.isPending
            ? <><div className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin mr-2" />Submitting…</>
            : <><Star className="h-4 w-4 mr-1.5 fill-current" />{rating > 0 ? `Submit Review · ${rating}/10` : "Submit Review — pick a score"}</>
          }
        </Button>
      </div>
    </div>
  );
}

function ForcedReviewModal({
  requestId,
  gameName,
  currentUserId,
  otherPersonName,
  isHirer,
  onDone,
}: {
  requestId: number;
  gameName: string;
  currentUserId: number;
  otherPersonName: string;
  isHirer: boolean;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [wouldPlayAgain, setWouldPlayAgain] = useState<"yes" | "no" | "maybe" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [bothDone, setBothDone] = useState(false);
  const [skipWarning, setSkipWarning] = useState(false);
  const { data: reviews = [], refetch } = useRequestReviews(requestId);
  const submit = useSubmitReview();
  const { toast } = useToast();

  const myReview = reviews.find((r) => r.reviewerId === currentUserId);
  const alreadyReviewed = !!myReview;

  const toggleChip = (chip: { id: string; text: string }) => {
    if (comment.includes(chip.text)) {
      setComment(comment.replace(chip.text, "").replace(/\s{2,}/g, " ").trim());
    } else {
      setComment((prev) => prev ? prev.trim() + " " + chip.text : chip.text);
    }
  };

  const handleSubmit = () => {
    if (!rating) { toast({ title: "Pick a score first", description: "Tap a number 1–10.", variant: "destructive" }); return; }
    if (comment.trim().length < 10) { toast({ title: "Review too short", description: "Write at least 10 characters.", variant: "destructive" }); return; }
    submit.mutate({ requestId, rating, comment: comment.trim(), wouldPlayAgain: wouldPlayAgain ?? undefined }, {
      onSuccess: (data: any) => {
        const both = !!(data as any)?.bothReviewed;
        setSubmitted(true);
        setBothDone(both);
        refetch();
        if (both) setTimeout(onDone, 2400);
      },
      onError: (err: any) => toast({ title: "Submission failed", description: err?.error || "Please try again.", variant: "destructive" }),
    });
  };

  const scoreLabel = rating > 0 ? SCORE_LABELS[rating] ?? "" : "";
  const scoreColor = rating > 0 ? (SCORE_COLOR[rating] ?? "bg-green-500") : "bg-muted";
  const wpaOptSubmitted = WPA_OPTIONS.find((o) => o.value === myReview?.wouldPlayAgain);
  const canSubmit = rating > 0 && comment.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.96)", backdropFilter: "blur(16px)" }}>
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-card overflow-hidden"
        style={{
          border: "2px solid rgba(234,179,8,0.45)",
          boxShadow: "0 0 100px rgba(234,179,8,0.15), 0 30px 80px rgba(0,0,0,0.9)",
          maxHeight: "92dvh",
          overflowY: "auto",
        }}>

        {/* Pulsing top stripe */}
        <div className="h-1.5 bg-gradient-to-r from-yellow-700 via-amber-400 to-yellow-700 animate-pulse shrink-0" />

        <div className="p-5 sm:p-6 space-y-5">

          {/* ── HEADER ── */}
          <div className="text-center space-y-2">
            <div className="relative inline-flex mx-auto">
              <div className="h-16 w-16 rounded-full flex items-center justify-center border-2 border-yellow-500/50 bg-yellow-500/10"
                style={{ boxShadow: "0 0 32px rgba(234,179,8,0.25)" }}>
                {alreadyReviewed || submitted
                  ? <CheckCircle2 className="h-9 w-9 text-green-400" />
                  : <Star className="h-9 w-9 text-yellow-400 fill-yellow-400" />
                }
              </div>
              {!alreadyReviewed && !submitted && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-card flex items-center justify-center text-[9px] font-black text-white animate-bounce">!</span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-foreground">
              {alreadyReviewed || submitted
                ? submitted && bothDone ? "🎉 Session Complete!" : "✅ Review Submitted"
                : "⚡ Rate Your Gaming Session"
              }
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {alreadyReviewed || submitted
                ? submitted && bothDone
                  ? <>Both reviews in — <span className="text-yellow-400 font-black">+50 points</span> awarded to each player!</>
                  : <>Waiting for <strong className="text-foreground">{otherPersonName}</strong> to review. You'll both get your points when they do.</>
                : <>Your <strong className="text-yellow-400">{gameName}</strong> session with <strong className="text-foreground">{otherPersonName}</strong> is complete. Your honest review makes Gamerbuddy safer for everyone.</>
              }
            </p>
          </div>

          {/* ── POINTS CALLOUT ── */}
          {!alreadyReviewed && !submitted && (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-yellow-500/25 bg-yellow-500/8 px-4 py-3"
              style={{ background: "rgba(234,179,8,0.06)" }}>
              <Trophy className="h-5 w-5 text-yellow-400 shrink-0" />
              <span className="text-sm font-bold text-yellow-300">
                Both players earn <span className="text-white font-black">+50 points</span> when both reviews are in
              </span>
            </div>
          )}

          {/* ── WAITING STATE ── */}
          {(alreadyReviewed || submitted) && !bothDone && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-center space-y-3">
              {myReview && wpaOptSubmitted && (
                <div className="flex items-center justify-center gap-2 text-sm font-bold" style={{ color: wpaOptSubmitted.activeColor }}>
                  <span className="text-lg">{wpaOptSubmitted.icon}</span>
                  <span>You selected: Would play again — {wpaOptSubmitted.label}</span>
                </div>
              )}
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <div className="text-sm font-bold text-amber-400">Waiting on {otherPersonName}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                {isHirer ? "The gamer" : "The hirer"} still needs to leave their review. You'll both get +50 points when they do.
              </p>
              <Button onClick={onDone} size="sm" variant="outline"
                className="text-xs font-bold uppercase text-muted-foreground hover:text-amber-400 hover:border-amber-500/40">
                Close — I'll check back later
              </Button>
            </div>
          )}

          {/* ── BOTH DONE CELEBRATION ── */}
          {submitted && bothDone && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 text-center space-y-3">
              <div className="text-4xl">🎉</div>
              <div className="text-lg font-extrabold text-green-400 uppercase tracking-wide">Session Fully Complete!</div>
              <div className="text-sm text-muted-foreground">
                Both reviews submitted · <span className="text-yellow-400 font-black">+50 points</span> awarded
              </div>
              <Button onClick={onDone} className="bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-wider w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Awesome, close
              </Button>
            </div>
          )}

          {/* ── REVIEW FORM ── */}
          {!alreadyReviewed && !submitted && (
            <div className="space-y-5">

              {/* Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black uppercase tracking-widest text-foreground/70">
                    Overall Score <span className="text-red-400">*</span>
                  </span>
                  {rating > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className={`font-black px-2 py-0.5 rounded text-xs ${scoreColor} text-black`}>{rating}/10</span>
                      <span className="text-muted-foreground">{scoreLabel}</span>
                    </div>
                  )}
                </div>
                <ScoreRating value={rating} onChange={setRating} />
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { label: "💬 Comms", hint: "How well did they communicate?" },
                    { label: "🎮 Skill", hint: "Skill level as described?" },
                    { label: "🤝 Behavior", hint: "Respectful and friendly?" },
                    { label: "🎉 Fun", hint: "Did you actually enjoy it?" },
                  ].map((dim) => (
                    <div key={dim.label} className="text-center rounded-lg border border-border/30 bg-background/30 px-1.5 py-2" title={dim.hint}>
                      <div className="text-[10px] font-bold text-muted-foreground/70 leading-tight">{dim.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick chips */}
              <ReviewChips comment={comment} onToggle={toggleChip} />

              {/* Written review */}
              <div className="space-y-1.5">
                <div className="text-xs font-black uppercase tracking-widest text-foreground/70">
                  Written Review <span className="text-red-400">*</span>
                  <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground/50">min 10 chars</span>
                </div>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`How was the session with ${otherPersonName}? Communication, skill, behavior, fun — be honest and specific.`}
                  className="resize-none h-28 bg-background/60 text-sm border-border/50"
                  maxLength={500}
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/50">
                  <span>Honest reviews build trust — yours matters</span>
                  <span className={comment.trim().length > 0 && comment.trim().length < 10 ? "text-destructive font-bold" : ""}>
                    {comment.trim().length}/500
                  </span>
                </div>
              </div>

              {/* Would play again */}
              <WouldPlayAgainToggle value={wouldPlayAgain} onChange={setWouldPlayAgain} />

              {/* Submit */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submit.isPending}
                  className="w-full font-black uppercase tracking-wider text-sm py-6 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={canSubmit ? { background: "linear-gradient(135deg, #eab308, #f59e0b)", color: "#000" } : undefined}
                >
                  {submit.isPending
                    ? <><div className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin mr-2" />Submitting…</>
                    : canSubmit
                      ? <><Star className="h-4 w-4 mr-2 fill-black" />Submit Review · {rating}/10</>
                      : <><Star className="h-4 w-4 mr-2" />{!rating ? "Choose a score above first" : "Write at least 10 characters"}</>
                  }
                </Button>

                {/* Skip / disclaimer row */}
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] text-muted-foreground/40 leading-tight">
                    Can't be edited after submission
                  </p>
                  {!skipWarning
                    ? (
                      <button
                        type="button"
                        onClick={() => setSkipWarning(true)}
                        className="text-[10px] text-muted-foreground/35 hover:text-muted-foreground/60 underline underline-offset-2 transition-colors"
                      >
                        Skip for now
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-2.5 py-1.5 max-w-[220px]"
                        style={{ background: "rgba(245,158,11,0.07)" }}>
                        <span className="text-[10px] text-amber-400/80 leading-snug">
                          Reviews build community trust — you'll be reminded next time you visit this session.{" "}
                          <button type="button" onClick={onDone} className="underline font-bold text-amber-400 hover:text-amber-300">
                            Leave anyway
                          </button>
                        </span>
                      </div>
                    )
                  }
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function RequestDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: myGamingAccounts = [] } = useMyGamingAccounts();
  const hasGamingAccount = myGamingAccounts.length > 0;
  const [showReportHirer, setShowReportHirer] = useState(false);
  const [reviewDismissed, setReviewDismissed] = useState(false);

  const requestId = parseInt(params.id ?? "0");
  const { data: request, isLoading: loadingReq } = useRequest(requestId);
  const { data: bids = [], isLoading: loadingBids } = useRequestBids(requestId);

  const [bidPrice, setBidPrice] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const placeBid = usePlaceBid();
  const startSession = useStartSession();
  const completeRequest = useCompleteRequest();
  const lockSession = useLockBulkSession();
  const acceptBid = useAcceptBid();

  const [selectedBidIds, setSelectedBidIds] = useState<Set<number>>(new Set());
  const [bulkAccepting, setBulkAccepting] = useState(false);

  type BidSortKey = "newest" | "price_high" | "price_low" | "trust_high" | "rating_high" | "best_match";
  type ExpFilter = "all" | "beginner" | "decent" | "best" | "expert";
  const [bidSort, setBidSort] = useState<BidSortKey>("newest");
  const [bidExpFilter, setBidExpFilter] = useState<ExpFilter>("all");
  const [bidVerifiedOnly, setBidVerifiedOnly] = useState(false);
  const [bidHasStreaming, setBidHasStreaming] = useState(false);
  const [bidHasQuest, setBidHasQuest] = useState(false);

  const isBulkRequest = request?.isBulkHiring ?? false;
  const bulkSlotsNeeded = request?.bulkGamersNeeded ?? 0;
  const acceptedBidsCount = request?.acceptedBidsCount ?? 0;
  const lockGroupTotal = Math.round(
    bids.filter((b: Bid) => b.status === "accepted").reduce((s: number, b: Bid) => s + b.price, 0) * 100,
  ) / 100;
  const lockPlatformFee = Math.round(lockGroupTotal * 10) / 100;
  const lockGamersTotal = Math.round(lockGroupTotal * 90) / 100;

  const isHirer = user?.id === request?.userId;
  const myBid = bids.find((b: Bid) => b.bidderId === user?.id);
  const acceptedBid = bids.find((b: Bid) => b.status === "accepted");
  const isGamer = myBid?.status === "accepted";
  const sessionStarted = !!(request as any)?.startedAt;
  const canBid = user && !isHirer && !myBid && request?.status === "open";
  const canReview = user && (request?.status === "completed" || request?.status === "awaiting_reviews") && (isHirer || isGamer);
  const mustReview = user && request?.status === "awaiting_reviews" && (isHirer || isGamer);

  const handleLockRoster = () => {
    lockSession.mutate(requestId, {
      onSuccess: (data: any) => {
        toast({
          title: "Roster Locked!",
          description: data?.message ?? `$${(data?.groupTotal ?? 0).toFixed(2)} collected — session is now in progress.`,
          duration: 6000,
        });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.error || "Failed to lock roster.", variant: "destructive" });
      },
    });
  };

  const handleToggleSelect = (bidId: number) => {
    setSelectedBidIds(prev => {
      const next = new Set(prev);
      if (next.has(bidId)) next.delete(bidId);
      else next.add(bidId);
      return next;
    });
  };

  const handleBulkAcceptSelected = async () => {
    const ids = Array.from(selectedBidIds);
    setBulkAccepting(true);
    let accepted = 0;
    for (const bidId of ids) {
      try {
        await acceptBid.mutateAsync({ requestId, bidId });
        accepted++;
      } catch (e: any) {
        toast({ title: "Stopped", description: e?.error || "An error occurred — some bids may not have been accepted.", variant: "destructive" });
        break;
      }
    }
    setBulkAccepting(false);
    setSelectedBidIds(new Set());
    if (accepted > 0) {
      toast({ title: `${accepted} Gamer${accepted !== 1 ? "s" : ""} Added!`, description: `${accepted} bid${accepted !== 1 ? "s" : ""} accepted and held in escrow.` });
    }
  };

  const handlePlaceBid = () => {
    const price = parseFloat(bidPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: "Invalid price", description: "Enter a positive amount.", variant: "destructive" });
      return;
    }
    if (bidMessage.trim().length < 5) {
      toast({ title: "Message too short", description: "At least 5 characters required.", variant: "destructive" });
      return;
    }
    placeBid.mutate({ requestId, price, message: bidMessage.trim() }, {
      onSuccess: () => {
        toast({ title: "Bid Placed!", description: "The hirer will review your offer." });
        setBidPrice("");
        setBidMessage("");
      },
      onError: (err: any) => toast({ title: "Bid failed", description: err?.error || "Error", variant: "destructive" }),
    });
  };

  const handleStartSession = () => {
    startSession.mutate(requestId, {
      onSuccess: () => toast({ title: "Session Started! 🎮", description: "The hirer has been notified. Play on!" }),
      onError: (err: any) => toast({ title: "Error", description: err?.error || "Failed", variant: "destructive" }),
    });
  };

  const handleComplete = () => {
    completeRequest.mutate(requestId, {
      onSuccess: (data: any) => toast({
        title: "Payment Released!",
        description: `${data?.gamerPayout ? `$${(data.gamerPayout as number).toFixed(2)} sent to gamer. ` : ""}Leave a review now to complete the session and earn 50 points!`,
        duration: 7000,
      }),
      onError: (err: any) => toast({ title: "Error", description: err?.error || "Failed", variant: "destructive" }),
    });
  };

  if (loadingReq) return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-56" />
      <Skeleton className="h-40" />
    </div>
  );

  if (!request) return (
    <div className="text-center py-20 text-destructive">Request not found.</div>
  );

  const statusColor: Record<string, string> = {
    open: "border-green-500/40 text-green-400 bg-green-500/10",
    in_progress: "border-primary/40 text-primary bg-primary/10",
    awaiting_reviews: "border-yellow-500/40 text-yellow-400 bg-yellow-500/10",
    completed: "border-secondary/40 text-secondary bg-secondary/10",
    cancelled: "border-border text-muted-foreground",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {showReportHirer && (
        <ReportModal reportedUserId={request.userId} reportedName={request.userName} onClose={() => setShowReportHirer(false)} />
      )}

      {/* Forced review modal — shown when payment is released and user hasn't reviewed */}
      {mustReview && !reviewDismissed && (
        <ForcedReviewModal
          requestId={requestId}
          gameName={request.gameName}
          currentUserId={user!.id}
          otherPersonName={isHirer ? (acceptedBid?.bidderName ?? "the gamer") : request.userName}
          isHirer={!!isHirer}
          onDone={() => setReviewDismissed(true)}
        />
      )}

      {/* Back */}
      <div className="flex items-center justify-between">
        <button onClick={() => setLocation("/browse")} className="flex items-center gap-2 text-muted-foreground hover:text-white text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Browse
        </button>
        {user && !isHirer && (
          <button
            onClick={() => setShowReportHirer(true)}
            className="flex items-center gap-1.5 text-xs text-destructive/50 hover:text-destructive transition-colors"
          >
            <Flag className="h-3.5 w-3.5" /> Report Hirer
          </button>
        )}
      </div>

      {/* User's own GB ID — visible so they can share it with their session partner */}
      {user?.gamerbuddyId && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Your User ID:</span>
          <CopyId id={user.gamerbuddyId} size="sm" />
        </div>
      )}

      <SafetyBanner storageKey="gb_safety_detail" />

      {/* Request card */}
      <Card className="border-border bg-card/50 overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5 flex-wrap">
                Posted by <span className="text-primary font-semibold">{request.userName}</span>
                <VerifiedBadge idVerified={request.userIdVerified ?? false} variant="compact" />
                · {format(new Date(request.createdAt), "MMM d, yyyy")}
              </div>
              <h1 className="text-2xl font-extrabold uppercase tracking-tight text-white flex items-center gap-2">
                <Swords className="h-6 w-6 text-primary" />
                {request.gameName}
              </h1>
            </div>
            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${statusColor[request.status] ?? "border-border text-muted-foreground"}`}>
              {request.status.replace("_", " ")}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs border border-border rounded px-2.5 py-1 font-semibold text-muted-foreground bg-background">
              {PLATFORM_ICON[request.platform]} {request.platform}
            </span>
            <span className={`text-xs border rounded px-2.5 py-1 font-semibold ${SKILL_COLOR[request.skillLevel] ?? "border-border text-muted-foreground"}`}>
              <Layers className="inline h-3 w-3 mr-1" />{request.skillLevel}
            </span>
          </div>

          <div className="bg-background/60 rounded-lg border border-border/50 p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-bold">Objectives</div>
            <p className="text-sm text-foreground/90 leading-relaxed">{request.objectives}</p>
          </div>

          {/* Bulk hiring info banner */}
          {isBulkRequest && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <Users className="h-4 w-4" />
                  Bulk Hiring Session
                </div>
                <div className="text-xs font-black text-purple-300">
                  {acceptedBidsCount} / {bulkSlotsNeeded} slots filled
                </div>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (acceptedBidsCount / Math.max(bulkSlotsNeeded, 1)) * 100)}%` }}
                />
              </div>
              {request.status === "open" && isHirer && acceptedBidsCount > 0 && (
                <p className="text-xs text-purple-300/80">
                  {acceptedBidsCount < bulkSlotsNeeded
                    ? `${bulkSlotsNeeded - acceptedBidsCount} more slot${bulkSlotsNeeded - acceptedBidsCount !== 1 ? "s" : ""} remaining. Accept more bids or lock the roster to start.`
                    : "All slots are filled — roster locked automatically!"}
                </p>
              )}
            </div>
          )}

          {/* Prominent session chat instruction — shown to both parties when session is active */}
          {(isHirer || isGamer) && (request.status === "in_progress" || request.status === "awaiting_reviews") && (
            <div className="rounded-xl border border-secondary/30 bg-secondary/[0.04] p-4 space-y-3">
              <div className="flex items-center gap-2 font-bold text-secondary text-sm uppercase tracking-wide">
                <MessageSquare className="h-4 w-4" />
                Session Chat
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MessageCircle className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="text-indigo-200/80">
                    <strong className="text-indigo-300">Share your Discord username</strong> in the chat below to coordinate voice communication during the session.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-amber-300/75">
                    <strong className="text-amber-300">Never share</strong> your Steam, Epic Games, PSN, or any account passwords with anyone.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                  <span className="text-green-300/70">Stay within Gamerbuddy until payment is released after both reviews are submitted.</span>
                </div>
              </div>
              {acceptedBid?.discordUsername && (
                <div className="flex items-center gap-2 rounded-lg border border-indigo-500/25 bg-indigo-500/8 px-3 py-2">
                  <MessageCircle className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="text-xs text-muted-foreground">Gamer's Discord:</span>
                  <span className="text-xs font-bold text-indigo-300">{acceptedBid.discordUsername}</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground/40">
                Chat refreshes every 10 seconds automatically. Messages are only visible to you and your session partner.
              </p>
            </div>
          )}

          {/* Hirer: Lock Roster button (bulk only, when open and has at least 1 accepted bid) */}
          {isHirer && isBulkRequest && request.status === "open" && acceptedBidsCount > 0 && (
            <div className="rounded-xl border border-purple-500/40 bg-purple-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Lock className="h-4 w-4" />
                Lock Roster &amp; Collect Payment
              </div>
              <p className="text-xs text-muted-foreground">
                {acceptedBidsCount < bulkSlotsNeeded
                  ? `${bulkSlotsNeeded - acceptedBidsCount} slot${bulkSlotsNeeded - acceptedBidsCount !== 1 ? "s" : ""} still open — you can keep adding gamers or lock now to start the session.`
                  : "All slots are filled. Lock the roster to collect payment and start the session."}
              </p>
              {/* Payment preview grid */}
              {lockGroupTotal > 0 && (
                <div className="space-y-2">
                  {/* 3-column grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2.5 flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Session Total</span>
                      <span className="font-black text-purple-300 text-base tabular-nums">${lockGroupTotal.toFixed(2)}</span>
                      <span className="text-[9px] text-muted-foreground/50">{acceptedBidsCount} gamer{acceptedBidsCount !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Platform Fee</span>
                      <span className="font-black text-amber-300 text-base tabular-nums">${lockPlatformFee.toFixed(2)}</span>
                      <span className="text-[9px] text-muted-foreground/50">10%</span>
                    </div>
                    <div className="rounded-xl border border-green-500/25 bg-green-500/8 px-3 py-2.5 flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Gamers Receive</span>
                      <span className="font-black text-green-400 text-base tabular-nums">${lockGamersTotal.toFixed(2)}</span>
                      <span className="text-[9px] text-muted-foreground/50">90%</span>
                    </div>
                  </div>
                  {/* Wallet debit warning */}
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/6 px-3 py-2 text-[11px] text-amber-300/80">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span><strong className="text-amber-300">${lockGroupTotal.toFixed(2)}</strong> will be deducted from your Hiring Wallet when you lock.</span>
                  </div>
                </div>
              )}
              <Button
                className="w-full font-bold uppercase text-sm py-5"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                  boxShadow: "0 0 20px rgba(168,85,247,0.4)",
                }}
                onClick={handleLockRoster}
                disabled={lockSession.isPending}
              >
                <Lock className="h-4 w-4 mr-2" />
                {lockSession.isPending
                  ? "Collecting payment…"
                  : lockGroupTotal > 0
                    ? `Lock & Pay $${lockGroupTotal.toFixed(2)} · ${acceptedBidsCount} Gamer${acceptedBidsCount !== 1 ? "s" : ""}`
                    : `Lock Roster · ${acceptedBidsCount} Gamer${acceptedBidsCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          )}

          {/* Gamer: Start Session button (single-gamer only) */}
          {isGamer && !isBulkRequest && request.status === "in_progress" && !sessionStarted && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Swords className="h-4 w-4" />
                Your bid was accepted — ready to play?
              </div>
              <p className="text-xs text-muted-foreground">
                Click <strong className="text-white">Start Session</strong> to let the hirer know you're online and beginning. They'll be able to approve payment once you're done.
              </p>
              <Button
                className="bg-primary font-bold uppercase text-sm shadow-[0_0_16px_rgba(168,85,247,0.3)] hover:shadow-[0_0_24px_rgba(168,85,247,0.5)] transition-all"
                onClick={handleStartSession}
                disabled={startSession.isPending}
              >
                <Swords className="h-4 w-4 mr-2" />
                {startSession.isPending ? "Starting…" : "Start Session"}
              </Button>
            </div>
          )}

          {/* Gamer: session active */}
          {isGamer && request.status === "in_progress" && (sessionStarted || isBulkRequest) && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              <div>
                <div className="text-green-400 font-bold text-sm">Session Active{isBulkRequest ? " — Bulk Session" : ""}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {isBulkRequest
                    ? `You're part of a bulk session with ${bulkSlotsNeeded} gamers. Payment will be released when the hirer approves completion.`
                    : "Play hard! The hirer will approve payment when you've completed the objectives."}
                </div>
              </div>
            </div>
          )}

          {/* Hirer: waiting for gamer to start (single-gamer only) */}
          {isHirer && !isBulkRequest && request.status === "in_progress" && !sessionStarted && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="h-4 w-4" />
                Waiting for gamer to start
              </div>
              <p className="text-xs text-muted-foreground">
                The gamer needs to click <strong className="text-white">Start Session</strong> before you can approve payment. You'll see the approval button once they're ready.
              </p>
            </div>
          )}

          {/* Hirer: approve payment (after session started) */}
          {isHirer && request.status === "in_progress" && sessionStarted && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                  <Trophy className="h-4 w-4" />
                  {isBulkRequest ? `Bulk Session Active — ${acceptedBidsCount} Gamer${acceptedBidsCount !== 1 ? "s" : ""}` : "Session Active — Approve when objectives are met"}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-green-400/60">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  Live
                </div>
              </div>
              {isBulkRequest ? (
                <p className="text-xs text-muted-foreground">
                  Approving releases <strong className="text-white">90%</strong> of each gamer's bid to their Earnings wallet (10% platform fee per gamer).
                  Total escrow: <strong className="text-white">${((request as any).escrowAmount ?? 0).toFixed(2)}</strong>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Approving releases <strong className="text-white">90%</strong> of escrow to the gamer (10% platform fee). Both players earn <strong className="text-white">50 points</strong> when they leave a review.
                </p>
              )}
              {!isBulkRequest && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/60 rounded-lg border border-border/40 px-3 py-2">
                  <span className="text-white font-bold">
                    ${((request as any).escrowAmount ?? 0).toFixed(2)}
                  </span>
                  in escrow →
                  <span className="text-green-400 font-bold">
                    ${(((request as any).escrowAmount ?? 0) * 0.9).toFixed(2)}
                  </span>
                  to gamer +
                  <span className="text-amber-400 font-bold">
                    ${(((request as any).escrowAmount ?? 0) * 0.1).toFixed(2)}
                  </span>
                  platform fee
                </div>
              )}
              <Button
                className="w-full bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500 hover:text-white font-bold uppercase text-sm py-5"
                onClick={handleComplete}
                disabled={completeRequest.isPending}
              >
                <Trophy className="h-4 w-4 mr-2" />
                {completeRequest.isPending
                  ? "Approving…"
                  : isBulkRequest
                  ? `Complete Bulk Session · Pay ${acceptedBidsCount} Gamer${acceptedBidsCount !== 1 ? "s" : ""}`
                  : "Approve Payment & Complete Session"}
              </Button>
            </div>
          )}

          {/* Awaiting reviews banner */}
          {request.status === "awaiting_reviews" && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
                <Star className="h-4 w-4" />
                Payment Released — Reviews Required
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Payment has been sent to the gamer. Both players must leave a review to fully complete the session and earn <strong className="text-white">50 points</strong> each.
              </p>
              {mustReview && (
                <Button
                  size="sm"
                  onClick={() => setReviewDismissed(false)}
                  className="bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500 hover:text-black text-xs font-bold uppercase mt-1"
                >
                  <Star className="h-3.5 w-3.5 mr-1.5" /> Leave Your Review
                </Button>
              )}
            </div>
          )}

          {/* Completed banner */}
          {request.status === "completed" && (
            <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-secondary mb-2" />
              <div className="font-bold text-white">{isBulkRequest ? "Bulk Session Complete!" : "Session Fully Complete!"}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {isBulkRequest
                  ? `All ${acceptedBidsCount} gamer${acceptedBidsCount !== 1 ? "s" : ""} paid their 90% cut.`
                  : "Both reviews received · 50 points awarded to each player."}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gift panel — hirer after completion or awaiting reviews */}
      {isHirer && (request.status === "completed" || request.status === "awaiting_reviews") && <GiftPanel requestId={requestId} />}

      {/* Review panel — both sides after payment release */}
      {canReview && (
        <ReviewPanel
          requestId={requestId}
          currentUserId={user!.id}
          awaitingReviews={request.status === "awaiting_reviews"}
        />
      )}

      {/* Place bid */}
      {!user && (
        <Card className="border-secondary/30 bg-card/40">
          <CardContent className="pt-6 text-center space-y-3">
            <Gavel className="h-8 w-8 mx-auto text-secondary" />
            <p className="text-muted-foreground text-sm">Log in to place a bid on this request.</p>
            <Button asChild className="bg-primary font-bold uppercase">
              <Link href="/login">Log In to Bid</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {user && !isHirer && !myBid && !hasGamingAccount && request?.status === "open" && (
        <Card className="border-amber-500/30 bg-amber-500/5 overflow-hidden">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="font-bold text-amber-300 text-sm">Link a gaming account to place bids 🎮</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect at least one gaming account (Steam, Epic, PSN, Xbox, or Nintendo Switch) on your profile. We review within 24 hours — keep your profile Public during review.
                </p>
              </div>
              <Button size="sm" variant="outline" asChild className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 shrink-0 text-xs">
                <Link href="/profile#gaming-management">Link Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canBid && (
        <Card className="border-secondary/30 bg-card/50 overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-transparent via-secondary to-transparent" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
              <Gavel className="h-4 w-4 text-secondary" /> Place Your Bid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.minBidPerHour && (
              <div
                className="flex items-start gap-2.5 rounded-lg p-3 text-xs"
                style={{
                  background: request.hirerRegion === "india" ? "rgba(245,158,11,0.07)" : "rgba(34,197,94,0.07)",
                  border: request.hirerRegion === "india" ? "1px solid rgba(245,158,11,0.22)" : "1px solid rgba(34,197,94,0.20)",
                }}
              >
                <span className={`text-base leading-none mt-0.5 ${request.hirerRegion === "india" ? "text-amber-400" : "text-green-400"}`}>
                  {request.hirerRegion === "india" ? "₹" : "$"}
                </span>
                <div className="space-y-0.5">
                  <div className={`font-bold ${request.hirerRegion === "india" ? "text-amber-300" : "text-green-300"}`}>
                    Minimum rate: {request.hirerRegion === "india" ? `₹${request.minBidPerHour}/hr` : `$${request.minBidPerHour}/hr`}
                    {request.sessionHours && (
                      <span className="text-muted-foreground font-normal ml-1">
                        · {request.sessionHours}h session →{" "}
                        <span className={request.hirerRegion === "india" ? "text-amber-300 font-bold" : "text-green-300 font-bold"}>
                          {request.hirerRegion === "india" ? `₹${(request.minBidPerHour * request.sessionHours).toLocaleString()}` : `$${(request.minBidPerHour * request.sessionHours).toFixed(2)}`} minimum
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground/70">
                    {request.hirerRegion === "india"
                      ? "Minimum fee is ₹350/hr to ensure fair compensation for the Gamer."
                      : "Minimum fee is $8/hr to ensure fair pay for the Gamer."}
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Your Price ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <Input
                    type="number"
                    min={1}
                    step={0.01}
                    placeholder="0.00"
                    className="pl-8 bg-background"
                    value={bidPrice}
                    onChange={(e) => setBidPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center">
                Set a fair price for your services on this request.
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Your Pitch</label>
              <Textarea
                placeholder="Why are you the best fit for this request? What's your experience with this game?"
                className="resize-none h-24 bg-background"
                value={bidMessage}
                onChange={(e) => setBidMessage(e.target.value)}
                maxLength={500}
              />
              <div className="text-right text-xs text-muted-foreground">{bidMessage.length}/500</div>
            </div>
            <Button
              className="w-full bg-secondary/20 border border-secondary/40 text-secondary hover:bg-secondary hover:text-black font-bold uppercase tracking-wider py-5"
              onClick={handlePlaceBid}
              disabled={placeBid.isPending || !bidPrice || !bidMessage}
            >
              <Gavel className="h-4 w-4 mr-2" />
              {placeBid.isPending ? "Submitting…" : "Submit Bid"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isHirer && !canBid && request.status === "open" && (
        <div className="text-center text-xs text-muted-foreground py-2 flex items-center justify-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          You cannot bid on your own request.
        </div>
      )}

      {myBid && !isHirer && (
        <div className="flex items-center gap-3 rounded-xl border border-secondary/30 bg-secondary/5 px-4 py-3 text-sm text-secondary">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          You've placed a bid of <strong>${myBid.price.toFixed(2)}</strong> — waiting for the hirer's decision.
        </div>
      )}

      {/* Bulk progress card — shown above bids when this is a bulk request */}
      {isBulkRequest && request.status === "open" && (
        <BulkProgressCard
          acceptedBidsCount={acceptedBidsCount}
          bulkSlotsNeeded={bulkSlotsNeeded}
          acceptedBids={bids.filter((b: Bid) => b.status === "accepted")}
          pendingBids={bids.filter((b: Bid) => b.status === "pending")}
        />
      )}

      {/* Bids list */}
      {(() => {
        const pendingBids = bids.filter((b: Bid) => b.status === "pending");
        const acceptedBidsList = bids.filter((b: Bid) => b.status === "accepted");
        const currentGroupTotal = Math.round(acceptedBidsList.reduce((s: number, b: Bid) => s + b.price, 0) * 100) / 100;
        const selectableBidIds = pendingBids.map((b: Bid) => b.id);
        const allSelected = selectableBidIds.length > 0 && selectableBidIds.every((id: number) => selectedBidIds.has(id));
        const selectedTotal = bids
          .filter((b: Bid) => selectedBidIds.has(b.id))
          .reduce((s: number, b: Bid) => s + b.price, 0);
        const remainingSlots = bulkSlotsNeeded - acceptedBidsCount;

        /* ── Apply filters ── */
        let filteredBids = [...bids];
        if (bidVerifiedOnly) filteredBids = filteredBids.filter((b) => b.bidderIdVerified);
        if (bidHasStreaming)  filteredBids = filteredBids.filter((b) => b.bidderHasStreaming);
        if (bidHasQuest)      filteredBids = filteredBids.filter((b) => b.bidderHasQuestForGame);
        if (bidExpFilter !== "all") {
          filteredBids = filteredBids.filter((b) => {
            const tf = b.bidderTrustFactor ?? 50;
            if (bidExpFilter === "beginner") return tf < 55;
            if (bidExpFilter === "decent")   return tf >= 55 && tf < 70;
            if (bidExpFilter === "best")     return tf >= 70 && tf < 85;
            if (bidExpFilter === "expert")   return tf >= 85;
            return true;
          });
        }
        /* Helper: match score for a bid given request prefs
           Scoring tiers:
             5 — perfect dual match (both prefs set, both match)
             2 — partial match or single-pref match
             0 — no match / no prefs
        */
        const prefHasNation = !!request.preferredCountry && request.preferredCountry !== "any";
        const prefHasGender = !!request.preferredGender  && request.preferredGender  !== "any";
        const bidMatchScore = (b: Bid) => {
          if (!prefHasNation && !prefHasGender) return 0;
          const nationHit = prefHasNation && b.bidderCountry === request.preferredCountry;
          const genderHit = prefHasGender && b.bidderGender  === request.preferredGender;
          /* Perfect dual match earns a 5 — beats any partial combination */
          if (prefHasNation && prefHasGender && nationHit && genderHit) return 5;
          /* Single hit (either pref) */
          if (nationHit || genderHit) return 2;
          return 0;
        };

        filteredBids.sort((a, b) => {
          if (bidSort === "best_match") {
            const diff = bidMatchScore(b) - bidMatchScore(a);
            if (diff !== 0) return diff;
            return (b.bidderTrustFactor ?? 50) - (a.bidderTrustFactor ?? 50);
          }
          if (bidSort === "price_high")  return b.price - a.price;
          if (bidSort === "price_low")   return a.price - b.price;
          if (bidSort === "trust_high")  return (b.bidderTrustFactor ?? 50) - (a.bidderTrustFactor ?? 50);
          if (bidSort === "rating_high") return (b.bidderAvgRating ?? 0) - (a.bidderAvgRating ?? 0);
          /* default: newest — but boost preference matches to top when hirer has prefs */
          if (isHirer && (prefHasNation || prefHasGender)) {
            const mDiff = bidMatchScore(b) - bidMatchScore(a);
            if (mDiff !== 0) return mDiff;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        /* ── UI data ── */
        const anyHasQuest = bids.some((b: Bid) => b.bidderHasQuestForGame);
        const hasPrefSort = isHirer && (prefHasNation || prefHasGender);
        const sortOptions: { key: typeof bidSort; label: string; Icon: React.ElementType }[] = [
          ...(hasPrefSort ? [{ key: "best_match" as const, label: "Best Match",         Icon: Sparkles }] : []),
          { key: "newest",      label: "Newest First",       Icon: ArrowUpDown },
          { key: "price_high",  label: "Price: High → Low",  Icon: ArrowDown },
          { key: "price_low",   label: "Price: Low → High",  Icon: ArrowUp },
          { key: "trust_high",  label: "Top Trust Factor",   Icon: ShieldCheck },
          { key: "rating_high", label: "Top Rated",          Icon: Star },
        ];

        const expOptions: { key: typeof bidExpFilter; label: string; dot: string }[] = [
          { key: "all",      label: "All Levels", dot: "rgba(255,255,255,0.35)" },
          { key: "beginner", label: "Beginner",   dot: "#60a5fa" },
          { key: "decent",   label: "Decent",     dot: "#4ade80" },
          { key: "best",     label: "Best",       dot: "#f59e0b" },
          { key: "expert",   label: "Expert",     dot: "#f87171" },
        ];

        /* Active filter tags — each carries its own accent color */
        const activeTags: { id: string; label: string; onRemove: () => void; rgb: string }[] = [];
        if (bidExpFilter !== "all") {
          const opt = expOptions.find((o) => o.key === bidExpFilter)!;
          activeTags.push({ id: "exp", label: `Level: ${opt.label}`, onRemove: () => setBidExpFilter("all"), rgb: "96,165,250" });
        }
        if (bidVerifiedOnly) activeTags.push({ id: "verified",  label: "Verified Only",  onRemove: () => setBidVerifiedOnly(false),  rgb: "34,197,94" });
        if (bidHasStreaming)  activeTags.push({ id: "streaming", label: "Has Streaming",  onRemove: () => setBidHasStreaming(false),   rgb: "168,85,247" });
        if (bidHasQuest)     activeTags.push({ id: "quest",     label: "Quest Bids",     onRemove: () => setBidHasQuest(false),       rgb: "251,191,36" });
        if (bidSort !== "newest") {
          const s = sortOptions.find((o) => o.key === bidSort)!;
          activeTags.push({ id: "sort", label: `Sort: ${s.label}`, onRemove: () => setBidSort("newest"), rgb: "34,211,238" });
        }

        const clearAll = () => {
          setBidSort("newest"); setBidExpFilter("all");
          setBidVerifiedOnly(true); setBidHasStreaming(false); setBidHasQuest(false);
        };

        /* Key for animated list re-render when filters change */
        const filterKey = `${bidSort}|${bidExpFilter}|${+bidVerifiedOnly}|${+bidHasStreaming}|${+bidHasQuest}`;

        return (
          <div className="space-y-3">
            {/* ── Header row ── */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Gavel className="h-4 w-4 text-secondary" />
                {loadingBids ? "Loading bids…" : (
                  <>
                    <span style={{ color: "rgba(255,255,255,0.82)" }}>{filteredBids.length}</span>
                    {activeTags.length > 0 && filteredBids.length !== bids.length && (
                      <span className="text-muted-foreground font-normal">of {bids.length}</span>
                    )}
                    <span className="text-muted-foreground">Bid{filteredBids.length !== 1 ? "s" : ""}</span>
                  </>
                )}
              </h2>
              <div className="flex items-center gap-2">
                {isBulkRequest && isHirer && request.status === "open" && selectableBidIds.length > 0 && (
                  <button
                    type="button"
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5 border border-purple-500/30 rounded-lg px-2.5 py-1 hover:border-purple-500/60"
                    onClick={() => {
                      if (allSelected) setSelectedBidIds(new Set());
                      else setSelectedBidIds(new Set(selectableBidIds));
                    }}
                  >
                    {allSelected ? (
                      <><X className="h-3 w-3" /> Deselect All</>
                    ) : (
                      <><CheckCircle2 className="h-3 w-3" /> Select All ({selectableBidIds.length})</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* ── Safety tip for hirers viewing bids ── */}
            {isHirer && !loadingBids && bids.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-blue-500/18 bg-blue-500/5 px-3.5 py-2.5">
                <span className="text-[13px] shrink-0 leading-none mt-0.5">💡</span>
                <p className="text-[11px] text-blue-300/70 leading-snug">
                  For your safety, we recommend completing all payments through Gamerbuddy's secure escrow system. Making deals outside the platform can carry risks, so it's best to stay on the website.
                </p>
              </div>
            )}

            {/* ── Filter panel (sticky desktop-only) ── */}
            {!loadingBids && bids.length > 1 && (
              <div className="sm:sticky top-16 z-40 filter-panel-animate">
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  borderColor: activeTags.length > 0 ? "rgba(168,85,247,0.40)" : "rgba(255,255,255,0.09)",
                  background: "rgba(7,5,16,0.94)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  boxShadow: activeTags.length > 0
                    ? "0 6px 32px rgba(0,0,0,0.50), 0 0 0 1px rgba(168,85,247,0.10)"
                    : "0 4px 24px rgba(0,0,0,0.38)",
                  transition: "border-color 0.3s, box-shadow 0.3s",
                }}
              >
                {/* Panel header */}
                <div
                  className="flex items-center justify-between px-4 py-2.5 border-b"
                  style={{
                    borderColor: "rgba(255,255,255,0.06)",
                    background: activeTags.length > 0 ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.02)",
                    transition: "background 0.25s",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5" style={{ color: activeTags.length > 0 ? "#a855f7" : "rgba(255,255,255,0.35)" }} />
                    <span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>
                      Sort &amp; Filter
                    </span>
                    {activeTags.length > 0 && (
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(168,85,247,0.25)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.40)" }}
                      >
                        {activeTags.length} active
                      </span>
                    )}
                  </div>
                  {activeTags.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1 transition-all duration-150 hover:brightness-110"
                      style={{
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.30)",
                        color: "#f87171",
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* Sort row */}
                <div
                  className="flex items-start gap-3 px-4 py-3 border-b flex-wrap sm:flex-nowrap"
                  style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.15)" }}
                >
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-widest pt-1.5 shrink-0 w-14"
                    style={{ color: "rgba(255,255,255,0.30)" }}
                  >
                    Sort by
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sortOptions.map(({ key, label, Icon }) => {
                      const active = bidSort === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setBidSort(key)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 active:scale-95"
                          style={active ? {
                            background: "rgba(168,85,247,0.22)",
                            border: "1px solid rgba(168,85,247,0.55)",
                            color: "#c084fc",
                            boxShadow: "0 0 12px rgba(168,85,247,0.22)",
                          } : {
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.45)",
                          }}
                        >
                          {active && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                          {!active && <Icon className="h-3 w-3 shrink-0 opacity-50" />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Level filter row */}
                <div
                  className="flex items-start gap-3 px-4 py-3 border-b flex-wrap sm:flex-nowrap"
                  style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.10)" }}
                >
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-widest pt-1.5 shrink-0 w-14"
                    style={{ color: "rgba(255,255,255,0.30)" }}
                  >
                    Level
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {expOptions.map(({ key, label, dot }) => {
                      const active = bidExpFilter === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setBidExpFilter(key)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 active:scale-95"
                          style={active ? {
                            background: "rgba(96,165,250,0.18)",
                            border: "1px solid rgba(96,165,250,0.50)",
                            color: "#93c5fd",
                            boxShadow: "0 0 12px rgba(96,165,250,0.18)",
                          } : {
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.50)",
                          }}
                        >
                          {active ? (
                            <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "#93c5fd" }} />
                          ) : (
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: dot, opacity: 0.7 }} />
                          )}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Badges / toggles row */}
                <div
                  className="flex items-start gap-3 px-4 py-3 flex-wrap sm:flex-nowrap"
                  style={{ background: "rgba(0,0,0,0.10)" }}
                >
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-widest shrink-0 w-14 pt-1.5"
                    style={{ color: "rgba(255,255,255,0.30)" }}
                  >
                    Badges
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Verified Only */}
                    <button
                      onClick={() => setBidVerifiedOnly((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 active:scale-95"
                      style={bidVerifiedOnly ? {
                        background: "rgba(34,197,94,0.18)",
                        border: "1px solid rgba(34,197,94,0.50)",
                        color: "#4ade80",
                        boxShadow: "0 0 12px rgba(34,197,94,0.18)",
                      } : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.45)",
                      }}
                    >
                      {bidVerifiedOnly
                        ? <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "#4ade80" }} />
                        : <ShieldCheck className="h-3 w-3 shrink-0 opacity-50" />
                      }
                      Verified Only
                    </button>
                    {/* Has Streaming */}
                    <button
                      onClick={() => setBidHasStreaming((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 active:scale-95"
                      style={bidHasStreaming ? {
                        background: "rgba(168,85,247,0.20)",
                        border: "1px solid rgba(168,85,247,0.55)",
                        color: "#c084fc",
                        boxShadow: "0 0 12px rgba(168,85,247,0.20)",
                      } : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.45)",
                      }}
                    >
                      {bidHasStreaming
                        ? <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "#c084fc" }} />
                        : <Tv className="h-3 w-3 shrink-0 opacity-50" />
                      }
                      Has Streaming
                    </button>
                    {/* Quest Bids — only visible when at least 1 bidder has a quest for this game */}
                    {anyHasQuest && (
                      <button
                        onClick={() => setBidHasQuest((v) => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 active:scale-95"
                        style={bidHasQuest ? {
                          background: "rgba(251,191,36,0.18)",
                          border: "1px solid rgba(251,191,36,0.50)",
                          color: "#fbbf24",
                          boxShadow: "0 0 12px rgba(251,191,36,0.18)",
                        } : {
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.45)",
                        }}
                      >
                        {bidHasQuest
                          ? <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "#fbbf24" }} />
                          : <Sparkles className="h-3 w-3 shrink-0 opacity-50" />
                        }
                        Quest Bids Only
                      </button>
                    )}
                  </div>
                </div>

                {/* Active filter tags row */}
                {activeTags.length > 0 && (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 flex-wrap border-t"
                    style={{
                      borderColor: "rgba(168,85,247,0.15)",
                      background: "rgba(168,85,247,0.04)",
                    }}
                  >
                    <span className="text-[9px] font-extrabold uppercase tracking-widest shrink-0" style={{ color: "rgba(168,85,247,0.60)" }}>
                      Active:
                    </span>
                    {activeTags.map((tag, idx) => (
                      <button
                        key={tag.id}
                        onClick={tag.onRemove}
                        className="filter-tag-animate flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all duration-200 hover:brightness-125 active:scale-95 group"
                        style={{
                          background: `rgba(${tag.rgb},0.16)`,
                          border: `1px solid rgba(${tag.rgb},0.40)`,
                          color: `rgb(${tag.rgb})`,
                          animationDelay: `${idx * 35}ms`,
                          filter: "brightness(1.25)",
                        }}
                      >
                        {tag.label}
                        <X className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                    <span
                      key={filteredBids.length}
                      className="text-[10px] ml-auto tabular-nums"
                      style={{
                        color: filteredBids.length < bids.length ? "rgba(168,85,247,0.70)" : "rgba(255,255,255,0.28)",
                        fontWeight: filteredBids.length < bids.length ? 700 : 400,
                        animation: "count-up 0.18s ease-out both",
                      }}
                    >
                      {filteredBids.length === bids.length
                        ? `All ${bids.length} bids shown`
                        : `${filteredBids.length} of ${bids.length} match`}
                    </span>
                  </div>
                )}
              </div>
              </div>
            )}

            {!loadingBids && bids.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No bids yet. Be the first to offer!
              </div>
            )}

            {!loadingBids && bids.length > 0 && filteredBids.length === 0 && (
              <div
                className="text-center py-8 rounded-xl border"
                style={{ borderColor: "rgba(168,85,247,0.15)", background: "rgba(168,85,247,0.03)" }}
              >
                <SlidersHorizontal className="h-7 w-7 mx-auto mb-2" style={{ color: "rgba(168,85,247,0.40)" }} />
                <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>No bids match your filters</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Try adjusting or resetting the filters above</p>
              </div>
            )}

            <div key={filterKey} className="bid-list-animate space-y-3">
              {filteredBids.map((bid: Bid) => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  isHirer={isHirer}
                  requestStatus={request.status}
                  currentUserId={user?.id ?? -1}
                  requestId={requestId}
                  gameName={request.gameName}
                  isBulkMode={isBulkRequest}
                  currentGroupTotal={currentGroupTotal}
                  isSelected={selectedBidIds.has(bid.id)}
                  onToggleSelect={() => handleToggleSelect(bid.id)}
                  preferredCountry={request.preferredCountry}
                  preferredGender={request.preferredGender}
                />
              ))}
            </div>

            <BulkSelectionBar
              count={selectedBidIds.size}
              totalCost={selectedTotal}
              remainingSlots={remainingSlots}
              isPending={bulkAccepting}
              onAccept={handleBulkAcceptSelected}
              onClear={() => setSelectedBidIds(new Set())}
            />
          </div>
        );
      })()}
    </div>
  );
}
