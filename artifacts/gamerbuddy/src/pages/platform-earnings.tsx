import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, BASE } from "@/lib/bids-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import {
  Shield, LogOut, DollarSign, TrendingUp, Gift, ShieldCheck,
  Layers, Clock, BadgeCheck, Receipt, Globe, MapPin, CalendarDays,
  CalendarRange, Wallet, Users, Info, Zap, X, CheckCircle2,
  ExternalLink, Gamepad2, CreditCard, ArrowRight, AlertTriangle,
  RefreshCw, User, Download, UserCheck,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────── */
type FeeEntry = {
  id:                      number;
  requestId:               number | null;
  amount:                  number;
  grossAmount:             number;
  netToGamer:              number;
  type:                    string;
  description:             string;
  createdAt:               string;
  hirerRegion:             string;
  gameName:                string | null;
  platform:                string | null;
  hirerId:                 number | null;
  hirerName:               string | null;
  hirerGbId:               string | null;
  gamerId:                 number | null;
  gamerName:               string | null;
  gamerGbId:               string | null;
  pendingWithdrawalId:     number | null;
  pendingWithdrawalAmount: number;
};

type PlatformEarnings = {
  generatedAt:       string;
  totalFees:         number;
  todayFees:         number;
  weekFees:          number;
  monthFees:         number;
  sessionFees:       number;
  bulkFees:          number;
  giftFees:          number;
  feeCount:          number;
  completedSessions: number;
  india:  { total: number; count: number };
  global: { total: number; count: number };
  fees:   FeeEntry[];
};

/* ── Sample data ─────────────────────────────────────────────────────────── */
const SAMPLE: PlatformEarnings = {
  generatedAt:       new Date().toISOString(),
  totalFees:         247.80,
  todayFees:         18.50,
  weekFees:          87.30,
  monthFees:         190.20,
  sessionFees:       165.00,
  bulkFees:          62.00,
  giftFees:          20.80,
  feeCount:          10,
  completedSessions: 48,
  india:  { total: 142.00, count: 18 },
  global: { total: 105.80, count: 13 },
  fees: [
    { id: 1, requestId: 101, amount: 12.00, grossAmount: 120.00, netToGamer: 108.00, type: "session_fee",      description: "Session: Valorant — $120.00 × 10%", createdAt: new Date(Date.now() - 3_600_000).toISOString(),    hirerRegion: "india",         gameName: "Valorant",          platform: "PC",     hirerId: 2,  hirerName: "Arjun Mehta",   hirerGbId: "GB-001", gamerId: 3,  gamerName: "ProSniper_X",   gamerGbId: "GB-012", pendingWithdrawalId: 801, pendingWithdrawalAmount: 108.00 },
    { id: 2, requestId: 102, amount: 25.00, grossAmount: 250.00, netToGamer: 225.00, type: "bulk_session_fee", description: "Bulk: BGMI — $250.00 × 10%",        createdAt: new Date(Date.now() - 7_200_000).toISOString(),    hirerRegion: "india",         gameName: "BGMI",              platform: "Mobile", hirerId: 4,  hirerName: "Priya Sharma",  hirerGbId: "GB-002", gamerId: 5,  gamerName: "FF_Master99",   gamerGbId: "GB-013", pendingWithdrawalId: 802, pendingWithdrawalAmount: 225.00 },
    { id: 3, requestId: 103, amount: 8.00,  grossAmount: 80.00,  netToGamer: 72.00,  type: "session_fee",      description: "Session: Fortnite — $80.00 × 10%",  createdAt: new Date(Date.now() - 86_400_000).toISOString(),   hirerRegion: "international", gameName: "Fortnite",          platform: "PC",     hirerId: 6,  hirerName: "John Smith",    hirerGbId: "GB-003", gamerId: 7,  gamerName: "FortniteGod",   gamerGbId: "GB-014", pendingWithdrawalId: null,    pendingWithdrawalAmount: 0 },
    { id: 4, requestId: 104, amount: 3.50,  grossAmount: 35.00,  netToGamer: 31.50,  type: "gift_fee",         description: "Tip: CS2 — $35.00 × 10%",           createdAt: new Date(Date.now() - 172_800_000).toISOString(),  hirerRegion: "international", gameName: "CS2",               platform: "PC",     hirerId: 8,  hirerName: "Maria Lopez",   hirerGbId: "GB-004", gamerId: 9,  gamerName: "FaceIT_Pro",    gamerGbId: "GB-015", pendingWithdrawalId: 803, pendingWithdrawalAmount: 200.00 },
    { id: 5, requestId: 105, amount: 18.00, grossAmount: 180.00, netToGamer: 162.00, type: "session_fee",      description: "Session: Dota 2 — $180.00 × 10%",   createdAt: new Date(Date.now() - 259_200_000).toISOString(),  hirerRegion: "india",         gameName: "Dota 2",            platform: "PC",     hirerId: 10, hirerName: "Rahul Das",     hirerGbId: "GB-005", gamerId: 11, gamerName: "DotaLegend7",   gamerGbId: "GB-016", pendingWithdrawalId: null,    pendingWithdrawalAmount: 0 },
    { id: 6, requestId: 106, amount: 40.00, grossAmount: 400.00, netToGamer: 360.00, type: "bulk_session_fee", description: "Bulk: Overwatch 2 — $400 × 10%",    createdAt: new Date(Date.now() - 345_600_000).toISOString(),  hirerRegion: "international", gameName: "Overwatch 2",       platform: "PC",     hirerId: 12, hirerName: "Emily Chen",    hirerGbId: "GB-006", gamerId: 13, gamerName: "OW2Champion",   gamerGbId: "GB-017", pendingWithdrawalId: null,    pendingWithdrawalAmount: 0 },
    { id: 7, requestId: 107, amount: 6.80,  grossAmount: 68.00,  netToGamer: 61.20,  type: "gift_fee",         description: "Tip: Apex — $68 × 10%",             createdAt: new Date(Date.now() - 432_000_000).toISOString(),  hirerRegion: "india",         gameName: "Apex Legends",      platform: "PC",     hirerId: 14, hirerName: "Vikram Nair",   hirerGbId: "GB-007", gamerId: 15, gamerName: "ApexPredator7", gamerGbId: "GB-018", pendingWithdrawalId: null,    pendingWithdrawalAmount: 0 },
    { id: 8, requestId: 108, amount: 15.00, grossAmount: 150.00, netToGamer: 135.00, type: "session_fee",      description: "Session: FIFA 24 — $150 × 10%",     createdAt: new Date(Date.now() - 518_400_000).toISOString(),  hirerRegion: "international", gameName: "FIFA 24",           platform: "PC",     hirerId: 16, hirerName: "Carlos Ruiz",   hirerGbId: "GB-008", gamerId: 17, gamerName: "FIFAChamp_CL",  gamerGbId: "GB-019", pendingWithdrawalId: null,    pendingWithdrawalAmount: 0 },
    { id: 9, requestId: 109, amount: 22.00, grossAmount: 220.00, netToGamer: 198.00, type: "bulk_session_fee", description: "Bulk: PUBG — $220 × 10% (2 gamers)", createdAt: new Date(Date.now() - 604_800_000).toISOString(), hirerRegion: "india",         gameName: "PUBG",              platform: "PC",     hirerId: 18, hirerName: "Anjali Patel",  hirerGbId: "GB-009", gamerId: 19, gamerName: "SquadLead_07",  gamerGbId: "GB-020", pendingWithdrawalId: null,    pendingWithdrawalAmount: 0 },
    { id:10, requestId: 110, amount: 9.00,  grossAmount: 90.00,  netToGamer: 81.00,  type: "session_fee",      description: "Session: LoL — $90 × 10%",           createdAt: new Date(Date.now() - 691_200_000).toISOString(), hirerRegion: "international", gameName: "League of Legends", platform: "PC",     hirerId: 20, hirerName: "Tom Baker",     hirerGbId: "GB-010", gamerId: 21, gamerName: "LoLSoloQ",      gamerGbId: "GB-021", pendingWithdrawalId: null,    pendingWithdrawalAmount: 0 },
  ],
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtUSD(n: number) { return `$${n.toFixed(2)}`; }

const TYPE_META: Record<string, { label: string; color: string }> = {
  session_fee:      { label: "Session Fee",     color: "#00E5CD" },
  bulk_session_fee: { label: "Bulk Session",    color: "#00E5CD" },
  gift_fee:         { label: "Tip Fee",         color: "#fb923c" },
};

/* ── Admin auth ─────────────────────────────────────────────────────────── */
function useAdminAuth() {
  return useQuery<{ isAdmin: boolean }>({
    queryKey: ["admin-auth-me"],
    queryFn:  () => apiFetch(`${BASE}/admin/auth/me`),
    retry: false,
    staleTime: 30_000,
  });
}

/* ── Payout Details Modal ─────────────────────────────────────────────── */
function PayoutModal({
  fee,
  isSampleData,
  onClose,
}: {
  fee: FeeEntry;
  isSampleData: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isIndia = fee.hirerRegion === "india";

  const markPaid = useMutation({
    mutationFn: (wrId: number) =>
      apiFetch(`${BASE}/admin/withdrawal-requests/${wrId}/mark-paid`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-earnings"] });
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin-hiring-history"] });
      toast({ title: "✓ Marked as Paid", description: `$${fee.pendingWithdrawalAmount.toFixed(2)} payout marked. Balance deducted and logged.` });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function handleMarkPaid() {
    if (isSampleData) {
      toast({ title: "Test Mode", description: "This is sample data — no real payout was processed." });
      return;
    }
    if (!fee.pendingWithdrawalId) return;
    markPaid.mutate(fee.pendingWithdrawalId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm leading-tight">Payout Details</h2>
              <p className="text-[10px] text-muted-foreground/50">Session #{fee.requestId ?? fee.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-muted/60 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Participants */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 border border-border/50 rounded-xl p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Hirer (Paid)</p>
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  {fee.hirerId ? (
                    <Link href={`/users/${fee.hirerId}`} className="font-semibold text-xs text-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                      {fee.hirerName ?? "Unknown"}
                      <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/30" />
                    </Link>
                  ) : (
                    <p className="font-semibold text-xs text-foreground">{fee.hirerName ?? "Unknown"}</p>
                  )}
                  {fee.hirerGbId && <p className="text-[10px] font-mono text-primary/60">{fee.hirerGbId}</p>}
                </div>
              </div>
            </div>
            <div className="bg-muted/30 border border-border/50 rounded-xl p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Hired Gamer</p>
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-3.5 h-3.5 text-green-400" />
                </div>
                <div>
                  {fee.gamerId ? (
                    <Link href={`/users/${fee.gamerId}`} className="font-semibold text-xs text-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                      {fee.gamerName ?? "Unknown"}
                      <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/30" />
                    </Link>
                  ) : (
                    <p className="font-semibold text-xs text-foreground">{fee.gamerName ?? "Not assigned"}</p>
                  )}
                  {fee.gamerGbId && <p className="text-[10px] font-mono text-green-500/60">{fee.gamerGbId}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Session info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground/70 bg-muted/20 border border-border/40 rounded-xl px-4 py-3">
            <Gamepad2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground/40" />
            <span className="font-medium text-foreground/80">{fee.gameName ?? "—"}</span>
            {fee.platform && <><span className="text-muted-foreground/30">·</span><span>{fee.platform}</span></>}
            <span className="text-muted-foreground/30 ml-auto">·</span>
            <span className="ml-auto shrink-0">{format(new Date(fee.createdAt), "dd MMM yyyy, HH:mm")} IST</span>
          </div>

          {/* Money breakdown — the core of the modal */}
          <div className="rounded-xl border border-border/60 overflow-hidden">
            {/* Gross */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/10 border-b border-border/40">
              <span className="text-sm text-muted-foreground/70 font-medium">Gross Amount (Hirer Paid)</span>
              <span className="text-lg font-bold text-foreground tabular-nums">{fmtUSD(fee.grossAmount)}</span>
            </div>

            {/* You Keep */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border/40"
              style={{ background: "rgba(0,229,205,0.06)", borderColor: "rgba(0,229,205,0.15)" }}>
              <div>
                <p className="text-sm font-bold" style={{ color: "#00E5CD" }}>You Keep (10% Platform Fee)</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,229,205,0.55)" }}>
                  → Transfer to <span className="font-mono font-bold">creedx112@okicici</span> via Razorpay
                </p>
              </div>
              <span className="text-2xl font-black tabular-nums" style={{ color: "#00E5CD" }}>
                {fmtUSD(fee.amount)}
              </span>
            </div>

            {/* You Must Send */}
            <div className="flex items-center justify-between px-4 py-4"
              style={{ background: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.15)" }}>
              <div>
                <p className="text-sm font-black text-green-400">You Must Send to Gamer (90%)</p>
                <p className="text-[11px] text-green-400/55 mt-0.5">
                  → {isIndia ? "🇮🇳 UPI transfer" : "🌍 Bank / wire transfer"} to {fee.gamerName ?? "gamer"}
                </p>
              </div>
              <span className="text-2xl font-black text-green-400 tabular-nums">
                {fmtUSD(fee.netToGamer)}
              </span>
            </div>
          </div>

          {/* Pending withdrawal callout */}
          {fee.pendingWithdrawalId ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-300">Withdrawal Requested</p>
                <p className="text-[11px] text-amber-300/60 mt-0.5">
                  {fee.gamerName} has a pending withdrawal of <strong>${fee.pendingWithdrawalAmount.toFixed(2)}</strong>
                </p>
              </div>
              <span className="text-xs font-mono text-amber-400/70 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 shrink-0">
                WR #{fee.pendingWithdrawalId}
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-border/30 bg-muted/10 px-4 py-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <p className="text-xs text-muted-foreground/50">No pending withdrawal request from this gamer yet.</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              onClick={handleMarkPaid}
              disabled={!fee.pendingWithdrawalId || markPaid.isPending}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {markPaid.isPending ? "Processing…" : fee.pendingWithdrawalId ? "Mark as Paid (UPI / Bank Transfer)" : "No Withdrawal Pending"}
            </Button>
            <Button variant="outline" onClick={onClose} className="px-5 border-border/50 text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
          </div>

          {isSampleData && (
            <p className="text-center text-[10px] text-amber-400/50">
              Test mode — no real payout will be processed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Admin top nav ────────────────────────────────────────────────────────── */
function AdminNav() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const logout = useMutation({
    mutationFn: () => apiFetch(`${BASE}/admin/auth/logout`, { method: "POST" }),
    onSuccess:  () => { navigate("/admin/login"); },
    onError:    () => toast({ title: "Logout failed", variant: "destructive" }),
  });
  return (
    <div className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight text-foreground">Player4Hire Admin</span>
          <span className="hidden sm:inline text-xs text-muted-foreground/50 ml-2">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}
          className="gap-1.5 text-muted-foreground hover:text-destructive">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-2 border-t border-border/40 flex gap-1 overflow-x-auto">
        {[
          { href: "/admin/dashboard",        label: "Payouts & Verifications", icon: DollarSign },
          { href: "/admin/community",         label: "Community Moderation",    icon: Users      },
          { href: "/admin/platform-earnings", label: "Platform Earnings",       icon: Wallet     },
          { href: "/admin/security",          label: "Security",                icon: Shield     },
          { href: "/admin/moderators",        label: "Moderators",              icon: UserCheck  },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              item.href === "/admin/platform-earnings"
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}>
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Main Page
════════════════════════════════════════════════════════════════════════════ */
export default function PlatformEarnings() {
  const [, navigate]    = useLocation();
  const [modalFee, setModalFee] = useState<FeeEntry | null>(null);

  const { data: authData, isLoading: authLoading } = useAdminAuth();
  useEffect(() => {
    if (!authLoading && !authData?.isAdmin) navigate("/admin/login");
  }, [authData, authLoading, navigate]);

  const { data: raw, isLoading, isError, refetch } = useQuery<PlatformEarnings>({
    queryKey: ["platform-earnings"],
    queryFn:  () => apiFetch<PlatformEarnings>(`${BASE}/admin/platform-earnings`),
    staleTime: 15_000,
    enabled: !!authData?.isAdmin,
  });

  const isSample = !raw || raw.feeCount === 0;
  const d = isSample ? SAMPLE : raw!;

  const readyToPay       = d.fees.filter(f => !!f.pendingWithdrawalId);
  const visibleFees      = d.fees.slice(0, 10);
  const totalGross       = visibleFees.reduce((s, f) => s + f.grossAmount, 0);
  const totalKeep        = visibleFees.reduce((s, f) => s + f.amount, 0);
  const totalSend        = visibleFees.reduce((s, f) => s + f.netToGamer, 0);
  const totalDueSend     = readyToPay.reduce((s, f) => s + f.netToGamer, 0);
  const totalAllTimeKeep = d.totalFees;

  function exportReadyToPayCSV() {
    const headers = ["Gamer Name", "GB-ID", "Amount to Send (90%)", "Game", "Platform", "Date", "Payment Method"];
    const rows = readyToPay.map(f => [
      f.gamerName ?? "Unknown",
      f.gamerGbId ?? "—",
      f.netToGamer.toFixed(2),
      f.gameName ?? "—",
      f.platform ?? "—",
      format(new Date(f.createdAt), "dd MMM yyyy HH:mm"),
      f.hirerRegion === "india" ? "UPI (Razorpay)" : "Bank Transfer",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gamerbuddy-payouts-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      {/* Payout modal */}
      {modalFee && (
        <PayoutModal fee={modalFee} isSampleData={isSample} onClose={() => setModalFee(null)} />
      )}

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold uppercase tracking-tight text-foreground">Platform Earnings</h1>
                <span className="text-[10px] font-black text-primary/80 bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-full uppercase tracking-wider">Owner</span>
                {isSample && <span className="text-[10px] font-bold text-amber-400/80 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider">Sample Data</span>}
              </div>
              <p className="text-xs text-muted-foreground/50">10% fee on every session · 90% goes to gamers</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-muted-foreground text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>

        {/* ══════════════════════════════════════════════════
            TOP SUMMARY BANNER
        ══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Total Ready to Send */}
          <div className="rounded-2xl border border-green-500/30 flex items-center gap-4 px-6 py-4"
            style={{ background: "rgba(34,197,94,0.06)" }}>
            <div className="w-11 h-11 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-green-400/70">Total Ready to Send Now</p>
              <p className="text-3xl font-black text-green-400 tabular-nums leading-tight">{fmtUSD(totalDueSend)}</p>
              <p className="text-[11px] text-green-400/50 mt-0.5">
                {readyToPay.length} gamer{readyToPay.length !== 1 ? "s" : ""} with pending withdrawal requests
              </p>
            </div>
          </div>
          {/* You Keep All-Time */}
          <div className="rounded-2xl border flex items-center gap-4 px-6 py-4"
            style={{ borderColor: "rgba(0,229,205,0.30)", background: "rgba(0,229,205,0.06)" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(0,229,205,0.15)", border: "1px solid rgba(0,229,205,0.30)" }}>
              <Wallet className="h-5 w-5" style={{ color: "#00E5CD" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(0,229,205,0.70)" }}>You Keep (All Time)</p>
              <p className="text-3xl font-black tabular-nums leading-tight" style={{ color: "#00E5CD" }}>{fmtUSD(totalAllTimeKeep)}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,229,205,0.50)" }}>
                10% platform fee · transfer to <span className="font-mono font-bold">creedx112@okicici</span>
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 1 — READY TO PAY (most urgent, always first)
        ══════════════════════════════════════════════════ */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1.5px solid rgba(34,197,94,0.30)", background: "rgba(34,197,94,0.025)" }}>
          {/* Section header */}
          <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(34,197,94,0.20)", background: "rgba(34,197,94,0.06)" }}>
            <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black uppercase tracking-wide text-green-300">Ready to Pay (Manual Payouts)</h2>
                    {readyToPay.length > 0 && (
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full text-green-400 bg-green-500/15 border border-green-500/30">
                        {readyToPay.length} waiting
                      </span>
                    )}
                    {isSample && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/25">Sample</span>}
                  </div>
                  <p className="text-xs text-green-400/50 mt-0.5">Gamers with completed sessions requesting withdrawal (≥ $100 min) — process these manually</p>
                </div>
              </div>
              {/* Right side: total + CSV export */}
              <div className="flex items-center gap-3 shrink-0">
                {readyToPay.length > 0 && (
                  <>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-green-400/60">Total to Send</p>
                      <p className="text-2xl font-black text-green-400 tabular-nums">{fmtUSD(totalDueSend)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportReadyToPayCSV}
                      className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300 font-bold whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export CSV
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="divide-y" style={{ borderColor: "rgba(34,197,94,0.12)" }}>
            {readyToPay.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500/30" />
                <p className="font-semibold text-muted-foreground/60">No payouts due right now</p>
                <p className="text-xs text-muted-foreground/40 mt-1">Gamers with completed sessions who request withdrawal appear here.</p>
              </div>
            ) : (
              readyToPay.map(fee => {
                const isIndia = fee.hirerRegion === "india";
                return (
                  <div key={fee.id} className="p-5 hover:bg-green-500/[0.04] transition-colors">
                    {/* Hero line */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Primary action text */}
                        <div className="mb-2">
                          <div className="text-[10px] font-black uppercase tracking-widest text-green-400/60 mb-0.5">You Must Send</div>
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-3xl font-black text-green-400 tabular-nums">{fmtUSD(fee.netToGamer)}</span>
                            <span className="text-base text-muted-foreground/60 font-medium">to</span>
                            <span className="text-xl font-extrabold text-foreground">{fee.gamerName ?? "Unknown Gamer"}</span>
                            {fee.gamerGbId && (
                              <span className="text-sm font-mono text-green-400/60 bg-green-500/8 px-2 py-0.5 rounded-lg border border-green-500/20">{fee.gamerGbId}</span>
                            )}
                          </div>
                        </div>
                        {/* Session info */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/55 flex-wrap">
                          <Gamepad2 className="w-3 h-3 shrink-0" />
                          <span className="font-medium">{fee.gameName ?? "—"}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span>{fee.platform ?? "—"}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span>{formatDistanceToNow(new Date(fee.createdAt), { addSuffix: true })}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="font-semibold">{isIndia ? "🇮🇳 UPI (Razorpay)" : "🌍 Bank Transfer"}</span>
                        </div>
                      </div>

                      {/* Breakdown pills + button */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                        {/* Gross */}
                        <div className="rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-center min-w-[72px]">
                          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/50">Gross</p>
                          <p className="text-sm font-bold text-foreground tabular-nums">{fmtUSD(fee.grossAmount)}</p>
                        </div>
                        <span className="text-muted-foreground/25 text-lg font-light">→</span>
                        {/* You Keep */}
                        <div className="rounded-xl border px-3 py-2 text-center min-w-[72px]"
                          style={{ background: "rgba(0,229,205,0.08)", borderColor: "rgba(0,229,205,0.25)" }}>
                          <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: "rgba(0,229,205,0.65)" }}>You Keep</p>
                          <p className="text-sm font-bold tabular-nums" style={{ color: "#00E5CD" }}>{fmtUSD(fee.amount)}</p>
                        </div>
                        <span className="text-muted-foreground/25 text-lg font-light">→</span>
                        {/* You Send */}
                        <div className="rounded-xl border border-green-500/35 bg-green-500/10 px-4 py-2 text-center min-w-[88px]">
                          <p className="text-[9px] font-black uppercase tracking-wider text-green-400/70">You Send</p>
                          <p className="text-xl font-black text-green-400 tabular-nums">{fmtUSD(fee.netToGamer)}</p>
                        </div>

                        {/* Process Payout button */}
                        <Button
                          onClick={() => setModalFee(fee)}
                          className="bg-green-600 hover:bg-green-500 text-white font-black gap-2 whitespace-nowrap h-12 px-5 text-sm rounded-xl"
                        >
                          <CreditCard className="w-4 h-4" />
                          Process Payout
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Section footer note */}
          <div className="px-6 py-3 border-t text-xs text-green-400/50 flex items-center gap-2" style={{ borderColor: "rgba(34,197,94,0.15)", background: "rgba(34,197,94,0.03)" }}>
            <Zap className="w-3 h-3 shrink-0" />
            <span>Process manually via <strong className="text-green-400/70">Razorpay UPI</strong> (India) or <strong className="text-green-400/70">Bank Transfer</strong> (International) · Your 10% goes to <span className="font-mono">creedx112@okicici</span></span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 2 — HOW THE SPLIT WORKS (simplified 2-box)
        ══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 90% — You Send */}
          <div className="rounded-2xl border border-green-500/25 bg-green-500/[0.04] p-6 flex items-center gap-5">
            <div className="text-5xl font-black text-green-400 tabular-nums leading-none shrink-0">90%</div>
            <div>
              <p className="text-base font-extrabold text-green-300 uppercase tracking-wide">Goes to Gamer</p>
              <p className="text-xs text-green-400/55 mt-1 leading-relaxed">
                You send via <strong className="text-green-400/80">UPI</strong> (India) or <strong className="text-green-400/80">Bank Transfer</strong> (International). Use the Process Payout buttons above.
              </p>
            </div>
          </div>
          {/* 10% — You Keep */}
          <div className="rounded-2xl border px-6 py-6 flex items-center gap-5"
            style={{ borderColor: "rgba(0,229,205,0.25)", background: "rgba(0,229,205,0.04)" }}>
            <div className="text-5xl font-black tabular-nums leading-none shrink-0" style={{ color: "#00E5CD" }}>10%</div>
            <div>
              <p className="text-base font-extrabold uppercase tracking-wide" style={{ color: "#00E5CD" }}>You Keep</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(0,229,205,0.55)" }}>
                Platform fee goes to <strong className="font-mono" style={{ color: "rgba(0,229,205,0.8)" }}>creedx112@okicici</strong> via Razorpay. Same split applies to all tips and bulk sessions.
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 3 — EARNINGS SUMMARY CARDS
        ══════════════════════════════════════════════════ */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        )}
        {isError && !isSample && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
            Failed to load earnings data. Showing sample data.
          </div>
        )}

        {/* Time cards */}
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/40 mb-3">Your Earnings — Platform Fees Collected</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Today",      value: fmtUSD(d.todayFees),  sub: `${d.completedSessions} sessions all-time`, icon: <Clock className="h-5 w-5" />,         color: "#22c55e" },
              { label: "This Week",  value: fmtUSD(d.weekFees),   sub: `🇮🇳 India: ${fmtUSD(d.india.total)}`,      icon: <CalendarDays className="h-5 w-5" />,  color: "#00E5CD" },
              { label: "This Month", value: fmtUSD(d.monthFees),  sub: `🌍 Global: ${fmtUSD(d.global.total)}`,    icon: <CalendarRange className="h-5 w-5" />, color: "#00E5CD" },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border px-5 py-5 flex items-center gap-4"
                style={{ background: `${card.color}07`, borderColor: `${card.color}25` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${card.color}15`, color: card.color, border: `1px solid ${card.color}30` }}>
                  {card.icon}
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{card.label}</div>
                  <div className="text-3xl font-black tabular-nums text-foreground leading-tight">{card.value}</div>
                  <div className="text-[10px] text-muted-foreground/40 mt-0.5">{card.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All-time + geo strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total All-Time", value: fmtUSD(d.totalFees),   color: "#00E5CD", icon: <DollarSign className="h-4 w-4" /> },
            { label: "Session Fees",   value: fmtUSD(d.sessionFees), color: "#00E5CD", icon: <ShieldCheck className="h-4 w-4" /> },
            { label: "Bulk Fees",      value: fmtUSD(d.bulkFees),    color: "#60a5fa", icon: <Layers className="h-4 w-4" /> },
            { label: "Tip Fees",       value: fmtUSD(d.giftFees),    color: "#fb923c", icon: <Gift className="h-4 w-4" /> },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border p-4"
              style={{ background: `${card.color}05`, borderColor: `${card.color}20` }}>
              <div className="flex items-center gap-2 mb-1" style={{ color: card.color }}>
                {card.icon}
                <span className="text-[9px] font-black uppercase tracking-widest opacity-75">{card.label}</span>
              </div>
              <div className="text-2xl font-black tabular-nums text-foreground">{card.value}</div>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 4 — RECENT TRANSACTIONS TABLE
        ══════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-border/30 bg-muted/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/30 bg-muted/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary/60" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground/70">
                Recent Transactions — Last {visibleFees.length}
              </span>
              {isSample && (
                <span className="text-[10px] font-bold text-amber-400/70 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Sample</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground/35 italic">Click any row → full payout details</span>
          </div>

          {d.fees.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground/50">No fees collected yet.</p>
              <p className="text-xs text-muted-foreground/35 mt-1">Fees appear here when quests complete or tips are sent.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[820px]">
                <thead>
                  <tr className="border-b border-border/20 bg-muted/10">
                    <th className="text-left px-4 py-3 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Date</th>
                    <th className="text-left px-4 py-3 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Type</th>
                    <th className="text-left px-4 py-3 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Game · Platform</th>
                    <th className="text-left px-4 py-3 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Hirer → Gamer</th>
                    <th className="text-right px-4 py-3 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Gross</th>
                    <th className="text-right px-4 py-3 font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: "rgba(0,229,205,0.7)" }}>You Keep (10%)</th>
                    <th className="text-right px-4 py-3 font-extrabold uppercase tracking-widest whitespace-nowrap text-green-400">You Send (90%) ↓</th>
                    <th className="text-center px-4 py-3 font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/15">
                  {visibleFees.map((fee, idx) => {
                    const meta = TYPE_META[fee.type] ?? { label: fee.type, color: "#00E5CD" };
                    const isIndia = fee.hirerRegion === "india";
                    const hasWithdrawal = !!fee.pendingWithdrawalId;
                    return (
                      <tr key={fee.id} onClick={() => setModalFee(fee)}
                        className={`cursor-pointer transition-all ${idx % 2 === 0 ? "" : "bg-muted/[0.04]"} hover:bg-green-500/[0.03] ${hasWithdrawal ? "ring-1 ring-inset ring-green-500/20" : ""}`}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-foreground/70">{format(new Date(fee.createdAt), "dd MMM")}</div>
                          <div className="text-[10px] text-muted-foreground/35">{format(new Date(fee.createdAt), "HH:mm")}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground/80 truncate max-w-[120px]">{fee.gameName ?? "—"}</div>
                          <div className="text-[10px] text-muted-foreground/40">{fee.platform ?? "—"} · {isIndia ? "🇮🇳" : "🌍"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-foreground/75 truncate max-w-[130px]">
                            <span className="font-medium">{fee.hirerName ?? "—"}</span>
                            <span className="text-muted-foreground/40 mx-1">→</span>
                            <span className="font-semibold text-green-400/80">{fee.gamerName ?? "—"}</span>
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground/35">{fee.hirerGbId ?? ""}{fee.gamerGbId ? ` → ${fee.gamerGbId}` : ""}</div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="font-bold text-foreground/70 tabular-nums">{fmtUSD(fee.grossAmount)}</span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="font-bold tabular-nums" style={{ color: "#00E5CD" }}>{fmtUSD(fee.amount)}</span>
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <span className="text-base font-black text-green-400 tabular-nums">{fmtUSD(fee.netToGamer)}</span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {hasWithdrawal ? (
                            <Button size="sm" onClick={e => { e.stopPropagation(); setModalFee(fee); }}
                              className="h-7 text-[11px] font-bold gap-1 bg-green-600 hover:bg-green-500 text-white px-3">
                              Pay Now
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/30">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals footer — big and clear */}
                <tfoot>
                  <tr className="border-t-2 border-border/40 bg-muted/30">
                    <td colSpan={4} className="px-4 py-4 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
                      Totals · {visibleFees.length} of {d.feeCount} shown
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground/40 font-bold">Total Gross</div>
                      <div className="text-base font-black text-foreground/80 tabular-nums">{fmtUSD(totalGross)}</div>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "rgba(0,229,205,0.55)" }}>You Keep</div>
                      <div className="text-base font-black tabular-nums" style={{ color: "#00E5CD" }}>{fmtUSD(totalKeep)}</div>
                    </td>
                    {/* Highlighted "You Need to Send" total */}
                    <td className="px-4 py-4 text-right whitespace-nowrap" style={{ background: "rgba(34,197,94,0.08)" }}>
                      <div className="text-[9px] uppercase tracking-widest text-green-400/70 font-black">Total You Need to Send</div>
                      <div className="text-xl font-black text-green-400 tabular-nums">{fmtUSD(totalSend)}</div>
                    </td>
                    <td className="px-4 py-4" style={{ background: "rgba(34,197,94,0.08)" }} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Bottom note */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/35 pb-4">
          <BadgeCheck className="w-3 h-3 shrink-0" />
          <span>{d.feeCount} total fee{d.feeCount !== 1 ? "s" : ""} collected · Click any row to open the full payout breakdown{isSample ? " · Sample data shown" : ""}</span>
        </div>
      </div>
    </div>
  );
}
