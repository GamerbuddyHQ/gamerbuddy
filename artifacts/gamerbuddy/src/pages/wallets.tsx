import React, { useState } from "react";
import { Link } from "wouter";
import {
  useGetWallets,
  getGetWalletsQueryKey,
  useWithdrawEarningsWallet,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet,
  ArrowUpFromLine,
  Ban,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

const MIN_DEPOSIT = 10.75;
const WITHDRAWAL_THRESHOLD = 100;

export default function WalletsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");

  const { data: wallets, isLoading, isError } = useGetWallets({
    query: { queryKey: getGetWalletsQueryKey() },
  });

  const withdrawMutation = useWithdrawEarningsWallet();

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid withdrawal amount.", variant: "destructive" });
      return;
    }
    if (!wallets?.canWithdraw) {
      toast({ title: "Cannot Withdraw", description: `You need at least $${WITHDRAWAL_THRESHOLD} in earnings to withdraw.`, variant: "destructive" });
      return;
    }
    if (amount > (wallets?.earningsBalance ?? 0)) {
      toast({ title: "Insufficient Balance", description: "Amount exceeds your earnings balance.", variant: "destructive" });
      return;
    }

    withdrawMutation.mutate(
      { data: { amount } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetWalletsQueryKey(), updated);
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setWithdrawAmount("");
          toast({ title: "Withdrawal Initiated", description: `$${amount.toFixed(2)} will arrive in your account shortly.` });
        },
        onError: (err: any) => {
          toast({ title: "Withdrawal Failed", description: err?.error || "Unknown error", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-10 w-60" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (isError || !wallets) {
    return <div className="text-center text-destructive py-12">Failed to load wallets.</div>;
  }

  const earningsPct = Math.min((wallets.earningsBalance / WITHDRAWAL_THRESHOLD) * 100, 100);
  const remaining = Math.max(WITHDRAWAL_THRESHOLD - wallets.earningsBalance, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          My Wallets
        </h1>
        <p className="text-muted-foreground mt-1">Manage your hiring funds and track your earnings.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* ── HIRING WALLET ── */}
        <Card className="border-primary/30 bg-card/60 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="uppercase tracking-wider text-primary flex items-center gap-2 text-sm">
                <Wallet className="h-4 w-4" /> Hiring Wallet
              </CardTitle>
              <span className="text-xs uppercase tracking-widest text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">Deposit only</span>
            </div>
            <CardDescription>Funds used to post game requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-center py-5 rounded-lg bg-background/60 border border-border/40">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Current Balance</div>
              <div className="text-5xl font-black text-white tabular-nums">${wallets.hiringBalance.toFixed(2)}</div>
              {wallets.canPostRequest ? (
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-green-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ready to post requests
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">
                  Need ${MIN_DEPOSIT.toFixed(2)} min to post requests
                </div>
              )}
            </div>

            <Button asChild className="w-full bg-primary font-bold uppercase tracking-wider">
              <Link href="/add-funds">
                <Plus className="h-4 w-4 mr-2" />
                Add Funds
              </Link>
            </Button>

            {/* No-withdraw notice */}
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-xs text-amber-300/80">
              <Ban className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong className="text-amber-300">Withdrawals are not allowed</strong> from the Hiring Wallet.
                Funds here can only be spent on game requests.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── EARNINGS WALLET ── */}
        <Card className="border-secondary/30 bg-card/60 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-secondary/60 via-secondary to-secondary/60" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="uppercase tracking-wider text-secondary flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" /> Earnings Wallet
              </CardTitle>
              <span className="text-xs uppercase tracking-widest text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">Earn & Withdraw</span>
            </div>
            <CardDescription>Money earned by fulfilling requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-center py-5 rounded-lg bg-background/60 border border-border/40">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Current Balance</div>
              <div className="text-5xl font-black text-white tabular-nums">${wallets.earningsBalance.toFixed(2)}</div>
              {wallets.canWithdraw ? (
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-green-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Eligible to withdraw
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">
                  ${remaining.toFixed(2)} more needed to unlock withdrawals
                </div>
              )}
            </div>

            {/* Progress toward withdrawal threshold */}
            {!wallets.canWithdraw && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Withdrawal progress</span>
                  <span className="font-medium text-white">${wallets.earningsBalance.toFixed(2)} / ${WITHDRAWAL_THRESHOLD}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary transition-all duration-500"
                    style={{ width: `${earningsPct}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-amber-300/70">
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                  Minimum $100.00 balance required to withdraw
                </div>
              </div>
            )}

            {wallets.canWithdraw && (
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Withdraw Amount</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                    <Input
                      type="number"
                      min={1}
                      max={wallets.earningsBalance}
                      step={0.01}
                      placeholder="0.00"
                      className="pl-8 bg-background"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleWithdraw}
                    disabled={withdrawMutation.isPending || !withdrawAmount}
                    variant="outline"
                    className="border-secondary text-secondary hover:bg-secondary hover:text-black font-bold uppercase"
                  >
                    {withdrawMutation.isPending ? "Sending..." : "Withdraw"}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-white"
                  onClick={() => setWithdrawAmount(String(wallets.earningsBalance))}
                >
                  Withdraw all (${wallets.earningsBalance.toFixed(2)})
                </Button>
              </div>
            )}

            {!wallets.canWithdraw && (
              <div className="flex items-start gap-2.5 rounded-lg bg-secondary/5 border border-secondary/20 p-3 text-xs text-secondary/70">
                <ArrowUpFromLine className="h-4 w-4 shrink-0 mt-0.5 text-secondary/50" />
                <span>
                  Keep earning by fulfilling requests. Once you reach <strong className="text-secondary">$100.00</strong>, you can withdraw your earnings.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary row */}
      <Card className="border-border bg-card/30">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-3 divide-x divide-border text-center">
            <div className="px-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Funds</div>
              <div className="text-xl font-extrabold text-white">
                ${(wallets.hiringBalance + wallets.earningsBalance).toFixed(2)}
              </div>
            </div>
            <div className="px-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Can Post Requests</div>
              <div className={`text-xl font-extrabold ${wallets.canPostRequest ? "text-green-400" : "text-destructive"}`}>
                {wallets.canPostRequest ? "Yes" : "No"}
              </div>
            </div>
            <div className="px-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Can Withdraw</div>
              <div className={`text-xl font-extrabold ${wallets.canWithdraw ? "text-green-400" : "text-destructive"}`}>
                {wallets.canWithdraw ? "Yes" : "No"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
