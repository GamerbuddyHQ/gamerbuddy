import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
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
  STREAMING_PLATFORM_META,
  type Bid,
  type ChatMessage,
} from "@/lib/bids-api";
import { getSocket } from "@/lib/socket";
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
  Phone, PhoneOff, Wifi, WifiOff, Volume2, ShieldCheck, Users, Lock,
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
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: fetched = [], isLoading } = useBidMessages(bidId);
  const send = useSendMessage();
  const { toast } = useToast();

  const jitsiUrl = `https://meet.jit.si/gamerbuddy-bid-${bidId}`;

  useEffect(() => {
    const seenIds = new Set(fetched.map((m) => m.id));
    setLiveMessages((prev) => {
      const deduped = prev.filter((m) => !seenIds.has(m.id));
      return deduped;
    });
  }, [fetched]);

  const allMessages = [...fetched, ...liveMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onNewMessage = (msg: ChatMessage) => {
      if (msg.senderId !== currentUserId) setOtherTyping(false);
      setLiveMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };
    const onTyping = ({ userId }: { userId: number }) => {
      if (userId !== currentUserId) {
        setOtherTyping(true);
        setTimeout(() => setOtherTyping(false), 3000);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new_message", onNewMessage);
    socket.on("typing", onTyping);

    if (socket.connected) setConnected(true);
    socket.emit("join_bid", bidId);

    return () => {
      socket.emit("leave_bid", bidId);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new_message", onNewMessage);
      socket.off("typing", onTyping);
    };
  }, [bidId, currentUserId]);

  const handleTyping = () => {
    const socket = getSocket();
    if (!typing) {
      setTyping(true);
      socket.emit("typing", { bidId, userId: currentUserId });
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(false), 2000);
  };

  const handleSend = () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    setTyping(false);
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
          <div className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
            connected
              ? "border-green-500/30 text-green-400 bg-green-500/10"
              : "border-border/40 text-muted-foreground/50 bg-background/30"
          }`}>
            {connected ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
            {connected ? "Live" : "Reconnecting…"}
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
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/15" />
            <div className="text-xs text-muted-foreground/40">No messages yet. Say hi!</div>
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
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-card border border-border/50 rounded-2xl rounded-bl-none px-4 py-2.5 flex gap-1 items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/60 p-2 flex gap-2 bg-card/50">
        <Input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); handleTyping(); }}
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

        <div className={`rounded-xl border p-4 space-y-3 ${isBulkMode ? "border-purple-500/30 bg-purple-500/5" : "border-green-500/30 bg-green-500/5"}`}>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck className={`h-3.5 w-3.5 ${isBulkMode ? "text-purple-400" : "text-green-400"}`} />
            {isBulkMode ? "This Gamer's Bid" : "Payment Breakdown"}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{isBulkMode ? "Bid Rate" : "Session Amount"}</span>
              <span className="font-bold text-white">${bid.price.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <span className="text-amber-400 font-bold text-xs">10%</span> Platform Fee
              </span>
              <span className="font-bold text-amber-400">−${(bid.price * 0.1).toFixed(2)}</span>
            </div>
            <div className={`h-px ${isBulkMode ? "bg-purple-500/20" : "bg-green-500/20"}`} />
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-white">Gamer Receives</span>
              <span className={`text-xl font-black ${isBulkMode ? "text-purple-400" : "text-green-400"}`}>${(bid.price * 0.9).toFixed(2)}</span>
            </div>
          </div>

          {isBulkMode ? (
            <div className="mt-3 pt-3 border-t border-purple-500/20 space-y-1.5">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Running Group Total</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">New group total</span>
                <span className="font-bold text-white">${newGroupTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gamers receive (90%)</span>
                <span className="font-bold text-purple-300">${(newGroupTotal * 0.9).toFixed(2)}</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-purple-500/8 border border-purple-500/20 px-2.5 py-2 text-[11px] text-purple-300/80 mt-2">
                <AlertTriangle className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                No charge now — the full group total is collected from your wallet when you lock the roster.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/8 border border-amber-500/20 px-2.5 py-2 text-[11px] text-amber-300/80">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              10% platform fee is deducted from every completed Quest/Job. Funds are held in escrow until the session is approved.
            </div>
          )}
        </div>

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
          <p className="text-xs text-muted-foreground">Share your Discord to coordinate your session outside the platform. Never share account passwords.</p>
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
  const groupTotal = Math.round(acceptedBids.reduce((s, b) => s + b.price, 0) * 100) / 100;
  const platformFee = Math.round(groupTotal * 10) / 100;
  const gamersReceive = Math.round(groupTotal * 90) / 100;
  const avgPendingBid = pendingBids.length > 0
    ? pendingBids.reduce((s, b) => s + b.price, 0) / pendingBids.length
    : 0;
  const estimatedRemaining = remaining > 0 && avgPendingBid > 0 ? Math.round(remaining * avgPendingBid * 100) / 100 : 0;

  return (
    <div
      className="rounded-2xl border border-purple-500/30 p-5 space-y-4"
      style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.12) 0%, rgba(10,0,20,0.5) 100%)" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-widest">
          <Users className="h-4 w-4" />
          Roster Progress
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-purple-400 tabular-nums">{acceptedBidsCount}</span>
          <span className="text-xl font-black text-white/30">/</span>
          <span className="text-3xl font-black text-white tabular-nums">{bulkSlotsNeeded}</span>
          <span className="text-xs text-muted-foreground ml-1.5">slots filled</span>
        </div>
      </div>

      {/* Glow progress bar */}
      <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #7c3aed 0%, #a855f7 60%, #c084fc 100%)",
            boxShadow: pct > 0 ? "0 0 16px rgba(168,85,247,0.6), 0 0 40px rgba(168,85,247,0.2)" : "none",
          }}
        />
        {pct > 5 && pct < 96 && (
          <div
            className="absolute top-0 bottom-0 flex items-center text-[10px] font-black text-white/80 pr-1 tabular-nums pointer-events-none"
            style={{ left: `${pct}%`, transform: "translateX(-100%)" }}
          >
            {Math.round(pct)}%
          </div>
        )}
      </div>

      {/* Stats chips */}
      <div className="flex flex-wrap gap-2 text-xs">
        {groupTotal > 0 ? (
          <>
            <div className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/8 px-3 py-1.5">
              <span className="text-muted-foreground">Group total at lock</span>
              <span className="font-black text-purple-300">${groupTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/6 px-3 py-1.5">
              <span className="text-muted-foreground">Gamers receive (90%)</span>
              <span className="font-black text-green-400">${gamersReceive.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/6 px-3 py-1.5">
              <span className="text-muted-foreground">Platform fee (10%)</span>
              <span className="font-black text-amber-300">${platformFee.toFixed(2)}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5">
            <span className="text-muted-foreground">No slots reserved yet</span>
            <span className="font-black text-white/50">—</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/8 px-3 py-1.5">
          <span className="text-muted-foreground">Remaining</span>
          <span className="font-black text-purple-300">{remaining} slot{remaining !== 1 ? "s" : ""}</span>
        </div>
        {estimatedRemaining > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/6 px-3 py-1.5">
            <span className="text-muted-foreground">Est. additional cost</span>
            <span className="font-black text-amber-300">~${estimatedRemaining.toFixed(2)}</span>
          </div>
        )}
        {acceptedBidsCount >= bulkSlotsNeeded && (
          <div className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/8 px-3 py-1.5">
            <CheckCircle2 className="h-3 w-3 text-green-400" />
            <span className="font-black text-green-400">Roster Full!</span>
          </div>
        )}
      </div>

      {groupTotal > 0 && remaining > 0 && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/6 px-3 py-2 text-[11px] text-purple-300/70 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-purple-400 shrink-0" />
          Slots are reserved at no charge. Your wallet is only debited when you lock the roster.
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
        <div className="flex items-center gap-2 text-sm">
          <div className="h-7 w-7 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <span className="font-black text-white">{count}</span>
          <span className="text-purple-300/80">gamer{count !== 1 ? "s" : ""} selected</span>
          <span className="text-purple-600 mx-0.5">·</span>
          <span className="font-black text-white">${totalCost.toFixed(2)}</span>
          <span className="text-purple-300/60 text-xs">from wallet</span>
          {wouldExceed && (
            <span className="ml-1 text-amber-400 text-xs font-bold flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> exceeds slots
            </span>
          )}
        </div>
        <div className="flex gap-2">
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
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Accepting…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Accept {count} Gamer{count !== 1 ? "s" : ""}
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
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const { toast } = useToast();

  const isMe = bid.bidderId === currentUserId;
  const isAccepted = bid.status === "accepted";
  const isRejected = bid.status === "rejected";
  const canChat = (isHirer || isMe) && (isAccepted || isMe);
  const showCheckbox = isBulkMode && isHirer && bid.status === "pending" && !!onToggleSelect;

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
        className={`rounded-xl border p-4 space-y-3 transition-all duration-200 ${
          isAccepted ? "border-green-500/40 bg-green-500/5" :
          isRejected ? "border-border/30 bg-card/20 opacity-50" :
          isSelected ? "border-purple-500/60 bg-purple-500/8 shadow-[0_0_20px_rgba(168,85,247,0.12)]" :
          isMe ? "border-secondary/40 bg-secondary/5" :
          "border-border bg-card/40"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {showCheckbox && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleSelect!(); }}
                className={`h-5 w-5 rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center transition-all mt-2 ${
                  isSelected
                    ? "bg-purple-500 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                    : "bg-transparent border-white/20 hover:border-purple-400/60"
                }`}
              >
                {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
              </button>
            )}
            <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                <Link href={`/users/${bid.bidderId}`}>
                  <a className="hover:text-primary transition-colors">{bid.bidderName}</a>
                </Link>
                <VerifiedBadge idVerified={bid.bidderIdVerified ?? false} variant="compact" />
                <TrustChip value={bid.bidderTrustFactor ?? 50} />
                {isMe && <span className="text-xs text-secondary font-normal">(You)</span>}
                {isAccepted && bid.discordUsername && (
                  <span className="text-xs text-indigo-400 font-normal flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />{bid.discordUsername}
                  </span>
                )}
                <BidderStreamingBadges bidderId={bid.bidderId} compact />
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">{format(new Date(bid.createdAt), "MMM d, h:mm a")}</span>
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
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-black text-white">${bid.price.toFixed(2)}</div>
            <div className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full border mt-1 inline-block ${
              isAccepted ? "border-green-500/40 text-green-400 bg-green-500/10" :
              isRejected ? "border-border text-muted-foreground" :
              "border-amber-500/40 text-amber-400 bg-amber-500/10"
            }`}>
              {bid.status}
            </div>
          </div>
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed border-l-2 border-primary/30 pl-3">
          {bid.message}
        </p>

        {/* Streaming platform links */}
        <BidderStreamingBadges bidderId={bid.bidderId} />

        {!isMe && <BidderQuestSummary bidderId={bid.bidderId} gameName={gameName} />}

        <div className="flex gap-2 flex-wrap">
          {isHirer && bid.status === "pending" && requestStatus === "open" && (
            <Button
              size="sm"
              className="bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500 hover:text-white text-xs font-bold uppercase"
              onClick={() => setShowAcceptModal(true)}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Accept Bid
            </Button>
          )}
          {canChat && (
            <Button
              size="sm"
              variant="outline"
              className={`text-xs font-bold uppercase border-secondary/40 text-secondary hover:bg-secondary hover:text-black ${chatOpen ? "bg-secondary/10" : ""}`}
              onClick={() => setChatOpen((v) => !v)}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              {chatOpen ? "Close Chat" : "Open Chat"}
            </Button>
          )}
          {!isMe && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-bold uppercase border-destructive/30 text-destructive/60 hover:border-destructive/60 hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowReport(true)}
            >
              <Flag className="h-3.5 w-3.5 mr-1.5" />
              Report
            </Button>
          )}
        </div>

        {chatOpen && canChat && (
          <ChatPanel bidId={bid.id} currentUserId={currentUserId} discordUsername={bid.discordUsername} />
        )}
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

function ReviewPanel({ requestId, currentUserId, awaitingReviews }: { requestId: number; currentUserId: number; awaitingReviews?: boolean }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const { data: reviews = [], refetch } = useRequestReviews(requestId);
  const submit = useSubmitReview();
  const { toast } = useToast();

  const myReview = reviews.find((r) => r.reviewerId === currentUserId);

  if (myReview) {
    const color = SCORE_COLOR[myReview.rating] ?? "bg-green-500";
    const label = SCORE_LABELS[myReview.rating] ?? "";
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
            <Star className="h-4 w-4 fill-yellow-400" />
            Your Review — Submitted
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-black px-2.5 py-1 rounded ${color} text-black`}>
              {myReview.rating}/10
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        </div>
        {myReview.comment && <p className="text-sm text-foreground/80 leading-relaxed border-l-2 border-yellow-500/30 pl-3">{myReview.comment}</p>}
        <div className="flex items-center gap-1.5 text-xs pt-1">
          {awaitingReviews ? (
            <><div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /><span className="text-amber-400">Waiting for the other player to submit their review…</span></>
          ) : (
            <><Trophy className="h-3.5 w-3.5 text-yellow-400" /><span className="text-yellow-400">+50 points awarded — session fully complete!</span></>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
          <Star className="h-4 w-4" />
          Rate this Session
        </div>
        <div className="flex items-center gap-1 text-xs text-yellow-400/60">
          <Trophy className="h-3.5 w-3.5" />
          +50 pts when both review
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">Rate on a scale of 1–10. Your review affects the other player's Trust Factor.</p>
      <ScoreRating value={rating} onChange={setRating} />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience (at least 10 characters)…"
        className="resize-none h-20 bg-background text-sm"
        maxLength={300}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className={comment.length < 10 && comment.length > 0 ? "text-destructive" : ""}>{comment.length}/300 {comment.length < 10 ? `(${10 - comment.length} more to go)` : ""}</span>
      </div>
      <Button
        className="w-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500 hover:text-black font-bold uppercase tracking-wider"
        onClick={() => {
          if (!rating) { toast({ title: "Pick a score first", variant: "destructive" }); return; }
          if (comment.trim().length < 10) { toast({ title: "Comment too short", description: "Write at least 10 characters.", variant: "destructive" }); return; }
          submit.mutate({ requestId, rating, comment: comment.trim() }, {
            onSuccess: (data: any) => {
              if (data?.bothReviewed) {
                toast({ title: "+50 Points Earned!", description: "Both reviews are in — session is officially complete!", duration: 7000 });
              } else {
                toast({ title: "Review Submitted!", description: "Waiting for the other player to review…", duration: 7000 });
              }
              refetch();
            },
            onError: (err: any) => toast({ title: "Error", description: err?.error || "Failed", variant: "destructive" }),
          });
        }}
        disabled={!rating || comment.trim().length < 10 || submit.isPending}
      >
        <Star className="h-4 w-4 mr-1.5" />
        {submit.isPending ? "Submitting…" : `Submit Review · ${rating > 0 ? `${rating}/10` : "choose score"}`}
      </Button>
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
  const [submitted, setSubmitted] = useState(false);
  const [bothDone, setBothDone] = useState(false);
  const { data: reviews = [], refetch } = useRequestReviews(requestId);
  const submit = useSubmitReview();
  const { toast } = useToast();

  const myReview = reviews.find((r) => r.reviewerId === currentUserId);

  const handleSubmit = () => {
    if (!rating) { toast({ title: "Pick a score first", description: "Tap a number to rate the session.", variant: "destructive" }); return; }
    if (comment.trim().length < 10) { toast({ title: "Review too short", description: "Write at least 10 characters.", variant: "destructive" }); return; }
    submit.mutate({ requestId, rating, comment: comment.trim() }, {
      onSuccess: (data: any) => {
        const both = !!(data as any)?.bothReviewed;
        setSubmitted(true);
        setBothDone(both);
        refetch();
        if (both) onDone();
      },
      onError: (err: any) => toast({ title: "Submission failed", description: err?.error || "Please try again.", variant: "destructive" }),
    });
  };

  // If already reviewed before modal opened
  const alreadyReviewed = !!myReview;

  const scoreLabel = rating > 0 ? SCORE_LABELS[rating] ?? "" : "";
  const scoreColor = rating > 0 ? (SCORE_COLOR[rating] ?? "bg-green-500") : "bg-muted";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl border border-yellow-500/40 bg-card overflow-hidden shadow-2xl"
        style={{ boxShadow: "0 0 60px rgba(234,179,8,0.12), 0 25px 60px rgba(0,0,0,0.8)" }}>

        {/* Header stripe */}
        <div className="h-1 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500" />

        <div className="p-6 space-y-5">
          {/* Icon + title */}
          <div className="text-center space-y-2">
            <div className="inline-flex h-14 w-14 rounded-full items-center justify-center border-2 border-yellow-500/40 bg-yellow-500/10 mx-auto">
              <Star className="h-7 w-7 text-yellow-400" />
            </div>
            <h2 className="text-xl font-extrabold uppercase tracking-tight text-white">
              {alreadyReviewed || submitted ? "Review Submitted" : "Rate the Session"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {alreadyReviewed || submitted
                ? submitted && bothDone
                  ? "Both reviews are in — session is fully complete and 50 points have been awarded!"
                  : "Waiting for the other player to leave their review…"
                : <>
                    Payment has been released for <strong className="text-white">{gameName}</strong>.
                    Both {isHirer ? "you and the gamer" : "you and the hirer"} must leave a review before the session is fully complete.
                  </>
              }
            </p>
          </div>

          {/* Prize callout */}
          {!alreadyReviewed && !submitted && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
              <Trophy className="h-4 w-4 text-yellow-400 shrink-0" />
              <span className="text-sm font-bold text-yellow-300">
                Both players earn <span className="text-white">+50 points</span> when both reviews are submitted
              </span>
            </div>
          )}

          {/* Waiting state */}
          {(alreadyReviewed || submitted) && !bothDone && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center space-y-2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse mx-auto" />
              <div className="text-sm font-bold text-amber-400">Waiting on {otherPersonName}</div>
              <p className="text-xs text-muted-foreground">
                {isHirer ? "The gamer" : "The hirer"} still needs to submit their review.
                You'll both receive 50 points once they do.
              </p>
              <Button
                onClick={onDone}
                className="mt-2 bg-background border border-border text-muted-foreground hover:border-amber-500/40 hover:text-amber-400 text-xs font-bold uppercase"
                size="sm"
              >
                Close — I'll come back later
              </Button>
            </div>
          )}

          {/* Both done state */}
          {(submitted && bothDone) && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto" />
              <div className="text-base font-bold text-green-400">Session Complete!</div>
              <div className="text-xs text-muted-foreground">Both reviews submitted · <span className="text-yellow-400 font-bold">+50 points</span> awarded to each player</div>
              <Button onClick={onDone} className="bg-green-500 text-black font-bold uppercase w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Done
              </Button>
            </div>
          )}

          {/* Review form */}
          {!alreadyReviewed && !submitted && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Rate {otherPersonName} (1–10) *
                </div>
                <ScoreRating value={rating} onChange={setRating} />
                {rating > 0 && (
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-black px-2.5 py-1 rounded ${scoreColor} text-black`}>{rating}/10</span>
                    <span className="text-sm text-muted-foreground">{scoreLabel}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Your Review * <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">(minimum 10 characters)</span>
                </div>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`Describe your experience playing with ${otherPersonName}…`}
                  className="resize-none h-24 bg-background text-sm"
                  maxLength={300}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className={comment.length > 0 && comment.trim().length < 10 ? "text-destructive" : "text-muted-foreground"}>
                    {comment.trim().length}/300 {comment.trim().length < 10 && comment.trim().length > 0 ? `— ${10 - comment.trim().length} more chars needed` : ""}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  onClick={handleSubmit}
                  disabled={!rating || comment.trim().length < 10 || submit.isPending}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-wider text-sm py-5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submit.isPending ? (
                    <span className="flex items-center gap-2"><div className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />Submitting…</span>
                  ) : (
                    <><Star className="h-4 w-4 mr-2" />Submit Review {rating > 0 ? `· ${rating}/10` : ""}</>
                  )}
                </Button>
                <p className="text-center text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                  A review is required to finalise the session
                </p>
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
    <div className="max-w-2xl mx-auto space-y-4">
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
    <div className="max-w-2xl mx-auto space-y-6">
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

          {/* Accepted bid discord info (shown to hirer) */}
          {isHirer && !isBulkRequest && request.status === "in_progress" && acceptedBid?.discordUsername && (
            <div className="flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-4 py-3 text-sm">
              <MessageCircle className="h-4 w-4 text-indigo-400 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Gamer's Discord</div>
                <div className="font-bold text-indigo-300">{acceptedBid.discordUsername}</div>
              </div>
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
              {/* Payment preview */}
              {lockGroupTotal > 0 && (
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/8 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Group total ({acceptedBidsCount} gamers)</span>
                    <span className="font-black text-white">${lockGroupTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <span className="text-amber-400 font-bold">10%</span> Platform fee
                    </span>
                    <span className="font-bold text-amber-400">−${lockPlatformFee.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-purple-500/20" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Gamers receive (90%)</span>
                    <span className="font-black text-purple-300">${lockGamersTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 text-purple-300/60">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>${lockGroupTotal.toFixed(2)} will be deducted from your Hiring Wallet at lock.</span>
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

      {canBid && (
        <Card className="border-secondary/30 bg-card/50 overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-transparent via-secondary to-transparent" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
              <Gavel className="h-4 w-4 text-secondary" /> Place Your Bid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Gavel className="h-4 w-4 text-secondary" />
                {loadingBids ? "Loading bids…" : `${bids.length} Bid${bids.length !== 1 ? "s" : ""}`}
              </h2>
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

            {!loadingBids && bids.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No bids yet. Be the first to offer!
              </div>
            )}

            {bids.map((bid: Bid) => (
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
              />
            ))}

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
