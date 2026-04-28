import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMyRequests, getGetMyRequestsQueryKey, getGetWalletsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useRequestBids, useCompleteRequest, useCancelRequest, useAcceptBid, type Bid } from "@/lib/bids-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Plus, Swords, CheckCircle2, Trophy, Gavel,
  MessageSquare, Clock, Ban, ChevronDown, ChevronUp, ArrowRight,
} from "lucide-react";
import { SafetyBanner } from "@/components/safety-banner";
import { TrustCardBadge } from "@/components/reputation-badges";

const STATUS_STYLE: Record<string, string> = {
  open: "border-green-500/40 text-green-400 bg-green-500/10",
  in_progress: "border-primary/40 text-primary bg-primary/10",
  completed: "border-secondary/40 text-secondary bg-secondary/10",
  cancelled: "border-border text-muted-foreground",
  expired: "border-orange-500/40 text-orange-400 bg-orange-500/10",
};

const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;

function RequestBidsPanel({ requestId, requestStatus }: { requestId: number; requestStatus: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: bids = [], isLoading } = useRequestBids(requestId);
  const accept = useAcceptBid();
  const complete = useCompleteRequest();
  const cancel = useCancelRequest();

  const handleAccept = (bidId: number) => {
    accept.mutate({ requestId, bidId }, {
      onSuccess: () => {
        toast({ title: "Bid Accepted!", description: "Quest is now in progress." });
        qc.invalidateQueries({ queryKey: getGetMyRequestsQueryKey() });
      },
      onError: (err: any) => toast({ title: "Error", description: err?.error, variant: "destructive" }),
    });
  };

  const handleComplete = () => {
    complete.mutate(requestId, {
      onSuccess: (data: any) => {
        toast({ title: "Quest Complete! 🏆", description: data?.message || "50 points awarded!" });
        qc.invalidateQueries({ queryKey: getGetMyRequestsQueryKey() });
      },
      onError: (err: any) => toast({ title: "Error", description: err?.error, variant: "destructive" }),
    });
  };

  const handleCancel = () => {
    cancel.mutate(requestId, {
      onSuccess: (data: any) => {
        const refund = data?.refundAmount;
        toast({
          title: "Request Cancelled",
          description: refund && refund > 0 ? `$${Number(refund).toFixed(2)} escrow refunded to your Hiring Wallet.` : undefined,
        });
        qc.invalidateQueries({ queryKey: getGetMyRequestsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetWalletsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
      },
      onError: (err: any) => toast({ title: "Error", description: err?.error, variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="py-3 text-center text-xs text-muted-foreground">Loading bids…</div>;

  const pendingBids = bids.filter((b: Bid) => b.status === "pending");
  const acceptedBid = bids.find((b: Bid) => b.status === "accepted");

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      {/* Actions row */}
      <div className="flex flex-wrap gap-2">
        {(requestStatus === "open" || requestStatus === "in_progress") && (
          <Button
            size="sm"
            variant="destructive"
            className="text-xs font-bold uppercase border-destructive/40 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white"
            onClick={handleCancel}
            disabled={cancel.isPending}
            title={requestStatus === "in_progress" ? "Escrow will be refunded to your Hiring Wallet" : undefined}
          >
            <Ban className="h-3.5 w-3.5 mr-1.5" />
            {requestStatus === "in_progress" ? "Cancel & Refund Escrow" : "Cancel Request"}
          </Button>
        )}
        {requestStatus === "in_progress" && (
          <Button
            size="sm"
            className="bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500 hover:text-white text-xs font-bold uppercase"
            onClick={handleComplete}
            disabled={complete.isPending}
          >
            <Trophy className="h-3.5 w-3.5 mr-1.5" />
            {complete.isPending ? "Completing…" : "Mark Complete · +50 Points"}
          </Button>
        )}
      </div>

      {/* Accepted bid status */}
      {acceptedBid && (
        <div className="flex items-center gap-2.5 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-green-400 font-bold">{acceptedBid.bidderName}</span>
            <TrustCardBadge trustFactor={acceptedBid.bidderTrustFactor ?? 50} compact />
            <span className="text-muted-foreground"> accepted · ${acceptedBid.price.toFixed(2)}</span>
          </div>
          <Link href={`/requests/${requestId}`} className="ml-auto text-xs text-secondary underline underline-offset-2 hover:text-secondary/80 flex items-center gap-1">
            Chat <MessageSquare className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Bids list */}
      {bids.length === 0 ? (
        <div className="text-center py-4 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
          No bids yet — gamers can bid from the Browse page.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
            <Gavel className="h-3.5 w-3.5 text-primary" />
            {bids.length} {bids.length === 1 ? "Bid" : "Bids"} received
            {pendingBids.length > 0 && <span className="text-amber-400 font-bold">· {pendingBids.length} pending</span>}
          </div>
          {bids.map((bid: Bid) => (
            <div key={bid.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
              bid.status === "accepted" ? "border-green-500/30 bg-green-500/5" :
              bid.status === "rejected" ? "border-border/30 bg-card/20 opacity-50" :
              "border-border bg-card/40"
            }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm">{bid.bidderName}</span>
                  <TrustCardBadge trustFactor={bid.bidderTrustFactor ?? 50} compact />
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-semibold ${
                    bid.status === "accepted" ? "border-green-500/40 text-green-400" :
                    bid.status === "rejected" ? "border-border text-muted-foreground" :
                    "border-amber-500/40 text-amber-400"
                  }`}>{bid.status}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{bid.message}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black text-white">${bid.price.toFixed(2)}</div>
                {requestStatus === "open" && bid.status === "pending" && (
                  <Button
                    size="sm"
                    className="h-6 text-xs bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500 hover:text-white mt-1 font-bold px-2"
                    onClick={() => handleAccept(bid.id)}
                    disabled={accept.isPending}
                  >
                    Accept
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href={`/requests/${requestId}`} className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors">
        <ArrowRight className="h-3.5 w-3.5" /> Full request view & chat
      </Link>
    </div>
  );
}

export default function MyRequests() {
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: requests, isLoading, isError } = useGetMyRequests({
    query: { queryKey: getGetMyRequestsQueryKey() },
  });

  const toggle = (id: number) => setExpanded((v) => (v === id ? null : id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white flex items-center gap-3">
            <Swords className="h-7 w-7 text-primary" /> My Requests
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your posted missions and incoming bids.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider">
          <Link href="/post-request">
            <Plus className="h-4 w-4 mr-2" /> New Request
          </Link>
        </Button>
      </div>

      <SafetyBanner showSelfHire={false} storageKey="gb_safety_my" />

      {/* 24h open with no activity nudge */}
      {requests && requests.filter(r =>
        r.status === "open" &&
        (Date.now() - new Date(r.createdAt).getTime()) > TWENTY_FOUR_H
      ).length > 0 && (
        <div
          className="flex items-start gap-3 rounded-xl border px-5 py-4 text-sm"
          style={{
            background: "rgba(251,191,36,0.07)",
            borderColor: "rgba(251,191,36,0.25)",
            color: "rgba(251,191,36,0.85)",
          }}
        >
          <Clock className="h-4 w-4 mt-0.5 shrink-0 opacity-80" />
          <div>
            <span className="font-bold">Heads up!</span> You have{" "}
            {requests.filter(r => r.status === "open" && (Date.now() - new Date(r.createdAt).getTime()) > TWENTY_FOUR_H).length}{" "}
            request{requests.filter(r => r.status === "open" && (Date.now() - new Date(r.createdAt).getTime()) > TWENTY_FOUR_H).length > 1 ? "s" : ""} open
            for over 24 hours. Try refining the objectives or sharing on the{" "}
            <a href="/community" className="underline font-semibold">Community tab</a> to attract more bids! 🎮
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : isError ? (
        <div className="text-center p-8 text-destructive">Failed to load your requests.</div>
      ) : !requests || requests.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-xl bg-card/10">
          <Swords className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <h3 className="text-lg font-bold uppercase text-muted-foreground">No Requests Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Post your first mission to start hiring.</p>
          <Button asChild className="mt-4 bg-primary font-bold uppercase">
            <Link href="/post-request">Post a Request</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="border-border/60 bg-card/40 overflow-hidden">
              {/* Top accent */}
              <div className={`h-0.5 ${
                req.status === "open" ? "bg-green-500" :
                req.status === "in_progress" ? "bg-primary" :
                req.status === "completed" ? "bg-secondary" : "bg-border"
              }`} />
              <CardContent className="p-5 space-y-3">
                {/* Header row */}
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-extrabold text-white uppercase tracking-wide">{req.gameName}</h3>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className="text-xs border border-border rounded px-2 py-0.5 text-muted-foreground">{req.platform}</span>
                      <span className="text-xs border border-border rounded px-2 py-0.5 text-muted-foreground">{req.skillLevel}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{format(new Date(req.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${STATUS_STYLE[req.status] ?? "border-border text-muted-foreground"}`}>
                      {req.status.replace("_", " ")}
                    </span>
                    {req.status === "completed" && (
                      <Trophy className="h-5 w-5 text-secondary" />
                    )}
                  </div>
                </div>

                {/* Objectives */}
                <p className="text-sm text-foreground/70 border-l-2 border-primary/30 pl-3 line-clamp-2 leading-relaxed">
                  {req.objectives}
                </p>

                {/* Expand bids toggle */}
                {req.status !== "cancelled" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-white -ml-1 px-2"
                    onClick={() => toggle(req.id)}
                  >
                    <Gavel className="h-3.5 w-3.5 mr-1.5" />
                    {expanded === req.id ? "Hide" : "Manage"} Bids & Actions
                    {expanded === req.id ? <ChevronUp className="ml-1.5 h-3.5 w-3.5" /> : <ChevronDown className="ml-1.5 h-3.5 w-3.5" />}
                  </Button>
                )}

                {expanded === req.id && (
                  <RequestBidsPanel requestId={req.id} requestStatus={req.status} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
