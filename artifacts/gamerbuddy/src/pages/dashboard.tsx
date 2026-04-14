import React from "react";
import { Link, useLocation } from "wouter";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  Plus,
  Swords,
  CheckCircle2,
  User,
  TrendingUp,
  Ban,
  AlertTriangle,
  ArrowRight,
  Zap,
  Clock,
  ShieldAlert,
} from "lucide-react";

const WITHDRAWAL_THRESHOLD = 100;

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: summary, isLoading, isError } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return <div className="text-center text-destructive py-12">Failed to load dashboard.</div>;
  }

  const { user, wallets, recentRequests, totalRequestsPosted, openRequestsCount } = summary;
  const earningsPct = Math.min((wallets.earningsBalance / WITHDRAWAL_THRESHOLD) * 100, 100);
  const remaining = Math.max(WITHDRAWAL_THRESHOLD - wallets.earningsBalance, 0);

  return (
    <div className="space-y-8">
      {/* Verification status banner — shown while pending */}
      {!user.idVerified && (
        <div
          className="flex items-start gap-3 rounded-2xl px-5 py-4"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(168,85,247,0.06))",
            border: "1px solid rgba(245,158,11,0.22)",
          }}
        >
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-extrabold text-white uppercase tracking-wide">Verification In Progress</span>
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                Expected: 7–15 days
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We're carefully reviewing your ID and phone number to keep the Gamerbuddy community safe. You can browse and bid on requests freely — posting your own requests and hiring gamers will unlock once your verification is complete.
            </p>
          </div>
          <ShieldAlert className="h-4 w-4 text-amber-400/60 shrink-0 mt-1 hidden sm:block" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight">
            Welcome back, <span className="text-primary">{user.name}</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
        </div>
        <Button
          asChild
          className="bg-primary hover:bg-primary/90 text-white font-bold tracking-wider uppercase self-start sm:self-auto"
          disabled={!wallets.canPostRequest}
        >
          <Link href="/post-request">
            <Plus className="mr-2 h-4 w-4" />
            Post Request
          </Link>
        </Button>
      </div>

      {/* Wallet Cards — prominent */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Hiring Wallet */}
        <Card className="border-primary/30 bg-card/60 overflow-hidden relative group">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary font-bold mb-2">
                  <Wallet className="h-3.5 w-3.5" />
                  Hiring Wallet
                </div>
                <div className="text-4xl font-black text-white tabular-nums">
                  ${wallets.hiringBalance.toFixed(2)}
                </div>
                {wallets.canPostRequest ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-400 mt-1.5 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Ready to post requests
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1.5">
                    Need $10.75 min to post
                  </div>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-amber-300/70 bg-amber-500/5 border border-amber-500/15 rounded px-2.5 py-1.5">
              <Ban className="h-3 w-3 shrink-0 text-amber-400" />
              <span>Withdrawals not allowed from this wallet</span>
            </div>

            <Button asChild size="sm" className="w-full bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/30 font-bold uppercase text-xs tracking-wider transition-colors">
              <Link href="/add-funds">
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Add Funds
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Earnings Wallet */}
        <Card className="border-secondary/30 bg-card/60 overflow-hidden relative group">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-secondary to-transparent" />
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-secondary font-bold mb-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Earnings Wallet
                </div>
                <div className="text-4xl font-black text-white tabular-nums">
                  ${wallets.earningsBalance.toFixed(2)}
                </div>
                {wallets.canWithdraw ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-400 mt-1.5 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Ready to withdraw
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1.5">
                    ${remaining.toFixed(2)} more to unlock withdrawals
                  </div>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>
            </div>

            {/* Progress bar */}
            {!wallets.canWithdraw && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-400" /> Withdrawal threshold</span>
                  <span className="text-white font-medium">${wallets.earningsBalance.toFixed(2)} / $100</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-secondary/60 to-secondary transition-all duration-500"
                    style={{ width: `${earningsPct}%` }}
                  />
                </div>
              </div>
            )}

            {wallets.canWithdraw && (
              <div className="flex items-center gap-1.5 text-xs text-green-400/80 bg-green-500/5 border border-green-500/15 rounded px-2.5 py-1.5">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-green-400" />
                <span>You can now withdraw your earnings</span>
              </div>
            )}

            <Button
              asChild
              size="sm"
              className="w-full bg-secondary/20 hover:bg-secondary text-secondary hover:text-black border border-secondary/30 font-bold uppercase text-xs tracking-wider transition-colors"
            >
              <Link href="/wallets">
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                {wallets.canWithdraw ? "Withdraw Earnings" : "Manage Wallets"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/30 border-border">
          <CardContent className="pt-5 pb-4 text-center">
            <div className="text-2xl font-extrabold text-white">{totalRequestsPosted}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">Total Posted</div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 border-border">
          <CardContent className="pt-5 pb-4 text-center">
            <div className="text-2xl font-extrabold text-white">{openRequestsCount}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">Open</div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 border-border">
          <CardContent className="pt-5 pb-4 text-center">
            <div className={`text-2xl font-extrabold ${wallets.canPostRequest ? "text-green-400" : "text-destructive"}`}>
              {wallets.canPostRequest ? "Yes" : "No"}
            </div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">Can Post</div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 border-border">
          <CardContent className="pt-5 pb-4 text-center">
            <div className={`text-2xl font-extrabold ${user.idVerified ? "text-green-400" : "text-amber-400"}`}>
              {user.idVerified ? "Verified" : "Pending"}
            </div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">ID Status</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity + quick actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-card/20">
          <CardHeader>
            <CardTitle className="uppercase tracking-wide text-sm">Recent Requests</CardTitle>
            <CardDescription>Your latest posted game requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground border border-dashed border-border rounded-lg">
                <Swords className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <div className="text-sm">No requests posted yet.</div>
                {wallets.canPostRequest ? (
                  <Button asChild size="sm" className="mt-3 bg-primary text-white font-bold uppercase text-xs">
                    <Link href="/post-request">Post Your First Request</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline" className="mt-3 border-primary text-primary text-xs">
                    <Link href="/add-funds">Add Funds First</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/40 hover:bg-card/80 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-white text-sm">{req.gameName}</div>
                      <div className="text-xs text-muted-foreground">
                        {req.platform} · {req.skillLevel}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full border ${
                      req.status === "open"
                        ? "border-green-500/40 text-green-400 bg-green-500/10"
                        : req.status === "in_progress"
                        ? "border-primary/40 text-primary bg-primary/10"
                        : "border-border text-muted-foreground"
                    }`}>
                      {req.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
                <Button
                  variant="link"
                  className="w-full text-primary text-xs mt-1"
                  onClick={() => setLocation("/my-requests")}
                >
                  View all requests
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/20">
          <CardHeader>
            <CardTitle className="uppercase tracking-wide text-sm">Quick Actions</CardTitle>
            <CardDescription>Jump to what you need.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 font-semibold transition-colors">
              <Link href="/add-funds">
                <Zap className="h-4 w-4 mr-3" />
                Add Funds to Hiring Wallet
              </Link>
            </Button>
            <Button
              asChild
              className="w-full justify-start bg-card/40 hover:bg-card text-white border border-border font-semibold transition-colors"
              disabled={!wallets.canPostRequest}
            >
              <Link href="/post-request">
                <Plus className="h-4 w-4 mr-3" />
                Post a Game Request
                {!wallets.canPostRequest && <span className="ml-auto text-xs text-muted-foreground">Needs $10.75</span>}
              </Link>
            </Button>
            <Button asChild className="w-full justify-start bg-card/40 hover:bg-card text-white border border-border font-semibold transition-colors">
              <Link href="/browse">
                <Swords className="h-4 w-4 mr-3" />
                Browse Open Requests
              </Link>
            </Button>
            <Button asChild className="w-full justify-start bg-card/40 hover:bg-card text-white border border-border font-semibold transition-colors">
              <Link href="/profile">
                <User className="h-4 w-4 mr-3" />
                View Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
