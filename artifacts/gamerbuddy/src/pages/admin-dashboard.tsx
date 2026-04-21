import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, BASE } from "@/lib/bids-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow, isToday, isThisWeek, isThisMonth } from "date-fns";
import {
  Shield, LogOut, DollarSign, CheckCircle2, Clock, User,
  Globe, RefreshCw, AlertTriangle, ChevronDown, ChevronUp,
  BadgeCheck, Eye, XCircle, Wallet, Users, History, Search,
  Gamepad2, ArrowUpDown, TrendingUp, Activity,
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

type HiringSession = {
  id:           number;
  gameName:     string;
  platform:     string;
  status:       string;
  escrowAmount: number;
  platformFee:  number;
  gamerPayout:  number;
  hirerRegion:  string;
  createdAt:    string;
  startedAt:    string | null;
  hirer:  { id: number | null; name: string; gbId: string | null };
  gamer:  { id: number | null; name: string; gbId: string | null };
};

type HiringSummary = {
  completedSessions: number;
  totalTransacted:   number;
  platformEarnings:  number;
};

/* ── Sample data for Test Mode ─────────────────────────────────────────── */
const SAMPLE_SESSIONS: HiringSession[] = [
  { id: 1001, gameName: "BGMI", platform: "Mobile", status: "completed", escrowAmount: 25, platformFee: 2.5, gamerPayout: 22.5, hirerRegion: "india", createdAt: new Date(Date.now() - 1*3600000).toISOString(), startedAt: new Date(Date.now() - 2*3600000).toISOString(), hirer: { id: 2, name: "RahulGamer22", gbId: "GB-00002" }, gamer: { id: 3, name: "ProSniper_X", gbId: "GB-00003" } },
  { id: 1002, gameName: "Valorant", platform: "PC", status: "completed", escrowAmount: 40, platformFee: 4, gamerPayout: 36, hirerRegion: "international", createdAt: new Date(Date.now() - 5*3600000).toISOString(), startedAt: new Date(Date.now() - 6*3600000).toISOString(), hirer: { id: 4, name: "XenonStrike", gbId: "GB-00004" }, gamer: { id: 5, name: "CoachV_Pro", gbId: "GB-00005" } },
  { id: 1003, gameName: "Free Fire", platform: "Mobile", status: "payment_released", escrowAmount: 18, platformFee: 1.8, gamerPayout: 16.2, hirerRegion: "india", createdAt: new Date(Date.now() - 12*3600000).toISOString(), startedAt: new Date(Date.now() - 13*3600000).toISOString(), hirer: { id: 6, name: "ArjunPlays", gbId: "GB-00006" }, gamer: { id: 7, name: "FF_Master99", gbId: "GB-00007" } },
  { id: 1004, gameName: "COD Mobile", platform: "Mobile", status: "completed", escrowAmount: 30, platformFee: 3, gamerPayout: 27, hirerRegion: "india", createdAt: new Date(Date.now() - 1*86400000).toISOString(), startedAt: new Date(Date.now() - 1*86400000 + 2*3600000).toISOString(), hirer: { id: 8, name: "VikramK", gbId: "GB-00008" }, gamer: { id: 9, name: "TacticalAce", gbId: "GB-00009" } },
  { id: 1005, gameName: "Apex Legends", platform: "PC", status: "in_progress", escrowAmount: 55, platformFee: 5.5, gamerPayout: 49.5, hirerRegion: "international", createdAt: new Date(Date.now() - 2*86400000).toISOString(), startedAt: null, hirer: { id: 10, name: "GhostShot_EU", gbId: "GB-00010" }, gamer: { id: 11, name: "ApexPredator7", gbId: "GB-00011" } },
  { id: 1006, gameName: "BGMI", platform: "Mobile", status: "completed", escrowAmount: 22, platformFee: 2.2, gamerPayout: 19.8, hirerRegion: "india", createdAt: new Date(Date.now() - 3*86400000).toISOString(), startedAt: new Date(Date.now() - 3*86400000).toISOString(), hirer: { id: 12, name: "SunilBhai", gbId: "GB-00012" }, gamer: { id: 3, name: "ProSniper_X", gbId: "GB-00003" } },
  { id: 1007, gameName: "CS2", platform: "PC", status: "completed", escrowAmount: 80, platformFee: 8, gamerPayout: 72, hirerRegion: "international", createdAt: new Date(Date.now() - 5*86400000).toISOString(), startedAt: new Date(Date.now() - 5*86400000).toISOString(), hirer: { id: 13, name: "Alex_NL", gbId: "GB-00013" }, gamer: { id: 14, name: "FaceIT_Pro", gbId: "GB-00014" } },
  { id: 1008, gameName: "Minecraft", platform: "PC", status: "open", escrowAmount: 15, platformFee: 0, gamerPayout: 0, hirerRegion: "international", createdAt: new Date(Date.now() - 6*86400000).toISOString(), startedAt: null, hirer: { id: 15, name: "BlockBuilder99", gbId: "GB-00015" }, gamer: { id: null, name: "Not assigned", gbId: null } },
  { id: 1009, gameName: "PUBG PC", platform: "PC", status: "completed", escrowAmount: 45, platformFee: 4.5, gamerPayout: 40.5, hirerRegion: "india", createdAt: new Date(Date.now() - 10*86400000).toISOString(), startedAt: new Date(Date.now() - 10*86400000).toISOString(), hirer: { id: 16, name: "DesertEagle_IN", gbId: "GB-00016" }, gamer: { id: 17, name: "SquadLead_07", gbId: "GB-00017" } },
  { id: 1010, gameName: "Valorant", platform: "PC", status: "completed", escrowAmount: 60, platformFee: 6, gamerPayout: 54, hirerRegion: "international", createdAt: new Date(Date.now() - 15*86400000).toISOString(), startedAt: new Date(Date.now() - 15*86400000).toISOString(), hirer: { id: 18, name: "RadiantSeeker", gbId: "GB-00018" }, gamer: { id: 5, name: "CoachV_Pro", gbId: "GB-00005" } },
];

const SAMPLE_SUMMARY: HiringSummary = {
  completedSessions: 7,
  totalTransacted: 322,
  platformEarnings: 37.5,
};

/* ── Status badge ───────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    completed:        { label: "Completed",        color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
    payment_released: { label: "Payment Released", color: "#34d399", bg: "rgba(52,211,153,0.1)" },
    in_progress:      { label: "In Progress",      color: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
    open:             { label: "Open",             color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
    pending_review:   { label: "Pending Review",   color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
    cancelled:        { label: "Cancelled",        color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  };
  const m = map[status] ?? { label: status, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.color}40` }}>
      {m.label}
    </span>
  );
}

/* ── Admin Auth ─────────────────────────────────────────────────────────── */
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
  const [activeTab, setActiveTab] = useState<"withdrawals" | "verifications" | "history">("withdrawals");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // History filters
  const [historyFilter, setHistoryFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [historySearch, setHistorySearch] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

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

  const { data: hData, isLoading: hLoading, refetch: refetchH } = useQuery<{ summary: HiringSummary; sessions: HiringSession[] }>({
    queryKey: ["admin-hiring-history"],
    queryFn:  () => apiFetch(`${BASE}/admin/hiring-history`),
    enabled:  !!authData?.isAdmin,
    staleTime: 30_000,
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

  /* ── derived data ── */
  const pending  = wData?.requests.filter(r => r.status === "pending") ?? [];
  const paid     = wData?.requests.filter(r => r.status === "paid").slice(0, 10) ?? [];
  const verifs   = vData?.verifications ?? [];

  const rawSessions  = hData?.sessions  ?? [];
  const isSampleData = rawSessions.length === 0;
  const allSessions  = isSampleData ? SAMPLE_SESSIONS : rawSessions;
  const summary      = isSampleData ? SAMPLE_SUMMARY  : (hData?.summary ?? SAMPLE_SUMMARY);

  const filteredSessions = useMemo(() => {
    let list = [...allSessions];

    // date filter
    if (historyFilter !== "all") {
      list = list.filter(s => {
        const d = new Date(s.createdAt);
        if (historyFilter === "today") return isToday(d);
        if (historyFilter === "week")  return isThisWeek(d, { weekStartsOn: 1 });
        if (historyFilter === "month") return isThisMonth(d);
        return true;
      });
    }

    // search
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      list = list.filter(s =>
        s.gameName.toLowerCase().includes(q) ||
        s.platform.toLowerCase().includes(q) ||
        s.hirer.name.toLowerCase().includes(q) ||
        (s.hirer.gbId ?? "").toLowerCase().includes(q) ||
        s.gamer.name.toLowerCase().includes(q) ||
        (s.gamer.gbId ?? "").toLowerCase().includes(q)
      );
    }

    // sort by date
    list.sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortDir === "desc" ? diff : -diff;
    });

    return list;
  }, [allSessions, historyFilter, historySearch, sortDir]);

  /* ── loading ── */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-bold tracking-widest uppercase text-sm">Authenticating…</div>
      </div>
    );
  }
  if (!authData?.isAdmin) return null;

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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                item.href === "/admin/dashboard"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Content wrapper ── */}
      <div className="max-w-[1400px] mx-auto">

      {/* ── Session Summary Cards ── */}
      <div className="px-4 md:px-6 pt-5">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 mb-3">Platform Overview</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/60">Sessions Completed</p>
              <p className="text-2xl font-black text-green-400 tabular-nums">
                {hLoading ? "—" : summary.completedSessions}
              </p>
            </div>
          </div>
          <div className="bg-card border border-purple-500/20 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/60">Total Money Transacted</p>
              <p className="text-2xl font-black text-purple-400 tabular-nums">
                {hLoading ? "—" : `$${summary.totalTransacted.toFixed(2)}`}
              </p>
            </div>
          </div>
          <div className="bg-card border border-primary/20 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/60">Total Platform Earnings</p>
              <p className="text-2xl font-black text-primary tabular-nums">
                {hLoading ? "—" : `$${summary.platformEarnings.toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Payout quick stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 md:px-6 pt-4">
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
        <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit border border-border overflow-x-auto">
          {(["withdrawals", "verifications", "history"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "withdrawals" && <DollarSign className="w-3.5 h-3.5" />}
              {tab === "verifications" && <BadgeCheck className="w-3.5 h-3.5" />}
              {tab === "history" && <History className="w-3.5 h-3.5" />}
              {tab === "withdrawals" ? "Withdrawals" : tab === "verifications" ? "Verifications" : "Hiring History"}
              {tab === "withdrawals" && pending.length > 0 && (
                <span className="bg-amber-500/20 text-amber-400 text-xs px-1.5 py-0.5 rounded-full">{pending.length}</span>
              )}
              {tab === "verifications" && verifs.length > 0 && (
                <span className="bg-purple-500/20 text-purple-400 text-xs px-1.5 py-0.5 rounded-full">{verifs.length}</span>
              )}
              {tab === "history" && (
                <span className="bg-green-500/20 text-green-400 text-xs px-1.5 py-0.5 rounded-full">{allSessions.length}</span>
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
                        <p className="text-xs text-muted-foreground/60">Balance: ${r.earningsBalance.toFixed(2)}</p>
                      </div>
                    </div>

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

        {/* ── Hiring History Tab ── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <History className="w-4 h-4 text-green-400" />
                  <h2 className="font-bold text-foreground">Hiring History</h2>
                  {isSampleData && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ color: "#fbbf24", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)" }}>
                      Sample Data · Test Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/50">
                  Complete record of all hiring sessions — use this for Razorpay payout verification.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetchH()} className="gap-1 text-xs text-muted-foreground self-start sm:self-auto">
                <RefreshCw className="w-3 h-3" /> Refresh
              </Button>
            </div>

            {/* Filters + Search row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                <input
                  type="text"
                  placeholder="Search by username, GB-ID, or game…"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
              </div>
              {/* Date filter */}
              <div className="flex gap-1 bg-muted/40 p-1 rounded-xl border border-border">
                {(["all", "today", "week", "month"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
                      historyFilter === f
                        ? "bg-green-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" ? "All Time" : f === "today" ? "Today" : f === "week" ? "This Week" : "This Month"}
                  </button>
                ))}
              </div>
              {/* Sort toggle */}
              <button
                onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortDir === "desc" ? "Newest first" : "Oldest first"}
              </button>
            </div>

            {/* Table */}
            {hLoading ? (
              <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : filteredSessions.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground/60">
                <Gamepad2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                <p className="font-medium">No sessions match your filters</p>
                <p className="text-sm mt-1">Try adjusting the date range or search query.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/20">
                        <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Date / Time</th>
                        <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Hirer</th>
                        <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Hired Gamer</th>
                        <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Game · Platform</th>
                        <th className="text-right px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Session Amt</th>
                        <th className="text-right px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Fee (10%)</th>
                        <th className="text-right px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Gamer Gets</th>
                        <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Status</th>
                        <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">Region</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredSessions.map((s, idx) => (
                        <tr key={s.id} className={`hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/5"}`}>
                          {/* Date */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-foreground/80">
                              {format(new Date(s.createdAt), "dd MMM yyyy")}
                            </div>
                            <div className="text-[10px] text-muted-foreground/50">
                              {format(new Date(s.createdAt), "HH:mm")} IST
                            </div>
                          </td>
                          {/* Hirer */}
                          <td className="px-4 py-3">
                            <div className="font-medium text-xs text-foreground/90 truncate max-w-[120px]">{s.hirer.name}</div>
                            {s.hirer.gbId && (
                              <div className="text-[10px] font-mono text-muted-foreground/50">{s.hirer.gbId}</div>
                            )}
                          </td>
                          {/* Gamer */}
                          <td className="px-4 py-3">
                            <div className="font-medium text-xs text-foreground/90 truncate max-w-[120px]">{s.gamer.name}</div>
                            {s.gamer.gbId && (
                              <div className="text-[10px] font-mono text-muted-foreground/50">{s.gamer.gbId}</div>
                            )}
                          </td>
                          {/* Game */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Gamepad2 className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
                              <span className="text-xs font-medium text-foreground/80">{s.gameName}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground/50 ml-4.5">{s.platform}</div>
                          </td>
                          {/* Session amount */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className="text-sm font-bold text-foreground/80">${s.escrowAmount.toFixed(2)}</span>
                          </td>
                          {/* Fee */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className="text-xs font-semibold text-primary/70">${s.platformFee.toFixed(2)}</span>
                          </td>
                          {/* Gamer payout */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className="text-sm font-bold text-green-400">${s.gamerPayout.toFixed(2)}</span>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={s.status} />
                          </td>
                          {/* Region */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm">{s.hirerRegion === "india" ? "🇮🇳" : "🌍"}</span>
                            <span className="text-[10px] text-muted-foreground/50 ml-1 capitalize">{s.hirerRegion}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="border-t border-border/40 px-4 py-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground/50">
                    Showing {filteredSessions.length} of {allSessions.length} sessions
                    {isSampleData && " (sample data — real sessions will appear here automatically)"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                    <span>Total: <strong className="text-foreground/80">${filteredSessions.reduce((s, r) => s + r.escrowAmount, 0).toFixed(2)}</strong></span>
                    <span>Fees: <strong className="text-primary/80">${filteredSessions.reduce((s, r) => s + r.platformFee, 0).toFixed(2)}</strong></span>
                    <span>To gamers: <strong className="text-green-400">${filteredSessions.reduce((s, r) => s + r.gamerPayout, 0).toFixed(2)}</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Info Box (shown only on withdrawals tab) ── */}
        {activeTab === "withdrawals" && (
          <div className="mt-6 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300/80">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-300">Payout Workflow Reminder</p>
                <ol className="list-decimal list-inside space-y-0.5 text-amber-300/70 text-xs">
                  <li>User requests withdrawal on Wallets page (min $100 earnings balance)</li>
                  <li>Send payment via <strong>Razorpay dashboard</strong> (UPI for India · Bank Transfer for international)</li>
                  <li>Click <strong>Mark as Paid</strong> here — this deducts balance &amp; updates status</li>
                  <li>Use the <strong>Hiring History tab</strong> to verify which sessions a gamer completed before processing payouts</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      </div>
    </div>
  );
}
