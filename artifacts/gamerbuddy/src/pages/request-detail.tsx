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
  CheckCircle2, Send, Star, Trophy, AlertTriangle, User,
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
  const acceptBid = useAcceptBid();
  const { toast } = useToast();

  const isMe = bid.bidderId === currentUserId;
  const isAccepted = bid.status === "accepted";
  const isRejected = bid.status === "rejected";
  const canChat = (isHirer || isMe) && (isAccepted || isMe);

  const handleAccept = () => {
    acceptBid.mutate({ requestId, bidId: bid.id }, {
      onSuccess: () => toast({ title: "Bid Accepted!", description: "The session is now in progress." }),
      onError: (err: any) => toast({ title: "Error", description: err?.error || "Failed", variant: "destructive" }),
    });
  };

  return (
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
            onClick={handleAccept}
            disabled={acceptBid.isPending}
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
      </div>

      {chatOpen && canChat && <ChatPanel bidId={bid.id} currentUserId={currentUserId} />}
    </div>
  );
}

export default function RequestDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

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
  const canBid = user && !isHirer && !myBid && request?.status === "open";

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
      onSuccess: (data: any) => toast({ title: "Session Complete! 🏆", description: data?.message || "50 points awarded to both players!" }),
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
      {/* Back */}
      <button onClick={() => setLocation("/browse")} className="flex items-center gap-2 text-muted-foreground hover:text-white text-sm transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Browse
      </button>

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

          {/* Hirer actions */}
          {isHirer && request.status === "in_progress" && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                <Trophy className="h-4 w-4" />
                Session is in progress — ready to mark complete?
              </div>
              <p className="text-xs text-muted-foreground">Once you mark this complete, <strong className="text-white">50 points</strong> will be awarded to both you and the gamer.</p>
              <Button
                className="bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500 hover:text-white font-bold uppercase text-sm"
                onClick={handleComplete}
                disabled={completeRequest.isPending}
              >
                <Trophy className="h-4 w-4 mr-2" />
                {completeRequest.isPending ? "Completing…" : "Mark Session Complete · +50 Points"}
              </Button>
            </div>
          )}

          {request.status === "completed" && (
            <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 text-center">
              <Star className="h-8 w-8 mx-auto text-secondary mb-2" />
              <div className="font-bold text-white">Session Completed!</div>
              <div className="text-xs text-muted-foreground mt-1">50 points were awarded to both players.</div>
            </div>
          )}
        </CardContent>
      </Card>

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

      {isHirer && myBid === undefined && !canBid && request.status === "open" && (
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
            <Gavel className="h-4 w-4 text-primary" />
            {bids.length} {bids.length === 1 ? "Bid" : "Bids"}
          </h2>
          {acceptedBid && (
            <span className="text-xs text-green-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Bid accepted
            </span>
          )}
        </div>

        {loadingBids ? (
          <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : bids.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
            No bids yet — be the first!
          </div>
        ) : (
          bids.map((bid: Bid) => (
            <BidCard
              key={bid.id}
              bid={bid}
              isHirer={isHirer}
              requestStatus={request.status}
              currentUserId={user?.id ?? -1}
              requestId={requestId}
            />
          ))
        )}
      </div>
    </div>
  );
}
