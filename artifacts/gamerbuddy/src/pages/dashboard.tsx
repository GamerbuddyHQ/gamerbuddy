import React from "react";
import { Link, useLocation } from "wouter";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Plus, Swords, CheckCircle2, User } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: summary, isLoading, isError } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey()
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-[200px]" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (isError || !summary) {
    return <div className="text-center text-destructive">Failed to load dashboard.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">Welcome back, <span className="text-primary">{summary.user.name}</span></h1>
        <Button asChild className="bg-primary hover:bg-primary/90 text-white font-bold tracking-wider uppercase">
          <Link href="/post-request">
            <Plus className="mr-2 h-5 w-5" />
            Post Request
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/40 border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Hiring Wallet</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.wallets.hiringBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Available to spend</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/40 border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Earnings Wallet</CardTitle>
            <Wallet className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.wallets.earningsBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Available to withdraw</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Total Requests</CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalRequestsPosted}</div>
            <p className="text-xs text-muted-foreground mt-1">Posted historically</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Open Requests</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.openRequestsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-card/20">
          <CardHeader>
            <CardTitle className="uppercase tracking-wide">Recent Requests</CardTitle>
            <CardDescription>The latest requests you've posted.</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.recentRequests.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground border border-dashed border-border rounded-md">
                No recent requests.
              </div>
            ) : (
              <div className="space-y-4">
                {summary.recentRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card/40 hover:bg-card/80 transition-colors">
                    <div>
                      <div className="font-bold text-lg text-primary">{req.gameName}</div>
                      <div className="text-sm text-muted-foreground">{req.platform} • {req.skillLevel}</div>
                    </div>
                    <div className="text-right">
                      <div className="inline-block px-3 py-1 rounded-full text-xs font-medium uppercase border border-primary/30 text-primary bg-primary/10">
                        {req.status.replace("_", " ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="link" className="w-full mt-4 text-primary" onClick={() => setLocation("/my-requests")}>
              View All My Requests
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card/20">
          <CardHeader>
            <CardTitle className="uppercase tracking-wide">Account Status</CardTitle>
            <CardDescription>Your current standing on Gamerbuddy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${summary.user.idVerified ? 'bg-green-500/20 text-green-500' : 'bg-destructive/20 text-destructive'}`}>
                <User className="h-6 w-6" />
              </div>
              <div>
                <div className="font-semibold">{summary.user.idVerified ? 'ID Verified' : 'Unverified'}</div>
                <div className="text-sm text-muted-foreground">
                  {summary.user.idVerified ? 'You have full access to all features.' : 'Please verify your ID to accept requests.'}
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full justify-start border-border hover:border-primary">
                <Link href="/wallets">Manage Wallets</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start border-border hover:border-secondary">
                <Link href="/browse">Find Teammates to Hire</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}