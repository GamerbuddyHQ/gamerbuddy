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
  Users,
  ExternalLink,
  Send,
  XCircle,
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

interface WithdrawalRequest {
  id: number;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  country: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface AdminWithdrawalRequest {
  id: number;
  userId: number;
  userName: string | null;
  email: string | null;
  amount: number;
  status: string;
  country: string | null;
  payoutDetails: string | null;
  createdAt: string;
  paidAt: string | null;
  earningsBalance: number;
}

export default function WalletsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [payoutDetails, setPayoutDetails] = useState<string>("");
  const [txFilter, setTxFilter] = useState<"all" | "hiring" | "earnings">("all");
  const [showPayoutPanel, setShowPayoutPanel] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null);
  const [processingAll, setProcessingAll] = useState(false);

  const isAdmin = user?.id === 1;
  const isIndian = user?.country === "India";

  const { data: wallets, isLoading, isError } = useGetWallets({
    query: { queryKey: getGetWalletsQueryKey() },
  });
  const { data: transactions, isLoading: txLoading } = useTransactions();

  // User's current withdrawal request status
  const { data: withdrawalRequest, isLoading: wrLoading, refetch: refetchWR } = useQuery<WithdrawalRequest | null>({
    queryKey: ["withdrawal-request"],
    queryFn: () => apiFetch<WithdrawalRequest | null>("/api/wallets/withdrawal-request"),
    staleTime: 15_000,
    enabled: !!user,
  });

  // Admin: all withdrawal requests
  const { data: adminRequests, isLoading: adminLoading, refetch: refetchAdminRequests } = useQuery<{
    generatedAt: string;
    pendingCount: number;
    requests: AdminWithdrawalRequest[];
  }>({
    queryKey: ["admin-withdrawal-requests"],
    queryFn: () => apiFetch("/api/admin/withdrawal-requests"),
    enabled: isAdmin && showPayoutPanel,
    staleTime: 0,
  });

  // Request withdrawal mutation
  const requestWithdrawalMutation = useMutation({
    mutationFn: (body: { payoutDetails?: string }) =>
      apiFetch("/api/wallets/request-withdrawal", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-request"] });
      setPayoutDetails("");
      toast({
        title: "Withdrawal Request Submitted! 🎉",
        description: "Your withdrawal request has been submitted successfully. Payouts are processed manually every Monday. You will receive your money within 5–7 business days after processing.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Request Failed", description: err?.error || "Unknown error", variant: "destructive" });
    },
  });

  // Admin: mark a single request as paid
  const handleMarkPaid = async (requestId: number) => {
    setMarkingPaidId(requestId);
    try {
      await apiFetch(`/api/admin/withdrawal-requests/${requestId}/mark-paid`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-requests"] });
      queryClient.invalidateQueries({ queryKey: getGetWalletsQueryKey() });
      toast({ title: "Marked as Paid ✓", description: `Request #${requestId} has been processed and balance deducted.` });
    } catch (err: any) {
      toast({ title: "Failed", description: err?.error || "Unknown error", variant: "destructive" });
    } finally {
      setMarkingPaidId(null);
    }
  };

  // Admin: process all pending requests
  const handleProcessAll = async () => {
    setProcessingAll(true);
    try {
      const result = await apiFetch<{ processed: number; failed: number }>("/api/admin/withdrawal-requests/process-all", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-requests"] });
      queryClient.invalidateQueries({ queryKey: getGetWalletsQueryKey() });
      toast({
        title: `Processed ${result.processed} requests`,
        description: result.failed > 0 ? `${result.failed} failed (insufficient balance).` : "All pending requests have been paid and balances deducted.",
      });
    } catch (err: any) {
      toast({ title: "Process All Failed", description: err?.error || "Unknown error", variant: "destructive" });
    } finally {
      setProcessingAll(false);
    }
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

            {/* Funds custody disclaimer */}
            <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.03] px-4 py-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-cyan-300/80 uppercase tracking-wide text-[10px]">
                <Info className="h-3 w-3 shrink-0" /> Where Your Funds Are Held
              </div>
              <p className="text-muted-foreground/70 leading-relaxed">
                Funds in your Earnings Wallet are held by <strong className="text-foreground/80">Gamerbuddy</strong> and represent amounts owed to you. These funds remain in our account until you request a withdrawal and we manually process the payout.
              </p>
              <ul className="space-y-0.5 text-muted-foreground/60">
                <li>📅 <strong className="text-foreground/70">Payouts processed:</strong> Every Monday</li>
                <li>🇮🇳 <strong className="text-foreground/70">India (UPI / Bank Transfer):</strong> 1–2 business days</li>
                <li>🌍 <strong className="text-foreground/70">International (Bank Transfer):</strong> 5–7 business days</li>
              </ul>
              <p className="text-muted-foreground/45 leading-relaxed pt-0.5 border-t border-border/20">
                Gamerbuddy is not a bank and does not pay interest on held funds. See our <a href="/about" className="text-cyan-400/60 hover:text-cyan-400 underline underline-offset-2 transition-colors">Disclaimer (Section 5)</a> for the full funds holding and payout policy.
              </p>
            </div>

            {/* Progress bar — shown when below threshold */}
            {!wallets.canWithdraw && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payout progress</span>
                  <span className="font-medium text-foreground">${wallets.earningsBalance.toFixed(2)} / $100.00</span>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary transition-all duration-500"
                    style={{ width: `${earningsPct}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-amber-300/70">
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                  ${remaining.toFixed(2)} more needed to unlock withdrawals
                </div>
              </div>
            )}

            {/* ── Payout section — canWithdraw ── */}
            {wallets.canWithdraw && (
              <div className="space-y-3">
                {/* Pending request status */}
                {wrLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : withdrawalRequest?.status === "pending" ? (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="font-bold text-amber-300 text-sm uppercase tracking-wide">Withdrawal Requested</span>
                    </div>
                    <p className="text-xs text-amber-200/80 leading-relaxed">
                      Your withdrawal request for <strong className="text-amber-300">${withdrawalRequest.amount.toFixed(2)}</strong> has been submitted successfully. Payouts are processed manually every Monday. You will receive your money within <strong className="text-amber-300">5–7 business days</strong> after processing.
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
                      <CalendarDays className="h-3 w-3" />
                      Submitted {new Date(withdrawalRequest.createdAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      &nbsp;· Request #{withdrawalRequest.id}
                    </div>
                  </div>
                ) : withdrawalRequest?.status === "paid" ? (
                  <div className="rounded-xl border border-green-500/40 bg-green-500/[0.06] p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                      <span className="font-bold text-green-300 text-sm uppercase tracking-wide">Last Payout Completed</span>
                    </div>
                    <p className="text-xs text-green-200/80">
                      Your last withdrawal of <strong className="text-green-300">${withdrawalRequest.amount.toFixed(2)}</strong> was processed on {withdrawalRequest.paidAt ? new Date(withdrawalRequest.paidAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "—"}. If your balance has grown again, you can request another withdrawal.
                    </p>
                  </div>
                ) : null}

                {/* Request withdrawal button — only if no pending request */}
                {!wrLoading && withdrawalRequest?.status !== "pending" && (
                  <div className="space-y-3">
                    <div
                      className="rounded-xl border p-4 space-y-2"
                      style={{
                        background: "linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(34,211,238,0.07) 100%)",
                        borderColor: "rgba(34,197,94,0.30)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎉</span>
                        <span className="font-black text-sm text-green-300 uppercase tracking-wide">Payout Threshold Reached!</span>
                      </div>
                      <p className="text-xs text-green-200/75 leading-relaxed">
                        Your balance of <strong className="text-green-300">${wallets.earningsBalance.toFixed(2)}</strong> is ready for withdrawal. Click below to submit your request — the full balance will be paid out.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                        {isIndian ? "UPI ID (optional)" : "Bank Details (optional)"}
                      </Label>
                      <Input
                        placeholder={isIndian ? "yourname@paytm / yourname@upi" : "Account No · IFSC / SWIFT · Bank Name"}
                        className="bg-background"
                        value={payoutDetails}
                        onChange={(e) => setPayoutDetails(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground/40">
                        Optional — helps the admin process your payout faster. We will contact you via email if more details are needed.
                      </p>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3 text-xs text-cyan-200/70">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 mt-0.5 text-cyan-400" />
                      <span>
                        <strong className="text-cyan-300">Global payouts</strong> are handled manually every Monday for security and accuracy. Funds arrive within 5–7 business days after processing.
                      </span>
                    </div>

                    <Button
                      onClick={() => requestWithdrawalMutation.mutate({ payoutDetails: payoutDetails.trim() || undefined })}
                      disabled={requestWithdrawalMutation.isPending}
                      variant="outline"
                      className="w-full border-secondary text-secondary hover:bg-secondary hover:text-black font-bold uppercase tracking-wider"
                    >
                      {requestWithdrawalMutation.isPending ? (
                        <span className="flex items-center gap-2"><RefreshCcw className="h-4 w-4 animate-spin" /> Submitting…</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Request Withdrawal — ${wallets.earningsBalance.toFixed(2)}
                        </span>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!wallets.canWithdraw && (
              <div className="flex items-start gap-2.5 rounded-lg bg-secondary/5 border border-secondary/20 p-3 text-xs text-secondary/70">
                <ArrowUpFromLine className="h-4 w-4 shrink-0 mt-0.5 text-secondary/50" />
                <span>
                  Keep earning by fulfilling requests. Once you reach <strong className="text-secondary">$100.00</strong>, you can request a payout. Payouts are processed manually every Monday.
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

      {/* ── Admin: Withdrawal Requests Panel ── */}
      {isAdmin && (
        <Card className="border-red-500/25 bg-red-500/[0.03]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base uppercase tracking-wider flex items-center gap-2 text-red-400">
                <Users className="h-4 w-4" /> Admin: Withdrawal Requests
                {adminRequests && adminRequests.pendingCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs ml-1">{adminRequests.pendingCount} pending</Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {showPayoutPanel && adminRequests && adminRequests.pendingCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-green-500/40 text-green-400 hover:bg-green-500/10 h-7 px-3 font-bold"
                    onClick={handleProcessAll}
                    disabled={processingAll}
                  >
                    {processingAll ? <RefreshCcw className="h-3 w-3 animate-spin mr-1.5" /> : <CheckCircle2 className="h-3 w-3 mr-1.5" />}
                    Process All Pending
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 h-7 px-3"
                  onClick={() => {
                    setShowPayoutPanel(true);
                    refetchAdminRequests();
                  }}
                >
                  <RefreshCcw className="h-3 w-3 mr-1.5" />
                  Refresh
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs text-muted-foreground/60">
              Pending withdrawal requests from gamers. Process each payout manually via Razorpay, then click "Mark as Paid" — this deducts the balance and records the transaction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showPayoutPanel ? (
              <div className="text-center py-6">
                <Button
                  variant="outline"
                  className="border-red-500/40 text-red-400 hover:bg-red-500/10 font-bold uppercase tracking-wider"
                  onClick={() => setShowPayoutPanel(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Withdrawal Requests
                </Button>
              </div>
            ) : adminLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !adminRequests || adminRequests.requests.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No withdrawal requests yet.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground/50 mb-3">
                  {adminRequests.pendingCount} pending · {adminRequests.requests.length} total · refreshed {new Date(adminRequests.generatedAt).toLocaleString()}
                </p>
                {adminRequests.requests.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-start gap-3 p-3 rounded-lg bg-background/40 border transition-colors ${
                      r.status === "pending"
                        ? "border-red-500/25 hover:border-red-500/50"
                        : "border-green-500/15 opacity-60"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{r.userName ?? "Unknown"}</span>
                        <Badge variant="outline" className="text-xs py-0 border-muted text-muted-foreground">{r.country ?? "Unknown"}</Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs py-0 ${r.status === "pending" ? "border-amber-500/40 text-amber-400" : "border-green-500/40 text-green-400"}`}
                        >
                          {r.status === "pending" ? "Pending" : "Paid"}
                        </Badge>
                        {r.country === "India" ? (
                          <Badge variant="outline" className="text-xs py-0 border-orange-500/30 text-orange-400">UPI</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs py-0 border-blue-500/30 text-blue-400">Bank Transfer</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.email}</p>
                      {r.payoutDetails && (
                        <p className="text-xs text-cyan-300/70 mt-0.5 font-mono">{r.payoutDetails}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/40">
                        <span>Req #{r.id} · {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                        {r.status === "paid" && r.paidAt && (
                          <span className="text-green-400/60">Paid {new Date(r.paidAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1.5">
                      <div className="text-base font-bold tabular-nums text-red-400">${r.amount.toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground/40">Balance: ${r.earningsBalance.toFixed(2)}</div>
                      {r.status === "pending" && (
                        <div className="flex flex-col gap-1">
                          <a
                            href="https://dashboard.razorpay.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-cyan-400/60 hover:text-cyan-400 flex items-center gap-1 justify-end"
                          >
                            <ExternalLink className="h-2.5 w-2.5" /> Razorpay
                          </a>
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs bg-green-600 hover:bg-green-500 text-white font-bold"
                            onClick={() => handleMarkPaid(r.id)}
                            disabled={markingPaidId === r.id}
                          >
                            {markingPaidId === r.id ? (
                              <RefreshCcw className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            Mark Paid
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
