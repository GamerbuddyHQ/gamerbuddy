import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, BASE } from "@/lib/bids-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import {
  Shield, LogOut, DollarSign, CheckCircle2, Clock, User,
  Globe, RefreshCw, AlertTriangle, ChevronDown, ChevronUp,
  BadgeCheck, Eye, XCircle, Wallet, Users,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────── */

type WithdrawalRequest = {
  id:             number;
  userId:         number;
  userName:       string | null;
  email:          string | null;
  gamerbuddyId:   string | null;
  amount:         number;
  status:         "pending" | "paid" | "cancelled";
  country:        string | null;
  payoutDetails:  string | null;
  createdAt:      string;
  paidAt:         string | null;
  adminNote:      string | null;
  earningsBalance: number;
};

type PendingVerification = {
  id:             number;
  name:           string;
  email:          string;
  gamerbuddyId:   string | null;
  country:        string | null;
  idVerified:     boolean;
  officialIdPath: string | null;
  createdAt:      string;
};

/* ── Admin Auth Check ───────────────────────────────────────────────────── */

function useAdminAuth() {
  return useQuery<{ isAdmin: boolean }>({
    queryKey: ["admin-auth-me"],
    queryFn:  () => apiFetch(`${BASE}/admin/auth/me`),
    retry:    false,
    staleTime: 30_000,
  });
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function AdminDashboard() {
  const [, navigate]    = useLocation();
  const { toast }       = useToast();
  const qc              = useQueryClient();
  const [activeTab, setActiveTab] = useState<"withdrawals" | "verifications">("withdrawals");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  /* ── auth gate ── */
  const { data: authData, isLoading: authLoading } = useAdminAuth();
  useEffect(() => {
    if (!authLoading && !authData?.isAdmin) navigate("/admin/login");
  }, [authData, authLoading, navigate]);

  /* ── data ── */
  const { data: wData, isLoading: wLoading, refetch: refetchW } = useQuery<{ pendingCount: number; requests: WithdrawalRequest[] }>({
    queryKey: ["admin-withdrawals"],
    queryFn:  () => apiFetch(`${BASE}/admin/withdrawal-requests`),
    enabled:  !!authData?.isAdmin,
    staleTime: 60_000,
  });

  const { data: vData, isLoading: vLoading, refetch: refetchV } = useQuery<{ pendingCount: number; verifications: PendingVerification[] }>({
    queryKey: ["admin-verifications"],
    queryFn:  () => apiFetch(`${BASE}/admin/pending-verifications`),
    enabled:  !!authData?.isAdmin,
    staleTime: 60_000,
  });

  /* ── mutations ── */
  const markPaid = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/admin/withdrawal-requests/${id}/mark-paid`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast({ title: "Marked as Paid", description: "Withdrawal request processed." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const setVerified = useMutation({
    mutationFn: ({ userId, verified }: { userId: number; verified: boolean }) =>
      apiFetch(`${BASE}/admin/users/${userId}/set-verified`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified }),
      }),
    onSuccess: (_, { verified }) => {
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
      toast({ title: verified ? "Verified ✓" : "Verification Revoked", description: "User status updated." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const logout = useMutation({
    mutationFn: () => apiFetch(`${BASE}/admin/auth/logout`, { method: "POST" }),
    onSuccess: () => { qc.clear(); navigate("/admin/login"); },
  });

  /* ── loading ── */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-bold tracking-widest uppercase text-sm">Authenticating…</div>
      </div>
    );
  }
  if (!authData?.isAdmin) return null;

  const pending  = wData?.requests.filter(r => r.status === "pending") ?? [];
  const paid     = wData?.requests.filter(r => r.status === "paid").slice(0, 10) ?? [];
  const verifs   = vData?.verifications ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="px-4 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold tracking-tight text-foreground">Gamerbuddy Admin</span>
            <span className="hidden sm:inline text-xs text-muted-foreground/50 ml-2">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="gap-1.5 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>

        {/* ── Admin nav links ── */}
        <div className="px-4 md:px-8 py-2 border-t border-border/40 flex gap-1 overflow-x-auto">
          {[
            { href: "/admin/dashboard",         label: "Payouts & Verifications", icon: DollarSign },
            { href: "/admin/community",          label: "Community Moderation",    icon: Users      },
            { href: "/admin/platform-earnings",  label: "Platform Earnings",       icon: Wallet     },
            { href: "/admin/security",           label: "Security",                icon: Shield     },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 md:p-6 md:pb-0">
        {[
          { icon: <Clock className="w-4 h-4 text-amber-400" />,    label: "Pending Payouts",     value: wLoading ? "—" : String(pending.length),        bg: "bg-amber-500/10" },
          { icon: <DollarSign className="w-4 h-4 text-green-400" />, label: "Total Pending",     value: wLoading ? "—" : `$${pending.reduce((s, r) => s + r.amount, 0).toFixed(2)}`, bg: "bg-green-500/10" },
          { icon: <CheckCircle2 className="w-4 h-4 text-blue-400" />, label: "Paid (Recent)",   value: wLoading ? "—" : String(paid.length),             bg: "bg-blue-500/10" },
          { icon: <BadgeCheck className="w-4 h-4 text-purple-400" />, label: "Awaiting Verify", value: vLoading ? "—" : String(verifs.length),            bg: "bg-purple-500/10" },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>{c.icon}</div>
            <div>
              <p className="text-xs text-muted-foreground/70">{c.label}</p>
              <p className="text-lg font-bold leading-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="px-4 md:px-6 mt-5">
        <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit border border-border">
          {(["withdrawals", "verifications"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "withdrawals" ? "Withdrawals" : "Verifications"}
              {tab === "withdrawals" && pending.length > 0 && (
                <span className="ml-1.5 bg-amber-500/20 text-amber-400 text-xs px-1.5 py-0.5 rounded-full">{pending.length}</span>
              )}
              {tab === "verifications" && verifs.length > 0 && (
                <span className="ml-1.5 bg-purple-500/20 text-purple-400 text-xs px-1.5 py-0.5 rounded-full">{verifs.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-4 md:p-6 space-y-4">

        {/* ── Withdrawals Tab ── */}
        {activeTab === "withdrawals" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">
                Pending Withdrawal Requests
                {pending.length > 0 && <span className="ml-2 text-amber-400">({pending.length})</span>}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => refetchW()} className="gap-1 text-xs text-muted-foreground">
                <RefreshCw className="w-3 h-3" /> Refresh
              </Button>
            </div>

            {wLoading ? (
              <div className="space-y-2">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : pending.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground/60">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
                <p className="font-medium">No pending withdrawal requests</p>
                <p className="text-sm mt-1">All payout requests have been processed.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pending.map(r => (
                  <div key={r.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    {/* Row header */}
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{r.userName ?? "Unknown"}</span>
                          {r.gamerbuddyId && (
                            <span className="text-xs font-mono text-muted-foreground/60 bg-muted/60 px-1.5 py-0.5 rounded">
                              {r.gamerbuddyId}
                            </span>
                          )}
                          {r.country && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                              <Globe className="w-3 h-3" /> {r.country}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                          <span>{r.email}</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-xs">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold text-green-400">${r.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground/60">
                          Balance: ${r.earningsBalance.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <div className="border-t border-border/50">
                      <button
                        onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-3 h-3" />
                          {r.payoutDetails ? "View payout details" : "No payout details"}
                        </span>
                        {expandedRow === r.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {expandedRow === r.id && (
                        <div className="px-4 pb-3 text-sm space-y-1">
                          <p className="text-muted-foreground/60 text-xs uppercase tracking-widest font-medium mb-1">Payout Details</p>
                          <p className="text-foreground/80 bg-muted/40 rounded-lg p-2 font-mono text-xs break-all">
                            {r.payoutDetails ?? "No payout details provided by user."}
                          </p>
                          <p className="text-xs text-muted-foreground/50">
                            Request ID: #{r.id} · Requested {format(new Date(r.createdAt), "dd MMM yyyy, HH:mm")}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground/60">
                            <Wallet className="w-3 h-3" />
                            Payout method: {r.country === "India" ? "UPI (Razorpay)" : "Bank Transfer (Razorpay International)"}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="border-t border-border/50 px-4 py-3 bg-muted/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-amber-400/80">
                        <Clock className="w-3 h-3" />
                        <span>Pending · Process via Razorpay dashboard first</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => markPaid.mutate(r.id)}
                        disabled={markPaid.isPending}
                        className="bg-green-600 hover:bg-green-500 text-white font-semibold text-xs gap-1.5 flex-shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark as Paid
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent paid */}
            {paid.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Recently Paid (last 10)</h3>
                <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
                  {paid.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm truncate">{r.userName ?? "Unknown"}</span>
                        <span className="text-xs text-muted-foreground/60 ml-2">{r.country}</span>
                      </div>
                      <span className="text-sm font-semibold text-green-400">${r.amount.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground/50 hidden sm:block">
                        {r.paidAt ? format(new Date(r.paidAt), "dd MMM yyyy") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Verifications Tab ── */}
        {activeTab === "verifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">
                Pending Verifications
                {verifs.length > 0 && <span className="ml-2 text-purple-400">({verifs.length})</span>}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => refetchV()} className="gap-1 text-xs text-muted-foreground">
                <RefreshCw className="w-3 h-3" /> Refresh
              </Button>
            </div>

            {vLoading ? (
              <div className="space-y-2">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : verifs.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground/60">
                <BadgeCheck className="w-8 h-8 mx-auto mb-2 text-purple-500/50" />
                <p className="font-medium">No pending verifications</p>
                <p className="text-sm mt-1">All verification requests have been reviewed.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {verifs.map(v => (
                  <div key={v.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{v.name}</span>
                        {v.gamerbuddyId && (
                          <span className="text-xs font-mono text-muted-foreground/60 bg-muted/60 px-1.5 py-0.5 rounded">
                            {v.gamerbuddyId}
                          </span>
                        )}
                        {v.country && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                            <Globe className="w-3 h-3" /> {v.country}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{v.email}</p>
                      <p className="text-xs text-muted-foreground/50 mt-0.5">
                        Submitted {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })} ·
                        <span className="font-mono ml-1 text-muted-foreground/40">{v.officialIdPath}</span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => setVerified.mutate({ userId: v.id, verified: true })}
                        disabled={setVerified.isPending}
                        className="bg-green-600 hover:bg-green-500 text-white text-xs gap-1"
                      >
                        <BadgeCheck className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setVerified.mutate({ userId: v.id, verified: false })}
                        disabled={setVerified.isPending}
                        className="text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Info Box ── */}
        <div className="mt-6 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300/80">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">Payout Workflow Reminder</p>
              <ol className="list-decimal list-inside space-y-0.5 text-amber-300/70 text-xs">
                <li>User requests withdrawal on Wallets page (min $100 earnings balance)</li>
                <li>Send payment via <strong>Razorpay dashboard</strong> (UPI for India · Bank Transfer for international)</li>
                <li>Click <strong>Mark as Paid</strong> here — this deducts balance &amp; updates status</li>
                <li>User receives notification that payout is processed</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
