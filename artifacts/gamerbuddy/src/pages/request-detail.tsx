import React, { useState, useRef, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  useRequest,
  useRequestBids,
  usePlaceBid,
  useAcceptBid,
  useCompleteRequest,
  useBidMessages,
  useSendMessage,
  useRequestReviews,
  useSubmitReview,
  useSendGift,
  useReportUser,
  type Bid,
  type ChatMessage,
} from "@/lib/bids-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  ArrowLeft, Swords, Monitor, Layers, Gavel, MessageSquare,
  CheckCircle2, Send, Star, Trophy, AlertTriangle, User, Gift,
  Flag, X, MessageCircle,
} from "lucide-react";
import { SafetyBanner } from "@/components/safety-banner";

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

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-colors"
        >
          <Star className={`h-6 w-6 ${n <= (hover || value) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

function ChatPanel({ bidId, currentUserId }: { bidId: number; currentUserId: number }) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: messages = [], isLoading } = useBidMessages(bidId);
  const send = useSendMessage();
  const { toast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    send.mutate({ bidId, content }, {
      onError: (err: any) => toast({ title: "Failed to send", description: err?.error || "Error", variant: "destructive" }),
    });
  };

  return (
    <div className="flex flex-col h-72 border border-border rounded-xl overflow-hidden bg-background/50">
      <div className="px-4 py-2.5 border-b border-border bg-card/60 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-bold">
        <MessageSquare className="h-3.5 w-3.5 text-secondary" /> Private Chat
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="text-center text-xs text-muted-foreground py-4">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">No messages yet. Say hi!</div>
        ) : (
          messages.map((msg: ChatMessage) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                  isMe
                    ? "bg-primary text-white rounded-br-none"
                    : "bg-card border border-border text-foreground rounded-bl-none"
                }`}>
                  {!isMe && <div className="text-xs font-bold text-secondary mb-0.5">{msg.senderName}</div>}
                  <p>{msg.content}</p>
                  <div className="text-[10px] opacity-60 mt-1 text-right">{format(new Date(msg.createdAt), "h:mm a")}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border p-2 flex gap-2 bg-card/40">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="bg-background text-sm h-9"
          maxLength={1000}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button size="sm" className="h-9 px-3 bg-primary" onClick={handleSend} disabled={!draft.trim() || send.isPending}>
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
  onClose,
}: {
  bid: Bid;
  requestId: number;
  onClose: () => void;
}) {
  const [discord, setDiscord] = useState("");
  const acceptBid = useAcceptBid();
  const { toast } = useToast();

  const handleAccept = () => {
    acceptBid.mutate({ requestId, bidId: bid.id, discordUsername: discord.trim() || undefined }, {
      onSuccess: () => {
        toast({ title: "Bid Accepted!", description: "Funds moved to escrow. Session is now in progress." });
        onClose();
      },
      onError: (err: any) => toast({ title: "Error", description: err?.error || "Failed", variant: "destructive" }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-400 font-bold">
            <CheckCircle2 className="h-5 w-5" />
            Accept Bid from {bid.bidderName}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-widest">Bid amount</div>
          <div className="text-2xl font-black text-white">${bid.price.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">This amount will be held in escrow and released to the gamer (90%) on session completion.</div>
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
          className="w-full bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500 hover:text-white font-bold uppercase py-5"
          onClick={handleAccept}
          disabled={acceptBid.isPending}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {acceptBid.isPending ? "Accepting…" : "Confirm & Lock Escrow"}
        </Button>
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
}: {
  bid: Bid;
  isHirer: boolean;
  requestStatus: string;
  currentUserId: number;
  requestId: number;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const { toast } = useToast();

  const isMe = bid.bidderId === currentUserId;
  const isAccepted = bid.status === "accepted";
  const isRejected = bid.status === "rejected";
  const canChat = (isHirer || isMe) && (isAccepted || isMe);

  return (
    <>
      {showAcceptModal && (
        <AcceptModal bid={bid} requestId={requestId} onClose={() => setShowAcceptModal(false)} />
      )}
      {showReport && (
        <ReportModal reportedUserId={bid.bidderId} reportedName={bid.bidderName} onClose={() => setShowReport(false)} />
      )}

      <div className={`rounded-xl border p-4 space-y-3 transition-all ${
        isAccepted ? "border-green-500/40 bg-green-500/5" :
        isRejected ? "border-border/30 bg-card/20 opacity-50" :
        isMe ? "border-secondary/40 bg-secondary/5" :
        "border-border bg-card/40"
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                {bid.bidderName}
                {isMe && <span className="text-xs text-secondary font-normal">(You)</span>}
                {isAccepted && bid.discordUsername && (
                  <span className="text-xs text-indigo-400 font-normal flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />{bid.discordUsername}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{format(new Date(bid.createdAt), "MMM d, h:mm a")}</div>
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

        {chatOpen && canChat && <ChatPanel bidId={bid.id} currentUserId={currentUserId} />}
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

function ReviewPanel({ requestId, currentUserId }: { requestId: number; currentUserId: number }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const { data: reviews = [] } = useRequestReviews(requestId);
  const submit = useSubmitReview();
  const { toast } = useToast();

  const myReview = reviews.find((r) => r.reviewerId === currentUserId);

  if (myReview) {
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
          <Star className="h-4 w-4 fill-yellow-400" />
          You left a review
        </div>
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map((n) => (
            <Star key={n} className={`h-5 w-5 ${n <= myReview.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
          ))}
        </div>
        {myReview.comment && <p className="text-sm text-foreground/80">{myReview.comment}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
        <Star className="h-4 w-4" />
        Rate this session
      </div>
      <p className="text-xs text-muted-foreground">Your review builds trust on the platform and earns you points.</p>
      <StarRating value={rating} onChange={setRating} />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience (optional)…"
        className="resize-none h-20 bg-background text-sm"
        maxLength={300}
      />
      <Button
        className="bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500 hover:text-black font-bold uppercase"
        onClick={() => {
          if (!rating) { toast({ title: "Pick a rating", variant: "destructive" }); return; }
          submit.mutate({ requestId, rating, comment: comment.trim() || undefined }, {
            onSuccess: () => toast({ title: "Review submitted!", description: "Thank you for your feedback." }),
            onError: (err: any) => toast({ title: "Error", description: err?.error || "Failed", variant: "destructive" }),
          });
        }}
        disabled={!rating || submit.isPending}
      >
        <Star className="h-4 w-4 mr-1.5" />
        {submit.isPending ? "Submitting…" : "Submit Review"}
      </Button>
    </div>
  );
}

export default function RequestDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReportHirer, setShowReportHirer] = useState(false);

  const requestId = parseInt(params.id ?? "0");
  const { data: request, isLoading: loadingReq } = useRequest(requestId);
  const { data: bids = [], isLoading: loadingBids } = useRequestBids(requestId);

  const [bidPrice, setBidPrice] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const placeBid = usePlaceBid();
  const completeRequest = useCompleteRequest();

  const isHirer = user?.id === request?.userId;
  const myBid = bids.find((b: Bid) => b.bidderId === user?.id);
  const acceptedBid = bids.find((b: Bid) => b.status === "accepted");
  const isGamer = myBid?.status === "accepted";
  const canBid = user && !isHirer && !myBid && request?.status === "open";
  const canReview = user && request?.status === "completed" && (isHirer || isGamer);

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

  const handleComplete = () => {
    completeRequest.mutate(requestId, {
      onSuccess: (data: any) => toast({
        title: "Session Approved!",
        description: `${data?.gamerPayout ? `$${data.gamerPayout.toFixed(2)} released to gamer (10% platform fee kept). ` : ""}+50 points to both players!`,
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
    completed: "border-secondary/40 text-secondary bg-secondary/10",
    cancelled: "border-border text-muted-foreground",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {showReportHirer && (
        <ReportModal reportedUserId={request.userId} reportedName={request.userName} onClose={() => setShowReportHirer(false)} />
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
              <div className="text-xs text-muted-foreground mb-1">
                Posted by <span className="text-primary font-semibold">{request.userName}</span> · {format(new Date(request.createdAt), "MMM d, yyyy")}
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

          {/* Accepted bid discord info (shown to hirer) */}
          {isHirer && request.status === "in_progress" && acceptedBid?.discordUsername && (
            <div className="flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-4 py-3 text-sm">
              <MessageCircle className="h-4 w-4 text-indigo-400 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Gamer's Discord</div>
                <div className="font-bold text-indigo-300">{acceptedBid.discordUsername}</div>
              </div>
            </div>
          )}

          {/* Hirer: complete session */}
          {isHirer && request.status === "in_progress" && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                <Trophy className="h-4 w-4" />
                Session in progress — approve when done
              </div>
              <p className="text-xs text-muted-foreground">
                Approving releases <strong className="text-white">90%</strong> of the escrowed amount to the gamer (10% platform fee) and awards <strong className="text-white">50 points</strong> to both players.
              </p>
              <Button
                className="bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500 hover:text-white font-bold uppercase text-sm"
                onClick={handleComplete}
                disabled={completeRequest.isPending}
              >
                <Trophy className="h-4 w-4 mr-2" />
                {completeRequest.isPending ? "Completing…" : "Approve & Release Payment"}
              </Button>
            </div>
          )}

          {/* Completed banner */}
          {request.status === "completed" && (
            <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 text-center">
              <Star className="h-8 w-8 mx-auto text-secondary mb-2 fill-secondary" />
              <div className="font-bold text-white">Session Completed!</div>
              <div className="text-xs text-muted-foreground mt-1">90% was released to the gamer · 50 points awarded to both players.</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gift panel — hirer after completion */}
      {isHirer && request.status === "completed" && <GiftPanel requestId={requestId} />}

      {/* Review panel — both sides after completion */}
      {canReview && <ReviewPanel requestId={requestId} currentUserId={user!.id} />}

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

      {/* Bids list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Gavel className="h-4 w-4 text-secondary" />
            {loadingBids ? "Loading bids…" : `${bids.length} Bid${bids.length !== 1 ? "s" : ""}`}
          </h2>
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
          />
        ))}
      </div>
    </div>
  );
}
