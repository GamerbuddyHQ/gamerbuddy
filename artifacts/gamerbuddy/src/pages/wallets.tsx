import React, { useState } from "react";
import { Link } from "wouter";
import {
  useGetWallets,
  getGetWalletsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/bids-api";
import { useAuth } from "@/lib/auth";
import {
  Wallet,
  ArrowUpFromLine,
  Ban,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  RefreshCcw,
  Gift,
  Gamepad2,
  Receipt,
  Lock,
  Smartphone,
  Building2,
  Globe,
  Info,
  Clock,
  CalendarDays,
} from "lucide-react";

const MIN_DEPOSIT = 10.75;
const WITHDRAWAL_THRESHOLD = 100;

interface WalletTx {
  id: number;
  wallet: "hiring" | "earnings";
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

const TX_META: Record<string, { label: string; icon: React.ReactNode; color: string; sign: "+" | "-" }> = {
  deposit:        { label: "Deposit",         icon: <ArrowDownLeft className="h-3.5 w-3.5" />, color: "text-green-400",   sign: "+" },
  withdrawal:     { label: "Withdrawal",      icon: <ArrowUpRight className="h-3.5 w-3.5" />,  color: "text-amber-400",   sign: "-" },
  request_fee:    { label: "Request Fee",     icon: <Gamepad2 className="h-3.5 w-3.5" />,       color: "text-red-400",     sign: "-" },
  escrow_held:    { label: "Escrow Held",     icon: <ShieldCheck className="h-3.5 w-3.5" />,    color: "text-blue-400",    sign: "-" },
  escrow_refund:  { label: "Escrow Refund",   icon: <RefreshCcw className="h-3.5 w-3.5" />,     color: "text-green-400",   sign: "+" },
  session_payout: { label: "Session Payout (90%)", icon: <TrendingUp className="h-3.5 w-3.5" />,  color: "text-green-400",   sign: "+" },
  platform_fee:   { label: "Platform Fee (10%)", icon: <Receipt className="h-3.5 w-3.5" />,       color: "text-amber-400",   sign: "-" },
  gift_sent:      { label: "Tip Sent",        icon: <Gift className="h-3.5 w-3.5" />,            color: "text-red-400",     sign: "-" },
  gift_received:  { label: "Tip Received",    icon: <Gift className="h-3.5 w-3.5" />,            color: "text-green-400",   sign: "+" },
};

function txMeta(type: string) {
  return TX_META[type] ?? { label: type, icon: <Receipt className="h-3.5 w-3.5" />, color: "text-muted-foreground", sign: "+" as const };
}

function useTransactions() {
  return useQuery<WalletTx[]>({
    queryKey: ["wallet-transactions"],
    queryFn: () => apiFetch<WalletTx[]>("/api/wallets/transactions"),
    staleTime: 10_000,
  });
}

export default function WalletsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawDetails, setWithdrawDetails] = useState<string>("");
  const [txFilter, setTxFilter] = useState<"all" | "hiring" | "earnings">("all");

  const isIndian = user?.country === "India";
  const withdrawalMethod = "bank_transfer";

  const { data: wallets, isLoading, isError } = useGetWallets({
    query: { queryKey: getGetWalletsQueryKey() },
  });
  const { data: transactions, isLoading: txLoading } = useTransactions();

  const withdrawMutation = useMutation({
    mutationFn: (body: { amount: number; withdrawalMethod: string; details: string }) =>
      apiFetch("/api/wallets/withdraw", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (updated: any) => {
      queryClient.setQueryData(getGetWalletsQueryKey(), updated);
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      setWithdrawAmount("");
      setWithdrawDetails("");
      toast({
        title: "Withdrawal Requested 🎉",
        description: `Your request has been queued for the next weekly payout batch (every Monday). Funds typically arrive within 5–7 business days after processing.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Withdrawal Failed", description: err?.error || "Unknown error", variant: "destructive" });
    },
  });

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
    if (!withdrawDetails.trim()) {
      const hint = withdrawalMethod === "upi"
        ? "Please enter your UPI ID (e.g. name@upi)"
        : "Please enter your bank account details";
      toast({ title: "Details Required", description: hint, variant: "destructive" });
      return;
    }
    withdrawMutation.mutate({ amount, withdrawalMethod, details: withdrawDetails });
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
  const escrowBalance: number = (wallets as any).escrowBalance ?? 0;

  const filteredTxns = (transactions ?? []).filter(
    (t) => txFilter === "all" || t.wallet === txFilter
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-foreground flex items-center gap-3">
          <Wallet className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          My Wallets
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your hiring funds and track your earnings.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">

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
            <div className="text-center py-4 rounded-lg bg-background/60 border border-border/40">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Current Balance</div>
              <div className="text-4xl md:text-5xl font-black text-foreground tabular-nums">${wallets.hiringBalance.toFixed(2)}</div>
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

            {!isIndian && (
              <div className="flex items-start gap-2 rounded-lg border p-3 text-xs" style={{ borderColor: "rgba(34,211,238,0.20)", background: "rgba(34,211,238,0.04)" }}>
                <Globe className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "rgb(103,232,249)" }} />
                <span style={{ color: "rgb(148,163,184)" }}>
                  International users: we currently support Razorpay. Stripe + more options coming in the next 6 months. 🙏
                </span>
              </div>
            )}

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
            <CardDescription>Money earned by fulfilling requests. You keep 90% of every job — 10% platform fee is deducted automatically on completion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-center py-4 rounded-lg bg-background/60 border border-border/40">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Current Balance</div>
              <div className="text-4xl md:text-5xl font-black text-foreground tabular-nums">${wallets.earningsBalance.toFixed(2)}</div>
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

            {/* ── Congratulations / threshold banner — all users who hit $100 ── */}
            {wallets.canWithdraw && (
              <div
                className="rounded-xl border p-4 space-y-2"
                style={{
                  background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,211,238,0.08) 100%)",
                  borderColor: "rgba(34,197,94,0.35)",
                  boxShadow: "0 0 20px rgba(34,197,94,0.10)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎉</span>
                  <span className="font-black text-sm text-green-300 uppercase tracking-wide">Payout Threshold Reached!</span>
                </div>
                <p className="text-xs text-green-200/80 leading-relaxed">
                  Congratulations! Your earnings have reached the <strong className="text-green-300">$100 threshold</strong>. Your payout is scheduled for the next Monday's weekly batch and should arrive in your account within <strong className="text-green-300">5–7 business days</strong>.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-300/70 font-medium pt-0.5">
                  <CalendarDays className="h-3 w-3 text-cyan-400 shrink-0" />
                  Fill in your bank details below and submit your withdrawal request to join the next Monday batch.
                </div>
              </div>
            )}

            {/* Progress bar — shown when below threshold */}
            {!wallets.canWithdraw && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Withdrawal progress</span>
                  <span className="font-medium text-foreground">${wallets.earningsBalance.toFixed(2)} / ${WITHDRAWAL_THRESHOLD}</span>
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

            {/* Payout Policy — always visible, global unified policy */}
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.03] p-4 text-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-[11px] uppercase tracking-widest text-cyan-300">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                How Payouts Work
              </div>
              <div className="space-y-2 text-cyan-200/70 leading-relaxed">
                <p>
                  💚 Earnings are added <strong className="text-cyan-300">instantly</strong> after session completion and both the Hirer and Gamer submit their reviews.
                </p>
                <p>
                  📅 Global payouts are processed <strong className="text-cyan-300">every Monday</strong> via Razorpay International Bank Transfer.
                </p>
                <p>
                  💰 When your balance reaches <strong className="text-cyan-300">$100 USD</strong>, your money will be sent via international bank transfer and should arrive within <strong className="text-cyan-300">5–7 business days</strong> after the Monday processing.
                </p>
              </div>
              <div className="pt-0.5 border-t border-cyan-500/10 flex items-center gap-2 text-[10px] text-cyan-400/50 font-medium">
                <Info className="h-3 w-3 shrink-0" />
                Minimum withdrawal threshold: $100 USD · Payout method: International Bank Transfer
              </div>
            </div>

            {/* Withdrawal form */}
            {wallets.canWithdraw && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Withdraw Amount</Label>
                  <div className="relative group">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-cyan-400 transition-colors"
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Payout info</span>
                    </button>
                    <div className="absolute right-0 bottom-6 z-20 hidden group-hover:block w-64 rounded-lg border border-border/60 bg-card p-3 text-xs text-muted-foreground shadow-xl leading-relaxed">
                      <p className="font-semibold text-foreground mb-1.5">📅 Payout Schedule</p>
                      <p>Payouts are processed in a <strong className="text-cyan-400">weekly batch every Monday</strong> via Bank Transfer. Funds arrive in your account within <strong className="text-cyan-400">5–7 business days</strong> after the Monday processing.</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
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
                  <button
                    className="text-xs text-secondary hover:text-secondary/70 transition-colors whitespace-nowrap"
                    onClick={() => setWithdrawAmount(String(wallets.earningsBalance))}
                  >
                    Max (${wallets.earningsBalance.toFixed(2)})
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Bank Account Details</Label>
                  <Input
                    placeholder="Account No · IFSC / SWIFT · Bank Name"
                    className="bg-background"
                    value={withdrawDetails}
                    onChange={(e) => setWithdrawDetails(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground/50">
                    Enter your bank account number, IFSC / SWIFT code, and bank name. Double-check before submitting.
                  </p>
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-200/75">
                  <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong className="text-amber-300">Payout notice:</strong> Payouts are processed every <strong className="text-amber-300">Monday</strong> and typically arrive within <strong className="text-amber-300">5–7 business days</strong> after the weekly batch runs.
                  </span>
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={withdrawMutation.isPending || !withdrawAmount || !withdrawDetails}
                  variant="outline"
                  className="w-full border-secondary text-secondary hover:bg-secondary hover:text-black font-bold uppercase tracking-wider"
                >
                  {withdrawMutation.isPending ? (
                    <span className="flex items-center gap-2">Processing…</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Request Bank Transfer
                    </span>
                  )}
                </Button>
              </div>
            )}

            {!wallets.canWithdraw && (
              <div className="flex items-start gap-2.5 rounded-lg bg-secondary/5 border border-secondary/20 p-3 text-xs text-secondary/70">
                <ArrowUpFromLine className="h-4 w-4 shrink-0 mt-0.5 text-secondary/50" />
                <span>
                  Keep earning by fulfilling requests. Once you reach <strong className="text-secondary">$100.00</strong>, you can request a weekly payout via Bank Transfer.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Escrow card — only shown if funds are locked in sessions */}
      {escrowBalance > 0 && (
        <Card
          className="overflow-hidden"
          style={{ borderColor: "rgba(251,146,60,0.30)", background: "rgba(251,146,60,0.04)" }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500/50 via-orange-400 to-orange-500/50" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle
                className="uppercase tracking-wider flex items-center gap-2 text-sm"
                style={{ color: "#fb923c" }}
              >
                <Lock className="h-4 w-4" /> In Escrow
              </CardTitle>
              <span className="text-xs uppercase tracking-widest text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                Locked in session
              </span>
            </div>
            <CardDescription>
              These funds are held safely while your session is in progress. On completion, 90% goes to your gamer
              and 10% is the platform fee.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 rounded-lg border" style={{ background: "rgba(0,0,0,0.15)", borderColor: "rgba(251,146,60,0.20)" }}>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Currently Locked</div>
              <div className="text-4xl md:text-5xl font-black tabular-nums" style={{ color: "#fb923c" }}>
                ${escrowBalance.toFixed(2)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground/60">
                Released automatically when the session completes ✓
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary row */}
      <Card className="border-border bg-card/30">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="px-2 py-2 rounded-lg bg-background/40 border border-border/40">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total</div>
              <div className="text-lg font-extrabold text-foreground tabular-nums">
                ${(wallets.hiringBalance + wallets.earningsBalance + escrowBalance).toFixed(2)}
              </div>
            </div>
            <div className="px-2 py-2 rounded-lg bg-background/40 border border-border/40">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Can Post</div>
              <div className={`text-lg font-extrabold ${wallets.canPostRequest ? "text-green-400" : "text-destructive"}`}>
                {wallets.canPostRequest ? "Yes" : "No"}
              </div>
            </div>
            <div className="px-2 py-2 rounded-lg bg-background/40 border border-border/40">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Withdraw</div>
              <div className={`text-lg font-extrabold ${wallets.canWithdraw ? "text-green-400" : "text-destructive"}`}>
                {wallets.canWithdraw ? "Yes" : "No"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="border-border bg-card/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base uppercase tracking-wider flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> Transaction History
            </CardTitle>
            <div className="flex gap-1.5">
              {(["all", "hiring", "earnings"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={txFilter === f ? "default" : "outline"}
                  className={`text-xs uppercase tracking-wide h-7 px-3 ${txFilter === f ? "bg-primary" : ""}`}
                  onClick={() => setTxFilter(f)}
                >
                  {f === "all" ? "All" : f === "hiring" ? "Hiring" : "Earnings"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filteredTxns.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No transactions yet. Deposit funds or complete a session to see history here.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTxns.map((tx) => {
                const meta = txMeta(tx.type);
                const isCredit = meta.sign === "+";
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/40 border border-border/40 hover:border-border/80 transition-colors"
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isCredit ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{meta.label}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs py-0 ${tx.wallet === "hiring" ? "border-primary/40 text-primary/70" : "border-secondary/40 text-secondary/70"}`}
                        >
                          {tx.wallet === "hiring" ? "Hiring" : "Earnings"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{tx.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-base font-bold tabular-nums ${isCredit ? "text-green-400" : "text-red-400"}`}>
                        {meta.sign}${tx.amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
