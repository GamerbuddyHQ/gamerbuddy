import { useState, useEffect, useMemo, useRef } from "react";
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
  Gamepad2, ArrowUpDown, TrendingUp, Activity, ExternalLink,
  CreditCard, ArrowRight, UserCheck, Zap, Flag, Trash2, ShieldAlert,
} from "lucide-react";
import { TrustCardBadge } from "@/components/reputation-badges";

/* ── Types ─────────────────────────────────────────────────────────────── */
type WithdrawalRequest = {
  id:              number;
  userId:          number;
  userName:        string | null;
  email:           string | null;
  gamerbuddyId:    string | null;
  amount:          number;
  status:          "pending" | "paid" | "cancelled";
  country:         string | null;
  payoutDetails:   string | null;
  createdAt:       string;
  paidAt:          string | null;
  adminNote:       string | null;
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
  id:                      number;
  gameName:                string;
  platform:                string;
  status:                  string;
  escrowAmount:            number;
  platformFee:             number;
  gamerPayout:             number;
  hirerRegion:             string;
  createdAt:               string;
  startedAt:               string | null;
  pendingWithdrawalId:     number | null;
  pendingWithdrawalAmount: number;
  hirer: { id: number | null; name: string; gbId: string | null };
  gamer: { id: number | null; name: string; gbId: string | null };
};

type HiringSummary = {
  completedSessions:   number;
  totalTransacted:     number;
  platformEarnings:    number;
  pendingGamerPayouts: number;
};

type AdminUser = {
  id:               number;
  name:             string;
  email:            string;
  gamerbuddyId:     string | null;
  idVerified:       boolean;
  isActivated:      boolean;
  trustFactor:      number;
  trustScore:       number;
  trustCardTier:    "Grey" | "Yellow" | "Blue" | "Gold";
  strikes:          number;
  flaggedForBan:    boolean;
  communityBanned:  boolean;
  profileCompletion: number;
  earningsBalance:  number;
  hiringBalance:    number;
  sessionsAsGamer:  number;
  sessionsAsHirer:  number;
  createdAt:        string;
};

type FlaggedReview = {
  id:           number;
  requestId:    number;
  rating:       number;
  comment:      string | null;
  flagReason:   string | null;
  flaggedAt:    string | null;
  createdAt:    string;
  reviewerId:   number;
  revieweeId:   number;
  reviewerName: string;
  revieweeName: string;
};

type FlaggedAccount = {
  id:                 number;
  name:               string;
  email:              string;
  gamerbuddyId:       string | null;
  idVerified:         boolean;
  trustFactor:        number;
  trustScore:         number;
  trustCardTier:      "Grey" | "Yellow" | "Blue" | "Gold";
  strikes:            number;
  flaggedForBan:      boolean;
  communityBanned:    boolean;
  permanentBan:       boolean;
  accountFlagReason:  string | null;
  accountFlagStatus:  "under_review" | "disputed" | "resolved" | null;
  accountFlaggedAt:   string | null;
  disputeText:        string | null;
  disputeSubmittedAt: string | null;
  hasDisputedBefore:  boolean;
  sessionsAsGamer:    number;
  sessionsAsHirer:    number;
  createdAt:          string;
};

/* ── Sample data (shown when DB has no sessions) ───────────────────────── */
const SAMPLE_SESSIONS: HiringSession[] = [
  { id: 1001, gameName: "BGMI", platform: "Mobile", status: "completed", escrowAmount: 25, platformFee: 2.5, gamerPayout: 22.5, hirerRegion: "india", createdAt: new Date(Date.now() - 1*3600000).toISOString(), startedAt: new Date(Date.now() - 2*3600000).toISOString(), pendingWithdrawalId: 801, pendingWithdrawalAmount: 100, hirer: { id: 2, name: "RahulGamer22", gbId: "GB-00002" }, gamer: { id: 3, name: "ProSniper_X", gbId: "GB-00003" } },
  { id: 1002, gameName: "Valorant", platform: "PC", status: "completed", escrowAmount: 40, platformFee: 4, gamerPayout: 36, hirerRegion: "international", createdAt: new Date(Date.now() - 5*3600000).toISOString(), startedAt: new Date(Date.now() - 6*3600000).toISOString(), pendingWithdrawalId: null, pendingWithdrawalAmount: 0, hirer: { id: 4, name: "XenonStrike", gbId: "GB-00004" }, gamer: { id: 5, name: "CoachV_Pro", gbId: "GB-00005" } },
  { id: 1003, gameName: "Free Fire", platform: "Mobile", status: "payment_released", escrowAmount: 18, platformFee: 1.8, gamerPayout: 16.2, hirerRegion: "india", createdAt: new Date(Date.now() - 12*3600000).toISOString(), startedAt: new Date(Date.now() - 13*3600000).toISOString(), pendingWithdrawalId: 802, pendingWithdrawalAmount: 120, hirer: { id: 6, name: "ArjunPlays", gbId: "GB-00006" }, gamer: { id: 7, name: "FF_Master99", gbId: "GB-00007" } },
  { id: 1004, gameName: "COD Mobile", platform: "Mobile", status: "completed", escrowAmount: 30, platformFee: 3, gamerPayout: 27, hirerRegion: "india", createdAt: new Date(Date.now() - 1*86400000).toISOString(), startedAt: new Date(Date.now() - 1*86400000 + 3600000).toISOString(), pendingWithdrawalId: null, pendingWithdrawalAmount: 0, hirer: { id: 8, name: "VikramK", gbId: "GB-00008" }, gamer: { id: 9, name: "TacticalAce", gbId: "GB-00009" } },
  { id: 1005, gameName: "Apex Legends", platform: "PC", status: "in_progress", escrowAmount: 55, platformFee: 5.5, gamerPayout: 49.5, hirerRegion: "international", createdAt: new Date(Date.now() - 2*86400000).toISOString(), startedAt: null, pendingWithdrawalId: null, pendingWithdrawalAmount: 0, hirer: { id: 10, name: "GhostShot_EU", gbId: "GB-00010" }, gamer: { id: 11, name: "ApexPredator7", gbId: "GB-00011" } },
  { id: 1006, gameName: "BGMI", platform: "Mobile", status: "completed", escrowAmount: 22, platformFee: 2.2, gamerPayout: 19.8, hirerRegion: "india", createdAt: new Date(Date.now() - 3*86400000).toISOString(), startedAt: new Date(Date.now() - 3*86400000).toISOString(), pendingWithdrawalId: 801, pendingWithdrawalAmount: 100, hirer: { id: 12, name: "SunilBhai", gbId: "GB-00012" }, gamer: { id: 3, name: "ProSniper_X", gbId: "GB-00003" } },
  { id: 1007, gameName: "CS2", platform: "PC", status: "completed", escrowAmount: 80, platformFee: 8, gamerPayout: 72, hirerRegion: "international", createdAt: new Date(Date.now() - 5*86400000).toISOString(), startedAt: new Date(Date.now() - 5*86400000).toISOString(), pendingWithdrawalId: 803, pendingWithdrawalAmount: 200, hirer: { id: 13, name: "Alex_NL", gbId: "GB-00013" }, gamer: { id: 14, name: "FaceIT_Pro", gbId: "GB-00014" } },
  { id: 1008, gameName: "Minecraft", platform: "PC", status: "open", escrowAmount: 15, platformFee: 0, gamerPayout: 0, hirerRegion: "international", createdAt: new Date(Date.now() - 6*86400000).toISOString(), startedAt: null, pendingWithdrawalId: null, pendingWithdrawalAmount: 0, hirer: { id: 15, name: "BlockBuilder99", gbId: "GB-00015" }, gamer: { id: null, name: "Not assigned", gbId: null } },
  { id: 1009, gameName: "PUBG PC", platform: "PC", status: "completed", escrowAmount: 45, platformFee: 4.5, gamerPayout: 40.5, hirerRegion: "india", createdAt: new Date(Date.now() - 10*86400000).toISOString(), startedAt: new Date(Date.now() - 10*86400000).toISOString(), pendingWithdrawalId: null, pendingWithdrawalAmount: 0, hirer: { id: 16, name: "DesertEagle_IN", gbId: "GB-00016" }, gamer: { id: 17, name: "SquadLead_07", gbId: "GB-00017" } },
  { id: 1010, gameName: "Valorant", platform: "PC", status: "completed", escrowAmount: 60, platformFee: 6, gamerPayout: 54, hirerRegion: "international", createdAt: new Date(Date.now() - 15*86400000).toISOString(), startedAt: new Date(Date.now() - 15*86400000).toISOString(), pendingWithdrawalId: null, pendingWithdrawalAmount: 0, hirer: { id: 18, name: "RadiantSeeker", gbId: "GB-00018" }, gamer: { id: 5, name: "CoachV_Pro", gbId: "GB-00005" } },
];
const SAMPLE_SUMMARY: HiringSummary = { completedSessions: 7, totalTransacted: 335, platformEarnings: 37.5, pendingGamerPayouts: 420 };

/* ── Status badge ───────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    completed:        { label: "Completed",        color: "#4ade80", bg: "rgba(74,222,128,0.1)"   },
    payment_released: { label: "Payment Released", color: "#34d399", bg: "rgba(52,211,153,0.1)"  },
    in_progress:      { label: "In Progress",      color: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
    awaiting_reviews: { label: "Under Review",     color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
    open:             { label: "Open",             color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
    cancelled:        { label: "Cancelled",        color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  };
  const m = map[status] ?? { label: status.replace(/_/g, " "), color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
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
    retry: false,
    staleTime: 30_000,
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [, navigate]  = useLocation();
  const { toast }     = useToast();
  const qc            = useQueryClient();
  const historyRef    = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab]       = useState<"withdrawals" | "verifications" | "users" | "flagged-reviews" | "flagged-accounts">("withdrawals");
  const [userSearch, setUserSearch]     = useState("");
  const [strikingId, setStrikingId]     = useState<number | null>(null);
  const [disputeResolveId, setDisputeResolveId] = useState<number | null>(null);
  const [adminNote, setAdminNote]       = useState("");
  const [banConfirmId, setBanConfirmId] = useState<number | null>(null);
  const [expandedRow, setExpandedRow]   = useState<number | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [historySearch, setHistorySearch] = useState("");
  const [sortDir, setSortDir]           = useState<"desc" | "asc">("desc");
  const [markingId, setMarkingId]       = useState<number | null>(null);

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

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin-users"],
    queryFn:  () => apiFetch(`${BASE}/admin/users`),
    enabled:  !!authData?.isAdmin && activeTab === "users",
    staleTime: 30_000,
  });

  const { data: flaggedData, isLoading: flaggedLoading, refetch: refetchFlagged } = useQuery<{ flaggedReviews: FlaggedReview[] }>({
    queryKey: ["admin-flagged-reviews"],
    queryFn:  () => apiFetch(`${BASE}/admin/flagged-reviews`),
    enabled:  !!authData?.isAdmin && activeTab === "flagged-reviews",
    staleTime: 30_000,
  });

  const { data: flaggedAcctsData, isLoading: flaggedAcctsLoading, refetch: refetchFlaggedAccts } = useQuery<{ flaggedAccounts: FlaggedAccount[] }>({
    queryKey: ["admin-flagged-accounts"],
    queryFn:  () => apiFetch(`${BASE}/admin/flagged-accounts`),
    enabled:  !!authData?.isAdmin && activeTab === "flagged-accounts",
    staleTime: 30_000,
  });

  /* ── mutations ── */
  const markPaid = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/admin/withdrawal-requests/${id}/mark-paid`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin-hiring-history"] });
      toast({ title: "✓ Marked as Paid", description: "Withdrawal processed and gamer's balance updated." });
      setMarkingId(null);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setMarkingId(null);
    },
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

  const issueStrike = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      apiFetch(`${BASE}/admin/users/${userId}/strike`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (data: { strikes: number; flaggedForBan: boolean; name: string }) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setStrikingId(null);
      toast({
        title: `⚡ Strike Issued to ${data.name}`,
        description: data.flaggedForBan
          ? `${data.strikes} strikes — account FLAGGED FOR BAN ❌`
          : `${data.strikes} strike(s) total · Trust Factor reduced by 10`,
        variant: data.flaggedForBan ? "destructive" : "default",
      });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); setStrikingId(null); },
  });

  const unflagAccount = useMutation({
    mutationFn: ({ userId, note }: { userId: number; note: string }) =>
      apiFetch(`${BASE}/admin/users/${userId}/unflag-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: note }),
      }),
    onSuccess: (data: { name: string }) => {
      qc.invalidateQueries({ queryKey: ["admin-flagged-accounts"] });
      setDisputeResolveId(null); setAdminNote("");
      toast({ title: `✓ Account Cleared`, description: `${data.name}'s account flag has been removed.` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const permanentBan = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      apiFetch(`${BASE}/admin/users/${userId}/permanent-ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (data: { name: string }) => {
      qc.invalidateQueries({ queryKey: ["admin-flagged-accounts"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setBanConfirmId(null); setAdminNote("");
      toast({ title: `🚫 Permanently Banned`, description: `${data.name} has been permanently banned.`, variant: "destructive" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resolveDispute = useMutation({
    mutationFn: ({ userId, approve, note }: { userId: number; approve: boolean; note: string }) =>
      apiFetch(`${BASE}/admin/flagged-accounts/${userId}/resolve-dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve, adminNote: note }),
      }),
    onSuccess: (data: { approved: boolean; name: string }) => {
      qc.invalidateQueries({ queryKey: ["admin-flagged-accounts"] });
      setDisputeResolveId(null); setAdminNote("");
      toast({
        title: data.approved ? `✓ Dispute Approved — ${data.name} Cleared` : `Dispute Rejected — Flag Maintained`,
        description: data.approved ? "User notified of positive outcome." : "User notified. Flag stays under review.",
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const dismissFlag = useMutation({
    mutationFn: (id: number) => apiFetch(`${BASE}/admin/flagged-reviews/${id}/dismiss`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-flagged-reviews"] }); toast({ title: "Flag dismissed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteReview = useMutation({
    mutationFn: (id: number) => apiFetch(`${BASE}/admin/flagged-reviews/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-flagged-reviews"] }); toast({ title: "Review deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const logout = useMutation({
    mutationFn: () => apiFetch(`${BASE}/admin/auth/logout`, { method: "POST" }),
    onSuccess: () => { qc.clear(); navigate("/admin/login"); },
  });

  /* ── derived data ── */
  const pending   = wData?.requests.filter(r => r.status === "pending") ?? [];
  const paid      = wData?.requests.filter(r => r.status === "paid").slice(0, 10) ?? [];
  const verifs    = vData?.verifications ?? [];
  const rawSessions  = hData?.sessions  ?? [];
  const isSampleData = rawSessions.length === 0;
  const allSessions  = isSampleData ? SAMPLE_SESSIONS : rawSessions;
  const summary      = (hData?.summary && !isSampleData) ? hData.summary : SAMPLE_SUMMARY;

  const filteredSessions = useMemo(() => {
    let list = [...allSessions];
    if (historyFilter !== "all") {
      list = list.filter(s => {
        const d = new Date(s.createdAt);
        if (historyFilter === "today") return isToday(d);
        if (historyFilter === "week")  return isThisWeek(d, { weekStartsOn: 1 });
        if (historyFilter === "month") return isThisMonth(d);
        return true;
      });
    }
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

  /* ── handle Mark as Paid from session row ── */
  function handleSessionMarkPaid(session: HiringSession) {
    if (isSampleData) {
      toast({ title: "Test Mode", description: "Sample data — log in with a real session to mark as paid." });
      return;
    }
    if (!session.pendingWithdrawalId) return;
    setMarkingId(session.id);
    markPaid.mutate(session.pendingWithdrawalId);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Topbar ── */}
      <div className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="px-4 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold tracking-tight">Player4Hire Admin</span>
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

        {/* ── Admin nav ── */}
        <div className="px-4 md:px-8 py-2 border-t border-border/40 flex gap-1 overflow-x-auto">
          {[
            { href: "/admin/dashboard",        label: "Payouts & Verifications", icon: DollarSign },
            { href: "/admin/community",         label: "Community Moderation",   icon: Users      },
            { href: "/admin/platform-earnings", label: "Platform Earnings",      icon: Wallet     },
            { href: "/admin/security",          label: "Security",               icon: Shield     },
            { href: "/admin/moderators",        label: "Moderators",             icon: UserCheck  },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                item.href === "/admin/dashboard"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}>
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto">

        {/* ════════════════════════════════════════════════
            4-Card Platform Overview
        ════════════════════════════════════════════════ */}
        <div className="px-4 md:px-6 pt-5">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 mb-3">
            Platform Overview {isSampleData && <span className="ml-2 normal-case text-amber-400/70">(sample data)</span>}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: CheckCircle2, label: "Sessions Completed",      value: hLoading ? "—" : String(summary.completedSessions),              color: "green"  },
              { icon: TrendingUp,   label: "Total Money Transacted",   value: hLoading ? "—" : `$${summary.totalTransacted.toFixed(2)}`,       color: "purple" },
              { icon: Activity,     label: "Platform Earnings (10%)",  value: hLoading ? "—" : `$${summary.platformEarnings.toFixed(2)}`,      color: "violet" },
              { icon: CreditCard,   label: "Pending Gamer Payouts",    value: hLoading ? "—" : `$${summary.pendingGamerPayouts.toFixed(2)}`,   color: "amber"  },
            ].map(({ icon: Icon, label, value, color }) => {
              const styles: Record<string, { border: string; iconBg: string; iconColor: string; textColor: string }> = {
                green:  { border: "border-green-500/20",  iconBg: "bg-green-500/10",  iconColor: "text-green-400",  textColor: "text-green-400"  },
                purple: { border: "border-purple-500/20", iconBg: "bg-purple-500/10", iconColor: "text-purple-400", textColor: "text-purple-400" },
                violet: { border: "border-primary/20",    iconBg: "bg-primary/10",    iconColor: "text-primary",    textColor: "text-primary"    },
                amber:  { border: "border-amber-500/20",  iconBg: "bg-amber-500/10",  iconColor: "text-amber-400",  textColor: "text-amber-400"  },
              };
              const s = styles[color];
              return (
                <div key={label} className={`bg-card border ${s.border} rounded-xl p-4 flex items-center gap-3`}>
                  <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${s.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground/60 leading-tight">{label}</p>
                    <p className={`text-xl font-black tabular-nums ${s.textColor}`}>{value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            Payout Quick-Stats Row
        ════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 md:px-6 pt-3">
          {[
            { icon: <Clock className="w-4 h-4 text-amber-400" />,      label: "Pending Payouts",   value: wLoading ? "—" : String(pending.length),                                          bg: "bg-amber-500/10"  },
            { icon: <DollarSign className="w-4 h-4 text-green-400" />, label: "Total Pending",     value: wLoading ? "—" : `$${pending.reduce((s, r) => s + r.amount, 0).toFixed(2)}`,      bg: "bg-green-500/10"  },
            { icon: <CheckCircle2 className="w-4 h-4 text-blue-400" />,label: "Paid (Recent 10)",  value: wLoading ? "—" : String(paid.length),                                             bg: "bg-blue-500/10"   },
            { icon: <BadgeCheck className="w-4 h-4 text-purple-400" />,label: "Awaiting Verify",   value: vLoading ? "—" : String(verifs.length),                                           bg: "bg-purple-500/10" },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>{c.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground/70">{c.label}</p>
                <p className="text-lg font-bold leading-tight">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════════════
            Tabs
        ════════════════════════════════════════════════ */}
        <div className="px-4 md:px-6 mt-5">
          <div className="overflow-x-auto pb-0.5">
          <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-max sm:w-fit border border-border">
            {([
              { key: "withdrawals",      label: "Payouts",          icon: <DollarSign className="w-3.5 h-3.5" /> },
              { key: "verifications",    label: "Verifications",    icon: <BadgeCheck className="w-3.5 h-3.5" /> },
              { key: "users",            label: "Users",            icon: <Users className="w-3.5 h-3.5" /> },
              { key: "flagged-reviews",  label: "Flagged Reviews",  icon: <Flag className="w-3.5 h-3.5" /> },
              { key: "flagged-accounts", label: "Flagged Accounts", icon: <ShieldAlert className="w-3.5 h-3.5" /> },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {tab.icon}
                {tab.label}
                {tab.key === "withdrawals" && pending.length > 0 && (
                  <span className="bg-amber-500/20 text-amber-400 text-xs px-1.5 py-0.5 rounded-full">{pending.length}</span>
                )}
                {tab.key === "verifications" && verifs.length > 0 && (
                  <span className="bg-purple-500/20 text-purple-400 text-xs px-1.5 py-0.5 rounded-full">{verifs.length}</span>
                )}
                {tab.key === "flagged-reviews" && (flaggedData?.flaggedReviews.length ?? 0) > 0 && (
                  <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full">{flaggedData!.flaggedReviews.length}</span>
                )}
                {tab.key === "flagged-accounts" && (() => {
                  const accts = flaggedAcctsData?.flaggedAccounts ?? [];
                  const active = accts.filter(a => a.accountFlagStatus !== "resolved").length;
                  return active > 0 ? <span className="bg-orange-500/20 text-orange-400 text-xs px-1.5 py-0.5 rounded-full">{active}</span> : null;
                })()}
              </button>
            ))}
          </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            TAB CONTENT
        ════════════════════════════════════════════════ */}
        <div className="p-4 md:p-6 space-y-6">

          {/* ── Withdrawals + History Tab ── */}
          {activeTab === "withdrawals" && (
            <div className="space-y-6">

              {/* ─── Pending Withdrawal Requests ─── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-foreground flex items-center gap-2 flex-wrap">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Pending Withdrawal Requests
                    {pending.length > 0 && <span className="text-amber-400">({pending.length})</span>}
                    <span className="text-[10px] font-bold text-green-400/60 bg-green-500/8 border border-green-500/20 px-2 py-0.5 rounded-full normal-case tracking-normal">
                      ≥ $100 minimum only
                    </span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => historyRef.current?.scrollIntoView({ behavior: "smooth" })}
                      className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors">
                      <ArrowRight className="w-3 h-3" /> Session History
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => refetchW()} className="gap-1 text-xs text-muted-foreground">
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </Button>
                  </div>
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
                      <div key={r.id} className="bg-card border border-amber-500/20 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 p-4">
                          <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/users/${r.userId}`} className="font-semibold hover:text-primary transition-colors truncate">{r.userName ?? "Unknown"}</Link>
                              {r.gamerbuddyId && (
                                <span className="text-xs font-mono text-muted-foreground/60 bg-muted/60 px-1.5 py-0.5 rounded">{r.gamerbuddyId}</span>
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
                          <div className="text-right shrink-0">
                            <p className="text-xl font-bold text-green-400">${r.amount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground/60">Balance: ${r.earningsBalance.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="border-t border-border/50">
                          <button onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                            className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                            <span className="flex items-center gap-1.5">
                              <Eye className="w-3 h-3" />
                              {r.payoutDetails ? "View payout details" : "No payout details on file"}
                            </span>
                            {expandedRow === r.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {expandedRow === r.id && (
                            <div className="px-4 pb-3 space-y-2">
                              <p className="text-muted-foreground/60 text-xs uppercase tracking-widest font-medium">Payout Details</p>
                              <p className="text-foreground/80 bg-muted/40 rounded-lg p-2 font-mono text-xs break-all">
                                {r.payoutDetails ?? "No payout details provided by user."}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/50">
                                <span>Request #{r.id} · {format(new Date(r.createdAt), "dd MMM yyyy, HH:mm")}</span>
                                <span className="flex items-center gap-1">
                                  <Wallet className="w-3 h-3" />
                                  {r.country === "India" ? "UPI (Razorpay)" : "Bank Transfer (Razorpay Intl)"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-border/50 px-4 py-3 bg-amber-500/5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 text-xs text-amber-400/80">
                            <Clock className="w-3 h-3" />
                            <span>Process via Razorpay first, then click Mark as Paid</span>
                          </div>
                          <Button size="sm"
                            onClick={() => { setMarkingId(r.id); markPaid.mutate(r.id); }}
                            disabled={markPaid.isPending && markingId === r.id}
                            className="bg-green-600 hover:bg-green-500 text-white font-semibold text-xs gap-1.5 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {markPaid.isPending && markingId === r.id ? "Processing…" : "Mark as Paid"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recently paid */}
                {paid.length > 0 && (
                  <div className="mt-3">
                    <h3 className="text-xs font-semibold text-muted-foreground/60 mb-2 uppercase tracking-widest">Recently Paid (last 10)</h3>
                    <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/40">
                      {paid.map(r => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <Link href={`/users/${r.userId}`} className="font-medium text-sm truncate hover:text-primary transition-colors">{r.userName ?? "Unknown"}</Link>
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

              {/* ─────────────────────────────────────────────
                  HIRING & SESSION HISTORY AUDIT TABLE
              ───────────────────────────────────────────── */}
              <div ref={historyRef}>
                {/* Section header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/25 flex items-center justify-center shrink-0">
                        <History className="w-3.5 h-3.5 text-green-400" />
                      </div>
                      <h2 className="font-bold text-foreground text-base">Hiring &amp; Session History</h2>
                      {isSampleData && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}>
                          Sample · Test Mode
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/50 ml-9">
                      Full audit trail of all sessions — verify completed work before processing UPI / bank transfers.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => refetchH()} className="gap-1 text-xs text-muted-foreground self-start">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </Button>
                </div>

                {/* Filter + Search bar */}
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by username, GB-ID, or game…"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex gap-1 bg-muted/40 p-1 rounded-xl border border-border">
                    {(["all", "today", "week", "month"] as const).map(f => (
                      <button key={f} onClick={() => setHistoryFilter(f)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                          historyFilter === f ? "bg-green-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}>
                        {f === "all" ? "All Time" : f === "today" ? "Today" : f === "week" ? "This Week" : "This Month"}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    {sortDir === "desc" ? "Newest first" : "Oldest first"}
                  </button>
                </div>

                {/* Table */}
                {hLoading ? (
                  <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
                ) : filteredSessions.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground/60">
                    <Gamepad2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                    <p className="font-medium">No sessions match your filters</p>
                    <p className="text-sm mt-1">Try adjusting the date range or search query.</p>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[900px]">
                        <thead>
                          <tr className="border-b border-border/60 bg-muted/20">
                            {["Date / Time (IST)", "Hirer", "Hired Gamer", "Game · Platform", "Session Amt", "Fee (10%)", "Gamer Earns", "Status", "Action"].map(h => (
                              <th key={h} className={`px-3 py-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap ${h === "Session Amt" || h === "Fee (10%)" || h === "Gamer Earns" ? "text-right" : "text-left"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {filteredSessions.map((s, idx) => {
                            const hasPendingWithdrawal = !!s.pendingWithdrawalId;
                            const isActionable = hasPendingWithdrawal && (s.status === "completed" || s.status === "payment_released");
                            const isMarkingThis = markPaid.isPending && markingId === s.id;
                            return (
                              <tr key={s.id} className={`hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/[0.04]"} ${isActionable ? "ring-1 ring-inset ring-green-500/10" : ""}`}>
                                {/* Date */}
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <div className="text-xs font-medium text-foreground/80">{format(new Date(s.createdAt), "dd MMM yyyy")}</div>
                                  <div className="text-[10px] text-muted-foreground/50">{format(new Date(s.createdAt), "HH:mm")} IST</div>
                                </td>
                                {/* Hirer */}
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-1">
                                    {s.hirer.id ? (
                                      <Link href={`/users/${s.hirer.id}`} className="font-medium text-xs text-foreground/90 hover:text-primary transition-colors truncate max-w-[110px] flex items-center gap-0.5">
                                        {s.hirer.name}
                                        <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/30 shrink-0" />
                                      </Link>
                                    ) : (
                                      <span className="text-xs text-muted-foreground/60 truncate max-w-[110px]">{s.hirer.name}</span>
                                    )}
                                  </div>
                                  {s.hirer.gbId && <div className="text-[10px] font-mono text-muted-foreground/45">{s.hirer.gbId}</div>}
                                </td>
                                {/* Gamer */}
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-1">
                                    {s.gamer.id ? (
                                      <Link href={`/users/${s.gamer.id}`} className="font-medium text-xs text-foreground/90 hover:text-primary transition-colors truncate max-w-[110px] flex items-center gap-0.5">
                                        {s.gamer.name}
                                        <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/30 shrink-0" />
                                      </Link>
                                    ) : (
                                      <span className="text-xs text-muted-foreground/60 truncate max-w-[110px]">{s.gamer.name}</span>
                                    )}
                                  </div>
                                  {s.gamer.gbId && <div className="text-[10px] font-mono text-muted-foreground/45">{s.gamer.gbId}</div>}
                                  {hasPendingWithdrawal && (
                                    <div className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wide mt-0.5">
                                      ⏳ ${s.pendingWithdrawalAmount.toFixed(2)} payout pending
                                    </div>
                                  )}
                                </td>
                                {/* Game */}
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Gamepad2 className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                                    <span className="text-xs font-medium text-foreground/80">{s.gameName}</span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground/50 ml-4.5">{s.platform}</div>
                                </td>
                                {/* Amounts */}
                                <td className="px-3 py-3 text-right whitespace-nowrap">
                                  <span className="text-sm font-bold text-foreground/80">${s.escrowAmount.toFixed(2)}</span>
                                </td>
                                <td className="px-3 py-3 text-right whitespace-nowrap">
                                  <span className="text-xs font-semibold text-primary/70">${s.platformFee.toFixed(2)}</span>
                                </td>
                                <td className="px-3 py-3 text-right whitespace-nowrap">
                                  <span className={`text-sm font-bold ${s.gamerPayout > 0 ? "text-green-400" : "text-muted-foreground/30"}`}>
                                    ${s.gamerPayout.toFixed(2)}
                                  </span>
                                </td>
                                {/* Status */}
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <div className="flex flex-col gap-1">
                                    <StatusBadge status={s.status} />
                                    <span className="text-[9px] text-muted-foreground/40">{s.hirerRegion === "india" ? "🇮🇳 UPI" : "🌍 Bank"}</span>
                                  </div>
                                </td>
                                {/* Action */}
                                <td className="px-3 py-3 whitespace-nowrap">
                                  {isActionable ? (
                                    <Button
                                      size="sm"
                                      onClick={() => handleSessionMarkPaid(s)}
                                      disabled={isMarkingThis || markPaid.isPending}
                                      className="h-7 text-[11px] font-bold gap-1 bg-green-600 hover:bg-green-500 text-white whitespace-nowrap"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      {isMarkingThis ? "Paying…" : "Mark Paid"}
                                    </Button>
                                  ) : hasPendingWithdrawal ? (
                                    <span className="text-[10px] text-amber-400/60 font-medium">Payout pending</span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground/30">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Table footer totals */}
                    <div className="border-t border-border/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-xs text-muted-foreground/50">
                        Showing <strong className="text-foreground/70">{filteredSessions.length}</strong> of <strong className="text-foreground/70">{allSessions.length}</strong> sessions
                        {isSampleData && " · "}
                        {isSampleData && <span className="text-amber-400/60">sample data — real sessions appear here automatically</span>}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground/60">Total <strong className="text-foreground/80">${filteredSessions.reduce((s, r) => s + r.escrowAmount, 0).toFixed(2)}</strong></span>
                        <span className="text-muted-foreground/60">Fees <strong className="text-primary/80">${filteredSessions.reduce((s, r) => s + r.platformFee, 0).toFixed(2)}</strong></span>
                        <span className="text-muted-foreground/60">To gamers <strong className="text-green-400">${filteredSessions.reduce((s, r) => s + r.gamerPayout, 0).toFixed(2)}</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Payout workflow reminder ─── */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                  <div className="space-y-2">
                    <p className="font-semibold text-amber-300">Payout Workflow</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-amber-300/70 text-xs">
                      <li>Check <strong>Session History</strong> above to confirm the gamer completed their sessions</li>
                      <li>Find the gamer in <strong>Pending Withdrawal Requests</strong> — verify their payout details (UPI ID / bank)</li>
                      <li>Send payment via <strong>Razorpay dashboard</strong> (UPI for 🇮🇳 India · Bank Transfer for 🌍 International)</li>
                      <li>Click <strong className="text-green-400">Mark as Paid</strong> — this deducts the balance &amp; logs the action with timestamp</li>
                    </ol>
                    <p className="text-xs text-amber-300/50 mt-1">Production payout account: creedx112@okicici</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Verifications Tab ── */}
          {activeTab === "verifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-purple-400" />
                  Pending Verifications
                  {verifs.length > 0 && <span className="text-purple-400">({verifs.length})</span>}
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
                      <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/users/${v.id}`} className="font-semibold hover:text-primary transition-colors">{v.name}</Link>
                          {v.gamerbuddyId && <span className="text-xs font-mono text-muted-foreground/60 bg-muted/60 px-1.5 py-0.5 rounded">{v.gamerbuddyId}</span>}
                          {v.country && <span className="flex items-center gap-1 text-xs text-muted-foreground/60"><Globe className="w-3 h-3" /> {v.country}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">{v.email}</p>
                        <p className="text-xs text-muted-foreground/50 mt-0.5">
                          Submitted {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })} ·
                          <span className="font-mono ml-1 text-muted-foreground/40">{v.officialIdPath}</span>
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button size="sm" onClick={() => setVerified.mutate({ userId: v.id, verified: true })} disabled={setVerified.isPending}
                          className="bg-green-600 hover:bg-green-500 text-white text-xs gap-1">
                          <BadgeCheck className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setVerified.mutate({ userId: v.id, verified: false })} disabled={setVerified.isPending}
                          className="text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Flagged Accounts Tab ── */}
          {activeTab === "flagged-accounts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-orange-400" />
                  Flagged Accounts
                  <span className="text-xs text-muted-foreground font-normal">
                    ({(flaggedAcctsData?.flaggedAccounts ?? []).filter(a => a.accountFlagStatus !== "resolved").length} active)
                  </span>
                </h2>
                <Button variant="ghost" size="sm" onClick={() => refetchFlaggedAccts()} className="gap-1 text-xs text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-2 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div>Accounts are auto-flagged when smart review patterns trigger. Users are notified and may submit <strong>one dispute</strong> per flag. Use <em>Unflag</em> to clear, <em>Confirm Flag</em> to reject a dispute, or <em>Permanent Ban</em> for repeat offenders.</div>
              </div>

              {flaggedAcctsLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
              ) : (flaggedAcctsData?.flaggedAccounts ?? []).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  No flagged accounts — all clear!
                </div>
              ) : (
                <div className="space-y-3">
                  {(flaggedAcctsData?.flaggedAccounts ?? []).map(acct => {
                    const statusColors = {
                      under_review: "border-orange-500/40 bg-orange-500/8 text-orange-400",
                      disputed:     "border-yellow-500/40 bg-yellow-500/8 text-yellow-400",
                      resolved:     "border-green-500/40 bg-green-500/8 text-green-400",
                    };
                    const statusLabels = { under_review: "Under Review", disputed: "Dispute Submitted", resolved: "Resolved" };
                    const statusKey = acct.accountFlagStatus ?? "under_review";
                    const isDisputed = acct.accountFlagStatus === "disputed";
                    const isResolved = acct.accountFlagStatus === "resolved";
                    const accountAge = acct.createdAt ? Math.floor((Date.now() - new Date(acct.createdAt).getTime()) / (24 * 60 * 60 * 1000)) : "?";

                    return (
                      <div key={acct.id} className={`border rounded-xl p-4 space-y-3 transition-colors ${
                        acct.permanentBan ? "border-red-500/60 bg-red-500/8" :
                        isResolved ? "border-green-500/30 bg-green-500/5 opacity-70" :
                        isDisputed ? "border-yellow-500/40 bg-yellow-500/5" :
                        "border-orange-500/40 bg-orange-500/5"
                      }`}>

                        {/* Row 1: Name + status + tier */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/users/${acct.id}`} className="font-bold text-white hover:text-primary transition-colors">{acct.name}</Link>
                          <TrustCardBadge trustFactor={acct.trustFactor} compact />
                          <span className={`text-[10px] border px-1.5 py-0.5 rounded-full font-semibold ${statusColors[statusKey as keyof typeof statusColors]}`}>
                            {statusLabels[statusKey as keyof typeof statusLabels]}
                          </span>
                          {acct.permanentBan && <span className="text-[10px] border border-red-500/60 text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full font-bold">PERMANENTLY BANNED</span>}
                          {acct.communityBanned && !acct.permanentBan && <span className="text-[10px] border border-orange-500/40 text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full">Comm. Banned</span>}
                          {acct.idVerified && <span className="text-[10px] border border-green-500/40 text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">✓ Verified</span>}
                          <span className="text-xs text-muted-foreground ml-auto">{acct.gamerbuddyId ?? `#${acct.id}`}</span>
                        </div>

                        {/* Row 2: Mini stats */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                          {[
                            { label: "Trust Factor", val: acct.trustFactor, color: "text-primary" },
                            { label: "Strikes",      val: acct.strikes,     color: acct.strikes >= 3 ? "text-red-400" : acct.strikes > 0 ? "text-orange-400" : "text-white" },
                            { label: "Gamer Sess",   val: acct.sessionsAsGamer, color: "text-white" },
                            { label: "Hirer Sess",   val: acct.sessionsAsHirer, color: "text-white" },
                            { label: "Acct Age",     val: `${accountAge}d`,      color: "text-white" },
                            { label: "Disputed Before", val: acct.hasDisputedBefore ? "Yes" : "No", color: acct.hasDisputedBefore ? "text-orange-400" : "text-muted-foreground" },
                          ].map(s => (
                            <div key={s.label} className="bg-background/50 rounded-lg px-2 py-1.5 text-center border border-border">
                              <div className={`font-bold text-sm ${s.color}`}>{s.val}</div>
                              <div className="text-muted-foreground text-[10px]">{s.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Flag reason */}
                        <div className="flex items-start gap-2 bg-background/40 rounded-lg px-3 py-2 border border-orange-500/20">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] text-orange-400 font-semibold mb-0.5">FLAG REASON</div>
                            <div className="text-xs text-foreground">{acct.accountFlagReason ?? "No reason recorded"}</div>
                            {acct.accountFlaggedAt && <div className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(acct.accountFlaggedAt), { addSuffix: true })}</div>}
                          </div>
                        </div>

                        {/* Dispute message — shown when status is disputed */}
                        {isDisputed && acct.disputeText && (
                          <div className="flex items-start gap-2 bg-yellow-500/8 rounded-lg px-3 py-2 border border-yellow-500/30">
                            <User className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-yellow-400 font-semibold mb-0.5">
                                USER DISPUTE — {acct.disputeSubmittedAt ? formatDistanceToNow(new Date(acct.disputeSubmittedAt), { addSuffix: true }) : ""}
                              </div>
                              <div className="text-xs text-foreground break-words">"{acct.disputeText}"</div>
                            </div>
                          </div>
                        )}

                        {/* Admin note input + actions */}
                        {!isResolved && !acct.permanentBan && (
                          <div className="space-y-2">
                            {(disputeResolveId === acct.id || banConfirmId === acct.id) && (
                              <div className="space-y-1.5">
                                <input
                                  value={adminNote}
                                  onChange={e => setAdminNote(e.target.value)}
                                  placeholder={banConfirmId === acct.id ? "Ban reason (shown to user)…" : "Admin note for user (optional)…"}
                                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary/60"
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Dispute resolution buttons */}
                              {isDisputed && disputeResolveId === acct.id ? (
                                <>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-green-400 hover:bg-green-500/10 border border-green-500/30"
                                    disabled={resolveDispute.isPending}
                                    onClick={() => resolveDispute.mutate({ userId: acct.id, approve: true, note: adminNote })}>
                                    <CheckCircle2 className="w-3 h-3" /> Approve Dispute
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-400 hover:bg-red-500/10 border border-red-500/30"
                                    disabled={resolveDispute.isPending}
                                    onClick={() => resolveDispute.mutate({ userId: acct.id, approve: false, note: adminNote })}>
                                    <XCircle className="w-3 h-3" /> Reject Dispute
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => { setDisputeResolveId(null); setAdminNote(""); }}>Cancel</Button>
                                </>
                              ) : banConfirmId === acct.id ? (
                                <>
                                  <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                                    disabled={permanentBan.isPending}
                                    onClick={() => permanentBan.mutate({ userId: acct.id, reason: adminNote })}>
                                    {permanentBan.isPending ? "Banning…" : "Confirm Permanent Ban"}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => { setBanConfirmId(null); setAdminNote(""); }}>Cancel</Button>
                                </>
                              ) : (
                                <>
                                  {isDisputed && (
                                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-yellow-400 hover:bg-yellow-500/10 border border-yellow-500/30"
                                      onClick={() => { setDisputeResolveId(acct.id); setAdminNote(""); }}>
                                      <Eye className="w-3 h-3" /> Review Dispute
                                    </Button>
                                  )}
                                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-green-400 hover:bg-green-500/10 border border-green-500/30"
                                    disabled={unflagAccount.isPending}
                                    onClick={() => unflagAccount.mutate({ userId: acct.id, note: "" })}>
                                    <CheckCircle2 className="w-3 h-3" /> Unflag
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-orange-400 hover:bg-orange-500/10 border border-orange-500/30"
                                    onClick={() => setStrikingId(acct.id)}>
                                    <Zap className="w-3 h-3" /> Strike
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-400 hover:bg-red-500/10 border border-red-500/30"
                                    onClick={() => { setBanConfirmId(acct.id); setAdminNote(""); }}>
                                    <XCircle className="w-3 h-3" /> Permanent Ban
                                  </Button>
                                </>
                              )}
                            </div>
                            {strikingId === acct.id && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs text-red-400 font-semibold">Confirm issue strike to {acct.name}?</span>
                                <Button size="sm" variant="destructive" className="h-6 text-xs px-2"
                                  disabled={issueStrike.isPending}
                                  onClick={() => issueStrike.mutate({ userId: acct.id, reason: "Flagged account — admin review" })}>
                                  {issueStrike.isPending ? "…" : "Yes, Strike"}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setStrikingId(null)}>Cancel</Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Users Tab ── */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="font-bold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  All Users
                  <span className="text-xs text-muted-foreground font-normal">({usersData?.users.length ?? 0} total)</span>
                </h2>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search by name, email, GB-ID…"
                      className="pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/60 w-full sm:w-56"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => refetchUsers()} className="gap-1 text-xs text-muted-foreground shrink-0">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </Button>
                </div>
              </div>

              {usersLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : (
                <div className="space-y-2">
                  {(usersData?.users ?? [])
                    .filter(u => {
                      if (!userSearch.trim()) return true;
                      const q = userSearch.toLowerCase();
                      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.gamerbuddyId ?? "").toLowerCase().includes(q);
                    })
                    .map(u => {
                      const tierColor = u.trustCardTier === "Gold" ? "text-yellow-400 border-yellow-500/40 bg-yellow-500/10"
                        : u.trustCardTier === "Blue" ? "text-blue-400 border-blue-500/40 bg-blue-500/10"
                        : u.trustCardTier === "Yellow" ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
                        : "text-slate-400 border-slate-500/40 bg-slate-500/10";

                      return (
                        <div key={u.id} className={`border rounded-xl p-3 space-y-2 transition-colors ${
                          u.flaggedForBan ? "border-red-500/50 bg-red-500/5" : "border-border bg-card/40"
                        }`}>
                          {/* Row 1: Name + badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/users/${u.id}`} className="font-bold text-white hover:text-primary transition-colors text-sm">{u.name}</Link>
                            <TrustCardBadge trustFactor={u.trustFactor} compact />
                            {u.idVerified && <span className="text-[10px] border border-green-500/40 text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full font-semibold">✓ Verified</span>}
                            {u.isActivated && <span className="text-[10px] border border-blue-500/40 text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full font-semibold">Activated</span>}
                            {u.communityBanned && <span className="text-[10px] border border-orange-500/40 text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full font-semibold">Comm. Banned</span>}
                            {u.flaggedForBan && <span className="text-[10px] border border-red-500/40 text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full font-bold animate-pulse">⚠ FLAGGED FOR BAN</span>}
                            <span className="text-xs text-muted-foreground ml-auto">{u.gamerbuddyId ?? `#${u.id}`}</span>
                          </div>

                          {/* Row 2: Stats grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                            <div className="bg-background/50 rounded-lg px-2 py-1.5 text-center border border-border">
                              <div className={`font-bold text-sm ${tierColor.split(" ")[0]}`}>{u.trustFactor}</div>
                              <div className="text-muted-foreground text-[10px]">Trust Factor</div>
                            </div>
                            <div className="bg-background/50 rounded-lg px-2 py-1.5 text-center border border-border">
                              <div className="font-bold text-sm text-white">{u.trustScore}</div>
                              <div className="text-muted-foreground text-[10px]">Trust Score</div>
                            </div>
                            <div className={`rounded-lg px-2 py-1.5 text-center border ${u.strikes > 0 ? "border-red-500/40 bg-red-500/10" : "bg-background/50 border-border"}`}>
                              <div className={`font-bold text-sm ${u.strikes >= 3 ? "text-red-400" : u.strikes > 0 ? "text-orange-400" : "text-white"}`}>{u.strikes}</div>
                              <div className="text-muted-foreground text-[10px]">Strikes</div>
                            </div>
                            <div className="bg-background/50 rounded-lg px-2 py-1.5 text-center border border-border">
                              <div className="font-bold text-sm text-white">{u.profileCompletion}%</div>
                              <div className="text-muted-foreground text-[10px]">Profile</div>
                            </div>
                            <div className="bg-background/50 rounded-lg px-2 py-1.5 text-center border border-border">
                              <div className="font-bold text-sm text-green-400">${(u.earningsBalance ?? 0).toFixed(2)}</div>
                              <div className="text-muted-foreground text-[10px]">Earnings</div>
                            </div>
                            <div className="bg-background/50 rounded-lg px-2 py-1.5 text-center border border-border">
                              <div className="font-bold text-sm text-blue-400">${(u.hiringBalance ?? 0).toFixed(2)}</div>
                              <div className="text-muted-foreground text-[10px]">Hiring</div>
                            </div>
                            <div className="bg-background/50 rounded-lg px-2 py-1.5 text-center border border-border">
                              <div className="font-bold text-sm text-white">{u.sessionsAsGamer}G / {u.sessionsAsHirer}H</div>
                              <div className="text-muted-foreground text-[10px]">Sessions</div>
                            </div>
                          </div>

                          {/* Row 3: Actions */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">{u.email}</span>
                            <div className="ml-auto flex items-center gap-1">
                              {strikingId === u.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-red-400 font-semibold">Confirm strike?</span>
                                  <Button size="sm" variant="destructive" className="h-6 text-xs px-2"
                                    disabled={issueStrike.isPending}
                                    onClick={() => issueStrike.mutate({ userId: u.id, reason: "Admin manual strike" })}>
                                    {issueStrike.isPending ? "…" : "Yes, Strike"}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setStrikingId(null)}>Cancel</Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="ghost"
                                  className="h-6 text-xs gap-1 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 border border-orange-500/30"
                                  onClick={() => setStrikingId(u.id)}>
                                  <Zap className="w-3 h-3" /> Issue Strike
                                </Button>
                              )}
                              <Link href={`/users/${u.id}`}>
                                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-muted-foreground">
                                  <ExternalLink className="w-3 h-3" /> View
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {(usersData?.users ?? []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No users found</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Flagged Reviews Tab ── */}
          {activeTab === "flagged-reviews" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold text-foreground flex items-center gap-2">
                  <Flag className="w-4 h-4 text-red-400" />
                  Flagged Reviews
                  <span className="text-xs text-muted-foreground font-normal">(auto-detected suspicious activity)</span>
                </h2>
                <Button variant="ghost" size="sm" onClick={() => refetchFlagged()} className="gap-1 text-xs text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-2 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>Reviews are auto-flagged when: <strong>3+ reviews from same user in 24h</strong>, <strong>reviewer has no completed sessions</strong>, or <strong>identical comment text</strong> reused. Review each flagged item and either dismiss the flag or delete the review.</div>
              </div>

              {flaggedLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
              ) : (flaggedData?.flaggedReviews ?? []).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  No flagged reviews — the system is clean!
                </div>
              ) : (
                <div className="space-y-3">
                  {(flaggedData?.flaggedReviews ?? []).map(r => (
                    <div key={r.id} className="border border-red-500/30 bg-red-500/5 rounded-xl p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap text-sm">
                            <span className="font-bold text-white">{r.reviewerName}</span>
                            <span className="text-muted-foreground">→ reviewed</span>
                            <span className="font-semibold text-primary">{r.revieweeName}</span>
                            <span className={`font-bold ${r.rating >= 8 ? "text-green-400" : r.rating >= 5 ? "text-amber-400" : "text-red-400"}`}>
                              {r.rating}/10 ★
                            </span>
                            <span className="text-muted-foreground text-xs">Request #{r.requestId}</span>
                          </div>
                          {r.comment && (
                            <p className="text-xs text-muted-foreground mt-1 italic">"{r.comment}"</p>
                          )}
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span className="text-xs text-amber-400 font-semibold">{r.flagReason}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">{r.flaggedAt ? formatDistanceToNow(new Date(r.flaggedAt), { addSuffix: true }) : ""}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-green-400 hover:bg-green-500/10 border border-green-500/30"
                          disabled={dismissFlag.isPending}
                          onClick={() => dismissFlag.mutate(r.id)}>
                          <CheckCircle2 className="w-3 h-3" /> Dismiss Flag
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-400 hover:bg-red-500/10 border border-red-500/30"
                          disabled={deleteReview.isPending}
                          onClick={() => { if (confirm("Permanently delete this review?")) deleteReview.mutate(r.id); }}>
                          <Trash2 className="w-3 h-3" /> Delete Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
